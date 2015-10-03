define(function (require) {

    var List = require('../../data/List');

    var zrUtil = require('zrender/core/util');

    // Default enable markpoint
    var globalDefault = require('../../model/globalDefault');
    globalDefault.markPoint = {};

    var geoCoordDataTransform = function (item) {

    }

    var specialTypeCalculatorWithExtent = function (percent, data, mainAxisDim, valueAxisDim) {
        var extent = data.getDataExtent(valueAxisDim);
        var valueIndex = (valueAxisDim === 'radius' || valueAxisDim === 'x') ? 0 : 1;
        var valueArr = [];
        var min = extent[0];
        var max = extent[1];
        var val = (max - min) * percent + min;
        valueArr[valueIndex] = val;
        var dataIndex = data.indexOfNearest(valueAxisDim, val);
        valueArr[1 - valueIndex] = data.get(mainAxisDim, dataIndex);
        return valueArr;
    };

    var specialTypeCalculator = {
        /**
         * @method
         * @param {module:echarts/data/List} data
         * @param {string} mainAxisDim
         * @param {string} valueAxisDim
         */
        min: zrUtil.curry(specialTypeCalculatorWithExtent, 0),
        /**
         * @method
         * @param {module:echarts/data/List} data
         * @param {string} mainAxisDim
         * @param {string} valueAxisDim
         */
        max: zrUtil.curry(specialTypeCalculatorWithExtent, 1),
        /**
         * @method
         * @param {module:echarts/data/List} data
         * @param {string} mainAxisDim
         * @param {string} valueAxisDim
         */
        average: zrUtil.curry(specialTypeCalculatorWithExtent, 0.5)
    }

    var dataTransform = function (data, mainAxisDim, valueAxisDim, item) {
        // If not specify the position with pixel directly
        if (isNaN(item.x) || isNaN(item.y)) {
            // Special types, Compatible with 2.0
            if (item.type && specialTypeCalculator[item.type]
                && mainAxisDim && valueAxisDim) {
                var value = specialTypeCalculator[item.type](
                    data, mainAxisDim, valueAxisDim
                );
                value.push(+item.value);
                item.value = value;
            }
            else if (!isNaN(item.value)) {
                item.value = [
                    item.xAxis || item.radiusAxis,
                    item.yAxis || item.angleAxis,
                    item.value
                ];
            }
        }
        return item;
    };

    // FIXME 公用？
    var getAxesDimMap = function (ecModel, seriesModel) {
        var coordSysType = seriesModel.get('coordinateSystem');
        var mainAxisDim;
        var valueAxisDim;
        if (coordSysType === 'cartesian2d') {
            var xAxisModel = ecModel.getComponent('xAxis', seriesModel.get('xAxisIndex'));
            if (xAxisModel.type === 'category') {
                mainAxisDim = 'y';
                valueAxisDim = 'x';
            }
            else {
                mainAxisDim = 'x';
                valueAxisDim = 'y';
            }
        }
        else if (coordSysType === 'polar') {
            var polarModel = ecModel.getComponent(seriesModel.get('polarIndex'));
            var radiusAxisModel = polarModel.findAxisModel('radiusAxis');
            if (radiusAxisModel.type === 'category') {
                mainAxisDim = 'radius';
                valueAxisDim = 'angle';
            }
            else {
                mainAxisDim = 'angle';
                valueAxisDim = 'radius';
            }
        }
        return {
            main: mainAxisDim,
            value: valueAxisDim
        };
    }

    var MarkPointModel = require('../../echarts').extendSeriesModel({

        type: 'markPoint',

        dependencies: ['series', 'grid', 'polar'],
        /**
         * @overrite
         */
        init: function (option, parentModel, ecModel, dependentModels, idx, createdBySelf) {
            this.mergeDefaultAndTheme(option, ecModel);
            this.mergeOption(option, createdBySelf);
        },

        mergeOption: function (newOpt, createdBySelf) {
            // If not created by self for each series
            if (!createdBySelf) {
                var ecModel = this.ecModel;
                ecModel.eachSeries(function (seriesModel) {
                    var markPointOpt = seriesModel.get('markPoint');
                    if (markPointOpt && markPointOpt.data) {
                        var mpModel = seriesModel.markPointModel;
                        if (!mpModel) {
                            mpModel = new MarkPointModel(
                                markPointOpt, this, ecModel, [], 0, true
                            );
                        }
                        else {
                            // FIXME 后面 data transform 是否会对新的 merge 有影响
                            mpModel.mergeOption(markPointOpt, true);
                        }
                        var seriesData = seriesModel.getData();
                        var dimensions = seriesData.dimensions.slice();
                        // Polar and cartesian with category axis may have dimensions inversed
                        if (dimensions[0] === 'y' || dimensions[0] === 'angle') {
                            dimensions.inverse();
                        }
                        var mpData = new List(dimensions, mpModel);

                        // Dim of axis of calculating min, max
                        var axesDims = getAxesDimMap(ecModel, seriesModel);
                        mpData.initData(
                            zrUtil.map(markPointOpt.data, zrUtil.curry(
                                dataTransform, seriesData,
                                axesDims.main, axesDims.value
                            ))
                        );
                        mpModel.getData = function () {
                            return mpData;
                        }

                        seriesModel.markPointModel = mpModel;
                    }
                    else {
                        seriesModel.markPointModel = null;
                    }
                }, this);
            }
        },

        restoreData: function () {
            // FIXME dataZoom needs to know markPoint model
        },

        defaultOption: {
            zlevel: 0,
            z: 5,
            clickable: true,
            symbol: 'pin',         // 标注类型
            symbolSize: 20,        // 标注大小
            // symbolRotate: null, // 标注旋转控制
            large: false,
            effect: {
                show: false,
                loop: true,
                // 运动周期，无单位，值越大越慢
                period: 15,
                // 可用为 scale | bounce
                type: 'scale',
                // 放大倍数，以markPoint点size为基准
                scaleSize: 2,
                // 跳动距离，单位px
                bounceDistance: 10
                // color: 'gold',
                // shadowColor: 'rgba(255,215,0,0.8)',
                // 炫光模糊
                // shadowBlur: 0
            },
            itemStyle: {
                normal: {
                    // color: 各异，
                    // 标注边线颜色，优先于color
                    // borderColor: 各异,
                    // 标注边线线宽，单位px，默认为1
                    borderWidth: 2,
                    label: {
                        show: true,
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        // formatter: null,
                        // 可选为'left'|'right'|'top'|'bottom'
                        position: 'inside'
                        // 默认使用全局文本样式，详见TEXTSTYLE
                        // textStyle: null
                    }
                },
                emphasis: {
                    // color: 各异
                    label: {
                        show: true
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        // formatter: null,
                        // position: 'inside'  // 'left'|'right'|'top'|'bottom'
                        // textStyle: null     // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                }
            }
        }
    });

    return MarkPointModel;
});