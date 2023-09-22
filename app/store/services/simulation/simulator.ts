import dayjs from "dayjs";
import { PositionMap, ReserveMap } from "../../slices/positionSlice";
import { AssetHistoryResponse } from "@/app/store/services/coingeckoApi";

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
    aprs: { [symbol: string] : Array<AprData>, },
    prices: { [symbol : string] : AssetHistoryResponse,},
};

export type SimulationSnapshot = {
    timestamp: number,
    longTotal: number,
    shortTotal: number,
};

export type SimulationResults = {
    liquidated: boolean, //mandatory
    timestamp?: string, //optional (for liquidation case)

    //optional: expected to be filled if liquidated is false
    snapshots?: SimulationSnapshot[],
};

/**
 * 
 * @param args: SimulationArgs 
 * @returns SimulationResults
 * @throws
 */
export const doSimulate = (args: SimulationArgs): SimulationResults => {
    const {initialInvestment, maxLtv, leverage, positions, reserves, aprs} = args;

    //Extract and normalize longs and shorts
    const longs = Object.keys(positions).filter(key => positions[key].supplyPct > 0).reduce((longs, symbol) => {
        const assetDetails = reserves[symbol];

        if (assetDetails) {
            const prices = args.prices[symbol].prices;

            const initialPrice = prices[0][1]; //@TODO
            
            longs[symbol] = { size: (initialInvestment * (1+leverage*maxLtv) * positions[symbol].supplyPct / 100) / initialPrice, prices, };
        } else {
            throw new Error("asset not found in reserves");
        }

        return longs;
    }, {} as {[k: string]: {size: number, prices: Array<any>, }}); //@TODO Type


    const shorts = Object.keys(positions).filter(key => positions[key].borrowPct > 0).reduce((shorts, symbol) => {
        const assetDetails = reserves[symbol];

        if (assetDetails) {
            const prices = args.prices[symbol].prices;

            const initialPrice = prices[0][1]; //@TODO

            //@@TODO LEVERAGE
            shorts[symbol] = { size: (initialInvestment * maxLtv * leverage * positions[symbol].borrowPct / 100) / initialPrice, prices, };
        } else {
            throw new Error("asset not found in reserves");
        }

        return shorts;
    }, {} as {[k: string]: {size: number, prices: Array<any>, }}); //@TODO type

    //simulate for each day in the date interval
    //use the first symbol in our aprs object, this should be adequate
    const {snapshots, lastTime, liquidated} = Object.values(aprs)[0].reduce(({snapshots, lastTime, error, liquidated}, aprData, idx) => {
        //stop processing if we hit an error or got liquidated
        if (error || liquidated) {
            return {snapshots, lastTime, error, liquidated};
        }

        try {
            const currentTimestamp = dayjs(new Date(aprData.x.year, aprData.x.month, aprData.x.date, aprData.x.hours)).unix();

            const {newLongTotal, weightedThresholdSum}= Object.keys(longs).reduce((total, key) => {
                //Add interest payment to supplied amount
                //since this iteration is 24 hours, and compounding is per second,
                //compound 60s * 60minutes * 24 = 86400 times
                longs[key].size *= (1+getRatePerSecond(aprs[key][idx].liquidityRate_avg))**COMPOUNDING_BY_SECOND_FOR_ONE_DAY;
    
                const price = longs[key].prices[idx][1];
    
                total.newLongTotal += longs[key].size * price;
                total.weightedThresholdSum += longs[key].size * price * Number(reserves[key].formattedReserveLiquidationThreshold);
    
                return total;
            }, {newLongTotal: 0, weightedThresholdSum: 0});
    
            const newShortTotal = Object.keys(shorts).reduce((total, key) => {
                //Add interest payment to owed amount
                //since this iteration is 24 hours, and compounding is per second,
                //compound 60s * 60minutes * 24 = 86400 times
                shorts[key].size *= (1+getRatePerSecond(aprs[key][idx].variableBorrowRate_avg))**COMPOUNDING_BY_SECOND_FOR_ONE_DAY;
    
                const price = shorts[key].prices[idx][1];
    
                total += shorts[key].size * price;
    
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
                return {snapshots, lastTime: currentTimestamp, error, liquidated: true}; //set liquidated to prevent further processing
            }
    
            return {snapshots, lastTime: currentTimestamp, error, liquidated};
        }
        catch(e) {
            //we hit an error
            //use previous "lastTime" to disregard this timestemp and set the error value to prevent further processing
            return {snapshots, lastTime, error: (e as Error).message, liquidated};
        }
        
    }, {snapshots: [], lastTime: null, error: null, liquidated: false} as any);
    
    return {
        liquidated,
        timestamp: lastTime,
        snapshots,
    };
}
