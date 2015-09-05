define(function(require) {

    'use strict';

    var defaultOption = require('../axisDefault');
    var zrUtil = require('zrender/core/util');

    function mergeDefault(axisOption, ecModel) {
        var axisType = axisOption.type + 'Axis';

        zrUtil.merge(axisOption, ecModel.get(axisType));
        zrUtil.merge(axisOption, ecModel.getTheme().get(axisType));
        zrUtil.merge(axisOption, defaultOption[axisType]);
    }

    var AxisModel = require('../../model/Component').extend({
        type: 'cartesian2dAxis',

        /**
         * @type {module:echarts/coord/cartesian/Axis2D}
         */
        axis: null,

        /**
         * @public
         * @param {number} start 0-100, null means remain current value.
         * @param {number} end 0-100, null means remain current value.
         */
        setDataZoomRange: function (start, end) {
            var option = this.option;
            start != null && (option.dataZoomStart = start);
            end != null && (option.dataZoomEnd = end);
        }
    });

    zrUtil.merge(AxisModel.prototype, require('../axisModelCommonMixin'));


    // x axis
    AxisModel.extend({

        type: 'xAxis',

        init: function (axisOption, parentModel, ecModel) {
            axisOption.type = axisOption.type || 'category';

            axisOption.position = axisOption.position || 'bottom';

            axisOption.gridIndex = axisOption.gridIndex || 0;

            mergeDefault(axisOption, ecModel);
        }
    });

    // y axis
    AxisModel.extend({

        type: 'yAxis',

        init: function (axisOption, parentModel, ecModel) {
            axisOption.type = axisOption.type || 'value';

            axisOption.position = axisOption.position || 'left';

            axisOption.gridIndex = axisOption.gridIndex || 0;

            mergeDefault(axisOption, ecModel);
        }
    });

    return AxisModel;
});