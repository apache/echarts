import {init, use} from '../../core';
import {
    BarChart,
    BarSeriesOption,
    LineChart,
    LineSeriesOption
} from '../../charts';
import {
    GridComponent,
    GridComponentOption,

    DataZoomComponent,
    DataZoomComponentOption
} from '../../components';


use([BarChart, LineChart, GridComponent, DataZoomComponent]);

const dom = document.createElement('div');
dom.className = 'chart';

const chart = init(dom);
chart.setOption({
    series: [{
        type: 'bar'
    }]
});