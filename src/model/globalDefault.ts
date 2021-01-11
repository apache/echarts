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


let platform = '';
// Navigator not exists in node
if (typeof navigator !== 'undefined') {
    /* global navigator */
    platform = navigator.platform || '';
}

const decalColor = 'rgba(0, 0, 0, 0.2)';

export default {

    darkMode: 'auto',
    // backgroundColor: 'rgba(0,0,0,0)',

    // https://dribbble.com/shots/1065960-Infographic-Pie-chart-visualization
    // color: ['#5793f3', '#d14a61', '#fd9c35', '#675bba', '#fec42c', '#dd4444', '#d4df5a', '#cd4870'],
    // Light colors:
    // color: ['#bcd3bb', '#e88f70', '#edc1a5', '#9dc5c8', '#e1e8c8', '#7b7c68', '#e5b5b5', '#f0b489', '#928ea8', '#bda29a'],
    // color: ['#cc5664', '#9bd6ec', '#ea946e', '#8acaaa', '#f1ec64', '#ee8686', '#a48dc1', '#5da6bc', '#b9dcae'],
    // Dark colors:
    // color: [
    //     '#c23531', '#2f4554', '#61a0a8', '#d48265', '#91c7ae', '#749f83',
    //     '#ca8622', '#bda29a', '#6e7074', '#546570', '#c4ccd3'
    // ],
    color: [
        // '#51689b', '#ce5c5c', '#fbc357', '#8fbf8f', '#659d84', '#fb8e6a', '#c77288', '#786090', '#91c4c5', '#6890ba'
        '#5470c6',
        '#91cc75',
        '#fac858',
        '#ee6666',
        '#73c0de',
        '#3ba272',
        '#fc8452',
        '#9a60b4',
        '#ea7ccc'
    ],

    gradientColor: ['#f6efa6', '#d88273', '#bf444c'],

    aria: {
        decal: {
            decals: [{
                color: decalColor,
                dashArrayX: [1, 0],
                dashArrayY: [2, 5],
                symbolSize: 1,
                rotation: Math.PI / 6
            }, {
                color: decalColor,
                symbol: 'circle',
                dashArrayX: [[8, 8], [0, 8, 8, 0]],
                dashArrayY: [6, 0],
                symbolSize: 0.8
            }, {
                color: decalColor,
                dashArrayX: [1, 0],
                dashArrayY: [4, 3],
                rotation: -Math.PI / 4
            }, {
                color: decalColor,
                dashArrayX: [[6, 6], [0, 6, 6, 0]],
                dashArrayY: [6, 0]
            }, {
                color: decalColor,
                dashArrayX: [[1, 0], [1, 6]],
                dashArrayY: [1, 0, 6, 0],
                rotation: Math.PI / 4
            }, {
                color: decalColor,
                symbol: 'triangle',
                dashArrayX: [[9, 9], [0, 9, 9, 0]],
                dashArrayY: [7, 2],
                symbolSize: 0.75
            }]
        }
    },

    // If xAxis and yAxis declared, grid is created by default.
    // grid: {},

    textStyle: {
        // color: '#000',
        // decoration: 'none',
        // PENDING
        fontFamily: platform.match(/^Win/) ? 'Microsoft YaHei' : 'sans-serif',
        // fontFamily: 'Arial, Verdana, sans-serif',
        fontSize: 12,
        fontStyle: 'normal',
        fontWeight: 'normal'
    },

    // http://blogs.adobe.com/webplatform/2014/02/24/using-blend-modes-in-html-canvas/
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
    // Default is source-over
    blendMode: null,

    stateAnimation: {
        duration: 300,
        easing: 'cubicOut'
    },

    animation: 'auto',
    animationDuration: 1000,
    animationDurationUpdate: 500,
    animationEasing: 'cubicInOut',
    animationEasingUpdate: 'cubicInOut',

    animationThreshold: 2000,

    // Configuration for progressive/incremental rendering
    progressiveThreshold: 3000,
    progressive: 400,

    // Threshold of if use single hover layer to optimize.
    // It is recommended that `hoverLayerThreshold` is equivalent to or less than
    // `progressiveThreshold`, otherwise hover will cause restart of progressive,
    // which is unexpected.
    // see example <echarts/test/heatmap-large.html>.
    hoverLayerThreshold: 3000,

    // See: module:echarts/scale/Time
    useUTC: false
};