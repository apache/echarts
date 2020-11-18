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
import { AreaStyleOption } from '../../util/types';
import { PathStyleProps } from 'zrender/src/graphic/Path';

export const AREA_STYLE_KEY_MAP = [
    ['fill', 'color'],
    ['shadowBlur'],
    ['shadowOffsetX'],
    ['shadowOffsetY'],
    ['opacity'],
    ['shadowColor']
    // Option decal is in `DecalObject` but style.decal is in `PatternObject`.
    // So do not transfer decal directly.
];
const getAreaStyle = makeStyleMapper(AREA_STYLE_KEY_MAP);

type AreaStyleProps = Pick<PathStyleProps,
    'fill'
    | 'shadowBlur'
    | 'shadowOffsetX'
    | 'shadowOffsetY'
    | 'opacity'
    | 'shadowColor'
>;

class AreaStyleMixin {
    getAreaStyle(
        this: Model,
        excludes?: readonly (keyof AreaStyleOption)[],
        includes?: readonly (keyof AreaStyleOption)[]
    ): AreaStyleProps {
        return getAreaStyle(this, excludes, includes);
    }
};

export {AreaStyleMixin};
