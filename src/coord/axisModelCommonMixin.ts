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

import Model from '../model/Model';
import Axis from './Axis';
import { AxisBaseOption } from './axisCommonTypes';
import { CoordinateSystemHostModel } from './CoordinateSystem';


interface AxisModelCommonMixin<Opt extends AxisBaseOption> extends Pick<Model<Opt>, 'option'> {
    axis: Axis;
}

class AxisModelCommonMixin<Opt extends AxisBaseOption> {

    getNeedCrossZero(): boolean {
        const option = this.option;
        return !option.scale;
    }

    /**
     * Should be implemented by each axis model if necessary.
     * @return coordinate system model
     */
    getCoordSysModel(): CoordinateSystemHostModel {
        return;
    }

}

export {AxisModelCommonMixin};
