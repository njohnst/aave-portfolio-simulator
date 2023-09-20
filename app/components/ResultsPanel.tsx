import { LineChart, Line, ResponsiveContainer, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { useGetSimulationResultQuery } from '../store/services/simulatorApi';
import { SimulationResults } from '../store/services/simulation/simulator';
import { Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { SimulationKey, selectSimulationKeys, setSimulationKeyComplete } from '../store/slices/positionSlice';
import dayjs from 'dayjs';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../hooks';

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

export default function ResultsPanel(props: { simulationArgs: SimulationKey }) {
    const simResults = useGetSimulationResultQuery(props.simulationArgs);
    const isSimulationComplete = useAppSelector(selectSimulationKeys)[JSON.stringify(props.simulationArgs)];

    if (!simResults.isSuccess) {
        return null;
    }

    if (!isSimulationComplete) {
        useDispatch()(setSimulationKeyComplete(props.simulationArgs));
        return null;
    }

    const simResultsData = simResults.data as SimulationResults;

    const finalSnapshot = simResultsData && !simResultsData.liquidated && simResultsData?.snapshots?.at(-1);
    const finalValue = (finalSnapshot && (finalSnapshot.longTotal - finalSnapshot.shortTotal)) ?? 0;

    const {marketKey, initialInvestment, leverage, positionMap, fromDate} = props.simulationArgs;

    const {longs,shorts} = Object.keys(positionMap).reduce(({longs,shorts}, key) => {
        if (positionMap[key].supplyPct > 0) {
            longs.push({symbol: key, allocation: (positionMap[key].supplyPct).toFixed(2) + "%"});
        }
        if (positionMap[key].borrowPct > 0) {
            shorts.push({symbol: key, allocation: (positionMap[key].borrowPct).toFixed(2) + "%"});
        }
        return {longs, shorts};
    }, {longs: [] as {symbol:string, allocation: string}[], shorts: [] as {symbol:string, allocation:string}[]})

    return (
        <Grid container spacing={2}>
            {
                !simResultsData.liquidated ?
                    <Grid item xs={6}>
                        <TableContainer>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <LabelThenVariable label="Market" value={`${marketKey}`} />
                                        <LabelThenVariable label="Start Date" value={dayjs.unix(fromDate).toString()} />
                                    </TableRow>
                                    <TableRow>
                                        <LabelThenVariable label="Initial Investment" value={`$${initialInvestment.toFixed(2)}`} />
                                        <LabelThenVariable label="Final Value" value={`$${(finalValue as number)?.toFixed(2)}`} />
                                    </TableRow>
                                    <TableRow>
                                        <LabelThenVariable label="Initial Supply Distribution" value={longs.map(long => <p key={long.symbol}>{long.symbol}: {long.allocation}</p>)} />
                                    </TableRow>
                                    <TableRow>
                                        <LabelThenVariable label="Initial Borrow Distribution" value={shorts.map(short => <p key={short.symbol}>{short.symbol}: {short.allocation}</p>)} />
                                    </TableRow>
                                    <TableRow>
                                        <LabelThenVariable label="Leverage" value={String(leverage)} />
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                    :
                    <>
                        Liquidated!
                    </>
            }
            <Grid item xs={6}>
                {
                    !simResultsData.liquidated ?
                        <ResponsiveContainer width="100%" height="100%" minHeight="300px">
                            <LineChart data={simResultsData.snapshots}>
                                <XAxis dataKey={({timestamp})=>getTimestampAsDate(timestamp)}/>
                                <YAxis unit="$"/>
                                <Legend/>
                                <Tooltip/>
                                <Line type="monotone" name="Long Total" dataKey={"longTotal"} stroke="#325ca8"/>
                                <Line type="monotone" name="Short Total" dataKey={"shortTotal"} stroke="#ad112e"/>
                                <Line type="monotone" name="Portfolio Value" unit="$" dataKey={({longTotal,shortTotal}) => (longTotal-shortTotal)} stroke="#1a873b"/>
                            </LineChart>
                        </ResponsiveContainer>
                        :
                        <>no data</>
                }
            </Grid>
        </Grid>
    );
};
