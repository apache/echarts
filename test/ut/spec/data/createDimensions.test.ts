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


import SeriesDimensionDefine from '@/src/data/SeriesDimensionDefine';
import createDimensions from '@/src/data/helper/createDimensions';
import { createSource } from '@/src/data/Source';
import { SOURCE_FORMAT_ARRAY_ROWS, SERIES_LAYOUT_BY_COLUMN } from '@/src/util/types';

type ParametersOfCreateDimensions = Parameters<typeof createDimensions>;

describe('createDimensions', function () {

    function doCreateDimensions(
        source: ParametersOfCreateDimensions[0],
        opt: ParametersOfCreateDimensions[1]
    ): SeriesDimensionDefine[] {
        const result = createDimensions(source, opt);
        for (let i = 0; i < result.dimensions.length; i++) {
            const item = result.dimensions[i];
            if (item && item.hasOwnProperty('dimsDef') && (item as any).dimsDef == null) {
                delete (item as any).dimsDef;
            }
        }
        return result.dimensions;
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
            SOURCE_FORMAT_ARRAY_ROWS
        );

        const opt = {
            'coordDimensions': sysDims,
            'dimensionsDefine': [
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
            'encodeDefine': {
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
            'dimensionsCount': 5
        };

        const result: SeriesDimensionDefine[] = [
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
                'storeDimIndex': 0
            },
            {
                'otherDims': {
                    'tooltip': 0
                },
                'displayName': 'open',
                'name': 'open',
                'coordDim': 'value',
                'coordDimIndex': 0,
                'isExtraCoord': true,
                'storeDimIndex': 1
            },
            {
                'otherDims': {
                    'tooltip': 1
                },
                'displayName': 'high',
                'name': 'high',
                'coordDim': 'value0',
                'coordDimIndex': 0,
                'isExtraCoord': true,
                'storeDimIndex': 2
            },
            {
                'otherDims': {
                    'tooltip': 2
                },
                'displayName': 'low',
                'name': 'low',
                'coordDim': 'value1',
                'coordDimIndex': 0,
                'isExtraCoord': true,
                'storeDimIndex': 3
            },
            {
                'otherDims': {
                    'tooltip': 3
                },
                'displayName': 'close',
                'name': 'close',
                'coordDim': 'value2',
                'coordDimIndex': 0,
                'isExtraCoord': true,
                'storeDimIndex': 4
            },
            {
                'otherDims': {},
                'displayName': 'volume',
                'name': 'volume',
                'coordDim': 'value3',
                'coordDimIndex': 0,
                'isExtraCoord': true,
                'storeDimIndex': 5
            },
            {
                'otherDims': {},
                'displayName': 'haOpen',
                'name': 'haOpen',
                'coordDim': 'y',
                'coordDimIndex': 0,
                'type': 'float',
                'storeDimIndex': 6
            },
            {
                'otherDims': {},
                'displayName': 'haHigh',
                'name': 'haHigh',
                'coordDim': 'y',
                'coordDimIndex': 3,
                'type': 'float',
                'storeDimIndex': 7
            },
            {
                'otherDims': {},
                'displayName': 'haLow',
                'name': 'haLow',
                'coordDim': 'y',
                'coordDimIndex': 2,
                'type': 'float',
                'storeDimIndex': 8
            },
            {
                'otherDims': {},
                'displayName': 'haClose',
                'name': 'haClose',
                'coordDim': 'y',
                'coordDimIndex': 1,
                'type': 'float',
                'storeDimIndex': 9
            },
            {
                'otherDims': {},
                'displayName': 'sma9',
                'name': 'sma9',
                'coordDim': 'value4',
                'coordDimIndex': 0,
                'isExtraCoord': true,
                'storeDimIndex': 10
            }
        ];

        expect(doCreateDimensions(source, opt)).toEqual(result.map(a => new SeriesDimensionDefine(a)));
    });


    it('differentData', function () {
        function doTest(
            source: ParametersOfCreateDimensions[0],
            opt: ParametersOfCreateDimensions[1],
            result: SeriesDimensionDefine[]
        ) {
            expect(doCreateDimensions(source, opt)).toEqual(result.map(a => new SeriesDimensionDefine(a)));
        }

        // test dimcount
        doTest([], { coordDimensions: ['x', 'y']}, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x',
                'storeDimIndex': 0
            },
            {
                'otherDims': {},
                'coordDim': 'y',
                'coordDimIndex': 0,
                'name': 'y',
                'storeDimIndex': 1
            }
        ]);

        doTest([12], { coordDimensions: ['x', 'y']}, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x',
                'storeDimIndex': 0
            },
            {
                'otherDims': {},
                'coordDim': 'y',
                'coordDimIndex': 0,
                'name': 'y',
                'storeDimIndex': 1
            }
        ]);

        doTest([12, 4], { coordDimensions: ['x', 'y']}, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x',
                'storeDimIndex': 0
            },
            {
                'otherDims': {},
                'coordDim': 'y',
                'coordDimIndex': 0,
                'name': 'y',
                'storeDimIndex': 1
            }
        ]);

        doTest([[32, 55]], { coordDimensions: ['x']}, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x',
                'storeDimIndex': 0
            }
        ]);

        doTest([[32, 55]], { coordDimensions: ['x', 'y', 'z']}, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x',
                'storeDimIndex': 0
            },
            {
                'otherDims': {},
                'coordDim': 'y',
                'coordDimIndex': 0,
                'name': 'y',
                'storeDimIndex': 1
            },
            {
                'otherDims': {},
                'coordDim': 'z',
                'coordDimIndex': 0,
                'name': 'z',
                'storeDimIndex': 2
            }
        ]);

        doTest([[32, 55], [99, 11]], { coordDimensions: ['x']}, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x',
                'storeDimIndex': 0
            }
        ]);

        doTest([[32, 55], [99, 11]], {
            dimensionsCount: 4,
            coordDimensions: ['x', 'y']
        }, [
            {
                'otherDims': {},
                'coordDim': 'x',
                'coordDimIndex': 0,
                'name': 'x',
                'storeDimIndex': 0
            },
            {
                'otherDims': {},
                'coordDim': 'y',
                'coordDimIndex': 0,
                'name': 'y',
                'storeDimIndex': 1
            },
            {
                'otherDims': {},
                'coordDim': 'value',
                'coordDimIndex': 0,
                'isExtraCoord': true,
                'name': 'value',
                'storeDimIndex': 2
            },
            {
                'otherDims': {},
                'coordDim': 'value0',
                'coordDimIndex': 0,
                'isExtraCoord': true,
                'name': 'value0',
                'storeDimIndex': 3
            }
        ]);
    });








    it('differentSysDims', function () {
        function doTest(
            source: ParametersOfCreateDimensions[0],
            opt: ParametersOfCreateDimensions[1],
            result: SeriesDimensionDefine[]
        ) {
            expect(doCreateDimensions(source, opt)).toEqual(result.map(a => new SeriesDimensionDefine(a)));
        }

        const data = [
            ['iw', 332, 4434, 323, 59],
            ['vrr', 44, 11, 144, 55]
        ];

        doTest(
            data, { coordDimensions: ['x', 'y'] },
            [
                {
                    'otherDims': {},
                    'coordDim': 'x',
                    'coordDimIndex': 0,
                    'name': 'x',
                    'type': 'ordinal',
                    'storeDimIndex': 0
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 0,
                    'name': 'y',
                    'storeDimIndex': 1
                }
            ]
        );

        doTest(
            data, { coordDimensions: ['value'] },
            [
                {
                    'otherDims': {},
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'name': 'value',
                    'type': 'ordinal',
                    'storeDimIndex': 0
                }
            ]
        );

        doTest(
            data,
            { coordDimensions: [{name: 'time', type: 'time' as const}, 'value'] },
            [
                {
                    'otherDims': {},
                    'name': 'time',
                    'type': 'time',
                    'coordDimIndex': 0,
                    'ordinalMeta': undefined,
                    'coordDim': 'time',
                    'storeDimIndex': 0
                },
                {
                    'otherDims': {},
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'name': 'value',
                    'storeDimIndex': 1
                }
            ]
        );

        doTest(
            data, {
                coordDimensions: [{
                    name: 'y',
                    otherDims: {
                        tooltip: false
                    },
                    dimsDef: ['base']
                }, {
                    name: 'x',
                    dimsDef: ['open', 'close']
                }]
            },
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
                    'ordinalMeta': undefined,
                    'storeDimIndex': 0
                },
                {
                    'otherDims': {},
                    'name': 'open',
                    'ordinalMeta': undefined,
                    'defaultTooltip': undefined,
                    'coordDimIndex': 0,
                    'coordDim': 'x',
                    'displayName': 'open',
                    'storeDimIndex': 1
                }
            ]
        );

        doTest(
            data, {
                dimensionsDefine: ['基础', '打开', '关闭'],
                coordDimensions: [{
                    name: 'y',
                    otherDims: {
                        tooltip: false
                    },
                    dimsDef: ['base']
                }, {
                    name: 'x',
                    dimsDef: ['open', 'close']
                }],
                encodeDefine: {
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
                    'type': 'ordinal',
                    'storeDimIndex': 0
                },
                {
                    'otherDims': {
                        'tooltip': 0
                    },
                    'name': '打开',
                    'displayName': '打开',
                    'coordDimIndex': 0,
                    'ordinalMeta': undefined,
                    'coordDim': 'x',
                    'storeDimIndex': 1
                },
                {
                    'otherDims': {
                        'tooltip': 1
                    },
                    'name': '关闭',
                    'displayName': '关闭',
                    'ordinalMeta': undefined,
                    'coordDimIndex': 1,
                    'coordDim': 'x',
                    'storeDimIndex': 2
                }
            ]
        );

        doTest(
            data, {
                coordDimensions: [{
                    name: 'y',
                    otherDims: {
                        tooltip: false
                    },
                    dimsDef: ['base']
                }, {
                    name: 'x',
                    dimsDef: ['open', 'close']
                }],
                dimensionsDefine: ['基础', null, '关闭'],
                encodeDefine: {
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
                    'type': 'ordinal',
                    'storeDimIndex': 0
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
                    'coordDim': 'y',
                    'storeDimIndex': 1
                },
                {
                    'otherDims': {},
                    'name': '关闭',
                    'displayName': '关闭',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'coordDim': 'value',
                    'storeDimIndex': 2
                }
            ]
        );

    });









    it('dimsDef', function () {
        function doTest(
            source: ParametersOfCreateDimensions[0],
            opt: ParametersOfCreateDimensions[1],
            result: SeriesDimensionDefine[]
        ) {
            expect(doCreateDimensions(source, opt)).toEqual(result.map(a => new SeriesDimensionDefine(a)));
        }

        const data = [['iw', 332, 4434, 323, 59], ['vrr', 44, 11, 144, 55]];
        doTest(
            data,
            {
                dimensionsDefine: ['挨克思', null, '歪溜'],
                coordDimensions: ['x', 'y', 'value']
            },
            [
                {
                    'otherDims': {},
                    'displayName': '挨克思',
                    'name': '挨克思',
                    'type': 'ordinal',
                    'coordDim': 'x',
                    'coordDimIndex': 0,
                    'storeDimIndex': 0
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 0,
                    'name': 'y',
                    'storeDimIndex': 1
                },
                {
                    'otherDims': {},
                    'displayName': '歪溜',
                    'name': '歪溜',
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'storeDimIndex': 2
                }
            ]
        );

        doTest(
            data,
            {
                dimensionsDefine: ['挨克思', null, {type: 'ordinal' as const}],
                coordDimensions: ['x', 'y', 'value']
            }, // no name but only type
            [
                {
                    'otherDims': {},
                    'displayName': '挨克思',
                    'name': '挨克思',
                    'type': 'ordinal',
                    'coordDim': 'x',
                    'coordDimIndex': 0,
                    'storeDimIndex': 0
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 0,
                    'name': 'y',
                    'storeDimIndex': 1
                },
                {
                    'otherDims': {},
                    'name': 'value',
                    'coordDim': 'value',
                    'type': 'ordinal',
                    'coordDimIndex': 0,
                    'storeDimIndex': 2
                }
            ]
        );

        doTest(
            data,
            {
                dimensionsDefine: [{name: '泰亩', type: 'ordinal'}, {name: '歪溜', type: 'float'}],
                coordDimensions: [{name: 'time', type: 'time' as const}, 'value']
            },
            [
                {
                    'otherDims': {},
                    'displayName': '泰亩',
                    'name': '泰亩',
                    'type': 'ordinal',
                    'ordinalMeta': undefined,
                    'coordDimIndex': 0,
                    'coordDim': 'time',
                    'storeDimIndex': 0
                },
                {
                    'otherDims': {},
                    'displayName': '歪溜',
                    'name': '歪溜',
                    'type': 'float',
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'storeDimIndex': 1
                }
            ]
        );

        // Duplicate name
        doTest(
            data,
            {
                dimensionsDefine: [{name: '泰亩', type: 'ordinal'}, {name: '泰亩', type: 'float'}],
                coordDimensions: [{name: 'time', type: 'time' as const}, 'value']
            },
            [
                {
                    'otherDims': {},
                    'displayName': '泰亩',
                    'name': '泰亩',
                    'type': 'ordinal',
                    'ordinalMeta': undefined,
                    'coordDimIndex': 0,
                    'coordDim': 'time',
                    'storeDimIndex': 0
                },
                {
                    'otherDims': {},
                    'displayName': '泰亩',
                    'name': '泰亩0',
                    'type': 'float',
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'storeDimIndex': 1
                }
            ]
        );
    });









    it('encodeDef', function () {
        function doTest(
            source: ParametersOfCreateDimensions[0],
            opt: ParametersOfCreateDimensions[1],
            result: SeriesDimensionDefine[]
        ) {
            expect(doCreateDimensions(source, opt)).toEqual(result.map(a => new SeriesDimensionDefine(a)));
        }

        const data = [['iw', 332, 4434, 323, 'd8', 59], ['vrr', 44, 11, 144, '-', 55]];

        doTest(
            data,
            {
                encodeDefine: {
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
                    'type': 'ordinal',
                    'storeDimIndex': 0
                }
            ]
        );

        doTest(
            data,
            {
                dimensionsDefine: ['挨克思', null, '歪溜'],
                encodeDefine: {
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
                    'isExtraCoord': true,
                    'storeDimIndex': 0
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 0,
                    'name': 'y',
                    'storeDimIndex': 1
                },
                {
                    'otherDims': {
                        'tooltip': 0
                    },
                    'displayName': '歪溜',
                    'name': '歪溜',
                    'coordDim': 'x',
                    'coordDimIndex': 0,
                    'storeDimIndex': 2
                }
            ]
        );

        doTest(
            data,
            {
                dimensionsDefine: ['挨克思', null, '歪溜'],
                coordDimensions: ['x', {name: 'y', type: 'time' as const}, 'z'],
                encodeDefine: {
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
                    'coordDimIndex': 0,
                    'storeDimIndex': 0
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 0,
                    'name': 'y',
                    'type': 'time',
                    'ordinalMeta': undefined,
                    'storeDimIndex': 1
                },
                {
                    'otherDims': {
                        'tooltip': 0
                    },
                    'displayName': '歪溜',
                    'name': '歪溜',
                    'coordDim': 'x',
                    'coordDimIndex': 0,
                    'storeDimIndex': 2
                }
            ]
        );

        doTest(
            data,
            {
                // dimsDef type 'ordinal' has higher priority then sysDims type 'time'.
                dimensionsDefine: [{name: '泰亩', type: 'ordinal'}, {name: '歪溜', type: 'float'}],
                coordDimensions: [{name: 'time', type: 'time' as const}, 'value'],
                encodeDefine: {
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
                    'coordDim': 'time',
                    'storeDimIndex': 0
                },
                {
                    'otherDims': {},
                    'displayName': '歪溜',
                    'name': '歪溜',
                    'type': 'float',
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'storeDimIndex': 1
                }
            ]
        );

        doTest(
            data,
            {
                // dimsDef type 'ordinal' has higher priority then sysDims type 'time'.
                dimensionsDefine: [{name: '泰亩', type: 'ordinal'}, {name: '歪溜', type: 'float'}],
                coordDimensions: [{name: 'time', type: 'time' as const}, 'value'],
                encodeDefine: {
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
                    'coordDim': 'time',
                    'storeDimIndex': 0
                },
                {
                    'otherDims': {},
                    'displayName': '歪溜',
                    'name': '歪溜',
                    'type': 'float',
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'storeDimIndex': 1
                }
            ]
        );

    });

});