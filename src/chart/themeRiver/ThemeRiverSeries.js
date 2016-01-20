define(function (require) {

    'use strict';

    var completeDimensions = require('../../data/helper/completeDimensions');
    var SeriesModel = require('../../model/Series');
    var List = require('../../data/List');
    var numberUtil = require('../../util/number');
    var zrUtil = require('zrender/core/util');
    var dataSelectableMixin = require('../helper/dataSelectableMixin');
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
            this.$superApply('init', arguments);

            // Enable legend selection for each data item
            // Use a function instead of direct access because data reference may changed
            this.legendDataProvider = function () {
                return this._dataBeforeProcessed;
            };
        },

        /**
         * @override
         */
        mergeOption: function (newOption) {
            this.$superCall('mergeOption', newOption);
        },

        /**
         * @override
         * @param  {Object} option  the initial option that user gived
         * @param  {module:echarts/model/Model} ecModel
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
                    // FIXME
                    // common?
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

            var data = option.data;
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
         * used by single coordinate.
         *
         * @param {string} axisDim
         * @return {Array.<string> } specified dimensions on the axis.
         */
        getDimensionsOnAxis: function (axisDim) {
            var dims = {
                oneDim: ['time']
            };

            return dims[axisDim];
        },

        /**
         * The raw data is divided into multiple layers and each layer
         * has same name.
         *
         * @return {Array.<Array.<number>}
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
            return layerSeries;
        },

        /**
         * Get data indexs for show tooltip content.
         *
         * @param {Array.<string>} dim
         * @param {Array.<number>} value
         * @param {module:echarts/coord/single/SingleAxis} baseAxis
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
            var indexs = [];
            var layerNum = layerSeries.length;

            for (var i = 0; i < layerNum; ++i) {
                var minDist = Number.MAX_VALUE;
                var nearestIdx = -1;
                var pointNum = layerSeries[i].length;
                for (var j = 0; j < pointNum; ++j) {
                    var dist = Math.abs(data.get(dim[0], layerSeries[i][j]) - value);
                    if (dist <= minDist) {
                        minDist = dist;
                        nearestIdx = layerSeries[i][j];
                    }
                }
                indexs.push(nearestIdx);
            }
            return indexs;
        },

        /**
         * @override
         * @param {Array.<number>} dataIndex
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

            coordinateSystem: 'single',

            boundaryGap: ['10%', '10%'],

            legendHoverLink: true,

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
            },

            areaStyle: {
                normal: {},
                emphasis: {
                    stroke: '#000'
                }
            },

            lineStyle: {
                normal: {},
                emphasis: {}
            }

        }
    });

    return ThemeRiverSeries;
});