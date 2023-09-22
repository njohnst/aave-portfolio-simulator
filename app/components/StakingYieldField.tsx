import { useAppDispatch, useAppSelector } from "../hooks";
import { selectStakingAprBySymbol, setStakingAprBySymbol } from "../store/slices/positionSlice";
import { InputAdornment, TextField } from '@mui/material';

export const StakingYieldField = (props: {symbol: string}) => {
    const dispatch = useAppDispatch();

    const stakingYield = useAppSelector((state) => selectStakingAprBySymbol(state,props.symbol));

    return <TextField
        type="number"
        InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>
        }}
        value={(100*stakingYield)}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>) => dispatch(setStakingAprBySymbol([props.symbol, Number(ev.target.value) / 100]))}
        
    />;
};
