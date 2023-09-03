import { ReservesData, aaveFetchContractData } from '@/app/utils/fetchAaveV3Data';
import { PayloadAction, createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { RootState } from '..';
import { AprData, SimulationArgs, SimulationResults, doSimulate } from './simulator';
import { fetchAaveV3History } from '@/app/utils/fetchAaveV3History';
import { AssetHistoryResponse, AssetQuery, fetchHistoricalPricesForAsset } from '@/app/utils/fetchCoinGeckoHistory';

const DEFAULT_MARKET : string = "polygonV3";

export type AssetPosition = {
    supplyPct: number,
    borrowPct: number,
};

export type PositionMap = {
    [symbol: string]: AssetPosition,
};

export interface PositionState {
    market: string, //market key in V3_MARKETS_LIST
    reserves: [ReservesData],
    positions: PositionMap,

    initialInvestment: number, //in USD
    leverage: number,

    simulationResults: SimulationResults,
};

export const fetchMarketData = createAsyncThunk(
    "position/fetchMarketData",
    async (market: string, _) => {
        return await aaveFetchContractData(market ?? DEFAULT_MARKET);
    },
);

export const fetchHistoricalAprs = createAsyncThunk(
    "position/fetchHistoricalAprs",
    async (args : { market: string, assetAddress: string, fromUnixTimestamp: string}, _) => {
        const { market, assetAddress, fromUnixTimestamp } = args;
        return await fetchAaveV3History(market, assetAddress, fromUnixTimestamp);
    },
);


export const fetchHistoricalPrices = createAsyncThunk(
    "position/fetchHistoricalPrices",
    async (asset : AssetQuery, _) => {
        //@@TODO hardcoded...
        //30 days...
        const fromDate = String(Math.floor(new Date((new Date()).valueOf() - 1000*60*60*24*30).valueOf()/1000));
        const toDate = String(Math.floor(new Date().valueOf()/1000));

        const response = await fetchHistoricalPricesForAsset(asset, fromDate, toDate);
        return await response.json();
    },
);

export const positionSlice = createSlice({
    name: "position",
    initialState: { market: DEFAULT_MARKET, reserves: new Array<ReservesData>(), initialInvestmentUSD: 1000, leverage: 0, positions: {} as PositionMap, simulationResults: {
        longSizeUSD: 0,
        shortSizeUSD: 0,
        nav: 0,
    }, },
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
    
    extraReducers: (builder) => {
        builder.addCase(fetchMarketData.fulfilled, (state, action) => {
            state.reserves = action.payload;
            state.market = action.meta.arg;
        });
        builder.addCase(fetchHistoricalAprs.fulfilled, (state, action) => {
            //@TODO
        });
        builder.addCase(fetchHistoricalPrices.fulfilled, (state, action) => {
            //@TODO
            //HACK
            console.log(action.payload);
        });
        builder.addCase(runSimulation.fulfilled, (state, action) => {
            state.simulationResults = action.payload as SimulationResults;
        });
    },
});

export const { setSupplyPctBySymbol, setBorrowPctBySymbol, setLeverage, setInitialInvestment } = positionSlice.actions;

export const selectMarket = (state: RootState) => state.position.market;
export const selectReserves = (state: RootState) => state.position.reserves;
export const selectPositions = (state: RootState) => state.position.positions;
export const selectLeverage = (state: RootState) => state.position.leverage;
export const selectInitialInvestment = (state: RootState) => state.position.initialInvestmentUSD;
export const selectSimulationResults = (state: RootState) => state.position.simulationResults;

export const selectReserveBySymbol = (symbol: string) => createSelector([selectReserves], (reserves) => {
    return reserves.find(reserve => reserve.symbol === symbol); //could be undefined!
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

export const selectMaxLtv = createSelector([selectPositions, selectReserves],(positions, reserves) => {
    const totals = Object.keys(positions).reduce((totals, symbol: string) => {
        const position = positions[symbol];
        const asset = reserves.find(asset => asset.symbol == symbol); //memoize here? or maybe need to change the data structure @@TODO@@

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

const simulationWorkers = {
    workers: new Array<Worker>(),
    numWorkers: 0,
    _create() {
        //TODO max pool size?
        this.numWorkers++;
        return new Worker(new URL("./simulationWorker.ts", import.meta.url));
    },
    _get() {
        //return and cycle; create worker if there are none available currently
        return this.workers.shift() ?? this._create();
    },
    run(args: SimulationArgs) {
        const worker = this._get();

        return new Promise(resolve => {
            worker.postMessage(args);

            worker.onmessage = (e:MessageEvent) => {
                this.workers.push(worker);

                resolve(e.data);
            };
            worker.onerror = (e: ErrorEvent) => {
                console.error(e);
            };
        });
    },
};

export const runSimulation = createAsyncThunk(
    "position/runSimulation",
    async (duration: number, { getState }) => {
        const state: RootState = getState() as RootState;

        const initialInvestment = selectInitialInvestment(state);
        const maxLtv = selectMaxLtv(state);
        const leverage = selectLeverage(state);
        const positions = selectPositions(state);
        const reserves = selectReserves(state);

        const args = {duration, initialInvestment, maxLtv, leverage, positions, reserves};

        //@TODO
        //get prices and aprs for each position
        const {priceResults, aprResults} = (await Promise.all(Object.keys(positions).map(async symbol => {
            const reserve = reserves.find(reserve => reserve.symbol === symbol);

            const name = reserve?.name;
            const address = reserve?.underlyingAsset;

            //@TODO
            const fromDate = String(Math.floor(new Date((new Date()).valueOf() - 1000*60*60*24*30).valueOf()/1000));
            const toDate = String(Math.floor(new Date().valueOf()/1000));

            const priceResult = await fetchHistoricalPricesForAsset({name: name as string, address: address as string, symbol }, fromDate, toDate); 
            const priceJson = await priceResult.json();

            //@TODO
            const market = selectMarket(state);

            const aprResponse = await fetchAaveV3History(market, address as string, fromDate);
            const aprJson = await aprResponse.json();
            
            return {priceResults: [symbol, priceJson], aprResults: [symbol, aprJson]};
        }))).reduce((r, x) => {
            r.priceResults.push(x.priceResults);
            r.aprResults.push(x.aprResults);
            return r;
        }, {priceResults: [], aprResults: []});
               
        const prices = priceResults.reduce((priceMap, entry) => {
            priceMap[entry[0]] = entry[1];
            return priceMap;
        }, {} as {[k: string]: AssetHistoryResponse});

        const aprs = aprResults.reduce((aprMap, entry) => {
            aprMap[entry[0]] = entry[1];
            return aprMap;
        }, {} as {[k: string]: AprData});

        //check if browser supports web workers
        if (window.Worker) {
            return await simulationWorkers.run({...args, aprs, prices});
        } else {
            //otherwise, just block
            return doSimulate({...args, aprs, prices});
        }
    },
);

export default positionSlice.reducer;
