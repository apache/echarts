import * as zrUtil from 'zrender/src/core/util';

/**
 * @param {Object} opt {labelInside}
 * @return {Object} {
 *  position, rotation, labelDirection, labelOffset,
 *  tickDirection, labelRotate, labelInterval, z2
 * }
 */
export function layout(gridModel, axisModel, opt) {
    opt = opt || {};
    var grid = gridModel.coordinateSystem;
    var axis = axisModel.axis;
    var layout = {};

    var rawAxisPosition = axis.position;
    var axisPosition = axis.onZero ? 'onZero' : rawAxisPosition;
    var axisDim = axis.dim;

    var rect = grid.getRect();
    var rectBound = [rect.x, rect.x + rect.width, rect.y, rect.y + rect.height];
    var idx = {left: 0, right: 1, top: 0, bottom: 1, onZero: 2};
    var axisOffset = axisModel.get('offset') || 0;

    var posBound = axisDim === 'x'
        ? [rectBound[2] - axisOffset, rectBound[3] + axisOffset]
        : [rectBound[0] - axisOffset, rectBound[1] + axisOffset];

    if (axis.onZero) {
        var otherAxis = grid.getAxis(axisDim === 'x' ? 'y' : 'x', axis.onZeroAxisIndex);
        var onZeroCoord = otherAxis.toGlobalCoord(otherAxis.dataToCoord(0));
        posBound[idx['onZero']] = Math.max(Math.min(onZeroCoord, posBound[1]), posBound[0]);
    }

    // Axis position
    layout.position = [
        axisDim === 'y' ? posBound[idx[axisPosition]] : rectBound[0],
        axisDim === 'x' ? posBound[idx[axisPosition]] : rectBound[3]
    ];

    // Axis rotation
    layout.rotation = Math.PI / 2 * (axisDim === 'x' ? 0 : 1);

    // Tick and label direction, x y is axisDim
    var dirMap = {top: -1, bottom: 1, left: -1, right: 1};

    layout.labelDirection = layout.tickDirection = layout.nameDirection = dirMap[rawAxisPosition];
    layout.labelOffset = axis.onZero ? posBound[idx[rawAxisPosition]] - posBound[idx['onZero']] : 0;

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
}
