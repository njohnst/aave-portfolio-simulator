# Aave Portfolio Simulator

# Use cases

1. Specify a long position and short position; leverage ratio, safety margin, etc.,
then simulate that portfolio on the given timescale

2. Find the optimal portfolio given certain constraints (?)

# Scope

* Only Aave v3
* Limited to one market (one chain ID)
* Variable borrow only
* No EMODE
* Frozen and inactive assets are filtered out
* Hardcoded list of markets / chain IDs
* Includes staking yields for liquid staking tokens
* No advanced forecasting, just "use current rate for X time" or "use past X time of rates"
* No computation of effect of position size on market or consideration for the available liquidity

# Details

* "Leverage" is looping value: 0 means no borrowing, just long; 1 means borrow once and redeposit it; 0.5 means borrow half of available borrow once and redeposit it, etc;

# Testing

* Limited to testing that the portfolio calculations are correct
* Check that portfolios with invalid LTVs etc. are not allowed
* Check that correct yield is computed for a few sample portfolios (1. no leverage, 2. with leverage, 3. with staking yields, 4. negative yield)




##
## SAMPLE DATA
##


// id: "137-0x8f3cf7ad23cd3cadbd9735aff958023239c6a063-0xa97684ead0e402dc232d5a977953df7ecbab3cdb", 
// underlyingAsset: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", 
// name: "(PoS) Dai Stablecoin", … }

// aIncentivesData: Array []
// aTokenAddress: "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE"
// accruedToTreasury: "252403267597617698222"
// availableDebtCeilingUSD: "0"
// availableLiquidity: "1777910420667538293057798"
// availableLiquidityUSD: "1777910.420667538293057798"
// averageStableRate: "55900938515950023565797525"
// baseLTVasCollateral: "7600"
// baseStableBorrowRate: "50000000000000000000000000"
// baseVariableBorrowRate: "0"
// ​​
// borrowCap: "30000000"
// borrowCapUSD: "30000000"
// borrowUsageRatio: "0.80072800188809261835"
// borrowableInIsolation: true
// borrowingEnabled: true
// ​​
// debtCeiling: "0"
// debtCeilingDecimals: 2
// debtCeilingUSD: "0"
// decimals: 18
// ​​
// eModeCategoryId: 1
// eModeLabel: "Stablecoins"
// eModeLiquidationBonus: 10100
// eModeLiquidationThreshold: 9500
// eModeLtv: 9300
// eModePriceSource: "0x0000000000000000000000000000000000000000"
// ​​
// flashLoanEnabled: true
// ​​
// formattedAvailableLiquidity: "1777910.420667538293057798"
// formattedBaseLTVasCollateral: "0.76"
// formattedEModeLiquidationBonus: "0.01"
// formattedEModeLiquidationThreshold: "0.95"
// formattedEModeLtv: "0.93"
// formattedPriceInMarketReferenceCurrency: "1"
// formattedReserveLiquidationBonus: "0.05"
// formattedReserveLiquidationThreshold: "0.81"
// ​​
// id: "137-0x8f3cf7ad23cd3cadbd9735aff958023239c6a063-0xa97684ead0e402dc232d5a977953df7ecbab3cdb"
// ​​
// interestRateStrategyAddress: "0xA9F3C3caE095527061e6d270DBE163693e6fda9D"
// ​​
// isActive: true
// isFrozen: false
// isIsolated: false
// isPaused: false
// isSiloedBorrowing: false
// ​​
// isolationModeTotalDebt: "0"
// isolationModeTotalDebtUSD: "0"
// ​​
// lastUpdateTimestamp: 1692290066
// liquidityIndex: "1022811701596486981220379908"
// liquidityRate: "31159384170302898650196969"
// ​​
// name: "(PoS) Dai Stablecoin"
// optimalUsageRatio: "800000000000000000000000000"
// priceInMarketReferenceCurrency: "100000000"
// ​​
// priceInUSD: "1"
// priceOracle: "0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D"
// ​​
// reserveFactor: "0.1"
// reserveLiquidationBonus: "10500"
// reserveLiquidationThreshold: "8100"
// ​​
// sIncentivesData: Array []

// stableBorrowAPR: "0.05772996113882984742"
// stableBorrowAPY: "0.05942887005795418576"
// stableBorrowRate: "57729961138829847423882363"
// stableBorrowRateEnabled: true
// ​​
// stableDebtLastUpdateTimestamp: 1692288016
// stableDebtTokenAddress: "0xd94112B5B62d53C9402e7A60289c6810dEF1dC9B"
// stableRateSlope1: "5000000000000000000000000"
// stableRateSlope2: "750000000000000000000000000"
// ​​
// supplyAPR: "0.03115938417030289865"
// supplyAPY: "0.03164991943412932355"
// supplyCap: "45000000"
// supplyCapUSD: "45000000"
// supplyUsageRatio: "0.80072800188809261835"
// ​​
// symbol: "DAI"
// totalDebt: "7144117.950168074340453784"
// totalDebtUSD: "7144117.950168074340453784"
// totalLiquidity: "8922028.370835612633511582"
// totalLiquidityUSD: "8922028.370835612633511582"
// totalPrincipalStableDebt: "275336.656305928536199617"
// totalScaledVariableDebt: "6601959.133231893165395196"
// totalStableDebt: "275337.684170041940186977"
// totalStableDebtUSD: "275337.684170041940186977"
// totalVariableDebt: "6868780.265998032400266807"
// totalVariableDebtUSD: "6868780.265998032400266807"
// ​​
// unbacked: "0"
// unbackedUSD: "0"
// unborrowedLiquidity: "1777910.420667538293057798"

// underlyingAsset: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063"
// usageAsCollateralEnabled: true
// vIncentivesData: Array []

// variableBorrowAPR: "0.04272996113882984742"
// variableBorrowAPY: "0.04365602907920702636"
// variableBorrowIndex: "1040415368558723730023466938"
// variableBorrowRate: "42729961138829847423882363"
// ​​
// variableDebtTokenAddress: "0x8619d80FB0141ba7F184CbF22fd724116D9f7ffC"
// variableRateSlope1: "40000000000000000000000000"
// variableRateSlope2: "750000000000000000000000000"
