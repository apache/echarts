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

export var seriesModelMixin = {

    /**
     * @private
     * @type {string}
     */
    _baseAxisDim: null,

    /**
     * @override
     */
    getInitialData: function (option, ecModel) {
        // When both types of xAxis and yAxis are 'value', layout is
        // needed to be specified by user. Otherwise, layout can be
        // judged by which axis is category.

        var ordinalMeta;

        var xAxisModel = ecModel.getComponent('xAxis', this.get('xAxisIndex'));
        var yAxisModel = ecModel.getComponent('yAxis', this.get('yAxisIndex'));
        var xAxisType = xAxisModel.get('type');
        var yAxisType = yAxisModel.get('type');
        var addOrdinal;

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

        var coordDims = ['x', 'y'];
        var baseAxisDimIndex = option.layout === 'horizontal' ? 0 : 1;
        var baseAxisDim = this._baseAxisDim = coordDims[baseAxisDimIndex];
        var otherAxisDim = coordDims[1 - baseAxisDimIndex];
        var axisModels = [xAxisModel, yAxisModel];
        var baseAxisType = axisModels[baseAxisDimIndex].get('type');
        var otherAxisType = axisModels[1 - baseAxisDimIndex].get('type');
        var data = option.data;

        // ??? FIXME make a stage to perform data transfrom.
        // MUST create a new data, consider setOption({}) again.
        if (data && addOrdinal) {
            var newOptionData = [];
            zrUtil.each(data, function (item, index) {
                var newItem;
                if (item.value && zrUtil.isArray(item.value)) {
                    newItem = item.value.slice();
                    item.value.unshift(index);
                }
                else if (zrUtil.isArray(item)) {
                    newItem = item.slice();
                    item.unshift(index);
                }
                else {
                    newItem = item;
                }
                newOptionData.push(newItem);
            });
            option.data = newOptionData;
        }

        var defaultValueDimensions = this.defaultValueDimensions;
        var coordDimensions = [{
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
                    makeSeriesEncodeForAxisCoordSys, coordDimensions, this
                )
            }
        );
    },

    /**
     * If horizontal, base axis is x, otherwise y.
     * @override
     */
    getBaseAxis: function () {
        var dim = this._baseAxisDim;
        return this.ecModel.getComponent(dim + 'Axis', this.get(dim + 'AxisIndex')).axis;
    }

};
