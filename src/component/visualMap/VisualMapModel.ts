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

import * as zrUtil from 'zrender/src/core/util';
import visualDefault from '../../visual/visualDefault';
import VisualMapping, { VisualMappingOption } from '../../visual/VisualMapping';
import * as visualSolution from '../../visual/visualSolution';
import * as modelUtil from '../../util/model';
import * as numberUtil from '../../util/number';
import {
    ComponentOption,
    BoxLayoutOptionMixin,
    LabelOption,
    ColorString,
    ZRColor,
    BorderOptionMixin,
    OptionDataValue,
    BuiltinVisualProperty,
    DimensionIndex
} from '../../util/types';
import ComponentModel from '../../model/Component';
import Model from '../../model/Model';
import GlobalModel from '../../model/Global';
import SeriesModel from '../../model/Series';
import SeriesData from '../../data/SeriesData';

const mapVisual = VisualMapping.mapVisual;
const eachVisual = VisualMapping.eachVisual;
const isArray = zrUtil.isArray;
const each = zrUtil.each;
const asc = numberUtil.asc;
const linearMap = numberUtil.linearMap;

type VisualOptionBase = {[key in BuiltinVisualProperty]?: any};

type LabelFormatter = (min: OptionDataValue, max?: OptionDataValue) => string;

type VisualState = VisualMapModel['stateList'][number];
export interface VisualMapOption<T extends VisualOptionBase = VisualOptionBase> extends
    ComponentOption,
    BoxLayoutOptionMixin,
    BorderOptionMixin {

    mainType?: 'visualMap'

    show?: boolean

    align?: string

    realtime?: boolean
    /**
     * 'all' or null/undefined: all series.
     * A number or an array of number: the specified series.
     * set min: 0, max: 200, only for campatible with ec2.
     * In fact min max should not have default value.
     */
    seriesIndex?: 'all' | number[] | number

    /**
     * min value, must specified if pieces is not specified.
     */
    min?: number

    /**
     * max value, must specified if pieces is not specified.
     */
    max?: number
    /**
     * Dimension to be encoded
     */
    dimension?: number

    /**
     * Visual configuration for the data in selection
     */
    inRange?: T
    /**
     * Visual configuration for the out of selection
     */
    outOfRange?: T

    controller?: {
        inRange?: T
        outOfRange?: T
    }
    target?: {
        inRange?: T
        outOfRange?: T
    }

    /**
     * Width of the display item
     */
    itemWidth?: number
    /**
     * Height of the display item
     */
    itemHeight?: number

    inverse?: boolean

    orient?: 'horizontal' | 'vertical'

    backgroundColor?: ZRColor
    contentColor?: ZRColor

    inactiveColor?: ZRColor

    /**
     * Padding of the component. Can be an array similar to CSS
     */
    padding?: number[] | number
    /**
     * Gap between text and item
     */
    textGap?: number

    precision?: number

    /**
     * @deprecated
     * Option from version 2
     */
    color?: ColorString[]

    formatter?: string | LabelFormatter

    /**
     * Text on the both end. Such as ['High', 'Low']
     */
    text?: string[]

    textStyle?: LabelOption


    categories?: unknown
}

export interface VisualMeta {
    stops: { value: number, color: ColorString}[]
    outerColors: ColorString[]

    dimension?: DimensionIndex
}

class VisualMapModel<Opts extends VisualMapOption = VisualMapOption> extends ComponentModel<Opts> {

    static type = 'visualMap';
    type = VisualMapModel.type;

    static readonly dependencies = ['series'];

    readonly stateList = ['inRange', 'outOfRange'] as const;

    readonly replacableOptionKeys = [
        'inRange', 'outOfRange', 'target', 'controller', 'color'
    ] as const;

    readonly layoutMode = {
        type: 'box', ignoreSize: true
    } as const;

    /**
     * [lowerBound, upperBound]
     */
    dataBound = [-Infinity, Infinity];

    protected _dataExtent: [number, number];

    targetVisuals = {} as ReturnType<typeof visualSolution.createVisualMappings>;

    controllerVisuals = {} as ReturnType<typeof visualSolution.createVisualMappings>;

    textStyleModel: Model<LabelOption>;

    itemSize: number[];

    init(option: Opts, parentModel: Model, ecModel: GlobalModel) {
        this.mergeDefaultAndTheme(option, ecModel);
    }

    /**
     * @protected
     */
    optionUpdated(newOption: Opts, isInit?: boolean) {
        const thisOption = this.option;

        !isInit && visualSolution.replaceVisualOption(
            thisOption, newOption, this.replacableOptionKeys
        );

        this.textStyleModel = this.getModel('textStyle');

        this.resetItemSize();

        this.completeVisualOption();
    }

    /**
     * @protected
     */
    resetVisual(
        supplementVisualOption: (this: this, mappingOption: VisualMappingOption, state: string) => void
    ) {
        const stateList = this.stateList;
        supplementVisualOption = zrUtil.bind(supplementVisualOption, this);

        this.controllerVisuals = visualSolution.createVisualMappings(
            this.option.controller, stateList, supplementVisualOption
        );
        this.targetVisuals = visualSolution.createVisualMappings(
            this.option.target, stateList, supplementVisualOption
        );
    }

    /**
     * @public
     */
    getItemSymbol(): string {
        return null;
    }

    /**
     * @protected
     * @return {Array.<number>} An array of series indices.
     */
    getTargetSeriesIndices() {
        const optionSeriesIndex = this.option.seriesIndex;
        let seriesIndices: number[] = [];

        if (optionSeriesIndex == null || optionSeriesIndex === 'all') {
            this.ecModel.eachSeries(function (seriesModel, index) {
                seriesIndices.push(index);
            });
        }
        else {
            seriesIndices = modelUtil.normalizeToArray(optionSeriesIndex);
        }

        return seriesIndices;
    }

    /**
     * @public
     */
    eachTargetSeries<Ctx>(
        callback: (this: Ctx, series: SeriesModel) => void,
        context?: Ctx
    ) {
        zrUtil.each(this.getTargetSeriesIndices(), function (seriesIndex) {
            const seriesModel = this.ecModel.getSeriesByIndex(seriesIndex);
            if (seriesModel) {
                callback.call(context, seriesModel);
            }
        }, this);
    }

    /**
     * @pubilc
     */
    isTargetSeries(seriesModel: SeriesModel) {
        let is = false;
        this.eachTargetSeries(function (model) {
            model === seriesModel && (is = true);
        });
        return is;
    }

    /**
     * @example
     * this.formatValueText(someVal); // format single numeric value to text.
     * this.formatValueText(someVal, true); // format single category value to text.
     * this.formatValueText([min, max]); // format numeric min-max to text.
     * this.formatValueText([this.dataBound[0], max]); // using data lower bound.
     * this.formatValueText([min, this.dataBound[1]]); // using data upper bound.
     *
     * @param value Real value, or this.dataBound[0 or 1].
     * @param isCategory Only available when value is number.
     * @param edgeSymbols Open-close symbol when value is interval.
     * @protected
     */
    formatValueText(
        value: number | string | number[],
        isCategory?: boolean,
        edgeSymbols?: string[]
    ): string {
        const option = this.option;
        const precision = option.precision;
        const dataBound = this.dataBound;
        const formatter = option.formatter;
        let isMinMax: boolean;
        edgeSymbols = edgeSymbols || ['<', '>'] as [string, string];

        if (zrUtil.isArray(value)) {
            value = value.slice();
            isMinMax = true;
        }

        const textValue = isCategory
            ? value as string   // Value is string when isCategory
            : (isMinMax
                ? [toFixed((value as number[])[0]), toFixed((value as number[])[1])]
                : toFixed(value as number)
            );

        if (zrUtil.isString(formatter)) {
            return formatter
                .replace('{value}', isMinMax ? (textValue as string[])[0] : textValue as string)
                .replace('{value2}', isMinMax ? (textValue as string[])[1] : textValue as string);
        }
        else if (zrUtil.isFunction(formatter)) {
            return isMinMax
                ? formatter((value as number[])[0], (value as number[])[1])
                : formatter(value as number);
        }

        if (isMinMax) {
            if ((value as number[])[0] === dataBound[0]) {
                return edgeSymbols[0] + ' ' + textValue[1];
            }
            else if ((value as number[])[1] === dataBound[1]) {
                return edgeSymbols[1] + ' ' + textValue[0];
            }
            else {
                return textValue[0] + ' - ' + textValue[1];
            }
        }
        else { // Format single value (includes category case).
            return textValue as string;
        }

        function toFixed(val: number) {
            return val === dataBound[0]
                ? 'min'
                : val === dataBound[1]
                ? 'max'
                : (+val).toFixed(Math.min(precision, 20));
        }
    }

    /**
     * @protected
     */
    resetExtent() {
        const thisOption = this.option;

        // Can not calculate data extent by data here.
        // Because series and data may be modified in processing stage.
        // So we do not support the feature "auto min/max".

        const extent = asc([thisOption.min, thisOption.max] as [number, number]);

        this._dataExtent = extent;
    }

    /**
     * PENDING:
     * delete this method if no outer usage.
     *
     * Return  Concrete dimension. If null/undefined is returned, no dimension is used.
     */
    // getDataDimension(data: SeriesData) {
    //     const optDim = this.option.dimension;

    //     if (optDim != null) {
    //         return data.getDimension(optDim);
    //     }

    //     const dimNames = data.dimensions;
    //     for (let i = dimNames.length - 1; i >= 0; i--) {
    //         const dimName = dimNames[i];
    //         const dimInfo = data.getDimensionInfo(dimName);
    //         if (!dimInfo.isCalculationCoord) {
    //             return dimName;
    //         }
    //     }
    // }

    getDataDimensionIndex(data: SeriesData): DimensionIndex {
        const optDim = this.option.dimension;

        if (optDim != null) {
            return data.getDimensionIndex(optDim);
        }

        const dimNames = data.dimensions;
        for (let i = dimNames.length - 1; i >= 0; i--) {
            const dimName = dimNames[i];
            const dimInfo = data.getDimensionInfo(dimName);
            if (!dimInfo.isCalculationCoord) {
                return dimInfo.storeDimIndex;
            }
        }
    }

    getExtent() {
        return this._dataExtent.slice() as [number, number];
    }

    completeVisualOption() {

        const ecModel = this.ecModel;
        const thisOption = this.option;
        const base = {
            inRange: thisOption.inRange,
            outOfRange: thisOption.outOfRange
        };

        const target = thisOption.target || (thisOption.target = {});
        const controller = thisOption.controller || (thisOption.controller = {});

        zrUtil.merge(target, base); // Do not override
        zrUtil.merge(controller, base); // Do not override

        const isCategory = this.isCategory();

        completeSingle.call(this, target);
        completeSingle.call(this, controller);
        completeInactive.call(this, target, 'inRange', 'outOfRange');
        // completeInactive.call(this, target, 'outOfRange', 'inRange');
        completeController.call(this, controller);

        function completeSingle(this: VisualMapModel, base: VisualMapOption['target']) {
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

            // Compatible with previous logic, always give a default color, otherwise
            // simple config with no inRange and outOfRange will not work.
            // Originally we use visualMap.color as the default color, but setOption at
            // the second time the default color will be erased. So we change to use
            // constant DEFAULT_COLOR.
            // If user do not want the default color, set inRange: {color: null}.
            base.inRange = base.inRange || {color: ecModel.get('gradientColor')};
        }

        function completeInactive(
            this: VisualMapModel,
            base: VisualMapOption['target'],
            stateExist: VisualState,
            stateAbsent: VisualState
        ) {
            const optExist = base[stateExist];
            let optAbsent = base[stateAbsent];

            if (optExist && !optAbsent) {
                optAbsent = base[stateAbsent] = {};
                each(optExist, function (visualData, visualType: BuiltinVisualProperty) {
                    if (!VisualMapping.isValidType(visualType)) {
                        return;
                    }

                    const defa = visualDefault.get(visualType, 'inactive', isCategory);

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

        function completeController(this: VisualMapModel, controller?: VisualMapOption['controller']) {
            const symbolExists = (controller.inRange || {}).symbol
                || (controller.outOfRange || {}).symbol;
            const symbolSizeExists = (controller.inRange || {}).symbolSize
                || (controller.outOfRange || {}).symbolSize;
            const inactiveColor = this.get('inactiveColor');
            const itemSymbol = this.getItemSymbol();
            const defaultSymbol = itemSymbol || 'roundRect';

            each(this.stateList, function (state: VisualState) {

                const itemSize = this.itemSize;
                let visuals = controller[state];

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
                        || (isCategory ? defaultSymbol : [defaultSymbol]);
                }
                if (visuals.symbolSize == null) {
                    visuals.symbolSize = symbolSizeExists
                        && zrUtil.clone(symbolSizeExists)
                        || (isCategory ? itemSize[0] : [itemSize[0], itemSize[0]]);
                }

                // Filter none
                visuals.symbol = mapVisual(visuals.symbol, function (symbol) {
                    return symbol === 'none' ? defaultSymbol : symbol;
                });

                // Normalize symbolSize
                const symbolSize = visuals.symbolSize;

                if (symbolSize != null) {
                    let max = -Infinity;
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
    }

    resetItemSize() {
        this.itemSize = [
            parseFloat(this.get('itemWidth') as unknown as string),
            parseFloat(this.get('itemHeight') as unknown as string)
        ];
    }

    isCategory() {
        return !!this.option.categories;
    }

    /**
     * @public
     * @abstract
     */
    setSelected(selected?: any) {}

    getSelected(): any {
        return null;
    }

    /**
     * @public
     * @abstract
     */
    getValueState(value: any): VisualMapModel['stateList'][number] {
        return null;
    }

    /**
     * FIXME
     * Do not publish to thirt-part-dev temporarily
     * util the interface is stable. (Should it return
     * a function but not visual meta?)
     *
     * @pubilc
     * @abstract
     * @param getColorVisual
     *        params: value, valueState
     *        return: color
     * @return {Object} visualMeta
     *        should includes {stops, outerColors}
     *        outerColor means [colorBeyondMinValue, colorBeyondMaxValue]
     */
    getVisualMeta(getColorVisual: (value: number, valueState: VisualState) => string): VisualMeta {
        return null;
    }


    static defaultOption: VisualMapOption = {
        show: true,

        // zlevel: 0,
        z: 4,

        seriesIndex: 'all',

        min: 0,
        max: 200,

        left: 0,
        right: null,
        top: null,
        bottom: 0,

        itemWidth: null,
        itemHeight: null,
        inverse: false,
        orient: 'vertical',        // 'horizontal' ¦ 'vertical'

        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#ccc',       // 值域边框颜色
        contentColor: '#5793f3',
        inactiveColor: '#aaa',
        borderWidth: 0,
        padding: 5,
                                    // 接受数组分别设定上右下左边距，同css
        textGap: 10,               //
        precision: 0,              // 小数精度，默认为0，无小数点

        textStyle: {
            color: '#333'          // 值域文字颜色
        }
    };
}

export default VisualMapModel;
