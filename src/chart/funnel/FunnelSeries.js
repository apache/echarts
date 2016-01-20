define(function(require) {

    'use strict';

    var List = require('../../data/List');
    var modelUtil = require('../../util/model');
    var completeDimensions = require('../../data/helper/completeDimensions');

    require('../../echarts').extendSeriesModel({

        type: 'series.funnel',

        init: function (option) {
            this.$superApply('init', arguments);

            // Enable legend selection for each data item
            // Use a function instead of direct access because data reference may changed
            this.legendDataProvider = function () {
                return this._dataBeforeProcessed;
            };
            // Extend labelLine emphasis
            this._defaultLabelLine(option);
        },

        getInitialData: function (option, ecModel) {
            var dimensions = completeDimensions(['value'], option.data);
            var list = new List(dimensions, this);
            list.initData(option.data);
            return list;
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
            zlevel: 0,                  // 一级层叠
            z: 2,                       // 二级层叠
            legendHoverLink: true,
            left: 80,
            top: 60,
            right: 80,
            bottom: 60,
            // width: {totalWidth} - left - right,
            // height: {totalHeight} - top - bottom,

            // 默认取数据最小最大值
            // min: 0,
            // max: 100,
            minSize: '0%',
            maxSize: '100%',
            sort: 'descending', // 'ascending', 'descending'
            gap: 0,
            funnelAlign: 'center',
            label: {
                normal: {
                    show: true,
                    position: 'outer'
                    // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                },
                emphasis: {
                    show: true
                }
            },
            labelLine: {
                normal: {
                    show: true,
                    length: 20,
                    lineStyle: {
                        // color: 各异,
                        width: 1,
                        type: 'solid'
                    }
                },
                emphasis: {}
            },
            itemStyle: {
                normal: {
                    // color: 各异,
                    borderColor: '#fff',
                    borderWidth: 1
                },
                emphasis: {
                    // color: 各异,
                }
            }
        }
    });
});