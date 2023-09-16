import { Grid, Slider, Stack, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectSupplyPctBySymbol, selectBorrowPctBySymbol, setSupplyPctBySymbol, setBorrowPctBySymbol } from "@/app/store/slices/positionSlice";


const MIN_ALLOCATION = 0;
const MAX_ALLOCATION = 100;

export default function AllocationSlider(props: {symbol: string}) {
    const symbol = props.symbol;

    const dispatch = useAppDispatch();

    const supplyPct = useAppSelector((state) => selectSupplyPctBySymbol(state, symbol));
    const borrowPct = useAppSelector((state) => selectBorrowPctBySymbol(state, symbol));

    return (
        <Grid container spacing={2}>
            <Grid item xs={6}>
                <Stack>
                    <Typography>Supply</Typography>
                    <Slider
                        value={supplyPct}
                        onChange={(ev, value) => dispatch(setSupplyPctBySymbol([symbol, value as number]))}
                        min={MIN_ALLOCATION}
                        max={MAX_ALLOCATION}
                        valueLabelDisplay="auto"
                    />
                </Stack>
            </Grid>
            <Grid item xs={6}>
                <Stack>
                    <Typography>Borrow</Typography>
                    <Slider
                        color="secondary"

                        value={borrowPct}
                        onChange={(ev, value) => dispatch(setBorrowPctBySymbol([symbol, value as number]))}
                        min={MIN_ALLOCATION}
                        max={MAX_ALLOCATION}
                        valueLabelDisplay="auto"
                    />
                </Stack>
            </Grid>
        </Grid>     
    );
};

