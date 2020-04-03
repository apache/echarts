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

import createRenderPlanner from '../helper/createRenderPlanner';
import { StageHandler } from '../../util/types';
import CandlestickSeriesModel, { CandlestickDataItemOption } from './CandlestickSeries';
import Model from '../../model/Model';
import { extend } from 'zrender/src/core/util';

const positiveBorderColorQuery = ['itemStyle', 'borderColor'] as const;
const negativeBorderColorQuery = ['itemStyle', 'borderColor0'] as const;
const positiveColorQuery = ['itemStyle', 'color'] as const;
const negativeColorQuery = ['itemStyle', 'color0'] as const;

const candlestickVisual: StageHandler = {

    seriesType: 'candlestick',

    plan: createRenderPlanner(),

    // For legend.
    performRawSeries: true,

    reset: function (seriesModel: CandlestickSeriesModel, ecModel) {

        function getColor(sign: number, model: Model<Pick<CandlestickDataItemOption, 'itemStyle'>>) {
            return model.get(
                sign > 0 ? positiveColorQuery : negativeColorQuery
            );
        }

        function getBorderColor(sign: number, model: Model<Pick<CandlestickDataItemOption, 'itemStyle'>>) {
            return model.get(
                sign > 0 ? positiveBorderColorQuery : negativeBorderColorQuery
            );
        }

        const data = seriesModel.getData();

        data.setVisual('legendSymbol', 'roundRect');

        // Only visible series has each data be visual encoded
        if (ecModel.isSeriesFiltered(seriesModel)) {
            return;
        }

        const isLargeRender = seriesModel.pipelineContext.large;
        return !isLargeRender && {
            progress(params, data) {
                let dataIndex;
                while ((dataIndex = params.next()) != null) {
                    const itemModel = data.getItemModel(dataIndex);
                    const sign = data.getItemLayout(dataIndex).sign;

                    const style = itemModel.getItemStyle();
                    style.fill = getColor(sign, itemModel);
                    style.stroke = getBorderColor(sign, itemModel) || style.fill;

                    const existsStyle = data.ensureUniqueItemVisual(dataIndex, 'style');
                    extend(existsStyle, style);
                }
            }
        };


    }

};

export default candlestickVisual;