import { createChart, getECModel } from '../../core/utHelper';
import { EChartsType } from '@/src/echarts.all';

describe('processor/dataStack', function() {
    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should not stack on zero value with samesign strategy', function() {
        chart.setOption({
            xAxis: { data: ['a', 'b', 'c'] },
            yAxis: { type: 'value' },
            series: [{
                type: 'line',
                data: [10, 20, 30],
                stack: 'total',
                stackStrategy: 'samesign'
            }, {
                type: 'line',
                data: [5, 0, 10],
                stack: 'total',
                stackStrategy: 'samesign'
            }]
        });

        const ecModel = getECModel(chart);
        const seriesModels = ecModel.getSeries();
        const resultData = seriesModels[1].getData();
        const stackResultDim = resultData.getCalculationInfo('stackResultDimension');
        const stackedOverDim = resultData.getCalculationInfo('stackedOverDimension');

        // with the fix, stackResultDimension at index 1 should be 0, and stackedOverDimension should be NaN
        expect(resultData.get(stackResultDim, 1)).toEqual(0);
        expect(resultData.get(stackedOverDim, 1)).toBeNaN();
    });

    it('should not stack on zero value when stacked on zero value', function() {
        chart.setOption({
            xAxis: { data: ['a', 'b', 'c'] },
            yAxis: { type: 'value' },
            series: [{
                type: 'line',
                data: [10, 0, 30],
                stack: 'total',
                stackStrategy: 'samesign'
            }, {
                type: 'line',
                data: [5, 0, 10],
                stack: 'total',
                stackStrategy: 'samesign'
            }]
        });

        const ecModel = getECModel(chart);
        const seriesModels = ecModel.getSeries();
        const resultData = seriesModels[1].getData();
        const stackResultDim = resultData.getCalculationInfo('stackResultDimension');
        const stackedOverDim = resultData.getCalculationInfo('stackedOverDimension');

        expect(resultData.get(stackResultDim, 1)).toEqual(0);
        expect(resultData.get(stackedOverDim, 1)).toBeNaN();
    });

    it('should correctly stack when a zero value series is in the middle', function() {
        chart.setOption({
            xAxis: { data: ['a', 'b', 'c'] },
            yAxis: { type: 'value' },
            series: [{
                type: 'line',
                data: [10, 20, 30],
                stack: 'total',
                stackStrategy: 'samesign'
            }, {
                type: 'line',
                data: [5, 0, -10],
                stack: 'total',
                stackStrategy: 'samesign'
            }, {
                type: 'line',
                data: [5, 5, 5],
                stack: 'total',
                stackStrategy: 'samesign'
            }]
        });

        const ecModel = getECModel(chart);
        const seriesModels = ecModel.getSeries();
        const resultData = seriesModels[2].getData();
        const stackResultDim = resultData.getCalculationInfo('stackResultDimension');
        const stackedOverDim = resultData.getCalculationInfo('stackedOverDimension');

        // series 3 should be stacked on series 1, because series 2 has a zero and a negative value.
        expect(resultData.get(stackResultDim, 1)).toEqual(25);
        expect(resultData.get(stackedOverDim, 1)).toEqual(20);
    });
});

