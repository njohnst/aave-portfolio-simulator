import { FetchBaseQueryError, createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

const BASE_URL = "https://api.coingecko.com/api/v3/coins";
const LIST_ENDPOINT = "/list?include_platform=true"; //hardcode platform variable; this is for searching by contract
const CHART_RANGE_ENDPOINT = "/market_chart/range";

const BASE_CURRENCY = "usd";
const PRECISION = "full";

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
    from: string,
    to: string,
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
        //https://api.coingecko.com/api/v3/coins/${coin}/market_chart/range?vs_currency=usd&from=${from}&to=${to}&precision=full
        getHistory: builder.query({
            queryFn: async (coinQuery: CGPriceQuery, _api, _options, baseQuery) => {
                const {coin, from, to} = coinQuery;

                const result = await baseQuery(`/${coin}${CHART_RANGE_ENDPOINT}?vs_currency=${BASE_CURRENCY}&precision=${PRECISION}&from=${from}&to=${to}`);

                if (result.data) {
                    return { data: result.data };
                } else {
                    return { error: result.error as FetchBaseQueryError };
                }
            }
        }),
    })
});
