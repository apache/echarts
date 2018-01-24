import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';
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