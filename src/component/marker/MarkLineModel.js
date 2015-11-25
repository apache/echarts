define(function (require) {

    // Default enable markLine
    var globalDefault = require('../../model/globalDefault');
    globalDefault.markLine = {};

    var MarkLineModel = require('../../echarts').extendComponentModel({

        type: 'markLine',

        dependencies: ['series', 'grid', 'polar'],
        /**
         * @overrite
         */
        init: function (option, parentModel, ecModel, extraOpt, createdBySelf) {
            this.mergeDefaultAndTheme(option, ecModel);
            this.mergeOption(option, createdBySelf);
        },

        mergeOption: function (newOpt, createdBySelf) {
            if (!createdBySelf) {
                var ecModel = this.ecModel;
                ecModel.eachSeries(function (seriesModel) {
                    var markLineOpt = seriesModel.get('markLine');
                    if (markLineOpt && markLineOpt.data) {
                        var mlModel = seriesModel.markLineModel;
                        if (!mlModel) {
                            var opt = {
                                // Use the same series index and name
                                seriesIndex: seriesModel.seriesIndex,
                                name: seriesModel.name
                            };
                            mlModel = new MarkLineModel(
                                markLineOpt, this, ecModel, opt, true
                            );
                        }
                        else {
                            mlModel.mergeOption(markLineOpt, true);
                        }
                        seriesModel.markLineModel = mlModel;
                    }
                    else {
                        seriesModel.markLineModel = null;
                    }
                }, this);
            }
        },

        defaultOption: {
            zlevel: 0,
            z: 5,
            clickable: true,
            // 标线起始和结束的symbol介绍类型，如果都一样，可以直接传string
            symbol: ['circle', 'arrow'],
            // 标线起始和结束的symbol大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
            symbolSize: [8, 16],
            // 标线起始和结束的symbol旋转控制
            //symbolRotate: null,
            //smooth: false,
            smoothness: 0.2,    // 平滑度
            precision: 2,
            tooltip: {
                trigger: 'item'
            },
            effect: {
                show: false,
                loop: true,
                period: 15,                     // 运动周期，无单位，值越大越慢
                scaleSize: 2                    // 放大倍数，以markLine线lineWidth为基准
                // color: 'gold',
                // shadowColor: 'rgba(255,215,0,0.8)',
                // shadowBlur: lineWidth * 2    // 炫光模糊，默认等于scaleSize计算所得
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
                }
            },
            lineStyle: {
                normal: {
                    // 主色，线色，优先级高于borderColor和color
                    // color: 随borderColor,
                    // 优先于borderWidth
                    // width: 随borderWidth,
                    type: 'dashed'
                    //默认透明
                    // shadowColor: 'rgba(0,0,0,0)',
                    // shadowBlur: 0,
                    // shadowOffsetX: 0,
                    // shadowOffsetY: 0
                },
                emphasis: {
                    width: 3
                }
            },
            itemStyle: {
                normal: {
                    // 标线主色，线色，symbol主色
                    // color: 各异,
                    // 标线symbol边框颜色，优先于color
                    // borderColor: 随color,
                    // 标线symbol边框线宽，单位px，默认为2
                    borderWidth: 2
                }
                // emphasis: {}
            }
        }
    });

    return MarkLineModel;
});