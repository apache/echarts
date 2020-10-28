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

import SeriesModel from '../../model/Series';
import { trim, isArray, each, reduce } from 'zrender/src/core/util';
import { DimensionName, DimensionType, ColorString } from '../../util/types';
import {
    retrieveVisualColorForTooltipMarker,
    TooltipMarkupBlockFragment,
    createTooltipMarkup,
    TooltipMarkupSection
} from './tooltipMarkup';
import { retrieveRawValue } from '../../data/helper/dataProvider';
import { isNameSpecified } from '../../util/model';


export function defaultSeriesFormatTooltip(opt: {
    series: SeriesModel;
    dataIndex: number;
    // `multipleSeries` means multiple series displayed in one tooltip,
    // and this method only return the part of one series.
    multipleSeries: boolean;
}): TooltipMarkupSection {
    const series = opt.series;
    const dataIndex = opt.dataIndex;
    const multipleSeries = opt.multipleSeries;

    const data = series.getData();
    const tooltipDims = data.mapDimensionsAll('defaultedTooltip');
    const tooltipDimLen = tooltipDims.length;
    const value = series.getRawValue(dataIndex) as any;
    const isValueArr = isArray(value);
    const markerColor = retrieveVisualColorForTooltipMarker(series, dataIndex);

    // Complicated rule for pretty tooltip.
    let inlineValue;
    let inlineValueType: DimensionType | DimensionType[];
    let subBlocks: TooltipMarkupBlockFragment[];
    let sortParam: unknown;
    if (tooltipDimLen > 1 || (isValueArr && !tooltipDimLen)) {
        const formatArrResult = formatTooltipArrayValue(value, series, dataIndex, tooltipDims, markerColor);
        inlineValue = formatArrResult.inlineValues;
        inlineValueType = formatArrResult.inlineValueTypes;
        subBlocks = formatArrResult.blocks;
        // Only support tooltip sort by the first inline value. It's enough in most cases.
        sortParam = formatArrResult.inlineValues[0];
    }
    else if (tooltipDimLen) {
        const dimInfo = data.getDimensionInfo(tooltipDims[0]);
        sortParam = inlineValue = retrieveRawValue(data, dataIndex, tooltipDims[0]);
        inlineValueType = dimInfo.type;
    }
    else {
        sortParam = inlineValue = isValueArr ? value[0] : value;
    }

    // Do not show generated series name. It might not be readable.
    const seriesNameSpecified = isNameSpecified(series);
    const seriesName = seriesNameSpecified && series.name || '';
    const itemName = data.getName(dataIndex);
    const inlineName = multipleSeries ? seriesName : itemName;

    return createTooltipMarkup('section', {
        header: seriesName,
        // When series name not specified, do not show a header line with only '-'.
        // This case alway happen in tooltip.trigger: 'item'.
        noHeader: multipleSeries || !seriesNameSpecified,
        sortParam: sortParam,
        blocks: [
            createTooltipMarkup('nameValue', {
                markerType: 'item',
                markerColor: markerColor,
                // Do not mix display seriesName and itemName in one tooltip,
                // which might confuses users.
                name: inlineName,
                // name dimension might be auto assigned, where the name might
                // be not readable. So we check trim here.
                noName: !trim(inlineName),
                value: inlineValue,
                valueType: inlineValueType
            })
        ].concat(subBlocks || [] as any)
    });
}

function formatTooltipArrayValue(
    value: unknown[],
    series: SeriesModel,
    dataIndex: number,
    tooltipDims: DimensionName[],
    colorStr: ColorString
): {
    inlineValues: unknown[];
    inlineValueTypes: DimensionType[];
    blocks: TooltipMarkupBlockFragment[];
} {
    // check: category-no-encode-has-axis-data in dataset.html
    const data = series.getData();
    const isValueMultipleLine = reduce(value, function (isValueMultipleLine, val, idx) {
        const dimItem = data.getDimensionInfo(idx);
        return isValueMultipleLine = isValueMultipleLine
            || (dimItem && dimItem.tooltip !== false && dimItem.displayName != null);
    }, false);

    const inlineValues: unknown[] = [];
    const inlineValueTypes: DimensionType[] = [];
    const blocks: TooltipMarkupBlockFragment[] = [];

    tooltipDims.length
        ? each(tooltipDims, function (dim) {
            setEachItem(retrieveRawValue(data, dataIndex, dim), dim);
        })
        // By default, all dims is used on tooltip.
        : each(value, setEachItem);

    function setEachItem(val: unknown, dim: DimensionName | number): void {
        const dimInfo = data.getDimensionInfo(dim);
        // If `dimInfo.tooltip` is not set, show tooltip.
        if (!dimInfo || dimInfo.otherDims.tooltip === false) {
            return;
        }
        if (isValueMultipleLine) {
            blocks.push(createTooltipMarkup('nameValue', {
                markerType: 'subItem',
                markerColor: colorStr,
                name: dimInfo.displayName,
                value: val,
                valueType: dimInfo.type
            }));
        }
        else {
            inlineValues.push(val);
            inlineValueTypes.push(dimInfo.type);
        }
    }

    return { inlineValues, inlineValueTypes, blocks };
}
