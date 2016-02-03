define(function (require) {
    // Default enable markPoint
    // var globalDefault = require('../../model/globalDefault');
    var modelUtil = require('../../util/model');
    // // Force to load markPoint component
    // globalDefault.markPoint = {};

    var MarkPointModel = require('../../echarts').extendComponentModel({

        type: 'markPoint',

        dependencies: ['series', 'grid', 'polar'],
        /**
         * @overrite
         */
        init: function (option, parentModel, ecModel, extraOpt) {
            this.mergeDefaultAndTheme(option, ecModel);
            this.mergeOption(option, ecModel, extraOpt.createdBySelf, true);
        },

        mergeOption: function (newOpt, ecModel, createdBySelf, isInit) {
            if (!createdBySelf) {
                ecModel.eachSeries(function (seriesModel) {
                    var markPointOpt = seriesModel.get('markPoint');
                    var mpModel = seriesModel.markPointModel;
                    if (!markPointOpt || !markPointOpt.data) {
                        seriesModel.markPointModel = null;
                        return;
                    }
                    if (!mpModel) {
                        if (isInit) {
                            // Default label emphasis `position` and `show`
                            modelUtil.defaultEmphasis(
                                markPointOpt.label,
                                ['position', 'show', 'textStyle', 'distance', 'formatter']
                            );
                        }
                        var opt = {
                            // Use the same series index and name
                            seriesIndex: seriesModel.seriesIndex,
                            name: seriesModel.name,
                            createdBySelf: true
                        };
                        mpModel = new MarkPointModel(
                            markPointOpt, this, ecModel, opt
                        );
                    }
                    else {
                        mpModel.mergeOption(markPointOpt, ecModel, true);
                    }
                    seriesModel.markPointModel = mpModel;
                }, this);
            }
        },

        defaultOption: {
            zlevel: 0,
            z: 5,
            symbol: 'pin',         // 标注类型
            symbolSize: 50,  // 标注大小
            // symbolRotate: null, // 标注旋转控制
            tooltip: {
                trigger: 'item'
            },
            label: {
                normal: {
                    show: true,
                    // 标签文本格式器，同Tooltip.formatter，不支持回调
                    // formatter: null,
                    // 可选为'left'|'right'|'top'|'bottom'
                    position: 'inside'
                    // 默认使用全局文本样式，详见TEXTSTYLE
                    // textStyle: null
                },
                emphasis: {
                    show: true
                    // 标签文本格式器，同Tooltip.formatter，不支持回调
                    // formatter: null,
                    // position: 'inside'  // 'left'|'right'|'top'|'bottom'
                    // textStyle: null     // 默认使用全局文本样式，详见TEXTSTYLE
                }
            },
            itemStyle: {
                normal: {
                    // color: 各异，
                    // 标注边线颜色，优先于color
                    // borderColor: 各异,
                    // 标注边线线宽，单位px，默认为1
                    borderWidth: 2
                },
                emphasis: {
                    // color: 各异
                }
            }
        }
    });

    return MarkPointModel;
});