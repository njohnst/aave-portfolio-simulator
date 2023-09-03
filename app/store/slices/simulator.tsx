import { ReservesData } from "@/app/utils/fetchAaveV3Data";
import { PositionMap } from "./positionSlice";
import { AssetHistoryResponse } from "@/app/utils/fetchCoinGeckoHistory";

const SECONDS_IN_A_YEAR = 31536000; //For the purpose of getting rates per second
//Aave is compounded per second according to: https://docs.aave.com/developers/v/2.0/guides/apy-and-apr
//(This is for v2, Couldn't find a v3 document)
//For v3, it was double checked by calculating APR -> APY against the provided values from the v3 contract and this is still the compounding frequency

//Helper function to get rates per second from APR
function getRatePerSecond(apr : number) {
    return apr / SECONDS_IN_A_YEAR;
}

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
    duration: number,
    initialInvestment: number,
    maxLtv: number,
    leverage: number,
    positions: PositionMap,
    reserves: Array<ReservesData>,
    aprs: { [symbol: string] : Array<AprData>, },
    prices: { [symbol : string] : AssetHistoryResponse,}, //@@TODO
};

export type SimulationResults = {
    longSizeUSD: number,
    shortSizeUSD: number,
    nav: number,
};


export const doSimulate = (args: SimulationArgs) => {
    const {duration, initialInvestment, maxLtv, leverage, positions, reserves} = args;

    //@TODO?  @normalization of Pct values
    const {longTotal, shortTotal} = Object.keys(positions).reduce(({longTotal, shortTotal}, key) => {
        return {longTotal: longTotal+positions[key].supplyPct, shortTotal: shortTotal+positions[key].borrowPct};
    }, {longTotal:0, shortTotal: 0});

    //Extract and normalize longs and shorts
    const {longs, totals} = Object.keys(positions).filter(key => positions[key].supplyPct > 0).reduce(({longs, totals}, key) => {
        const assetDetails = reserves.find(asset => asset.symbol === key); //TODO use memoized selector... ??

        if (assetDetails) {
            const prices = args.prices[key].prices;//Number(assetDetails.priceInUSD);

            const initialPrice = prices[0][1]; //@TODO
            
            longs[key] = { size: (initialInvestment * (1+leverage*maxLtv) * positions[key].supplyPct / longTotal) / initialPrice, prices, apr: Number(assetDetails.supplyAPR), };

            totals.liquidationThresh += Number(assetDetails.formattedReserveLiquidationThreshold);
            totals.liquidationPenalty += Number(assetDetails.formattedReserveLiquidationBonus);
        } else {
            throw new Error("asset not found in reserves");
        }

        return {longs, totals};
    }, {longs: {} as {[k: string]: {size: number, prices: Array<any>, apr: number,}}, totals: { liquidationThresh: 0, liquidationPenalty: 0, }}); //@TODO Type


    const shorts = Object.keys(positions).filter(key => positions[key].borrowPct > 0).reduce((shorts, key) => {
        const assetDetails = reserves.find(asset => asset.symbol === key); //TODO use memoized selector... ??

        if (assetDetails) {
            const prices = args.prices[key].prices;//Number(assetDetails.priceInUSD);

            const initialPrice = prices[0][1]; //@TODO

            //@@TODO LEVERAGE
            shorts[key] = { size: (initialInvestment * maxLtv * leverage * positions[key].borrowPct / shortTotal) / initialPrice, prices, apr: Number(assetDetails.variableBorrowAPR), };
        } else {
            throw new Error("asset not found in reserves");
        }

        return shorts;
    }, {} as {[k: string]: {size: number, prices: Array<any>, apr: number,}}); //@TODO type


    const avgLiquidationThreshold = totals.liquidationThresh / Object.keys(longs).length;
    const avgLiquidationPenalty = totals.liquidationPenalty / Object.keys(longs).length;


    //aprs are hourly
    //simulate for each hour in the date interval
    const sym1 = Object.keys(args.aprs)[0];
    args.aprs[sym1].map((aprData, idx) => {
        const currentTimestamp = new Date(aprData.x.year, aprData.x.month, aprData.x.date, aprData.x.hours).valueOf() / 1000;

        const newLongTotal = Object.keys(longs).reduce((total, key) => {
            //Add interest payment to supplied amount
            //since this iteration is 1 hour, and compounding is per second,
            //compound 60s * 60minutes = 3600 times
            longs[key].size *= (1+getRatePerSecond(longs[key].apr))**3600;

            const price = longs[key].prices[idx][1];

            total += longs[key].size * price;

            return total;
        }, 0);

        const newShortTotal = Object.keys(shorts).reduce((total, key) => {
            //Add interest payment to owed amount
            //since this iteration is 1 hour, and compounding is per second,
            //compound 60s * 60minutes = 3600 times
            shorts[key].size *= (1+getRatePerSecond(shorts[key].apr))**3600;

            const price = shorts[key].prices[idx][1];

            total += shorts[key].size * price;

            return total;
        }, 0);

        //Check for liquidation
        if (newShortTotal / newLongTotal > maxLtv) {
            //do a liquidation
            console.log(`liquidate at ${currentTimestamp}`);
            //@@TODO            
        }
    });

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
        longSizeUSD: newLongTotal,
        shortSizeUSD: newShortTotal,
        nav: newLongTotal-newShortTotal,
    }; //@@TODO HACK FOR NOW...
}
