import { Button, FormControl, Grid, InputAdornment, InputLabel, MenuItem, Select, Slider, Stack, TextField, Typography} from '@mui/material';
import { GridToolbarContainer } from '@mui/x-data-grid';
import V3_MARKETS_LIST from '@/app/store/services/utils/v3Markets';

import React from 'react';

import { useAppDispatch, useAppSelector } from '../hooks';
import { selectMarket, selectMaxLeverage, selectMaxLtv, selectLeverage, setLeverage, selectCurrentLtv, selectInitialInvestment, setInitialInvestment, selectPositions, selectReservesUnsafe } from "@/app/store/slices/positionSlice";
import { useLazyGetSimulationResultQuery } from '../store/services/simulatorApi';

const LEVERAGE_STEP_SIZE = 0.01;

export default function MarketToolbar() {
  const dispatch = useAppDispatch();

  const marketKey = useAppSelector(selectMarket);
  const leverage = useAppSelector(selectLeverage);
  const maxLeverage = useAppSelector(selectMaxLeverage);
  const maxLtv = useAppSelector(selectMaxLtv);

  const currentLtv = useAppSelector(selectCurrentLtv);
  const initialInvestment = useAppSelector(selectInitialInvestment);

  const positions = useAppSelector(selectPositions);
  
  const reserves = useAppSelector(selectReservesUnsafe); //@TODO!

  
  //     aprs,
  //     prices,
  // };

  

  const [lazySimTrigger, lazySimResults] = useLazyGetSimulationResultQuery();
  
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

        <Grid item xs={4}>
          <TextField
            label="Current LTV"
            value={currentLtv || 0}
            InputProps={{readOnly:true}}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            label="Max LTV"
            value={maxLtv || 0}
            InputProps={{readOnly:true}}
          />
        </Grid>
        
        <Grid item xs={4}>
          {/* TODO HACK */}
          <Button
            onClick={()=>lazySimTrigger(null)}
          >
            RUN
          </Button>
          <TextField
            label="Sim results"
            value={`NAV: $${lazySimResults?.data?.nav ?? 0}, Longs: $${lazySimResults?.data?.longSizeUSD ?? 0}, Shorts: $${lazySimResults?.data?.shortSizeUSD ?? 0}`}
          />
        </Grid>
      </Grid>
    </GridToolbarContainer>
  );
};
