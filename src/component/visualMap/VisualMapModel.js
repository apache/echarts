/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import env from 'zrender/src/core/env';
import visualDefault from '../../visual/visualDefault';
import VisualMapping from '../../visual/VisualMapping';
import * as visualSolution from '../../visual/visualSolution';
import * as modelUtil from '../../util/model';
import * as numberUtil from '../../util/number';

var mapVisual = VisualMapping.mapVisual;
var eachVisual = VisualMapping.eachVisual;
var isArray = zrUtil.isArray;
var each = zrUtil.each;
var asc = numberUtil.asc;
var linearMap = numberUtil.linearMap;
var noop = zrUtil.noop;

var VisualMapModel = echarts.extendComponentModel({

    type: 'visualMap',

    dependencies: ['series'],

    /**
     * @readOnly
     * @type {Array.<string>}
     */
    stateList: ['inRange', 'outOfRange'],

    /**
     * @readOnly
     * @type {Array.<string>}
     */
    replacableOptionKeys: [
        'inRange', 'outOfRange', 'target', 'controller', 'color'
    ],

    /**
     * [lowerBound, upperBound]
     *
     * @readOnly
     * @type {Array.<number>}
     */
    dataBound: [-Infinity, Infinity],

    /**
     * @readOnly
     * @type {string|Object}
     */
    layoutMode: {type: 'box', ignoreSize: true},

    /**
     * @protected
     */
    defaultOption: {
        show: true,

        zlevel: 0,
        z: 4,

        seriesIndex: 'all',     // 'all' or null/undefined: all series.
                                // A number or an array of number: the specified series.

                                // set min: 0, max: 200, only for campatible with ec2.
                                // In fact min max should not have default value.
        min: 0,                 // min value, must specified if pieces is not specified.
        max: 200,               // max value, must specified if pieces is not specified.

        dimension: null,
        inRange: null,          // 'color', 'colorHue', 'colorSaturation', 'colorLightness', 'colorAlpha',
                                // 'symbol', 'symbolSize'
        outOfRange: null,       // 'color', 'colorHue', 'colorSaturation',
                                // 'colorLightness', 'colorAlpha',
                                // 'symbol', 'symbolSize'

        left: 0,                // 'center' ¦ 'left' ¦ 'right' ¦ {number} (px)
        right: null,            // The same as left.
        top: null,              // 'top' ¦ 'bottom' ¦ 'center' ¦ {number} (px)
        bottom: 0,              // The same as top.

        itemWidth: null,
        itemHeight: null,
        inverse: false,
        orient: 'vertical',        // 'horizontal' ¦ 'vertical'

        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#ccc',       // 值域边框颜色
        contentColor: '#5793f3',
        inactiveColor: '#aaa',
        borderWidth: 0,            // 值域边框线宽，单位px，默认为0（无边框）
        padding: 5,                // 值域内边距，单位px，默认各方向内边距为5，
                                    // 接受数组分别设定上右下左边距，同css
        textGap: 10,               //
        precision: 0,              // 小数精度，默认为0，无小数点
        color: null,               //颜色（deprecated，兼容ec2，顺序同pieces，不同于inRange/outOfRange）

        formatter: null,
        text: null,                // 文本，如['高', '低']，兼容ec2，text[0]对应高值，text[1]对应低值
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
         * @type {Array.<number>}
         */
        this._dataExtent;

        /**
         * @readOnly
         */
        this.targetVisuals = {};

        /**
         * @readOnly
         */
        this.controllerVisuals = {};

        /**
         * @readOnly
         */
        this.textStyleModel;

        /**
         * [width, height]
         * @readOnly
         * @type {Array.<number>}
         */
        this.itemSize;

        this.mergeDefaultAndTheme(option, ecModel);
    },

    /**
     * @protected
     */
    optionUpdated: function (newOption, isInit) {
        var thisOption = this.option;

        // FIXME
        // necessary?
        // Disable realtime view update if canvas is not supported.
        if (!env.canvasSupported) {
            thisOption.realtime = false;
        }

        !isInit && visualSolution.replaceVisualOption(
            thisOption, newOption, this.replacableOptionKeys
        );

        this.textStyleModel = this.getModel('textStyle');

        this.resetItemSize();

        this.completeVisualOption();
    },

    /**
     * @protected
     */
    resetVisual: function (supplementVisualOption) {
        var stateList = this.stateList;
        supplementVisualOption = zrUtil.bind(supplementVisualOption, this);

        this.controllerVisuals = visualSolution.createVisualMappings(
            this.option.controller, stateList, supplementVisualOption
        );
        this.targetVisuals = visualSolution.createVisualMappings(
            this.option.target, stateList, supplementVisualOption
        );
    },

    /**
     * @protected
     * @return {Array.<number>} An array of series indices.
     */
    getTargetSeriesIndices: function () {
        var optionSeriesIndex = this.option.seriesIndex;
        var seriesIndices = [];

        if (optionSeriesIndex == null || optionSeriesIndex === 'all') {
            this.ecModel.eachSeries(function (seriesModel, index) {
                seriesIndices.push(index);
            });
        }
        else {
            seriesIndices = modelUtil.normalizeToArray(optionSeriesIndex);
        }

        return seriesIndices;
    },

    /**
     * @public
     */
    eachTargetSeries: function (callback, context) {
        zrUtil.each(this.getTargetSeriesIndices(), function (seriesIndex) {
            callback.call(context, this.ecModel.getSeriesByIndex(seriesIndex));
        }, this);
    },

    /**
     * @pubilc
     */
    isTargetSeries: function (seriesModel) {
        var is = false;
        this.eachTargetSeries(function (model) {
            model === seriesModel && (is = true);
        });
        return is;
    },

    /**
     * @example
     * this.formatValueText(someVal); // format single numeric value to text.
     * this.formatValueText(someVal, true); // format single category value to text.
     * this.formatValueText([min, max]); // format numeric min-max to text.
     * this.formatValueText([this.dataBound[0], max]); // using data lower bound.
     * this.formatValueText([min, this.dataBound[1]]); // using data upper bound.
     *
     * @param {number|Array.<number>} value Real value, or this.dataBound[0 or 1].
     * @param {boolean} [isCategory=false] Only available when value is number.
     * @param {Array.<string>} edgeSymbols Open-close symbol when value is interval.
     * @return {string}
     * @protected
     */
    formatValueText: function(value, isCategory, edgeSymbols) {
        var option = this.option;
        var precision = option.precision;
        var dataBound = this.dataBound;
        var formatter = option.formatter;
        var isMinMax;
        var textValue;
        edgeSymbols = edgeSymbols || ['<', '>'];

        if (zrUtil.isArray(value)) {
            value = value.slice();
            isMinMax = true;
        }

        textValue = isCategory
            ? value
            : (isMinMax
                ? [toFixed(value[0]), toFixed(value[1])]
                : toFixed(value)
            );

        if (zrUtil.isString(formatter)) {
            return formatter
                .replace('{value}', isMinMax ? textValue[0] : textValue)
                .replace('{value2}', isMinMax ? textValue[1] : textValue);
        }
        else if (zrUtil.isFunction(formatter)) {
            return isMinMax
                ? formatter(value[0], value[1])
                : formatter(value);
        }

        if (isMinMax) {
            if (value[0] === dataBound[0]) {
                return edgeSymbols[0] + ' ' + textValue[1];
            }
            else if (value[1] === dataBound[1]) {
                return edgeSymbols[1] + ' ' + textValue[0];
            }
            else {
                return textValue[0] + ' - ' + textValue[1];
            }
        }
        else { // Format single value (includes category case).
            return textValue;
        }

        function toFixed(val) {
            return val === dataBound[0]
                ? 'min'
                : val === dataBound[1]
                ? 'max'
                : (+val).toFixed(Math.min(precision, 20));
        }
    },

    /**
     * @protected
     */
    resetExtent: function () {
        var thisOption = this.option;

        // Can not calculate data extent by data here.
        // Because series and data may be modified in processing stage.
        // So we do not support the feature "auto min/max".

        var extent = asc([thisOption.min, thisOption.max]);

        this._dataExtent = extent;
    },

    /**
     * @public
     * @param {module:echarts/data/List} list
     * @return {string} Concrete dimention. If return null/undefined,
     *                  no dimension used.
     */
    getDataDimension: function (list) {
        var optDim = this.option.dimension;
        var listDimensions = list.dimensions;
        if (optDim == null && !listDimensions.length) {
            return;
        }

        if (optDim != null) {
            return list.getDimension(optDim);
        }

        var dimNames = list.dimensions;
        for (var i = dimNames.length - 1; i >= 0; i--) {
            var dimName = dimNames[i];
            var dimInfo = list.getDimensionInfo(dimName);
            if (!dimInfo.isCalculationCoord) {
                return dimName;
            }
        }
    },

    /**
     * @public
     * @override
     */
    getExtent: function () {
        return this._dataExtent.slice();
    },

    /**
     * @protected
     */
    completeVisualOption: function () {
        var ecModel = this.ecModel;
        var thisOption = this.option;
        var base = {inRange: thisOption.inRange, outOfRange: thisOption.outOfRange};

        var target = thisOption.target || (thisOption.target = {});
        var controller = thisOption.controller || (thisOption.controller = {});

        zrUtil.merge(target, base); // Do not override
        zrUtil.merge(controller, base); // Do not override

        var isCategory = this.isCategory();

        completeSingle.call(this, target);
        completeSingle.call(this, controller);
        completeInactive.call(this, target, 'inRange', 'outOfRange');
        // completeInactive.call(this, target, 'outOfRange', 'inRange');
        completeController.call(this, controller);

        function completeSingle(base) {
            // Compatible with ec2 dataRange.color.
            // The mapping order of dataRange.color is: [high value, ..., low value]
            // whereas inRange.color and outOfRange.color is [low value, ..., high value]
            // Notice: ec2 has no inverse.
            if (isArray(thisOption.color)
                // If there has been inRange: {symbol: ...}, adding color is a mistake.
                // So adding color only when no inRange defined.
                && !base.inRange
            ) {
                base.inRange = {color: thisOption.color.slice().reverse()};
            }

            // Compatible with previous logic, always give a defautl color, otherwise
            // simple config with no inRange and outOfRange will not work.
            // Originally we use visualMap.color as the default color, but setOption at
            // the second time the default color will be erased. So we change to use
            // constant DEFAULT_COLOR.
            // If user do not want the defualt color, set inRange: {color: null}.
            base.inRange = base.inRange || {color: ecModel.get('gradientColor')};

            // If using shortcut like: {inRange: 'symbol'}, complete default value.
            each(this.stateList, function (state) {
                var visualType = base[state];

                if (zrUtil.isString(visualType)) {
                    var defa = visualDefault.get(visualType, 'active', isCategory);
                    if (defa) {
                        base[state] = {};
                        base[state][visualType] = defa;
                    }
                    else {
                        // Mark as not specified.
                        delete base[state];
                    }
                }
            }, this);
        }

        function completeInactive(base, stateExist, stateAbsent) {
            var optExist = base[stateExist];
            var optAbsent = base[stateAbsent];

            if (optExist && !optAbsent) {
                optAbsent = base[stateAbsent] = {};
                each(optExist, function (visualData, visualType) {
                    if (!VisualMapping.isValidType(visualType)) {
                        return;
                    }

                    var defa = visualDefault.get(visualType, 'inactive', isCategory);

                    if (defa != null) {
                        optAbsent[visualType] = defa;

                        // Compatibable with ec2:
                        // Only inactive color to rgba(0,0,0,0) can not
                        // make label transparent, so use opacity also.
                        if (visualType === 'color'
                            && !optAbsent.hasOwnProperty('opacity')
                            && !optAbsent.hasOwnProperty('colorAlpha')
                        ) {
                            optAbsent.opacity = [0, 0];
                        }
                    }
                });
            }
        }

        function completeController(controller) {
            var symbolExists = (controller.inRange || {}).symbol
                || (controller.outOfRange || {}).symbol;
            var symbolSizeExists = (controller.inRange || {}).symbolSize
                || (controller.outOfRange || {}).symbolSize;
            var inactiveColor = this.get('inactiveColor');

            each(this.stateList, function (state) {

                var itemSize = this.itemSize;
                var visuals = controller[state];

                // Set inactive color for controller if no other color
                // attr (like colorAlpha) specified.
                if (!visuals) {
                    visuals = controller[state] = {
                        color: isCategory ? inactiveColor : [inactiveColor]
                    };
                }

                // Consistent symbol and symbolSize if not specified.
                if (visuals.symbol == null) {
                    visuals.symbol = symbolExists
                        && zrUtil.clone(symbolExists)
                        || (isCategory ? 'roundRect' : ['roundRect']);
                }
                if (visuals.symbolSize == null) {
                    visuals.symbolSize = symbolSizeExists
                        && zrUtil.clone(symbolSizeExists)
                        || (isCategory ? itemSize[0] : [itemSize[0], itemSize[0]]);
                }

                // Filter square and none.
                visuals.symbol = mapVisual(visuals.symbol, function (symbol) {
                    return (symbol === 'none' || symbol === 'square') ? 'roundRect' : symbol;
                });

                // Normalize symbolSize
                var symbolSize = visuals.symbolSize;

                if (symbolSize != null) {
                    var max = -Infinity;
                    // symbolSize can be object when categories defined.
                    eachVisual(symbolSize, function (value) {
                        value > max && (max = value);
                    });
                    visuals.symbolSize = mapVisual(symbolSize, function (value) {
                        return linearMap(value, [0, max], [0, itemSize[0]], true);
                    });
                }

            }, this);
        }
    },

    /**
     * @protected
     */
    resetItemSize: function () {
        this.itemSize = [
            parseFloat(this.get('itemWidth')),
            parseFloat(this.get('itemHeight'))
        ];
    },

    /**
     * @public
     */
    isCategory: function () {
        return !!this.option.categories;
    },

    /**
     * @public
     * @abstract
     */
    setSelected: noop,

    /**
     * @public
     * @abstract
     * @param {*|module:echarts/data/List} valueOrData
     * @param {number} dataIndex
     * @return {string} state See this.stateList
     */
    getValueState: noop,

    /**
     * FIXME
     * Do not publish to thirt-part-dev temporarily
     * util the interface is stable. (Should it return
     * a function but not visual meta?)
     *
     * @pubilc
     * @abstract
     * @param {Function} getColorVisual
     *        params: value, valueState
     *        return: color
     * @return {Object} visualMeta
     *        should includes {stops, outerColors}
     *        outerColor means [colorBeyondMinValue, colorBeyondMaxValue]
     */
    getVisualMeta: noop

});

export default VisualMapModel;
