import { init, use, EChartsType } from '../../../../src/export/core';
import {
    PieChart
} from '../../../../src/export/charts';
import {
    TitleComponent
} from '../../../../src/export/components';
import {
    CanvasRenderer
} from '../../../../src/export/renderers';
use([PieChart, TitleComponent, CanvasRenderer]);
import { EChartsOption } from '../../../../src/export/option';


function createChart(): EChartsType {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', {
        get() {
            return 500;
        }
    });
    Object.defineProperty(el, 'clientHeight', {
        get() {
            return 400;
        }
    });
    const chart = init(el);
    return chart;
};

function makeComponentError(componentName: string, componentImportName: string) {
    return `[ECharts] Component ${componentName} is used but not imported.
import { ${componentImportName} } from 'echarts/components';
echarts.use([${componentImportName}]);`;
}

function makeSerieError(seriesName: string, seriesImportName: string) {
    return `[ECharts] Series ${seriesName} is used but not imported.
import { ${seriesImportName} } from 'echarts/charts';
echarts.use([${seriesImportName}]);`;
}



describe('model_componentMissing', function () {
    it('Should report grid component missing error', function () {
        const chart = createChart();
        const oldConsoleErr = console.error;
        console.error = jest.fn();
        chart.setOption<EChartsOption>({
            xAxis: {},
            yAxis: {},
            series: []
        });
        expect(console.error).toHaveBeenCalledWith(
            makeComponentError('xAxis', 'GridComponent')
        );

        console.error = oldConsoleErr;
    });

    it('Should report dataZoom component missing error', function () {
        const chart = createChart();
        const oldConsoleErr = console.error;
        console.error = jest.fn();
        chart.setOption<EChartsOption>({
            dataZoom: {}
        });
        expect(console.error).toHaveBeenCalledWith(
            makeComponentError('dataZoom', 'DataZoomComponent')
        );

        console.error = oldConsoleErr;
    });

    it('Should not report title component missing error', function () {
        const chart = createChart();
        const oldConsoleErr = console.error;
        console.error = jest.fn();
        chart.setOption<EChartsOption>({
            title: {},
            series: []
        });
        expect(console.error).not.toBeCalled();

        console.error = oldConsoleErr;
    });

    it('Should report funnel series missing error', function () {
        const chart = createChart();
        const oldConsoleErr = console.error;
        console.error = jest.fn();
        chart.setOption<EChartsOption>({
            series: [{
                type: 'funnel'
            }]
        });
        expect(console.error).toHaveBeenCalledWith(
            makeSerieError('funnel', 'FunnelChart')
        );

        console.error = oldConsoleErr;
    });

    it('Should not report pie series missing error', function () {
        const chart = createChart();
        const oldConsoleErr = console.error;
        console.error = jest.fn();
        chart.setOption<EChartsOption>({
            series: [{
                type: 'pie'
            }]
        });
        expect(console.error).not.toBeCalled();

        console.error = oldConsoleErr;
    });
});