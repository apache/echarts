define(function (require) {

    var zrUtil = require('zrender/core/util');

    var helper = {};

    /**
     * @param {Object} opt {labelInside}
     * @return {Object} {
     *  position, rotation, labelDirection, labelOffset,
     *  tickDirection, labelRotate, labelInterval, z2
     * }
     */
    helper.layout = function (gridModel, axisModel, opt) {
        opt = opt || {};
        var grid = gridModel.coordinateSystem;
        var axis = axisModel.axis;
        var layout = {};

        var rawAxisPosition = axis.position;
        var axisPosition = axis.onZero ? 'onZero' : rawAxisPosition;
        var axisDim = axis.dim;

        // [left, right, top, bottom]
        var rect = grid.getRect();
        var rectBound = [rect.x, rect.x + rect.width, rect.y, rect.y + rect.height];

        var axisOffset = axisModel.get('offset') || 0;

        var posMap = {
            x: { top: rectBound[2] - axisOffset, bottom: rectBound[3] + axisOffset },
            y: { left: rectBound[0] - axisOffset, right: rectBound[1] + axisOffset }
        };

        posMap.x.onZero = Math.max(Math.min(getZero('y'), posMap.x.bottom), posMap.x.top);
        posMap.y.onZero = Math.max(Math.min(getZero('x'), posMap.y.right), posMap.y.left);

        function getZero(dim, val) {
            var theAxis = grid.getAxis(dim);
            return theAxis.toGlobalCoord(theAxis.dataToCoord(0));
        }

        // Axis position
        layout.position = [
            axisDim === 'y' ? posMap.y[axisPosition] : rectBound[0],
            axisDim === 'x' ? posMap.x[axisPosition] : rectBound[3]
        ];

        // Axis rotation
        layout.rotation = Math.PI / 2 * (axisDim === 'x' ? 0 : 1);

        // Tick and label direction, x y is axisDim
        var dirMap = {top: -1, bottom: 1, left: -1, right: 1};

        layout.labelDirection = layout.tickDirection = layout.nameDirection = dirMap[rawAxisPosition];
        layout.labelOffset = axis.onZero ? posMap[axisDim][rawAxisPosition] - posMap[axisDim].onZero : 0;

        if (axisModel.get('axisTick.inside')) {
            layout.tickDirection = -layout.tickDirection;
        }
        if (zrUtil.retrieve(opt.labelInside, axisModel.get('axisLabel.inside'))) {
            layout.labelDirection = -layout.labelDirection;
        }

        // Special label rotation
        var labelRotate = axisModel.get('axisLabel.rotate');
        layout.labelRotate = axisPosition === 'top' ? -labelRotate : labelRotate;

        // label interval when auto mode.
        layout.labelInterval = axis.getLabelInterval();

        // Over splitLine and splitArea
        layout.z2 = 1;

        return layout;
    };

    return helper;

});