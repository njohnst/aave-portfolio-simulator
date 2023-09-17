import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '..';
import { SimulationResults } from '../services/simulation/simulator';
import { ReservesData } from '../services/web3/fetchAaveV3Data';
import dayjs from 'dayjs';

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

    from: number, //date from (for simulation)
    to: number, //date to (for simulation)

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
        from: dayjs().subtract(1, 'year').startOf('day').unix(),
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
        setFromDate: (state, action) => {
            state.from = action.payload;
        },
    },
});

export const { setSupplyPctBySymbol, setBorrowPctBySymbol, setLeverage, setInitialInvestment, setFromDate } = positionSlice.actions;

export const selectMarket = (state: RootState) => state.position.market;
export const selectPositions = (state: RootState) => state.position.positions;
export const selectLeverage = (state: RootState) => state.position.leverage;
export const selectInitialInvestment = (state: RootState) => state.position.initialInvestmentUSD;
export const selectSimulationResults = (state: RootState) => state.position.simulationResults;


export const selectPositionBySymbol = (state: RootState, symbol: string) => {
    return state.position.positions[symbol]; //could be undefined!
}; 

export const selectSupplyPctBySymbol = (state: RootState, symbol: string) => {
    return state.position.positions[symbol]?.supplyPct ?? 0;
};

export const selectBorrowPctBySymbol = (state: RootState, symbol: string) => {
    return state.position.positions[symbol]?.borrowPct ?? 0;
};

export const selectFromDate = (state: RootState) => state.position.from;

export default positionSlice.reducer;
