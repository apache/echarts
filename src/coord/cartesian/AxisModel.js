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
         * @override
         */
        init: function () {
            AxisModel.superApply(this, 'init', arguments);
            this.resetRange();
        },

        /**
         * @override
         */
        mergeOption: function () {
            AxisModel.superApply(this, 'mergeOption', arguments);
            this.resetRange();
        },

        /**
         * @override
         */
        restoreData: function () {
            AxisModel.superApply(this, 'restoreData', arguments);
            this.resetRange();
        },

        /**
         * @return {module:echarts/model/Model}
         */
        findGridModel: function () {
            return this.ecModel.queryComponents({
                mainType: 'grid',
                index: this.get('gridIndex'),
                id: this.get('gridId')
            })[0];
        }

    });

    function getAxisType(axisDim, option) {
        // Default axis with data is category axis
        return option.type || (option.data ? 'category' : 'value');
    }

    zrUtil.merge(AxisModel.prototype, require('../axisModelCommonMixin'));
    zrUtil.merge(AxisModel.prototype, require('../axisModelZoomMixin'));

    var extraOption = {
        // gridIndex: 0,
        // gridId: '',

        // Offset is for multiple axis on the same position
        offset: 0
    };

    axisModelCreator('x', AxisModel, getAxisType, extraOption);
    axisModelCreator('y', AxisModel, getAxisType, extraOption);

    return AxisModel;
});