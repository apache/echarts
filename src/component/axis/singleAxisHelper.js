import * as zrUtil from 'zrender/src/core/util';

/**
 * @param {Object} opt {labelInside}
 * @return {Object} {
 *  position, rotation, labelDirection, labelOffset,
 *  tickDirection, labelRotate, labelInterval, z2
 * }
 */
export function layout (axisModel, opt) {
    opt = opt || {};
    var single = axisModel.coordinateSystem;
    var axis = axisModel.axis;
    var layout = {};

    var axisPosition = axis.position;
    var orient = axis.orient;

    var rect = single.getRect();
    var rectBound = [rect.x, rect.x + rect.width, rect.y, rect.y + rect.height];

    var positionMap = {
        horizontal: {top: rectBound[2], bottom: rectBound[3]},
        vertical: {left: rectBound[0], right: rectBound[1]}
    };

    layout.position = [
        orient === 'vertical'
            ? positionMap.vertical[axisPosition]
            : rectBound[0],
        orient === 'horizontal'
            ? positionMap.horizontal[axisPosition]
            : rectBound[3]
    ];

    var r = {horizontal: 0, vertical: 1};
    layout.rotation = Math.PI / 2 * r[orient];

    var directionMap = {top: -1, bottom: 1, right: 1, left: -1};

    layout.labelDirection = layout.tickDirection
        = layout.nameDirection
        = directionMap[axisPosition];

    if (axisModel.get('axisTick.inside')) {
        layout.tickDirection = -layout.tickDirection;
    }

    if (zrUtil.retrieve(opt.labelInside, axisModel.get('axisLabel.inside'))) {
        layout.labelDirection = -layout.labelDirection;
    }

    var labelRotation = opt.rotate;
    labelRotation == null && (labelRotation = axisModel.get('axisLabel.rotate'));
    layout.labelRotation = axisPosition === 'top' ? -labelRotation : labelRotation;

    layout.labelInterval = axis.getLabelInterval();

    layout.z2 = 1;

    return layout;
}
