import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '..';
import { ReservesData } from '../services/web3/fetchAaveV3Data';
import dayjs from 'dayjs';
import { simulatorApi } from '../services/simulatorApi';
import V3_MARKETS_LIST from '../services/utils/v3Markets';

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
    riskFreeRate: number,
    swapFee: number,
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

    isSimulationRunning: boolean,

    riskFreeRate: number,
    swapFee: number,
};

export const positionSlice = createSlice({
    name: "position",
    initialState: { 
        market: DEFAULT_MARKET,
        reserves: {} as ReserveMap,
        initialInvestment: 1000,
        leverage: 1,
        positions: {} as PositionMap,
        availableSupply: 100, //start at 100% and decrease
        availableBorrow: 100, //start at 100% and decrease
        from: dayjs().subtract(1, 'year').startOf('day').unix(),
        isSimulationRunning: false,
        riskFreeRate: 0.01, //1%
        swapFee: 0.003, //0.3%
    } as PositionState,
    reducers: {
        setMarket(state, action: PayloadAction<string>) {
            //Make sure market key exists
            if (Object.keys(V3_MARKETS_LIST).includes(action.payload)){
                state.market = action.payload;
            }
        },
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
        setIsSimulationRunning: (state, action) => {
            state.isSimulationRunning = action.payload;
        },
        setRiskFreeRate: (state, action) => {
            state.riskFreeRate = action.payload;
        },
        setSwapFee: (state, action) => {
            state.swapFee = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addMatcher(
            simulatorApi.endpoints.getSimulationResult.matchPending,
            (state, _action) => {
                state.isSimulationRunning = true; //set simulation running! enable UI to display loading spinner, etc...
            }
        );
    },
});

export const {
    setMarket,
    setSupplyPctBySymbol,
    setBorrowPctBySymbol,
    setStakingAprBySymbol,
    setLeverage,
    setInitialInvestment,
    setFromDate,
    setIsSimulationRunning,
    setRiskFreeRate,
    setSwapFee,
} = positionSlice.actions;

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

export const selectIsSimulationRunning = (state: RootState) => state.position.isSimulationRunning;

export const selectRiskFreeRate = (state: RootState) => state.position.riskFreeRate;
export const selectSwapFee = (state: RootState) => state.position.swapFee;

export default positionSlice.reducer;
