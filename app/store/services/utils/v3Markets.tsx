import * as markets from '@bgd-labs/aave-address-book';

//hack...
export type AddressProvider =
  typeof markets.AaveV3Ethereum |
  typeof markets.AaveV3Arbitrum |
  typeof markets.AaveV3Avalanche |
  typeof markets.AaveV3Fantom |
  typeof markets.AaveV3Harmony |
  typeof markets.AaveV3Optimism |
  typeof markets.AaveV3Polygon |
  typeof markets.AaveV3Metis;

export type Market = {
  name: string,
  addressProvider: AddressProvider,
};

type MarketList = { [k: string]: Market };

//Hardcode list of v3 markets
const V3_MARKETS_LIST : MarketList = {
  ethereumV3: { name: "Ethereum V3", addressProvider: markets.AaveV3Ethereum },
  arbitrumV3: { name: "Arbitrum V3", addressProvider: markets.AaveV3Arbitrum },
  avalancheV3: { name: "Avalanche V3", addressProvider: markets.AaveV3Avalanche },
  fantomV3: { name: "Fantom V3", addressProvider: markets.AaveV3Fantom },
  harmonyV3: { name: "Harmony V3", addressProvider: markets.AaveV3Harmony },
  optimismV3: { name: "Optimism V3", addressProvider: markets.AaveV3Optimism },
  polygonV3: { name: "Polygon V3", addressProvider: markets.AaveV3Polygon },
  metisV3: { name: "Metis V3", addressProvider: markets.AaveV3Metis },
};

export default V3_MARKETS_LIST;
