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

import Axis from '../../coord/Axis';
import Scale from '../../scale/Scale';
import TimelineModel from './TimelineModel';
import { LabelOption } from '../../util/types';
import Model from '../../model/Model';

/**
 * Extend axis 2d
 */
class TimelineAxis extends Axis {

    type: 'category' | 'time' | 'value';

    // @ts-ignore
    model: TimelineModel;

    constructor(
        dim: string,
        scale: Scale,
        coordExtent: [number, number],
        axisType: 'category' | 'time' | 'value'
    ) {
        super(dim, scale, coordExtent);
        this.type = axisType || 'value';
    }

    /**
     * @override
     */
    getLabelModel() {
        // Force override
        return this.model.getModel('label') as Model<LabelOption>;
    }

    /**
     * @override
     */
    isHorizontal() {
        return this.model.get('orient') === 'horizontal';
    }
}

export default TimelineAxis;