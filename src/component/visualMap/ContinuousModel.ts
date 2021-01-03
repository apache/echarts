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
import * as numberUtil from '../../util/number';
import { VisualMappingOption } from '../../visual/VisualMapping';
import { inheritDefaultOption } from '../../util/component';
import { ItemStyleOption } from '../../util/types';

// Constant
const DEFAULT_BAR_BOUND = [20, 140];

type RangeWithAuto = {
    auto?: 0 | 1
};

type VisualState = VisualMapModel['stateList'][number];

export interface ContinousVisualMapOption extends VisualMapOption {

    align?: 'auto' | 'left' | 'right' | 'top' | 'bottom'

    /**
     * This prop effect default component type determine
     * @see echarts/component/visualMap/typeDefaulter.
     */
    calculable?: boolean

    /**
     * selected range. In default case `range` is [min, max]
     * and can auto change along with modification of min max,
     * util user specifid a range.
     */
    range?: number[]
    /**
     * Whether to enable hover highlight.
     */
    hoverLink?: boolean

    /**
     * The extent of hovered data.
     */
    hoverLinkDataSize?: number
    /**
     * Whether trigger hoverLink when hover handle.
     * If not specified, follow the value of `realtime`.
     */
    hoverLinkOnHandle?: boolean,

    handleIcon?: string,
    // Percent of the item width
    handleSize?: string | number,
    handleStyle?: ItemStyleOption

    indicatorIcon?: string,
    // Percent of the item width
    indicatorSize?: string | number,
    indicatorStyle?: ItemStyleOption

    emphasis?: {
        handleStyle?: ItemStyleOption
    }
}

class ContinuousModel extends VisualMapModel<ContinousVisualMapOption> {

    static type = 'visualMap.continuous' as const;
    type = ContinuousModel.type;

    /**
     * @override
     */
    optionUpdated(newOption: ContinousVisualMapOption, isInit: boolean) {
        super.optionUpdated.apply(this, arguments as any);

        this.resetExtent();

        this.resetVisual(function (mappingOption?: VisualMappingOption) {
            mappingOption.mappingMethod = 'linear';
            mappingOption.dataExtent = this.getExtent();
        });

        this._resetRange();
    }

    /**
     * @protected
     * @override
     */
    resetItemSize() {
        super.resetItemSize.apply(this, arguments as any);

        const itemSize = this.itemSize;

        (itemSize[0] == null || isNaN(itemSize[0])) && (itemSize[0] = DEFAULT_BAR_BOUND[0]);
        (itemSize[1] == null || isNaN(itemSize[1])) && (itemSize[1] = DEFAULT_BAR_BOUND[1]);
    }

    /**
     * @private
     */
    _resetRange() {
        const dataExtent = this.getExtent();
        const range = this.option.range;

        if (!range || (range as RangeWithAuto).auto) {
            // `range` should always be array (so we dont use other
            // value like 'auto') for user-friend. (consider getOption).
            (dataExtent as RangeWithAuto).auto = 1;
            this.option.range = dataExtent;
        }
        else if (zrUtil.isArray(range)) {
            if (range[0] > range[1]) {
                range.reverse();
            }
            range[0] = Math.max(range[0], dataExtent[0]);
            range[1] = Math.min(range[1], dataExtent[1]);
        }
    }

    /**
     * @protected
     * @override
     */
    completeVisualOption() {
        super.completeVisualOption.apply(this, arguments as any);

        zrUtil.each(this.stateList, function (state: VisualState) {
            const symbolSize = this.option.controller[state].symbolSize;
            if (symbolSize && symbolSize[0] !== symbolSize[1]) {
                symbolSize[0] = symbolSize[1] / 3; // For good looking.
            }
        }, this);
    }

    /**
     * @override
     */
    setSelected(selected: number[]) {
        this.option.range = selected.slice();
        this._resetRange();
    }

    /**
     * @public
     */
    getSelected(): [number, number] {
        const dataExtent = this.getExtent();

        const dataInterval = numberUtil.asc(
            (this.get('range') || []).slice()
        ) as [number, number];

        // Clamp
        dataInterval[0] > dataExtent[1] && (dataInterval[0] = dataExtent[1]);
        dataInterval[1] > dataExtent[1] && (dataInterval[1] = dataExtent[1]);
        dataInterval[0] < dataExtent[0] && (dataInterval[0] = dataExtent[0]);
        dataInterval[1] < dataExtent[0] && (dataInterval[1] = dataExtent[0]);

        return dataInterval;
    }

    /**
     * @override
     */
    getValueState(value: number): VisualState {
        const range = this.option.range;
        const dataExtent = this.getExtent();

        // When range[0] === dataExtent[0], any value larger than dataExtent[0] maps to 'inRange'.
        // range[1] is processed likewise.
        return (
            (range[0] <= dataExtent[0] || range[0] <= value)
            && (range[1] >= dataExtent[1] || value <= range[1])
        ) ? 'inRange' : 'outOfRange';
    }

    findTargetDataIndices(range: number[]) {
        type DataIndices = {
            seriesId: string
            dataIndex: number[]
        };
        const result: DataIndices[] = [];

        this.eachTargetSeries(function (seriesModel) {
            const dataIndices: number[] = [];
            const data = seriesModel.getData();

            data.each(this.getDataDimension(data), function (value, dataIndex) {
                range[0] <= value && value <= range[1] && dataIndices.push(dataIndex);
            }, this);

            result.push({
                seriesId: seriesModel.id,
                dataIndex: dataIndices
            });
        }, this);

        return result;
    }

    /**
     * @implement
     */
    getVisualMeta(
        getColorVisual: (value: number, valueState: VisualState) => string
    ) {
        type ColorStop = VisualMeta['stops'][number];
        const oVals = getColorStopValues(this, 'outOfRange', this.getExtent());
        const iVals = getColorStopValues(this, 'inRange', this.option.range.slice());
        const stops: ColorStop[] = [];

        function setStop(value: number, valueState: VisualState) {
            stops.push({
                value: value,
                color: getColorVisual(value, valueState)
            });
        }

        // Format to: outOfRange -- inRange -- outOfRange.
        let iIdx = 0;
        let oIdx = 0;
        const iLen = iVals.length;
        const oLen = oVals.length;

        for (; oIdx < oLen && (!iVals.length || oVals[oIdx] <= iVals[0]); oIdx++) {
            // If oVal[oIdx] === iVals[iIdx], oVal[oIdx] should be ignored.
            if (oVals[oIdx] < iVals[iIdx]) {
                setStop(oVals[oIdx], 'outOfRange');
            }
        }
        for (let first = 1; iIdx < iLen; iIdx++, first = 0) {
            // If range is full, value beyond min, max will be clamped.
            // make a singularity
            first && stops.length && setStop(iVals[iIdx], 'outOfRange');
            setStop(iVals[iIdx], 'inRange');
        }
        for (let first = 1; oIdx < oLen; oIdx++) {
            if (!iVals.length || iVals[iVals.length - 1] < oVals[oIdx]) {
                // make a singularity
                if (first) {
                    stops.length && setStop(stops[stops.length - 1].value, 'outOfRange');
                    first = 0;
                }
                setStop(oVals[oIdx], 'outOfRange');
            }
        }

        const stopsLen = stops.length;

        return {
            stops: stops,
            outerColors: [
                stopsLen ? stops[0].color : 'transparent',
                stopsLen ? stops[stopsLen - 1].color : 'transparent'
            ] as VisualMeta['outerColors']
        };
    }

    static defaultOption = inheritDefaultOption(VisualMapModel.defaultOption, {
        align: 'auto',           // 'auto', 'left', 'right', 'top', 'bottom'
        calculable: false,
        hoverLink: true,
        realtime: true,

        handleIcon: 'path://M-11.39,9.77h0a3.5,3.5,0,0,1-3.5,3.5h-22a3.5,3.5,0,0,1-3.5-3.5h0a3.5,3.5,0,0,1,3.5-3.5h22A3.5,3.5,0,0,1-11.39,9.77Z',
        handleSize: '120%',

        handleStyle: {
            borderColor: '#fff',
            borderWidth: 1
        },

        indicatorIcon: 'circle',
        indicatorSize: '50%',
        indicatorStyle: {
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 2,
            shadowOffsetX: 1,
            shadowOffsetY: 1,
            shadowColor: 'rgba(0,0,0,0.2)'
        }
        // emphasis: {
        //     handleStyle: {
        //         shadowBlur: 3,
        //         shadowOffsetX: 1,
        //         shadowOffsetY: 1,
        //         shadowColor: 'rgba(0,0,0,0.2)'
        //     }
        // }
    }) as ContinousVisualMapOption;
}


function getColorStopValues(
    visualMapModel: ContinuousModel,
    valueState: VisualState,
    dataExtent: number[]
) {
    if (dataExtent[0] === dataExtent[1]) {
        return dataExtent.slice();
    }

    // When using colorHue mapping, it is not linear color any more.
    // Moreover, canvas gradient seems not to be accurate linear.
    // FIXME
    // Should be arbitrary value 100? or based on pixel size?
    const count = 200;
    const step = (dataExtent[1] - dataExtent[0]) / count;

    let value = dataExtent[0];
    const stopValues = [];
    for (let i = 0; i <= count && value < dataExtent[1]; i++) {
        stopValues.push(value);
        value += step;
    }
    stopValues.push(dataExtent[1]);

    return stopValues;
}

export default ContinuousModel;
