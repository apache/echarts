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
import {retrieveRawValue} from '../../data/helper/dataProvider';
import {formatTpl} from '../../util/format';
import {
    DataHost,
    DisplayState,
    CallbackDataParams,
    ColorString,
    ZRColor,
    OptionDataValue,
    SeriesDataType,
    ComponentMainType,
    ComponentSubType,
    DimensionLoose,
    InterpolatableValue
} from '../../util/types';
import GlobalModel from '../Global';
import { TooltipMarkupBlockFragment } from '../../component/tooltip/tooltipMarkup';
import { error, makePrintable } from '../../util/log';

const DIMENSION_LABEL_REG = /\{@(.+?)\}/g;


export interface DataFormatMixin extends DataHost {
    ecModel: GlobalModel;
    mainType: ComponentMainType;
    subType: ComponentSubType;
    componentIndex: number;
    id: string;
    name: string;
    animatedValue: OptionDataValue[];
}

export class DataFormatMixin {

    /**
     * Get params for formatter
     */
    getDataParams(
        dataIndex: number,
        dataType?: SeriesDataType
    ): CallbackDataParams {

        const data = this.getData(dataType);
        const rawValue = this.getRawValue(dataIndex, dataType);
        const rawDataIndex = data.getRawIndex(dataIndex);
        const name = data.getName(dataIndex);
        const itemOpt = data.getRawDataItem(dataIndex);
        const style = data.getItemVisual(dataIndex, 'style');
        const color = style && style[data.getItemVisual(dataIndex, 'drawType') || 'fill'] as ZRColor;
        const borderColor = style && style.stroke as ColorString;
        const mainType = this.mainType;
        const isSeries = mainType === 'series';
        const userOutput = data.userOutput && data.userOutput.get();

        return {
            componentType: mainType,
            componentSubType: this.subType,
            componentIndex: this.componentIndex,
            seriesType: isSeries ? this.subType : null,
            seriesIndex: (this as any).seriesIndex,
            seriesId: isSeries ? this.id : null,
            seriesName: isSeries ? this.name : null,
            name: name,
            dataIndex: rawDataIndex,
            data: itemOpt,
            dataType: dataType,
            value: rawValue,
            color: color,
            borderColor: borderColor,
            dimensionNames: userOutput ? userOutput.fullDimensions : null,
            encode: userOutput ? userOutput.encode : null,

            // Param name list for mapping `a`, `b`, `c`, `d`, `e`
            $vars: ['seriesName', 'name', 'value']
        };
    }

    /**
     * Format label
     * @param dataIndex
     * @param status 'normal' by default
     * @param dataType
     * @param labelDimIndex Only used in some chart that
     *        use formatter in different dimensions, like radar.
     * @param formatter Formatter given outside.
     * @return return null/undefined if no formatter
     */
    getFormattedLabel(
        dataIndex: number,
        status?: DisplayState,
        dataType?: SeriesDataType,
        labelDimIndex?: number,
        formatter?: string | ((params: object) => string),
        extendParams?: {
            interpolatedValue: InterpolatableValue
        }
    ): string {
        status = status || 'normal';
        const data = this.getData(dataType);

        const params = this.getDataParams(dataIndex, dataType);

        if (extendParams) {
            params.value = extendParams.interpolatedValue;
        }

        if (labelDimIndex != null && zrUtil.isArray(params.value)) {
            params.value = params.value[labelDimIndex];
        }

        if (!formatter) {
            const itemModel = data.getItemModel(dataIndex);
            // @ts-ignore
            formatter = itemModel.get(status === 'normal'
                ? ['label', 'formatter']
                : [status, 'label', 'formatter']
            );
        }

        if (zrUtil.isFunction(formatter)) {
            params.status = status;
            params.dimensionIndex = labelDimIndex;
            return formatter(params);
        }
        else if (zrUtil.isString(formatter)) {
            const str = formatTpl(formatter, params);

            // Support 'aaa{@[3]}bbb{@product}ccc'.
            // Do not support '}' in dim name util have to.
            return str.replace(DIMENSION_LABEL_REG, function (origin, dimStr: string) {
                const len = dimStr.length;

                let dimLoose: DimensionLoose = dimStr;
                if (dimLoose.charAt(0) === '[' && dimLoose.charAt(len - 1) === ']') {
                    dimLoose = +dimLoose.slice(1, len - 1); // Also support: '[]' => 0
                    if (__DEV__) {
                        if (isNaN(dimLoose)) {
                            error(`Invalide label formatter: @${dimStr}, only support @[0], @[1], @[2], ...`);
                        }
                    }
                }

                let val = retrieveRawValue(data, dataIndex, dimLoose) as OptionDataValue;

                if (extendParams && zrUtil.isArray(extendParams.interpolatedValue)) {
                    const dimIndex = data.getDimensionIndex(dimLoose);
                    if (dimIndex >= 0) {
                        val = extendParams.interpolatedValue[dimIndex];
                    }
                }

                return val != null ? val + '' : '';
            });
        }
    }

    /**
     * Get raw value in option
     */
    getRawValue(
        idx: number,
        dataType?: SeriesDataType
    ): unknown {
        return retrieveRawValue(this.getData(dataType), idx);
    }

    /**
     * Should be implemented.
     * @param {number} dataIndex
     * @param {boolean} [multipleSeries=false]
     * @param {string} [dataType]
     */
    formatTooltip(
        dataIndex: number,
        multipleSeries?: boolean,
        dataType?: string
    ): TooltipFormatResult {
        // Empty function
        return;
    }
};

type TooltipFormatResult =
    // If `string`, means `TooltipFormatResultLegacyObject['html']`
    string
    // | TooltipFormatResultLegacyObject
    | TooltipMarkupBlockFragment;

// PENDING: previously we accept this type when calling `formatTooltip`,
// but guess little chance has been used outside. Do we need to backward
// compat it?
// type TooltipFormatResultLegacyObject = {
//     // `html` means the markup language text, either in 'html' or 'richText'.
//     // The name `html` is not appropriate because in 'richText' it is not a HTML
//     // string. But still support it for backward compatibility.
//     html: string;
//     markers: Dictionary<ColorString>;
// };

/**
 * For backward compat, normalize the return from `formatTooltip`.
 */
export function normalizeTooltipFormatResult(result: TooltipFormatResult): {
    // If `markupFragment` exists, `markupText` should be ignored.
    frag: TooltipMarkupBlockFragment;
    // Can be `null`/`undefined`, means no tooltip.
    text: string;
    // Merged with `markersExisting`.
    // markers: Dictionary<ColorString>;
} {
    let markupText;
    // let markers: Dictionary<ColorString>;
    let markupFragment: TooltipMarkupBlockFragment;
    if (zrUtil.isObject(result)) {
        if ((result as TooltipMarkupBlockFragment).type) {
            markupFragment = result as TooltipMarkupBlockFragment;
        }
        else {
            if (__DEV__) {
                console.warn('The return type of `formatTooltip` is not supported: ' + makePrintable(result));
            }
        }
        // else {
        //     markupText = (result as TooltipFormatResultLegacyObject).html;
        //     markers = (result as TooltipFormatResultLegacyObject).markers;
        //     if (markersExisting) {
        //         markers = zrUtil.merge(markersExisting, markers);
        //     }
        // }
    }
    else {
        markupText = result;
    }

    return {
        text: markupText,
        // markers: markers || markersExisting,
        frag: markupFragment
    };
}
