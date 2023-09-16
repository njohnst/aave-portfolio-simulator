import { doSimulate } from "./simulator";

onmessage = (e: MessageEvent) => {
    const simulationResults = doSimulate(e.data);
    postMessage(simulationResults);
};
