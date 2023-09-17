import { Button, FormControl, Grid, InputAdornment, InputLabel, MenuItem, Select, Slider, Stack, TextField, Typography} from '@mui/material';
import { GridToolbarContainer } from '@mui/x-data-grid';
import V3_MARKETS_LIST from '@/app/store/services/utils/v3Markets';

import React from 'react';

import { useAppDispatch, useAppSelector } from '../hooks';
import { selectMarket, selectLeverage, setLeverage, selectInitialInvestment, setInitialInvestment, selectPositions, ReserveMap, selectFromDate, setFromDate } from "@/app/store/slices/positionSlice";
import { useLazyGetSimulationResultQuery } from '../store/services/simulatorApi';
import { useGetAaveContractDataQuery } from '../store/services/aaveApi';
import { calculateCurrentLtv, calculateMaxLeverage, calculateMaxLtv } from '../store/slices/utils/calculations';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { SimulationResults } from '../store/services/simulation/simulator';

const LEVERAGE_STEP_SIZE = 0.01;

//not sure exact date, it's in January 2017 though
//use this constant to prevent the date picker from going back before this time since it won't be relevant
//since this is Aave V3 simulator the real date should be way different, but maybe it's helpful to use old data... won't restrict this
const AAVE_ORIGINAL_LAUNCH_DATE = dayjs(new Date(2017, 0, 1)); 

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
  const currentLtv = calculateCurrentLtv(leverage, maxLtv);

  const [lazySimTrigger, lazySimResults] = useLazyGetSimulationResultQuery();

  const simResultsData = lazySimResults.isSuccess ? lazySimResults?.data as SimulationResults : null;
  const simResultsString = (simResultsData && !simResultsData.liquidated ? `NAV: $${simResultsData.nav ?? 0}, Longs: $${simResultsData.longSizeUSD ?? 0}, Shorts: $${simResultsData.shortSizeUSD ?? 0}` : "Liquidated!");
  
  return (
    <GridToolbarContainer>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <FormControl>
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
            label="Initial Investment (USD)"
            value={initialInvestment}
            type="number"
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            onChange={(ev) => dispatch(setInitialInvestment(Number(ev.target.value)))}

          />
        </Grid>
        
        <Grid item xs={4}>
          <Stack>
              <Typography>Leverage</Typography>
              <Slider
                value={leverage || 0}
                onChange={(ev, value) => dispatch(setLeverage(value as number))}
                min={0}
                max={maxLeverage || 0}
                step={LEVERAGE_STEP_SIZE}
                valueLabelDisplay="auto"
              />
          </Stack>
        </Grid>

        


        <Grid item xs={3}>
          <TextField
            label="Current LTV"
            value={currentLtv || 0}
            InputProps={{readOnly:true}}
          />
        </Grid>
        <Grid item xs={3}>
          <TextField
            label="Max LTV"
            value={maxLtv || 0}
            InputProps={{readOnly:true}}
          />
        </Grid>

        <Grid item xs={3}>
          <DatePicker
            label="From"
            minDate={AAVE_ORIGINAL_LAUNCH_DATE} //Aave didn't exist before this date, so don't allow earlier dates
            maxDate={dayjs()} //don't allow dates in the future, since we don't have any data to simulate for the future!
            value={dayjs.unix(fromDate)}
            onChange={(newValue) => dispatch(setFromDate(newValue?.unix()))}
          />
        </Grid>
        
        <Grid item xs={3}>
          {/* TODO HACK */}
          <Button
            onClick={()=>lazySimTrigger({ marketKey, initialInvestment, maxLtv, leverage, positionMap, reservesMap, fromDate })}
          >
            RUN
          </Button>
          <TextField
            label="Sim results"
            value={
              simResultsData
                ? simResultsString
                : ""
            }
          />
        </Grid>
      </Grid>
    </GridToolbarContainer>
  );
};
