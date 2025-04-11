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
import SingleAxisModel, { SingleAxisPosition } from './AxisModel';
import { LayoutOrient } from '../../util/types';
import Single from './Single';

interface SingleAxis {
    /**
     * Transform global coord to local coord,
     * i.e. let localCoord = axis.toLocalCoord(80);
     */
    toLocalCoord(coord: number): number;

    /**
     * Transform global coord to local coord,
     * i.e. let globalCoord = axis.toLocalCoord(40);
     */
    toGlobalCoord(coord: number): number;
}
class SingleAxis extends Axis {

    position: SingleAxisPosition;

    orient: LayoutOrient;

    coordinateSystem: Single;

    model: SingleAxisModel;

    constructor(
        dim: string,
        scale: Scale,
        coordExtent: [number, number],
        axisType?: OptionAxisType,
        position?: SingleAxisPosition
    ) {
        super(dim, scale, coordExtent);

        this.type = axisType || 'value';
        this.position = position || 'bottom';
    }

    /**
     * Judge the orient of the axis.
     */
    isHorizontal() {
        const position = this.position;
        return position === 'top' || position === 'bottom';
    }

    pointToData(point: number[], clamp?: boolean) { // TODO: clamp is not used.
        return this.coordinateSystem.pointToData(point)[0];
    }
}
export default SingleAxis;