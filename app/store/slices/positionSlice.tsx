import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '..';
import { ReservesData } from '../services/web3/fetchAaveV3Data';
import dayjs from 'dayjs';

const DEFAULT_MARKET : string = "polygonV3";

export type AssetPosition = {
    supplyPct: number,
    borrowPct: number,
    stakingApr: number,
};

export type PositionMap = {
    [symbol: string]: AssetPosition,
};

export type ReserveMap = {
    [symbol: string]: ReservesData
};

export type SimulationKey = {
    marketKey: string,
    initialInvestment: number,
    maxLtv: number,
    leverage: number,
    positionMap: PositionMap,
    reserveMap: ReserveMap,

    fromDate: number,
};

export type SimulationKeyMap = {
    [simulationKeyJsonString: string]: boolean, //true -> simulation complete
};

export interface PositionState {
    market: string, //market key in V3_MARKETS_LIST
    reserves: ReserveMap,
    positions: PositionMap,

    availableSupply: number, //from 0 to 100%
    availableBorrow: number, //from 0 to 100%

    initialInvestment: number, //in USD
    leverage: number,

    from: number, //date from (for simulation)

    simulationKeys: SimulationKeyMap, //cache keys for previously run simulations; store true/false for status of simulation completion
    isSimulationRunning: boolean,
};

export const positionSlice = createSlice({
    name: "position",
    initialState: { 
        market: DEFAULT_MARKET,
        reserves: {} as ReserveMap,
        initialInvestment: 1000,
        leverage: 0,
        positions: {} as PositionMap,
        availableSupply: 100, //start at 100% and decrease
        availableBorrow: 100, //start at 100% and decrease
        from: dayjs().subtract(1, 'year').startOf('day').unix(),
        simulationKeys: {} as SimulationKeyMap,
        isSimulationRunning: false,
    } as PositionState,
    reducers: {
        setSupplyPctBySymbol(state, action: PayloadAction<[string, number]>) {
            //Check if the key exists
            if (!state.positions[action.payload[0]]) {
                //key doesn't exist, let's create it
                state.positions[action.payload[0]] = {
                    supplyPct: 0, //@TODO - rename these to Factor, as they aren't really a %
                    borrowPct: 0,
                    stakingApr: 0,
                };
            }

            //Check if enough supply available!
            if (state.availableSupply + state.positions[action.payload[0]].supplyPct >= action.payload[1]) {
                //1. Readd this position's previous contribution back into the available supply
                state.availableSupply += state.positions[action.payload[0]].supplyPct;

                //2. Update this position with new supplyPct
                state.positions[action.payload[0]].supplyPct = action.payload[1];

                //3. Deduct this position's new contribution from available supply
                state.availableSupply -= action.payload[1];
            }
        },
        setBorrowPctBySymbol(state, action: PayloadAction<[string, number]>) {
            //Check if the key exists
            if (!state.positions[action.payload[0]]) {
                //key doesn't exist, let's create it
                state.positions[action.payload[0]] = {
                    supplyPct: 0,
                    borrowPct: 0,
                    stakingApr: 0,
                };
            }

            //Check if enough borrow available!
            if (state.availableBorrow + state.positions[action.payload[0]].borrowPct >= action.payload[1]) {
                //1. Readd this position's previous contribution to available borrow
                state.availableBorrow += state.positions[action.payload[0]].borrowPct;

                //2. Update this position with new borrowPct
                state.positions[action.payload[0]].borrowPct = action.payload[1];

                //3. Deduct this position's new contribution from available borrow
                state.availableBorrow -= action.payload[1];
            }
        },
        setStakingAprBySymbol(state, action) {
            //Check if the key exists
            if (!state.positions[action.payload[0]]) {
                //key doesn't exist, let's create it
                state.positions[action.payload[0]] = {
                    supplyPct: 0,
                    borrowPct: 0,
                    stakingApr: 0,
                };
            }

            state.positions[action.payload[0]].stakingApr = action.payload[1];
        },
        setLeverage: (state, action: PayloadAction<number>) => {
            state.leverage = action.payload;
        },
        setInitialInvestment: (state, action: PayloadAction<number>) => {
            state.initialInvestment = action.payload;
        },
        setFromDate: (state, action) => {
            state.from = action.payload;
        },
        addSimulationKey: (state, action) => {
            state.simulationKeys[JSON.stringify(action.payload)] = false; //assume simulation not complete
            state.isSimulationRunning = true;
        },
        deleteSimulationKey: (state, action) => {
            delete state.simulationKeys[JSON.stringify(action.payload)];
        },
        setSimulationKeyComplete: (state, action) => {
            state.simulationKeys[JSON.stringify(action.payload)] = true;
            state.isSimulationRunning = false;
        },
    },
});

export const { setSupplyPctBySymbol, setBorrowPctBySymbol, setStakingAprBySymbol, setLeverage, setInitialInvestment, setFromDate, addSimulationKey, deleteSimulationKey, setSimulationKeyComplete } = positionSlice.actions;

export const selectMarket = (state: RootState) => state.position.market;
export const selectPositions = (state: RootState) => state.position.positions;
export const selectLeverage = (state: RootState) => state.position.leverage;
export const selectInitialInvestment = (state: RootState) => state.position.initialInvestment;

export const selectAvailableSupply = (state: RootState) => state.position.availableSupply;
export const selectAvailableBorrow = (state: RootState) => state.position.availableBorrow;

export const selectPositionBySymbol = (state: RootState, symbol: string) => {
    return state.position.positions[symbol]; //could be undefined!
}; 

export const selectSupplyPctBySymbol = (state: RootState, symbol: string) => {
    return state.position.positions[symbol]?.supplyPct ?? 0;
};

export const selectBorrowPctBySymbol = (state: RootState, symbol: string) => {
    return state.position.positions[symbol]?.borrowPct ?? 0;
};

export const selectStakingAprBySymbol = (state: RootState, symbol: string) => {
    return state.position.positions[symbol]?.stakingApr ?? 0;
};

export const selectFromDate = (state: RootState) => state.position.from;

export const selectSimulationKeys = (state: RootState) => state.position.simulationKeys;
export const selectIsSimulationRunning = (state: RootState) => state.position.isSimulationRunning;

export default positionSlice.reducer;
