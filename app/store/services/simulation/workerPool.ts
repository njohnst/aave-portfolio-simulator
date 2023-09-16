import { SimulationArgs } from "./simulator";

export const simulationWorkers = {
    _workers: new Array<Worker>(),
    _numWorkers: 0,
    _create() {
        //TODO max pool size?
        this._numWorkers++;
        return new Worker(new URL("./simulationWorker.ts", import.meta.url));
    },
    _get() {
        //return and cycle; create worker if there are none available currently
        return this._workers.shift() ?? this._create();
    },
    run(args: SimulationArgs) {
        const worker = this._get();

        return new Promise(resolve => {
            worker.postMessage(args);

            worker.onmessage = (e:MessageEvent) => {
                this._workers.push(worker);

                resolve(e.data);
            };
            worker.onerror = (e: ErrorEvent) => {
                console.error(e);
            };
        });
    },
};
