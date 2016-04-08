define(function(require) {

    var List = require('../../data/List');
    var zrUtil = require('zrender/core/util');
    var SeriesModel = require('../../model/Series');

    return SeriesModel.extend({

        type: 'series.parallel',

        dependencies: ['parallel'],

        getInitialData: function (option, ecModel) {
            var parallelModel = ecModel.getComponent(
                'parallel', this.get('parallelIndex')
            );
            var dimensions = parallelModel.dimensions;
            var parallelAxisIndices = parallelModel.parallelAxisIndex;

            var rawData = option.data;

            var dimensionsInfo = zrUtil.map(dimensions, function (dim, index) {
                var axisModel = ecModel.getComponent(
                    'parallelAxis', parallelAxisIndices[index]
                );
                if (axisModel.get('type') === 'category') {
                    translateCategoryValue(axisModel, dim, rawData);
                    return {name: dim, type: 'ordinal'};
                }
                else {
                    return dim;
                }
            });

            var list = new List(dimensionsInfo, this);
            list.initData(rawData);

            return list;
        },

        /**
         * User can get data raw indices on 'axisAreaSelected' event received.
         *
         * @public
         * @param {string} activeState 'active' or 'inactive' or 'normal'
         * @return {Array.<number>} Raw indices
         */
        getRawIndicesByActiveState: function (activeState) {
            var coordSys = this.coordinateSystem;
            var data = this.getData();
            var indices = [];

            coordSys.eachActiveState(data, function (theActiveState, dataIndex) {
                if (activeState === theActiveState) {
                    indices.push(data.getRawIndex(dataIndex));
                }
            });

            return indices;
        },

        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 2,                       // 二级层叠

            coordinateSystem: 'parallel',
            parallelIndex: 0,

            // FIXME 尚无用
            label: {
                normal: {
                    show: false
                    // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                    // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                    //           'inside'|'left'|'right'|'top'|'bottom'
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                },
                emphasis: {
                    show: false
                    // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                    // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                    //           'inside'|'left'|'right'|'top'|'bottom'
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                }
            },

            inactiveOpacity: 0.05,
            activeOpacity: 1,

            lineStyle: {
                normal: {
                    width: 2,
                    opacity: 0.45,
                    type: 'solid'
                }
            },
            // smooth: false

            animationEasing: 'linear'
        }
    });

    function translateCategoryValue(axisModel, dim, rawData) {
        var axisData = axisModel.get('data');
        var numberDim = +dim.replace('dim', '');

        if (axisData && axisData.length) {
            zrUtil.each(rawData, function (dataItem) {
                if (!dataItem) {
                    return;
                }
                var index = zrUtil.indexOf(axisData, dataItem[numberDim]);
                dataItem[numberDim] = index >= 0 ? index : NaN;
            });
        }
        // FIXME
        // 如果没有设置axis data, 应自动算出，或者提示。
    }
});