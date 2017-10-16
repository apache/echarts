import * as echarts from '../echarts';
import {util as zrUtil} from 'zrender';
import barPolar from '../layout/barPolar';

import '../coord/polar/polarCreator';
import './angleAxis';
import './radiusAxis';
import './axisPointer';
import './axisPointer/PolarAxisPointer';

// For reducing size of echarts.min, barLayoutPolar is required by polar.
echarts.registerLayout(zrUtil.curry(barPolar, 'bar'));

// Polar view
echarts.extendComponentView({
    type: 'polar'
});