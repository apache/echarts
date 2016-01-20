define(function(require) {

    'use strict';

    var createListFromArray = require('../helper/createListFromArray');
    var SeriesModel = require('../../model/Series');
    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var linearMap = numberUtil.linearMap;

    // Must have polar coordinate system
    require('../../component/polar');

    return SeriesModel.extend({

        type: 'series.radar',

        dependencies: ['polar'],

        getInitialData: function (option, ecModel) {
            var indicators = option.indicator;
            var data = createListFromArray(option.data, this, ecModel);
            if (indicators) {
                var indicatorMap = zrUtil.reduce(indicators, function (map, value, idx) {
                    map[value.name] = value;
                    return map;
                }, {});
                // Linear map to indicator min-max
                // Only radius axis can be value
                data = data.map(['radius'], function (radius, idx) {
                    var indicator = indicatorMap[data.getName(idx)];
                    if (indicator && indicator.max) {
                        // Map to 0-1 percent value
                        return linearMap(radius, [indicator.min || 0, indicator.max], [0, 1]);
                    }
                });

                // FIXME
                var oldGetRawValue = this.getRawValue;
                this.getRawValue = function (idx) {
                    var val = oldGetRawValue.call(this, idx);
                    var indicator = indicatorMap[data.getName(idx)];
                    if (indicator && indicator.max != null) {
                        return linearMap(val, [0, 1], [indicator.min || 0, indicator.max]);
                    }
                };
            }
            return data;
        },

        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 2,                       // 二级层叠
            coordinateSystem: 'polar',
            legendHoverLink: true,
            polarIndex: 0,
            lineStyle: {
                normal: {
                    width: 2,
                    type: 'solid'
                }
            },
            // areaStyle: {
            // },
            // 拐点图形类型
            symbol: 'emptyCircle',
            // 拐点图形大小
            symbolSize: 4,
            // 拐点图形旋转控制
            // symbolRotate: null,
            // 标志图形默认只有主轴显示（随主轴标签间隔隐藏策略）
            showAllSymbol: false

            // Indicators for each chart
            // indicator: [{
            //     name: '',
            //     min: 0,
            //     max: 100
            // }]
        }
    });
});