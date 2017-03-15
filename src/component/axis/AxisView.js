define(function (require) {

    var axisPointerModelHelper = require('../axisPointer/modelHelper');

    /**
     * Base class of AxisView.
     */
    var AxisView = require('../../echarts').extendComponentView({

        type: 'axis',

        /**
         * @private
         */
        _axisPointer: null,

        axisPointerClass: null,

        /**
         * @override
         */
        render: function (axisModel, ecModel, api, payload) {
            AxisView.superApply(this, 'render', arguments);
            updateAxisPointer(this, axisModel, ecModel, api, payload, true);
        },

        /**
         * Action handler.
         * @public
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/model/Global} ecModel
         * @param {module:echarts/ExtensionAPI} api
         * @param {Object} payload
         */
        updateAxisPointer: function (axisModel, ecModel, api, payload, force) {
            updateAxisPointer(this, axisModel, ecModel, api, payload, false);
        },

        /**
         * @override
         */
        remove: function (ecModel, api) {
            var axisPointer = this._axisPointer;
            axisPointer && axisPointer.remove(api);
            AxisView.superApply(this, 'remove', arguments);
        },

        /**
         * @override
         */
        dispose: function (ecModel, api) {
            disposeAxisPointer(this, api);
            AxisView.superApply(this, 'dispose', arguments);
        }

    });

    function updateAxisPointer(axisView, axisModel, ecModel, api, payload, forceRender) {
        if (!axisView.axisPointerClass) {
            return;
        }
        var axisPointerModel = axisPointerModelHelper.getAxisPointerModel(axisModel, ecModel);
        axisPointerModel
            ? (axisView._axisPointer || (axisView._axisPointer = new axisView.axisPointerClass()))
                .render(axisModel, axisPointerModel, api, forceRender)
            : disposeAxisPointer(axisView, api);
    }

    function disposeAxisPointer(axisView, ecModel, api) {
        var axisPointer = axisView._axisPointer;
        axisPointer && axisPointer.dispose(ecModel, api);
        axisView._axisPointer = null;
    }

    return AxisView;
});