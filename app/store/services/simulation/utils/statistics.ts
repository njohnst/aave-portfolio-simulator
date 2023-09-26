export type PositionStats = {
    weight: number,
    stdDev: number,
    returns: number[],
};

export type PositionMapSums = {
    [asset: string]: {
        returns: number[],
        sum: number,
    },
};

export function calculateDailyStdDevsAnnualized(positionReturns: PositionMapSums) {
    return Object.keys(positionReturns).reduce((stdDevMap, key) => {
        const nReturns = positionReturns[key].returns.length;

        const mean = positionReturns[key].sum / nReturns;

        const stdDev = Math.sqrt(positionReturns[key].returns.reduce((variance: number, returnAmount: number) => variance+(returnAmount-mean)**2, 0) / (nReturns - 1));

        stdDevMap[key] = stdDev * Math.sqrt(365); //annualize

        return stdDevMap;
    }, {} as any);
}

/**
 * Calculate std dev of multi asset portfolio
 * @param positionStats
 */

export function calculatePortfolioStdDev(positionStats: PositionStats[]) {
    // sum_positions(w**2 * stdDev ** 2) + sum_{i in positions, j in positions, i!=j}(w_i * w_j * stdDev_i * stdDev_j * correlation(i,j))
    let result = 0;

    for (let i=0; i<positionStats.length; i++) {
        const iPos = positionStats[i];

        result += iPos.weight ** 2 * iPos.stdDev ** 2;

        //start the internal loop at j=i, because we don't want to double count (e.g. i,j and j,i are the same combination twice)
        for (let j=i; j<positionStats.length; j++) {
            const jPos = positionStats[j];

            if (i == j) {
                continue; //skip the correlation term since i and j are the same asset
            }
            
            type _Sums = {iSqSum: number, jSqSum: number, ijSum: number, iSum: number, jSum: number};

            const {iSqSum, jSqSum, ijSum, iSum, jSum} = iPos.returns.reduce((prev: _Sums, iReturn: number, idx: number) => {
                const {iSqSum, jSqSum, ijSum, iSum, jSum} = prev;

                const jReturn = jPos.returns[idx]; //unsafe

                return {iSqSum: iSqSum+(iReturn**2), jSqSum: jSqSum+(jReturn**2), ijSum: ijSum+(iReturn*jReturn), iSum: iSum+iReturn, jSum: jSum+jReturn};
            }, {iSqSum: 0, jSqSum: 0, ijSum: 0, iSum: 0, jSum: 0} as _Sums);

            const nReturns: number = iPos.returns.length;

            const ijCorrelation = (nReturns * ijSum - iSum * jSum) / Math.sqrt((nReturns * iSqSum - iSum**2)*(nReturns * jSqSum - jSum**2));

            result += 2 * ijCorrelation * iPos.weight * jPos.weight * iPos.stdDev * jPos.stdDev;
        }
    }

    return result;
}

/**
 * all parameters should be annualized
 * @param expectedReturn decimal APR
 * @param riskFreeRate decimal APR
 * @param portfolioStdDev
 */

export function calculateSharpeRatio(expectedReturn: number, riskFreeRate: number, portfolioStdDev: number) {
    return (expectedReturn - riskFreeRate) / portfolioStdDev;
}
