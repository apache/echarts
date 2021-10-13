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
import { LineStyleOption } from '../../util/types';
import { PathStyleProps } from 'zrender/src/graphic/Path';

export const LINE_STYLE_KEY_MAP = [
    ['lineWidth', 'width'],
    ['stroke', 'color'],
    ['opacity'],
    ['shadowBlur'],
    ['shadowOffsetX'],
    ['shadowOffsetY'],
    ['shadowColor'],
    ['lineDash', 'type'],
    ['lineDashOffset', 'dashOffset'],
    ['lineCap', 'cap'],
    ['lineJoin', 'join'],
    ['miterLimit']
    // Option decal is in `DecalObject` but style.decal is in `PatternObject`.
    // So do not transfer decal directly.
];

const getLineStyle = makeStyleMapper(LINE_STYLE_KEY_MAP);

type LineStyleKeys = 'lineWidth'
    | 'stroke'
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

export type LineStyleProps = Pick<PathStyleProps, LineStyleKeys>;

class LineStyleMixin {

    getLineStyle(
        this: Model,
        excludes?: readonly (keyof LineStyleOption)[]
    ): LineStyleProps {
        return getLineStyle(this, excludes);
    }

};

export {LineStyleMixin};
