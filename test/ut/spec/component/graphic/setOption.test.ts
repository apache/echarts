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

import { createChart, getGraphicElements, getECModel } from '../../../core/utHelper';
// import { imageURI } from './setOptionImageURI';
import { EChartsType } from '../../../../../src/echarts';
import Element from 'zrender/src/Element';
import { EChartsFullOption } from '../../../../../src/option';
import {
    GraphicComponentOption, GraphicComponentImageOption
} from '../../../../../src/component/graphic';
import Group from 'zrender/src/graphic/Group';
import { Dictionary } from 'zrender/src/core/types';



// eslint-disable-next-line max-len
const imageURI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANwAAADcCAYAAAAbWs+BAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4gIUARQAHY8+4wAAApBJREFUeNrt3cFqAjEUhlEjvv8rXzciiiBGk/He5JxdN2U649dY+KmnEwAAAAAv2uMXEeGOwERntwAEB4IDBAeCAwQHggPBAYIDwQGCA8GB4ADBgeAAwYHgAMGB4EBwgOCgpkuKq2it/r8Li2hbvGKqP6s/PycnHHv9YvSWEgQHCA4EBwgOBAeCAwQHggMEByXM+QRUE6D3suwuPafDn5MTDg50KXnVPSdxa54y/oYDwQGCA8EBggPBAYIDwYHggBE+X5rY3Y3Tey97Nn2eU+rnlGfaZa6Ft5SA4EBwgOBAcCA4QHAgOEBwIDjgZu60y1xrDPtIJxwgOBAcIDgQHAgOEBwIDhAcCA4EBwgOBAcIDgQHCA4EB4IDBAeCAwQHggPBAYIDwQGCA8GB4ADBgeAAwYHgAMGB4GADcz9y2McIgxMOBAeCAwQHggMEB4IDwQGCA8EBggPBATdP6+KIGPRdW7i1LCFi6ALfCQfeUoLgAMGB4ADBgeBAcIDgQHCA4CCdOVvK7quwveQgg7eRTjjwlhIQHAgOBAcIDgQHCA4EB4IDBAfl5dhSdl+17SX3F22rdLlOOBAcCA4QHAgOEBwIDgQHCA4EBwgO0qm5pez6Ce0uSym2jXTCgeAAwYHgQHCA4EBwgOBAcCA4QHBQ3vpbyu47Yns51OLbSCccCA4QHAgOBAcIDgQHCA4EB4ID5jDt+vkObjgFM9dywoHgAMGB4EBwgOBAcIDgQHAgOEBwsA5bysPveMLtpW2kEw4EBwgOBAcIDgQHggMEB4IDBAeCg33ZUqZ/Ql9sL20jnXCA4EBwIDhAcCA4QHAgOBAcIDgQHNOZai3DlhKccCA4QHAgOEBwIDgQHCA4AAAAAGA1VyxaWIohrgXFAAAAAElFTkSuQmCC';

// function loadImage(onload: (img: HTMLImageElement) => void) {
//     const img = new window.Image();
//     img.onload = function () {
//         onload(img);
//     };
//     img.src = imageURI;
// }
// FIXME: TMEP use rect, would have used image.
// node-canvas will throw error when using data URI to zrender directly.
// Havn't dig it out why yet.
function tmpConvertImageOption(opt: GraphicComponentImageOption): object {
    const outOpt = opt as Dictionary<unknown>;
    outOpt.type = 'rect';
    const style = opt.style || {};
    delete style.image;
    outOpt.shape = {
        x: style.x || 0,
        y: style.y || 0,
        width: style.width || 0,
        height: style.height || 0
    };
    return outOpt;
}


describe('graphic_setOption', function () {

    const NUMBER_PRECISION = 6;

    function propHasAll(els: Element[], propsObjList: object[]) {
        for (let i = 0; i < propsObjList.length; i++) {
            propHas(els[i], propsObjList[i]);
        }
    }

    function propHas(target: object, propsObj: object): void {
        if (target == null || propsObj == null) {
            expect(false).toEqual(true);
        }
        expect(typeof target === 'object' && typeof propsObj === 'object').toEqual(true);

        // propsObj can be array
        if (propsObj instanceof Array) {
            expect(target instanceof Array).toEqual(true);
            for (let i = 0; i < propsObj.length; i++) {
                each((target as Element[])[i], propsObj[i], i);
            }
        }
        else {
            for (const name in propsObj) {
                if (propsObj.hasOwnProperty(name)) {
                    each((target as any)[name], (propsObj as any)[name], name);
                }
            }
        }

        function each(targetVal: unknown, propVal: unknown, keyInfo: string | number): void {
            // console.log(targetVal, propVal, keyInfo);
            if (propVal == null) {
                expect(targetVal == null).toEqual(true);
            }
            // object or array
            else if (typeof propVal === 'object') {
                propHas(targetVal as object, propVal);
            }
            else if (typeof propVal === 'number') {
                expect(typeof targetVal).toEqual('number');
                expect((targetVal as number).toFixed(NUMBER_PRECISION)).toEqual(propVal.toFixed(NUMBER_PRECISION));
            }
            else {
                expect(targetVal).toStrictEqual(propVal);
            }
        }
    }


    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    describe('option', function () {

        it('optionFlatten', function () {
            chart.setOption({
                graphic: [
                    tmpConvertImageOption({
                        id: 'uriimg',
                        type: 'image',
                        name: 'nameuriimg',
                        originX: 20,
                        originY: 20,
                        left: 10,
                        top: 10,
                        style: {
                            image: imageURI,
                            width: 80,
                            height: 80,
                            opacity: 0.5
                        }
                    }),
                    {
                        type: 'group',
                        id: 'gr',
                        width: 230,
                        height: 110,
                        x: 70,
                        y: 90,
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
            const option = chart.getOption();
            const graphicOptionList = option.graphic as GraphicComponentOption[];

            expect(graphicOptionList.length === 1).toEqual(true);
            const optionElements = graphicOptionList[0].elements;
            expect(optionElements && optionElements.length === 5).toEqual(true);

            expect(optionElements[0].id === 'uriimg' && optionElements[0].parentId == null).toEqual(true);
            expect(optionElements[1].id === 'gr' && optionElements[1].parentId == null).toEqual(true);
            expect(optionElements[2].name === 'rectxx' && optionElements[2].parentId === 'gr').toEqual(true);
            expect((optionElements[3] as any).style.text === 'aaa' && optionElements[3].parentId === 'gr')
                .toEqual(true);
            expect((optionElements[4] as any).style.text === 'bbb' && optionElements[4].parentId == null)
                .toEqual(true);

        });


        it('groupSetOptionGetOption', function () {

            chart.setOption({
                graphic: [
                    tmpConvertImageOption({
                        id: 'uriimg',
                        type: 'image',
                        name: 'nameuriimg',
                        originX: 20,
                        originY: 20,
                        left: 10,
                        top: 10,
                        style: {
                            image: imageURI,
                            width: 80,
                            height: 80,
                            opacity: 0.5
                        }
                    }),
                    {
                        type: 'group',
                        id: 'gr',
                        width: 230,
                        height: 110,
                        x: 70,
                        y: 90,
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
            chart.setOption(chart.getOption());

            // Check again, should be the same as before.
            checkExistsAndRelations();

            function checkExistsAndRelations() {
                const els = getGraphicElements(chart, 'graphic');

                expect(els.length === 6).toEqual(true);
                expect(els[0].type === 'group').toEqual(true);
                expect(els[1].name === 'nameuriimg').toEqual(true);

                expect(els[2].type === 'group').toEqual(true);
                const groupEls = getGraphicElements(els[2] as Group, 'graphic');
                expect(groupEls.length === 2).toEqual(true);
                expect(groupEls[0] === els[3]).toEqual(true);
                expect(groupEls[1] === els[4]).toEqual(true);
                expect(els[3].name === 'rectxx').toEqual(true);
                expect((els[4] as any).style.text === 'aaa').toEqual(true);

                expect((els[5] as any).style.text === 'bbb').toEqual(true);
            }
        });


        it('onlyOneGraphicComponentAvailable', function () {


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

            expect(!!getECModel(chart).getComponent('graphic')).toEqual(true);
            expect(getECModel(chart).getComponent('graphic', 1) == null).toEqual(true);
        });


        it('replace', function () {


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

            let els: Element[];

            els = getGraphicElements(chart, 'graphic');

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

            els = getGraphicElements(chart, 'graphic');

            expect(els.length === 2).toEqual(true);
            expect(els[0].type === 'group').toEqual(true);
            expect(els[1].name === 'b' && els[1].type === 'rect').toEqual(true);
            expect((els[1] as any).shape && (els[1] as any).shape.width === 20).toEqual(true);
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

        function checkDeteteSource(chart: EChartsType) {
            const els = getGraphicElements(chart, 'graphic');
            expect(els.length === 4);
            expect(els[1].type === 'text' && els[1].name === 'textname').toEqual(true);
            expect(els[2].type === 'ring' && els[2].name === 'ringname').toEqual(true);
            expect(els[3].type === 'rect' && els[3].name === 'rectname').toEqual(true);
        }

        it('deleteBy$action', function () {

            chart.setOption(getDeleteSourceOption());

            checkDeteteSource(chart);

            chart.setOption({
                graphic: {
                    id: 'rrr',
                    $action: 'remove'
                }
            });

            const els = getGraphicElements(chart, 'graphic');
            expect(els.length === 3);
            expect(els[1].type === 'text' && els[1].name === 'textname').toEqual(true);
            expect(els[2].type === 'rect' && els[2].name === 'rectname').toEqual(true);
        });

        it('deleteBySetOptionNotMerge', function () {


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

            const els = getGraphicElements(chart, 'graphic');
            expect(els.length === 2);
            expect(els[1].type === 'rect' && els[1].name === 'rectname2').toEqual(true);
        });

        it('deleteByClear', function () {


            chart.setOption(getDeleteSourceOption());

            checkDeteteSource(chart);

            chart.clear();

            const els = getGraphicElements(chart, 'graphic');
            expect(els.length === 0);
        });


        function checkMergeElements(chart: EChartsType, merged: boolean): void {
            const makeIdentityTransformProps = () => ({
                x: 0,
                y: 0,
                scaleX: 1,
                scaleY: 1,
                rotation: 0
            });
            propHasAll(getGraphicElements(chart, 'graphic'), [
                {
                    ...makeIdentityTransformProps()
                },
                {
                    ...makeIdentityTransformProps(),
                    style: {},
                    shape: {
                        x: !merged ? 250 : 350,
                        y: 50,
                        width: 20,
                        height: 80
                        // r: 0
                    }
                },
                {
                    ...makeIdentityTransformProps()
                },
                {
                    ...makeIdentityTransformProps(),
                    style: {
                        fill: !merged ? 'yellow' : 'pink'
                    },
                    shape: {
                        x: 30,
                        y: 30,
                        width: 10,
                        height: 20
                        // r: 0
                    }
                },
                {
                    ...makeIdentityTransformProps(),
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

        it('mergeTroughFlatForamt', function () {

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

            checkMergeElements(chart, false);

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










    describe('groupLRTB', function () {

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
                    tmpConvertImageOption({
                        id: 'uriimg',
                        type: 'image',
                        originX: 20,
                        originY: 20,
                        left: 10,
                        top: 10,
                        style: {
                            image: imageURI,
                            width: 80,
                            height: 80,
                            opacity: 0.5
                        }
                    }),
                    {
                        type: 'group',
                        id: 'gr',
                        width: 230,
                        height: 110,
                        x: 70,
                        y: 90,
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

        function checkLocations(chart: EChartsType, uriimgChanged?: boolean) {

            propHasAll(getGraphicElements(chart, 'graphic'), [
                {
                    x: 0,
                    y: 0,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0
                },
                {/* FIXME: node-canvas measure issue casue behavior different from browser. comment out it temporarily.
                    x: 98.17662350913716,
                    y: 133.02943725152284,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0.7853981633974483,
                    style: {
                        font: '24px Microsoft YaHei',
                        text: '全屏右下角',
                        textVerticalAlign: null,
                        verticalAlign: null
                    }
                */},
                !uriimgChanged
                    ? tmpConvertImageOption({
                        x: 10,
                        y: 10,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0,
                        style: {
                            height: 80,
                            opacity: 0.5,
                            width: 80,
                            image: imageURI
                        }
                    })
                    : tmpConvertImageOption({
                        x: 61,
                        y: 45,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0,
                        style: {
                            height: 60,
                            opacity: 0.5,
                            width: 78,
                            image: imageURI
                        }
                    }),
                {
                    x: 70,
                    y: 90,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0
                },
                {
                    x: 0,
                    y: 0,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    style: {
                        stroke: 'red',
                        fill: 'transparent',
                        lineWidth: 2
                    },
                    shape: {
                        width: 230,
                        height: 80,
                        x: 0,
                        y: 0
                        // r: 0,
                    }
                },
                {
                    x: 0,
                    y: 0,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    style: {
                        stroke: 'red',
                        fill: 'transparent',
                        lineWidth: 2
                    },
                    shape: {
                        width: 60,
                        height: 110,
                        x: 0,
                        y: 0
                        // r: 0,
                    }
                },
                {/* FIXME: node-canvas measure issue casue behavior different from browser. comment out it temporarily.
                    x: 145.47972137162424,
                    y: 97.71384413353478,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0.5,
                    style: {
                        font: '14px Microsoft YaHei',
                        text: 'group最右下角',
                        textVerticalAlign: null,
                        verticalAlign: null
                    }
                */},
                {/* FIXME: node-canvas measure issue casue behavior different from browser. comment out it temporarily.
                    x: 46,
                    y: 96,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    style: {
                        font: '18px sans-serif',
                        text: '全屏最下中间\n这是多行文字\n这是第三行',
                        textVerticalAlign: null,
                        verticalAlign: null
                    }
                */}
            ]);
        }

        function checkResizedLocations(chart: EChartsType) {
            propHasAll(getGraphicElements(chart, 'graphic'), [
                {
                    x: 0,
                    y: 0,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0
                },
                {/* FIXME: node-canvas measure issue casue behavior different from browser. comment out it temporarily.
                    x: 98.17662350913716,
                    y: 133.02943725152286,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0.7853981633974483,
                    style: {
                        font: '24px Microsoft YaHei',
                        text: '全屏右下角',
                        textVerticalAlign: null,
                        verticalAlign: null
                    }
                */},
                tmpConvertImageOption({
                    x: 10,
                    y: 10,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    style: {
                        image: imageURI,
                        width: 80,
                        height: 80,
                        opacity: 0.5
                    }
                }),
                {
                    x: 70,
                    y: 90,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0
                },
                {
                    x: 0,
                    y: 0,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    style: {
                        stroke: 'red',
                        fill: 'transparent',
                        lineWidth: 2
                    },
                    shape: {
                        width: 230,
                        height: 80,
                        x: 0,
                        y: 0
                        // r: 0,
                    }
                },
                {
                    x: 0,
                    y: 0,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    style: {
                        stroke: 'red',
                        fill: 'transparent',
                        lineWidth: 2
                    },
                    shape: {
                        width: 60,
                        height: 110,
                        x: 0,
                        y: 0
                        // r: 0,
                    }
                },
                {/* FIXME: node-canvas measure issue casue behavior different from browser. comment out it temporarily.
                    x: 145.47972137162424,
                    y: 97.71384413353478,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0.5,
                    style: {
                        font: '14px Microsoft YaHei',
                        text: 'group最右下角',
                        textVerticalAlign: null,
                        verticalAlign: null
                    }
                */},
                {/* FIXME: node-canvas measure issue casue behavior different from browser. comment out it temporarily.
                    x: 46,
                    y: 96,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    style: {
                        font: '18px sans-serif',
                        text: '全屏最下中间\n这是多行文字\n这是第三行',
                        textVerticalAlign: null,
                        verticalAlign: null
                    }
                */}
            ]);
        }

        it('getAndGet', function () {
            const myChart = createChart({
                width: 200,
                height: 150
            });
            myChart.setOption(getOption());

            checkLocations(myChart);
            // Set option using getOption
            chart.setOption(myChart.getOption());
            // Check again, should be the same as before.
            checkLocations(myChart);

            myChart.dispose();
        });

        // Test modify location by setOption.
        // And test center and middle.
        it('modifyAndCenter', function () {
            const myChart = createChart({
                width: 200,
                height: 150
            });

            myChart.setOption(getOption());

            checkLocations(myChart);

            myChart.setOption({
                graphic: [tmpConvertImageOption({
                    id: 'uriimg',
                    left: 'center',
                    top: 'middle',
                    style: {
                        width: 78,
                        height: 60
                    }
                })]
            });

            checkLocations(myChart, true);

            myChart.dispose();
        });

        it('resize', function () {
            const myChart = createChart({
                width: 200,
                height: 150
            });

            myChart.setOption(getOption());

            checkLocations(myChart);

            myChart.resize({
                width: 220,
                height: 300
            });

            checkResizedLocations(myChart);

            myChart.dispose();
        });
    });







    describe('boundingAndRotation', function () {

        function getOption(): EChartsFullOption {
            return {
                legend: {
                    data: ['高度(km)与气温(°C)变化关系']
                },
                xAxis: {
                },
                yAxis: {
                    type: 'category',
                    data: ['0', '10', '20', '30', '40', '50', '60', '70', '80']
                },
                graphic: [
                    tmpConvertImageOption({
                        type: 'image',
                        id: 'img',
                        z: -10,
                        right: 0,
                        top: 0,
                        bounding: 'raw',
                        originX: 75,
                        originY: 75,
                        style: {
                            fill: '#000',
                            image: imageURI,
                            width: 150,
                            height: 150,
                            opacity: 0.4
                        } as any
                    }),
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
                        scaleX: 1,
                        scaleY: 0.5,
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
                        data: [15, -50, -56.5, -46.5, -22.1, -2.5, -27.7, -55.7, -76.5]
                    }
                ]
            };
        }

        function checkLocations(chart: EChartsType, rotated?: boolean) {
            propHasAll(getGraphicElements(chart, 'graphic'), [
                {
                    x: 0,
                    y: 0,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0
                },
                tmpConvertImageOption({
                    x: 350,
                    y: 0,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: !rotated ? 0 : 0.6283185307179586,
                    style: {
                        // fill: '#000',
                        image: imageURI,
                        width: 150,
                        height: 150,
                        opacity: 0.4
                    }
                }),
                {
                    x: 500,
                    y: 400,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: !rotated ? 0 : 0.6283185307179586
                },
                {
                    x: -10,
                    y: -40,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    style: {
                        stroke: 'green',
                        fill: 'transparent'
                    },
                    shape: {
                        width: 20,
                        height: 80,
                        x: 0,
                        y: 0
                        // r: 0,
                    }
                },
                {
                    x: -40,
                    y: -10,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    style: {
                        stroke: 'green',
                        fill: 'transparent'
                    },
                    shape: {
                        width: 80,
                        height: 20,
                        x: 0,
                        y: 0
                        // r: 0,
                    }
                },
                {
                    x: !rotated ? 225 : 206.2631650489274,
                    y: !rotated ? 319.5 : 334.5802393266705,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: !rotated ? 0 : 0.6283185307179586,
                    style: {
                        stroke: 'green',
                        fill: 'transparent'
                    },
                    shape: {
                        width: 50,
                        height: 80,
                        x: 0,
                        y: 0
                        // r: 0,
                    }
                },
                {
                    x: !rotated ? 136 : 130.15559605751,
                    y: 200,
                    scaleX: 1,
                    scaleY: 0.5,
                    rotation: !rotated ? 0 : 0.6283185307179586
                },
                {
                    x: -85,
                    y: -35,
                    scaleX: 1,
                    scaleY: 1,
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
                        x: 0,
                        y: 0
                        // r: 0,
                    }
                },
                {/* FIXME: node-canvas measure issue casue behavior different from browser. comment out it temporarily.
                    x: -72,
                    y: -18,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    style: {
                        text: '横轴表示温度，单位是°C\n纵轴表示高度，单位是km\n右上角有一个图片做的水印',
                        font: '12px Microsoft YaHei',
                        textVerticalAlign: null,
                        verticalAlign: null
                    }
                */}
            ]);
        }

        it('bounding', function () {


            chart.setOption(getOption());

            checkLocations(chart);

            // Set option using getOption
            chart.setOption(chart.getOption());

            // Check again, should be the same as before.
            checkLocations(chart);

            const rotation = Math.PI / 5;

            chart.setOption({
                graphic: [{
                    id: 'img',
                    bounding: 'raw',
                    originX: 75,
                    originY: 75,
                    rotation: rotation
                } as any, {
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
