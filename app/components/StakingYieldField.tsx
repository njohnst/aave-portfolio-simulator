import { useAppDispatch, useAppSelector } from "../hooks";
import { selectStakingAprBySymbol, setStakingAprBySymbol } from "../store/slices/positionSlice";
import { InputAdornment, TextField } from '@mui/material';

export const StakingYieldField = (props: {symbol: string}) => {
    const dispatch = useAppDispatch();

    const stakingYield = useAppSelector((state) => selectStakingAprBySymbol(state,props.symbol));

    return <TextField
        type="number"
        InputProps={{
            inputProps: { step: 0.1 },
            endAdornment: <InputAdornment position="end">%</InputAdornment>
        }}
        value={(100*stakingYield)}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>) => dispatch(setStakingAprBySymbol([props.symbol, Number(ev.target.value) / 100]))}
        fullWidth
        sx={{
            "& input[type=number]": {
                MozAppearance: "textfield",
            },
            "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
                display: "none",
            },
        }}
    />;
};
