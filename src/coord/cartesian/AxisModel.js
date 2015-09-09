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
        axis: null,

        /**
         * @override
         */
        init: function () {
            ComponentModel.prototype.init.call(this);

            var data = this.getData();
            if (data) {
                // FIXME
                // clone?
                /**
                 * @type {Array}
                 * @private
                 */
                this._dataBeforeProcessing = data.slice();
            }
        },

        /**
         * @public
         * @return {Array=} data Can be null
         */
        getData: function () {
            return this.get('data');
        },

        /**
         * @override
         */
        restoreData: function () {
            // FIXME
            // clone?
            if (this._dataBeforeProcessing) {
                this.option.data = this._dataBeforeProcessing.slice();
            }
        }
    });

    zrUtil.merge(AxisModel.prototype, require('../axisModelCommonMixin'));


    // x axis
    AxisModel.extend({

        type: 'xAxis',

        init: function (axisOption, parentModel, ecModel) {
            AxisModel.prototype.init.call(this);

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
            AxisModel.prototype.init.call(this);

            axisOption.type = axisOption.type || 'value';

            axisOption.position = axisOption.position || 'left';

            axisOption.gridIndex = axisOption.gridIndex || 0;

            mergeDefault(axisOption, ecModel);
        }
    });

    return AxisModel;
});