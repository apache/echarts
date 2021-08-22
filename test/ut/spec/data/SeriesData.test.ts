
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

/* global Float32Array */

import SeriesData from '@/src/data/SeriesData';
import Model from '@/src/model/Model';
import { createSourceFromSeriesDataOption, Source, createSource } from '@/src/data/Source';
import { OptionDataItemObject,
    OptionDataValue,
    SOURCE_FORMAT_ARRAY_ROWS,
    SOURCE_FORMAT_ORIGINAL } from '@/src/util/types';
import SeriesDimensionDefine from '@/src/data/SeriesDimensionDefine';
import OrdinalMeta from '@/src/data/OrdinalMeta';
import DataStore from '@/src/data/DataStore';
import { DefaultDataProvider } from '@/src/data/helper/dataProvider';
import { SeriesDataSchema } from '@/src/data/helper/SeriesDataSchema';


const ID_PREFIX = 'e\0\0';
const NAME_REPEAT_PREFIX = '__ec__';


describe('SeriesData', function () {

    describe('Data Manipulation', function () {

        it('initData 1d', function () {
            const data = new SeriesData(['x', 'y'], new Model());
            data.initData([10, 20, 30]);
            expect(data.get('x', 0)).toEqual(10);
            expect(data.get('x', 1)).toEqual(20);
            expect(data.get('x', 2)).toEqual(30);
            expect(data.get('y', 1)).toEqual(20);
        });

        it('initData 2d', function () {
            const data = new SeriesData(['x', 'y'], new Model());
            data.initData([[10, 15], [20, 25], [30, 35]]);
            expect(data.get('x', 1)).toEqual(20);
            expect(data.get('y', 1)).toEqual(25);
        });

        it('initData 2d yx', function () {
            const data = new SeriesData(['y', 'x'], new Model());
            data.initData([[10, 15], [20, 25], [30, 35]]);
            expect(data.get('x', 1)).toEqual(25);
            expect(data.get('y', 1)).toEqual(20);
        });

        it('Data with option 1d', function () {
            const data = new SeriesData(['x', 'y'], new Model());
            data.initData([
                1,
                {
                    value: 2,
                    somProp: 'foo'
                } as OptionDataItemObject<OptionDataValue>
            ]);
            expect(data.getItemModel(1).get('somProp' as any)).toEqual('foo');
            expect(data.getItemModel(0).get('somProp' as any)).toBeNull();
        });

        it('Empty data', function () {
            const data = new SeriesData(['x', 'y'], new Model());
            data.initData([1, '-']);
            expect(data.get('y', 1)).toBeNaN();
        });

        it('getRawValue', function () {
            const data1 = new SeriesData(['x', 'y'], new Model());
            // here construct a new data2 because if we only use one data
            // to call initData() twice, data._chunkCount will be accumulated
            // to 1 instead of 0.
            const data2 = new SeriesData(['x', 'y'], new Model());

            data1.initData([1, 2, 3]);
            expect(data1.getItemModel(1).option).toEqual(2);

            data2.initData([[10, 15], [20, 25], [30, 35]]);
            expect(data2.getItemModel(1).option).toEqual([20, 25]);
        });

        it('indexOfRawIndex', function () {
            const data = new SeriesData(['x'], new Model());
            data.initData([]);
            expect(data.indexOfRawIndex(1)).toEqual(-1);

            const data1 = new SeriesData(['x'], new Model());
            data1.initData([0]);
            expect(data1.indexOfRawIndex(0)).toEqual(0);
            expect(data1.indexOfRawIndex(1)).toEqual(-1);

            const data2 = new SeriesData(['x'], new Model());
            data2.initData([0, 1, 2, 3]);
            expect(data2.indexOfRawIndex(1)).toEqual(1);
            expect(data2.indexOfRawIndex(2)).toEqual(2);
            expect(data2.indexOfRawIndex(5)).toEqual(-1);

            const data3 = new SeriesData(['x'], new Model());
            data3.initData([0, 1, 2, 3, 4]);
            expect(data3.indexOfRawIndex(2)).toEqual(2);
            expect(data3.indexOfRawIndex(3)).toEqual(3);
            expect(data3.indexOfRawIndex(5)).toEqual(-1);

            data3.filterSelf(function (idx) {
                return idx >= 2;
            });
            expect(data3.indexOfRawIndex(2)).toEqual(0);
        });

        it('getDataExtent', function () {
            const data = new SeriesData(['x', 'y'], new Model());
            data.initData([1, 2, 3]);
            expect(data.getDataExtent('x')).toEqual([1, 3]);
            expect(data.getDataExtent('y')).toEqual([1, 3]);
        });

        it('Data types', function () {
            const data = new SeriesData([{
                name: 'x',
                type: 'int'
            }, {
                name: 'y',
                type: 'float'
            }], new Model());
            data.initData([[1.1, 1.1]]);
            expect(data.get('x', 0)).toEqual(1);
            expect(data.get('y', 0)).toBeCloseTo(1.1, 5);
        });

        it('map', function () {
            const data = new SeriesData(['x', 'y'], new Model());
            data.initData([[10, 15], [20, 25], [30, 35]]);
            expect(data.map(['x', 'y'], function (x: number, y: number) {
                return [x + 2, y + 2];
            }).mapArray('x', function (x) {
                return x;
            })).toEqual([12, 22, 32]);
        });

        it('mapArray', function () {
            const data = new SeriesData(['x', 'y'], new Model());
            data.initData([[10, 15], [20, 25], [30, 35]]);
            expect(data.mapArray(['x', 'y'], function (x, y) {
                return [x, y];
            })).toEqual([[10, 15], [20, 25], [30, 35]]);
        });

        it('filterSelf', function () {
            const data = new SeriesData(['x', 'y'], new Model());
            data.initData([[10, 15], [20, 25], [30, 35]]);
            expect(data.filterSelf(['x', 'y'], function (x, y) {
                return x < 30 && x > 10;
            }).mapArray('x', function (x) {
                return x;
            })).toEqual([20]);
        });

        it('dataProvider', function () {
            const data = new SeriesData(['x', 'y'], new Model());
            const typedArray = new Float32Array([10, 10, 20, 20]);
            const source = createSourceFromSeriesDataOption(typedArray);
            data.initData({
                count: function (): number {
                    return typedArray.length / 2;
                },
                getItem: function (idx: number): number[] {
                    return [typedArray[idx * 2], typedArray[idx * 2 + 1]];
                },
                getSource: function (): Source {
                    return source;
                }
            });
            expect(data.mapArray(['x', 'y'], function (x, y) {
                return [x, y];
            })).toEqual([[10, 10], [20, 20]]);
            expect(data.getRawDataItem(0)).toEqual([10, 10]);
            expect(data.getItemModel(0).option).toEqual([10, 10]);
        });
    });

    describe('Data store', function () {
        it('should guess ordinal correctly', function () {
            const source = createSource([['A', 15], ['B', 25], ['C', 35]], {
                dimensions: ['A', 'B'],
                seriesLayoutBy: null,
                sourceHeader: false
            }, SOURCE_FORMAT_ORIGINAL);
            expect(source.dimensionsDefine[0].type).toEqual('ordinal');
        });

        function createStore() {
            const provider = new DefaultDataProvider([['A', 15], ['B', 25], ['C', 35]]);
            const store = new DataStore();
            store.initData(provider, [{type: 'ordinal'}, {type: 'float'}]);
            return store;
        }


        it('SeriesData can still get other dims value from store when only part of dims are given.', function () {
            const source = createSource(
                [['A', 15, 20, 'cat'], ['B', 25, 30, 'mouse'], ['C', 35, 40, 'dog']],
                {
                    dimensions: null,
                    seriesLayoutBy: null,
                    sourceHeader: false
                },
                SOURCE_FORMAT_ARRAY_ROWS
            );
            const store = new DataStore();
            store.initData(new DefaultDataProvider(source), [
                {type: 'ordinal'}, {type: 'float'}, {type: 'float'}, {type: 'ordinal'}
            ]);
            const schema = new SeriesDataSchema({
                source: source,
                dimensions: [
                    { type: 'float', name: 'dim1', storeDimIndex: 1 },
                    { type: 'ordinal', name: 'dim3', storeDimIndex: 3 }
                ],
                fullDimensionCount: 2,
                dimensionOmitted: true
            });
            const data = new SeriesData(schema, null);
            data.initData(store);
            // Store should be the same.
            expect(data.getStore()).toBe(store);
            // Get self dim
            expect(data.get('dim1', 0)).toEqual(15);
            expect(data.get('dim1', 1)).toEqual(25);
            // Get other dim
            expect(data.getStore().get(0, 0)).toEqual('A');
            expect(data.getStore().get(0, 1)).toEqual('B');
            expect(data.getStore().get(2, 0)).toEqual(20);
            expect(data.getStore().get(2, 1)).toEqual(30);
            // Get all
            expect(data.getValues(['dim3', 'dim1'], 0)).toEqual(['cat', 15]);
            expect(data.getValues(1)).toEqual(['B', 25, 30, 'mouse']);
        });

        it('SeriesData#cloneShallow should share store', function () {
            const store = createStore();
            const dims = [{ type: 'float', name: 'dim2' }];
            const data = new SeriesData(dims, null);
            data.initData(store);
            const data2 = data.cloneShallow();
            expect(data2.getStore()).toBe(data.getStore());
        });
    });

    describe('Data read', function () {
        it('indicesOfNearest', function () {
            const data = new SeriesData(['value'], new Model());
            // ---- index: 0   1   2   3   4   5   6   7
            data.initData([10, 20, 30, 35, 40, 40, 35, 50]);

            expect(data.indicesOfNearest('value', 24.5)).toEqual([1]);
            expect(data.indicesOfNearest('value', 25)).toEqual([1]);
            expect(data.indicesOfNearest('value', 25.5)).toEqual([2]);
            expect(data.indicesOfNearest('value', 25.5)).toEqual([2]);
            expect(data.indicesOfNearest('value', 41)).toEqual([4, 5]);
            expect(data.indicesOfNearest('value', 39)).toEqual([4, 5]);
            expect(data.indicesOfNearest('value', 41)).toEqual([4, 5]);
            expect(data.indicesOfNearest('value', 36)).toEqual([3, 6]);

            expect(data.indicesOfNearest('value', 50.6, 0.5)).toEqual([]);
            expect(data.indicesOfNearest('value', 50.5, 0.5)).toEqual([7]);
        });
    });

    describe('id_and_name', function () {

        function makeOneByOneChecker(list: SeriesData) {
            let getIdDataIndex = 0;
            let getNameDataIndex = 0;

            return {
                nextIdEqualsTo: function (expectedId: string): void {
                    expect(list.getId(getIdDataIndex)).toEqual(expectedId);
                    getIdDataIndex++;
                },
                nextNameEqualsTo: function (expectedName: string): void {
                    expect(list.getName(getNameDataIndex)).toEqual(expectedName);
                    getNameDataIndex++;
                },
                currGetIdDataIndex: function (): number {
                    return getIdDataIndex;
                },
                currGetNameDataIndex: function (): number {
                    return getNameDataIndex;
                }
            };
        }

        describe('only_name_declared', function () {

            function doChecks(list: SeriesData) {
                const oneByOne = makeOneByOneChecker(list);

                oneByOne.nextIdEqualsTo('a');
                oneByOne.nextIdEqualsTo('b');
                oneByOne.nextIdEqualsTo(`b${NAME_REPEAT_PREFIX}2`);
                oneByOne.nextIdEqualsTo('c');
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}4`);
                oneByOne.nextIdEqualsTo(`c${NAME_REPEAT_PREFIX}2`);
                oneByOne.nextIdEqualsTo('d');
                oneByOne.nextIdEqualsTo(`c${NAME_REPEAT_PREFIX}3`);

                oneByOne.nextNameEqualsTo('a');
                oneByOne.nextNameEqualsTo('b');
                oneByOne.nextNameEqualsTo('b');
                oneByOne.nextNameEqualsTo('c');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('c');
                oneByOne.nextNameEqualsTo('d');
                oneByOne.nextNameEqualsTo('c');
            }

            it('sourceFormatOriginal', function () {
                const list = new SeriesData(['x', 'y'], new Model());
                list.initData([
                    { value: 10, name: 'a' },
                    { value: 20, name: 'b' },
                    { value: 30, name: 'b' },
                    { value: 40, name: 'c' },
                    { value: 50 }, // name not declared
                    { value: 60, name: 'c' },
                    { value: 70, name: 'd' },
                    { value: 80, name: 'c' }
                ]);

                doChecks(list);
            });

            it('sourceFormatArrayRows', function () {
                const list = new SeriesData(
                    [
                        'x',
                        { name: 'q', type: 'ordinal', otherDims: { itemName: 0 } }
                    ],
                    new Model()
                );
                const source = createSource(
                    [
                        [ 10, 'a' ],
                        [ 20, 'b' ],
                        [ 30, 'b' ],
                        [ 40, 'c' ],
                        [ 50, null ],
                        [ 60, 'c' ],
                        [ 70, 'd' ],
                        [ 80, 'c' ]
                    ],
                    {
                        seriesLayoutBy: 'column',
                        sourceHeader: 0,
                        dimensions: null
                    },
                    SOURCE_FORMAT_ARRAY_ROWS
                );
                list.initData(source);

                doChecks(list);
            });
        });


        describe('id_name_declared_sourceFormat_original', function () {

            it('sourceFormatOriginal', function () {
                const list = new SeriesData(['x'], new Model());
                const oneByOne = makeOneByOneChecker(list);

                list.initData([
                    { value: 0, id: 'myId_10' },
                    { value: 10, id: 555 }, // numeric id.
                    { value: 20, id: '666%' },
                    { value: 30, id: 'myId_good', name: 'b' },
                    { value: 40, name: 'b' },
                    { value: 50, id: null },
                    { value: 60, id: undefined },
                    { value: 70, id: NaN },
                    { value: 80, id: '' },
                    { value: 90, name: 'b' },
                    { value: 100 },
                    { value: 110, id: 'myId_better' },
                    { value: 120, id: 'myId_better' } // duplicated id.
                ]);

                oneByOne.nextIdEqualsTo('myId_10');
                oneByOne.nextIdEqualsTo('555');
                oneByOne.nextIdEqualsTo('666%');
                oneByOne.nextIdEqualsTo('myId_good');
                oneByOne.nextIdEqualsTo('b');
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.nextIdEqualsTo('NaN');
                oneByOne.nextIdEqualsTo('');
                oneByOne.nextIdEqualsTo(`b${NAME_REPEAT_PREFIX}2`);
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.nextIdEqualsTo('myId_better');
                oneByOne.nextIdEqualsTo('myId_better');

                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('b');
                oneByOne.nextNameEqualsTo('b');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('b');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');

                list.appendData([
                    { value: 200, id: 'myId_best' },
                    { value: 210, id: 999 }, // numeric id.
                    { value: 220, id: '777px' },
                    { value: 230, name: 'b' },
                    { value: 240 }
                ]);

                oneByOne.nextIdEqualsTo('myId_best');
                oneByOne.nextIdEqualsTo('999');
                oneByOne.nextIdEqualsTo('777px');
                oneByOne.nextIdEqualsTo(`b${NAME_REPEAT_PREFIX}3`);
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);

                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('b');
                oneByOne.nextNameEqualsTo('');

                list.appendValues([], ['b', 'c', null]);

                oneByOne.nextIdEqualsTo(`b${NAME_REPEAT_PREFIX}4`);
                oneByOne.nextIdEqualsTo('c');
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);

                oneByOne.nextNameEqualsTo('b');
                oneByOne.nextNameEqualsTo('c');
                oneByOne.nextNameEqualsTo('');
            });

        });

        describe('id_name_declared_sourceFormat_arrayRows', function () {

            it('no_ordinalMeta', function () {
                testArrayRowsInSource([
                    { name: 'x', type: 'number' },
                    { name: 'p', type: 'ordinal', otherDims: { itemId: 0 } },
                    { name: 'q', type: 'ordinal', otherDims: { itemName: 0 } }
                ]);
            });

            it('has_ordinalMeta', function () {
                const ordinalMetaP = new OrdinalMeta({
                    categories: [],
                    needCollect: true,
                    deduplication: true
                });
                const ordinalMetaQ = new OrdinalMeta({
                    categories: [],
                    needCollect: true,
                    deduplication: true
                });
                testArrayRowsInSource([
                    { name: 'x', type: 'number' },
                    { name: 'p', type: 'ordinal', otherDims: { itemId: 0 }, ordinalMeta: ordinalMetaP },
                    { name: 'q', type: 'ordinal', otherDims: { itemName: 0 }, ordinalMeta: ordinalMetaQ }
                ]);
            });

            function testArrayRowsInSource(dimensionsInfo: SeriesDimensionDefine[]): void {
                const list = new SeriesData(dimensionsInfo, new Model());
                const oneByOne = makeOneByOneChecker(list);

                const source = createSource(
                    [
                        [0, 'myId_10', null],
                        [10, 555, null], // numeric id.
                        [20, '666%', null],
                        [30, 'myId_good', 'b'],
                        [40, null, 'b'],
                        [50, null, null],
                        [60, undefined, null],
                        [70, NaN, null],
                        [80, '', null],
                        [90, null, 'b'],
                        [100, null, null],
                        [110, 'myId_better', null],
                        [120, 'myId_better', null] // duplicated id.
                    ],
                    {
                        seriesLayoutBy: 'column',
                        sourceHeader: 0,
                        dimensions: null
                    },
                    SOURCE_FORMAT_ARRAY_ROWS
                );
                list.initData(source);
                oneByOne.nextIdEqualsTo('myId_10');
                oneByOne.nextIdEqualsTo('555');
                oneByOne.nextIdEqualsTo('666%');
                oneByOne.nextIdEqualsTo('myId_good');
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.nextIdEqualsTo('NaN');
                oneByOne.nextIdEqualsTo('');
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.nextIdEqualsTo('myId_better');
                oneByOne.nextIdEqualsTo('myId_better');

                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('b');
                oneByOne.nextNameEqualsTo('b');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('b');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');

                list.appendData([
                    [ 200, 'myId_best', null ],
                    [ 210, 999, null ], // numeric id.
                    [ 220, '777px', null],
                    [ 230, null, 'b' ],
                    [ 240, null, null ]
                ]);

                oneByOne.nextIdEqualsTo('myId_best');
                oneByOne.nextIdEqualsTo('999');
                oneByOne.nextIdEqualsTo('777px');
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);

                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('');
                oneByOne.nextNameEqualsTo('b');
                oneByOne.nextNameEqualsTo('');

                list.appendValues([], ['b', 'c', null]);

                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.nextIdEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);

                oneByOne.nextNameEqualsTo('b');
                oneByOne.nextNameEqualsTo('c');
                oneByOne.nextNameEqualsTo('');
            }

        });
    });
});
