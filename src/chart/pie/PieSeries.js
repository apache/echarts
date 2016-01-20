define(function(require) {

    'use strict';

    var List = require('../../data/List');
    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');
    var completeDimensions = require('../../data/helper/completeDimensions');

    var dataSelectableMixin = require('../helper/dataSelectableMixin');

    var PieSeries = require('../../echarts').extendSeriesModel({

        type: 'series.pie',

        // Overwrite
        init: function (option) {
            this.$superApply('init', arguments);

            // Enable legend selection for each data item
            // Use a function instead of direct access because data reference may changed
            this.legendDataProvider = function () {
                return this._dataBeforeProcessed;
            };

            this.updateSelectedMap();

            this._defaultLabelLine(option);
        },

        // Overwrite
        mergeOption: function (newOption) {
            this.$superCall('mergeOption', newOption);
            this.updateSelectedMap();
        },

        getInitialData: function (option, ecModel) {
            var dimensions = completeDimensions(['value'], option.data);
            var list = new List(dimensions, this);
            list.initData(option.data);
            return list;
        },

        // Overwrite
        getDataParams: function (dataIndex) {
            var data = this._data;
            var params = this.$superCall('getDataParams', dataIndex);
            // FIXME toFixed?
            params.percent = +(data.get('value', dataIndex) / data.getSum('value') * 100).toFixed(2);

            params.$vars.push('percent');
            return params;
        },

        _defaultLabelLine: function (option) {
            // Extend labelLine emphasis
            modelUtil.defaultEmphasis(option.labelLine, ['show']);

            var labelLineNormalOpt = option.labelLine.normal;
            var labelLineEmphasisOpt = option.labelLine.emphasis;
            // Not show label line if `label.normal.show = false`
            labelLineNormalOpt.show = labelLineNormalOpt.show
                && option.label.normal.show;
            labelLineEmphasisOpt.show = labelLineEmphasisOpt.show
                && option.label.emphasis.show;
        },

        defaultOption: {
            zlevel: 0,
            z: 2,
            legendHoverLink: true,

            hoverAnimation: true,
            // 默认全局居中
            center: ['50%', '50%'],
            radius: [0, '75%'],
            // 默认顺时针
            clockwise: true,
            startAngle: 90,
            // 最小角度改为0
            minAngle: 0,
            // 选中是扇区偏移量
            selectedOffset: 10,

            // If use strategy to avoid label overlapping
            avoidLabelOverlap: true,
            // 选择模式，默认关闭，可选single，multiple
            // selectedMode: false,
            // 南丁格尔玫瑰图模式，'radius'（半径） | 'area'（面积）
            // roseType: null,

            label: {
                normal: {
                    // If rotate around circle
                    rotate: false,
                    show: true,
                    // 'outer', 'inside', 'center'
                    position: 'outer'
                    // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    // distance: 当position为inner时有效，为label位置到圆心的距离与圆半径(环状图为内外半径和)的比例系数
                },
                emphasis: {}
            },
            // Enabled when label.normal.position is 'outer'
            labelLine: {
                normal: {
                    show: true,
                    // 引导线两段中的第一段长度
                    length: 20,
                    // 引导线两段中的第二段长度
                    length2: 5,
                    smooth: false,
                    lineStyle: {
                        // color: 各异,
                        width: 1,
                        type: 'solid'
                    }
                }
            },
            itemStyle: {
                normal: {
                    // color: 各异,
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 1
                },
                emphasis: {
                    // color: 各异,
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 1
                }
            },

            animationEasing: 'cubicOut',

            data: []
        }
    });

    zrUtil.mixin(PieSeries, dataSelectableMixin);

    return PieSeries;
});