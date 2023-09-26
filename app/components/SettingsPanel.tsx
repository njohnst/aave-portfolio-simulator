"use client";

import { DataGrid, GridColDef, GridColumnVisibilityModel, GridRenderEditCellParams } from '@mui/x-data-grid';
import React from "react";
import { useAppSelector } from '../hooks';
import { selectMarket } from "@/app/store/slices/positionSlice";
import MarketToolbar from "@/app/components/MarketToolbar";
import AllocationSlider from './AllocationSlider';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import { Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { useGetAaveContractDataQuery } from '../store/services/aaveApi';
import { StakingYieldField } from './StakingYieldField';
import InfoIcon from '@mui/icons-material/Info';

const formatPercentage = (n: number, decimalPlaces: number) => parseFloat((n*100).toFixed(decimalPlaces))+"%";

const STAKING_APR_TOOLTIP = `Manually input any yields from staking (e.g. stETH liquid staking yield).
This applies to both supply and borrow positions for the asset (i.e. it will be negative for a borrow position!).
Note that this APR will be compounded daily (which is not correct for all liquid staking solutions) - so it may not be entirely accurate.`;

const cols : GridColDef[] = [
  { 
    field: "symbol",
    headerName: "Symbol",
    renderCell: (params) => { 
      const canBorrow = params.row["borrowingEnabled"];
      const isCollateral = params.row["usageAsCollateralEnabled"];

      /** it either can't be borrowed, or can't be collateral; if it is both then asset won't be displayed on list */
      const title = !canBorrow ? "Can't be borrowed" : "Can't be used as collateral";

      return !canBorrow || !isCollateral
      ? <Tooltip title={title}>
          <div className="table-cell-truncate" style={{display:"flex", alignItems:"center"}}>
            {params.value}
            &nbsp;
            <AnnouncementIcon/>
          </div>
        </Tooltip>
      : <>{params.value}</>;
    },
  },
  { field: "name", headerName: "Name", },
  { field: "supplyAPR", headerName: "Supply APR", valueFormatter: (params) => formatPercentage(Number(params.value), 2), },
  { field: "variableBorrowAPR", headerName: "Borrow APR (Variable)", valueFormatter: (params) => formatPercentage(Number(params.value), 2), },
  { field: "formattedBaseLTVasCollateral", headerName: "Base LTV", valueFormatter: (params) => formatPercentage(Number(params.value), 2), },
  { field: "formattedReserveLiquidationThreshold", headerName: "Liquidation Threshold", valueFormatter: (params) => formatPercentage(Number(params.value), 2), },
  { field: "priceInUSD", headerName: "Price (USD)", valueFormatter: (params) => "$"+params.value, },

  { field: "yield", renderHeader: (_) => <Tooltip title={STAKING_APR_TOOLTIP}><div style={{display:"flex", alignItems:"center"}}><InfoIcon/> Staking APR</div></Tooltip>, type: "number", renderCell: (params)=><StakingYieldField symbol={params.row.symbol}/>, sortable: false, },
  { field: "allocation", headerName: "Allocation", flex: 1, renderCell:(params)=><AllocationSlider symbol={params.row.symbol} isCollateral={params.row.usageAsCollateralEnabled} isBorrowable={params.row.borrowingEnabled}/>, sortable: false, },
];

export default function SettingsPanel() {
  const marketKey = useAppSelector(selectMarket);
  const reservesResult = useGetAaveContractDataQuery(marketKey);

  const isSmallScreen = useMediaQuery(useTheme().breakpoints.down("md"));

  //user can control column visibility;
  //it will automatically remove columns if they are on a small screen; and reset the model if they are on a big screen
  const [columnVisibilityModel, setColumnVisibilityModel] = React.useState({} as GridColumnVisibilityModel);

  React.useEffect(() => {
    setColumnVisibilityModel(isSmallScreen ? {
      name: false,
      formattedBaseLTVasCollateral: false,
      formattedReserveLiquidationThreshold: false,
      priceInUSD: false,
    } : {});
  }, [isSmallScreen]);

  return <>
    <DataGrid
      autoHeight
      getRowHeight={()=>"auto"}
      rows={reservesResult.isSuccess ? Object.values(reservesResult.data) : []}
      columns={cols}
      slots={{
        toolbar: MarketToolbar
      }}
      initialState={{
        pagination: {
          paginationModel: {
            pageSize: 10,
          },
        },
      }}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityModelChange={(newModel, _details) => setColumnVisibilityModel(newModel)}
      pageSizeOptions={[5,10,20]}
      disableRowSelectionOnClick
    />
  </>;
};
