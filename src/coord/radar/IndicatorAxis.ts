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

import Axis from '../Axis';
import Scale from '../../scale/Scale';
import { OptionAxisType } from '../axisCommonTypes';
import { AxisBaseModel } from '../AxisBaseModel';
import { InnerIndicatorAxisOption } from './RadarModel';

class IndicatorAxis extends Axis {

    type: OptionAxisType = 'value';

    angle = 0;

    name = '';

    model: AxisBaseModel<InnerIndicatorAxisOption>;

    constructor(dim: string, scale: Scale, radiusExtent?: [number, number]) {
        super(dim, scale, radiusExtent);
    }
}

export default IndicatorAxis;