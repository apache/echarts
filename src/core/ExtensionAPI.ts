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
import {EChartsType} from './echarts';

import type {CoordinateSystemMaster} from '../coord/CoordinateSystem';
import type Element from 'zrender/src/Element';
import type ComponentModel from '../model/Component';
import type ComponentView from '../view/Component';
import type ChartView from '../view/Chart';
import type SeriesModel from '../model/Series';
import type GlobalModel from '../model/Global';

const availableMethods: (keyof EChartsType)[] = [
    'getDom',
    'getZr',
    'getWidth',
    'getHeight',
    'getDevicePixelRatio',
    'dispatchAction',
    'isSSR',
    'isDisposed',
    'on',
    'off',
    'getDataURL',
    'getConnectedDataURL',
    // 'getModel',
    'getOption',
    // 'getViewOfComponentModel',
    // 'getViewOfSeriesModel',
    'getId',
    'updateLabelLayout'
];

interface ExtensionAPI extends Pick<EChartsType, (typeof availableMethods)[number]> {}

abstract class ExtensionAPI {

    constructor(ecInstance: EChartsType) {
        zrUtil.each(availableMethods, function (methodName: string) {
            (this as any)[methodName] = zrUtil.bind((ecInstance as any)[methodName], ecInstance);
        }, this);
    }

    // Implemented in echarts.js
    abstract getCoordinateSystems(): CoordinateSystemMaster[];
    abstract getComponentByElement(el: Element): ComponentModel;
    abstract enterEmphasis(el: Element, highlightDigit?: number): void;
    abstract leaveEmphasis(el: Element, highlightDigit?: number): void;
    abstract enterSelect(el: Element): void;
    abstract leaveSelect(el: Element): void;
    abstract enterBlur(el: Element): void;
    abstract leaveBlur(el: Element): void;
    // These methods are not planned to be exposed to outside.
    abstract getViewOfComponentModel(componentModel: ComponentModel): ComponentView;
    abstract getViewOfSeriesModel(seriesModel: SeriesModel): ChartView;
    abstract getModel(): GlobalModel;
}

export default ExtensionAPI;
