define(function(require) {

    'use strict';

    var SeriesModel = require('../../model/Series');
    var createListFromArray = require('../helper/createListFromArray');

    return SeriesModel.extend({

        type: 'series.bar',

        dependencies: ['grid', 'polar'],

        getInitialData: function (option, ecModel) {
            if (__DEV__) {
                var coordSys = option.coordinateSystem;
                if (coordSys !== 'cartesian2d') {
                    throw new Error('Bar only support cartesian2d coordinateSystem');
                }
            }
            return createListFromArray(option.data, this, ecModel);
        },

        getMarkerPosition: function (value) {
            var coordSys = this.coordinateSystem;
            if (coordSys) {
                // PENDING if clamp ?
                var pt = coordSys.dataToPoint(value, true);
                var data = this.getData();
                var offset = data.getLayout('offset');
                var size = data.getLayout('size');
                var offsetIndex = coordSys.getBaseAxis().isHorizontal() ? 0 : 1;
                pt[offsetIndex] += offset + size / 2;
                return pt;
            }
            return [NaN, NaN];
        },

        brushSelector: 'rect',

        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 2,                       // 二级层叠
            coordinateSystem: 'cartesian2d',
            legendHoverLink: true,
            // stack: null

            // Cartesian coordinate system
            xAxisIndex: 0,
            yAxisIndex: 0,

            // 最小高度改为0
            barMinHeight: 0,

            // barMaxWidth: null,
            // 默认自适应
            // barWidth: null,
            // 柱间距离，默认为柱形宽度的30%，可设固定值
            // barGap: '30%',
            // 类目间柱形距离，默认为类目间距的20%，可设固定值
            // barCategoryGap: '20%',
            // label: {
            //     normal: {
            //         show: false
            //     }
            // },
            itemStyle: {
                normal: {
                    // color: '各异',
                    // 柱条边线
                    barBorderColor: '#fff',
                    // 柱条边线线宽，单位px，默认为1
                    barBorderWidth: 0
                },
                emphasis: {
                    // color: '各异',
                    // 柱条边线
                    barBorderColor: '#fff',
                    // 柱条边线线宽，单位px，默认为1
                    barBorderWidth: 0
                }
            }
        }
    });
});