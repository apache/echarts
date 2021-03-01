/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* regarding copyright ownership.  The ASF licenses this file
* distributed with this work for additional information
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

import { AxisBaseModel } from '../../coord/AxisBaseModel';
import ExtensionAPI from '../../core/ExtensionAPI';
import { CommonAxisPointerOption } from '../../util/types';
import Model from '../../model/Model';

export interface AxisPointer {
    /**
     * If `show` called, axisPointer must be displayed or remain its original status.
     */
    render(
        axisModel: AxisBaseModel,
        axisPointerModel: Model<CommonAxisPointerOption>,
        // coordSys: CoordinateSystem,
        api: ExtensionAPI,
        forceRender?: boolean
    ): void
    /**
     * If `hide` called, axisPointer must be hidden.
     */
    remove(api: ExtensionAPI): void
    dispose(api: ExtensionAPI): void
}