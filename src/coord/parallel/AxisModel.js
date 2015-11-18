define(function(require) {

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

        type: 'parallelAxis',

        /**
         * @type {module:echarts/coord/parallel/Axis}
         */
        axis: null,

        defaultOption: {

            type: 'value',

            parallelIndex: null
        },

        init: function (axisOption, parentModel, ecModel) {

            zrUtil.merge(axisOption, this.getDefaultOption(), false);

            mergeDefault(axisOption, ecModel);
        },

        /**
         * @public
         * @param {boolean} needs Whether axis needs cross zero.
         */
        setNeedsCrossZero: function (needs) {
            this.option.scale = !needs;
        },

        /**
         * @public
         */
        setParallelIndex: function (parallelIndex) {
            this.option.parallelIndex = parallelIndex;
        }

    });

    zrUtil.merge(AxisModel.prototype, require('../axisModelCommonMixin'));

    return AxisModel;
});