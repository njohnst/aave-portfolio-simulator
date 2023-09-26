import { Tooltip } from "@mui/material";
import InfoIcon from '@mui/icons-material/Info';

export const TooltipLabel = (props: {label: string, tooltip: string}) => {
    return <Tooltip title={props.tooltip}>
      <div style={{display:"flex", alignItems:"center"}}>
        {props.label}
        <InfoIcon/>
      </div>
    </Tooltip>;
};
