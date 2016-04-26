define(function (require) {

    var List = require('../../data/List');
    var echarts = require('../../echarts');
    var SeriesModel = require('../../model/Series');
    var zrUtil = require('zrender/core/util');
    var completeDimensions = require('../../data/helper/completeDimensions');

    var formatUtil = require('../../util/format');
    var encodeHTML = formatUtil.encodeHTML;
    var addCommas = formatUtil.addCommas;

    var dataSelectableMixin = require('../helper/dataSelectableMixin');

    function fillData(dataOpt, geoJson) {
        var dataNameMap = {};
        var features = geoJson.features;
        for (var i = 0; i < dataOpt.length; i++) {
            dataNameMap[dataOpt[i].name] = dataOpt[i];
        }

        for (var i = 0; i < features.length; i++) {
            var name = features[i].properties.name;
            if (!dataNameMap[name]) {
                dataOpt.push({
                    value: NaN,
                    name: name
                });
            }
        }
        return dataOpt;
    }

    var MapSeries = SeriesModel.extend({

        type: 'series.map',

        /**
         * Only first map series of same mapType will drawMap
         * @type {boolean}
         */
        needsDrawMap: false,

        /**
         * Group of all map series with same mapType
         * @type {boolean}
         */
        seriesGroup: [],

        init: function (option) {

            option = this._fillOption(option, option.map);
            this.option = option;

            MapSeries.superApply(this, 'init', arguments);

            this.updateSelectedMap();
        },

        getInitialData: function (option) {
            var dimensions = completeDimensions(['value'], option.data || []);

            var list = new List(dimensions, this);

            list.initData(option.data);

            return list;
        },

        mergeOption: function (newOption) {
            if (newOption.data) {
                newOption = this._fillOption(newOption, this.option.map);
            }

            MapSeries.superCall(this, 'mergeOption', newOption);

            this.updateSelectedMap();
        },

        _fillOption: function (option, mapName) {
            // Shallow clone
            option = zrUtil.extend({}, option);

            var map = echarts.getMap(mapName);
            var geoJson = map && map.geoJson;
            geoJson && (option.data = fillData((option.data || []), geoJson));

            return option;
        },

        getRawValue: function (dataIndex) {
            // Use value stored in data instead because it is calculated from multiple series
            // FIXME Provide all value of multiple series ?
            return this._data.get('value', dataIndex);
        },

        /**
         * Map tooltip formatter
         *
         * @param {number} dataIndex
         */
        formatTooltip: function (dataIndex) {
            var data = this._data;
            var formattedValue = addCommas(this.getRawValue(dataIndex));
            var name = data.getName(dataIndex);

            var seriesGroup = this.seriesGroup;
            var seriesNames = [];
            for (var i = 0; i < seriesGroup.length; i++) {
                if (!isNaN(seriesGroup[i].getRawValue(dataIndex))) {
                    seriesNames.push(
                        encodeHTML(seriesGroup[i].name)
                    );
                }
            }

            return seriesNames.join(', ') + '<br />'
                + name + ' : ' + formattedValue;
        },

        defaultOption: {
            // 一级层叠
            zlevel: 0,
            // 二级层叠
            z: 2,
            coordinateSystem: 'geo',
            // 各省的 map 暂时都用中文
            map: 'china',

            // 'center' | 'left' | 'right' | 'x%' | {number}
            left: 'center',
            // 'center' | 'top' | 'bottom' | 'x%' | {number}
            top: 'center',
            // right
            // bottom
            // width:
            // height   // 自适应

            // 数值合并方式，默认加和，可选为：
            // 'sum' | 'average' | 'max' | 'min'
            // mapValueCalculation: 'sum',
            // 地图数值计算结果小数精度
            // mapValuePrecision: 0,
            // 显示图例颜色标识（系列标识的小圆点），图例开启时有效
            showLegendSymbol: true,
            // 选择模式，默认关闭，可选single，multiple
            // selectedMode: false,
            dataRangeHoverLink: true,
            // 是否开启缩放及漫游模式
            // roam: false,

            // Default on center of map
            center: null,

            zoom: 1,

            scaleLimit: null,

            label: {
                normal: {
                    show: false,
                    textStyle: {
                        color: '#000'
                    }
                },
                emphasis: {
                    show: true,
                    textStyle: {
                        color: 'rgb(100,0,0)'
                    }
                }
            },
            // scaleLimit: null,
            itemStyle: {
                normal: {
                    // color: 各异,
                    borderWidth: 0.5,
                    borderColor: '#444',
                    areaColor: '#eee'
                },
                // 也是选中样式
                emphasis: {
                    areaColor: 'rgba(255,215, 0, 0.8)'
                }
            }
        },

        setZoom: function (zoom) {
            this.option.zoom = zoom;
        },

        setCenter: function (center) {
            this.option.center = center;
        }
    });

    zrUtil.mixin(MapSeries, dataSelectableMixin);

    return MapSeries;
});