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

export const calculateMaxLeverage = (maxLtv: number) => {
    return Number((Math.floor(10 * (1 / (1 - maxLtv)))/10).toFixed(1)); //infinite sum theoretical maximum is (1/(1-r)); doing some truncating trick to get 1 decimal place
};

export const calculateCurrentLtv = (leverage: number, maxLtv: number) => {
    //Compute borrow amount (after looping)
    const borrowAmount = leverage * maxLtv;

    //Borrow amount is looped, it is a percentage which is then redeposited, reborrowed, redeposited in an infinite sum up to the max LTV
    //This results in net position of {Supply: 1+borrowAmount, Borrow: borrowAmount}

    //Thus we compute currentLtv as borrows/deposits = borrow/(1+borrow)
    return borrowAmount/(1+borrowAmount);
};
