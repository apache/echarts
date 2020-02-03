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

import makeStyleMapper from './makeStyleMapper';

var getLineStyle = makeStyleMapper(
    [
        ['lineWidth', 'width'],
        ['stroke', 'color'],
        ['opacity'],
        ['shadowBlur'],
        ['shadowOffsetX'],
        ['shadowOffsetY'],
        ['shadowColor']
    ]
);

export default {
    getLineStyle: function (excludes) {
        var style = getLineStyle(this, excludes);
        // Always set lineDash whether dashed, otherwise we can not
        // erase the previous style when assigning to el.style.
        style.lineDash = this.getLineDash(style.lineWidth);
        return style;
    },

    getLineDash: function (lineWidth) {
        if (lineWidth == null) {
            lineWidth = 1;
        }
        var lineType = this.get('type');
        var dotSize = Math.max(lineWidth, 2);
        var dashSize = lineWidth * 4;
        return (lineType === 'solid' || lineType == null)
            // Use `false` but not `null` for the solid line here, because `null` might be
            // ignored when assigning to `el.style`. e.g., when setting `lineStyle.type` as
            // `'dashed'` and `emphasis.lineStyle.type` as `'solid'` in graph series, the
            // `lineDash` gotten form the latter one is not able to erase that from the former
            // one if using `null` here according to the emhpsis strategy in `util/graphic.js`.
            ? false
            : lineType === 'dashed'
            ? [dashSize, dashSize]
            : [dotSize, dotSize];
    }
};