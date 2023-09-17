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

export type SimulationResults = {
    liquidated: boolean, //mandatory
    timestamp?: string, //optional (for liquidation case)

    //optional: expected to be filled if liquidated is false
    longSizeUSD?: number,
    shortSizeUSD?: number,
    nav?: number,
};

class LiquidationError extends Error {};


export const doSimulate = (args: SimulationArgs): SimulationResults => {
    const {initialInvestment, maxLtv, leverage, positions, reserves, aprs} = args;

    //@TODO?  @normalization of Pct values
    const {longTotal, shortTotal} = Object.keys(positions).reduce(({longTotal, shortTotal}, symbol) => {
        return {longTotal: longTotal+positions[symbol].supplyPct, shortTotal: shortTotal+positions[symbol].borrowPct};
    }, {longTotal:0, shortTotal: 0});

    //Extract and normalize longs and shorts
    const {longs, totals} = Object.keys(positions).filter(key => positions[key].supplyPct > 0).reduce(({longs, totals}, symbol) => {
        const assetDetails = reserves[symbol];

        if (assetDetails) {
            const prices = args.prices[symbol].prices;

            const initialPrice = prices[0][1]; //@TODO
            
            longs[symbol] = { size: (initialInvestment * (1+leverage*maxLtv) * positions[symbol].supplyPct / longTotal) / initialPrice, prices, apr: Number(assetDetails.supplyAPR), };

            totals.liquidationThresh += Number(assetDetails.formattedReserveLiquidationThreshold);
            totals.liquidationPenalty += Number(assetDetails.formattedReserveLiquidationBonus);
        } else {
            throw new Error("asset not found in reserves");
        }

        return {longs, totals};
    }, {longs: {} as {[k: string]: {size: number, prices: Array<any>, apr: number,}}, totals: { liquidationThresh: 0, liquidationPenalty: 0, }}); //@TODO Type


    const shorts = Object.keys(positions).filter(key => positions[key].borrowPct > 0).reduce((shorts, symbol) => {
        const assetDetails = reserves[symbol];

        if (assetDetails) {
            const prices = args.prices[symbol].prices;

            const initialPrice = prices[0][1]; //@TODO

            //@@TODO LEVERAGE
            shorts[symbol] = { size: (initialInvestment * maxLtv * leverage * positions[symbol].borrowPct / shortTotal) / initialPrice, prices, apr: Number(assetDetails.variableBorrowAPR), };
        } else {
            throw new Error("asset not found in reserves");
        }

        return shorts;
    }, {} as {[k: string]: {size: number, prices: Array<any>, apr: number,}}); //@TODO type


    const avgLiquidationThreshold = totals.liquidationThresh / Object.keys(longs).length;

    //aprs are hourly
    //simulate for each day in the date interval
    //use the first symbol in our aprs object, this should be adequate
    //@TODO stop somehow for arbitrary date range?
    try {
        Object.values(aprs)[0].forEach((aprData, idx) => {
            const currentTimestamp = dayjs(new Date(aprData.x.year, aprData.x.month, aprData.x.date, aprData.x.hours)).unix();
    
            const newLongTotal = Object.keys(longs).reduce((total, key) => {
                //Add interest payment to supplied amount
                //since this iteration is 24 hours, and compounding is per second,
                //compound 60s * 60minutes * 24 = 86400 times
                longs[key].size *= (1+getRatePerSecond(longs[key].apr))**COMPOUNDING_BY_SECOND_FOR_ONE_DAY;
    
                const price = longs[key].prices[idx][1];
    
                total += longs[key].size * price;
    
                return total;
            }, 0);
    
            const newShortTotal = Object.keys(shorts).reduce((total, key) => {
                //Add interest payment to owed amount
                //since this iteration is 24 hours, and compounding is per second,
                //compound 60s * 60minutes * 24 = 86400 times
                shorts[key].size *= (1+getRatePerSecond(shorts[key].apr))**COMPOUNDING_BY_SECOND_FOR_ONE_DAY;
    
                const price = shorts[key].prices[idx][1];
    
                total += shorts[key].size * price;
    
                return total;
            }, 0);
    
            //Check for liquidation
            if (newShortTotal / newLongTotal > avgLiquidationThreshold) {
                //do a liquidation
                console.log(`liquidate at ${currentTimestamp}`);
                
                //we don't care what the penalty is,
                //if our strategy results in a simulated liquidation it's almost certainly bad
                throw new LiquidationError(String(currentTimestamp));
            }
        });
    }
    catch (e) {
        if (e instanceof LiquidationError) {
            //return with the liquidation timestamp
            return {
                liquidated: true,
                timestamp: e.message,
            };
        } else {
            //otherwise, some other unexpected error happened, let's throw it
            //rethrow
            throw e;
        }
    }
    

    //Compute results

    //@@TODO REFACTOR
    const newLongTotal = Object.keys(longs).reduce((total, key) => {
        const price = longs[key].prices.at(-1)[1]; //@TODO allow different price predictions, historical backtesting...

        total += longs[key].size * price;

        return total;
    }, 0);

    const newShortTotal = Object.keys(shorts).reduce((total, key) => {
        const price = shorts[key].prices.at(-1)[1]; //@TODO allow different price predictions, historical backtesting...

        total += shorts[key].size * price;

        return total;
    }, 0);

    return {
        liquidated: false,
        longSizeUSD: newLongTotal,
        shortSizeUSD: newShortTotal,
        nav: newLongTotal-newShortTotal,
    }; //@@TODO HACK FOR NOW...
}
