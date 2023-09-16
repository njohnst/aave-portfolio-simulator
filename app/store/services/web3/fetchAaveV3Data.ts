import config from "../utils/networkConfig.json";

import { FormatReserveUSDResponse, formatReservesAndIncentives } from '@aave/math-utils';
import { ethers } from 'ethers';
import {
  UiPoolDataProvider,
  UiIncentiveDataProvider,
  ReserveDataHumanized,
} from '@aave/contract-helpers';
import V3_MARKETS_LIST from "../utils/v3Markets";
import { CalculateReserveIncentivesResponse } from "@aave/math-utils/dist/esm/formatters/incentive/calculate-reserve-incentives";

type MarketKey = keyof typeof config;
type AllocationData = {
  supplyPct: number,
  borrowPct: number,
};
export type ReservesData = (FormatReserveUSDResponse & ReserveDataHumanized & Partial<CalculateReserveIncentivesResponse> & Partial<AllocationData>);


export async function aaveFetchContractData(marketKey: string) {
  try {
    const market = V3_MARKETS_LIST[marketKey];

    const provider = new ethers.providers.JsonRpcProvider(
        config[marketKey as MarketKey].rpc[0],
    );

    // View contract used to fetch all reserves data (including market base currency data), and user reserves
    const poolDataProviderContract = new UiPoolDataProvider({
      uiPoolDataProviderAddress: market.addressProvider.UI_POOL_DATA_PROVIDER,
      provider,
      chainId: market.addressProvider.CHAIN_ID,
    });
    
    // View contract used to fetch all reserve incentives (APRs), and user incentives
    const incentiveDataProviderContract = new UiIncentiveDataProvider({
      uiIncentiveDataProviderAddress:
        market.addressProvider.UI_INCENTIVE_DATA_PROVIDER,
      provider,
      chainId: market.addressProvider.CHAIN_ID,
    });

    const reservesDataHumanized = await poolDataProviderContract.getReservesHumanized({
        lendingPoolAddressProvider: market.addressProvider.POOL_ADDRESSES_PROVIDER,
    });
    const reserveIncentives = await incentiveDataProviderContract.getReservesIncentivesDataHumanized({
      lendingPoolAddressProvider: market.addressProvider.POOL_ADDRESSES_PROVIDER,
    });

    const reservesArray = reservesDataHumanized.reservesData;
    const baseCurrencyData = reservesDataHumanized.baseCurrencyData;

    const currentTimestamp = Math.floor(Date.now() / 1000);

    return {
      data: formatReservesAndIncentives({
        reserves: reservesArray,
        currentTimestamp,
        marketReferenceCurrencyDecimals:
            baseCurrencyData.marketReferenceCurrencyDecimals,
        marketReferencePriceInUsd: baseCurrencyData.marketReferenceCurrencyPriceInUsd,
        reserveIncentives,
      }).reduce((reserveMap, reserve) => {
        reserveMap[reserve.symbol] = reserve;
        return reserveMap;
      }, {} as {[k:string]: ReservesData}),
    };
  }
  catch (e) {
    return {
      error: e,
    }
  }
}
