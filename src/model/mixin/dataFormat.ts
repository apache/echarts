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

import {retrieveRawValue} from '../../data/helper/dataProvider';
import {formatTpl} from '../../util/format';
import { DataHost, DisplayState, TooltipRenderMode, CallbackDataParams, ColorString, ZRColor, OptionDataValue } from '../../util/types';
import GlobalModel from '../Global';
import Element from 'zrender/src/Element';

const DIMENSION_LABEL_REG = /\{@(.+?)\}/g;


interface DataFormatMixin extends DataHost {
    ecModel: GlobalModel;
    mainType: string;
    subType: string;
    componentIndex: number;
    id: string;
    name: string;
    animatedValue: OptionDataValue[];
}

class DataFormatMixin {

    /**
     * Get params for formatter
     */
    getDataParams(
        dataIndex: number,
        dataType?: string,
        el?: Element // May be used in override.
    ): CallbackDataParams {

        const data = this.getData(dataType);
        const rawValue = this.getRawValue(dataIndex, dataType);
        const animatedValue = this.getAnimatedValue(dataIndex);
        const rawDataIndex = data.getRawIndex(dataIndex);
        const name = data.getName(dataIndex);
        const itemOpt = data.getRawDataItem(dataIndex);
        const style = data.getItemVisual(dataIndex, 'style');
        const color = style && style[data.getItemVisual(dataIndex, 'drawType') || 'fill'] as ZRColor;
        const borderColor = style && style.stroke as ColorString;
        const mainType = this.mainType;
        const isSeries = mainType === 'series';
        const userOutput = data.userOutput;

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
            animatedValue: animatedValue,
            color: color,
            borderColor: borderColor,
            dimensionNames: userOutput ? userOutput.dimensionNames : null,
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
     * @param dimIndex Only used in some chart that
     *        use formatter in different dimensions, like radar.
     * @param labelProp 'label' by default
     * @return If not formatter, return null/undefined
     */
    getFormattedLabel(
        dataIndex: number,
        status?: DisplayState,
        dataType?: string,
        dimIndex?: number,
        labelProp?: string
    ): string {
        status = status || 'normal';
        const data = this.getData(dataType);
        const itemModel = data.getItemModel(dataIndex);

        const params = this.getDataParams(dataIndex, dataType);
        if (dimIndex != null && (params.value instanceof Array)) {
            params.value = params.value[dimIndex];
        }

        // @ts-ignore FIXME:TooltipModel
        const formatter = itemModel.get(status === 'normal'
            ? [(labelProp || 'label'), 'formatter']
            : [status, labelProp || 'label', 'formatter']
        );

        if (typeof formatter === 'function') {
            params.status = status;
            params.dimensionIndex = dimIndex;
            return formatter(params);
        }
        else if (typeof formatter === 'string') {
            const str = formatTpl(formatter, params);

            // Support 'aaa{@[3]}bbb{@product}ccc'.
            // Do not support '}' in dim name util have to.
            return str.replace(DIMENSION_LABEL_REG, function (origin, dim) {
                const len = dim.length;
                if (dim.charAt(0) === '[' && dim.charAt(len - 1) === ']') {
                    dim = +dim.slice(1, len - 1); // Also: '[]' => 0
                }
                return retrieveRawValue(data, dataIndex, dim);
            });
        }
    }

    /**
     * Get raw value in option
     */
    getRawValue(
        idx: number,
        dataType?: string
    ): unknown {
        return retrieveRawValue(this.getData(dataType), idx);
    }

    setAnimatedValues(
        dataValue: OptionDataValue[]
    ): void {
        this.animatedValue = dataValue.slice();
    }

    setAnimatedValue(
        idx: number,
        dataValue: OptionDataValue
    ): void {
        this.animatedValue[idx] = dataValue;
    }

    getAnimatedValue(
        idx: number
    ): OptionDataValue {
        if (!this.animatedValue || this.animatedValue.length === 0) {
            return null;
        }
        else {
            return this.animatedValue[idx];
        }
    }

    /**
     * Should be implemented.
     * @param {number} dataIndex
     * @param {boolean} [multipleSeries=false]
     * @param {string} [dataType]
     * @param {string} [renderMode='html'] valid values: 'html' and 'richText'.
     *                                     'html' is used for rendering tooltip in extra DOM form, and the result
     *                                     string is used as DOM HTML content.
     *                                     'richText' is used for rendering tooltip in rich text form, for those where
     *                                     DOM operation is not supported.
     */
    formatTooltip(
        dataIndex: number,
        multipleSeries?: boolean,
        dataType?: string,
        renderMode?: TooltipRenderMode
    ): string | {html: string, markers: {[markName: string]: string}} {
        // Empty function
        return;
    }
};

export default DataFormatMixin;
