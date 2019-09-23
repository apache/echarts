
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

describe('List', function () {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare([
        'echarts/src/data/List',
        'echarts/src/data/Source'
    ]);

    describe('Data Manipulation', function () {

        testCase('initData 1d', function (List) {
            var list = new List(['x', 'y']);
            list.initData([10, 20, 30]);
            expect(list.get('x', 0)).toEqual(10);
            expect(list.get('x', 1)).toEqual(20);
            expect(list.get('x', 2)).toEqual(30);
            expect(list.get('y', 1)).toEqual(20);
        });

        testCase('initData 2d', function (List) {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.get('x', 1)).toEqual(20);
            expect(list.get('y', 1)).toEqual(25);
        });

        testCase('initData 2d yx', function (List) {
            var list = new List(['y', 'x']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.get('x', 1)).toEqual(25);
            expect(list.get('y', 1)).toEqual(20);
        });

        testCase('Data with option 1d', function (List) {
            var list = new List(['x', 'y']);
            list.initData([1, {
                value: 2,
                somProp: 'foo'
            }]);
            expect(list.getItemModel(1).get('somProp')).toEqual('foo');
            expect(list.getItemModel(0).get('somProp')).toBeNull();
        });

        testCase('Empty data', function (List) {
            var list = new List(['x', 'y']);
            list.initData([1, '-']);
            expect(list.get('y', 1)).toBeNaN();
        });

        testCase('getRawValue', function (List) {
            var list1 = new List(['x', 'y']);
            // here construct a new list2 because if we only use one list
            // to call initData() twice, list._chunkCount will be accumulated
            // to 1 instead of 0.
            var list2 = new List(['x', 'y']);

            list1.initData([1, 2, 3]);
            expect(list1.getItemModel(1).option).toEqual(2);

            list2.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list2.getItemModel(1).option).toEqual([20, 25]);
        });

        testCase('indexOfRawIndex', function (List) {
            var list = new List(['x']);

            list.initData([]);
            expect(list.indexOfRawIndex(1)).toEqual(-1);

            list.initData([0]);
            expect(list.indexOfRawIndex(0)).toEqual(0);
            expect(list.indexOfRawIndex(1)).toEqual(-1);

            list.initData([0, 1, 2, 3]);
            expect(list.indexOfRawIndex(1)).toEqual(1);
            expect(list.indexOfRawIndex(2)).toEqual(2);
            expect(list.indexOfRawIndex(5)).toEqual(-1);

            list.initData([0, 1, 2, 3, 4]);
            expect(list.indexOfRawIndex(2)).toEqual(2);
            expect(list.indexOfRawIndex(3)).toEqual(3);
            expect(list.indexOfRawIndex(5)).toEqual(-1);

            list.filterSelf(function (idx) {
                return idx >= 2;
            });
            expect(list.indexOfRawIndex(2)).toEqual(0);
        });

        testCase('getDataExtent', function (List) {
            var list = new List(['x', 'y']);
            list.initData([1, 2, 3]);
            expect(list.getDataExtent('x')).toEqual([1, 3]);
            expect(list.getDataExtent('y')).toEqual([1, 3]);
        });

        testCase('Data types', function (List) {
            var list = new List([{
                name: 'x',
                type: 'int'
            }, {
                name: 'y',
                type: 'float'
            }]);
            list.initData([[1.1, 1.1]]);
            expect(list.get('x', 0)).toEqual(1);
            expect(list.get('y', 0)).toBeCloseTo(1.1, 5);
        });

        testCase('map', function (List) {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.map(['x', 'y'], function (x, y) {
                return [x + 2, y + 2];
            }).mapArray('x', function (x) {
                return x;
            })).toEqual([12, 22, 32]);
        });

        testCase('mapArray', function (List) {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.mapArray(['x', 'y'], function (x, y) {
                return [x, y];
            })).toEqual([[10, 15], [20, 25], [30, 35]]);
        });

        testCase('filterSelf', function (List) {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.filterSelf(['x', 'y'], function (x, y) {
                return x < 30 && x > 10;
            }).mapArray('x', function (x) {
                return x;
            })).toEqual([20]);
        });

        testCase('dataProvider', function (List, Source) {
            var list = new List(['x', 'y']);
            var typedArray = new Float32Array([10, 10, 20, 20]);
            var source = Source.seriesDataToSource(typedArray);
            list.initData({
                count: function () {
                    return typedArray.length / 2;
                },
                getItem: function (idx) {
                    return [typedArray[idx * 2], typedArray[idx * 2 + 1]];
                },
                getSource: function () {
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
});