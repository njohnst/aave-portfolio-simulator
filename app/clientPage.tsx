"use client";

import { Box, IconButton, Tab, Tabs } from "@mui/material";
import { useAppDispatch, useAppSelector } from "./hooks";
import { SimulationKey } from "@/app/store/slices/positionSlice";
import ResultsPanel from "@/app/components/ResultsPanel";
import SettingsPanel from "@/app/components/SettingsPanel";
import { SyntheticEvent, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';
import { QueryStatus } from "@reduxjs/toolkit/dist/query";
import { selectSimulationApiQueries, simulatorApi } from "./store/services/simulatorApi";
import { QueryCacheKey } from "@reduxjs/toolkit/dist/query/core/apiState";

const TabPanel = (props: { children?: React.ReactNode, currentTab: number, thisTab: number}) => {
    return (
        <div hidden={props.currentTab !== props.thisTab}>
            {props.children}
        </div>
    );
};

const LabelWithCloseButton = (props: {label: string, closeTab: ()=>any}) => {
  return <span>
    {props.label}
    <IconButton
      size="small"
      onClick={(event: SyntheticEvent)=>{
        event.stopPropagation(); //prevent us from changing to this tab since we are deleting it
        props.closeTab();
      }}
    >
      <CloseIcon/>
    </IconButton>
  </span>;
};

export default function ClientPage() {
    const dispatch = useAppDispatch();

    const simulationEntries = useAppSelector(selectSimulationApiQueries);

    const [currentTab, setCurrentTab] = useState(0);

    return (
      <Box sx={{width: '100vw'}}>
        <Tabs value={currentTab} onChange={(_ev: SyntheticEvent, newValue: number) => setCurrentTab(newValue)}>
            <Tab label="Settings" id="tab-main" aria-controls="tabpanel-main"/>
            {simulationEntries.filter(([_key, entry]) => entry?.status == QueryStatus.fulfilled).map(([key,entry], idx) => {
                return <Tab
                    key={key}
                    label={<LabelWithCloseButton label={`Simulation Results #${idx+1}`} closeTab={()=>{
                      //check if we are on the tab and need to update currentTab:
                      if (currentTab == 1+idx) {
                        setCurrentTab(0); //just go back to settings...
                      }

                      dispatch(simulatorApi.internalActions.removeQueryResult({queryCacheKey: key as QueryCacheKey, ...entry}));
                    }}/>}
                    id={`tab-sim-${1+idx}`} 
                    aria-controls={`tabpanel-sim-${1+idx}`}
                />;
            })}
        </Tabs>
        <Box sx={{flexGrow:1}}>
          <TabPanel currentTab={currentTab} thisTab={0}>
              <SettingsPanel />
          </TabPanel>
          {simulationEntries.map(([key, entry], idx) => {
            return <TabPanel key={key} currentTab={currentTab} thisTab={1+idx}>
              <ResultsPanel simulationKey={entry?.originalArgs as SimulationKey}/>
            </TabPanel>;
          })}
        </Box>
      </Box>
    );
}
