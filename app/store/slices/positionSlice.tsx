import { PayloadAction, createSlice, createSelector } from '@reduxjs/toolkit';
import { RootState, store } from '..';
import { SimulationResults } from '../services/simulation/simulator';
import { ReservesData } from '../services/web3/fetchAaveV3Data';
import { aaveApi, getSelectReserves } from '../services/aaveApi';

const DEFAULT_MARKET : string = "polygonV3";

export type AssetPosition = {
    supplyPct: number,
    borrowPct: number,
};

export type PositionMap = {
    [symbol: string]: AssetPosition,
};

export type ReserveMap = {
    [symbol: string]: ReservesData
};

export interface PositionState {
    market: string, //market key in V3_MARKETS_LIST
    reserves: ReserveMap,
    positions: PositionMap,

    initialInvestment: number, //in USD
    leverage: number,

    simulationResults: SimulationResults,
};

export const positionSlice = createSlice({
    name: "position",
    initialState: { 
        market: DEFAULT_MARKET,
        reserves: {} as ReserveMap,
        initialInvestmentUSD: 1000,
        leverage: 0,
        positions: {} as PositionMap,
        simulationResults: {
            longSizeUSD: 0,
            shortSizeUSD: 0,
            nav: 0,
        },
    },
    reducers: {
        setSupplyPctBySymbol(state, action: PayloadAction<[string, number]>) {
            //Check if the key exists
            if (!state.positions[action.payload[0]]) {
                //key doesn't exist, let's create it
                state.positions[action.payload[0]] = {
                    supplyPct: 0, //@TODO - rename these to Factor, as they aren't really a %
                    borrowPct: 0,
                };
            }

            //Update the position with new supplyPct
            state.positions[action.payload[0]].supplyPct = action.payload[1];
        },
        setBorrowPctBySymbol(state, action: PayloadAction<[string, number]>) {
            //Check if the key exists
            if (!state.positions[action.payload[0]]) {
                //key doesn't exist, let's create it
                state.positions[action.payload[0]] = {
                    supplyPct: 0,
                    borrowPct: 0,
                };
            }

            //Update the position with new borrowPct
            state.positions[action.payload[0]].borrowPct = action.payload[1];
        },
        setLeverage: (state, action: PayloadAction<number>) => {
            state.leverage = action.payload;
        },
        setInitialInvestment: (state, action: PayloadAction<number>) => {
            state.initialInvestmentUSD = action.payload;
        },
    },
});

export const { setSupplyPctBySymbol, setBorrowPctBySymbol, setLeverage, setInitialInvestment } = positionSlice.actions;

export const selectMarket = (state: RootState) => state.position.market;
export const selectPositions = (state: RootState) => state.position.positions;
export const selectLeverage = (state: RootState) => state.position.leverage;
export const selectInitialInvestment = (state: RootState) => state.position.initialInvestmentUSD;
export const selectSimulationResults = (state: RootState) => state.position.simulationResults;

export const makeSelectReserves = createSelector(
    [selectMarket],
    (marketKey) => {
        return getSelectReserves(marketKey);
    },
    {
        memoizeOptions: {
            maxSize: 10, //10 should cover all of Aave markets
        },
    }
);

//unsafe because it relies on the API being called already;
//i.e. this will never return any data if there is no subscription to the API for the given marketKey
export const selectReservesUnsafe = (state: RootState) => {
    //note that makeSelectReserves(state) returns a selector
    //so we need to curry with state twice, first time gets the selector, second time calls it
    //makeSelectReserves is memoized for performance
    return makeSelectReserves(state)(state);
};

//@TODO THESE BELOW ARE FACTORIES - NOT BEING USED CORRECTLY CURRENTLY
export const selectReserveBySymbol = (symbol: string) => createSelector([selectReservesUnsafe], (reserves) => {
    return reserves.data?.[symbol]; //could be undefined!
}); 

export const selectPositionBySymbol = (symbol: string) => createSelector([selectPositions], (positions) => {
    return positions[symbol]; //could be undefined!
}); 

export const selectSupplyPctBySymbol = (symbol: string) => createSelector([selectPositionBySymbol(symbol)], (position) => {
    return position?.supplyPct ?? 0;
});

export const selectBorrowPctBySymbol = (symbol: string) => createSelector([selectPositionBySymbol(symbol)], (position) => {
    return position?.borrowPct ?? 0;
});

export const selectMaxLtv = createSelector([selectPositions, selectMarket, selectReservesUnsafe],(positions, _market, reserves) => {
    if (reserves.isUninitialized) {
        return 0;
    }

    const totals = Object.keys(positions).reduce((totals, symbol: string) => {
        const position = positions[symbol];
        const asset = reserves.data?.[symbol];

        totals.totalLtv += Number(asset?.formattedBaseLTVasCollateral ?? 0) * position.supplyPct;
        totals.totalSupplyFactor += position.supplyPct;
        
        return totals;
    }, { totalLtv: 0, totalSupplyFactor: 0, });

    return totals.totalLtv / totals.totalSupplyFactor;
});

export const selectMaxLeverage = createSelector([selectMaxLtv], (maxLtv) => {
    return Number((Math.floor(10 * (1 / (1 - maxLtv)))/10).toFixed(1)); //infinite sum theoretical maximum is (1/(1-r)); doing some truncating trick to get 1 decimal place
});

export const selectCurrentLtv = createSelector([selectLeverage, selectMaxLtv], (leverage, maxLtv) => {
    //Compute borrow amount (after looping)
    const borrowAmount = leverage * maxLtv;

    //Borrow amount is looped, it is a percentage which is then redeposited, reborrowed, redeposited in an infinite sum up to the max LTV
    //This results in net position of {Supply: 1+borrowAmount, Borrow: borrowAmount}

    //Thus we compute currentLtv as borrows/deposits = borrow/(1+borrow)
    return borrowAmount/(1+borrowAmount);
});

export default positionSlice.reducer;
