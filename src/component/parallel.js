define(function(require) {

    require('../coord/parallel/parallelCreator');
    require('../coord/parallel/ParallelModel');
    require('./parallelAxis');

    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');

    var CLICK_THRESHOLD = 5; // > 4

    // Parallel view
    echarts.extendComponentView({
        type: 'parallel',

        render: function (parallelModel, ecModel, api) {
            var zr = api.getZr();

            if (!this.__onMouseDown) {
                // FIXME
                // click: mousemove check. otherwise confilct with drag brush.
                var mousedownPoint;
                zr.on('mousedown', this.__onMouseDown = function (e) {
                    mousedownPoint = [e.offsetX, e.offsetY];
                });
                zr.on('mouseup', this.__onMouseUp = function (e) {
                    var point = [e.offsetX, e.offsetY];
                    var dist = Math.pow(mousedownPoint[0] - point[0], 2)
                        + Math.pow(mousedownPoint[1] - point[1], 2);

                    if (!parallelModel.get('axisExpandable') || dist > CLICK_THRESHOLD) {
                        return;
                    }

                    var coordSys = parallelModel.coordinateSystem;
                    var closestDim = coordSys.findClosestAxisDim(point);
                    if (closestDim) {
                        var axisIndex = zrUtil.indexOf(coordSys.dimensions, closestDim);
                        api.dispatchAction({
                            type: 'parallelAxisExpand',
                            axisExpandCenter: axisIndex
                        });
                    }
                });
            }
        },

        dispose: function (ecModel, api) {
            api.getZr().off(this.__onMouseDown);
            api.getZr().off(this.__onMouseUp);
        }
    });

    echarts.registerPreprocessor(
        require('../coord/parallel/parallelPreprocessor')
    );

});