import dayjs from "dayjs";
import { PositionMap, ReserveMap } from "../../slices/positionSlice";
import { AssetHistoryResponse } from "@/app/store/services/coingeckoApi";
import { calculatePortfolioStdDev, calculateSharpeRatio, calculateDailyStdDevsAnnualized } from "./utils/statistics";

const SECONDS_IN_A_YEAR = 31536000; //For the purpose of getting rates per second
//Aave is compounded per second according to: https://docs.aave.com/developers/v/2.0/guides/apy-and-apr
//(This is for v2, Couldn't find a v3 document)
//For v3, it was double checked by calculating APR -> APY against the provided values from the v3 contract and this is still the compounding frequency

//Helper function to get rates per second from APR
function getRatePerSecond(apr : number) {
    return apr / SECONDS_IN_A_YEAR;
}

const COMPOUNDING_BY_SECOND_FOR_ONE_DAY = 60 * 60 * 24; //60 seconds * 60 minutes * 24 hours

export type AprData = {
    liquidityRate_avg: number,
    variableBorrowRate_avg: number,
    utilizationRate_avg: number,
    stableBorrowRate_avg: number,
    x: {
        year: number,
        month: number,
        date: number,
        hours: number,
    },
};

export type SimulationArgs = {
    initialInvestment: number,
    maxLtv: number,
    leverage: number,
    positions: PositionMap,
    reserves: ReserveMap,
    riskFreeRate: number,
    swapFee: number,
    aprs: { [symbol: string] : Array<AprData>, },
    prices: { [symbol : string] : AssetHistoryResponse,},
};

export type SimulationSnapshot = {
    timestamp: number,
    longTotal: number,
    shortTotal: number,
};

export type SimulationResults = {
    liquidated: boolean,
    timestamp?: string, // final typestamp

    snapshots?: SimulationSnapshot[],
    sharpeRatio?: number,
};

/**
 * 
 * @param args: SimulationArgs 
 * @returns SimulationResults
 * @throws
 */
export const doSimulate = (args: SimulationArgs): SimulationResults => {
    const {initialInvestment, leverage, positions, reserves, aprs, riskFreeRate, swapFee} = args;

    //(leverage-1)*afterFees + 1 because the fee doesn't apply to first 100% long
    const leverageAfterSwapFees = (leverage-1)*(1-swapFee)+1;

    //Extract and normalize longs and shorts
    const longs = Object.keys(positions).filter(key => positions[key].supplyPct > 0).reduce((longs, symbol) => {
        const assetDetails = reserves[symbol];

        if (assetDetails) {
            const prices = args.prices[symbol].prices;

            const initialPrice = prices[0][1]; //@TODO
            
            longs[symbol] = { size: (initialInvestment * leverageAfterSwapFees * positions[symbol].supplyPct / 100) / initialPrice, prices, stakingApr: positions[symbol].stakingApr, };
        } else {
            throw new Error("asset not found in reserves");
        }

        return longs;
    }, {} as {[k: string]: {size: number, prices: Array<any>, stakingApr: number,}}); //@TODO Type


    const shorts = Object.keys(positions).filter(key => positions[key].borrowPct > 0).reduce((shorts, symbol) => {
        const assetDetails = reserves[symbol];

        if (assetDetails) {
            const prices = args.prices[symbol].prices;

            const initialPrice = prices[0][1]; //@TODO

            shorts[symbol] = { size: (initialInvestment * (leverage - 1) * positions[symbol].borrowPct / 100) / initialPrice, prices, stakingApr: positions[symbol].stakingApr, };
        } else {
            throw new Error("asset not found in reserves");
        }

        return shorts;
    }, {} as {[k: string]: {size: number, prices: Array<any>, stakingApr: number, }}); //@TODO type

    //simulate for each day in the date interval
    //use the first symbol in our aprs object, this should be adequate
    const {snapshots, longSums, shortSums, lastTime, liquidated} = Object.values(aprs)[0].reduce(({snapshots, longSums, shortSums, lastTime, error, liquidated}, aprData, idx) => {
        //stop processing if we hit an error or got liquidated
        if (error || liquidated) {
            return {snapshots, longSums, shortSums, lastTime, error, liquidated};
        }

        try {
            const currentTimestamp = dayjs(new Date(aprData.x.year, aprData.x.month, aprData.x.date, aprData.x.hours)).unix();

            const {newLongTotal, weightedThresholdSum}= Object.keys(longs).reduce((total, key) => {
                //Add interest payment to supplied amount
                //since this iteration is 24 hours, and compounding is per second,
                //compound 60s * 60minutes * 24 = 86400 times
                longs[key].size *= (1+getRatePerSecond(aprs[key][idx].liquidityRate_avg))**COMPOUNDING_BY_SECOND_FOR_ONE_DAY;

                //add staking yield as well!
                //we are just defaulting to daily compounding, this is not necessarily correct, but should be relatively close in most cases...
                //just divide APR by 365!
                if (longs[key].stakingApr > 0) {
                    longs[key].size *= (1+longs[key].stakingApr/365);
                }
    
                const price = longs[key].prices[idx][1];
                const prevPrice = idx > 0 ? longs[key].prices[idx-1][1] : price;
    
                total.newLongTotal += longs[key].size * price;
                total.weightedThresholdSum += longs[key].size * price * Number(reserves[key].formattedReserveLiquidationThreshold);
                
                //@TODO
                const returnAmount = ((price-prevPrice)+(getRatePerSecond(aprs[key][idx].liquidityRate_avg))**COMPOUNDING_BY_SECOND_FOR_ONE_DAY + longs[key].stakingApr/365)/prevPrice;
                
                if (!longSums[key]) {
                    longSums[key] = {
                        returns: [],
                        sum: 0,
                    }
                }
                longSums[key].sum += returnAmount;
                longSums[key].returns.push(returnAmount);
    
                return total;
            }, {newLongTotal: 0, weightedThresholdSum: 0} as any);
    
            const newShortTotal = Object.keys(shorts).reduce((total, key) => {
                //Add interest payment to owed amount
                //since this iteration is 24 hours, and compounding is per second,
                //compound 60s * 60minutes * 24 = 86400 times
                shorts[key].size *= (1+getRatePerSecond(aprs[key][idx].variableBorrowRate_avg))**COMPOUNDING_BY_SECOND_FOR_ONE_DAY;
    
                //add staking yield as well!
                //we are just defaulting to daily compounding, this is not necessarily correct, but should be relatively close in most cases...
                //just divide APR by 365!
                if (shorts[key].stakingApr > 0) {
                    shorts[key].size *= (1+shorts[key].stakingApr/365);
                }

                const price = shorts[key].prices[idx][1];
                const prevPrice = idx > 0 ? shorts[key].prices[idx-1][1] : price;
    
                total += shorts[key].size * price;

                //@TODO
                const returnAmount = ((prevPrice-price)-(getRatePerSecond(aprs[key][idx].variableBorrowRate_avg))**COMPOUNDING_BY_SECOND_FOR_ONE_DAY + shorts[key].stakingApr/365)/prevPrice;

                if (!shortSums[key]) {
                    shortSums[key] = {
                        returns: [],
                        sum: 0,
                    }
                }
                shortSums[key].sum += returnAmount;
                shortSums[key].returns.push(returnAmount); 
    
                return total;
            }, 0);
    
            snapshots.push({
                timestamp: currentTimestamp,
                longTotal: newLongTotal,
                shortTotal: newShortTotal,
            });
    
            //Check for liquidation
            if (weightedThresholdSum / newShortTotal < 1 + Number.EPSILON) {
                //do a liquidation
                console.log(`liquidate at ${currentTimestamp}`);
                
                //we don't care what the penalty is,
                //if our strategy results in a simulated liquidation it's almost certainly bad
                return {snapshots, longSums, shortSums, lastTime: currentTimestamp, error, liquidated: true}; //set liquidated to prevent further processing
            }
    
            return {snapshots, longSums, shortSums, lastTime: currentTimestamp, error, liquidated};
        }
        catch(e) {
            //we hit an error
            //use previous "lastTime" to disregard this timestemp and set the error value to prevent further processing
            return {snapshots, longSums, shortSums, lastTime, error: (e as Error).message, liquidated};
        }
        
    }, {snapshots: [], longSums: {}, shortSums: {}, lastTime: null, error: null, liquidated: false} as any);
    
    //Get position std deviation
    const longStdDevs = calculateDailyStdDevsAnnualized(longSums);
    const shortStdDevs = calculateDailyStdDevsAnnualized(shortSums);

    //augment with weights and returns, and concatenate shorts and longs
    const positionStats = Object.keys(longStdDevs).map(key => {
        return {
             //use original weight; divide by 100 to get it into decimal form
            weight: (positions[key].supplyPct / 100) * (leverage / (2*leverage - 1)), //total position is Long: leverage; Short: leverage-1, that is (2*leverage - 1)
            stdDev: longStdDevs[key],
            returns: longSums[key].returns,
        }
    }).concat(Object.keys(shortStdDevs).map(key => {
        return {
            weight: (positions[key].borrowPct / 100) * ((leverage - 1)/(2*leverage - 1)), //total position is Long: leverage; Short: leverage-1, that is (2*leverage - 1)
            stdDev: shortStdDevs[key],
            returns: shortSums[key].returns,
        }
    }));

    //get expected returns
    //use (final longs - final shorts) / (initial investment)
    const finalSnapshot = snapshots.at(-1);

    const expectedReturn = (((finalSnapshot.longTotal - finalSnapshot.shortTotal) / initialInvestment)-1) / snapshots.length * 365; //annualized
    const portfolioStdDev = calculatePortfolioStdDev(positionStats);
    const sharpeRatio = calculateSharpeRatio(expectedReturn, riskFreeRate, portfolioStdDev);
 
    return {
        liquidated,
        timestamp: lastTime,
        sharpeRatio,
        snapshots,
    };
}
