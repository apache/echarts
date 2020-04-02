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

import { isFunction, extend } from 'zrender/src/core/util';
import { StageHandler, CallbackDataParams, ZRColor, Dictionary } from '../util/types';
import makeStyleMapper from '../model/mixin/makeStyleMapper';
import { ITEM_STYLE_KEY_MAP } from '../model/mixin/itemStyle';
import { LINE_STYLE_KEY_MAP } from '../model/mixin/lineStyle';
import SeriesModel from '../model/Series';
import Model from '../model/Model';

interface SeriesModelWithPaletteScope extends SeriesModel {
    __paletteScope: any
}

const defaultStyleMappers = {
    itemStyle: makeStyleMapper(ITEM_STYLE_KEY_MAP, true),
    lineStyle: makeStyleMapper(LINE_STYLE_KEY_MAP, true)
};

const defaultColorKey = {
    lineStyle: 'stroke',
    itemStyle: 'fill'
} as const;

function getStyleMapper(seriesModel: SeriesModel, stylePath: string) {
    const styleMapper = seriesModel.visualStyleMapper
        || defaultStyleMappers[stylePath as 'itemStyle' | 'lineStyle'];
    if (!styleMapper) {
        console.warn(`Unkown style type '${stylePath}'.`);
        return defaultStyleMappers.itemStyle;
    }
    return styleMapper;
}

function getDefaultColorKey(seriesModel: SeriesModel, stylePath: string): 'stroke' | 'fill' {
    // return defaultColorKey[stylePath] ||
    const colorKey = seriesModel.visualDrawType
        || defaultColorKey[stylePath as 'itemStyle' | 'lineStyle'];

    if (!colorKey) {
        console.warn(`Unkown style type '${stylePath}'.`);
        return 'fill';
    }

    return colorKey;
}

type ColorCallback = (params: CallbackDataParams) => ZRColor;

const seriesStyleTask: StageHandler = {
    createOnAllSeries: true,
    performRawSeries: true,
    reset(seriesModel, ecModel) {
        const data = seriesModel.getData();
        const stylePath = seriesModel.visualStyleAccessPath
            || 'itemStyle';
        // Set in itemStyle
        const styleModel = seriesModel.getModel(stylePath as any);
        const getStyle = getStyleMapper(seriesModel, stylePath);

        const globalStyle = getStyle(styleModel);

        // TODO
        const colorKey = getDefaultColorKey(seriesModel, stylePath);
        const color = globalStyle[colorKey];

        // TODO style callback
        const colorCallback = isFunction(color) ? color as unknown as ColorCallback : null;
        // Default
        if ((!globalStyle[colorKey] || colorCallback) && !seriesModel.useColorPaletteOnData) {
            globalStyle[colorKey] = seriesModel.getColorFromPalette(
                // TODO series count changed.
                seriesModel.name, null, ecModel.getSeriesCount()
            );
        }

        data.setVisual('style', globalStyle);
        data.setVisual('drawType', colorKey);

        // Only visible series has each data be visual encoded
        if (!ecModel.isSeriesFiltered(seriesModel)) {
            // if (colorCallback) {
            return {
                dataEach(data, idx) {
                    const dataParams = seriesModel.getDataParams(idx);
                    const itemStyle = extend({}, globalStyle);
                    // FIXME share style may affect other elements when one changes it's style(for example in animation)
                    if (colorCallback) {
                        itemStyle[colorKey] = colorCallback(dataParams);
                    }
                    data.setItemVisual(idx, 'style', itemStyle);
                }
            };
            // }
        }
    }
};

const sharedModel = new Model();
const dataStyleTask: StageHandler = {
    createOnAllSeries: true,
    performRawSeries: true,
    reset(seriesModel, ecModel) {
        if (seriesModel.ignoreStyleOnData) {
            return;
        }

        const data = seriesModel.getData();
        const stylePath = seriesModel.visualStyleAccessPath
            || 'itemStyle';
        // Set in itemStyle
        const getStyle = getStyleMapper(seriesModel, stylePath);

        return {
            dataEach: (data.hasItemOption || seriesModel.useColorPaletteOnData) ? function (data, idx) {
                // Not use getItemModel for performance considuration
                if (data.hasItemOption) {
                    const rawItem = data.getRawDataItem(idx) as any;
                    if (rawItem && rawItem[stylePath]) {
                        sharedModel.option = rawItem[stylePath];
                        const style = getStyle(sharedModel);

                        const existsStyle = data.ensureUniqueItemVisual(idx, 'style');
                        extend(existsStyle, style);
                    }
                }
            } : null
        };
    }
};

const dataColorPaletteTask: StageHandler = {
    createOnAllSeries: true,
    performRawSeries: true,
    reset(seriesModel, ecModel) {
        if (seriesModel.ignoreStyleOnData) {
            return;
        }

        const dataAll = seriesModel.getRawData();
        const idxMap: Dictionary<number> = {};
        const data = seriesModel.getData();

        const stylePath = seriesModel.visualStyleAccessPath
            || 'itemStyle';
        const colorKey = getDefaultColorKey(seriesModel, stylePath);

        data.each(function (idx) {
            const rawIdx = data.getRawIndex(idx);
            idxMap[rawIdx] = idx;
        });

        dataAll.each(function (rawIdx) {
            const idx = idxMap[rawIdx];
            const existsStyle = data.ensureUniqueItemVisual(idx, 'style');
            if (!existsStyle[colorKey]) {
                // Get color from palette.
                existsStyle[colorKey] = seriesModel.getColorFromPalette(
                    dataAll.getName(rawIdx) || (rawIdx + ''),
                    (seriesModel as SeriesModelWithPaletteScope).__paletteScope,
                    dataAll.count()
                );
            }
        });
    }
};

export {seriesStyleTask, dataStyleTask, dataColorPaletteTask};