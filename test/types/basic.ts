import * as echarts from '../../';
const dom = document.createElement('div');
dom.className = 'chart';

const chart = echarts.init(dom);
chart.setOption({
    series: [{
        type: 'bar'
    }]
});