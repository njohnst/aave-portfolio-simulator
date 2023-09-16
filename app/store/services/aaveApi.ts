import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import V3_MARKETS_LIST from "./utils/v3Markets";
import { aaveFetchContractData } from "./web3/fetchAaveV3Data";

const BASE_URL = "https://aave-api-v2.aave.com/data";
const HISTORY_ENDPOINT = "/rates-history";

const RESOLUTION_IN_HOURS = "24"; //24 hour resolution, don't need to be fancy

export type AaveHistoryQuery = {
    marketKey: string,
    assetAddress: string,
    from: string,
};

//See https://aave-api-v2.aave.com/#/data/get_data_rates_history
// reserveID: (For V3 markets: assetAddress + poolAddressesProvider + chainId)

export const aaveApi = createApi({
    reducerPath: "api/aave",
    baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
    endpoints: (builder) => ({
        //https://aave-api-v2.aave.com/data/rates-history?reserveId=${reserveId}&from=${from}&resolutionInHours=${RESOLUTION_IN_HOURS}
        getRateHistory: builder.query({
            query: ({marketKey, assetAddress, from}: AaveHistoryQuery) => {
                const market = V3_MARKETS_LIST[marketKey];
                const reserveId = assetAddress + market.addressProvider.POOL_ADDRESSES_PROVIDER + market.addressProvider.CHAIN_ID;
                return `${HISTORY_ENDPOINT}?reserveId=${reserveId}&from=${from}&resolutionInHours=${RESOLUTION_IN_HOURS}`;
            },
        }),
        //web3 contract data using ethers
        //use custom queryFn here
        getAaveContractData: builder.query({
            queryFn: async (args) => {
                const result = await aaveFetchContractData(args);

                if (result.error) {
                    return {
                        error: {
                            status: -1,
                            data: result.error,
                        }
                    };
                }

                return {
                    data: result.data,
                };
            },
        })
    }),
});

export const useGetAaveContractDataQuery = aaveApi.useGetAaveContractDataQuery;
