"use client";

import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid';
import React from "react";
import { useAppSelector } from './hooks';
import { selectMarket } from "@/app/store/slices/positionSlice";
import MarketToolbar from "@/app/components/MarketToolbar";
import AllocationSlider from './components/AllocationSlider';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import { Tooltip } from '@mui/material';
import { useGetAaveContractDataQuery } from './store/services/aaveApi';

const formatPercentage = (n: number, decimalPlaces: number) => parseFloat((n*100).toFixed(decimalPlaces))+"%";

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
          <span className="table-cell-truncate">
            {params.value}
            &nbsp;
            <AnnouncementIcon/>
          </span>
        </Tooltip>
      : <>{params.value}</>;
    },
  },
  { field: "name", headerName: "Name", },
  { field: "supplyAPR", headerName: "Supply APR", valueFormatter: (params) => formatPercentage(Number(params.value), 2), },
  { field: "variableBorrowAPR", headerName: "Borrow APR (Variable)", valueFormatter: (params) => formatPercentage(Number(params.value), 2), },
  { field: "formattedBaseLTVasCollateral", headerName: "Base LTV", valueFormatter: (params) => formatPercentage(Number(params.value), 2), },
  { field: "formattedReserveLiquidationBonus", headerName: "Liquidation Penalty", valueFormatter: (params) => formatPercentage(Number(params.value), 2), },
  { field: "formattedReserveLiquidationThreshold", headerName: "Liquidation Threshold", valueFormatter: (params) => formatPercentage(Number(params.value), 2), },
  { field: "priceInUSD", headerName: "Price (USD)", valueFormatter: (params) => "$"+params.value, },

  { field: "allocation", headerName: "Allocation", flex: 1, renderCell:(params)=><AllocationSlider symbol={params.row.symbol}/>, },
];

export default function ClientPage() {
  const marketKey = useAppSelector(selectMarket);
  const reservesResult = useGetAaveContractDataQuery(marketKey);

  return <>
    <DataGrid
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
      pageSizeOptions={[5,10,20]}
      disableRowSelectionOnClick
    />
  </>;
};
