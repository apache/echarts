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
import VisualMapModel, { VisualMapOption, VisualMeta } from './VisualMapModel';
import VisualMapping, { VisualMappingOption } from '../../visual/VisualMapping';
import visualDefault from '../../visual/visualDefault';
import {reformIntervals} from '../../util/number';
import { VisualOptionPiecewise, BuiltinVisualProperty } from '../../util/types';
import { Dictionary } from 'zrender/src/core/types';
import { inheritDefaultOption } from '../../util/component';


// TODO: use `relationExpression.ts` instead
interface VisualPiece extends VisualOptionPiecewise {
    min?: number
    max?: number
    lt?: number
    gt?: number
    lte?: number
    gte?: number
    value?: number

    label?: string
}

type VisualState = VisualMapModel['stateList'][number];

type InnerVisualPiece = VisualMappingOption['pieceList'][number];

type GetPieceValueType<T extends InnerVisualPiece>
    = T extends { interval: InnerVisualPiece['interval'] } ? number : string;

/**
 * Order Rule:
 *
 * option.categories / option.pieces / option.text / option.selected:
 *     If !option.inverse,
 *     Order when vertical: ['top', ..., 'bottom'].
 *     Order when horizontal: ['left', ..., 'right'].
 *     If option.inverse, the meaning of
 *     the order should be reversed.
 *
 * this._pieceList:
 *     The order is always [low, ..., high].
 *
 * Mapping from location to low-high:
 *     If !option.inverse
 *     When vertical, top is high.
 *     When horizontal, right is high.
 *     If option.inverse, reverse.
 */

export interface PiecewiseVisualMapOption extends VisualMapOption {
    align?: 'auto' | 'left' | 'right'

    minOpen?: boolean
    maxOpen?: boolean

    /**
     * When put the controller vertically, it is the length of
     * horizontal side of each item. Otherwise, vertical side.
     * When put the controller vertically, it is the length of
     * vertical side of each item. Otherwise, horizontal side.
     */
    itemWidth?: number
    itemHeight?: number

    itemSymbol?: string
    pieces?: VisualPiece[]

    /**
     * category names, like: ['some1', 'some2', 'some3'].
     * Attr min/max are ignored when categories set. See "Order Rule"
     */
    categories?: string[]

    /**
     * If set to 5, auto split five pieces equally.
     * If set to 0 and component type not set, component type will be
     * determined as "continuous". (It is less reasonable but for ec2
     * compatibility, see echarts/component/visualMap/typeDefaulter)
     */
    splitNumber?: number

    /**
     * Object. If not specified, means selected. When pieces and splitNumber: {'0': true, '5': true}
     * When categories: {'cate1': false, 'cate3': true} When selected === false, means all unselected.
     */
    selected?: Dictionary<boolean>
    selectedMode?: 'multiple' | 'single' | boolean

    /**
     * By default, when text is used, label will hide (the logic
     * is remained for compatibility reason)
     */
    showLabel?: boolean

    itemGap?: number

    hoverLink?: boolean
}

class PiecewiseModel extends VisualMapModel<PiecewiseVisualMapOption> {

    static type = 'visualMap.piecewise' as const;
    type = PiecewiseModel.type;

    /**
     * The order is always [low, ..., high].
     * [{text: string, interval: Array.<number>}, ...]
     */
    private _pieceList: InnerVisualPiece[] = [];

    private _mode: 'pieces' | 'categories' | 'splitNumber';

    optionUpdated(newOption: PiecewiseVisualMapOption, isInit?: boolean) {
        super.optionUpdated.apply(this, arguments as any);

        this.resetExtent();

        const mode = this._mode = this._determineMode();

        this._pieceList = [];
        resetMethods[this._mode].call(this, this._pieceList);

        this._resetSelected(newOption, isInit);

        const categories = this.option.categories;

        this.resetVisual(function (mappingOption, state) {
            if (mode === 'categories') {
                mappingOption.mappingMethod = 'category';
                mappingOption.categories = zrUtil.clone(categories);
            }
            else {
                mappingOption.dataExtent = this.getExtent();
                mappingOption.mappingMethod = 'piecewise';
                mappingOption.pieceList = zrUtil.map(this._pieceList, function (piece) {
                    piece = zrUtil.clone(piece);
                    if (state !== 'inRange') {
                        // FIXME
                        // outOfRange do not support special visual in pieces.
                        piece.visual = null;
                    }
                    return piece;
                });
            }
        });
    }

    /**
     * @protected
     * @override
     */
    completeVisualOption() {
        // Consider this case:
        // visualMap: {
        //      pieces: [{symbol: 'circle', lt: 0}, {symbol: 'rect', gte: 0}]
        // }
        // where no inRange/outOfRange set but only pieces. So we should make
        // default inRange/outOfRange for this case, otherwise visuals that only
        // appear in `pieces` will not be taken into account in visual encoding.

        const option = this.option;
        const visualTypesInPieces: {[key in BuiltinVisualProperty]?: 0 | 1} = {};
        const visualTypes = VisualMapping.listVisualTypes();
        const isCategory = this.isCategory();

        zrUtil.each(option.pieces, function (piece) {
            zrUtil.each(visualTypes, function (visualType: BuiltinVisualProperty) {
                if (piece.hasOwnProperty(visualType)) {
                    visualTypesInPieces[visualType] = 1;
                }
            });
        });

        zrUtil.each(visualTypesInPieces, function (v, visualType: BuiltinVisualProperty) {
            let exists = false;
            zrUtil.each(this.stateList, function (state: VisualState) {
                exists = exists || has(option, state, visualType)
                    || has(option.target, state, visualType);
            }, this);

            !exists && zrUtil.each(this.stateList, function (state: VisualState) {
                (option[state] || (option[state] = {}))[visualType] = visualDefault.get(
                    visualType, state === 'inRange' ? 'active' : 'inactive', isCategory
                );
            });
        }, this);

        function has(obj: PiecewiseVisualMapOption['target'], state: VisualState, visualType: BuiltinVisualProperty) {
            return obj && obj[state] && obj[state].hasOwnProperty(visualType);
        }

        super.completeVisualOption.apply(this, arguments as any);
    }

    private _resetSelected(newOption: PiecewiseVisualMapOption, isInit?: boolean) {
        const thisOption = this.option;
        const pieceList = this._pieceList;

        // Selected do not merge but all override.
        const selected = (isInit ? thisOption : newOption).selected || {};
        thisOption.selected = selected;

        // Consider 'not specified' means true.
        zrUtil.each(pieceList, function (piece, index) {
            const key = this.getSelectedMapKey(piece);
            if (!selected.hasOwnProperty(key)) {
                selected[key] = true;
            }
        }, this);

        if (thisOption.selectedMode === 'single') {
            // Ensure there is only one selected.
            let hasSel = false;

            zrUtil.each(pieceList, function (piece, index) {
                const key = this.getSelectedMapKey(piece);
                if (selected[key]) {
                    hasSel
                        ? (selected[key] = false)
                        : (hasSel = true);
                }
            }, this);
        }
        // thisOption.selectedMode === 'multiple', default: all selected.
    }

    /**
     * @public
     */
    getItemSymbol(): string {
        return this.get('itemSymbol');
    }

    /**
     * @public
     */
    getSelectedMapKey(piece: InnerVisualPiece) {
        return this._mode === 'categories'
            ? piece.value + '' : piece.index + '';
    }

    /**
     * @public
     */
    getPieceList(): InnerVisualPiece[] {
        return this._pieceList;
    }

    /**
     * @return {string}
     */
    private _determineMode() {
        const option = this.option;

        return option.pieces && option.pieces.length > 0
            ? 'pieces'
            : this.option.categories
            ? 'categories'
            : 'splitNumber';
    }

    /**
     * @override
     */
    setSelected(selected: this['option']['selected']) {
        this.option.selected = zrUtil.clone(selected);
    }

    /**
     * @override
     */
    getValueState(value: number): VisualState {
        const index = VisualMapping.findPieceIndex(value, this._pieceList);

        return index != null
            ? (this.option.selected[this.getSelectedMapKey(this._pieceList[index])]
                ? 'inRange' : 'outOfRange'
            )
            : 'outOfRange';
    }

    /**
     * @public
     * @param pieceIndex piece index in visualMapModel.getPieceList()
     */
    findTargetDataIndices(pieceIndex: number) {
        type DataIndices = {
            seriesId: string
            dataIndex: number[]
        };

        const result: DataIndices[] = [];
        const pieceList = this._pieceList;

        this.eachTargetSeries(function (seriesModel) {
            const dataIndices: number[] = [];
            const data = seriesModel.getData();

            data.each(this.getDataDimensionIndex(data), function (value: number, dataIndex: number) {
                // Should always base on model pieceList, because it is order sensitive.
                const pIdx = VisualMapping.findPieceIndex(value, pieceList);
                pIdx === pieceIndex && dataIndices.push(dataIndex);
            }, this);

            result.push({seriesId: seriesModel.id, dataIndex: dataIndices});
        }, this);

        return result;
    }

    /**
     * @private
     * @param piece piece.value or piece.interval is required.
     * @return  Can be Infinity or -Infinity
     */
    getRepresentValue(piece: InnerVisualPiece) {
        let representValue;
        if (this.isCategory()) {
            representValue = piece.value;
        }
        else {
            if (piece.value != null) {
                representValue = piece.value;
            }
            else {
                const pieceInterval = piece.interval || [];
                representValue = (pieceInterval[0] === -Infinity && pieceInterval[1] === Infinity)
                    ? 0
                    : (pieceInterval[0] + pieceInterval[1]) / 2;
            }
        }

        return representValue;
    }

    getVisualMeta(
        getColorVisual: (value: number, valueState: VisualState) => string
    ): VisualMeta {
        // Do not support category. (category axis is ordinal, numerical)
        if (this.isCategory()) {
            return;
        }

        const stops: VisualMeta['stops'] = [];
        const outerColors: VisualMeta['outerColors'] = ['', ''];
        const visualMapModel = this;

        function setStop(interval: [number, number], valueState?: VisualState) {
            const representValue = visualMapModel.getRepresentValue({
                interval: interval
            }) as number;// Not category
            if (!valueState) {
                valueState = visualMapModel.getValueState(representValue);
            }
            const color = getColorVisual(representValue, valueState);
            if (interval[0] === -Infinity) {
                outerColors[0] = color;
            }
            else if (interval[1] === Infinity) {
                outerColors[1] = color;
            }
            else {
                stops.push(
                    {value: interval[0], color: color},
                    {value: interval[1], color: color}
                );
            }
        }

        // Suplement
        const pieceList = this._pieceList.slice();
        if (!pieceList.length) {
            pieceList.push({interval: [-Infinity, Infinity]});
        }
        else {
            let edge = pieceList[0].interval[0];
            edge !== -Infinity && pieceList.unshift({interval: [-Infinity, edge]});
            edge = pieceList[pieceList.length - 1].interval[1];
            edge !== Infinity && pieceList.push({interval: [edge, Infinity]});
        }

        let curr = -Infinity;
        zrUtil.each(pieceList, function (piece) {
            const interval = piece.interval;
            if (interval) {
                // Fulfill gap.
                interval[0] > curr && setStop([curr, interval[0]], 'outOfRange');
                setStop(interval.slice() as [number, number]);
                curr = interval[1];
            }
        }, this);

        return {stops: stops, outerColors: outerColors};
    }


    static defaultOption = inheritDefaultOption(VisualMapModel.defaultOption, {
        selected: null,
        minOpen: false,             // Whether include values that smaller than `min`.
        maxOpen: false,             // Whether include values that bigger than `max`.

        align: 'auto',              // 'auto', 'left', 'right'
        itemWidth: 20,

        itemHeight: 14,

        itemSymbol: 'roundRect',
        pieces: null,
        categories: null,
        splitNumber: 5,
        selectedMode: 'multiple',   // Can be 'multiple' or 'single'.
        itemGap: 10,                // The gap between two items, in px.
        hoverLink: true             // Enable hover highlight.
    }) as PiecewiseVisualMapOption;

};

type ResetMethod = (outPieceList: InnerVisualPiece[]) => void;
/**
 * Key is this._mode
 * @type {Object}
 * @this {module:echarts/component/viusalMap/PiecewiseMode}
 */
const resetMethods: Dictionary<ResetMethod> & ThisType<PiecewiseModel> = {

    splitNumber(outPieceList) {
        const thisOption = this.option;
        let precision = Math.min(thisOption.precision, 20);
        const dataExtent = this.getExtent();
        let splitNumber = thisOption.splitNumber;
        splitNumber = Math.max(parseInt(splitNumber as unknown as string, 10), 1);
        thisOption.splitNumber = splitNumber;

        let splitStep = (dataExtent[1] - dataExtent[0]) / splitNumber;
        // Precision auto-adaption
        while (+splitStep.toFixed(precision) !== splitStep && precision < 5) {
            precision++;
        }
        thisOption.precision = precision;
        splitStep = +splitStep.toFixed(precision);

        if (thisOption.minOpen) {
            outPieceList.push({
                interval: [-Infinity, dataExtent[0]],
                close: [0, 0]
            });
        }

        for (
            let index = 0, curr = dataExtent[0];
            index < splitNumber;
            curr += splitStep, index++
        ) {
            const max = index === splitNumber - 1 ? dataExtent[1] : (curr + splitStep);

            outPieceList.push({
                interval: [curr, max],
                close: [1, 1]
            });
        }

        if (thisOption.maxOpen) {
            outPieceList.push({
                interval: [dataExtent[1], Infinity],
                close: [0, 0]
            });
        }

        reformIntervals(outPieceList as Required<InnerVisualPiece>[]);

        zrUtil.each(outPieceList, function (piece, index) {
            piece.index = index;
            piece.text = this.formatValueText(piece.interval);
        }, this);
    },

    categories(outPieceList) {
        const thisOption = this.option;
        zrUtil.each(thisOption.categories, function (cate) {
            // FIXME category模式也使用pieceList，但在visualMapping中不是使用pieceList。
            // 是否改一致。
            outPieceList.push({
                text: this.formatValueText(cate, true),
                value: cate
            });
        }, this);

        // See "Order Rule".
        normalizeReverse(thisOption, outPieceList);
    },

    pieces(outPieceList) {
        const thisOption = this.option;

        zrUtil.each(thisOption.pieces, function (pieceListItem, index) {

            if (!zrUtil.isObject(pieceListItem)) {
                pieceListItem = {value: pieceListItem};
            }

            const item: InnerVisualPiece = {text: '', index: index};

            if (pieceListItem.label != null) {
                item.text = pieceListItem.label;
            }

            if (pieceListItem.hasOwnProperty('value')) {
                const value = item.value = pieceListItem.value;
                item.interval = [value, value];
                item.close = [1, 1];
            }
            else {
                // `min` `max` is legacy option.
                // `lt` `gt` `lte` `gte` is recommended.
                const interval = item.interval = [] as unknown as [number, number];
                const close: typeof item.close = item.close = [0, 0];

                const closeList = [1, 0, 1] as const;
                const infinityList = [-Infinity, Infinity];

                const useMinMax = [];
                for (let lg = 0; lg < 2; lg++) {
                    const names = ([['gte', 'gt', 'min'], ['lte', 'lt', 'max']] as const)[lg];
                    for (let i = 0; i < 3 && interval[lg] == null; i++) {
                        interval[lg] = pieceListItem[names[i]];
                        close[lg] = closeList[i];
                        useMinMax[lg] = i === 2;
                    }
                    interval[lg] == null && (interval[lg] = infinityList[lg]);
                }
                useMinMax[0] && interval[1] === Infinity && (close[0] = 0);
                useMinMax[1] && interval[0] === -Infinity && (close[1] = 0);

                if (__DEV__) {
                    if (interval[0] > interval[1]) {
                        console.warn(
                            'Piece ' + index + 'is illegal: ' + interval
                            + ' lower bound should not greater then uppper bound.'
                        );
                    }
                }

                if (interval[0] === interval[1] && close[0] && close[1]) {
                    // Consider: [{min: 5, max: 5, visual: {...}}, {min: 0, max: 5}],
                    // we use value to lift the priority when min === max
                    item.value = interval[0];
                }
            }

            item.visual = VisualMapping.retrieveVisuals(pieceListItem);

            outPieceList.push(item);

        }, this);

        // See "Order Rule".
        normalizeReverse(thisOption, outPieceList);
        // Only pieces
        reformIntervals(outPieceList as Required<InnerVisualPiece>[]);

        zrUtil.each(outPieceList, function (piece) {
            const close = piece.close;
            const edgeSymbols = [['<', '≤'][close[1]], ['>', '≥'][close[0]]];
            piece.text = piece.text || this.formatValueText(
                piece.value != null ? piece.value : piece.interval,
                false,
                edgeSymbols
            );
        }, this);
    }
};

function normalizeReverse(thisOption: PiecewiseVisualMapOption, pieceList: InnerVisualPiece[]) {
    const inverse = thisOption.inverse;
    if (thisOption.orient === 'vertical' ? !inverse : inverse) {
            pieceList.reverse();
    }
}

export default PiecewiseModel;
