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

import {
    DataTransformOption, ExternalDataTransform, ExternalDataTransformResultItem
} from '../../data/helper/transform';
import { throwError } from '../../util/log';
import { DimensionLoose } from '../../util/types';

export interface IndicatorTransformOption extends DataTransformOption {
    type: 'echarts:indicator';
    config: {
        indicator?: 'sma' | 'ema' | 'macd' | 'bollinger';
        period?: number;
        sourceDimension?: DimensionLoose;
        // MACD specific
        shortPeriod?: number;
        longPeriod?: number;
        signalPeriod?: number;
    };
}

export const indicatorTransform: ExternalDataTransform<IndicatorTransformOption> = {

    type: 'echarts:indicator',

    transform: function (params) {
        const upstream = params.upstream;
        const config = params.config || {};
        const indicator = config.indicator || 'sma';
        const period = config.period || 14;
        
        let sourceDimension = config.sourceDimension;
        // Default to the last dimension if not specified
        if (sourceDimension == null) {
            const dims = upstream.cloneAllDimensionInfo();
            sourceDimension = dims.length > 0 ? dims[dims.length - 1].name || dims[dims.length - 1].index : 0;
        }

        const dimInfo = upstream.getDimensionInfo(sourceDimension);
        if (!dimInfo) {
            throwError('Can not find dimension info via: ' + sourceDimension);
            return { data: [] }; // Prevent ts error
        }
        
        const dimIdx = dimInfo.index;
        
        const resultData: any[][] = [];
        const upstreamCount = upstream.count();
        
        const upstreamDims = upstream.cloneAllDimensionInfo();
        const dimensions: any[] = upstreamDims.map(d => d.name || d.index);
        
        // Prepare dimensions
        if (indicator === 'sma' || indicator === 'ema') {
            dimensions.push(indicator.toUpperCase());
        } else if (indicator === 'bollinger') {
            dimensions.push('Upper', 'Lower');
        } else if (indicator === 'macd') {
            dimensions.push('MACD', 'Signal', 'Histogram');
        }
        
        // Retrieve source values
        const values: number[] = [];
        for (let i = 0; i < upstreamCount; i++) {
            const val = upstream.retrieveValue(i, dimIdx);
            const num = parseFloat(val as string);
            values.push(isNaN(num) ? 0 : num);
        }
        
        // Calculate SMA
        const sma = (data: number[], p: number) => {
            const res: (number | string)[] = [];
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
                sum += data[i];
                if (i < p - 1) {
                    res.push('-');
                } else {
                    res.push(sum / p);
                    sum -= data[i - p + 1];
                }
            }
            return res;
        };

        // Calculate EMA
        const ema = (data: number[], p: number) => {
            const res: (number | string)[] = [];
            const k = 2 / (p + 1);
            let currentEma = 0;
            for (let i = 0; i < data.length; i++) {
                if (i < p - 1) {
                    res.push('-');
                    currentEma += data[i]; // Accumulate sum for the first p-1 elements
                } else if (i === p - 1) {
                    currentEma += data[i];
                    currentEma = currentEma / p; // Calculate initial SMA
                    res.push(currentEma);
                } else {
                    currentEma = (data[i] - currentEma) * k + currentEma;
                    res.push(currentEma);
                }
            }
            return res;
        };

        let outputCols: (number|string)[][] = [];

        if (indicator === 'sma') {
            outputCols.push(sma(values, period));
        } else if (indicator === 'ema') {
            outputCols.push(ema(values, period));
        } else if (indicator === 'bollinger') {
            const smaVals = sma(values, period);
            const upper: (number | string)[] = [];
            const lower: (number | string)[] = [];
            for (let i = 0; i < values.length; i++) {
                if (i < period - 1) {
                    upper.push('-');
                    lower.push('-');
                } else {
                    const mean = smaVals[i] as number;
                    let sumSq = 0;
                    for (let j = 0; j < period; j++) {
                        sumSq += Math.pow(values[i - j] - mean, 2);
                    }
                    const stdDev = Math.sqrt(sumSq / period);
                    upper.push(mean + 2 * stdDev);
                    lower.push(mean - 2 * stdDev);
                }
            }
            outputCols.push(upper, lower);
        } else if (indicator === 'macd') {
            const shortP = config.shortPeriod || 12;
            const longP = config.longPeriod || 26;
            const sigP = config.signalPeriod || 9;
            
            const emaShort = ema(values, shortP);
            const emaLong = ema(values, longP);
            
            const macdVals: (number | string)[] = [];
            for (let i = 0; i < values.length; i++) {
                if (emaShort[i] === '-' || emaLong[i] === '-') {
                    macdVals.push('-');
                } else {
                    macdVals.push((emaShort[i] as number) - (emaLong[i] as number));
                }
            }
            
            const validMacd: number[] = [];
            let firstValidIdx = -1;
            for (let i = 0; i < macdVals.length; i++) {
                if (macdVals[i] !== '-') {
                    if (firstValidIdx === -1) firstValidIdx = i;
                    validMacd.push(macdVals[i] as number);
                }
            }
            
            const signalLine = ema(validMacd, sigP);
            const finalSignal: (number | string)[] = [];
            const histogram: (number | string)[] = [];
            
            for (let i = 0; i < values.length; i++) {
                if (i < firstValidIdx) {
                    finalSignal.push('-');
                    histogram.push('-');
                } else {
                    const sigVal = signalLine[i - firstValidIdx];
                    finalSignal.push(sigVal);
                    if (sigVal === '-' || macdVals[i] === '-') {
                        histogram.push('-');
                    } else {
                        histogram.push((macdVals[i] as number) - (sigVal as number));
                    }
                }
            }
            outputCols.push(macdVals, finalSignal, histogram);
        }

        // Assemble rows
        for (let i = 0; i < upstreamCount; i++) {
            const row: any[] = [];
            for (let d = 0; d < upstreamDims.length; d++) {
                row.push(upstream.retrieveValue(i, upstreamDims[d].index));
            }
            // Append indicator columns
            for (let c = 0; c < outputCols.length; c++) {
                row.push(outputCols[c][i]);
            }
            resultData.push(row);
        }
        
        return {
            data: resultData as ExternalDataTransformResultItem['data'],
            dimensions: dimensions
        };
    }
};
