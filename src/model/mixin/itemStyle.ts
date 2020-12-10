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

export const ITEM_STYLE_KEY_MAP = [
    ['fill', 'color'],
    ['stroke', 'borderColor'],
    ['lineWidth', 'borderWidth'],
    ['opacity'],
    ['shadowBlur'],
    ['shadowOffsetX'],
    ['shadowOffsetY'],
    ['shadowColor'],
    ['lineDash', 'borderType'],
    ['lineDashOffset', 'borderDashOffset'],
    ['lineCap', 'borderCap'],
    ['lineJoin', 'borderJoin'],
    ['miterLimit', 'borderMiterLimit']
    // Option decal is in `DecalObject` but style.decal is in `PatternObject`.
    // So do not transfer decal directly.
];

const getItemStyle = makeStyleMapper(ITEM_STYLE_KEY_MAP);

type ItemStyleKeys = 'fill'
    | 'stroke'
    | 'decal'
    | 'lineWidth'
    | 'opacity'
    | 'shadowBlur'
    | 'shadowOffsetX'
    | 'shadowOffsetY'
    | 'shadowColor'
    | 'lineDash'
    | 'lineDashOffset'
    | 'lineCap'
    | 'lineJoin'
    | 'miterLimit';

export type ItemStyleProps = Pick<PathStyleProps, ItemStyleKeys>;

class ItemStyleMixin {

    getItemStyle(
        this: Model,
        excludes?: readonly (keyof ItemStyleOption)[],
        includes?: readonly (keyof ItemStyleOption)[]
    ): ItemStyleProps {
        return getItemStyle(this, excludes, includes);
    }

}

export {ItemStyleMixin};
