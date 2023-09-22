"use client";

import { Box, Tab, Tabs } from "@mui/material";
import { useAppSelector } from "./hooks";
import { selectSimulationKeys } from "@/app/store/slices/positionSlice";
import ResultsPanel from "@/app/components/ResultsPanel";
import SettingsPanel from "@/app/components/SettingsPanel";
import { SyntheticEvent, useState } from "react";

const TabPanel = (props: { children?: React.ReactNode, currentTab: number, thisTab: number}) => {
    return (
        <div hidden={props.currentTab !== props.thisTab}>
            {props.children}
        </div>
    );
};

export default function ClientPage() {
    const simulationKeys = useAppSelector(selectSimulationKeys);

    const [currentTab, setCurrentTab] = useState(0);

    return (
      <Box sx={{width: '100vw'}}>
        <Tabs value={currentTab} onChange={(_ev: SyntheticEvent, newValue: number) => setCurrentTab(newValue)}>
            <Tab label="Settings" id="tab-main" aria-controls="tabpanel-main"/>
            {Object.keys(simulationKeys).filter((key) => simulationKeys[key] === true).map((key, idx) => {
                return <Tab key={JSON.stringify(key)} label={`Simulation Results #${idx+1}`} id={`tab-sim-${1+idx}`} aria-controls={`tabpanel-sim-${1+idx}`}/>;
            })}
        </Tabs>
        <Box sx={{flexGrow:1}}>
          <TabPanel currentTab={currentTab} thisTab={0}>
              <SettingsPanel/>
          </TabPanel>
          {Object.keys(simulationKeys).map((key, idx) => {
            return <TabPanel key={JSON.stringify(key)} currentTab={currentTab} thisTab={1+idx}>
              <ResultsPanel simulationKey={JSON.parse(key)}/>
            </TabPanel>;
          })}
        </Box>
      </Box>
    );
}
