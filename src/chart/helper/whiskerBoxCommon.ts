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

import createSeriesDataSimply from './createSeriesDataSimply';
import * as zrUtil from 'zrender/src/core/util';
import {getDimensionTypeByAxis} from '../../data/helper/dimensionHelper';
import {makeSeriesEncodeForAxisCoordSys} from '../../data/helper/sourceHelper';
import type { SeriesOption, SeriesOnCartesianOptionMixin, LayoutOrient } from '../../util/types';
import type GlobalModel from '../../model/Global';
import type SeriesModel from '../../model/Series';
import type CartesianAxisModel from '../../coord/cartesian/AxisModel';
import type SeriesData from '../../data/SeriesData';
import type Axis2D from '../../coord/cartesian/Axis2D';
import { CoordDimensionDefinition } from '../../data/helper/createDimensions';

interface CommonOption extends SeriesOption, SeriesOnCartesianOptionMixin {
    // - 'horizontal': Multiple whisker boxes (each drawn vertically)
    //      are arranged side by side horizontally.
    // - 'vertical': The opposite.
    layout?: LayoutOrient

    // data?: (DataItemOption | number[])[]
}

type WhiskerBoxCommonData = (DataItemOption | number[])[];

interface DataItemOption {
    value?: number[]
}

interface WhiskerBoxCommonMixin<Opts extends CommonOption> extends SeriesModel<Opts>{}
class WhiskerBoxCommonMixin<Opts extends CommonOption> {

    private _baseAxisDim: string;

    defaultValueDimensions: CoordDimensionDefinition['dimsDef'];

    /**
     * Computed layout.
     */
    private _layout: CommonOption['layout'];

    /**
     * @private
     */
    _hasEncodeRule(key: string) {
        const encodeRules = this.getEncode();
        return encodeRules && encodeRules.get(key) != null;
    }

    /**
     * @override
     */
    getInitialData(option: Opts, ecModel: GlobalModel): SeriesData {
        // When both types of xAxis and yAxis are 'value', layout is
        // needed to be specified by user. Otherwise, layout can be
        // judged by which axis is category.

        let ordinalMeta;

        const xAxisModel = ecModel.getComponent('xAxis', this.get('xAxisIndex')) as CartesianAxisModel;
        const yAxisModel = ecModel.getComponent('yAxis', this.get('yAxisIndex')) as CartesianAxisModel;
        const xAxisType = xAxisModel.get('type');
        const yAxisType = yAxisModel.get('type');
        let addOrdinal;

        // Theoretically, if `encode` and/or `layout` are not specified, they can be derived from
        // the specified one (also according to axis types). However, only the logic for deriving
        // `encode` from `layout` is implemented; the reverse direction is not implemented yet,
        // due to its complexity and low priority.
        let layout = option.layout;
        // 'category' axis has historically been enforcing `layout` regardless of its presence.
        // This behavior is preserved until it causes problems.
        if (xAxisType === 'category') {
            layout = 'horizontal';
            ordinalMeta = xAxisModel.getOrdinalMeta();
            addOrdinal = !this._hasEncodeRule('x');
        }
        else if (yAxisType === 'category') {
            layout = 'vertical';
            ordinalMeta = yAxisModel.getOrdinalMeta();
            addOrdinal = !this._hasEncodeRule('y');
        }
        if (!layout) {
            layout = yAxisType === 'time' ? 'vertical' : 'horizontal';
            // It is theoretically possible for an axis with type "time" to serve as the "value axis".
            // `layout` can be explicitly specified for that case.
        }
        // Do not assign the computed `layout` to `option.layout`, otherwise the idempotent may be broken.
        this._layout = layout;

        const coordDims = ['x', 'y'];
        const baseAxisDimIndex = layout === 'horizontal' ? 0 : 1;
        const baseAxisDim = this._baseAxisDim = coordDims[baseAxisDimIndex];
        const otherAxisDim = coordDims[1 - baseAxisDimIndex];
        const axisModels = [xAxisModel, yAxisModel];
        const baseAxisType = axisModels[baseAxisDimIndex].get('type');
        const otherAxisType = axisModels[1 - baseAxisDimIndex].get('type');
        const data = option.data as WhiskerBoxCommonData;

        // Clone a new data for next setOption({}) usage.
        // Avoid modifying current data will affect further update.
        if (data && addOrdinal) {
            const newOptionData: WhiskerBoxCommonData = [];
            zrUtil.each(data, function (item, index) {
                let newItem;
                if (zrUtil.isArray(item)) {
                    newItem = item.slice();
                    // Modify current using data.
                    item.unshift(index);
                }
                else if (zrUtil.isArray(item.value)) {
                    newItem = zrUtil.extend({}, item);
                    newItem.value = newItem.value.slice();
                    // Modify current using data.
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

        return createSeriesDataSimply(
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

    getWhiskerBoxesLayout() {
        return this._layout;
    }

};


export { WhiskerBoxCommonMixin };
