define(function (require) {

    'use strict';

    require('./AxisModel');

    require('../../echarts').extendComponentModel({

        type: 'polar',

        dependencies: ['polarAxis', 'angleAxis'],

        /**
         * @type {module:echarts/coord/polar/Polar}
         */
        coordinateSystem: null,

        defaultOption: {

            zlevel: 0,

            z: 0,

            center: ['50%', '50%'],

            radius: ['0%', '75%']
        }
    });
});