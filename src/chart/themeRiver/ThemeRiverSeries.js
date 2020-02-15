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

import SeriesModel from '../../model/Series';
import createDimensions from '../../data/helper/createDimensions';
import {getDimensionTypeByAxis} from '../../data/helper/dimensionHelper';
import List from '../../data/List';
import * as zrUtil from 'zrender/src/core/util';
import {groupData} from '../../util/model';
import {encodeHTML} from '../../util/format';
import LegendVisualProvider from '../../visual/LegendVisualProvider';

var DATA_NAME_INDEX = 2;

var ThemeRiverSeries = SeriesModel.extend({

    type: 'series.themeRiver',

    dependencies: ['singleAxis'],

    /**
     * @readOnly
     * @type {module:zrender/core/util#HashMap}
     */
    nameMap: null,

    /**
     * @override
     */
    init: function (option) {
        // eslint-disable-next-line
        ThemeRiverSeries.superApply(this, 'init', arguments);

        // Put this function here is for the sake of consistency of code style.
        // Enable legend selection for each data item
        // Use a function instead of direct access because data reference may changed
        this.legendVisualProvider = new LegendVisualProvider(
            zrUtil.bind(this.getData, this), zrUtil.bind(this.getRawData, this)
        );
    },

    /**
     * If there is no value of a certain point in the time for some event,set it value to 0.
     *
     * @param {Array} data  initial data in the option
     * @return {Array}
     */
    fixData: function (data) {
        var rawDataLength = data.length;

        // grouped data by name
        var groupResult = groupData(data, function (item) {
            return item[2];
        });
        var layData = [];
        groupResult.buckets.each(function (items, key) {
            layData.push({name: key, dataList: items});
        });

        var layerNum = layData.length;
        var largestLayer = -1;
        var index = -1;
        for (var i = 0; i < layerNum; ++i) {
            var len = layData[i].dataList.length;
            if (len > largestLayer) {
                largestLayer = len;
                index = i;
            }
        }

        for (var k = 0; k < layerNum; ++k) {
            if (k === index) {
                continue;
            }
            var name = layData[k].name;
            for (var j = 0; j < largestLayer; ++j) {
                var timeValue = layData[index].dataList[j][0];
                var length = layData[k].dataList.length;
                var keyIndex = -1;
                for (var l = 0; l < length; ++l) {
                    var value = layData[k].dataList[l][0];
                    if (value === timeValue) {
                        keyIndex = l;
                        break;
                    }
                }
                if (keyIndex === -1) {
                    data[rawDataLength] = [];
                    data[rawDataLength][0] = timeValue;
                    data[rawDataLength][1] = 0;
                    data[rawDataLength][2] = name;
                    rawDataLength++;

                }
            }
        }
        return data;
    },

    /**
     * @override
     * @param  {Object} option  the initial option that user gived
     * @param  {module:echarts/model/Model} ecModel  the model object for themeRiver option
     * @return {module:echarts/data/List}
     */
    getInitialData: function (option, ecModel) {

        var singleAxisModel = ecModel.queryComponents({
            mainType: 'singleAxis',
            index: this.get('singleAxisIndex'),
            id: this.get('singleAxisId')
        })[0];

        var axisType = singleAxisModel.get('type');

        // filter the data item with the value of label is undefined
        var filterData = zrUtil.filter(option.data, function (dataItem) {
            return dataItem[2] !== undefined;
        });

        // ??? TODO design a stage to transfer data for themeRiver and lines?
        var data = this.fixData(filterData || []);
        var nameList = [];
        var nameMap = this.nameMap = zrUtil.createHashMap();
        var count = 0;

        for (var i = 0; i < data.length; ++i) {
            nameList.push(data[i][DATA_NAME_INDEX]);
            if (!nameMap.get(data[i][DATA_NAME_INDEX])) {
                nameMap.set(data[i][DATA_NAME_INDEX], count);
                count++;
            }
        }

        var dimensionsInfo = createDimensions(data, {
            coordDimensions: ['single'],
            dimensionsDefine: [
                {
                    name: 'time',
                    type: getDimensionTypeByAxis(axisType)
                },
                {
                    name: 'value',
                    type: 'float'
                },
                {
                    name: 'name',
                    type: 'ordinal'
                }
            ],
            encodeDefine: {
                single: 0,
                value: 1,
                itemName: 2
            }
        });

        var list = new List(dimensionsInfo, this);
        list.initData(data);

        return list;
    },

    /**
     * The raw data is divided into multiple layers and each layer
     *     has same name.
     *
     * @return {Array.<Array.<number>>}
     */
    getLayerSeries: function () {
        var data = this.getData();
        var lenCount = data.count();
        var indexArr = [];

        for (var i = 0; i < lenCount; ++i) {
            indexArr[i] = i;
        }

        var timeDim = data.mapDimension('single');

        // data group by name
        var groupResult = groupData(indexArr, function (index) {
            return data.get('name', index);
        });
        var layerSeries = [];
        groupResult.buckets.each(function (items, key) {
            items.sort(function (index1, index2) {
                return data.get(timeDim, index1) - data.get(timeDim, index2);
            });
            layerSeries.push({name: key, indices: items});
        });

        return layerSeries;
    },

    /**
     * Get data indices for show tooltip content

     * @param {Array.<string>|string} dim  single coordinate dimension
     * @param {number} value axis value
     * @param {module:echarts/coord/single/SingleAxis} baseAxis  single Axis used
     *     the themeRiver.
     * @return {Object} {dataIndices, nestestValue}
     */
    getAxisTooltipData: function (dim, value, baseAxis) {
        if (!zrUtil.isArray(dim)) {
            dim = dim ? [dim] : [];
        }

        var data = this.getData();
        var layerSeries = this.getLayerSeries();
        var indices = [];
        var layerNum = layerSeries.length;
        var nestestValue;

        for (var i = 0; i < layerNum; ++i) {
            var minDist = Number.MAX_VALUE;
            var nearestIdx = -1;
            var pointNum = layerSeries[i].indices.length;
            for (var j = 0; j < pointNum; ++j) {
                var theValue = data.get(dim[0], layerSeries[i].indices[j]);
                var dist = Math.abs(theValue - value);
                if (dist <= minDist) {
                    nestestValue = theValue;
                    minDist = dist;
                    nearestIdx = layerSeries[i].indices[j];
                }
            }
            indices.push(nearestIdx);
        }

        return {dataIndices: indices, nestestValue: nestestValue};
    },

    /**
     * @override
     * @param {number} dataIndex  index of data
     */
    formatTooltip: function (dataIndex) {
        var data = this.getData();
        var htmlName = data.getName(dataIndex);
        var htmlValue = data.get(data.mapDimension('value'), dataIndex);
        if (isNaN(htmlValue) || htmlValue == null) {
            htmlValue = '-';
        }
        return encodeHTML(htmlName + ' : ' + htmlValue);
    },

    defaultOption: {
        zlevel: 0,
        z: 2,

        coordinateSystem: 'singleAxis',

        // gap in axis's orthogonal orientation
        boundaryGap: ['10%', '10%'],

        // legendHoverLink: true,

        singleAxisIndex: 0,

        animationEasing: 'linear',

        label: {
            margin: 4,
            show: true,
            position: 'left',
            color: '#000',
            fontSize: 11
        },

        emphasis: {
            label: {
                show: true
            }
        }
    }
});

export default ThemeRiverSeries;