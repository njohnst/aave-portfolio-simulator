import { FetchBaseQueryError, createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

const BASE_URL = "https://api.coingecko.com/api/v3/coins";
const LIST_ENDPOINT = "/list?include_platform=true"; //hardcode platform variable; this is for searching by contract
const CHART_ENDPOINT = "/market_chart";

const BASE_CURRENCY = "usd";
const PRECISION = "full";
const INTERVAL = "daily";

export type AssetListing = {
    id: string,
    symbol: string,
    name: string,
    platforms: { [network: string]: string, },
};

export type AssetQuery = {
    address: string,
    name: string,
    symbol: string,
};

export type AssetHistoryResponse = { 
    prices: Array<any>, 
    market_caps: Array<any>,
    total_volumes: Array<any>,
};

export type CGAssetIDLookup = {
    [symbol: string] : {
        [addressOrName: string]: string,
    },
};

export type CGPriceQuery = {
    coin: string,
    days: number,
};

export const coingeckoApi = createApi({
    reducerPath: "api/coingecko",
    baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
    endpoints: (builder) => ({
        //https://api.coingecko.com/api/v3/coins/list?include_platform=true
        getList: builder.query({
            queryFn: async (_arg, api, _options, baseQuery) => {
                const result = await baseQuery(LIST_ENDPOINT);

                //@@TODO transform result!
                //lets index like:
                /**
                 * 
                 *  {
                 *      [symbol]: {
                 *          [address]: {...}
                 *          [name]: {...}
                 *      }
                 *  }
                 * 
                 */
                // @@ N.B. objects could be duplicated several times; they are just references though
                //this operation might be slow? let's try it

                if (result.data) {
                    const listings = result.data as AssetListing[];
                    const lut = listings.reduce((lut, listing) => {
                        if (!lut[listing.symbol]) {
                            lut[listing.symbol] = {};
                        }

                        lut[listing.symbol][listing.name] = listing.id;
                        
                        Object.values(listing.platforms).forEach(address => {
                            lut[listing.symbol][address] = listing.id;
                        });

                        return lut;
                    }, {} as CGAssetIDLookup);

                    return { data: lut };
                } else {
                    return { error: result.error as FetchBaseQueryError };
                }
            },
        }),
        //https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=${days}&precision=full&interval=daily
        getHistory: builder.query({
            queryFn: async (coinQuery: CGPriceQuery, _api, _options, baseQuery) => {
                const {coin, days} = coinQuery;

                const result = await baseQuery(`/${coin}${CHART_ENDPOINT}?vs_currency=${BASE_CURRENCY}&precision=${PRECISION}&interval=${INTERVAL}&days=${days}`);

                if (result.data) {
                    return { data: result.data };
                } else {
                    return { error: result.error as FetchBaseQueryError };
                }
            }
        }),
    })
});
