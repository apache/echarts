define(function(require) {

    var ComponentModel = require('../../model/Component');
    var defaultOption = require('../axisDefault');
    var zrUtil = require('zrender/core/util');
    var makeStyleMapper = require('../../model/mixin/makeStyleMapper');

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

            type: 'value', // 'value', 'category', ...

            dim: null, // 'dim0', 'dim1', 'dim2', ...

            parallelIndex: null,

            areaSelectStyle: {
                width: 20,
                borderWidth: 2,
                borderColor: 'rgba(160,197,232,0.4)',
                color: 'rgba(160,197,232,0.4)'
            },

            z: 10
        },

        /**
         * @override
         */
        init: function (axisOption, parentModel, ecModel) {
            this.mergeOption(axisOption, parentModel, ecModel);
        },

        /**
         * @override
         */
        mergeOption: function (axisOption, parentModel, ecModel) {
            zrUtil.merge(axisOption, this.getDefaultOption(), false);
            mergeDefault(axisOption, ecModel);
        },

        /**
         * @return {Object}
         */
        getAreaSelectStyle: function () {
            return makeStyleMapper(
                [
                    ['fill', 'color'],
                    ['lineWidth', 'borderWidth'],
                    ['stroke', 'borderColor'],
                    ['width', 'width']
                ]
            ).call(this.getModel('areaSelectStyle'));
        }

    });

    zrUtil.merge(AxisModel.prototype, require('../axisModelCommonMixin'));

    return AxisModel;
});