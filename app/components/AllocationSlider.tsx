import { Grid, Slider, Stack, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectSupplyPctBySymbol, selectBorrowPctBySymbol, setSupplyPctBySymbol, setBorrowPctBySymbol, selectAvailableSupply, selectAvailableBorrow } from "@/app/store/slices/positionSlice";

export default function AllocationSlider(props: {symbol: string, isCollateral: boolean, isBorrowable: boolean}) {
    const symbol = props.symbol;

    const dispatch = useAppDispatch();

    const supplyPct = useAppSelector((state) => selectSupplyPctBySymbol(state, symbol));
    const borrowPct = useAppSelector((state) => selectBorrowPctBySymbol(state, symbol));

    const availableSupply = useAppSelector(selectAvailableSupply);
    const availableBorrow = useAppSelector(selectAvailableBorrow);

    return (
        <Grid container justifyContent="center" spacing={2}>
            <Grid item xs={6}>
                <Stack>
                    <Typography>Supply</Typography>
                    <Slider
                        value={supplyPct}
                        onChange={(_ev: Event, value: number | number[]) => dispatch(setSupplyPctBySymbol([symbol, Math.min(value as number, availableSupply+supplyPct)]))}
                        min={0}
                        max={100}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value: number, _index: number) => value+"%"}
                        size="small"
                        disabled={!props.isCollateral}
                    />
                </Stack>
            </Grid>
            <Grid item xs={6}>
                <Stack>
                    <Typography>Borrow</Typography>
                    <Slider
                        color="secondary"

                        value={borrowPct}
                        onChange={(_ev: Event, value: number | number[]) => dispatch(setBorrowPctBySymbol([symbol, Math.min(value as number, availableBorrow+borrowPct)]))}
                        min={0}
                        max={100}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value: number, _index: number) => value+"%"}
                        size="small"
                        disabled={!props.isBorrowable}
                    />
                </Stack>
            </Grid>
        </Grid>     
    );
};

