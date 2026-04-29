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

import DataZoomModel, {DataZoomOption} from './DataZoomModel';
import { inheritDefaultOption } from '../../util/component';
import { WheelAxisType } from '../helper/RoamController';

export interface InsideDataZoomOption extends DataZoomOption {

    /**
     * Whether disable this inside zoom.
     */
    disabled?: boolean

    /**
     * Whether disable zoom but only pan.
     */
    zoomLock?: boolean

    zoomOnMouseWheel?: boolean | 'shift' | 'ctrl' | 'alt'

    moveOnMouseMove?: boolean | 'shift' | 'ctrl' | 'alt'

    moveOnMouseWheel?: boolean | 'shift' | 'ctrl' | 'alt'

    preventDefaultMouseMove?: boolean

    /**
     * Restricts the pan (triggered by `moveOnMouseWheel`) to a single
     * wheel axis. Has no effect on zoom — see `zoomOnMouseWheelAxis`.
     *
     * - Omitted (default): either wheel axis can drive the pan, preserving
     *   the pre-existing single-`scrollDelta` behavior.
     * - `'horizontal'`: only `deltaX` drives the pan.
     * - `'vertical'`: only `deltaY` drives the pan.
     */
    moveOnMouseWheelAxis?: WheelAxisType

    /**
     * Restricts the zoom (triggered by `zoomOnMouseWheel`) to a single
     * wheel axis. Has no effect on pan — see `moveOnMouseWheelAxis`.
     *
     * - Omitted (default): any wheel direction triggers zoom, matching the
     *   pre-existing behavior where zrender's collapsed `wheelDelta` drives
     *   the scale factor.
     * - `'horizontal'`: only `deltaX` drives the zoom.
     * - `'vertical'`: only `deltaY` drives the zoom.
     */
    zoomOnMouseWheelAxis?: WheelAxisType

    /**
     * Inside dataZoom don't support textStyle
     */
    textStyle?: never
}


class InsideZoomModel extends DataZoomModel<InsideDataZoomOption> {
    static readonly type = 'dataZoom.inside';
    type = InsideZoomModel.type;

    static defaultOption: InsideDataZoomOption = inheritDefaultOption(DataZoomModel.defaultOption, {
        disabled: false,
        zoomLock: false,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
        preventDefaultMouseMove: true
    });
}

export default InsideZoomModel;