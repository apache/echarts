define(function(require) {

    require('../coord/parallel/parallelCreator');
    require('../coord/parallel/ParallelModel');
    require('./parallelAxis');

    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');
    var throttle = require('../util/throttle');

    var CLICK_THRESHOLD = 5; // > 4

    // Parallel view
    echarts.extendComponentView({
        type: 'parallel',

        render: function (parallelModel, ecModel, api) {
            this._model = parallelModel;
            this._api = api;

            if (!this._handlers) {
                this._handlers = {};
                zrUtil.each(handlers, function (handler, eventName) {
                    api.getZr().on(eventName, this._handlers[eventName] = zrUtil.bind(handler, this));
                }, this);
            }

            throttle.createOrUpdate(
                this,
                '_throttledDispatchExpand',
                parallelModel.get('axisExpandThrottle') || 0,
                'fixRate'
            );
        },

        dispose: function (ecModel, api) {
            zrUtil.each(this._handlers, function (handler, eventName) {
                api.getZr().off(eventName, handler);
            });
            this._handlers = null;
        },

        _throttledDispatchExpand: function (axisExpandCenter) {
            this._dispatchExpand(axisExpandCenter);
        },

        _dispatchExpand: function (axisExpandCenter) {
            axisExpandCenter != null && this._api.dispatchAction({
                type: 'parallelAxisExpand',
                axisExpandCenter: axisExpandCenter
            });
        }
    });

    var handlers = {

        mousedown: function (e) {
            if (checkTriggerOn(this, 'click')) {
                this._mouseDownPoint = [e.offsetX, e.offsetY];
            }
        },

        mouseup: function (e) {
            var mouseDownPoint = this._mouseDownPoint;
            // FIXME
            // click: mousemove check. otherwise confilct with drag brush.
            if (!checkTriggerOn(this, 'click') || !mouseDownPoint) {
                return;
            }

            var point = [e.offsetX, e.offsetY];
            var dist = Math.pow(mouseDownPoint[0] - point[0], 2)
                + Math.pow(mouseDownPoint[1] - point[1], 2);

            if (!this._model.get('axisExpandable') || dist > CLICK_THRESHOLD) {
                return;
            }

            var coordSys = this._model.coordinateSystem;
            var closestDim = coordSys.findClosestAxisDim(point);

            if (closestDim) {
                var axisIndex = zrUtil.indexOf(coordSys.dimensions, closestDim);
                this._dispatchExpand(axisIndex);
            }
        },

        mousemove: function (e) {
            if (checkTriggerOn(this, 'mousemove')) {
                this._throttledDispatchExpand(
                    this._model.coordinateSystem.findAxisExpandCenter([e.offsetX, e.offsetY])
                );
            }
        }
    };

    function checkTriggerOn(view, triggerOn) {
        return view._model.get('axisExpandTriggerOn') === triggerOn;
    }

    echarts.registerPreprocessor(
        require('../coord/parallel/parallelPreprocessor')
    );

});