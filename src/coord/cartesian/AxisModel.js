define(function(require) {

    'use strict';

    var ComponentModel = require('../../model/Component');
    var defaultOption = require('../axisDefault');
    var zrUtil = require('zrender/core/util');

    function mergeDefault(axisOption, ecModel) {
        var axisType = axisOption.type + 'Axis';

        zrUtil.merge(axisOption, ecModel.get(axisType));
        zrUtil.merge(axisOption, ecModel.getTheme().get(axisType));
        zrUtil.merge(axisOption, defaultOption[axisType]);
    }

    var AxisModel = ComponentModel.extend({

        type: 'cartesian2dAxis',

        /**
         * @type {module:echarts/coord/cartesian/Axis2D}
         */
        axis: null
    });

    zrUtil.merge(AxisModel.prototype, require('../axisModelCommonMixin'));


    // x axis
    AxisModel.extend({

        type: 'xAxis',

        init: function (axisOption, parentModel, ecModel) {

            zrUtil.merge(axisOption, this.getDefaultOption(), false);

            mergeDefault(axisOption, ecModel);
        },

        defaultOption: {
            type: 'category',

            gridIndex: 0,

            position: 'bottom'
        }
    });

    // y axis
    AxisModel.extend({

        type: 'yAxis',

        init: function (axisOption, parentModel, ecModel) {

            zrUtil.merge(axisOption, this.getDefaultOption(), false);

            mergeDefault(axisOption, ecModel);
        },

        defaultOption: {
            type: 'value',

            gridIndex: 0,

            position: 'left'
        }
    });

    return AxisModel;
});