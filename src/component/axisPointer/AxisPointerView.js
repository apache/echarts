define(function (require) {

    var globalListener = require('./globalListener');

    var AxisPonterView = require('../../echarts').extendComponentView({

        type: 'axisPointer',

        render: function (globalAxisPointerModel, ecModel, api) {
            // Register global listener in AxisPointerView to enable
            // AxisPointerView to be independent to Tooltip.
            globalListener.register(
                'axisPointer',
                api,
                function (currTrigger, e, dispatchAction) {
                    dispatchAction({
                        type: 'updateAxisPointer',
                        currTrigger: currTrigger,
                        x: e && e.offsetX,
                        y: e && e.offsetY
                    });
                }
            );
        },

        /**
         * @override
         */
        remove: function (ecModel, api) {
            globalListener.disopse(api.getZr(), 'axisPointer');
            AxisPonterView.superApply(this._model, 'remove', arguments);
        },

        /**
         * @override
         */
        dispose: function (ecModel, api) {
            globalListener.disopse(api.getZr(), 'axisPointer');
            AxisPonterView.superApply(this._model, 'dispose', arguments);
        }

    });

});