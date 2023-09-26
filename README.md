# Aave Portfolio Simulator

# Use cases

1. Specify a long position and short position; leverage ratio, safety margin, etc.,
then simulate that portfolio on the given timescale (from DATE until now; default is 1 year in the past until now)

2. Find the optimal portfolio given certain constraints (?)

# Scope

* Only Aave v3
* Limited to one market (one chain ID, no cross chain strategies)
* Variable borrow only
* No EMODE
* Frozen, paused, siloed and inactive assets are filtered out
* Hardcoded list of markets / chain IDs
* Includes staking yields for liquid staking tokens
* Does not include incentive yields (very few chains / assets offering incentives at this time...)
* Estimates swap fees
* No advanced forecasting, just "use past X time of rates"
* No computation of effect of position size on market or consideration for the available liquidity
* @@TODO missing timestamps are not handled correctly in the current implementation!

# Details

* "Leverage" refers to supply position leverage; if leverage=1 then assets are supplied but no borrowing occurs; if leverage=2 then assets are supplied and borrowed against / looped until the supply position is 200% of the specified investment size

# Testing (TODO)

* Limited to testing that the portfolio calculations are correct
* Check that portfolios with invalid LTVs etc. are not allowed
* Check that correct yield is computed for a few sample portfolios (1. no leverage, 2. with leverage, 3. with staking yields, 4. negative yield)