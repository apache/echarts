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

import * as zrUtil from 'zrender/src/core/util';

/**
 * @param {Object} opt {labelInside}
 * @return {Object} {
 *  position, rotation, labelDirection, labelOffset,
 *  tickDirection, labelRotate, z2
 * }
 */
export function layout(axisModel, opt) {
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

    layout.z2 = 1;

    return layout;
}
