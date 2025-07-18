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

import type * as graphic from '../../util/graphic';
import type SingleAxisModel from '../../coord/single/AxisModel';
import type CartesianAxisModel from '../../coord/cartesian/AxisModel';
import type { AxisBaseModel } from '../../coord/AxisBaseModel';
import type ExtensionAPI from '../../core/ExtensionAPI';
import type CartesianAxisView from './CartesianAxisView';
import type { PathProps } from 'zrender/src/graphic/Path';
import type SingleAxisView from './SingleAxisView';
import type { AxisBuilderCfg } from './AxisBuilder';
import type { BaseAxisBreakPayload } from './axisAction';
import type { AxisBaseOption } from '../../coord/axisCommonTypes';
import type { AxisBreakOptionIdentifierInAxis, NullUndefined } from '../../util/types';
import { LabelLayoutWithGeometry } from '../../label/labelLayoutHelper';
import type ComponentModel from '../../model/Component';

/**
 * @file The facade of axis break view and mode.
 *  Separate the impl to reduce code size.
 *
 * @caution
 *  Must not import `axis/breakImpl.ts` directly or indirctly.
 *  Must not implement anything in this file.
 */

export type AxisBreakHelper = {
    adjustBreakLabelPair(
        axisInverse: boolean,
        axisRotation: AxisBuilderCfg['rotation'],
        layoutPair: (LabelLayoutWithGeometry | NullUndefined)[],
    ): void;
    buildAxisBreakLine(
        axisModel: AxisBaseModel,
        group: graphic.Group,
        transformGroup: graphic.Group,
        pathBaseProp: PathProps,
    ): void;
    rectCoordBuildBreakAxis(
        axisGroup: graphic.Group,
        axisView: CartesianAxisView | SingleAxisView,
        axisModel: CartesianAxisModel | SingleAxisModel,
        coordSysRect: graphic.BoundingRect,
        api: ExtensionAPI
    ): void;
    updateModelAxisBreak(
        model: ComponentModel<AxisBaseOption>,
        payload: BaseAxisBreakPayload
    ): AxisBreakUpdateResult;
};

export type AxisBreakUpdateResult = {
    breaks: (
        AxisBreakOptionIdentifierInAxis & {
            isExpanded: boolean;
            old: { // The old state in breaks.
                isExpanded: boolean;
            }
        }
    )[];
};


let _impl: AxisBreakHelper = null;

export function registerAxisBreakHelperImpl(impl: AxisBreakHelper): void {
    if (!_impl) {
        _impl = impl;
    }
}

export function getAxisBreakHelper(): AxisBreakHelper | NullUndefined {
    return _impl;
}
