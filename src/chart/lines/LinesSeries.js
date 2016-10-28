define(function (require) {

    'use strict';

    var SeriesModel = require('../../model/Series');
    var List = require('../../data/List');
    var zrUtil = require('zrender/core/util');
    var CoordinateSystem = require('../../CoordinateSystem');

    // Convert [ [{coord: []}, {coord: []}] ]
    // to [ { coords: [[]] } ]
    function preprocessOption (seriesOpt) {
        var data = seriesOpt.data;
        if (data && data[0] && data[0][0] && data[0][0].coord) {
            if (__DEV__) {
                console.warn('Lines data configuration has been changed to'
                    + ' { coords:[[1,2],[2,3]] }');
            }
            seriesOpt.data = zrUtil.map(data, function (itemOpt) {
                var coords = [
                    itemOpt[0].coord, itemOpt[1].coord
                ];
                var target = {
                    coords: coords
                };
                if (itemOpt[0].name) {
                    target.fromName = itemOpt[0].name;
                }
                if (itemOpt[1].name) {
                    target.toName = itemOpt[1].name;
                }
                return zrUtil.mergeAll([target, itemOpt[0], itemOpt[1]]);
            });
        }
    }

    var LinesSeries = SeriesModel.extend({

        type: 'series.lines',

        dependencies: ['grid', 'polar'],

        visualColorAccessPath: 'lineStyle.normal.color',

        init: function (option) {
            // Not using preprocessor because mergeOption may not have series.type
            preprocessOption(option);

            LinesSeries.superApply(this, 'init', arguments);
        },

        mergeOption: function (option) {
            preprocessOption(option);

            LinesSeries.superApply(this, 'mergeOption', arguments);
        },

        getInitialData: function (option, ecModel) {
            if (__DEV__) {
                var CoordSys = CoordinateSystem.get(option.coordinateSystem);
                if (!CoordSys) {
                    throw new Error('Unkown coordinate system ' + option.coordinateSystem);
                }
            }

            var lineData = new List(['value'], this);
            lineData.hasItemOption = false;
            lineData.initData(option.data, [], function (dataItem, dimName, dataIndex, dimIndex) {
                // dataItem is simply coords
                if (dataItem instanceof Array) {
                    return NaN;
                }
                else {
                    lineData.hasItemOption = true;
                    var value = dataItem.value;
                    if (value != null) {
                        return value instanceof Array ? value[dimIndex] : value;
                    }
                }
            });

            return lineData;
        },

        formatTooltip: function (dataIndex) {
            var data = this.getData();
            var itemModel = data.getItemModel(dataIndex);
            var name = itemModel.get('name');
            if (name) {
                return name;
            }
            var fromName = itemModel.get('fromName');
            var toName = itemModel.get('toName');
            return fromName + ' > ' + toName;
        },

        defaultOption: {
            coordinateSystem: 'geo',
            zlevel: 0,
            z: 2,
            legendHoverLink: true,

            hoverAnimation: true,
            // Cartesian coordinate system
            xAxisIndex: 0,
            yAxisIndex: 0,

            // Geo coordinate system
            geoIndex: 0,

            effect: {
                show: false,
                period: 4,
                // Animation delay. support callback
                // delay: 0,
                // If move with constant speed px/sec
                // period will be ignored if this property is > 0,
                constantSpeed: 0,
                symbol: 'circle',
                symbolSize: 3,
                loop: true,
                // Length of trail, 0 - 1
                trailLength: 0.2
                // Same with lineStyle.normal.color
                // color
            },

            large: false,
            // Available when large is true
            largeThreshold: 2000,

            // If lines are polyline
            // polyline not support curveness, label, animation
            polyline: false,

            label: {
                normal: {
                    show: false,
                    position: 'end'
                    // distance: 5,
                    // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                }
            },

            lineStyle: {
                normal: {
                    opacity: 0.5
                }
            }
        }
    });
});