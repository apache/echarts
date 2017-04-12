define(function (require) {

    var zrUtil = require('zrender/core/util');
    var cursorHelper = require('./cursorHelper');
    var BoundingRect = require('zrender/core/BoundingRect');

    var mathMax = Math.max;
    var mathMin = Math.min;

    var helper = {};

    helper.makeRectPanelClipPath = function (rect) {
        rect = normalizeRect(rect);
        return function (localPoints, transform) {
            return zrUtil.map(localPoints, function (localPoint) {
                var x = localPoint[0];
                x = mathMax(x, rect.x);
                x = mathMin(x, rect.x + rect.width);
                var y = localPoint[1];
                y = mathMax(y, rect.y);
                y = mathMin(y, rect.y + rect.height);
                return [x, y];
            });
        };
    };

    helper.makeLinearBrushOtherExtent = function (rect, specifiedXYIndex) {
        rect = normalizeRect(rect);
        return function (xyIndex) {
            var idx = specifiedXYIndex != null ? specifiedXYIndex : xyIndex;
            var brushWidth = idx ? rect.width : rect.height;
            var base = idx ? rect.x : rect.y;
            return [base, base + (brushWidth || 0)];
        };
    };

    helper.makeRectIsTargetByCursor = function (rect, api, targetModel) {
        rect = normalizeRect(rect);
        return function (e, localCursorPoint, transform) {
            return rect.contain(localCursorPoint[0], localCursorPoint[1])
                && !cursorHelper.onIrrelevantElement(e, api, targetModel);
        };
    };

    // Consider width/height is negative.
    function normalizeRect(rect) {
        return BoundingRect.create(rect);
    }

    return helper;

});