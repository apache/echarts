
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

describe('util/model', function() {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare(['echarts/src/util/model', 'echarts/src/model/Model']);


    describe('compressBatches', function () {

        function item(seriesId, dataIndex) {
            return {seriesId: seriesId, dataIndex: dataIndex};
        }

        testCase('base', function (modelUtil) {
            // Remove dupliate between A and B
            expect(modelUtil.compressBatches(
                [item(3, 4), item(3, 5), item(4, 5)],
                [item(4, 6), item(4, 5), item(3, 3), item(3, 4)]
            )).toEqual([
                [item('3', [5])],
                [item('3', [3]), item('4', [6])]
            ]);

            // Compress
            expect(modelUtil.compressBatches(
                [item(3, 4), item(3, 6), item(3, 5), item(4, 5)],
                [item(4, 6), item(4, 5), item(3, 3), item(3, 4), item(4, 7)]
            )).toEqual([
                [item('3', [5, 6])],
                [item('3', [3]), item('4', [6, 7])]
            ]);

            // Remove duplicate in themselves
            expect(modelUtil.compressBatches(
                [item(3, 4), item(3, 6), item(3, 5), item(4, 5)],
                [item(4, 6), item(4, 5), item(3, 3), item(3, 4), item(4, 7), item(4, 6)]
            )).toEqual([
                [item('3', [5, 6])],
                [item('3', [3]), item('4', [6, 7])]
            ]);

            // dataIndex is array
            expect(modelUtil.compressBatches(
                [item(3, [4, 5, 8]), item(4, 4), item(3, [5, 7, 7])],
                [item(3, [8, 9])]
            )).toEqual([
                [item('3', [4, 5, 7]), item('4', [4])],
                [item('3', [9])]
            ]);

            // empty
            expect(modelUtil.compressBatches(
                [item(3, [4, 5, 8]), item(4, 4), item(3, [5, 7, 7])],
                []
            )).toEqual([
                [item('3', [4, 5, 7, 8]), item('4', [4])],
                []
            ]);
            expect(modelUtil.compressBatches(
                [],
                [item(3, [4, 5, 8]), item(4, 4), item(3, [5, 7, 7])]
            )).toEqual([
                [],
                [item('3', [4, 5, 7, 8]), item('4', [4])]
            ]);

            // should not has empty array
            expect(modelUtil.compressBatches(
                [item(3, [4, 5, 8])],
                [item(3, [4, 5, 8])]
            )).toEqual([
                [],
                []
            ]);
        });

    });

});