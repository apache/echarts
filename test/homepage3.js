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

function renderHomepage3Demo(echarts) {

    var mainColor = '#dd4541';
    var minValueSpan = 15;
    var dataZoomStartValue = 9;
    var dataZoomEndValue = 45;
    var backgroundColor = '#fff';
    var axisLabelColor = '#979797';
    var globalFontFamily = 'Arial';
    var pcGlobalFontSize = 12;
    var mobileGlobalFontSize = 12;
    var bgAreaColor = '#e4e4e4';
    var bgAreaColorTooltip = '#aaa';

    var categoryData = ['03/01','03/02','03/03','03/04','03/05','03/06','03/07','03/08','03/09','03/10','03/11','03/12','03/13','03/14','03/15','03/16','03/17','03/18','03/19','03/20','03/21','03/22','03/23','03/24','03/25','03/26','03/27','03/28','03/29','03/30','03/31','04/01','04/02','04/03','04/04','04/05','04/06','04/07','04/08','04/09','04/10','04/11','04/12','04/13','04/14','04/15','04/16','04/17','04/18','04/19','04/20','04/21','04/22','04/23','04/24','04/25','04/26','04/27','04/28','04/29','04/30','05/01','05/02','05/03','05/04','05/05','05/06','05/07','05/08','05/09','05/10','05/11','05/12','05/13','05/14','05/15']; // jshint ignore:line
    var series0Data = [23,32.65,61.06,47.84,54.2,65.96,41.47,48.16,27.59,65.96,52.24,37.22,44.73,53.22,60.08,68.24,58.29,74.78,62.2,71.67,66.78,71.18,46.47,56.39,34.02,47.41,47.11,25.67,28.94,34.73,40.29,46.86,52.96,64.82,51.63,72.33,61.39,66.94,60.57,51.27,47.18,56.49,50.12,52.57,42.45,47.18,34.45,38.69,25.63,35.1,31.51,40.82,30.69,34.45,41.31,46.69,48.82,41.31,52.24,55.51,47.51,32.65,37.71,26.78,16.65,21.06,17.31,26.61,32.98,45.06,41.63,53.39,63.67,58.94,43.92,50.29]; // jshint ignore:line
    var series1Data = [0.48,0.54,0.62,0.75,1.05,1.33,1.44,1.38,1.16,0.97,0.77,0.64,0.61,0.67,0.82,1.03,1.25,1.39,1.46,1.41,1.28,1.05,0.80,0.66,0.64,0.72,0.94,1.22,1.38,1.43,1.33,1.1,0.85,0.7,0.73,0.9,1.13,1.26,1.33,1.3,1.18,0.86,0.73,0.69,0.75,0.94,1.26,1.4,1.44,1.45,1.32,1.02,0.72,0.56,0.51,0.59,0.69,0.91,1.16,1.33,1.4,1.38,1.26,1.07,0.74,0.61,0.54,0.58,0.76,1.1,1.3,1.35,1.3,0.98,0.77,0.63]; // jshint ignore:line
    var series2Data = [1.63,1.61,1.58,1.54,1.5,1.47,1.47,1.5,1.57,1.67,1.74,1.83,1.91,1.96,1.98,1.94,1.84,1.68,1.55,1.43,1.32,1.27,1.26,1.31,1.46,1.59,1.67,1.68,1.62,1.56,1.52,1.52,1.64,1.89,2.2,2.39,2.47,2.46,2.37,2.24,2.06,1.92,1.87,1.86,1.92,2.06,2.18,2.24,2.22,2.09,1.93,1.82,1.78,1.79,1.81,1.85,1.94,2,2.01,1.96,1.9,1.76,1.65,1.56,1.49,1.45,1.44,1.46,1.54,1.59,1.57,1.54,1.54,1.62,1.74,1.85]; // jshint ignore:line

    var pcXAxisTextStyle = {
        fontSize: pcGlobalFontSize,
        fontFamily: globalFontFamily,
        color: axisLabelColor
    };
    var pcYAxisTextStyle = {
        fontSize: pcGlobalFontSize,
        fontFamily: globalFontFamily,
        color: axisLabelColor
    };
    var mobileXAxisTextStyle = {
        fontSize: mobileGlobalFontSize,
        fontFamily: globalFontFamily,
        color: axisLabelColor
    };
    var mobileYAxisTextStyle = {
        fontSize: mobileGlobalFontSize,
        fontFamily: globalFontFamily,
        color: axisLabelColor
    };
    var pcAxisPointerTextStyle = {
        color: '#333'
    };

    function getSeriesA() {
        return {
            type: 'bar',
            name: 'seriesA',
            id: 'gridScatter',
            showSymbol: false,
            symbolSize: 10,
            hoverAnimation: false,
            itemStyle: {
                normal: {
                    color: mainColor,
                    barBorderRadius: 8
                }
            },
            data: series0Data
        };
    }

    function getSeriesB() {
        return {
            type: 'line',
            name: 'seriesB',
            yAxisIndex: 1,
            xAxisIndex: 1,
            smooth: true,
            symbolSize: 10,
            showSymbol: false,
            hoverAnimation: false,
            areaStyle: {
                normal: {
                    color: mainColor,
                    opacity: 1,
                    shadowOffsetX: 0,
                    shadowOffsetY: 4,
                    shadowBlur: 30,
                    shadowColor: '#555'
                }
            },
            lineStyle: {
                normal: {
                    width: 0
                }
            },
            data: series1Data,
            z: 10
        };
    }

    function getSeriesC() {
        return {
            type: 'line',
            name: 'seriesC',
            xAxisIndex: 1,
            yAxisIndex: 1,
            smooth: true,
            showSymbol: false,
            symbolSize: 0,
            hoverAnimation: false,
            areaStyle: {
                normal: {
                    color: bgAreaColor,
                    opacity: 1
                }
            },
            lineStyle: {
                normal: {
                    width: 0
                }
            },
            data: series2Data,
            z: 9
        };
    }

    function getSeriesAxisPointer() {
        return {
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 1,
            barWidth: 1,
            animation: false,
            hoverAnimation: false,
            silent: true,
            itemStyle: {
                normal: {
                    color: 'transparent'
                },
                emphasis: {
                    color: '#fff'
                }
            },
            data: series1Data,
            z: 10
        };
    }

    function getXAxis(xAxis0, xAxis1) {
        return [
            echarts.util.merge({
                splitLine: {
                    show: false
                },
                axisTick: {
                    show: false
                },
                axisLine: {
                    show: false,
                    lineStyle: {
                        color: '#ddd'
                    }
                },
                axisLabel: {
                    show: false
                },
                axisPointer: {
                    type: 'shadow',
                    label: {
                        show: false
                    },
                    shadowStyle: {
                        color: '#eee'
                        // color: bgAreaColor
                        // color: 'rgba(221,69,65,0.15)'
                    },
                    z: -100
                },
                data: categoryData
            }, xAxis0),
            echarts.util.merge({
                gridIndex: 1,
                splitLine: {
                    show: false
                },
                axisTick: {
                    show: false,
                    lineStyle: {
                        color: '#ddd'
                    }
                },
                axisLine: {
                    show: false,
                    lineStyle: {
                        color: '#ddd'
                    }
                },
                axisLabel: {
                    // textStyle: pcXAxisTextStyle
                },
                axisPointer: {
                    type: 'none',
                    label: {
                        backgroundColor: bgAreaColor,
                        textStyle: pcAxisPointerTextStyle
                    }
                },
                data: categoryData
            }, xAxis1)
        ];
    }

    function getYAxis(yAxis0, yAxis1) {
        return [
            echarts.util.merge({
                min: 0,
                max: 80,
                nameTextStyle: {
                    color: '#ccc',
                    fontSize: 18
                },
                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                },
                splitLine: {
                    show: false
                },
                axisLabel: {
                },
                axisPointer: {
                    label: {
                        backgroundColor: bgAreaColor,
                        textStyle: pcAxisPointerTextStyle
                    }
                }
            }, yAxis0),
            echarts.util.merge({
                gridIndex: 1,
                minInterval: 1,
                nameTextStyle: {
                    color: '#ccc',
                    fontSize: 18
                },
                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                },
                splitLine: {
                    lineStyle: {
                        color: bgAreaColor
                    }
                },
                axisLabel: {
                    formatter: '{value} m'
                },
                axisPointer: {
                    label: {
                        backgroundColor: bgAreaColor,
                        textStyle: pcAxisPointerTextStyle
                    }
                }
            }, yAxis1)
        ];
    }



    var option = {
        backgroundColor: backgroundColor,
        textStyle: {
            fontFamily: globalFontFamily,
            fontSize: pcGlobalFontSize
        },
        toolbox: {
            show: false
        },
        brush: {
            toolbox: ['lineX'],
            outOfBrush: {
                color: bgAreaColor
            },
            brushType: 'lineX',
            brushStyle: {
                borderWidth: 0,
                color: 'rgba(0,0,0,0)'
            },
            xAxisIndex: 0
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            },
            padding: 5,
            backgroundColor: '#fff',
            borderWidth: 0,
            textStyle: {
                color: '#222'
            },
            extraCssText: 'z-index: 200;box-shadow: 0px 3px 15px rgba(0,0,0,0.3)',
            formatter: function (params) {
                var dataIndex = params[0].dataIndex;
                return echarts.util.map([
                    ['seriesA', mainColor, series0Data],
                    ['seriesB', mainColor, series1Data],
                    ['seriesC', bgAreaColorTooltip, series2Data]
                ], function (def, idx) {
                    return echarts.format.getTooltipMarker(def[1], !idx ? 'border-radius: 0;' : '')
                        + '<span style="color:' + echarts.format.encodeHTML(def[1]) + '">'
                        + def[0] + ': ' + def[2][dataIndex] + (idx ? ' m' : '')
                        + '</span>';
                }).join('<br>');
            }
        },
        axisPointer: {
            link: [{xAxisIndex: 'all'}],
            label: {
                textStyle: {
                    color: '#222'
                }
            },
            z: 500
        },
        xAxis: getXAxis({
            axisLabel: {
                textStyle: pcXAxisTextStyle
            }
        }, {
            axisLabel: {
                textStyle: pcXAxisTextStyle
            }
        }),
        yAxis: getYAxis({
            axisLabel: {
                textStyle: pcYAxisTextStyle
            }
        }, {
            axisLabel: {
                textStyle: pcYAxisTextStyle
            }
        }),
        grid: [{
            left: 50,
            right: 38,
            bottom: 228,
            height: 123
        }, {
            left: 50,
            right: 38,
            bottom: 84,
            height: 112
        }],
        dataZoom: [{
            startValue: dataZoomStartValue,
            endValue: dataZoomEndValue,
            left: 50,
            right: 38,
            bottom: 35,
            height: 4,
            showDataShadow: false,
            borderColor: 'transparent',
            backgroundColor: '#e2e2e2',
            // handleIcon: 'M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7v-1.2h6.6z M13.3,22H6.7v-1.2h6.6z M13.3,19.6H6.7v-1.2h6.6z', // jshint ignore:line
            // handleIcon: 'M10.93,0.61c5.927,0,10.733,4.762,10.733,10.637S16.857,21.883,10.93,21.883 c-5.928,0-10.733-4.762-10.733-10.636S5.002,0.61,10.93,0.61z M15.646,10.247H6.215v2h9.431V10.247z', // jshint ignore:line
            handleIcon: 'image://data/handle.png', // jshint ignore:line
            handleSize: 20,
            handleStyle: {
                color: mainColor,
                shadowBlur: 6,
                shadowOffsetX: 1,
                shadowOffsetY: 2,
                shadowColor: '#aaa'
            },
            fillerColor: mainColor,
            labelFormatter: '',
            // borderColor: 'rgba(0,0,0,0.2)',
            xAxisIndex: [0, 1],
            minValueSpan: minValueSpan
        }, {
            startValue: dataZoomStartValue,
            endValue: dataZoomEndValue,
            type: 'inside',
            xAxisIndex: [0, 1],
            minValueSpan: minValueSpan
        }],
        series: [
            getSeriesA(),
            getSeriesB(),
            getSeriesC(),
            getSeriesAxisPointer()
        ]
    };

    var option2 = {
        backgroundColor: backgroundColor,
        textStyle: {
            fontFamily: globalFontFamily,
            fontSize: mobileGlobalFontSize
        },
        toolbox: {
            show: false
        },
        brush: {
            toolbox: ['lineX'],
            outOfBrush: {
                color: bgAreaColor
            },
            brushType: 'lineX',
            brushStyle: {
                borderWidth: 0,
                color: 'rgba(0,0,0,0)'
            },
            xAxisIndex: 0
        },
        tooltip: {
            show: true,
            triggerOn: 'none',
            alwaysShowContent: true,
            position: function (pos, params, dom, rect, size) {
                return {top: 10, left: 'center'};
            },
            backgroundColor: 'transparent',
            transitionDuration: 0,
            formatter: function (params) {
                var dataIndex = params[0].dataIndex;
                return echarts.util.map([
                    ['seriesA', mainColor, series0Data],
                    ['seriesB', mainColor, series1Data],
                    ['seriesC', bgAreaColorTooltip, series2Data]
                ], function (def, idx) {
                    return echarts.format.getTooltipMarker(def[1], !idx ? 'border-radius: 0;' : '')
                        + '<span style="display:inline-block;width: 100px;color:' + echarts.format.encodeHTML(def[1]) + '">'
                        + def[0] + ': ' + def[2][dataIndex] + (idx ? ' m' : '')
                        + '</span>';
                }).join('&nbsp;&nbsp;&nbsp;');
            }
        },
        axisPointer: {
            triggerOn: 'none',
            link: [{xAxisIndex: 'all'}],
            label: {
                textStyle: {
                    color: '#222'
                }
            },
            z: 500
        },
        xAxis: getXAxis({
            axisLabel: {
                textStyle: mobileXAxisTextStyle
            },
            axisPointer: {
                show: true
            }
        }, {
            axisLabel: {
                textStyle: mobileXAxisTextStyle
            },
            axisPointer: {
                value: '04/12',
                handle: {
                    show: true,
                    icon: 'image://./data/handle2.png',
                    size: [36, 40],
                    color: mainColor,
                    shadowBlur: 12,
                    shadowOffsetX: 2,
                    shadowOffsetY: 4,
                    shadowColor: '#aaa'
                }
            }
        }),
        yAxis: getYAxis({
            axisLabel: {
                textStyle: mobileYAxisTextStyle
            }
        }, {
            axisLabel: {
                textStyle: mobileYAxisTextStyle
            }
        }),
        grid: [{
            top: 63,
            left: 36,
            right: 14,
            height: 212
        }, {
            top: 335,
            left: 36,
            right: 14,
            height: 230
        }],
        dataZoom: [{
            startValue: dataZoomStartValue,
            endValue: dataZoomEndValue,
            type: 'inside',
            xAxisIndex: [0, 1],
            minValueSpan: minValueSpan
        }],
        series: [
            getSeriesA(),
            getSeriesB(),
            getSeriesC(),
            getSeriesAxisPointer()
        ]
    };


    var myChart = echarts.init($('.ch-pc-chart')[0]);
    myChart.setOption(option);
    var myChart2 = echarts.init($('.ch-mobile-chart')[0]);
    myChart2.setOption(option2);

    bindAction(myChart, myChart2, 'a');
    bindAction(myChart2, myChart, 'b');

    myChart.dispatchAction({
        type: 'brush',
        areas: [
            {
                xAxisIndex: 0,
                brushType: 'lineX',
                coordRange: [17, 27]
            }
        ]
    });

    function bindAction(fromChart, toChart, flag) {
        fromChart.on('updateAxisPointer', function (params) {
            toChart.dispatchAction(
                toChart.makeActionFromEvent(params),
                true
            );
        });

        fromChart.on('dataZoom', function (params) {
            var payload = params.batch ? params.batch[0] : params;
            toChart.dispatchAction({
                type: 'dataZoom',
                dataZoomIndex: 0,
                start: payload.start,
                end: payload.end
            }, true);
        });

        fromChart.on('brush', function (params) {
            params.areas[0] && toChart.dispatchAction({
                type: 'brush',
                areas: [
                    {
                        xAxisIndex: 0,
                        brushType: 'lineX',
                        coordRange: params.areas[0].coordRange
                    }
                ]
            }, true);
        });
    }
}