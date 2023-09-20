import { PositionMap, ReserveMap } from "../positionSlice";

export const calculateMaxLtv = (positions: PositionMap, reserves: ReserveMap) => {
    const totals = Object.keys(positions).reduce((totals, symbol: string) => {
        const position = positions[symbol];
        const asset = reserves[symbol];

        totals.totalLtv += Number(asset?.formattedBaseLTVasCollateral ?? 0) * position.supplyPct;
        totals.totalSupplyFactor += position.supplyPct;
        
        return totals;
    }, { totalLtv: 0, totalSupplyFactor: 0, });

    return totals.totalLtv / totals.totalSupplyFactor;
};

//https://docs.aave.com/risk/asset-risk/risk-parameters#health-factor
export const calculateCurrentHealthFactor = (positions: PositionMap, reserves: ReserveMap, leverage: number) => {
    const {weightedSumSupplyThreshold, sumSupplyPcts, sumBorrowPcts} = Object.keys(positions).reduce((totals, key) => {
        totals.weightedSumSupplyThreshold += (Number(reserves[key]?.formattedReserveLiquidationThreshold) * Number(positions[key]?.supplyPct)) || 0;
        totals.sumSupplyPcts += Number(positions[key]?.supplyPct) || 0;
        totals.sumBorrowPcts += Number(positions[key]?.borrowPct) || 0;

        return totals;
    }, { weightedSumSupplyThreshold: 0, sumSupplyPcts: 0, sumBorrowPcts: 0, });

    if (sumSupplyPcts <= 0 || sumBorrowPcts <= 0 || leverage <= 1) {
        return NaN;
    }

    const weightedSumSupplyThresholdNormalized = weightedSumSupplyThreshold / sumSupplyPcts;

    /**
     * health factor calculation (from aave docs) is (SUPPLY Sum(threshold_i * price_i)) / BORROW Sum(price_i)
     * 
     * in this case we can use our leverage variable to do it easier:
     * because of the assumption that all borrows are redeposited/supplied
     * 
     * if we denominate price in % of long part of portfolio (in any base currency),
     * we can compute the numerator (supply part) with % of long part
     * 
     * then we multiply by leverage because leverage is the multiple of long size
     * (the max leverage is the theoretical maximum multiplier of long size given maxLTV)
     * 
     * the borrow size will be (leverage-1), because if the long size is e.g. 2x multiplier;
     * the original supplied amount is 1x, but the resulting long size is 2x, then that means that (2-1) had to be borrowed
     */
    return (leverage / (leverage-1)) * weightedSumSupplyThresholdNormalized;
};

export const calculateMaxLeverage = (maxLtv: number) => {
    return Number((Math.floor(10 * (1 / (1 - maxLtv)))/10).toFixed(1)); //infinite sum theoretical maximum is (1/(1-r)); doing some truncating trick to get 1 decimal place
};
