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
import { DimensionName } from '../../util/types';
import Axis from '../Axis';


class Cartesian<AxisT extends Axis> {

    readonly type: string = 'cartesian';

    readonly name: string;

    private _dimList: DimensionName[] = [];

    private _axes: {[dimName: string]: AxisT} = {};


    constructor(name: string) {
        this.name = name || '';
    }

    getAxis(dim: DimensionName): AxisT {
        return this._axes[dim];
    }

    getAxes(): AxisT[] {
        return zrUtil.map(this._dimList, function (dim: DimensionName) {
            return this._axes[dim];
        }, this);
    }

    getAxesByScale(scaleType: string): AxisT[] {
        scaleType = scaleType.toLowerCase();
        return zrUtil.filter(
            this.getAxes(),
            function (axis) {
                return axis.scale.type === scaleType;
            }
        );
    }

    addAxis(axis: AxisT): void {
        const dim = axis.dim;

        this._axes[dim] = axis;

        this._dimList.push(dim);
    }


    // FIXME:TS Never used. So comment `dataToCoord` and `coordToData`.
    // /**
    //  * Convert data to coord in nd space
    //  * @param {Array.<number>|Object.<string, number>} val
    //  * @return {Array.<number>|Object.<string, number>}
    //  */
    // dataToCoord(val) {
    //     return this._dataCoordConvert(val, 'dataToCoord');
    // }

    // /**
    //  * Convert coord in nd space to data
    //  * @param  {Array.<number>|Object.<string, number>} val
    //  * @return {Array.<number>|Object.<string, number>}
    //  */
    // coordToData(val) {
    //     return this._dataCoordConvert(val, 'coordToData');
    // }

    // _dataCoordConvert(input, method) {
    //     let dimList = this._dimList;

    //     let output = input instanceof Array ? [] : {};

    //     for (let i = 0; i < dimList.length; i++) {
    //         let dim = dimList[i];
    //         let axis = this._axes[dim];

    //         output[dim] = axis[method](input[dim]);
    //     }

    //     return output;
    // }
};

export default Cartesian;
