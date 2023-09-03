import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

const BASE_URL = "https://api.coingecko.com/api/v3/coins";
const LIST_ENDPOINT = "/list?include_platform=true"; //hardcode platform variable; this is for searching by contract
const CHART_RANGE_ENDPOINT = "/market_chart/range";

const BASE_CURRENCY = "usd";
const PRECISION = "full";

export const coingeckoApi = createApi({
    reducerPath: "api/coingecko",
    baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
    endpoints: (builder) => ({
        //https://api.coingecko.com/api/v3/coins/list?include_platform=true
        getList: builder.query({
            query: () => LIST_ENDPOINT,
        }),
        //https://api.coingecko.com/api/v3/coins/${coin}/market_chart/range?vs_currency=usd&from=${from}&to=${to}&precision=full
        getHistory: builder.query({
            query: ({coin, from, to}) => `/${coin}/${CHART_RANGE_ENDPOINT}?vs_currency=${BASE_CURRENCY}&precision=${PRECISION}&from=${from}&to=${to}`,
        }),
    })
});
