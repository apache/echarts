// Grid 是在有直角坐标系的时候必须要存在的
// 所以这里也要被 Cartesian2D 依赖

import './AxisModel';
import ComponentModel from '../../model/Component';

export default ComponentModel.extend({

    type: 'grid',

    dependencies: ['xAxis', 'yAxis'],

    layoutMode: 'box',

    /**
     * @type {module:echarts/coord/cartesian/Grid}
     */
    coordinateSystem: null,

    defaultOption: {
        show: false,
        zlevel: 0,
        z: 0,
        left: '10%',
        top: 60,
        right: '10%',
        bottom: 60,
        // If grid size contain label
        containLabel: false,
        // width: {totalWidth} - left - right,
        // height: {totalHeight} - top - bottom,
        backgroundColor: 'rgba(0,0,0,0)',
        borderWidth: 1,
        borderColor: '#ccc'
    }
});