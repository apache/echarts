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
        var lineDash = this.getLineDash(style.lineWidth);
        lineDash && (style.lineDash = lineDash);
        return style;
    },

    getLineDash: function (lineWidth) {
        if (lineWidth == null) {
            lineWidth = 1;
        }
        var lineType = this.get('type');
        var dotSize = Math.max(lineWidth, 2);
        var dashSize = lineWidth * 4;
        return (lineType === 'solid' || lineType == null) ? null
            : (lineType === 'dashed' ? [dashSize, dashSize] : [dotSize, dotSize]);
    }
};