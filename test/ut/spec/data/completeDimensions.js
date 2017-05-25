describe('completeDimensions', function () {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare(['echarts/data/helper/completeDimensions']);



    function doCompleteDimensions(completeDimensions, sysDims, data, opt) {
        var result = completeDimensions(sysDims, data, opt);
        if (result) {
            for (var i = 0; i < result.length; i++) {
                var item = result[i];
                if (item && item.hasOwnProperty('dimsDef') && item.dimsDef == null) {
                    delete item.dimsDef;
                }
            }
        }
        return result;
    }


    testCase('differentData', function (completeDimensions) {
        function doTest(sysDims, data, opt, result) {
            expect(doCompleteDimensions(completeDimensions, sysDims, data, opt)).toEqual(result);
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
            },
            {
                'otherDims': {},
                'coordDim': 'value',
                'coordDimIndex': 0,
                'isExtraCoord': true,
                'name': 'value'
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
            },
            {
                'otherDims': {},
                'coordDim': 'value',
                'coordDimIndex': 0,
                'isExtraCoord': true,
                'name': 'value'
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








    testCase('differentSysDims', function (completeDimensions) {
        function doTest(sysDims, data, opt, result) {
            expect(doCompleteDimensions(completeDimensions, sysDims, data, opt)).toEqual(result);
        }

        var data = [
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
                },
                {
                    'otherDims': {},
                    'coordDim': 'value1',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value1'
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
                },
                {
                    'otherDims': {},
                    'coordDim': 'value0',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value0'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value1',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value1'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value2',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value2'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value3',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value3'
                }
            ]
        );
        doTest(
            [{name: 'time', type: 'time', stackable: false}, 'value'], data, null,
            [
                {
                    'otherDims': {},
                    'name': 'time',
                    'type': 'time',
                    'stackable': false,
                    'coordDimIndex': 0,
                    'coordDim': 'time'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'name': 'value'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value0',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value0'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value1',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value1'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value2',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value2'
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
                    'tooltipName': 'base',
                    'coordDimIndex': 0,
                    'coordDim': 'y',
                    'type': 'ordinal'
                },
                {
                    'otherDims': {},
                    'name': 'open',
                    'tooltipName': 'open',
                    'coordDimIndex': 0,
                    'coordDim': 'x'
                },
                {
                    'otherDims': {},
                    'name': 'close',
                    'tooltipName': 'close',
                    'coordDimIndex': 1,
                    'coordDim': 'x'
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
                    'tooltipName': '基础',
                    'coordDimIndex': 0,
                    'coordDim': 'y',
                    'type': 'ordinal'
                },
                {
                    'otherDims': {
                        'tooltip': 0
                    },
                    'name': '打开',
                    'tooltipName': '打开',
                    'coordDimIndex': 0,
                    'coordDim': 'x'
                },
                {
                    'otherDims': {
                        'tooltip': 1
                    },
                    'name': '关闭',
                    'tooltipName': '关闭',
                    'coordDimIndex': 1,
                    'coordDim': 'x'
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
                    'name': '基础',
                    'tooltipName': '基础',
                    'coordDimIndex': 0,
                    'coordDim': 'x',
                    'type': 'ordinal'
                },
                {
                    'otherDims': {
                        'tooltip': false
                    },
                    'name': 'base',
                    'tooltipName': 'base',
                    'coordDimIndex': 0,
                    'coordDim': 'y'
                },
                {
                    'otherDims': {},
                    'name': '关闭',
                    'tooltipName': '关闭',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'coordDim': 'value'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value0',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value0'
                },
                {
                    'otherDims': {},
                    'coordDim': 'x',
                    'coordDimIndex': 1,
                    'name': 'close',
                    'tooltipName': 'close'
                }
            ]
        );

    });









    testCase('dimsDef', function (completeDimensions) {
        function doTest(sysDims, data, opt, result) {
            expect(doCompleteDimensions(completeDimensions, sysDims, data, opt)).toEqual(result);
        }

        var data = [['iw', 332, 4434, 323, 59], ['vrr', 44, 11, 144, 55]];
        doTest(
            ['x', 'y', 'value'], data,
            {dimsDef: ['挨克思', null, '歪溜']},
            [
                {
                    'otherDims': {},
                    'tooltipName': '挨克思',
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
                    'tooltipName': '歪溜',
                    'name': '歪溜',
                    'coordDim': 'value',
                    'coordDimIndex': 0
                },
                {
                    'otherDims': {},
                    'coordDim': 'value0',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value0'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value1',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value1'
                }
            ]
        );
        doTest(
            ['x', 'y', 'value'], data,
            {dimsDef: ['挨克思', null, {type: 'ordinal'}]}, // no name but only type
            [
                {
                    'otherDims': {},
                    'tooltipName': '挨克思',
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
                },
                {
                    'otherDims': {},
                    'coordDim': 'value0',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value0'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value1',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value1'
                }
            ]
        );
        doTest(
            [{name: 'time', type: 'time', stackable: false}, 'value'], data,
            {dimsDef: [{name: '泰亩', type: 'ordinal'}, {name: '歪溜', type: 'float'}]},
            [
                {
                    'otherDims': {},
                    'tooltipName': '泰亩',
                    'name': '泰亩',
                    'type': 'ordinal',
                    'stackable': false,
                    'coordDimIndex': 0,
                    'coordDim': 'time'
                },
                {
                    'otherDims': {},
                    'tooltipName': '歪溜',
                    'name': '歪溜',
                    'type': 'float',
                    'coordDim': 'value',
                    'coordDimIndex': 0
                },
                {
                    'otherDims': {},
                    'coordDim': 'value0',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value0'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value1',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value1'
                },
                {
                    'otherDims': {},
                    'coordDim': 'value2',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value2'
                }
            ]
        );
    });









    testCase('encodeDef', function (completeDimensions) {
        function doTest(sysDims, data, opt, result) {
            expect(doCompleteDimensions(completeDimensions, sysDims, data, opt)).toEqual(result);
        }

        var data = [['iw', 332, 4434, 323, 'd8', 59], ['vrr', 44, 11, 144, '-', 55]];

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
                    'coordDim': 'x',
                    'coordDimIndex': 0,
                    'name': 'x'
                },
                {
                    'otherDims': {
                        'label': 0
                    },
                    'coordDim': 'value0',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value0'
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 1,
                    'name': 'y0',
                    'type': 'ordinal'
                },
                {
                    'otherDims': {
                        'label': 1
                    },
                    'coordDim': 'value1',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value1'
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
                    'tooltipName': '挨克思',
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
                    'tooltipName': '歪溜',
                    'name': '歪溜',
                    'coordDim': 'x',
                    'coordDimIndex': 0
                },
                {
                    'otherDims': {
                        'label': 0
                    },
                    'coordDim': 'value0',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value0'
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 1,
                    'name': 'y0',
                    'type': 'ordinal'
                },
                {
                    'otherDims': {
                        'label': 1
                    },
                    'coordDim': 'value1',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value1'
                }
            ]
        );
        doTest(
            ['x', {name: 'y', type: 'time', stackable: false}, 'z'], data,
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
                    'tooltipName': '挨克思',
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
                    'stackable': false
                },
                {
                    'otherDims': {
                        'tooltip': 0
                    },
                    'tooltipName': '歪溜',
                    'name': '歪溜',
                    'coordDim': 'x',
                    'coordDimIndex': 0
                },
                {
                    'otherDims': {
                        'label': 0
                    },
                    'coordDim': 'value',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value'
                },
                {
                    'otherDims': {},
                    'coordDim': 'y',
                    'coordDimIndex': 1,
                    'name': 'y0',
                    'type': 'time',
                    'stackable': false
                },
                {
                    'otherDims': {
                        'label': 1
                    },
                    'coordDim': 'value0',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'value0'
                }
            ]
        );
        doTest(
            [{name: 'time', type: 'time', stackable: false}, 'value'], data,
            {
                // dimsDef type 'ordinal' has higher priority then sysDims type 'time'.
                dimsDef: [{name: '泰亩', type: 'ordinal'}, {name: '歪溜', type: 'float'}],
                encodeDef: {
                    tooltip: 2
                },
                extraPrefix: 'aaa'
            },
            [
                {
                    'otherDims': {},
                    'tooltipName': '泰亩',
                    'name': '泰亩',
                    'type': 'ordinal',
                    'stackable': false,
                    'coordDimIndex': 0,
                    'coordDim': 'time'
                },
                {
                    'otherDims': {},
                    'tooltipName': '歪溜',
                    'name': '歪溜',
                    'type': 'float',
                    'coordDim': 'value',
                    'coordDimIndex': 0
                },
                {
                    'otherDims': {
                        'tooltip': 0
                    },
                    'coordDim': 'aaa',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'aaa'
                },
                {
                    'otherDims': {},
                    'coordDim': 'aaa0',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'aaa0'
                },
                {
                    'otherDims': {},
                    'coordDim': 'aaa1',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'aaa1',
                    'type': 'ordinal'
                },
                {
                    'otherDims': {},
                    'coordDim': 'aaa2',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'aaa2'
                }
            ]
        );

        doTest(
            [{name: 'time', type: 'time', stackable: false}, 'value'], data,
            {
                // dimsDef type 'ordinal' has higher priority then sysDims type 'time'.
                dimsDef: [{name: '泰亩', type: 'ordinal'}, {name: '歪溜', type: 'float'}],
                encodeDef: {
                    tooltip: 2
                },
                extraPrefix: 'aaa',
                extraFromZero: true
            },
            [
                {
                    'otherDims': {},
                    'tooltipName': '泰亩',
                    'name': '泰亩',
                    'type': 'ordinal',
                    'stackable': false,
                    'coordDimIndex': 0,
                    'coordDim': 'time'
                },
                {
                    'otherDims': {},
                    'tooltipName': '歪溜',
                    'name': '歪溜',
                    'type': 'float',
                    'coordDim': 'value',
                    'coordDimIndex': 0
                },
                {
                    'otherDims': {
                        'tooltip': 0
                    },
                    'coordDim': 'aaa0',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'aaa0'
                },
                {
                    'otherDims': {},
                    'coordDim': 'aaa1',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'aaa1'
                },
                {
                    'otherDims': {},
                    'coordDim': 'aaa2',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'aaa2',
                    'type': 'ordinal'
                },
                {
                    'otherDims': {},
                    'coordDim': 'aaa3',
                    'coordDimIndex': 0,
                    'isExtraCoord': true,
                    'name': 'aaa3'
                }
            ]
        );

    });

});