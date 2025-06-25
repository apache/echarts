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
import { CoordinateSystemHostModel } from '../../coord/CoordinateSystem';
import type Component from '../../model/Component';
import { retrieveZInfo } from '../../util/graphic';

const IRRELEVANT_EXCLUDES = {'axisPointer': 1, 'tooltip': 1, 'brush': 1};

/**
 * Used on roam/brush triggering determination.
 * This is to avoid that: mouse clicking on an elements that is over geo or graph,
 * but roam is triggered unexpectedly.
 */
export function onIrrelevantElement(
    e: ElementEvent,
    api: ExtensionAPI,
    targetComponent: Component
): boolean {
    const eventElComponent = api.getComponentByElement(e.topTarget);

    if (!eventElComponent
        || eventElComponent === targetComponent
        || IRRELEVANT_EXCLUDES.hasOwnProperty(eventElComponent.mainType)
    ) {
        return false;
    }

    // At present the `true` return is conservative. That is, the caller, such as a RoamController,
    // is more likely to get a `false` return and start a roam behavior, becuase even if the
    // `model.coordinateSystem` does not exist, the `e.topTarget` may be also a relevant element,
    // such as axis split line/area or series elements, where roam should be available. Otherwise,
    // if a dataZoom-served cartesian is full of series elements, the dataZoom-roaming can hardly
    // be triggered.
    const eventElCoordSys = (eventElComponent as CoordinateSystemHostModel).coordinateSystem;
    // If eventElComponent is axisModel, it works only if it is injected with coordinateSystem.
    if (!eventElCoordSys || eventElCoordSys.model === targetComponent) {
        return false;
    }

    // e.g., if a cartesian is covered by a graph, the graph has a higher presedence in roam.
    // A potential bad case is that RoamController does not prevent the cartesian from handling zr
    // event, such as click and hovering, but it's fine so far.
    // Aslo be conservative, if equals, return false.
    const eventElCmptZInfo = retrieveZInfo(eventElComponent);
    const targetCmptZInfo = retrieveZInfo(targetComponent);
    if ((
            (eventElCmptZInfo.zlevel - targetCmptZInfo.zlevel)
            || (eventElCmptZInfo.z - targetCmptZInfo.z)
        ) <= 0
    ) {
        return false;
    }

    return true;
}
