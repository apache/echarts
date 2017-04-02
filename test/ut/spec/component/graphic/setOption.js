describe('graphic_setOption', function() {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare([
        'echarts/chart/line',
        'echarts/component/graphic',
        'echarts/component/grid'
    ]);

    var NUMBER_PRECISION = 6;

    function propHasAll(els, propsObjList) {
        for (var i = 0; i < propsObjList.length; i++) {
            propHas(els[i], propsObjList[i]);
        }
    }

    function propHas(target, propsObj) {
        if (target == null || propsObj == null) {
            expect(false).toEqual(true);
        }
        expect(typeof target === 'object' && typeof propsObj === 'object').toEqual(true);

        // propsObj can be array
        if (propsObj instanceof Array) {
            expect(target instanceof Array).toEqual(true);
            for (var i = 0; i < propsObj.length; i++) {
                each(target[i], propsObj[i]);
            }
        }
        else {
            for (var name in propsObj) {
                if (propsObj.hasOwnProperty(name)) {
                    each(target[name], propsObj[name]);
                }
            }
        }

        function each(targetVal, propVal) {
            if (propVal == null) {
                expect(targetVal == null).toEqual(true);
            }
            // object or array
            else if (typeof propVal === 'object') {
                propHas(targetVal, propVal);
            }
            else if (typeof propVal === 'number') {
                expect(
                    typeof targetVal === 'number'
                    && propVal.toFixed(NUMBER_PRECISION) === targetVal.toFixed(NUMBER_PRECISION)
                ).toEqual(true);
            }
            else {
                expect(targetVal === propVal).toEqual(true);
            }
        }
    }

    var imageURI = 'data:image/jpeg;base64,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'; // jshint ignore:line











    describe('option', function () {

        testCase.createChart()('optionFlatten', function () {
            this.chart.setOption({
                graphic: [
                    {
                        id: 'uriimg',
                        type: 'image',
                        name: 'nameuriimg',
                        origin: [20, 20],
                        left: 10,
                        top: 10,
                        style: {
                            image: imageURI,
                            width: 80,
                            height: 80,
                            opacity: 0.5
                        }
                    },
                    {
                        type: 'group',
                        id: 'gr',
                        width: 230,
                        height: 110,
                        position: [70, 90],
                        children: [
                            {
                                type: 'rect',
                                name: 'rectxx',
                                shape: {
                                    width: 230,
                                    height: 80
                                },
                                style: {
                                    stroke: 'red',
                                    fill: 'transparent',
                                    lineWidth: 2
                                },
                                z: 100
                            },
                            {
                                id: 'grouptext',
                                type: 'text',
                                bottom: 0,
                                right: 0,
                                rotation: 0.5,
                                style: {
                                    text: 'aaa'
                                },
                                z: 100
                            }
                        ]
                    },
                    {
                        type: 'text',
                        bottom: 0,
                        left: 'center',
                        style: {
                            text: 'bbb'
                        },
                        z: 100
                    }
                ]
            });

            // Set option using getOption
            var option = this.chart.getOption();

            expect(option.graphic.length === 1).toEqual(true);
            var optionElements = option.graphic[0].elements;
            expect(optionElements && optionElements.length === 5).toEqual(true);

            expect(optionElements[0].id === 'uriimg' && optionElements[0].parentId == null).toEqual(true);
            expect(optionElements[1].id === 'gr' && optionElements[1].parentId == null).toEqual(true);
            expect(optionElements[2].name === 'rectxx' && optionElements[2].parentId === 'gr').toEqual(true);
            expect(optionElements[3].style.text === 'aaa' && optionElements[3].parentId === 'gr').toEqual(true);
            expect(optionElements[4].style.text === 'bbb' && optionElements[4].parentId == null).toEqual(true);
        });


        testCase.createChart()('groupSetOptionGetOption', function () {
            var chart = this.chart;

            chart.setOption({
                graphic: [
                    {
                        id: 'uriimg',
                        type: 'image',
                        name: 'nameuriimg',
                        origin: [20, 20],
                        left: 10,
                        top: 10,
                        style: {
                            image: imageURI,
                            width: 80,
                            height: 80,
                            opacity: 0.5
                        }
                    },
                    {
                        type: 'group',
                        id: 'gr',
                        width: 230,
                        height: 110,
                        position: [70, 90],
                        children: [
                            {
                                type: 'rect',
                                name: 'rectxx',
                                shape: {
                                    width: 230,
                                    height: 80
                                },
                                style: {
                                    stroke: 'red',
                                    fill: 'transparent',
                                    lineWidth: 2
                                },
                                z: 100
                            },
                            {
                                id: 'grouptext',
                                type: 'text',
                                bottom: 0,
                                right: 0,
                                rotation: 0.5,
                                style: {
                                    text: 'aaa'
                                },
                                z: 100
                            }
                        ]
                    },
                    {
                        type: 'text',
                        bottom: 0,
                        left: 'center',
                        style: {
                            text: 'bbb'
                        },
                        z: 100
                    }
                ]
            });

            checkExistsAndRelations();

            // Set option using getOption
            chart.setOption(this.chart.getOption());

            // Check again, should be the same as before.
            checkExistsAndRelations();

            function checkExistsAndRelations() {
                var els = utHelper.getGraphicElements(chart, 'graphic');

                expect(els.length === 6).toEqual(true);
                expect(els[0].type === 'group').toEqual(true);
                expect(els[1].name === 'nameuriimg').toEqual(true);

                expect(els[2].type === 'group').toEqual(true);
                var groupEls = utHelper.getGraphicElements(els[2], 'graphic');
                expect(groupEls.length === 2).toEqual(true);
                expect(groupEls[0] === els[3]).toEqual(true);
                expect(groupEls[1] === els[4]).toEqual(true);
                expect(els[3].name === 'rectxx').toEqual(true);
                expect(els[4].style.text === 'aaa').toEqual(true);

                expect(els[5].style.text === 'bbb').toEqual(true);
            }
        });


        testCase.createChart()('onlyOneGraphicComponentAvailable', function () {
            var chart = this.chart;

            chart.setOption({
                graphic: [
                    {
                        elements: [
                            {
                                type: 'circle',
                                shape: {
                                    cx: 50,
                                    cy: 50,
                                    r: 20
                                }
                            },
                            {
                                type: 'circle',
                                shape: {
                                    cx: 150,
                                    cy: 150,
                                    r: 20
                                }
                            }
                        ]
                    },
                    {
                        elements: [
                            {
                                type: 'circle',
                                shape: {
                                    cx: 100,
                                    cy: 100,
                                    r: 20
                                }
                            }
                        ]
                    }
                ]
            });

            expect(!!chart.getModel().getComponent('graphic')).toEqual(true);
            expect(chart.getModel().getComponent('graphic', 1) == null).toEqual(true);
        });


        testCase.createChart()('replace', function () {
            var chart = this.chart;

            chart.setOption({
                graphic: {
                    type: 'circle',
                    name: 'a',
                    shape: {
                        cx: 50,
                        cy: 50,
                        r: 20
                    },
                    style: {
                        fill: 'green',
                        stroke: 'pink',
                        lineWidth: 3
                    }
                }
            });

            var els = utHelper.getGraphicElements(chart, 'graphic');

            expect(els.length === 2).toEqual(true);
            expect(els[0].type === 'group').toEqual(true);
            expect(els[1].name === 'a' && els[1].type === 'circle').toEqual(true);

            chart.setOption({
                graphic: {
                    type: 'rect',
                    $action: 'replace',
                    name: 'b',
                    shape: {
                        x: 50,
                        y: 50,
                        width: 20,
                        height: 60
                    },
                    style: {
                        fill: 'green',
                        stroke: 'pink',
                        lineWidth: 3
                    }
                }
            });

            var els = utHelper.getGraphicElements(chart, 'graphic');

            expect(els.length === 2).toEqual(true);
            expect(els[0].type === 'group').toEqual(true);
            expect(els[1].name === 'b' && els[1].type === 'rect').toEqual(true);
            expect(els[1].shape && els[1].shape.width === 20).toEqual(true);
        });


        function getDeleteSourceOption() {
            return {
                graphic: [
                    {
                        type: 'text',
                        name: 'textname',
                        style: {
                            text: 'asdf哈呵',
                            font: '40px sans-serif',
                            x: 100,
                            y: 40
                        }
                    },
                    {
                        id: 'rrr',
                        name: 'ringname',
                        type: 'ring',
                        shape: {
                            cx: 50,
                            cy: 150,
                            r: 20,
                            r0: 5
                        }
                    },
                    {
                        id: 'xxx',
                        name: 'rectname',
                        type: 'rect',
                        shape: {
                            x: 250,
                            y: 50,
                            width: 20,
                            height: 80
                        }
                    }
                ]
            };
        }

        function checkDeteteSource(chart) {
            var els = utHelper.getGraphicElements(chart, 'graphic');
            expect(els.length === 4);
            expect(els[1].type === 'text' && els[1].name === 'textname').toEqual(true);
            expect(els[2].type === 'ring' && els[2].name === 'ringname').toEqual(true);
            expect(els[3].type === 'rect' && els[3].name === 'rectname').toEqual(true);
        }

        testCase.createChart()('deleteBy$action', function () {
            var chart = this.chart;

            chart.setOption(getDeleteSourceOption());

            checkDeteteSource(chart);

            chart.setOption({
                graphic: {
                    id: 'rrr',
                    $action: 'remove'
                }
            });

            var els = utHelper.getGraphicElements(chart, 'graphic');
            expect(els.length === 3);
            expect(els[1].type === 'text' && els[1].name === 'textname').toEqual(true);
            expect(els[2].type === 'rect' && els[2].name === 'rectname').toEqual(true);
        });

        testCase.createChart()('deleteBySetOptionNotMerge', function () {
            var chart = this.chart;

            chart.setOption(getDeleteSourceOption());

            checkDeteteSource(chart);

            chart.setOption({
                graphic: {
                    type: 'rect',
                    name: 'rectname2',
                    shape: {
                        y: 100,
                        x: 250,
                        width: 40,
                        height: 140
                    },
                    style: {
                        fill: 'blue'
                    }
                }
            }, true);

            var els = utHelper.getGraphicElements(chart, 'graphic');
            expect(els.length === 2);
            expect(els[1].type === 'rect' && els[1].name === 'rectname2').toEqual(true);
        });

        testCase.createChart()('deleteByClear', function () {
            var chart = this.chart;

            chart.setOption(getDeleteSourceOption());

            checkDeteteSource(chart);

            chart.clear();

            var els = utHelper.getGraphicElements(chart, 'graphic');
            expect(els.length === 0);
        });


        function checkMergeElements(chart, merged) {
            propHasAll(utHelper.getGraphicElements(chart, 'graphic'), [
                {
                    position: [0, 0],
                    scale: [1, 1],
                    rotation: 0
                },
                {
                    position: [0, 0],
                    scale: [1, 1],
                    rotation: 0,
                    style: {},
                    shape: {
                        x: !merged ? 250 : 350,
                        y: 50,
                        width: 20,
                        height: 80,
                        r: 0
                    }
                },
                {
                    position: [0, 0],
                    scale: [1, 1],
                    rotation: 0
                },
                {
                    position: [0, 0],
                    scale: [1, 1],
                    rotation: 0,
                    style: {
                        fill: !merged ? 'yellow' : 'pink'
                    },
                    shape: {
                        x: 30,
                        y: 30,
                        width: 10,
                        height: 20,
                        r: 0
                    }
                },
                {
                    position: [0, 0],
                    scale: [1, 1],
                    rotation: 0,
                    style: !merged
                        ? {}
                        : {
                            fill: 'green'
                        },
                    shape: {
                        cx: !merged ? 50 : 150,
                        cy: 150,
                        r: 20,
                        r0: 5
                    }
                }
            ]);
        }

        testCase.createChart()('mergeTroughFlatForamt', function () {
            var chart = this.chart;

            chart.setOption({
                graphic: [
                    {
                        type: 'rect',
                        shape: {
                            x: 250,
                            y: 50,
                            width: 20,
                            height: 80
                        }
                    },
                    {
                        type: 'group',
                        children: [
                            {
                                id: 'ing',
                                type: 'rect',
                                shape: {
                                    x: 30,
                                    y: 30,
                                    width: 10,
                                    height: 20
                                },
                                style: {
                                    fill: 'yellow'
                                }
                            }
                        ]
                    },
                    {
                        id: 'rrr',
                        type: 'ring',
                        shape: {
                            cx: 50,
                            cy: 150,
                            r: 20,
                            r0: 5
                        }
                    }
                ]
            });

            checkMergeElements(chart);

            chart.setOption({
                graphic: [
                    {
                        shape: {
                            x: 350
                        }
                    },
                    {
                        id: 'rrr',
                        shape: {
                            cx: 150
                        },
                        style: {
                            fill: 'green'
                        }
                    },
                    // flat mode
                    {
                        id: 'ing',
                        style: {
                            fill: 'pink'
                        }
                    }
                ]
            });

            checkMergeElements(chart, true);
        });


    });










    describe('groupLRTB', function() {

        function getOption() {
            return {
                graphic: [
                    {
                        type: 'text',
                        bottom: 0,
                        right: 0,
                        rotation: Math.PI / 4,
                        style: {
                            font: '24px Microsoft YaHei',
                            text: '全屏右下角'
                        },
                        z: 100
                    },
                    {
                        id: 'uriimg',
                        type: 'image',
                        origin: [20, 20],
                        left: 10,
                        top: 10,
                        style: {
                            image: imageURI,
                            width: 80,
                            height: 80,
                            opacity: 0.5
                        }
                    },
                    {
                        type: 'group',
                        id: 'gr',
                        width: 230,
                        height: 110,
                        position: [70, 90],
                        children: [
                            {
                                type: 'rect',
                                shape: {
                                    width: 230,
                                    height: 80
                                },
                                style: {
                                    stroke: 'red',
                                    fill: 'transparent',
                                    lineWidth: 2
                                },
                                z: 100
                            },
                            {
                                type: 'rect',
                                shape: {
                                    width: 60,
                                    height: 110
                                },
                                style: {
                                    stroke: 'red',
                                    fill: 'transparent',
                                    lineWidth: 2
                                },
                                z: 100
                            },
                            {
                                id: 'grouptext',
                                type: 'text',
                                bottom: 0,
                                right: 0,
                                rotation: 0.5,
                                style: {
                                    font: '14px Microsoft YaHei',
                                    text: 'group最右下角'
                                },
                                z: 100
                            }
                        ]
                    },
                    {
                        type: 'text',
                        bottom: 0,
                        left: 'center',
                        style: {
                            font: '18px sans-serif',
                            text: '全屏最下中间\n这是多行文字\n这是第三行'
                        },
                        z: 100
                    }
                ]
            };
        }

        function checkLocations(chart, uriimgChanged) {
            propHasAll(utHelper.getGraphicElements(chart, 'graphic'), [
                {
                    position: [0, 0],
                    scale: [1, 1],
                    rotation: 0
                },
                {
                    position: [106.66190488337573, 141.51471862576142],
                    scale: [1, 1],
                    rotation: 0.7853981633974483,
                    style: {
                        textBaseline: 'middle',
                        font: '24px Microsoft YaHei',
                        text: '全屏右下角',
                        textVerticalAlign: null
                    }
                },
                !uriimgChanged
                    ? {
                        position: [10, 10],
                        scale: [1, 1],
                        rotation: 0,
                        style: {
                            height: 80,
                            opacity: 0.5,
                            width: 80,
                            image: imageURI
                        }
                    }
                    : {
                        position: [61, 45],
                        scale: [1, 1],
                        rotation: 0,
                        style: {
                            height: 60,
                            opacity: 0.5,
                            width: 78,
                            image: imageURI
                        }
                    },
                {
                    position: [70, 90],
                    scale: [1, 1],
                    rotation: 0
                },
                {
                    position: [0, 0],
                    scale: [1, 1],
                    rotation: 0,
                    style: {
                        stroke: 'red',
                        fill: 'transparent',
                        lineWidth: 2
                    },
                    shape: {
                        width: 230,
                        height: 80,
                        r: 0,
                        x: 0,
                        y: 0
                    }
                },
                {
                    position: [0, 0],
                    scale: [1, 1],
                    rotation: 0,
                    style: {
                        stroke: 'red',
                        fill: 'transparent',
                        lineWidth: 2
                    },
                    shape: {
                        width: 60,
                        height: 110,
                        r: 0,
                        x: 0,
                        y: 0
                    }
                },
                {
                    position: [141.72076808246507, 103.8569220667674],
                    scale: [1, 1],
                    rotation: 0.5,
                    style: {
                        textBaseline: 'middle',
                        font: '14px Microsoft YaHei',
                        text: 'group最右下角',
                        textVerticalAlign: null
                    }
                },
                {
                    position: [46, 105],
                    scale: [1, 1],
                    rotation: 0,
                    style: {
                        textBaseline: 'middle',
                        font: '18px sans-serif',
                        text: '全屏最下中间\n这是多行文字\n这是第三行',
                        textVerticalAlign: null
                    }
                }
            ]);
        }

        function checkResizedLocations(chart) {
            propHasAll(utHelper.getGraphicElements(chart, 'graphic'), [
                {
                    position: [0, 0],
                    scale: [1, 1],
                    rotation: 0
                },
                {
                    position: [106.66190488337573, 141.51471862576142],
                    scale: [1, 1],
                    rotation: 0.7853981633974483,
                    style: {
                        textBaseline: 'middle',
                        font: '24px Microsoft YaHei',
                        text: '全屏右下角',
                        textVerticalAlign: null
                    }
                },
                {
                    position: [10, 10],
                    scale: [1, 1],
                    rotation: 0,
                    style: {
                        image: imageURI,
                        width: 80,
                        height: 80,
                        opacity: 0.5
                    }
                },
                {
                    position: [70, 90],
                    scale: [1, 1],
                    rotation: 0
                },
                {
                    position: [0, 0],
                    scale: [1, 1],
                    rotation: 0,
                    style: {
                        stroke: 'red',
                        fill: 'transparent',
                        lineWidth: 2
                    },
                    shape: {
                        width: 230,
                        height: 80,
                        r: 0,
                        x: 0,
                        y: 0
                    }
                },
                {
                    position: [0, 0],
                    scale: [1, 1],
                    rotation: 0,
                    style: {
                        stroke: 'red',
                        fill: 'transparent',
                        lineWidth: 2
                    },
                    shape: {
                        width: 60,
                        height: 110,
                        r: 0,
                        x: 0,
                        y: 0
                    }
                },
                {
                    position: [141.72076808246507, 103.8569220667674],
                    scale: [1, 1],
                    rotation: 0.5,
                    style: {
                        textBaseline: 'middle',
                        font: '14px Microsoft YaHei',
                        text: 'group最右下角',
                        textVerticalAlign: null
                    }
                },
                {
                    position: [46, 105],
                    scale: [1, 1],
                    rotation: 0,
                    style: {
                        textBaseline: 'middle',
                        font: '18px sans-serif',
                        text: '全屏最下中间\n这是多行文字\n这是第三行',
                        textVerticalAlign: null
                    }
                }
            ]);
        }

        testCase.createChart(1, 200, 150)('getAndGet', function () {
            var chart = this.chart;

            chart.setOption(getOption());

            checkLocations(chart);

            // Set option using getOption
            chart.setOption(this.chart.getOption());

            // Check again, should be the same as before.
            checkLocations(chart);
        });

        // Test modify location by setOption.
        // And test center and middle.
        testCase.createChart(1, 200, 150)('modifyAndCenter', function () {
            var chart = this.chart;

            chart.setOption(getOption());

            checkLocations(chart);

            chart.setOption({
                graphic: [{
                    id: 'uriimg',
                    left: 'center',
                    top: 'middle',
                    style: {
                        width: 78,
                        height: 60
                    }
                }]
            });

            checkLocations(chart, true);
        });

        testCase.createChart(1, 200, 150)('resize', function () {
            var chart = this.chart;

            chart.setOption(getOption());

            checkLocations(chart);

            chart.resize(220, 300);

            checkResizedLocations(chart);
        });
    });







    describe('boundingAndRotation', function() {

        function getOption() {
            return {
                legend: {
                    data:['高度(km)与气温(°C)变化关系']
                },
                xAxis: {
                },
                yAxis: {
                    type: 'category',
                    data: ['0', '10', '20', '30', '40', '50', '60', '70', '80']
                },
                graphic: [
                    {
                        type: 'image',
                        id: 'img',
                        z: -10,
                        right: 0,
                        top: 0,
                        bounding: 'raw',
                        origin: [75, 75],
                        style: {
                            fill: '#000',
                            image: imageURI,
                            width: 150,
                            height: 150,
                            opacity: 0.4
                        }
                    },
                    {
                        type: 'group',
                        id: 'rectgroup1',
                        bottom: 0,
                        right: 0,
                        bounding: 'raw',
                        children: [
                            {
                                type: 'rect',
                                left: 'center',
                                top: 'center',
                                shape: {
                                    width: 20,
                                    height: 80
                                },
                                style: {
                                    stroke: 'green',
                                    fill: 'transparent'
                                }
                            },
                            {
                                type: 'rect',
                                left: 'center',
                                top: 'center',
                                shape: {
                                    width: 80,
                                    height: 20
                                },
                                style: {
                                    stroke: 'green',
                                    fill: 'transparent'
                                }
                            }
                        ]
                    },
                    {
                        type: 'rect',
                        id: 'rect2',
                        bottom: 0,
                        right: 'center',
                        shape: {
                            width: 50,
                            height: 80
                        },
                        style: {
                            stroke: 'green',
                            fill: 'transparent'
                        }
                    },
                    {
                        type: 'group',
                        id: 'textGroup1',
                        left: '10%',
                        top: 'center',
                        scale: [1, 0.5],
                        children: [
                            {
                                type: 'rect',
                                z: 100,
                                left: 'center',
                                top: 'center',
                                shape: {
                                    width: 170,
                                    height: 70
                                },
                                style: {
                                    fill: '#fff',
                                    stroke: '#999',
                                    lineWidth: 2,
                                    shadowBlur: 8,
                                    shadowOffsetX: 3,
                                    shadowOffsetY: 3,
                                    shadowColor: 'rgba(0,0,0,0.3)'
                                }
                            },
                            {
                                type: 'text',
                                z: 100,
                                top: 'middle',
                                left: 'center',
                                style: {
                                    text: [
                                        '横轴表示温度，单位是°C',
                                        '纵轴表示高度，单位是km',
                                        '右上角有一个图片做的水印'
                                    ].join('\n'),
                                    font: '12px Microsoft YaHei'
                                }
                            }
                        ]
                    }
                ],
                series: [
                    {
                        name: '高度(km)与气温(°C)变化关系',
                        type: 'line',
                        data:[15, -50, -56.5, -46.5, -22.1, -2.5, -27.7, -55.7, -76.5]
                    }
                ]
            };
        }

        function checkLocations(chart, rotated) {
            propHasAll(utHelper.getGraphicElements(chart, 'graphic'), [
                {
                    position: [0, 0],
                    scale: [1, 1],
                    rotation: 0
                },
                {
                    position: [350, 0],
                    scale: [1, 1],
                    rotation: !rotated ? 0 : 0.6283185307179586,
                    style: {
                        fill: '#000',
                        image: imageURI,
                        width: 150,
                        height: 150,
                        opacity: 0.4
                    }
                },
                {
                    position: [500, 400],
                    scale: [1, 1],
                    rotation: !rotated ? 0 : 0.6283185307179586
                },
                {
                    position: [-10, -40],
                    scale: [1, 1],
                    rotation: 0,
                    style: {
                        stroke: 'green',
                        fill: 'transparent'
                    },
                    shape: {
                        width: 20,
                        height: 80,
                        r: 0,
                        x: 0,
                        y: 0
                    }
                },
                {
                    position: [-40, -10],
                    scale: [1, 1],
                    rotation: 0,
                    style: {
                        stroke: 'green',
                        fill: 'transparent'
                    },
                    shape: {
                        width: 80,
                        height: 20,
                        r: 0,
                        x: 0,
                        y: 0
                    }
                },
                {
                    position: !rotated ? [225, 319.5] : [206.2631650489274, 334.5802393266705],
                    scale: [1, 1],
                    rotation: !rotated ? 0 : 0.6283185307179586,
                    style: {
                        stroke: 'green',
                        fill: 'transparent'
                    },
                    shape: {
                        width: 50,
                        height: 80,
                        r: 0,
                        x: 0,
                        y: 0
                    }
                },
                {
                    position: !rotated ? [136, 200] : [130.15559605751, 200],
                    scale: [1, 0.5],
                    rotation: !rotated ? 0 : 0.6283185307179586
                },
                {
                    position: [-85, -35],
                    scale: [1, 1],
                    rotation: 0,
                    style: {
                        fill: '#fff',
                        stroke: '#999',
                        lineWidth: 2,
                        shadowBlur: 8,
                        shadowOffsetX: 3,
                        shadowOffsetY: 3,
                        shadowColor: 'rgba(0,0,0,0.3)'
                    },
                    shape: {
                        width: 170,
                        height: 70,
                        r: 0,
                        x: 0,
                        y: 0
                    }
                },
                {
                    position: [-72, -12],
                    scale: [1, 1],
                    rotation: 0,
                    style: {
                        textBaseline: 'middle',
                        text: '横轴表示温度，单位是°C\n纵轴表示高度，单位是km\n右上角有一个图片做的水印',
                        font: '12px Microsoft YaHei',
                        textVerticalAlign: null
                    }
                }
            ]);
        }

        testCase.createChart()('bounding', function () {
            var chart = this.chart;

            chart.setOption(getOption());

            checkLocations(chart);

            // Set option using getOption
            chart.setOption(this.chart.getOption());

            // Check again, should be the same as before.
            checkLocations(chart);

            var rotation = Math.PI / 5;

            chart.setOption({
                graphic: [{
                    id: 'img',
                    bounding: 'raw',
                    origin: [75, 75],
                    rotation: rotation
                }, {
                    id: 'rectgroup1',
                    rotation: rotation
                }, {
                    id: 'rect2',
                    rotation: rotation
                }, {
                    id: 'textGroup1',
                    rotation: rotation
                }]
            });

            checkLocations(chart, true);

        });

    });

});
