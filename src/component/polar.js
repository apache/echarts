define(function(require) {
    'use strict';

    require('../coord/polar/polarCreator');
    require('./angleAxis');
    require('./radiusAxis');

    // Polar view
    require('../echarts').extendComponentView({
        type: 'polar'
    });
});