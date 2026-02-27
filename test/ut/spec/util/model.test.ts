
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

import { compressBatches, removeDuplicates } from '@/src/util/model';


describe('util/model', function () {


    describe('compressBatches', function () {

        function item(seriesId: number | string, dataIndex: number | number[]) {
            return {seriesId, dataIndex};
        }

        it('base', function () {
            // Remove dupliate between A and B
            expect(compressBatches(
                [item(3, 4), item(3, 5), item(4, 5)],
                [item(4, 6), item(4, 5), item(3, 3), item(3, 4)]
            )).toEqual([
                [item('3', [5])],
                [item('3', [3]), item('4', [6])]
            ]);

            // Compress
            expect(compressBatches(
                [item(3, 4), item(3, 6), item(3, 5), item(4, 5)],
                [item(4, 6), item(4, 5), item(3, 3), item(3, 4), item(4, 7)]
            )).toEqual([
                [item('3', [5, 6])],
                [item('3', [3]), item('4', [6, 7])]
            ]);

            // Remove duplicate in themselves
            expect(compressBatches(
                [item(3, 4), item(3, 6), item(3, 5), item(4, 5)],
                [item(4, 6), item(4, 5), item(3, 3), item(3, 4), item(4, 7), item(4, 6)]
            )).toEqual([
                [item('3', [5, 6])],
                [item('3', [3]), item('4', [6, 7])]
            ]);

            // dataIndex is array
            expect(compressBatches(
                [item(3, [4, 5, 8]), item(4, 4), item(3, [5, 7, 7])],
                [item(3, [8, 9])]
            )).toEqual([
                [item('3', [4, 5, 7]), item('4', [4])],
                [item('3', [9])]
            ]);

            // empty
            expect(compressBatches(
                [item(3, [4, 5, 8]), item(4, 4), item(3, [5, 7, 7])],
                []
            )).toEqual([
                [item('3', [4, 5, 7, 8]), item('4', [4])],
                []
            ]);
            expect(compressBatches(
                [],
                [item(3, [4, 5, 8]), item(4, 4), item(3, [5, 7, 7])]
            )).toEqual([
                [],
                [item('3', [4, 5, 7, 8]), item('4', [4])]
            ]);

            // should not has empty array
            expect(compressBatches(
                [item(3, [4, 5, 8])],
                [item(3, [4, 5, 8])]
            )).toEqual([
                [],
                []
            ]);
        });


        describe('removeDuplicates', function () {

            type Item1 = {
                name: string;
                name2?: string;
                extraNum?: number;
            };
            type Item2 = {
                value: number;
            };

            it('removeDuplicates_resolve1', function () {
                const countRecord: number[] = [];
                function resolve1(item: Item1, count: number): void {
                    countRecord.push(count);
                    item.name2 = item.name + (
                        count > 0 ? (count - 1) : ''
                    );
                }
                const arr: Item1[] = [
                    {name: 'y'},
                    {name: 'b'},
                    {name: 'y'},
                    {name: 't'},
                    {name: 'y'},
                    {name: 'z'},
                    {name: 't'},
                ];
                const arrLengthOriginal = arr.length;
                const arrNamesOriginal = arr.map(item => item.name);
                removeDuplicates(arr, item => item.name, resolve1);

                expect(countRecord).toEqual([0, 0, 1, 0, 2, 0, 1]);
                expect(arr.length).toEqual(arrLengthOriginal);
                expect(arr.map(item => item.name)).toEqual(arrNamesOriginal);
                expect(arr.map(item => item.name2)).toEqual(['y', 'b', 'y0', 't', 'y1', 'z', 't0']);
            });

            it('removeDuplicates_no_resolve_has_value', function () {
                const arr: string[] = [
                    'y',
                    'b',
                    'y',
                    undefined,
                    'y',
                    null,
                    'y',
                    't',
                    'b',
                ];
                removeDuplicates(arr, item => item + '', null);
                expect(arr.length).toEqual(5);
                expect(arr).toEqual(['y', 'b', undefined, null, 't']);
            });

            it('removeDuplicates_priority', function () {
                const arr: Item1[] = [
                    {name: 'y', extraNum: 100},
                    {name: 'b', extraNum: 101},
                    {name: 'y', extraNum: 102},
                    {name: 't', extraNum: 103},
                    {name: 'y', extraNum: 104},
                    {name: 'z', extraNum: 105},
                    {name: 't', extraNum: 106},
                ];
                removeDuplicates(arr, item => item.name, null);
                expect(arr.length).toEqual(4);
                expect(arr.map(item => item.name)).toEqual(['y', 'b', 't', 'z']);
                expect(arr.map(item => item.extraNum)).toEqual([100, 101, 103, 105]);
            });

            it('removeDuplicates_edges_cases', function () {
                function run(inputArr: Item2[], expectArr: Item2[]): void {
                    removeDuplicates(inputArr, (item: Item2) => item.value + '', null);
                    expect(inputArr).toEqual(expectArr);
                }

                run(
                    [],
                    []
                );
                run(
                    [
                        {value: 1},
                    ],
                    [
                        {value: 1}
                    ]
                );
                run(
                    [
                        { value: 1 },
                        { value: 2 },
                        { value: 3 }
                    ],
                    [
                        { value: 1 },
                        { value: 2 },
                        { value: 3 }
                    ],
                );
                run(
                    [
                        { value: 1 },
                        { value: 2 },
                        { value: 2 },
                        { value: 3 }
                    ],
                    [
                        { value: 1 },
                        { value: 2 },
                        { value: 3 }
                    ],
                );
                run(
                    [
                        { value: 1 },
                        { value: 1 },
                        { value: 2 }
                    ],
                    [
                        { value: 1 },
                        { value: 2 }
                    ],
                );
                run(
                    [
                        { value: 1 },
                        { value: 2 },
                        { value: 2 }
                    ],
                    [
                        { value: 1 },
                        { value: 2 }
                    ],
                );
                run(
                    [
                        { value: 2 },
                        { value: 2 },
                        { value: 2 }
                    ],
                    [
                        { value: 2 }
                    ],
                );
                run(
                    [
                        { value: 5 },
                        { value: 5 }
                    ],
                    [
                        { value: 5 },
                    ],
                );

            });

        });

    });

});