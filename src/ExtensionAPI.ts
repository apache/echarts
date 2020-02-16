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
import {CoordinateSystem} from './coord/CoordinateSystem';
import Element from 'zrender/src/Element';
import ComponentModel from './model/Component';

var availableMethods = {
    getDom: 1,
    getZr: 1,
    getWidth: 1,
    getHeight: 1,
    getDevicePixelRatio: 1,
    dispatchAction: 1,
    isDisposed: 1,
    on: 1,
    off: 1,
    getDataURL: 1,
    getConnectedDataURL: 1,
    getModel: 1,
    getOption: 1,
    getViewOfComponentModel: 1,
    getViewOfSeriesModel: 1
};

interface ExtensionAPI extends Pick<EChartsType, keyof typeof availableMethods> {}

abstract class ExtensionAPI {

    constructor(ecInstance: EChartsType) {
        zrUtil.each(availableMethods, function (v, name: string) {
            (this as any)[name] = zrUtil.bind((ecInstance as any)[name], ecInstance);
        }, this);
    }

    // Implemented in echarts.js
    abstract getCoordinateSystems(): CoordinateSystem[];

    // Implemented in echarts.js
    abstract getComponentByElement(el: Element): ComponentModel;
}

export default ExtensionAPI;
