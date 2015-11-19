define(function (require) {

    var OrdinalScale = require('../scale/Ordinal');
    var IntervalScale = require('../scale/Interval');
    var Scale = require('../scale/Scale');

    var numberUtil = require('../util/number');
    var zrUtil = require('zrender/core/util');
    var axisHelper = {};

    axisHelper.niceScaleExtent = function (axis, model) {
        var scale = axis.scale;
        if (scale.type === 'ordinal') {
            return;
        }
        var min = model.get('min');
        var max = model.get('max');
        var boundaryGap = model.get('boundaryGap');
        if (!zrUtil.isArray(boundaryGap)) {
            boundaryGap = [boundaryGap || 0, boundaryGap || 0];
        }
        boundaryGap[0] = numberUtil.parsePercent(boundaryGap[0], 1);
        boundaryGap[1] = numberUtil.parsePercent(boundaryGap[1], 1);
        var originalExtent = scale.getExtent();
        var span = originalExtent[1] - originalExtent[0];
        var fixMin = true;
        var fixMax = true;
        // Add boundary gap
        if (min == null) {
            min = originalExtent[0] - boundaryGap[0] * span;
            fixMin = false;
        }
        if (max == null) {
            max = originalExtent[1] + boundaryGap[1] * span;
            fixMax = false;
        }
        // TODO Only one data
        if (min === 'dataMin') {
            min = originalExtent[0];
        }
        if (max === 'dataMax') {
            max = originalExtent[1];
        }
        scale.setExtent(min, max);
        scale.niceExtent(model.get('splitNumber'), fixMin, fixMax);
    };

    /**
     * @param {module:echarts/coord/cartesian/AxisModel} axisModel
     * @return {module:echarts/scale/*}
     */
    axisHelper.createScaleByModel = function(axisModel) {
        var axisType = axisModel.get('type');
        if (axisType) {
            switch (axisType) {
                // Buildin scale
                case 'category':
                    return new OrdinalScale(axisModel.get('data'), [Infinity, -Infinity]);
                case 'value':
                    return new IntervalScale();
                // Extended scale, like time and log
                default:
                    return (Scale.getClass(axisType) || IntervalScale).create(axisModel);
            }
        }
    };

    /**
     * Check if the axis corss 0
     */
    axisHelper.ifAxisCrossZero = function (axis) {
        var dataExtent = axis.scale.getExtent();
        return !((dataExtent[0] > 0 && dataExtent[1] > 0)
                || (dataExtent[0] < 0 && dataExtent[1] < 0))
            || axisHelper.ifAxisNeedsCrossZero(axis);
    };

    /**
     * Check if the axis scale needs include data 0
     */
    axisHelper.ifAxisNeedsCrossZero = function (axis) {
        return !axis.model.get('scale');
    };

    return axisHelper;
});