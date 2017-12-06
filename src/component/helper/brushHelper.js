import BoundingRect from 'zrender/src/core/BoundingRect';
import {onIrrelevantElement} from './cursorHelper';
import * as graphicUtil from '../../util/graphic';

export function makeRectPanelClipPath(rect) {
    rect = normalizeRect(rect);
    return function (localPoints, transform) {
        return graphicUtil.clipPointsByRect(localPoints, rect);
    };
}

export function makeLinearBrushOtherExtent(rect, specifiedXYIndex) {
    rect = normalizeRect(rect);
    return function (xyIndex) {
        var idx = specifiedXYIndex != null ? specifiedXYIndex : xyIndex;
        var brushWidth = idx ? rect.width : rect.height;
        var base = idx ? rect.x : rect.y;
        return [base, base + (brushWidth || 0)];
    };
}

export function makeRectIsTargetByCursor(rect, api, targetModel) {
    rect = normalizeRect(rect);
    return function (e, localCursorPoint, transform) {
        return rect.contain(localCursorPoint[0], localCursorPoint[1])
            && !onIrrelevantElement(e, api, targetModel);
    };
}

// Consider width/height is negative.
function normalizeRect(rect) {
    return BoundingRect.create(rect);
}


