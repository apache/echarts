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

import * as zrUtil from 'zrender/src/core/util';
import Model from '../model/Model';
import Axis from './Axis';
import ComponentModel from '../model/Component';
import { AxisBaseOption } from './axisCommonTypes';


interface AxisModelCommonMixin<Opt extends AxisBaseOption> extends Pick<Model<Opt>, 'option'> {
    axis: Axis;
}

class AxisModelCommonMixin<Opt extends AxisBaseOption> {

    /**
     * @return min value or 'dataMin' or null/undefined (means auto) or NaN
     */
    getMin(origin: boolean): number | 'dataMin' {
        var option = this.option;
        var min = (!origin && option.rangeStart != null)
            ? option.rangeStart : option.min;

        if (this.axis
            && min != null
            && min !== 'dataMin'
            && typeof min !== 'function'
            && !zrUtil.eqNaN(min)
        ) {
            min = this.axis.scale.parse(min);
        }
        return min as any;
    }

    /**
     * @return max value or 'dataMax' or null/undefined (means auto) or NaN
     */
    getMax(origin: boolean): number | 'dataMax' {
        var option = this.option;
        var max = (!origin && option.rangeEnd != null)
            ? option.rangeEnd : option.max;

        if (this.axis
            && max != null
            && max !== 'dataMax'
            && typeof max !== 'function'
            && !zrUtil.eqNaN(max)
        ) {
            max = this.axis.scale.parse(max);
        }
        return max as any;
    }

    getNeedCrossZero(): boolean {
        var option = this.option;
        return (option.rangeStart != null || option.rangeEnd != null)
            ? false : !option.scale;
    }

    /**
     * Should be implemented by each axis model if necessary.
     * @return {module:echarts/model/Component} coordinate system model
     */
    getCoordSysModel(): ComponentModel {
        return;
    }

    /**
     * @param rangeStart Can only be finite number or null/undefined or NaN.
     * @param rangeEnd Can only be finite number or null/undefined or NaN.
     */
    setRange(rangeStart: number, rangeEnd: number): void {
        this.option.rangeStart = rangeStart;
        this.option.rangeEnd = rangeEnd;
    }

    /**
     * Reset range
     */
    resetRange(): void {
        // rangeStart and rangeEnd is readonly.
        this.option.rangeStart = this.option.rangeEnd = null;
    }
}

export {AxisModelCommonMixin};
