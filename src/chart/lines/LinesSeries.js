define(function (require) {

    'use strict';

    var SeriesModel = require('../../model/Series');
    var List = require('../../data/List');
    var zrUtil = require('zrender/core/util');
    var CoordinateSystem = require('../../CoordinateSystem');

    return SeriesModel.extend({

        type: 'series.lines',

        dependencies: ['grid', 'polar'],

        getInitialData: function (option, ecModel) {
            if (__DEV__) {
                var CoordSys = CoordinateSystem.get(option.coordinateSystem);
                if (!CoordSys) {
                    throw new Error('Unkown coordinate system ' + option.coordinateSystem);
                }
            }

            var lineData = new List(['value'], this);

            lineData.initData(option.data);

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
                delay: 1,
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