define(function(require) {
    'use strict';

    require('../coord/polar/polarCreator');
    require('./angleAxis');
    require('./radiusAxis');
    require('./axisPointer');

    require('./axisPointer/PolarAxisPointer');

    // Polar view
    require('../echarts').extendComponentView({
        type: 'polar'
    });
});