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

import {extend, isFunction, keys} from 'zrender/src/core/util';
import {
    StageHandler,
    SeriesOption,
    SymbolOptionMixin,
    SymbolCallback,
    CallbackDataParams
} from '../util/types';
import SeriesData from '../data/SeriesData';
import SeriesModel from '../model/Series';
import GlobalModel from '../model/Global';

const SYMBOL_PROPS_WITH_CB = [
    'symbol', 'symbolSize', 'symbolRotate', 'symbolOffset'
] as const;
const SYMBOL_PROPS: [...typeof SYMBOL_PROPS_WITH_CB, 'symbolKeepAspect'] = SYMBOL_PROPS_WITH_CB.concat([
    'symbolKeepAspect'
] as any) as any;
// Encoding visual for all series include which is filtered for legend drawing
const seriesSymbolTask: StageHandler = {

    createOnAllSeries: true,

    // For legend.
    performRawSeries: true,

    reset: function (
        seriesModel: SeriesModel<SeriesOption & SymbolOptionMixin<CallbackDataParams>>,
        ecModel: GlobalModel
    ) {
        const data = seriesModel.getData();

        if (seriesModel.legendIcon) {
            data.setVisual('legendIcon', seriesModel.legendIcon);
        }

        if (!seriesModel.hasSymbolVisual) {
            return;
        }

        const symbolOptions = {} as Record<(typeof SYMBOL_PROPS_WITH_CB)[number], any>;
        const symbolOptionsCb = {} as Record<(typeof SYMBOL_PROPS_WITH_CB)[number], any>;
        let hasCallback = false;
        for (let i = 0; i < SYMBOL_PROPS_WITH_CB.length; i++) {
            const symbolPropName = SYMBOL_PROPS_WITH_CB[i];
            const val = seriesModel.get(symbolPropName);
            if (isFunction(val)) {
                hasCallback = true;
                symbolOptionsCb[symbolPropName] = val;
            }
            else {
                symbolOptions[symbolPropName] = val;
            }
        }
        symbolOptions.symbol = symbolOptions.symbol || seriesModel.defaultSymbol;

        data.setVisual(extend({
            legendIcon: seriesModel.legendIcon || symbolOptions.symbol,
            symbolKeepAspect: seriesModel.get('symbolKeepAspect')
        }, symbolOptions));

        // Only visible series has each data be visual encoded
        if (ecModel.isSeriesFiltered(seriesModel)) {
            return;
        }

        const symbolPropsCb = keys(symbolOptionsCb);

        function dataEach(data: SeriesData, idx: number) {
            const rawValue = seriesModel.getRawValue(idx);
            const params = seriesModel.getDataParams(idx);

            for (let i = 0; i < symbolPropsCb.length; i++) {
                const symbolPropName = symbolPropsCb[i];
                data.setItemVisual(
                    idx, symbolPropName,
                    (symbolOptionsCb[symbolPropName] as SymbolCallback<CallbackDataParams>)(rawValue, params)
                );
            }
        }

        return { dataEach: hasCallback ? dataEach : null };
    }
};

const dataSymbolTask: StageHandler = {

    createOnAllSeries: true,

    // For legend.
    performRawSeries: true,

    reset: function (
        seriesModel: SeriesModel<SeriesOption & SymbolOptionMixin<CallbackDataParams>>,
        ecModel: GlobalModel
    ) {
        if (!seriesModel.hasSymbolVisual) {
            return;
        }
        // Only visible series has each data be visual encoded
        if (ecModel.isSeriesFiltered(seriesModel)) {
            return;
        }

        const data = seriesModel.getData();

        function dataEach(data: SeriesData, idx: number) {
            const itemModel = data.getItemModel<SymbolOptionMixin>(idx);

            for (let i = 0; i < SYMBOL_PROPS.length; i++) {
                const symbolPropName = SYMBOL_PROPS[i];
                const val = itemModel.getShallow(symbolPropName, true);
                if (val != null) {
                    data.setItemVisual(idx, symbolPropName, val);
                }
            }
        }

        return { dataEach: data.hasItemOption ? dataEach : null };
    }
};

export {seriesSymbolTask, dataSymbolTask};
