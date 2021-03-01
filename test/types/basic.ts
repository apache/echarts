import * as echarts from '../../';

const dom = document.createElement('div');
dom.className = 'chart';

const chart: echarts.EChartsType = echarts.init(dom);

const option: echarts.EChartsOption = {
    series: [{
        type: 'bar'
    }]
};
chart.setOption(option);