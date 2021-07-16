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

import { StageHandler } from '../../util/types';
import SeriesData from '../../data/SeriesData';
import LinesSeriesModel, { LinesDataItemOption } from './LinesSeries';
import Model from '../../model/Model';
import { LineDataVisual } from '../../visual/commonVisualTypes';

function normalize(a: string | string[]): string[];
function normalize(a: number | number[]): number[];
function normalize(a: string | number | (string | number)[]): (string | number)[] {
    if (!(a instanceof Array)) {
        a = [a, a];
    }
    return a;
}

const linesVisual: StageHandler = {
    seriesType: 'lines',
    reset(seriesModel: LinesSeriesModel) {
        const symbolType = normalize(seriesModel.get('symbol'));
        const symbolSize = normalize(seriesModel.get('symbolSize'));
        const data = seriesModel.getData() as SeriesData<LinesSeriesModel, LineDataVisual>;

        data.setVisual('fromSymbol', symbolType && symbolType[0]);
        data.setVisual('toSymbol', symbolType && symbolType[1]);
        data.setVisual('fromSymbolSize', symbolSize && symbolSize[0]);
        data.setVisual('toSymbolSize', symbolSize && symbolSize[1]);

        function dataEach(
            data: SeriesData<LinesSeriesModel, LineDataVisual>,
            idx: number
        ): void {
            const itemModel = data.getItemModel(idx) as Model<LinesDataItemOption>;
            const symbolType = normalize(itemModel.getShallow('symbol', true));
            const symbolSize = normalize(itemModel.getShallow('symbolSize', true));

            symbolType[0] && data.setItemVisual(idx, 'fromSymbol', symbolType[0]);
            symbolType[1] && data.setItemVisual(idx, 'toSymbol', symbolType[1]);
            symbolSize[0] && data.setItemVisual(idx, 'fromSymbolSize', symbolSize[0]);
            symbolSize[1] && data.setItemVisual(idx, 'toSymbolSize', symbolSize[1]);
        }

        return {
            dataEach: data.hasItemOption ? dataEach : null
        };
    }
};

export default linesVisual;