define(function (require) {

    var cursorHelper = require('./cursorHelper');
    var BoundingRect = require('zrender/core/BoundingRect');
    var graphicUtil = require('../../util/graphic');

    var helper = {};

    helper.makeRectPanelClipPath = function (rect) {
        rect = normalizeRect(rect);
        return function (localPoints, transform) {
            return graphicUtil.clipPointsByRect(localPoints, rect);
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