define(function (require) {

    var globalListener = require('./globalListener');

    var AxisPonterView = require('../../echarts').extendComponentView({

        type: 'axisPointer',

        render: function (globalAxisPointerModel, ecModel, api) {
            var globalTooltipModel = ecModel.getComponent('tooltip');
            var triggerOn = globalAxisPointerModel.get('triggerOn')
                || (globalTooltipModel && globalTooltipModel.get('triggerOn') || 'mousemove|click');

            // Register global listener in AxisPointerView to enable
            // AxisPointerView to be independent to Tooltip.
            globalListener.register(
                'axisPointer',
                api,
                function (currTrigger, e, dispatchAction) {
                    // If 'none', it is not controlled by mouse totally.
                    if (triggerOn !== 'none'
                        && (currTrigger === 'leave' || triggerOn.indexOf(currTrigger) >= 0)
                    ) {
                        dispatchAction({
                            type: 'updateAxisPointer',
                            currTrigger: currTrigger,
                            x: e && e.offsetX,
                            y: e && e.offsetY
                        });
                    }
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
            globalListener.unregister('axisPointer', api);
            AxisPonterView.superApply(this._model, 'dispose', arguments);
        }

    });

});