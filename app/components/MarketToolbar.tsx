import { Button, FormControl, Box, Grid, InputAdornment, InputLabel, MenuItem, Select, Slider, Stack, TextField, Typography, CircularProgress, Tooltip} from '@mui/material';
import { GridToolbarContainer } from '@mui/x-data-grid';
import V3_MARKETS_LIST from '@/app/store/services/utils/v3Markets';

import React from 'react';

import { useAppDispatch, useAppSelector } from '../hooks';
import { selectMarket, selectLeverage, setLeverage, selectInitialInvestment, setInitialInvestment, selectPositions, ReserveMap, selectFromDate, setFromDate, selectIsSimulationRunning, selectAvailableSupply, selectAvailableBorrow, SimulationKey, selectRiskFreeRate, setRiskFreeRate, selectSwapFee, setSwapFee, setIsSimulationRunning } from "@/app/store/slices/positionSlice";
import { useGetAaveContractDataQuery } from '../store/services/aaveApi';
import { calculateMaxLeverage, calculateMaxLtv, calculateCurrentHealthFactor } from '../store/slices/utils/calculations';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { simulatorApi } from '../store/services/simulatorApi';

const LEVERAGE_STEP_SIZE = 0.01;

//not sure exact date, it's in January 2017 though
//use this constant to prevent the date picker from going back before this time since it won't be relevant
//since this is Aave V3 simulator the real date should be way different, but maybe it's helpful to use old data... won't restrict this
const AAVE_ORIGINAL_LAUNCH_DATE = dayjs(new Date(2017, 0, 1)); 

const getHealthFactorColor = (healthFactor: number) => {
  if (healthFactor < 1.2) {
    return 'red'; //danger
  } else if (healthFactor < 1.5) {
    return 'orange'; //warning
  } else {
    return 'green'; //safe
  }
};

const LabelWithInfoTooltip = (props: {label: string, tooltip: string}) => {
  return <Tooltip title={props.tooltip}>
    <div style={{display:"flex", alignItems:"center"}}>
      {props.label}
      <InfoIcon/>
    </div>
  </Tooltip>;
};

const INITIAL_INVESTMENT_TOOLTIP = `The total value of the initial position in US dollars.
e.g. 50% USDC and 50% WBTC supplied means that $500 worth of USDC and $500 worth of WBTC will be deposited initially (before leverage)`;
const RISK_FREE_RATE_TOOLTIP = "e.g. current US treasury yield, or other measure.  Used to calculate Sharpe ratio (to compare strategies by both yield and risk taken)";
const LEVERAGE_TOOLTIP = `Represents the size of the long position.
If leverage=1, then no borrowing happens, and the supplied assets add up to 100% of the initial investment.
If e.g. leverage=2, then looping (borrow, swap, supply) happens until the supplied assets add up to 200% of the initial investment
(which implies that 100% of the initial investment was borrowed across the specified borrow assets)`;
const FROM_TOOLTIP = "The start date for the simulation - it will run until yesterday or today depending on data availability.";
const SWAP_FEE_TOOLTIP = `Estimated fee for each asset swap (0.3% for Quickswap on Polygon) - set to 0% if you don't want to simulate swap fees.
e.g. when depositing WETH and borrowing WBTC, using leverage, the borrowed WBTC needs to be swapped to WETH in order to be redeposited; this fee will be taken when 
the position is entered, and also when the position is closed at the end of the simulation`;

export default function MarketToolbar() {
  const dispatch = useAppDispatch();

  const marketKey = useAppSelector(selectMarket);
  const leverage = useAppSelector(selectLeverage);
  const initialInvestment = useAppSelector(selectInitialInvestment);
  
  const fromDate = useAppSelector(selectFromDate);

  const reservesData = useGetAaveContractDataQuery(marketKey);
  const reserveMap = reservesData?.data;
  const positionMap = useAppSelector(selectPositions);

  const maxLtv = calculateMaxLtv(positionMap, reserveMap as ReserveMap);
  const maxLeverage = calculateMaxLeverage(maxLtv);
  const healthFactor = calculateCurrentHealthFactor(positionMap, reserveMap as ReserveMap, leverage);

  const isSimulationRunning = useAppSelector(selectIsSimulationRunning);

  const availableSupply = useAppSelector(selectAvailableSupply);
  const availableBorrow = useAppSelector(selectAvailableBorrow);

  const riskFreeRate = useAppSelector(selectRiskFreeRate);
  const swapFee = useAppSelector(selectSwapFee);

  return (
    <GridToolbarContainer>
      <Box m={2} sx={{ flexGrow: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={4}>
            <FormControl fullWidth>
              <InputLabel id="market-chain">Select V3 Market</InputLabel>
              <Select
                labelId="market-chain"
                id="market-chain-select"
                value={marketKey}
                label="Chain ID"
              >
                {Object.keys(V3_MARKETS_LIST).map((k : string) => {
                  const market = V3_MARKETS_LIST[k];
                  return <MenuItem value={k} key={k}>{market.name}</MenuItem>;
                })}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={4}>
            <TextField
              fullWidth
              label={<LabelWithInfoTooltip label="Initial Investment" tooltip={INITIAL_INVESTMENT_TOOLTIP}/>}
              value={initialInvestment}
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>) => dispatch(setInitialInvestment(Number(ev.target.value)))}
            />
          </Grid>

          <Grid item xs={6} md={4}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label={<LabelWithInfoTooltip label="Estimated Swap Fees" tooltip={SWAP_FEE_TOOLTIP}/>}
                  value={Number((swapFee*100).toFixed(2))}
                  type="number"
                  InputProps={{
                    inputProps: { step: 0.01 },
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  onChange={(ev: React.ChangeEvent<HTMLInputElement>) => dispatch(setSwapFee(Number(Number(ev.target.value).toFixed(4))/100))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label={<LabelWithInfoTooltip label="Risk Free Rate" tooltip={RISK_FREE_RATE_TOOLTIP}/>}
                  value={Number((riskFreeRate*100).toFixed(2))}
                  type="number"
                  InputProps={{
                    inputProps: { step: 0.05 },
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  onChange={(ev: React.ChangeEvent<HTMLInputElement>) => dispatch(setRiskFreeRate(Number(Number(ev.target.value).toFixed(4))/100))}
                />
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={6} md={4}>
            <Stack>
                <Typography component={"span"}><LabelWithInfoTooltip label="Leverage" tooltip={LEVERAGE_TOOLTIP}/></Typography>
                <Slider
                  value={leverage || 1}
                  onChange={(ev: Event, value: number | number[]) => dispatch(setLeverage(value as number))}
                  min={1}
                  max={maxLeverage || 1}
                  step={LEVERAGE_STEP_SIZE}
                  valueLabelDisplay="auto"
                />
            </Stack>
          </Grid>
          
          <Grid item xs={6} md={4}>
            <TextField
              label="Health Factor"
              variant="standard"
              value={String(healthFactor)}
              InputProps={{readOnly:true}}
              sx={{ "& .MuiInputBase-input.Mui-disabled": {WebkitTextFillColor: getHealthFactorColor(healthFactor)}, }}
              disabled
              helperText="Bigger value is safer, will be liquidated if health factor <= 1"
            />
          </Grid>

          
          
          <Grid item xs={6} md={4}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <DatePicker
                  label={<LabelWithInfoTooltip label="From" tooltip={FROM_TOOLTIP}/>}
                  minDate={AAVE_ORIGINAL_LAUNCH_DATE} //Aave didn't exist before this date, so don't allow earlier dates
                  maxDate={dayjs()} //don't allow dates in the future, since we don't have any data to simulate for the future!
                  value={dayjs.unix(fromDate)}
                  onChange={(newValue) => dispatch(setFromDate(newValue?.unix()))}
                />
              </Grid>
              <Grid item xs={6}>
                <Tooltip title={availableSupply > 0 || availableBorrow > 0 ? "Supply and Borrow assets must be 100% allocated" : ""}>
                  <span>
                    <Button
                      onClick={()=>{
                        dispatch(setIsSimulationRunning(true)); //make sure we know that a simulation is running so we can display a loading spinner and prevent running more simulations

                        dispatch(
                          simulatorApi.endpoints.getSimulationResult.initiate({ 
                            marketKey,
                            initialInvestment,
                            maxLtv, 
                            leverage, 
                            positionMap,
                            reserveMap,
                            fromDate, 
                            riskFreeRate, 
                            swapFee 
                          } as SimulationKey))
                          .unsubscribe(); //start the query and immediately unsubscribe; we will resubscribe where the data will live (HACK!)
                      }}
                      variant="contained"
                      disabled={isSimulationRunning || availableSupply > 0 || availableBorrow > 0}
                    >
                      {
                        isSimulationRunning ?
                          <CircularProgress size="2em"/>
                          :
                          <div style={{display:"flex", alignItems:"center"}}>RUN{availableSupply > 0 || availableBorrow > 0 ? <>&nbsp;<WarningIcon/></> : null}</div>
                      }
                    </Button>
                  </span>
                </Tooltip>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </GridToolbarContainer>
  );
};
