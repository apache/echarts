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