//Adapter / dummy API slice

import { BaseQueryFn, QueryStatus, createApi } from "@reduxjs/toolkit/query/react";
import { AaveHistoryQuery, aaveApi } from "./aaveApi";
import { AssetHistoryResponse, CGPriceQuery, coingeckoApi } from "./coingeckoApi";
import { simulationWorkers } from "./simulation/workerPool";
import { AprData, SimulationArgs, doSimulate } from "./simulation/simulator";
import { RootState } from "..";
import { SimulationKey, setIsSimulationRunning } from "../slices/positionSlice";
import { ThunkDispatch, createSelector } from "@reduxjs/toolkit";
import dayjs from "dayjs";
import V3_MARKETS_LIST from "./utils/v3Markets";


const simulatorBaseQuery: BaseQueryFn = async (args, _api, _extraOptions) => {
    //Check if we can use workers
    if (window.Worker) {
        return await simulationWorkers.run(args).then(data => { return {data} }).catch((error) => { return {error: error.message} });
    } else {
        try {
            return {
                data: doSimulate(args), //blocking...
            };
        }
        catch(e) {
            return {
                error: (e as Error).message,
            };
        }
    }
};

//shim to hold the subscriptions so that we can maintain caching
const apiSubscriptionShim = {
    _cgListSub: null as any,
    _cgListSel: <ReturnType<typeof coingeckoApi.endpoints.getList.select> | null> null,
    
    _cgTokenHistorySubMap: new Map<CGPriceQuery,any>(),
    _cgTokenHistorySelMap: new Map<CGPriceQuery,ReturnType<typeof coingeckoApi.endpoints.getHistory.select>>(),

    _aaveTokenHistorySubMap: new Map<AaveHistoryQuery,any>(),
    _aaveTokenHistorySelMap: new Map<AaveHistoryQuery,ReturnType<typeof aaveApi.endpoints.getRateHistory.select>>(),

    async getCGList(state: RootState, dispatch: ThunkDispatch<any, any, any>) {
        if (!this._cgListSub) {
            //create subscription
            this._cgListSub = dispatch(coingeckoApi.endpoints.getList.initiate(null));
            this._cgListSel = coingeckoApi.endpoints.getList.select(null);
        }

        //check if value is available
        if (this._cgListSub.isSuccess && this._cgListSel) {
            return this._cgListSel(state).data;
        }

        //otherwise, lets await it
        return (await this._cgListSub).data;
    },
    async getCGHistoryForToken(state: RootState, dispatch: ThunkDispatch<any, any, any>, coinQuery: CGPriceQuery) {
        if (!this._cgTokenHistorySubMap.has(coinQuery)) {
            //create subscription
            this._cgTokenHistorySubMap.set(coinQuery, dispatch(coingeckoApi.endpoints.getHistory.initiate(coinQuery)))
            this._cgTokenHistorySelMap.set(coinQuery, coingeckoApi.endpoints.getHistory.select(coinQuery))
        }

        //check if value is available
        if (this._cgTokenHistorySubMap.get(coinQuery).isSuccess) {
            return this._cgTokenHistorySubMap.get(coinQuery)(state).data;
        }

        //otherwise wait for it
        return (await this._cgTokenHistorySubMap.get(coinQuery)).data;
    },
    async getAaveHistoryForToken(state: RootState, dispatch: ThunkDispatch<any, any, any>, aaveHistoryQuery: AaveHistoryQuery) {
        if (!this._aaveTokenHistorySubMap.has(aaveHistoryQuery)) {
            //create subscription
            this._aaveTokenHistorySubMap.set(aaveHistoryQuery, dispatch(aaveApi.endpoints.getRateHistory.initiate(aaveHistoryQuery)))
            this._aaveTokenHistorySelMap.set(aaveHistoryQuery, aaveApi.endpoints.getRateHistory.select(aaveHistoryQuery))
        }

        //check if value is available
        if (this._aaveTokenHistorySubMap.get(aaveHistoryQuery).isSuccess) {
            return this._aaveTokenHistorySubMap.get(aaveHistoryQuery)(state).data;
        }

        //otherwise wait for it
        return (await this._aaveTokenHistorySubMap.get(aaveHistoryQuery)).data;
    },
};


export const simulatorApi = createApi({
    reducerPath: "api/simulator",
    baseQuery: simulatorBaseQuery,
    endpoints: (builder) => ({
        getSimulationResult: builder.query({
            queryFn: async (simulationKey: SimulationKey, { dispatch, getState }, _options, runSimulationQuery) => {
                const state = getState() as RootState;

                const { marketKey, initialInvestment, maxLtv, leverage, positionMap, reserveMap, fromDate, riskFreeRate, swapFee } = simulationKey;

                try {
                    //input validation
                    if  (initialInvestment <= 0) {
                        throw new Error(`invalid initialInvestment (${initialInvestment}) passed to simulation api`);
                    }

                    if (!(marketKey in V3_MARKETS_LIST)) { //market doesn't exist
                        throw new Error(`invalid marketKey (${marketKey}) passed to simulation api`);
                    }
                    
                    if (maxLtv <= 0) { //invalid LTV
                        throw new Error(`invalid maxLtv (${maxLtv}) passed to simulation api`);
                    }
                    
                    if (leverage <= 0) { //invalid leverage
                        throw new Error(`invalid leverage (${leverage}) passed to simulation api`);
                    }

                    if (!Object.keys(positionMap).length) { //no positions specified
                        throw new Error(`invalid positionMap, no positions specified to simulation api`);
                    }

                    if (Object.keys(reserveMap).length < Object.keys(positionMap).length) { //there are more positions than reserves, which means a reserve lookup will fail
                        throw new Error(`invalid reserveMap, less reserves than positions (reserve lookup will fail) passed to simulation api`);
                    }

                    if (!dayjs(fromDate).isValid()) { //invalid start date for simulation
                        throw new Error(`invalid startDate (${fromDate}) passed to simulation api`);
                    }

                    //get the list of coingecko tokens
                    const cgLut = await apiSubscriptionShim.getCGList(state, dispatch);
                
                    const {prices, aprs} = (await Promise.all(Object.keys(positionMap).map(async symbol => {
                        const reserve = reserveMap[symbol];
                
                        const name = reserve?.name;
                        const assetAddress = reserve?.underlyingAsset;

                        const coin = cgLut[symbol.toLowerCase()][assetAddress] ?? cgLut[symbol.toLowerCase()][name];

                        const days = dayjs().diff(dayjs.unix(fromDate), 'day'); //get the number of days we want to input into coingecko API

                        const priceHistory = await apiSubscriptionShim.getCGHistoryForToken(state, dispatch, {coin, days});
                        const aprHistory = await apiSubscriptionShim.getAaveHistoryForToken(state, dispatch, {marketKey, assetAddress, from: String(fromDate)});
                        
                        return {priceResults: [symbol, priceHistory], aprResults: [symbol, aprHistory]};
                    }))).reduce((results, item) => {
                        results.prices[item.priceResults[0]] = item.priceResults[1];
                        results.aprs[item.aprResults[0]] = item.aprResults[1];
                        return results;
                    }, {prices: {}, aprs: {}} as { prices: {[k: string]: AssetHistoryResponse}, aprs: {[k: string]: AprData[]} });

                    const args: SimulationArgs = {
                        initialInvestment,
                        maxLtv,
                        leverage,
                        positions: positionMap,
                        reserves: reserveMap,
                        aprs,
                        prices,
                        riskFreeRate,
                        swapFee,
                    };

                    const queryResults = await runSimulationQuery(args);

                    //tell the results panel that simulation is complete and make it visible
                    dispatch(setIsSimulationRunning(false));

                    return queryResults;
                }
                catch (e) {
                    console.error((e as Error).message);

                    dispatch(setIsSimulationRunning(false)); //set running to false to allow new simulations

                    return {
                        error: (e as Error).message,
                    };
                }
            },
        }),
    }),
});

export const { useGetSimulationResultQuery } = simulatorApi;


//begin hack section
//select simulator API state
//(for createSelector/memoization)
const selectSimulatorApiState = (state: RootState) => {
    return state['api/simulator'];
};

//return the current queryCacheKeys and their results
export const selectSimulationApiQueries = createSelector([selectSimulatorApiState], (simApiState) => {
    return Object.entries(simApiState.queries).filter(([key, entry]) => {
        //filter out rejected queries and any query which is not "getSimulationResult" (vacuous because that's the only one on this API currently...)
        return key.startsWith("getSimulationResult(") && entry?.status !== QueryStatus.rejected;
    });
});
