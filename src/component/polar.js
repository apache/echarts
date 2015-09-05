define(function(require) {
    'use strict';

    require('../coord/polar/Polar');

    require('./angleAxis');
    require('./radiusAxis');

    // Polar view
    require('../echarts').extendComponentView({

        type: 'polar',

        render: function (gridModel, ecModel, api) {
        }
    });
});