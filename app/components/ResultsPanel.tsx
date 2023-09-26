import { LineChart, Line, ResponsiveContainer, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { useGetSimulationResultQuery } from '../store/services/simulatorApi';
import { SimulationResults, SimulationSnapshot } from '../store/services/simulation/simulator';
import { Grid, Table, TableBody, TableCell, TableContainer, TableRow, useMediaQuery, useTheme } from '@mui/material';
import { SimulationKey } from '../store/slices/positionSlice';
import dayjs from 'dayjs';
import React from 'react';

const LabelThenVariable = (props:{label: string, value: React.ReactNode}) => {
    return <>
        <TableCell>
            <b>{props.label}</b>
        </TableCell>
        <TableCell>
            {props.value}
        </TableCell>
    </>;
};

const getTimestampAsDate = (timestamp: number) => dayjs.unix(timestamp).format("MM/DD/YY");

export default function ResultsPanel(props: { simulationKey: SimulationKey }) {
    const simResults = useGetSimulationResultQuery(props.simulationKey);
    const isSmallScreen = useMediaQuery(useTheme().breakpoints.down("md"));
     
    if (!simResults.isSuccess) {
        return null;
    }

    const simResultsData = simResults.data as SimulationResults;

    const finalSnapshot = simResultsData && !simResultsData.liquidated && simResultsData?.snapshots?.at(-1);
    const finalValue = (finalSnapshot && (finalSnapshot.longTotal - finalSnapshot.shortTotal)) ?? 0;

    const {marketKey, initialInvestment, leverage, positionMap, fromDate, riskFreeRate} = props.simulationKey;

    const {longs,shorts} = Object.keys(positionMap).reduce(({longs,shorts}, key) => {
        if (positionMap[key].supplyPct > 0) {
            longs.push({symbol: key, allocation: (positionMap[key].supplyPct).toFixed(2) + "%", stakingApr: positionMap[key].stakingApr,});
        }
        if (positionMap[key].borrowPct > 0) {
            shorts.push({symbol: key, allocation: (positionMap[key].borrowPct).toFixed(2) + "%", stakingApr: positionMap[key].stakingApr,});
        }
        return {longs, shorts};
    }, {longs: [] as {symbol:string, allocation: string, stakingApr: number,}[], shorts: [] as {symbol:string, allocation:string, stakingApr: number,}[]})

    return (
        <Grid container spacing={2} sx={{width: '100vw'}}>
            <Grid item xs={12} md={6}>
                <TableContainer sx={{ overflow: 'hidden' }}>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <LabelThenVariable label="Market" value={marketKey} />
                                <LabelThenVariable label="Risk Free Rate" value={(riskFreeRate*100)+"%"} />
                            </TableRow>
                            <TableRow>
                                <LabelThenVariable label="Start Date" value={dayjs.unix(fromDate).format("ddd, DD MMM YYYY")} />
                                <LabelThenVariable label="End Date" value={dayjs.unix((finalSnapshot as SimulationSnapshot).timestamp).format("ddd, DD MMM YYYY")} />
                            </TableRow>
                            <TableRow>
                                <LabelThenVariable label="Initial Investment" value={`$${initialInvestment.toFixed(2)}`} />
                                <LabelThenVariable label="Final Value" value={ !simResultsData.liquidated ? `$${(finalValue as number)?.toFixed(2)}` : "Liquidated!"} />
                            </TableRow>
                            <TableRow>
                                <LabelThenVariable label="Leverage" value={leverage} />
                                <LabelThenVariable label="Sharpe Ratio" value={!simResultsData.liquidated ? simResultsData.sharpeRatio : "N/A"} />
                            </TableRow>
                            <TableRow>
                                <LabelThenVariable label="Initial Supply Distribution" value={
                                    longs.map(long => <p key={long.symbol}>{long.stakingApr > 0 ? `${long.symbol} (@ ${(100*long.stakingApr).toFixed(2)}% staking APR)` : long.symbol}: {long.allocation}</p>)
                                } />
                            </TableRow>
                            <TableRow>
                                <LabelThenVariable label="Initial Borrow Distribution" value={
                                    shorts.map(short => <p key={short.symbol}>{short.stakingApr > 0 ? `${short.symbol} (@ ${(100*short.stakingApr).toFixed(2)}% staking APR)` : short.symbol}: {short.allocation}</p>)
                                } />
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Grid>
            <Grid item xs={12} md={6}>
                <ResponsiveContainer width="100%" height="100%" aspect={isSmallScreen ? 1.5 : 2}>
                    <LineChart data={simResultsData.snapshots ?? [{timestamp: fromDate, }]}>
                        <XAxis dataKey={({timestamp})=>getTimestampAsDate(timestamp)}/>
                        <YAxis unit="$" domain={!simResultsData.liquidated ? ["auto", "auto"] : [0, initialInvestment]}/>
                        <Legend/>
                        <Tooltip/>
                        
                        <Line type="monotone" name="Long Total" dataKey={"longTotal"} stroke="#325ca8"/>
                        <Line type="monotone" name="Short Total" dataKey={"shortTotal"} stroke="#ad112e"/>
                        <Line type="monotone" name="Portfolio Value" unit="$" dataKey={({longTotal,shortTotal}) => (longTotal-shortTotal)} stroke="#1a873b"/>
                    </LineChart>
                </ResponsiveContainer>
            </Grid>
        </Grid>
    );
};
