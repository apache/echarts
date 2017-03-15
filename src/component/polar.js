define(function(require) {
    'use strict';

    require('../coord/polar/polarCreator');
    require('./angleAxis');
    require('./radiusAxis');
    require('./axisPointer');

    // Polar view
    require('../echarts').extendComponentView({
        type: 'polar'
    });
});