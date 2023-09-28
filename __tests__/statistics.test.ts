import { calculateSharpeRatio } from "../app/store/services/simulation/utils/statistics";

describe('statistics module', () => {
    describe('calculateDailyStdDevsAnnualized', ()=>{

    });

    //sample std dev
    describe('calculatePortfolioStdDev', ()=>{

    });

    describe('calculateSharpeRatio', ()=> {
        test('same as risk free rate, Sharpe ratio = 0', ()=>{
            expect(calculateSharpeRatio(0,0,1)).toBe(0);
            expect(calculateSharpeRatio(5,5,1)).toBe(0);
        });

        test('negative Sharpe ratio', ()=>{
            expect(calculateSharpeRatio(0.0365,0.05,0.0596)).toBeCloseTo(-0.226493915);
        });

        test('positive Sharpe ratio', ()=>{
            expect(calculateSharpeRatio(0.0365, 0.01, 0.0596)).toBeCloseTo(0.444599166);
        });
    });
});
