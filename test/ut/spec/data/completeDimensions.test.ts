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


import completeDimensions from '../../../../src/data/helper/completeDimensions';
import { createSource } from '../../../../src/data/Source';
import { SOURCE_FORMAT_ARRAY_ROWS, SERIES_LAYOUT_BY_COLUMN } from '../../../../src/util/types';

type ParametersOfCompleteDimensions = Parameters<typeof completeDimensions>;

describe('completeDimensions', function () {

    function doCompleteDimensions(
        sysDims: ParametersOfCompleteDimensions[0],
        data: ParametersOfCompleteDimensions[1],
        opt: ParametersOfCompleteDimensions[2]
    ) {
        const result = completeDimensions(sysDims, data, opt);
        if (result) {
            for (let i = 0; i < result.length; i++) {
                const item = result[i];
                if (item && item.hasOwnProperty('dimsDef') && (item as any).dimsDef == null) {
                    delete (item as any).dimsDef;
                }
            }
        }
        return result;
    }

    it('namesMoreThanDimCount', function () {
        const sysDims = [
            {
                'name': 'x',
                'type': 'ordinal' as const,
                'otherDims': {
                    'tooltip': false as const,
                    'itemName': 0
                },
                'dimsDef': [
                    'base'
                ]
            },
            {
                'name': 'y',
                'type': 'float' as const,
                'dimsDef': [
                    'open',
                    'close',
                    'lowest',
                    'highest'
                ]
            }
        ];

        const source = createSource(
            [
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
            ],
            {
                seriesLayoutBy: SERIES_LAYOUT_BY_COLUMN,
                sourceHeader: 0,
                dimensions: void 0
            },
            SOURCE_FORMAT_ARRAY_ROWS,
            null
        );

        const opt = {
            'dimsDef': [
                {
                    'name': 'date',
                    'displayName': 'date'
                },
                {
                    'name': 'open',
                    'displayName': 'open'
                },
                {
                    'name': 'high',
                    'displayName': 'high'
                },
                {
                    'name': 'low',
                    'displayName': 'low'
                },
                {
                    'name': 'close',
                    'displayName': 'close'
                },
                {
                    'name': 'volume',
                    'displayName': 'volume'
                },
                {
                    'name': 'haOpen',
                    'displayName': 'haOpen'
                },
                {
                    'name': 'haHigh',
                    'displayName': 'haHigh'
                },
                {
                    'name': 'haLow',
                    'displayName': 'haLow'
                },
                {
                    'name': 'haClose',
                    'displayName': 'haClose'
                },
                {
                    'name': 'sma9',
                    'displayName': 'sma9'
                }
            ],
            'encodeDef': {
                'x': 'date',
                'y': [
                    'haOpen',
                    'haClose',
                    'haLow',
                    'haHigh'
                ],
                'tooltip': [
                    'open',
                    'high',
                    'low',
                    'close'
                ]
            },
            'dimCount': 5
        };

        const result: unknown = [
            {
                'otherDims': {
                    'tooltip': false,
                    'itemName': 0
                },
                'displayName': 'date',
                'name': 'date',
                'coordDim': 'x',
                'coordDimIndex': 0,
                'type': 'ordinal',
                'ordinalMeta': undefined
            },
            {
                'otherDims': {
                    'tooltip': 0
                },
                'displayName': 'open',
                'name': 'open',
                'coordDim': 'value',
                'coordDimIndex': 0,
                'isExtraCoord': true
            },
            {
                'otherDims': {
                    'tooltip': 1
                },
                'displayName': 'high',
                'name': 'high',
                'coordDim': 'value0',
                'coordDimIndex': 0,
                'isExtraCoord': true
            },
            {
                'otherDims': {
                    'tooltip': 2
                },
                'displayName': 'low',
                'name': 'low',
                'coordDim': 'value1',
                'coordDimIndex': 0,
                'isExtraCoord': true
            },
            {
                'otherDims': {
                    'tooltip': 3
                },
                'displayName': 'close',
                'name': 'close',
                'coordDim': 'value2',
                'coordDimIndex': 0,
                'isExtraCoord': true
            },
            {
                'otherDims': {},
                'displayName': 'volume',
                'name': 'volume',
                'coordDim': 'value3',
                'coordDimIndex': 0,
                'isExtraCoord': true
            },
            {
                'otherDims': {},
                'displayName': 'haOpen',
                'name': 'haOpen',
                'coordDim': 'y',
                'coordDimIndex': 0,
                'type': 'float',
                'ordinalMeta': undefined
            },
            {
                'otherDims': {},
                'displayName': 'haHigh',
                'name': 'haHigh',
                'coordDim': 'y',
                'coordDimIndex': 3,
                'type': 'float',
                'ordinalMeta': undefined
            },
            {
                'otherDims': {},
                'displayName': 'haLow',
                'name': 'haLow',
                'coordDim': 'y',
                'coordDimIndex': 2,
                'type': 'float',
                'ordinalMeta': undefined
            },
            {
                'otherDims': {},
                'displayName': 'haClose',
                'name': 'haClose',
                'coordDim': 'y',
                'coordDimIndex': 1,
                'type': 'float',
                'ordinalMeta': undefined
            },
            {
                'otherDims': {},
                'displayName': 'sma9',
                'name': 'sma9',
                'coordDim': 'value4',
                'coordDimIndex': 0,
                'isExtraCoord': true
            }
        ];

        expect(doCompleteDimensions(sysDims, source, opt)).toEqual(result);
    });


    it('differentData', function () {
        function doTest(
            sysDims: ParametersOfCompleteDimensions[0],
            data: ParametersOfCompleteDimensions[1],
            opt: ParametersOfCompleteDimensions[2],
            result: unknown
        ) {
            expect(doCompleteDimensions(sysDims, data, opt)).toEqual(result);
        }

        // test dimcount
        doTest(['x', 'y'], [], null, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x'
            },
            {
                'otherDims': {},
                'coordDim': 'y',
                'coordDimIndex': 0,
                'name': 'y'
            }
        ]);

        doTest(['x', 'y'], [12], null, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x'
            },
            {
                'otherDims': {},
                'coordDim': 'y',
                'coordDimIndex': 0,
                'name': 'y'
            }
        ]);

        doTest(['x', 'y'], [12, 4], null, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x'
            },
            {
                'otherDims': {},
                'coordDim': 'y',
                'coordDimIndex': 0,
                'name': 'y'
            }
        ]);

        doTest(['x'], [[32, 55]], null, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x'
            }
        ]);

        doTest(['x', 'y', 'z'], [[32, 55]], null, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x'
            },
            {
                'otherDims': {},
                'coordDim': 'y',
                'coordDimIndex': 0,
                'name': 'y'
            },
            {
                'otherDims': {},
                'coordDim': 'z',
                'coordDimIndex': 0,
                'name': 'z'
            }
        ]);

        doTest(['x'], [[32, 55], [99, 11]], null, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x'
            }
        ]);

        doTest(['x', 'y'], [[32, 55], [99, 11]], {dimCount: 4}, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x'
            },
            {
                'otherDims': {},
                'coordDim': 'y',
                'coordDimIndex': 0,
                'name': 'y'
            },
            {
                'otherDims': {},
                'coordDim': 'value',
                'coordDimIndex': 0,
                'isExtraCoord': true,
                'name': 'value'
            },
            {
                'otherDims': {},
                'coordDim': 'value0',
                'coordDimIndex': 0,
                'isExtraCoord': true,
                'name': 'value0'
            }
        ]);
    });








    it('differentSysDims', function () {
        function doTest(
            sysDims: ParametersOfCompleteDimensions[0],
            data: ParametersOfCompleteDimensions[1],
            opt: ParametersOfCompleteDimensions[2],
            result: unknown
        ) {
            expect(doCompleteDimensions(sysDims, data, opt)).toEqual(result);
        }

        const data = [
            ['iw', 332, 4434, 323, 59],
            ['vrr', 44, 11, 144, 55]
        ];

        doTest(
            ['x', 'y'], data, null,
            [
                {
                    'otherDims': {},
                    'coordDim': 'x',
                    'coordDimIndex': 0,
                    'name': 'x',
                    'type': 'ordinal'
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 0,
                    'name': 'y'
                }
            ]
        );

        doTest(
            ['value'], data, null,
            [
                {
                    'otherDims': {},
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'name': 'value',
                    'type': 'ordinal'
                }
            ]
        );

        doTest(
            [{name: 'time', type: 'time' as const}, 'value'],
            data,
            null,
            [
                {
                    'otherDims': {},
                    'name': 'time',
                    'type': 'time',
                    'coordDimIndex': 0,
                    'ordinalMeta': undefined,
                    'coordDim': 'time'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'name': 'value'
                }
            ]
        );

        doTest(
            [{
                name: 'y',
                otherDims: {
                    tooltip: false
                },
                dimsDef: ['base']
            }, {
                name: 'x',
                dimsDef: ['open', 'close']
            }], data, {},
            [
                {
                    'otherDims': {
                        'tooltip': false
                    },
                    'name': 'base',
                    'defaultTooltip': undefined,
                    'coordDimIndex': 0,
                    'coordDim': 'y',
                    'type': 'ordinal',
                    'displayName': 'base',
                    'ordinalMeta': undefined
                },
                {
                    'otherDims': {},
                    'name': 'open',
                    'ordinalMeta': undefined,
                    'defaultTooltip': undefined,
                    'coordDimIndex': 0,
                    'coordDim': 'x',
                    'displayName': 'open'
                }
            ]
        );

        doTest(
            [{
                name: 'y',
                otherDims: {
                    tooltip: false
                },
                dimsDef: ['base']
            }, {
                name: 'x',
                dimsDef: ['open', 'close']
            }], data, {
                dimsDef: ['基础', '打开', '关闭'],
                encodeDef: {
                    tooltip: [1, 2, 0]
                }
            },
            [
                {
                    'otherDims': {
                        'tooltip': 2
                    },
                    'name': '基础',
                    'displayName': '基础',
                    'ordinalMeta': undefined,
                    'coordDimIndex': 0,
                    'coordDim': 'y',
                    'type': 'ordinal'
                },
                {
                    'otherDims': {
                        'tooltip': 0
                    },
                    'name': '打开',
                    'displayName': '打开',
                    'coordDimIndex': 0,
                    'ordinalMeta': undefined,
                    'coordDim': 'x'
                },
                {
                    'otherDims': {
                        'tooltip': 1
                    },
                    'name': '关闭',
                    'displayName': '关闭',
                    'ordinalMeta': undefined,
                    'coordDimIndex': 1,
                    'coordDim': 'x'
                }
            ]
        );

        doTest(
            [{
                name: 'y',
                otherDims: {
                    tooltip: false
                },
                dimsDef: ['base']
            }, {
                name: 'x',
                dimsDef: ['open', 'close']
            }], data, {
                dimsDef: ['基础', null, '关闭'],
                encodeDef: {
                    x: [0, 4]
                }
            },
            [
                {
                    'otherDims': {},
                    'displayName': '基础',
                    'name': '基础',
                    'coordDimIndex': 0,
                    'coordDim': 'x',
                    'ordinalMeta': undefined,
                    'type': 'ordinal'
                },
                {
                    'otherDims': {
                        'tooltip': false
                    },
                    'name': 'base',
                    'displayName': 'base',
                    'ordinalMeta': undefined,
                    'defaultTooltip': undefined,
                    'coordDimIndex': 0,
                    'coordDim': 'y'
                },
                {
                    'otherDims': {},
                    'name': '关闭',
                    'displayName': '关闭',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'coordDim': 'value'
                }
            ]
        );

    });









    it('dimsDef', function () {
        function doTest(
            sysDims: ParametersOfCompleteDimensions[0],
            data: ParametersOfCompleteDimensions[1],
            opt: ParametersOfCompleteDimensions[2],
            result: unknown
        ) {
            expect(doCompleteDimensions(sysDims, data, opt)).toEqual(result);
        }

        const data = [['iw', 332, 4434, 323, 59], ['vrr', 44, 11, 144, 55]];
        doTest(
            ['x', 'y', 'value'], data,
            {dimsDef: ['挨克思', null, '歪溜']},
            [
                {
                    'otherDims': {},
                    'displayName': '挨克思',
                    'name': '挨克思',
                    'type': 'ordinal',
                    'coordDim': 'x',
                    'coordDimIndex': 0
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 0,
                    'name': 'y'
                },
                {
                    'otherDims': {},
                    'displayName': '歪溜',
                    'name': '歪溜',
                    'coordDim': 'value',
                    'coordDimIndex': 0
                }
            ]
        );

        doTest(
            ['x', 'y', 'value'], data,
            {dimsDef: ['挨克思', null, {type: 'ordinal' as const}]}, // no name but only type
            [
                {
                    'otherDims': {},
                    'displayName': '挨克思',
                    'name': '挨克思',
                    'type': 'ordinal',
                    'coordDim': 'x',
                    'coordDimIndex': 0
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 0,
                    'name': 'y'
                },
                {
                    'otherDims': {},
                    'name': 'value',
                    'coordDim': 'value',
                    'type': 'ordinal',
                    'coordDimIndex': 0
                }
            ]
        );

        doTest(
            [{name: 'time', type: 'time' as const}, 'value'], data,
            {dimsDef: [{name: '泰亩', type: 'ordinal'}, {name: '歪溜', type: 'float'}]},
            [
                {
                    'otherDims': {},
                    'displayName': '泰亩',
                    'name': '泰亩',
                    'type': 'ordinal',
                    'ordinalMeta': undefined,
                    'coordDimIndex': 0,
                    'coordDim': 'time'
                },
                {
                    'otherDims': {},
                    'displayName': '歪溜',
                    'name': '歪溜',
                    'type': 'float',
                    'coordDim': 'value',
                    'coordDimIndex': 0
                }
            ]
        );
    });









    it('encodeDef', function () {
        function doTest(
            sysDims: ParametersOfCompleteDimensions[0],
            data: ParametersOfCompleteDimensions[1],
            opt: ParametersOfCompleteDimensions[2],
            result: unknown
        ) {
            expect(doCompleteDimensions(sysDims, data, opt)).toEqual(result);
        }

        const data = [['iw', 332, 4434, 323, 'd8', 59], ['vrr', 44, 11, 144, '-', 55]];

        doTest(
            null, data,
            {
                encodeDef: {
                    x: 2,
                    y: [1, 4],
                    tooltip: 2,
                    label: [3, 5]
                }
            },
            [
                {
                    'otherDims': {},
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'name': 'value',
                    'isExtraCoord': true,
                    'type': 'ordinal'
                }
            ]
        );

        doTest(
            null, data,
            {
                dimsDef: ['挨克思', null, '歪溜'],
                encodeDef: {
                    x: 2,
                    y: [1, 4],
                    tooltip: 2,
                    label: [3, 5]
                }
            },
            [
                {
                    'otherDims': {},
                    'displayName': '挨克思',
                    'name': '挨克思',
                    'type': 'ordinal',
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'isExtraCoord': true
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 0,
                    'name': 'y'
                },
                {
                    'otherDims': {
                        'tooltip': 0
                    },
                    'displayName': '歪溜',
                    'name': '歪溜',
                    'coordDim': 'x',
                    'coordDimIndex': 0
                }
            ]
        );

        doTest(
            ['x', {name: 'y', type: 'time' as const}, 'z'], data,
            {
                dimsDef: ['挨克思', null, '歪溜'],
                encodeDef: {
                    x: 2,
                    y: [1, 4],
                    tooltip: 2,
                    label: [3, 5]
                }
            },
            [
                {
                    'otherDims': {},
                    'displayName': '挨克思',
                    'name': '挨克思',
                    'type': 'ordinal',
                    'coordDim': 'z',
                    'coordDimIndex': 0
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 0,
                    'name': 'y',
                    'type': 'time',
                    'ordinalMeta': undefined
                },
                {
                    'otherDims': {
                        'tooltip': 0
                    },
                    'displayName': '歪溜',
                    'name': '歪溜',
                    'coordDim': 'x',
                    'coordDimIndex': 0
                }
            ]
        );

        doTest(
            [{name: 'time', type: 'time' as const}, 'value'], data,
            {
                // dimsDef type 'ordinal' has higher priority then sysDims type 'time'.
                dimsDef: [{name: '泰亩', type: 'ordinal'}, {name: '歪溜', type: 'float'}],
                encodeDef: {
                    tooltip: 2
                }
            },
            [
                {
                    'otherDims': {},
                    'displayName': '泰亩',
                    'name': '泰亩',
                    'type': 'ordinal',
                    'ordinalMeta': undefined,
                    'coordDimIndex': 0,
                    'coordDim': 'time'
                },
                {
                    'otherDims': {},
                    'displayName': '歪溜',
                    'name': '歪溜',
                    'type': 'float',
                    'coordDim': 'value',
                    'coordDimIndex': 0
                }
            ]
        );

        doTest(
            [{name: 'time', type: 'time' as const}, 'value'], data,
            {
                // dimsDef type 'ordinal' has higher priority then sysDims type 'time'.
                dimsDef: [{name: '泰亩', type: 'ordinal'}, {name: '歪溜', type: 'float'}],
                encodeDef: {
                    tooltip: 2
                }
            },
            [
                {
                    'otherDims': {},
                    'displayName': '泰亩',
                    'name': '泰亩',
                    'type': 'ordinal',
                    'ordinalMeta': undefined,
                    'coordDimIndex': 0,
                    'coordDim': 'time'
                },
                {
                    'otherDims': {},
                    'displayName': '歪溜',
                    'name': '歪溜',
                    'type': 'float',
                    'coordDim': 'value',
                    'coordDimIndex': 0
                }
            ]
        );

    });

});