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
            var fromDataArr = [];
            var toDataArr = [];
            var lineDataArr = [];
            zrUtil.each(option.data, function (opt) {
                fromDataArr.push(opt[0]);
                toDataArr.push(opt[1]);
                lineDataArr.push(zrUtil.extend(
                    zrUtil.extend({}, zrUtil.isArray(opt[0]) ? null : opt[0]),
                    zrUtil.isArray(opt[1]) ? null : opt[1]
                ));
            });

            // var coordSys = option.coordinateSystem;
            // if (coordSys !== 'cartesian2d' && coordSys !== 'geo') {
            //     throw new Error('Coordinate system can only be cartesian2d or geo in lines');
            // }

            // var dimensions = coordSys === 'geo' ? ['lng', 'lat'] : ['x', 'y'];
            var coordSys = CoordinateSystem.get(option.coordinateSystem);
            if (!coordSys) {
                throw new Error('Invalid coordinate system');
            }
            var dimensions = coordSys.dimensions;

            var fromData = new List(dimensions, this);
            var toData = new List(dimensions, this);
            var lineData = new List(['value'], this);

            function geoCoordGetter(item, dim, dataIndex, dimIndex) {
                return item.coord && item.coord[dimIndex];
            }

            fromData.initData(fromDataArr, null, geoCoordGetter);
            toData.initData(toDataArr, null, geoCoordGetter);
            lineData.initData(lineDataArr);

            this.fromData = fromData;
            this.toData = toData;

            return lineData;
        },

        formatTooltip: function (dataIndex) {
            var fromName = this.fromData.getName(dataIndex);
            var toName = this.toData.getName(dataIndex);
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

            // symbol: null,
            // symbolSize: 10,
            // symbolRotate: null,

            effect: {
                show: false,
                period: 4,
                symbol: 'circle',
                symbolSize: 3,
                // Length of trail, 0 - 1
                trailLength: 0.2
                // Same with lineStyle.normal.color
                // color
            },

            large: false,
            // Available when large is true
            largeThreshold: 2000,

            label: {
                normal: {
                    show: false,
                    position: 'end'
                    // distance: 5,
                    // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                }
            },
            // itemStyle: {
            //     normal: {
            //     }
            // },
            lineStyle: {
                normal: {
                    opacity: 0.5
                }
            }
        }
    });
});