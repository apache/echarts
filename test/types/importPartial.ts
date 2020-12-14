import {init, use, ComposeOption} from '../../core';
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
    DataZoomComponentOption,
} from '../../components';

type Option = ComposeOption<
    GridComponentOption | DataZoomComponentOption,
    BarSeriesOption | LineSeriesOption
>;

const option: Option= {
    series: [{
        type: 'bar'
    }]
}

use([BarChart, LineChart, GridComponent, DataZoomComponent]);

const dom = document.createElement('div');
dom.className = 'chart';

const chart = init(dom);
chart.setOption(option);