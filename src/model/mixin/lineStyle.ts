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
import Model from '../Model';
import { StyleProps } from 'zrender/src/graphic/Style';
import { LineStyleOption } from '../../util/types';

const getLineStyle = makeStyleMapper([
    ['lineWidth', 'width'],
    ['stroke', 'color'],
    ['opacity'],
    ['shadowBlur'],
    ['shadowOffsetX'],
    ['shadowOffsetY'],
    ['shadowColor']
]);

type LineStyleKeys = 'lineWidth'
    | 'stroke'
    | 'opacity'
    | 'shadowBlur'
    | 'shadowOffsetX'
    | 'shadowOffsetY'
    | 'shadowColor';

type LineStyleProps = Pick<StyleProps, LineStyleKeys>;

class LineStyleMixin {

    getLineStyle(this: Model, excludes?: readonly (keyof LineStyleOption)[]): LineStyleProps {
        let style = getLineStyle(this, excludes);
        // Always set lineDash whether dashed, otherwise we can not
        // erase the previous style when assigning to el.style.
        (style as any).lineDash = this.getLineDash((style as any).lineWidth);
        return style;
    }

    getLineDash(this: Model, lineWidth?: number) {
        if (lineWidth == null) {
            lineWidth = 1;
        }
        let lineType = this.get('type');
        let dotSize = Math.max(lineWidth, 2);
        let dashSize = lineWidth * 4;
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

export {LineStyleMixin};
