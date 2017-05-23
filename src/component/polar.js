define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');

    require('../coord/polar/polarCreator');
    require('./angleAxis');
    require('./radiusAxis');
    require('./axisPointer');

    require('./axisPointer/PolarAxisPointer');

    // For reducing size of echarts.min, barLayoutPolar is required by polar.
    require('../echarts').registerLayout(zrUtil.curry(require('../layout/barPolar'), 'bar'));

    // Polar view
    require('../echarts').extendComponentView({
        type: 'polar'
    });
});