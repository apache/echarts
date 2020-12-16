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
import {
    CanvasRenderer
} from '../../renderers';

use([BarChart, LineChart, GridComponent, DataZoomComponent, CanvasRenderer]);

type Option = ComposeOption<
    GridComponentOption | DataZoomComponentOption,
    BarSeriesOption | LineSeriesOption
>;

const option: Option= {
    series: [{
        type: 'bar'
    }]
}

const dom = document.createElement('div');
dom.className = 'chart';

const chart = init(dom);
chart.setOption(option);