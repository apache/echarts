define(function(require) {

    'use strict';

    var axisDefault = require('../axisDefault');

    var zrUtil = require('zrender/core/util');

    function mergeDefault(axisOption, ecModel) {
        var axisType = axisOption.type + 'Axis';

        zrUtil.merge(axisOption, ecModel.get(axisType));
        zrUtil.merge(axisOption, ecModel.getTheme().get(axisType));
        zrUtil.merge(axisOption, axisDefault[axisType]);
    }

    var PolarAxisModel = require('../../model/Component').extend({
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
            axisOption.type = axisOption.type || 'value';

            axisOption.polarIndex = axisOption.polarIndex || 0;

            mergeDefault(axisOption, ecModel);
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
            axisOption.type = axisOption.type || 'category';

            axisOption.polarIndex = axisOption.polarIndex || 0;

            mergeDefault(axisOption, ecModel);
        }
    });
});