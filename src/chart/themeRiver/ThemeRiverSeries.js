/**
 * @file  Define the themeRiver view's series model
 * @author Deqing Li(annong035@gmail.com)
 */
define(function (require) {

    'use strict';

    var completeDimensions = require('../../data/helper/completeDimensions');
    var SeriesModel = require('../../model/Series');
    var List = require('../../data/List');
    var zrUtil = require('zrender/core/util');
    var formatUtil = require('../../util/format');
    var encodeHTML = formatUtil.encodeHTML;
    var nest = require('../../util/array/nest');

    var DATA_NAME_INDEX = 2;

    var ThemeRiverSeries = SeriesModel.extend({

        type: 'series.themeRiver',

        dependencies: ['singleAxis'],

        /**
         * @readOnly
         * @type {Object}
         */
        nameMap: null,

        /**
         * @override
         */
        init: function (option) {
            ThemeRiverSeries.superApply(this, 'init', arguments);

            // Put this function here is for the sake of consistency of code
            // Enable legend selection for each data item
            // Use a function instead of direct access because data reference may changed
            this.legendDataProvider = function () {
                return this._dataBeforeProcessed;
            };
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
            var dataByName = nest()
                .key(function (dataItem) {
                    return dataItem[2];
                })
                .entries(data);

            // data group in each layer
            var layData = zrUtil.map(dataByName, function (d) {
                return {
                    name: d.key,
                    dataList: d.values
                };
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

            var dimensions = [];

            var singleAxisModel = ecModel.getComponent(
                'singleAxis', this.option.singleAxisIndex
            );
            var axisType = singleAxisModel.get('type');

            dimensions = [
                {
                    name: 'time',
                    // FIXME common?
                    type: axisType === 'category'
                        ? 'ordinal'
                        : axisType === 'time'
                        ? 'time'
                        : 'float'
                },
                {
                    name: 'value',
                    type: 'float'
                },
                {
                    name: 'name',
                    type: 'ordinal'
                }
            ];

            var data = this.fixData(option.data || []);
            var nameList = [];
            var nameMap = this.nameMap = {};
            var count = 0;

            for (var i = 0; i < data.length; ++i) {
                nameList.push(data[i][DATA_NAME_INDEX]);
                if (!nameMap[data[i][DATA_NAME_INDEX]]) {
                    nameMap[data[i][DATA_NAME_INDEX]] = count++;
                }
            }

            completeDimensions(dimensions, data);

            var list = new List(dimensions, this);

            list.initData(data, nameList);

            return list;
        },

        /**
         * Used by single coordinate
         *
         * @param {string} axisDim  the dimension for singel coordinate
         * @return {Array.<string> } specified dimensions on the axis.
         */
        coordDimToDataDim: function (axisDim) {
            return ['time'];
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
            // data group by name
            var dataByName = nest()
                .key(function (index) {
                    return data.get('name', index);
                })
                .entries(indexArr);

            var layerSeries = zrUtil.map(dataByName, function (d) {
                return {
                    name: d.key,
                    indices: d.values
                };
            });

            for (var j = 0; j < layerSeries.length; ++j) {
                layerSeries[j].indices.sort(comparer);
            }

            function comparer(index1, index2) {
                return data.get('time', index1) - data.get('time', index2);
            }

            return layerSeries;
        },

        /**
         * Get data indices for show tooltip content
         *
         * @param {Array.<string>|string} dim  singel coordinate dimension
         * @param {Array.<number>} value  coordinate value
         * @param {module:echarts/coord/single/SingleAxis} baseAxis  single Axis used
         *     the themeRiver.
         * @return {Array.<number>}
         */
        getAxisTooltipDataIndex: function (dim, value, baseAxis) {
            if (!zrUtil.isArray(dim)) {
                dim = dim ? [dim] : [];
            }

            var data = this.getData();

            if (baseAxis.orient === 'horizontal') {
                value = value[0];
            }
            else {
                value = value[1];
            }

            var layerSeries = this.getLayerSeries();
            var indices = [];
            var layerNum = layerSeries.length;

            for (var i = 0; i < layerNum; ++i) {
                var minDist = Number.MAX_VALUE;
                var nearestIdx = -1;
                var pointNum = layerSeries[i].indices.length;
                for (var j = 0; j < pointNum; ++j) {
                    var dist = Math.abs(data.get(dim[0], layerSeries[i].indices[j]) - value);
                    if (dist <= minDist) {
                        minDist = dist;
                        nearestIdx = layerSeries[i].indices[j];
                    }
                }
                indices.push(nearestIdx);
            }
            return indices;
        },

        /**
         * @override
         * @param {Array.<number>} dataIndexs  index of data
         */
        formatTooltip: function (dataIndexs) {
            var data = this.getData();
            var len = dataIndexs.length;
            var time = data.get('time', dataIndexs[0]);
            var single = this.coordinateSystem;
            var axis = single.getAxis();

            if (axis.scale.type === 'time') {
                time = formatUtil.formatTime('yyyy-MM-dd', time);
            }

            var html = time + '<br />';
            for (var i = 0; i < len; ++i) {
                var htmlName = data.get('name', dataIndexs[i]);
                var htmlValue = data.get('value', dataIndexs[i]);
                if (isNaN(htmlValue) || htmlValue == null) {
                    htmlValue = '-';
                }
                html += encodeHTML(htmlName) + ' : ' + htmlValue + '<br />';
            }
            return html;
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
                normal: {
                    margin: 4,
                    textAlign: 'right',
                    show: true,
                    position: 'left',
                    textStyle: {
                        color: '#000',
                        fontSize: 11
                    }
                },
                emphasis: {
                    show: true
                }
            }
        }
    });

    return ThemeRiverSeries;
});
