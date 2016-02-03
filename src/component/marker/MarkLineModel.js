define(function (require) {

    // Default enable markLine
    // var globalDefault = require('../../model/globalDefault');
    var modelUtil = require('../../util/model');

    // // Force to load markLine component
    // globalDefault.markLine = {};

    var MarkLineModel = require('../../echarts').extendComponentModel({

        type: 'markLine',

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
                    var markLineOpt = seriesModel.get('markLine');
                    var mlModel = seriesModel.markLineModel;
                    if (!markLineOpt || !markLineOpt.data) {
                        seriesModel.markLineModel = null;
                        return;
                    }
                    if (!mlModel) {
                        if (isInit) {
                            // Default label emphasis `position` and `show`
                            modelUtil.defaultEmphasis(
                                markLineOpt.label,
                                ['position', 'show', 'textStyle', 'distance', 'formatter']
                            );
                        }
                        var opt = {
                            // Use the same series index and name
                            seriesIndex: seriesModel.seriesIndex,
                            name: seriesModel.name,
                            createdBySelf: true
                        };
                        mlModel = new MarkLineModel(
                            markLineOpt, this, ecModel, opt
                        );
                    }
                    else {
                        mlModel.mergeOption(markLineOpt, ecModel, true);
                    }
                    seriesModel.markLineModel = mlModel;
                }, this);
            }
        },

        defaultOption: {
            zlevel: 0,
            z: 5,
            // 标线起始和结束的symbol介绍类型，如果都一样，可以直接传string
            symbol: ['circle', 'arrow'],
            // 标线起始和结束的symbol大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
            symbolSize: [8, 16],
            // 标线起始和结束的symbol旋转控制
            //symbolRotate: null,
            //smooth: false,
            precision: 2,
            tooltip: {
                trigger: 'item'
            },
            label: {
                normal: {
                    show: true,
                    // 标签文本格式器，同Tooltip.formatter，不支持回调
                    // formatter: null,
                    // 可选为 'start'|'end'|'left'|'right'|'top'|'bottom'
                    position: 'end'
                    // 默认使用全局文本样式，详见TEXTSTYLE
                    // textStyle: null
                },
                emphasis: {
                    show: true
                }
            },
            lineStyle: {
                normal: {
                    // color
                    // width
                    type: 'dashed'
                    // shadowColor: 'rgba(0,0,0,0)',
                    // shadowBlur: 0,
                    // shadowOffsetX: 0,
                    // shadowOffsetY: 0
                },
                emphasis: {
                    width: 3
                }
            },
            animationEasing: 'linear'
        }
    });

    return MarkLineModel;
});