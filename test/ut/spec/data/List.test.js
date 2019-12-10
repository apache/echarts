
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
const Source = require('../../../../lib/data/Source');
const List = require('../../../../lib/data/List');
describe('List', function () {

    describe('Data Manipulation', function () {

        it('initData 1d', function () {
            var list = new List(['x', 'y']);
            list.initData([10, 20, 30]);
            expect(list.get('x', 0)).toEqual(10);
            expect(list.get('x', 1)).toEqual(20);
            expect(list.get('x', 2)).toEqual(30);
            expect(list.get('y', 1)).toEqual(20);
        });

        it('initData 2d', function () {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.get('x', 1)).toEqual(20);
            expect(list.get('y', 1)).toEqual(25);
        });

        it('initData 2d yx', function () {
            var list = new List(['y', 'x']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.get('x', 1)).toEqual(25);
            expect(list.get('y', 1)).toEqual(20);
        });

        it('Data with option 1d', function () {
            var list = new List(['x', 'y']);
            list.initData([1, {
                value: 2,
                somProp: 'foo'
            }]);
            expect(list.getItemModel(1).get('somProp')).toEqual('foo');
            expect(list.getItemModel(0).get('somProp')).toBeNull();
        });

        it('Empty data', function () {
            var list = new List(['x', 'y']);
            list.initData([1, '-']);
            expect(list.get('y', 1)).toBeNaN();
        });

        it('getRawValue', function () {
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

        it('indexOfRawIndex', function () {
            var list = new List(['x']);
            list.initData([]);
            expect(list.indexOfRawIndex(1)).toEqual(-1);

            var list1 = new List(['x']);
            list1.initData([0]);
            expect(list1.indexOfRawIndex(0)).toEqual(0);
            expect(list1.indexOfRawIndex(1)).toEqual(-1);

            var list2 = new List(['x']);
            list2.initData([0, 1, 2, 3]);
            expect(list2.indexOfRawIndex(1)).toEqual(1);
            expect(list2.indexOfRawIndex(2)).toEqual(2);
            expect(list2.indexOfRawIndex(5)).toEqual(-1);

            var list3 = new List(['x']);
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
            var list = new List(['x', 'y']);
            list.initData([1, 2, 3]);
            expect(list.getDataExtent('x')).toEqual([1, 3]);
            expect(list.getDataExtent('y')).toEqual([1, 3]);
        });

        it('Data types', function () {
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

        it('map', function () {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.map(['x', 'y'], function (x, y) {
                return [x + 2, y + 2];
            }).mapArray('x', function (x) {
                return x;
            })).toEqual([12, 22, 32]);
        });

        it('mapArray', function () {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.mapArray(['x', 'y'], function (x, y) {
                return [x, y];
            })).toEqual([[10, 15], [20, 25], [30, 35]]);
        });

        it('filterSelf', function () {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.filterSelf(['x', 'y'], function (x, y) {
                return x < 30 && x > 10;
            }).mapArray('x', function (x) {
                return x;
            })).toEqual([20]);
        });

        it('dataProvider', function () {
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

    describe('Data read', function () {
        it('indicesOfNearest', function () {
            var list = new List(['value']);
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
});