/**
 * @file Data zoom model
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var env = require('zrender/core/env');
    var echarts = require('../../echarts');
    var helper = require('./helper');

    return echarts.extendComponentModel({

        type: 'dataZoom',

        dependencies: ['xAxis', 'yAxis', 'series'],

        /**
         * @protected
         */
        defaultOption: {
            zlevel: 0,                 // 一级层叠
            z: 4,                      // 二级层叠
            show: false,
            orient: 'horizontal',      // 布局方式，默认为水平布局，可选为：
                                       // 'horizontal' ¦ 'vertical'
            // x: {number},            // 水平安放位置，默认为根据grid参数适配，可选为：
                                       // {number}（x坐标，单位px）
            // y: {number},            // 垂直安放位置，默认为根据grid参数适配，可选为：
                                       // {number}（y坐标，单位px）
            // width: {number},        // 指定宽度，横向布局时默认为根据grid参数适配
            // height: {number},       // 指定高度，纵向布局时默认为根据grid参数适配
            backgroundColor: 'rgba(0,0,0,0)',       // 背景颜色
            dataBackgroundColor: '#eee',            // 数据背景颜色
            fillerColor: 'rgba(144,197,237,0.2)',   // 填充颜色
            handleColor: 'rgba(70,130,180,0.8)',    // 手柄颜色
            handleSize: 10,
            showDetail: true,
            // xAxisIndex: [],         // 默认控制所有横向类目
            // yAxisIndex: [],         // 默认控制所有横向类目
            start: 0,               // 默认为0
            end: 100,               // 默认为全部 100%
            start2: 0,               // 默认为0
            end2: 100,               // 默认为全部 100%
            realtime: true
            // zoomLock: false         // 是否锁定选择区域大小
        },

        /**
         * @override
         */
        init: function (option, parentModel, ecModel) {
            this.mergeDefaultAndTheme(option, ecModel);
            this.mergeOption({});
        },

        /**
         * @override
         */
        mergeOption: function (newOption) {
            var thisOption = this.option;

            newOption && zrUtil.merge(thisOption, newOption);

            // Disable realtime view update if canvas is not supported.
            if (!env.canvasSupported) {
                thisOption.realtime = false;
            }

            // FIXME
            // 是否有toolbox zoom控件时，自动加一个dataZoom option，而非和某个dataZoom option共用？
            // dataZoom option中可加type来判断是普通还是toolbox还是移动端需要的图面拖拽。
            // optionMerge时根据type进行merge。
            this._resetTargetAxes(newOption);
            // this._resetTargetSeries(newOption);
            this._resetRange();
        },

        _resetTargetAxes: function (newOption) {
            var thisOption = this.option;
            var noAxisDefined = true;

            helper.eachAxisDim(function (dimNames) {
                // Overlap these arrays but not merge.
                var axisIndices = helper.toArray(helper.retrieveValue(
                    newOption[dimNames.axisIndex], thisOption[dimNames.axisIndex], []
                ));
                var axisModels = this.dependentModels[dimNames.axis];

                // If not specified, set default.
                if (axisModels.length && !axisIndices.length) {
                    for (var i = 0, len = axisModels.length; i < len; i++) {
                        if (axisModels[i].get('type') === 'category') {
                            axisIndices.push(i);
                        }
                    }
                }
                thisOption[dimNames.axisIndex] = axisIndices;

                if (axisIndices.length) {
                    noAxisDefined = false;
                }
            }, this);

            if (noAxisDefined) {
                // FIXME
                // 这里是兼容ec2的写法（没指定xAxisIndex和yAxisIndex时把scatter和双数值轴折柱纳入dataZoom控制），
                // 但是实际是否需要Grid.js#getScaleByOption来判断（考虑time，log等axis type）？

                // If both dataZoom.xAxisIndex and dataZoom.yAxisIndex is not specified,
                // dataZoom component auto adopts series that reference to
                // both xAxis and yAxis which type is 'value'.
                this.ecModel.eachSeries(function (seriesModel) {
                    if (this._isSeriesHasAllAxesTypeOf(seriesModel, 'value')) {
                        helper.eachAxisDim(function (dimNames) {
                            var axisIndices = thisOption[dimNames.axisIndex];
                            var axisIndex = seriesModel.get(dimNames.axisIndex);
                            if (zrUtil.indexOf(axisIndices, axisIndex) < 0) {
                                axisIndices.push(axisIndex);
                            }
                        });
                    }
                }, this);
            }
        },

        _isSeriesHasAllAxesTypeOf: function (seriesModel, axisType) {
            // FIXME
            // 需要series的xAxisIndex和yAxisIndex都首先自动设置上。
            // 例如series.type === scatter时。

            var is = true;
            helper.eachAxisDim(function (dimNames) {
                var seriesAxisIndex = seriesModel.get(dimNames.axisIndex);
                var axisModel = this.dependentModels[dimNames.axis][seriesAxisIndex];

                if (!axisModel || axisModel.get('type') !== axisType) {
                    is = false;
                }
            }, this);
            return is;
        },

        _resetRange: function () {
            var thisOption = this.option;

            // TODO
            // 对于一个轴受多个dataZoom控制的情况（如toolbox）：
            // datazoom改变时，不直接改变，而是发全局事件，监听：
            // 如果轴是自己包含的轴，则自己改变start和end。
            // 所有都改完后，重新走process流程。

            // Determin which axes dataZoom.start/end and dataZoom.start2/end2 control.
            // When only xAxisIndex or only yAxisIndex is specified, start/end controls them.
            // targetDim === false means that both xAxisIndex and yAxisIndex are specified.
            var targetDim;
            helper.eachAxisDim(function (dimNames) {
                if (thisOption[dimNames.axisIndex].length) {
                    targetDim = targetDim !== false ? false : dimNames.dim;
                }
            });

            // Otherwise, determine it by dataZoom.orient (compatibale with the logic in ec2.)
            // targetDim === 'y' means start/end control 'y' and start2/end2 control 'x'.
            var targetDim2;
            if (targetDim === false) {
                targetDim = thisOption.orient === 'vertical' ? 'y' : 'x';
                targetDim2 = targetDim === 'x' ? 'y' : 'x';
            }

            var optAttrs = {};
            optAttrs[targetDim] = {start: 'start', end: 'end'};
            targetDim2 && (optAttrs[targetDim2] = {start: 'start2', end: 'end2'});

            zrUtil.each(optAttrs, function (dimItem, targetDim) {
                var axisModels = this.dependentModels[targetDim + 'Axis'];
                var startValue = thisOption[dimItem.start];
                var endValue = thisOption[dimItem.end];

                // Auto reverse when start > end
                if (startValue > endValue) {
                    startValue = [endValue, endValue = startValue][0];
                }

                // Set to axis and dataZoom
                zrUtil.each(axisModels, function (axisModel) {
                    axisModel.setDataZoomRange(startValue, endValue);
                });
                thisOption[dimItem.start] = startValue;
                thisOption[dimItem.end] = endValue;
            }, this);

            if (!targetDim2) {
                thisOption.start2 = thisOption.end2 = null;
            }
        },

        /**
         * @public
         * @param {Function} callback param: axisModel, dimNames, axisIndex, dataZoomModel, ecModel
         */
        eachTargetAxis: function (callback, context) {
            var ecModel = this.ecModel;
            helper.eachAxisDim(function (dimNames) {
                zrUtil.each(
                    this.get(dimNames.axisIndex),
                    function (axisIndex) {
                        callback.call(context, dimNames, axisIndex, this, ecModel);
                    },
                    this
                );
            }, this);
        },

        /**
         * @public
         * @param {string} dimName 'x', 'y', 'z'
         * @param {number} axisIndex
         */
        getTargetSeriesModels: function (dimName, axisIndex) {
            var seriesModels = [];
            this.ecModel.eachSeries(function (seriesModel) {
                if (axisIndex === seriesModel.get(dimName + 'AxisIndex')) {
                    seriesModels.push(seriesModel);
                }
            });
            return seriesModels;
        },

        /**
         * @public
         * @param {Object} param
         * @param {number=} [param.start]
         * @param {number=} [param.end]
         * @param {number=} [param.start2]
         * @param {number=} [param.end2]
         */
        setRange: function (param) {
            var thisOption = this.option;

            param.start != null && (thisOption.start = param.start);
            param.end != null && (thisOption.end = param.end);
            param.start2 != null && (thisOption.start2 = param.start2);
            param.end2 != null && (thisOption.end2 = param.end2);

            this._resetRange();
        },

        /**
         * @public
         */
        getRange: function () {
            var thisOption = this.option;
            return {
                start: thisOption.start,
                end: thisOption.end,
                star2: thisOption.star2,
                end2: thisOption.end2
            };
        }

    });

});