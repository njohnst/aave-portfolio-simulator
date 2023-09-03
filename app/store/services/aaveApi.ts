import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import V3_MARKETS_LIST from "@/app/utils/v3Markets";

const BASE_URL = "https://aave-api-v2.aave.com/data";
const HISTORY_ENDPOINT = "/rates-history";

const RESOLUTION_IN_HOURS = "24"; //24 hour resolution, don't need to be fancy

//See https://aave-api-v2.aave.com/#/data/get_data_rates_history
// reserveID: (For V3 markets: assetAddress + poolAddressesProvider + chainId)

export const aaveApi = createApi({
    reducerPath: "api/aave",
    baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
    endpoints: (builder) => ({
        //https://aave-api-v2.aave.com/data/rates-history?reserveId=${reserveId}&from=${from}&resolutionInHours=${RESOLUTION_IN_HOURS}
        getRateHistory: builder.query({
            query: ({marketKey, assetAddress, from}) => {
                const market = V3_MARKETS_LIST[marketKey];
                const reserveId = assetAddress + market.addressProvider.POOL_ADDRESSES_PROVIDER + market.addressProvider.CHAIN_ID;
                return `${HISTORY_ENDPOINT}?reserveId=${reserveId}&from=${from}&resolutionInHours=${RESOLUTION_IN_HOURS}`;
            },
        }),
    }),
});
