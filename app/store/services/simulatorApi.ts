//Adapter / dummy API slice

import { BaseQueryFn, createApi } from "@reduxjs/toolkit/query/react";
import { AaveHistoryQuery, aaveApi } from "./aaveApi";
import { AssetHistoryResponse, CGPriceQuery, coingeckoApi } from "./coingeckoApi";
import { simulationWorkers } from "./simulation/workerPool";
import { AprData, SimulationArgs, doSimulate } from "./simulation/simulator";
import { RootState } from "..";
import { ReserveMap, selectInitialInvestment, selectLeverage, selectMarket, selectMaxLtv, selectPositions } from "../slices/positionSlice";
import { ThunkDispatch } from "@reduxjs/toolkit";


const simulatorBaseQuery: BaseQueryFn = async (args, _api, _extraOptions) => {
    //Check if we can use workers
    if (window.Worker) {
        return {
            data: await simulationWorkers.run(args),
        };
    } else {
        return {
            data: doSimulate(args), //blocking...
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
            queryFn: async (_, { dispatch, getState }, _options, runSimulationQuery) => {
                const state = getState() as RootState;

                const marketKey = selectMarket(state);

                try {
                    //get our positions
                    const positionMap = selectPositions(state);

                    //get the reserves
                    const _sub = dispatch(aaveApi.endpoints.getAaveContractData.initiate(marketKey));
                    const reservesMap = (await _sub).data;
                    if (!reservesMap) { throw new Error("no reserves data"); }
                    _sub.unsubscribe();

                    //get the list of coingecko tokens
                    const cgLut = await apiSubscriptionShim.getCGList(state, dispatch);


                    const {prices, aprs} = (await Promise.all(Object.keys(positionMap).map(async symbol => {
                        const reserve = reservesMap[symbol];
                
                        const name = reserve?.name;
                        const assetAddress = reserve?.underlyingAsset;

                        const coin = cgLut[symbol.toLowerCase()][assetAddress] ?? cgLut[symbol.toLowerCase()][name];

                        const from = String(Math.floor(new Date((new Date()).valueOf() - 1000*60*60*24*30).valueOf()/1000));
                        const to = String(Math.floor(new Date().valueOf()/1000));
                
                        const priceHistory = await apiSubscriptionShim.getCGHistoryForToken(state, dispatch, {coin, from, to});
                        const aprHistory = await apiSubscriptionShim.getAaveHistoryForToken(state, dispatch, {marketKey, assetAddress, from});
                        
                        return {priceResults: [symbol, priceHistory], aprResults: [symbol, aprHistory]};
                    }))).reduce((results, item) => {
                        results.prices[item.priceResults[0]] = item.priceResults[1];
                        results.aprs[item.aprResults[0]] = item.aprResults[1];
                        return results;
                    }, {prices: {}, aprs: {}} as { prices: {[k: string]: AssetHistoryResponse}, aprs: {[k: string]: AprData[]} });

                    const args: SimulationArgs = {
                        initialInvestment: selectInitialInvestment(state),
                        maxLtv: selectMaxLtv(state),
                        leverage: selectLeverage(state),
                        positions: positionMap,
                        reserves: reservesMap as ReserveMap,
                        aprs,
                        prices,
                    };

                    return {
                        data: (await runSimulationQuery(args)).data,
                    };
                }
                catch (e) {
                    return {
                        error: e,
                    };
                }
            },
        }),
    }),
});

export const { useLazyGetSimulationResultQuery } = simulatorApi;
