
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

import List from '../../../../src/data/List';
import Model from '../../../../src/model/Model';
import { createSourceFromSeriesDataOption, Source, createSource } from '../../../../src/data/Source';
import { OptionDataItemObject, OptionDataValue, SOURCE_FORMAT_ARRAY_ROWS } from '../../../../src/util/types';
import DataDimensionInfo from '../../../../src/data/DataDimensionInfo';
import OrdinalMeta from '../../../../src/data/OrdinalMeta';


const ID_PREFIX = 'e\0\0';
const NAME_REPEAT_PREFIX = '__ec__';


describe('List', function () {

    describe('Data Manipulation', function () {

        it('initData 1d', function () {
            const list = new List(['x', 'y'], new Model());
            list.initData([10, 20, 30]);
            expect(list.get('x', 0)).toEqual(10);
            expect(list.get('x', 1)).toEqual(20);
            expect(list.get('x', 2)).toEqual(30);
            expect(list.get('y', 1)).toEqual(20);
        });

        it('initData 2d', function () {
            const list = new List(['x', 'y'], new Model());
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.get('x', 1)).toEqual(20);
            expect(list.get('y', 1)).toEqual(25);
        });

        it('initData 2d yx', function () {
            const list = new List(['y', 'x'], new Model());
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.get('x', 1)).toEqual(25);
            expect(list.get('y', 1)).toEqual(20);
        });

        it('Data with option 1d', function () {
            const list = new List(['x', 'y'], new Model());
            list.initData([
                1,
                {
                    value: 2,
                    somProp: 'foo'
                } as OptionDataItemObject<OptionDataValue>
            ]);
            expect(list.getItemModel(1).get('somProp' as any)).toEqual('foo');
            expect(list.getItemModel(0).get('somProp' as any)).toBeNull();
        });

        it('Empty data', function () {
            const list = new List(['x', 'y'], new Model());
            list.initData([1, '-']);
            expect(list.get('y', 1)).toBeNaN();
        });

        it('getRawValue', function () {
            const list1 = new List(['x', 'y'], new Model());
            // here construct a new list2 because if we only use one list
            // to call initData() twice, list._chunkCount will be accumulated
            // to 1 instead of 0.
            const list2 = new List(['x', 'y'], new Model());

            list1.initData([1, 2, 3]);
            expect(list1.getItemModel(1).option).toEqual(2);

            list2.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list2.getItemModel(1).option).toEqual([20, 25]);
        });

        it('indexOfRawIndex', function () {
            const list = new List(['x'], new Model());
            list.initData([]);
            expect(list.indexOfRawIndex(1)).toEqual(-1);

            const list1 = new List(['x'], new Model());
            list1.initData([0]);
            expect(list1.indexOfRawIndex(0)).toEqual(0);
            expect(list1.indexOfRawIndex(1)).toEqual(-1);

            const list2 = new List(['x'], new Model());
            list2.initData([0, 1, 2, 3]);
            expect(list2.indexOfRawIndex(1)).toEqual(1);
            expect(list2.indexOfRawIndex(2)).toEqual(2);
            expect(list2.indexOfRawIndex(5)).toEqual(-1);

            const list3 = new List(['x'], new Model());
            list3.initData([0, 1, 2, 3, 4]);
            expect(list3.indexOfRawIndex(2)).toEqual(2);
            expect(list3.indexOfRawIndex(3)).toEqual(3);
            expect(list3.indexOfRawIndex(5)).toEqual(-1);

            list3.filterSelf(function (idx) {
                return idx >= 2;
            });
            expect(list3.indexOfRawIndex(2)).toEqual(0);
        });

        it('getDataExtent', function () {
            const list = new List(['x', 'y'], new Model());
            list.initData([1, 2, 3]);
            expect(list.getDataExtent('x')).toEqual([1, 3]);
            expect(list.getDataExtent('y')).toEqual([1, 3]);
        });

        it('Data types', function () {
            const list = new List([{
                name: 'x',
                type: 'int'
            }, {
                name: 'y',
                type: 'float'
            }], new Model());
            list.initData([[1.1, 1.1]]);
            expect(list.get('x', 0)).toEqual(1);
            expect(list.get('y', 0)).toBeCloseTo(1.1, 5);
        });

        it('map', function () {
            const list = new List(['x', 'y'], new Model());
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.map(['x', 'y'], function (x: number, y: number) {
                return [x + 2, y + 2];
            }).mapArray('x', function (x) {
                return x;
            })).toEqual([12, 22, 32]);
        });

        it('mapArray', function () {
            const list = new List(['x', 'y'], new Model());
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.mapArray(['x', 'y'], function (x, y) {
                return [x, y];
            })).toEqual([[10, 15], [20, 25], [30, 35]]);
        });

        it('filterSelf', function () {
            const list = new List(['x', 'y'], new Model());
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.filterSelf(['x', 'y'], function (x, y) {
                return x < 30 && x > 10;
            }).mapArray('x', function (x) {
                return x;
            })).toEqual([20]);
        });

        it('dataProvider', function () {
            const list = new List(['x', 'y'], new Model());
            const typedArray = new Float32Array([10, 10, 20, 20]);
            const source = createSourceFromSeriesDataOption(typedArray);
            list.initData({
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
            expect(list.mapArray(['x', 'y'], function (x, y) {
                return [x, y];
            })).toEqual([[10, 10], [20, 20]]);
            expect(list.getRawDataItem(0)).toEqual([10, 10]);
            expect(list.getItemModel(0).option).toEqual([10, 10]);
        });
    });

    describe('Data read', function () {
        it('indicesOfNearest', function () {
            const list = new List(['value'], new Model());
            // ---- index: 0   1   2   3   4   5   6   7
            list.initData([10, 20, 30, 35, 40, 40, 35, 50]);

            expect(list.indicesOfNearest('value', 24.5)).toEqual([1]);
            expect(list.indicesOfNearest('value', 25)).toEqual([1]);
            expect(list.indicesOfNearest('value', 25.5)).toEqual([2]);
            expect(list.indicesOfNearest('value', 25.5)).toEqual([2]);
            expect(list.indicesOfNearest('value', 41)).toEqual([4, 5]);
            expect(list.indicesOfNearest('value', 39)).toEqual([4, 5]);
            expect(list.indicesOfNearest('value', 41)).toEqual([4, 5]);
            expect(list.indicesOfNearest('value', 36)).toEqual([3, 6]);

            expect(list.indicesOfNearest('value', 50.6, 0.5)).toEqual([]);
            expect(list.indicesOfNearest('value', 50.5, 0.5)).toEqual([7]);
        });
    });

    describe('id_and_name', function () {

        function makeOneByOneChecker(list: List) {
            let getIdDataIndex = 0;
            let getNameDataIndex = 0;

            return {
                idEqualsTo: function (expectedId: string): void {
                    expect(list.getId(getIdDataIndex)).toEqual(expectedId);
                    getIdDataIndex++;
                },
                nameEqualsTo: function (expectedName: string): void {
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

            function doChecks(list: List) {
                const oneByOne = makeOneByOneChecker(list);

                oneByOne.idEqualsTo('a');
                oneByOne.idEqualsTo('b');
                oneByOne.idEqualsTo(`b${NAME_REPEAT_PREFIX}2`);
                oneByOne.idEqualsTo('c');
                oneByOne.idEqualsTo(`${ID_PREFIX}4`);
                oneByOne.idEqualsTo(`c${NAME_REPEAT_PREFIX}2`);
                oneByOne.idEqualsTo('d');
                oneByOne.idEqualsTo(`c${NAME_REPEAT_PREFIX}3`);

                oneByOne.nameEqualsTo('a');
                oneByOne.nameEqualsTo('b');
                oneByOne.nameEqualsTo('b');
                oneByOne.nameEqualsTo('c');
                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('c');
                oneByOne.nameEqualsTo('d');
                oneByOne.nameEqualsTo('c');
            }

            it('sourceFormatOriginal', function () {
                const list = new List(['x', 'y'], new Model());
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
                const list = new List(
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
                    SOURCE_FORMAT_ARRAY_ROWS,
                    {
                        itemName: 1
                    }
                );
                list.initData(source);

                doChecks(list);
            });
        });


        describe('id_name_declared_sourceFormat_original', function () {

            it('sourceFormatOriginal', function () {
                const list = new List(['x'], new Model());
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

                oneByOne.idEqualsTo('myId_10');
                oneByOne.idEqualsTo('555');
                oneByOne.idEqualsTo('666%');
                oneByOne.idEqualsTo('myId_good');
                oneByOne.idEqualsTo('b');
                oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.idEqualsTo('NaN');
                oneByOne.idEqualsTo('');
                oneByOne.idEqualsTo(`b${NAME_REPEAT_PREFIX}2`);
                oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                oneByOne.idEqualsTo('myId_better');
                oneByOne.idEqualsTo('myId_better');

                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('b');
                oneByOne.nameEqualsTo('b');
                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('b');
                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('');

                list.appendData([
                    { value: 200, id: 'myId_best' },
                    { value: 210, id: 999 }, // numeric id.
                    { value: 220, id: '777px' },
                    { value: 230, name: 'b' },
                    { value: 240 }
                ]);

                oneByOne.idEqualsTo('myId_best');
                oneByOne.idEqualsTo('999');
                oneByOne.idEqualsTo('777px');
                oneByOne.idEqualsTo(`b${NAME_REPEAT_PREFIX}3`);
                oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);

                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('');
                oneByOne.nameEqualsTo('b');
                oneByOne.nameEqualsTo('');

                list.appendValues(
                    [
                        [300],
                        [310],
                        [320]
                    ],
                    [
                        'b',
                        'c',
                        null
                    ]
                );

                oneByOne.idEqualsTo(`b${NAME_REPEAT_PREFIX}4`);
                oneByOne.idEqualsTo('c');
                oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);

                oneByOne.nameEqualsTo('b');
                oneByOne.nameEqualsTo('c');
                oneByOne.nameEqualsTo('');
            });

        });

        describe('id_name_declared_sourceFormat_arrayRows', function () {

            function makeChecker(list: List) {
                const oneByOne = makeOneByOneChecker(list);
                return {
                    checkAfterInitData() {
                        oneByOne.idEqualsTo('myId_10');
                        oneByOne.idEqualsTo('555');
                        oneByOne.idEqualsTo('666%');
                        oneByOne.idEqualsTo('myId_good');
                        oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                        oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                        oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                        oneByOne.idEqualsTo('NaN');
                        oneByOne.idEqualsTo('');
                        oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                        oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                        oneByOne.idEqualsTo('myId_better');
                        oneByOne.idEqualsTo('myId_better');

                        oneByOne.nameEqualsTo('');
                        oneByOne.nameEqualsTo('');
                        oneByOne.nameEqualsTo('');
                        oneByOne.nameEqualsTo('b');
                        oneByOne.nameEqualsTo('b');
                        oneByOne.nameEqualsTo('');
                        oneByOne.nameEqualsTo('');
                        oneByOne.nameEqualsTo('');
                        oneByOne.nameEqualsTo('');
                        oneByOne.nameEqualsTo('b');
                        oneByOne.nameEqualsTo('');
                        oneByOne.nameEqualsTo('');
                        oneByOne.nameEqualsTo('');
                    },
                    checkAfterAppendData() {
                        oneByOne.idEqualsTo('myId_best');
                        oneByOne.idEqualsTo('999');
                        oneByOne.idEqualsTo('777px');
                        oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                        oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);

                        oneByOne.nameEqualsTo('');
                        oneByOne.nameEqualsTo('');
                        oneByOne.nameEqualsTo('');
                        oneByOne.nameEqualsTo('b');
                        oneByOne.nameEqualsTo('');
                    },
                    checkAfterAppendValues() {
                        oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                        oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);
                        oneByOne.idEqualsTo(`${ID_PREFIX}${oneByOne.currGetIdDataIndex()}`);

                        oneByOne.nameEqualsTo('b');
                        oneByOne.nameEqualsTo('c');
                        oneByOne.nameEqualsTo('');
                    }
                };
            }

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

            function testArrayRowsInSource(dimensionsInfo: DataDimensionInfo[]): void {
                const list = new List(dimensionsInfo, new Model());
                const checker = makeChecker(list);

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
                    SOURCE_FORMAT_ARRAY_ROWS,
                    {
                        itemId: 1,
                        itemName: 2
                    }
                );
                list.initData(source);

                checker.checkAfterInitData();

                list.appendData([
                    [ 200, 'myId_best', null ],
                    [ 210, 999, null ], // numeric id.
                    [ 220, '777px', null],
                    [ 230, null, 'b' ],
                    [ 240, null, null ]
                ]);

                checker.checkAfterAppendData();

                list.appendValues(
                    [
                        [300],
                        [310],
                        [320]
                    ],
                    [
                        'b',
                        'c',
                        null
                    ]
                );

                checker.checkAfterAppendValues();
            }

        });

    });
});
