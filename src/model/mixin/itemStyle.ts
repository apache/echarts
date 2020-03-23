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
import { ItemStyleOption } from '../../util/types';
import { PathStyleProps } from 'zrender/src/graphic/Path';

const getItemStyle = makeStyleMapper([
    ['fill', 'color'],
    ['stroke', 'borderColor'],
    ['lineWidth', 'borderWidth'],
    ['opacity'],
    ['shadowBlur'],
    ['shadowOffsetX'],
    ['shadowOffsetY'],
    ['shadowColor']
]);

type ItemStyleKeys = 'fill'
    | 'stroke'
    | 'lineWidth'
    | 'opacity'
    | 'shadowBlur'
    | 'shadowOffsetX'
    | 'shadowOffsetY'
    | 'shadowColor';

type ItemStyleProps = Pick<PathStyleProps, ItemStyleKeys>;

class ItemStyleMixin {

    getItemStyle(
        this: Model,
        excludes?: readonly (keyof ItemStyleOption)[],
        includes?: readonly (keyof ItemStyleOption)[]
    ): ItemStyleProps {
        let style = getItemStyle(this, excludes, includes);
        let lineDash = this.getBorderLineDash();
        lineDash && ((style as any).lineDash = lineDash);
        return style;
    }

    getBorderLineDash(this: Model): number[] {
        let lineType = this.get('borderType');
        return (lineType === 'solid' || lineType == null) ? null
            : (lineType === 'dashed' ? [5, 5] : [1, 1]);
    }
}

export {ItemStyleMixin};
