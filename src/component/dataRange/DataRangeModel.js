/**
 * @file Data zoom model
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var env = require('zrender/core/env');
    var echarts = require('../../echarts');
    var modelUtil = require('../../util/model');
    var numberUtil = require('../../util/number');
    var asc = numberUtil.asc;

    return echarts.extendComponentModel({

        type: 'dataRange',

        dependencies: ['series'],

        /**
         * [lowerBound, upperBound]
         *
         * @readOnly
         * @type {Array.<number>}
         */
        dataBound: [-Infinity, Infinity],

        /**
         * @protected
         */
        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 4,                       // 二级层叠
            show: true,

            min: -Infinity,            // 最小值，如果不指定，则是所控制的series的最小值，兼容ec2而保留，不推荐指定
            max: Infinity,             // 最大值，如果不指定，则是所控制的series的最大值，兼容ec2而保留，不推荐指定
            interval: [-Infinity, Infinity], // [intervalMin, intervalMax]
            dimension: 'z',

            visualSelected: {
                type: 'color'        // 'color', 'colorH', 'colorS', 'colorL',
                                     // 'colorA',
                                     // 'symbol', 'symbolSize'
            },

            orient: 'vertical',        // 布局方式，默认为垂直布局，可选为：
                                       // 'horizontal' ¦ 'vertical'
            x: 'left',                 // 水平安放位置，默认为全图左对齐，可选为：
                                       // 'center' ¦ 'left' ¦ 'right'
                                       // ¦ {number}（x坐标，单位px）
            y: 'bottom',               // 垂直安放位置，默认为全图底部，可选为：
                                       // 'top' ¦ 'bottom' ¦ 'center'
                                       // ¦ {number}（y坐标，单位px）
            inverse: false,

            seriesIndex: null,          // 所控制的series indices，默认所有有value的series.
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: '#ccc',       // 值域边框颜色
            contentColor: '#5793f3',
            unselectedColor: '#aaa',
            borderWidth: 0,            // 值域边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 值域内边距，单位px，默认各方向内边距为5，
                                       // 接受数组分别设定上右下左边距，同css
            textGap: 10,               //
            itemWidth: 0,              // 值域图形宽度
            itemHeight: 0,             // 值域图形高度
            precision: 0,              // 小数精度，默认为0，无小数点
            color: ['#006edd','#e0ffff'],//颜色（deprecated，兼容ec2）
            // formatter: null,
            // text:['高','低'],         // 文本，默认为数值文本
            textStyle: {
                color: '#333'          // 值域文字颜色
            }
        },

        /**
         * @protected
         */
        init: function (option, parentModel, ecModel) {
            /**
             * @private
             * @type {boolean}
             */
            this._autoSeriesIndex = false;

            /**
             * @private
             * @type {Array.<number>}
             */
            this._dataExtent;

            /**
             * @readOnly
             */
            this.visualMappings = {};

            /**
             * @readOnly
             */
            this.textStyleModel;

            this.mergeDefaultAndTheme(option, ecModel);
            this.mergeOption({}, true);
        },

        /**
         * @override
         */
        baseMergeOption: function (newOption) {
            var thisOption = this.option;

            newOption && zrUtil.merge(thisOption, newOption);

            if (newOption.text && zrUtil.isArray(newOption.text)) {
                thisOption.text = newOption.text.slice();
            }

            // FIXME
            // necessary?
            // Disable realtime view update if canvas is not supported.
            if (!env.canvasSupported) {
                thisOption.realtime = false;
            }

            this.textStyleModel = this.getModel('textStyle');
        },

        /**
         * @param {number} valueStart Can be dataBound[0 or 1].
         * @param {number} valueEnd Can be null or dataBound[0 or 1].
         * @protected
         */
        formatValueText: function(valueStart, valueEnd) {
            var option = this.option;
            var precision = option.precision;
            var dataBound = this.dataBound;

            if (valueStart !== dataBound[0]) {
                valueStart = (+valueStart).toFixed(precision);
            }
            if (valueEnd != null && valueEnd !== dataBound[1]) {
                valueEnd = (+valueEnd).toFixed(precision);
            }

            var formatter = option.formatter;
            if (formatter) {
                if (zrUtil.isString(formatter)) {
                    return formatter
                        .replace('{value}', valueStart === dataBound[0] ? 'min' : valueStart)
                        .replace('{value2}', valueEnd === dataBound[1] ? 'max' : valueEnd);
                }
                else if (zrUtil.isFunction(formatter)) {
                    // FIXME
                    // this? echarts instance?
                    return formatter.call(null, valueStart, valueEnd);
                }
            }

            if (valueEnd == null) {
                return valueStart;
            }
            else {
                if (valueStart === dataBound[0]) {
                    return '< ' + valueEnd;
                }
                else if (valueEnd === dataBound[1]) {
                    return '> ' + valueStart;
                }
                else {
                    return valueStart + ' - ' + valueEnd;
                }
            }
        },

        /**
         * @protected
         */
        resetTargetSeries: function (newOption, isInit) {
            var thisOption = this.option;
            var autoSeriesIndex = this._autoSeriesIndex =
                (isInit ? thisOption : newOption).seriesIndex == null;
            thisOption.seriesIndex = autoSeriesIndex
                ? [] : modelUtil.normalizeToArray(thisOption.seriesIndex);

            autoSeriesIndex && this.ecModel.eachSeries(function (seriesModel, index) {
                var data = seriesModel.getData();
                // FIXME
                // 只考虑了list，还没有考虑map等。

                // FIXME
                // 这里可能应该这么判断：data.dimensions中有超出其所属coordSystem的量。
                if (data.type === 'list' && data.dimensions.length > 2) {
                    thisOption.seriesIndex.push(index);
                }
            });
        },

        /**
         * @protected
         */
        resetExtent: function () {
            var thisOption = this.option;
            var dataExtent = [Infinity, -Infinity];

            zrUtil.each(thisOption.seriesIndex, function (seriesIndex) {
                var data = this.ecModel.getSeriesByIndex(seriesIndex).getData();
                // FIXME
                // 只考虑了list
                if (data.type === 'list') {
                    var oneExtent = data.getDataExtent(thisOption.dimension);
                    oneExtent[0] < dataExtent[0] && (dataExtent[0] = oneExtent[0]);
                    oneExtent[1] > dataExtent[1] && (dataExtent[1] = oneExtent[1]);
                }
            }, this);

            var interval = asc(thisOption.interval);
            var extent = asc([thisOption.min, thisOption.max]);

            extent[0] = Math.max(extent[0], interval[0], dataExtent[0]);
            extent[1] = Math.min(extent[1], interval[1], dataExtent[1]);

            this._dataExtent = extent;
        },

        /**
         * @public
         * @override
         */
        getExtent: function () {
            return this._dataExtent.slice();
        },

        /**
         * @public
         */
        eachTargetSeries: function (callback, context) {
            zrUtil.each(this.option.seriesIndex, function (seriesIndex) {
                callback.call(context, this.ecModel.getSeriesByIndex(seriesIndex, true));
            }, this);
        },

        /**
         * @public
         * @abstract
         */
        setSelected: zrUtil.noop,

        /**
         * @public
         * @abstract
         */
        getValueState: zrUtil.noop

    });

});