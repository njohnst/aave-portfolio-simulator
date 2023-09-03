import V3_MARKETS_LIST from "./v3Markets";


const BASE_URL = "https://aave-api-v2.aave.com/data";
const HISTORY_ENDPOINT = "rates-history";

const RESOLUTION_IN_HOURS = "24"; //24 hour resolution, don't need to be fancy

//See https://aave-api-v2.aave.com/#/data/get_data_rates_history
// reserveID: (For V3 markets: assetAddress + poolAddressesProvider + chainId)

export const fetchAaveV3History = (marketKey: string, assetAddress: string, fromUnixTimestamp: string) => {
    const market = V3_MARKETS_LIST[marketKey];

    const params: Array<{name: string, value: string}> = [
        { name: "reserveId", value: assetAddress + market.addressProvider.POOL_ADDRESSES_PROVIDER + market.addressProvider.CHAIN_ID, },
        { name: "from", value: fromUnixTimestamp, }, //from timestamp to now
        { name: "resolutionInHours", value: RESOLUTION_IN_HOURS, },
    ];

    return fetch(`${BASE_URL}/${HISTORY_ENDPOINT}${params.length ? "?" : ""}${params.map(param => param.name + "=" + param.value).join("&")}`);
};

// APR / 365 / 24 / 60/ 60 = interest per second (ips)
// 
// initial value * (1+ips)^(60*60); compounded value over 1hour using the average interest rate for that hour
//
//
// 24 HOURS
//
// V1: for i from 0 to 3600*24 { value *= (1+ips) }
// V2: for i from 0 to 24 { value *= (1+ips)^3600 }
//
//
