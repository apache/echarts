import * as echarts from '../echarts';

import '../coord/single/singleCreator';
import './axis/SingleAxisView';
import '../coord/single/AxisModel';
import './axisPointer';
import './axisPointer/SingleAxisPointer';

echarts.extendComponentView({
    type: 'single'
});
