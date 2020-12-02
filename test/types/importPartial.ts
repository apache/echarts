import {init, use} from '../../core';
import {ChartBar, ChartLine} from '../../charts';
import {ComponentGrid, ComponentDataZoom} from '../../components';

use([ChartBar, ChartLine, ComponentGrid, ComponentDataZoom]);

const dom = document.createElement('div');
dom.className = 'chart';

const chart = init(dom);
chart.setOption({
    series: [{
        type: 'bar'
    }]
});