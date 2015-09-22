define(function(require) {

    'use strict';

    var axisDefault = require('../axisDefault');
    var zrUtil = require('zrender/core/util');
    var ComponentModel = require('../../model/Component');

    function mergeDefault(axisOption, ecModel) {
        var axisType = axisOption.type + 'Axis';

        zrUtil.merge(axisOption, ecModel.get(axisType));
        zrUtil.merge(axisOption, ecModel.getTheme().get(axisType));
        zrUtil.merge(axisOption, axisDefault[axisType]);
    }

    var PolarAxisModel = ComponentModel.extend({
        type: 'polarAxis',
        /**
         * @type {module:echarts/coord/polar/AngleAxis|module:echarts/coord/polar/RadiusAxis}
         */
        axis: null
    });

    zrUtil.merge(PolarAxisModel.prototype, require('../axisModelCommonMixin'));


    // Radius axis
    PolarAxisModel.extend({

        type: 'radiusAxis',

        /**
         * @type {module:echarts/coord/polar/RadiusAxis}
         */
        axis: null,

        init: function (axisOption, parentModel, ecModel) {
            zrUtil.merge(axisOption, this.getDefaultOption(), false);

            mergeDefault(axisOption, ecModel);
        },

        defaultOption: {

            type: 'value',

            polarIndex: 0,

            axisAngle: 0
        }
    });

    // Angle axis
    PolarAxisModel.extend({

        type: 'angleAxis',

        /**
         * @type {module:echarts/coord/polar/AngleAxis}
         */
        axis: null,

        init: function (axisOption, parentModel, ecModel) {
            zrUtil.merge(axisOption, this.getDefaultOption(), false);

            mergeDefault(axisOption, ecModel);
        },

        defaultOption: {

            type: 'category',

            polarIndex: 0,

            clockWise: true,

            axisLabel: {
                rotate: false
            }
        }
    });
});