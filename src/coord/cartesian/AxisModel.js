define(function(require) {

    'use strict';

    var ComponentModel = require('../../model/Component');
    var zrUtil = require('zrender/core/util');
    var axisModelCreator = require('../axisModelCreator');

    var AxisModel = ComponentModel.extend({

        type: 'cartesian2dAxis',

        /**
         * @type {module:echarts/coord/cartesian/Axis2D}
         */
        axis: null,

        /**
         * @public
         * @param {boolean} needs Whether axis needs cross zero.
         */
        setNeedsCrossZero: function (needs) {
            this.option.scale = !needs;
        },

        /**
         * @public
         * @param {number} min
         */
        setMin: function (min) {
            this.option.min = min;
        },

        /**
         * @public
         * @param {number} max
         */
        setMax: function (max) {
            this.option.max = max;
        }
    });

    function getAxisType(axisDim, option) {
        // Default axis with data is category axis
        return option.type || (option.data ? 'category' : 'value');
    }

    zrUtil.merge(AxisModel.prototype, require('../axisModelCommonMixin'));

    var extraOption = {
        gridIndex: 0
    };

    axisModelCreator('x', AxisModel, getAxisType, extraOption);
    axisModelCreator('y', AxisModel, getAxisType, extraOption);

    return AxisModel;
});