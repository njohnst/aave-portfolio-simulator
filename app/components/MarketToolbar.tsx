import { Button, FormControl, Box, Grid, InputAdornment, InputLabel, MenuItem, Select, Slider, Stack, TextField, Typography, CircularProgress, Tooltip} from '@mui/material';
import { GridToolbarContainer } from '@mui/x-data-grid';
import V3_MARKETS_LIST from '@/app/store/services/utils/v3Markets';

import React from 'react';

import { useAppDispatch, useAppSelector } from '../hooks';
import { selectMarket, selectLeverage, setLeverage, selectInitialInvestment, setInitialInvestment, selectPositions, ReserveMap, selectFromDate, setFromDate, addSimulationKey, selectIsSimulationRunning, selectAvailableSupply, selectAvailableBorrow } from "@/app/store/slices/positionSlice";
import { useGetAaveContractDataQuery } from '../store/services/aaveApi';
import { calculateMaxLeverage, calculateMaxLtv, calculateCurrentHealthFactor } from '../store/slices/utils/calculations';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import WarningIcon from '@mui/icons-material/Warning';

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

export default function MarketToolbar() {
  const dispatch = useAppDispatch();

  const marketKey = useAppSelector(selectMarket);
  const leverage = useAppSelector(selectLeverage);
  const initialInvestment = useAppSelector(selectInitialInvestment);
  
  const fromDate = useAppSelector(selectFromDate);

  const reservesData = useGetAaveContractDataQuery(marketKey);
  const reservesMap = reservesData?.data;
  const positionMap = useAppSelector(selectPositions);

  const maxLtv = calculateMaxLtv(positionMap, reservesMap as ReserveMap);
  const maxLeverage = calculateMaxLeverage(maxLtv);
  const healthFactor = calculateCurrentHealthFactor(positionMap, reservesMap as ReserveMap, leverage);

  const isSimulationRunning = useAppSelector(selectIsSimulationRunning);

  const availableSupply = useAppSelector(selectAvailableSupply);
  const availableBorrow = useAppSelector(selectAvailableBorrow);

  return (
    <GridToolbarContainer>
      <Box m={2} sx={{ flexGrow: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
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
          
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Initial Investment (USD)"
              value={initialInvestment}
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>) => dispatch(setInitialInvestment(Number(ev.target.value)))}

            />
          </Grid>
          
          <Grid item xs={4}>
            <Stack>
                <Typography>Leverage</Typography>
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

          
          <Grid item xs={4}>
            <TextField
              label="Health Factor"
              variant="standard"
              value={healthFactor}
              InputProps={{readOnly:true}}
              sx={{ "& .MuiInputBase-input.Mui-disabled": {WebkitTextFillColor: getHealthFactorColor(healthFactor)}, }}
              disabled
              helperText="Bigger value is safer, will be liquidated if health factor <= 1"
            />
          </Grid>

          <Grid item xs={4}>
            <DatePicker
              label="From"
              minDate={AAVE_ORIGINAL_LAUNCH_DATE} //Aave didn't exist before this date, so don't allow earlier dates
              maxDate={dayjs()} //don't allow dates in the future, since we don't have any data to simulate for the future!
              value={dayjs.unix(fromDate)}
              onChange={(newValue) => dispatch(setFromDate(newValue?.unix()))}
            />
          </Grid>
          
          <Grid item xs={4}>
            <Tooltip title={availableSupply > 0 || availableBorrow > 0 ? "Supply and Borrow assets are not fully allocated" : ""}>
              <span>
                <Button
                  onClick={()=>dispatch(addSimulationKey({ marketKey, initialInvestment, maxLtv, leverage, positionMap, reservesMap, fromDate, isComplete: false, }))}
                  variant="contained"
                  disabled={isSimulationRunning || availableSupply > 0 || availableBorrow > 0}
                >
                  {
                    isSimulationRunning ?
                      <CircularProgress/>
                      :
                      <span>RUN{availableSupply > 0 || availableBorrow > 0 ? <WarningIcon/> : null}</span>
                  }
                </Button>
              </span>
            </Tooltip>
          </Grid>
        </Grid>
      </Box>
    </GridToolbarContainer>
  );
};
