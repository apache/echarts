define(function (require) {

    var modelUtil = require('../../util/model');
    var zrUtil = require('zrender/core/util');

    function fillLabel(opt) {
        modelUtil.defaultEmphasis(
            opt.label,
            modelUtil.LABEL_OPTIONS
        );
    }

    var MarkLineModel = require('../../echarts').extendComponentModel({

        type: 'markLine',

        dependencies: ['series', 'grid', 'polar', 'geo'],
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
                            fillLabel(markLineOpt);
                        }
                        zrUtil.each(markLineOpt.data, function (item) {
                            if (item instanceof Array) {
                                fillLabel(item[0]);
                                fillLabel(item[1]);
                            }
                            else {
                                fillLabel(item);
                            }
                        });
                        var opt = {
                            mainType: 'markLine',
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

            symbol: ['circle', 'arrow'],
            symbolSize: [8, 16],

            //symbolRotate: 0,

            precision: 2,
            tooltip: {
                trigger: 'item'
            },
            label: {
                normal: {
                    show: true,
                    position: 'end'
                },
                emphasis: {
                    show: true
                }
            },
            lineStyle: {
                normal: {
                    type: 'dashed'
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