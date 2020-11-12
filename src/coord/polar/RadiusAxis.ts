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
import Polar from './Polar';
import { RadiusAxisModel } from './AxisModel';

interface RadiusAxis {
    dataToRadius: Axis['dataToCoord']
    radiusToData: Axis['coordToData']
}

class RadiusAxis extends Axis {

    polar: Polar;

    model: RadiusAxisModel;

    constructor(scale?: Scale, radiusExtent?: [number, number]) {
        super('radius', scale, radiusExtent);
    }

    pointToData(point: number[], clamp?: boolean) {
        return this.polar.pointToData(point, clamp)[this.dim === 'radius' ? 0 : 1];
    }
}

RadiusAxis.prototype.dataToRadius = Axis.prototype.dataToCoord;

RadiusAxis.prototype.radiusToData = Axis.prototype.coordToData;

export default RadiusAxis;