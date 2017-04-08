define(function(require) {

    require('../coord/parallel/parallelCreator');
    require('../coord/parallel/ParallelModel');
    require('./parallelAxis');

    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');
    var throttle = require('../util/throttle');

    // Parallel view
    echarts.extendComponentView({
        type: 'parallel',

        render: function (parallelModel, ecModel, api) {
            this._model = parallelModel;
            this._api = api;

            // The same method will not be rebounded.
            api.getZr().on('mousemove', this._onMouseMove, this);

            throttle.createOrUpdate(
                this,
                '_throttledDispatchExpand',
                parallelModel.get('axisExpandRate'),
                'fixRate'
            );
        },

        dispose: function (ecModel, api) {
            api.getZr().off('mousemove', this._onMouseMove);
        },

        /**
         * @param {Object} [opt] If null, cancle the last action triggering for debounce.
         */
        _throttledDispatchExpand: function (opt) {
            this._dispatchExpand(opt);
        },

        _dispatchExpand: function (opt) {
            opt && this._api.dispatchAction(
                zrUtil.extend({type: 'parallelAxisExpand'}, opt)
            );
        },

        _onMouseMove: function (e) {
            var model = this._model;
            var result = model.coordinateSystem.getSlidedAxisExpandWindow(
                [e.offsetX, e.offsetY]
            );

            var behavior = result.behavior;
            behavior === 'jump' && this._throttledDispatchExpand.debounceNextCall(model.get('axisExpandDebounce'));
            this._throttledDispatchExpand(
                behavior === 'none'
                    ? null // Cancle the last trigger, in case that mouse slide out of the area quickly.
                    : {
                        axisExpandWindow: result.axisExpandWindow,
                        // Jumping uses animation, and sliding suppresses animation.
                        animation: behavior === 'jump'  ? null : false
                    }
            );
        }
    });

    echarts.registerPreprocessor(
        require('../coord/parallel/parallelPreprocessor')
    );

});