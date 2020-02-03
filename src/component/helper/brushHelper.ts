/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

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


