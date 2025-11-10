
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

import { calculatePercentStack } from '@/src/util/stack';
import { StackInfo, SOURCE_FORMAT_ARRAY_ROWS } from '@/src/util/types';
import Model from '@/src/model/Model';
import SeriesModel from '@/src/model/Series';
import SeriesData from '@/src/data/SeriesData';
import { createSourceFromSeriesDataOption } from '@/src/data/Source';
import prepareSeriesDataSchema from '@/src/data/helper/createDimensions';
import SeriesDimensionDefine from '@/src/data/SeriesDimensionDefine';

function createMockSeriesDataFromSchema(dimensions: string[], rows: (number | null)[][]): SeriesData {
    const hostModel = new Model();
    const source = createSourceFromSeriesDataOption({
        sourceFormat: SOURCE_FORMAT_ARRAY_ROWS,
        dimensions,
        data: rows as unknown as any[],
    });
    const schema = prepareSeriesDataSchema(source, {
        coordDimensions: dimensions.map((name) => ({ name })),
    });
    const storeDimStart = schema.dimensions.length;
    schema.dimensions.push(new SeriesDimensionDefine({
        name: '__stack_result__',
        type: 'float',
        isCalculationCoord: true,
        storeDimIndex: storeDimStart
    }));
    schema.dimensions.push(new SeriesDimensionDefine({
        name: '__stacked_over__',
        type: 'float',
        isCalculationCoord: true,
        storeDimIndex: storeDimStart + 1
    }));
    const paddedRows = rows.map((row) => {
        const full = [...row];
        while (full.length < schema.dimensions.length) {
            full.push(NaN);
        }
        return full;
    });
    const seriesData = new SeriesData(schema, hostModel);
    seriesData.initData(paddedRows);
    return seriesData;
}

function createMockStackInfo(name: string, values: number[][]): StackInfo {
    const data = createMockSeriesDataFromSchema(['x', 'y'], values);
    const yInfo = data.getDimensionInfo('y');
    if (yInfo) {
        yInfo.isCalculationCoord = true;
    }
    data.setCalculationInfo({
        stackedByDimension: 'x',
        stackedDimension: 'y',
        stackResultDimension: '__stack_result__',
        stackedOverDimension: '__stacked_over__',
        isStackedByIndex: true,
    });
    const seriesModel = {
        name,
        option: {
            type: 'bar',
            stack: 'total',
            stackStrategy: 'percent',
            data: values[0],
        },
    } as unknown as SeriesModel;
    return {
        data,
        seriesModel,
        stackedDimension: 'y',
        stackedByDimension: '__stack_by__',
        stackResultDimension: '__stack_result__',
        stackedOverDimension: '__stacked_over__',
        isStackedByIndex: true,
    };
}

describe('util/stack', function () {
    describe('calculatePercentStack', function () {
        it('should compute percent-stacked values for two series', function () {
            const stackInfoList: StackInfo[] = [
                createMockStackInfo('a', [
                    [0, 10],
                    [1, 20],
                    [2, 30],
                ]),
                createMockStackInfo('b', [
                    [0, 40],
                    [1, 20],
                    [2, 10],
                ]),
            ];
            calculatePercentStack(stackInfoList);
            const firstSeriesData = stackInfoList[0].data;
            expect(firstSeriesData.mapArray('__stack_result__', Number)).toEqual([20, 50, 75]);
            expect(firstSeriesData.mapArray('__stack_result__', Number)).toEqual([20, 50, 75]);
            expect(firstSeriesData.mapArray('__stacked_over__', Number)).toEqual([0, 0, 0]);
            const secondSeriesData = stackInfoList[1].data;
            expect(secondSeriesData.mapArray('__stack_result__', Number)).toEqual([100, 100, 100]);
            expect(secondSeriesData.mapArray('__stacked_over__', Number)).toEqual([20, 50, 75]);
        });

        it('should compute percent-stacked values for two series with varying magnitudes', function () {
            const stackInfoList: StackInfo[] = [
                createMockStackInfo('a', [
                    [0, 50],
                    [1, 2],
                    [2, 1000],
                    [3, 0],
                ]),
                createMockStackInfo('b', [
                    [0, 50],
                    [1, 8],
                    [2, 1000],
                    [3, 1],
                ]),
            ];
            calculatePercentStack(stackInfoList);
            const firstSeriesData = stackInfoList[0].data;
            expect(firstSeriesData.mapArray('__stack_result__', Number)).toEqual(
                [50, 20, 50, 0]
            );
            expect(firstSeriesData.mapArray('__stacked_over__', Number)).toEqual(
                [0, 0, 0, 0]
            );
            const secondSeriesData = stackInfoList[1].data;
            expect(secondSeriesData.mapArray('__stack_result__', Number)).toEqual(
                [100, 100, 100, 100]
            );
            expect(secondSeriesData.mapArray('__stacked_over__', Number)).toEqual(
                [50, 20, 50, 0]
            );
        });

        it('should compute percent-stacked values for three series', function () {
            const stackInfoList: StackInfo[] = [
                createMockStackInfo('a', [
                    [0, 1000],
                    [1, 1000],
                ]),
                createMockStackInfo('b', [
                    [0, 2000],
                    [1, 3000],
                ]),
                createMockStackInfo('c', [
                    [0, 7000],
                    [1, 6000],
                ]),
            ];
            calculatePercentStack(stackInfoList);
            const [a, b, c] = stackInfoList.map((s) => s.data);
            expect(a.mapArray('__stack_result__', Number)).toEqual([10, 10]);
            expect(a.mapArray('__stacked_over__', Number)).toEqual([0, 0]);

            expect(b.mapArray('__stack_result__', Number)).toEqual([30, 40]);
            expect(b.mapArray('__stacked_over__', Number)).toEqual([10, 10]);

            expect(c.mapArray('__stack_result__', Number)).toEqual([100, 100]);
            expect(c.mapArray('__stacked_over__', Number)).toEqual([30, 40]);
        });
    });
});
