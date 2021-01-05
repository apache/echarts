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


import { ElementEvent } from 'zrender/src/Element';
import ExtensionAPI from '../../core/ExtensionAPI';
import SeriesModel from '../../model/Series';
import { CoordinateSystem } from '../../coord/CoordinateSystem';

const IRRELEVANT_EXCLUDES = {'axisPointer': 1, 'tooltip': 1, 'brush': 1};

/**
 * Avoid that: mouse click on a elements that is over geo or graph,
 * but roam is triggered.
 */
export function onIrrelevantElement(
    e: ElementEvent, api: ExtensionAPI, targetCoordSysModel: CoordinateSystem['model']
): boolean {
    const model = api.getComponentByElement(e.topTarget);
    // If model is axisModel, it works only if it is injected with coordinateSystem.
    const coordSys = model && (model as SeriesModel).coordinateSystem;
    return model
        && model !== targetCoordSysModel
        && !IRRELEVANT_EXCLUDES.hasOwnProperty(model.mainType)
        && (coordSys && coordSys.model !== targetCoordSysModel);
}
