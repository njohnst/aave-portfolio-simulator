const BASE_URL = "https://api.coingecko.com/api/v3/coins";
const LIST_ENDPOINT = "list?include_platform=true"; //hardcode platform variable; this is for searching by contract
const CHART_RANGE_ENDPOINT = "market_chart/range";

//https://api.coingecko.com/api/v3/coins/list
//https://api.coingecko.com/api/v3/coins/chainlink/market_chart/range?vs_currency=usd&from=1392577232&to=1422577232&precision=full

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

export const fetchHistoricalPricesForAsset = async (asset: AssetQuery, fromUnixTimestamp: string, toUnixTimestamp: string) => {
    //@@TODO input validation

    const response = await fetch(`${BASE_URL}/${LIST_ENDPOINT}`);
    const coinList = await response.json();

    const assetIdString = coinList.find((coin: AssetListing) => {
        //either 1a or 1b, and 2 must match
        //(1a. check for name exact match || 1b. check for address match) && (2. symbol match)
        return (coin.name === asset.name || Object.keys(coin?.platforms).find(platform => coin.platforms[platform] === asset.address)) && coin.symbol.toLowerCase() === asset.symbol.toLowerCase();
    })?.id;

    //@@TODO handle error case

    const params: Array<{name: string, value: string}> = [
        { name: "vs_currency", value: BASE_CURRENCY }, //hardcoded usd
        { name: "from", value: fromUnixTimestamp },
        { name: "to", value: toUnixTimestamp },
        { name: "precision", value: PRECISION }, //hardcoded full precision
    ];

    return fetch(`${BASE_URL}/${assetIdString}/${CHART_RANGE_ENDPOINT}${params.length ? "?" : ""}${params.map(param => param.name + "=" + param.value).join("&")}`);
};
