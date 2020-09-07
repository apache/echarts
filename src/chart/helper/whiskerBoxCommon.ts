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

import createListSimply from '../helper/createListSimply';
import * as zrUtil from 'zrender/src/core/util';
import {getDimensionTypeByAxis} from '../../data/helper/dimensionHelper';
import {makeSeriesEncodeForAxisCoordSys} from '../../data/helper/sourceHelper';
import type { SeriesOption, SeriesOnCartesianOptionMixin, LayoutOrient } from '../../util/types';
import type GlobalModel from '../../model/Global';
import type SeriesModel from '../../model/Series';
import type CartesianAxisModel from '../../coord/cartesian/AxisModel';
import type List from '../../data/List';
import type Axis2D from '../../coord/cartesian/Axis2D';
import { CoordDimensionDefinition } from '../../data/helper/createDimensions';

interface CommonOption extends SeriesOption, SeriesOnCartesianOptionMixin {
    layout?: LayoutOrient

    // data?: (DataItemOption | number[])[]
}

type WhiskerBoxCommonData = (DataItemOption | number[])[];

interface DataItemOption {
    value?: number[]
}

interface WhiskerBoxCommonMixin<Opts extends CommonOption> extends SeriesModel<Opts>{}
class WhiskerBoxCommonMixin<Opts extends CommonOption> {

    /**
     * @private
     * @type {string}
     */
    _baseAxisDim: string;

    defaultValueDimensions: CoordDimensionDefinition['dimsDef'];

    /**
     * @override
     */
    getInitialData(option: Opts, ecModel: GlobalModel): List {
        // When both types of xAxis and yAxis are 'value', layout is
        // needed to be specified by user. Otherwise, layout can be
        // judged by which axis is category.

        let ordinalMeta;

        const xAxisModel = ecModel.getComponent('xAxis', this.get('xAxisIndex')) as CartesianAxisModel;
        const yAxisModel = ecModel.getComponent('yAxis', this.get('yAxisIndex')) as CartesianAxisModel;
        const xAxisType = xAxisModel.get('type');
        const yAxisType = yAxisModel.get('type');
        let addOrdinal;

        // FIXME
        // Consider time axis.

        if (xAxisType === 'category') {
            option.layout = 'horizontal';
            ordinalMeta = xAxisModel.getOrdinalMeta();
            addOrdinal = true;
        }
        else if (yAxisType === 'category') {
            option.layout = 'vertical';
            ordinalMeta = yAxisModel.getOrdinalMeta();
            addOrdinal = true;
        }
        else {
            option.layout = option.layout || 'horizontal';
        }

        const coordDims = ['x', 'y'];
        const baseAxisDimIndex = option.layout === 'horizontal' ? 0 : 1;
        const baseAxisDim = this._baseAxisDim = coordDims[baseAxisDimIndex];
        const otherAxisDim = coordDims[1 - baseAxisDimIndex];
        const axisModels = [xAxisModel, yAxisModel];
        const baseAxisType = axisModels[baseAxisDimIndex].get('type');
        const otherAxisType = axisModels[1 - baseAxisDimIndex].get('type');
        const data = option.data as WhiskerBoxCommonData;

        // ??? FIXME make a stage to perform data transfrom.
        // MUST create a new data, consider setOption({}) again.
        if (data && addOrdinal) {
            const newOptionData: WhiskerBoxCommonData = [];
            zrUtil.each(data, function (item, index) {
                let newItem;
                if (zrUtil.isArray(item)) {
                    newItem = item.slice();
                    item.unshift(index);
                }
                else if (zrUtil.isArray(item.value)) {
                    newItem = item.value.slice();
                    item.value.unshift(index);
                }
                else {
                    newItem = item;
                }
                newOptionData.push(newItem);
            });
            option.data = newOptionData;
        }

        const defaultValueDimensions = this.defaultValueDimensions;
        const coordDimensions: CoordDimensionDefinition[] = [{
            name: baseAxisDim,
            type: getDimensionTypeByAxis(baseAxisType),
            ordinalMeta: ordinalMeta,
            otherDims: {
                tooltip: false,
                itemName: 0
            },
            dimsDef: ['base']
        }, {
            name: otherAxisDim,
            type: getDimensionTypeByAxis(otherAxisType),
            dimsDef: defaultValueDimensions.slice()
        }];

        return createListSimply(
            this,
            {
                coordDimensions: coordDimensions,
                dimensionsCount: defaultValueDimensions.length + 1,
                encodeDefaulter: zrUtil.curry(
                    makeSeriesEncodeForAxisCoordSys, coordDimensions, this as any
                )
            }
        );
    }

    /**
     * If horizontal, base axis is x, otherwise y.
     * @override
     */
    getBaseAxis(): Axis2D {
        const dim = this._baseAxisDim;
        return (this.ecModel.getComponent(
            dim + 'Axis', this.get(dim + 'AxisIndex' as 'xAxisIndex' | 'yAxisIndex')
        ) as CartesianAxisModel).axis;
    }

};


export {WhiskerBoxCommonMixin};