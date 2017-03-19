/*jshint unused:false*/
/*jshint camelcase:false*/

function createChart(id, echarts, option, height) {
    var dom = document.getElementById(id);
    if (dom) {
        if (height != null) {
            dom.style.height = height + 'px';
        }
        var chart = echarts.init(dom);
        chart.setOption(option);
        resizable(chart);
        return chart;
    }
}

function resizable(chart) {
    window.addEventListener('resize', chart.resize);
}

function extend(target, source) {
    for (var key in source) {
        if (source.hasOwnProperty(key)) {
            target[key] = source[key];
        }
    }
    return target;
}

function makeCategoryData(scale, catePrefix, dataCount) {
    var categoryData = [];
    var data1 = [];
    var data2 = [];
    var data3 = [];
    scale = scale || 1;
    catePrefix = catePrefix || 'category';
    dataCount = dataCount || 10;

    categoryData.push(catePrefix + -1);
    data1.push('-');
    data2.push('-');
    data3.push('-');

    for (var i = 0; i < 5; i++) {
        categoryData.push(catePrefix + i);
        data1.push(((-Math.random() - 0.2) * scale).toFixed(3));
        data2.push(((Math.random() + 0.3) * scale).toFixed(3));
        data3.push(((Math.random() + 0.2) * scale).toFixed(3));
    }

    categoryData.push(catePrefix + i);
    data1.push('-');
    data2.push('-');
    data3.push('-');

    for (; i < dataCount - 1; i++) {
        categoryData.push(catePrefix + i);
        data1.push(((-Math.random() - 0.2) * scale).toFixed(3));
        data2.push(((Math.random() + 0.3) * scale).toFixed(3));
        data3.push(((Math.random() + 0.2) * scale).toFixed(3));
    }
    categoryData.push(catePrefix + i);
    data1.push('-');
    data2.push('-');
    data3.push('-');

    return {categoryData: categoryData, data1: data1, data2: data2, data3: data3};
}

function makeValueData() {
    var data1 = [];
    var data2 = [];
    var data3 = [];

    data1.push(['-', '-']);
    data2.push(['-', '-']);
    data3.push(['-', '-']);

    for (var i = 0; i < 5; i++) {
        data1.push([(Math.random() * 1000).toFixed(2), (-Math.random() - 0.4).toFixed(3)]);
        data2.push([(Math.random() * 1000).toFixed(2), (Math.random() + 1.8).toFixed(3)]);
        data3.push([(Math.random() * 1000).toFixed(2), (Math.random() + 0.2).toFixed(3)]);
    }

    data1.push(['-', '-']);
    data2.push(['-', '-']);
    data3.push(['-', '-']);

    for (; i < 10; i++) {
        data1.push([(Math.random() * 1000).toFixed(2), (-Math.random() - 0.2).toFixed(3)]);
        data2.push([(Math.random() * 1000).toFixed(2), (Math.random() + 0.3).toFixed(3)]);
        data3.push([(Math.random() * 1000).toFixed(2), (Math.random() + 0.2).toFixed(3)]);
    }
    data1.push(['-', '-']);
    data2.push(['-', '-']);
    data3.push(['-', '-']);

    return {data1: data1, data2: data2, data3: data3};
}


function makeTimeData() {
    var data1 = [];
    var data2 = [];
    var data3 = [];

    data1.push(['-', '-']);
    data2.push(['-', '-']);
    data3.push(['-', '-']);

    var day = 3600 * 1000 * 24;
    var time = +new Date(2017, 2, 15);
    for (var i = 0; i < 100; i++, time += day) {
        var d = new Date(time);
        var dayStr = [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-');
        data1.push([dayStr, (-Math.random() - 0.2).toFixed(3)]);
        var val2 = (Math.random() + 0.3).toFixed(3);
        if (i >= 25 && i <= 30) {
            val2 = '-';
        }
        var val3 = (Math.random() + 0.2).toFixed(3);
        if (i >= 25 && i <= 30) {
            val3 = '-';
        }
        data2.push([dayStr, val2]);
        data3.push([dayStr, val3]);
    }

    return {data1: data1, data2: data2, data3: data3};
}

function getArray(obj, name) {
    return (obj[name] = obj[name] || []);
}

function makeCategoryPolar(option, patterns, inV) {
    var data = makeCategoryData();
    var key = Math.random().toFixed(5);

    option.legend = option.legend || {
        tooltip: {show: true}
    };
    getArray(option.legend, 'data').push('line1' + key, 'line2' + key, 'line3' + key);

    var polar = extend({}, patterns.polar);
    polar.id = 'polar' + key;
    getArray(option, 'polar').push(polar);

    var axisNames = ['radiusAxis', 'angleAxis'];
    inV && axisNames.reverse();

    getArray(option, axisNames[0]).push(extend({
        id: axisNames[0] + key,
        polarId: polar.id,
        data: data.categoryData,
        boundaryGap: false,
        splitArea: {
            show: true
        }
    }, patterns[axisNames[0]]));

    getArray(option, axisNames[1]).push(extend({
        id: axisNames[1] + key,
        polarId: polar.id,
        nameLocation: 'middle',
        nameGap: 40
    }, patterns[axisNames[1]]));

    var patternsSeries = patterns.series || [];

    getArray(option, 'series').push(
        extend({
            id: 'line1-id' + key,
            name: 'line1' + key,
            coordinateSystem: 'polar',
            polarId: polar.id,
            type: 'line',
            symbolSize: 10,
            data: data.data1,
            connectNulls: true
        }, patternsSeries[0]),
        extend({
            id: 'line2-id' + key,
            name: 'line2' + key,
            coordinateSystem: 'polar',
            polarId: polar.id,
            type: 'line',
            symbolSize: 10,
            data: data.data2
        }, patternsSeries[1]),
        extend({
            id: 'line3-id' + key,
            name: 'line3' + key,
            coordinateSystem: 'polar',
            polarId: polar.id,
            type: 'line',
            symbolSize: 10,
            symbol: 'circle',
            data: data.data3,
            label: {
                normal: {
                    show: true
                }
            }
        }, patternsSeries[2])
    );
}

function makeCategoryGrid(option, patterns, inV, dataCount, seriesType, catePrefix) {
    var data = makeCategoryData(null, catePrefix, dataCount);
    var key = Math.random().toFixed(5);
    seriesType = seriesType || 'line';

    option.legend = option.legend || {
        tooltip: {show: true}
    };
    getArray(option.legend, 'data').push('line1' + key, 'line2' + key, 'line3' + key);

    var grid = extend({}, patterns.grid);
    grid.id = 'grid' + key;
    getArray(option, 'grid').push(grid);

    var axisNames = ['xAxis', 'yAxis'];
    inV && axisNames.reverse();

    getArray(option, axisNames[0]).push(extend({
        id: axisNames[0] + key,
        gridId: grid.id,
        data: data.categoryData,
        boundaryGap: false,
        splitArea: {
            show: true
        }
    }, patterns[axisNames[0]]));

    getArray(option, axisNames[1]).push(extend({
        id: axisNames[1] + key,
        gridId: grid.id,
        nameLocation: 'middle',
        nameGap: 40
    }, patterns[axisNames[1]]));

    var patternsSeries = patterns.series || [];

    getArray(option, 'series').push(
        extend({
            id: 'line1-id' + key,
            name: 'line1' + key,
            xAxisId: 'xAxis' + key,
            yAxisId: 'yAxis' + key,
            type: seriesType,
            symbolSize: 10,
            data: data.data1,
            smooth: true,
            connectNulls: true
        }, patternsSeries[0]),
        extend({
            id: 'line2-id' + key,
            name: 'line2' + key,
            xAxisId: 'xAxis' + key,
            yAxisId: 'yAxis' + key,
            type: seriesType,
            symbolSize: 10,
            data: data.data2,
            connectNulls: true,
            smooth: true
        }, patternsSeries[1]),
        extend({
            id: 'line3-id' + key,
            name: 'line3' + key,
            xAxisId: 'xAxis' + key,
            yAxisId: 'yAxis' + key,
            type: seriesType,
            symbolSize: 10,
            symbol: 'circle',
            data: data.data3,
            label: {
                normal: {
                    show: true
                }
            },
            connectNulls: true,
            smooth: true
        }, patternsSeries[2])
    );
}

function makeValueGrid(option, patterns) {
    var data = makeValueData();
    var key = Math.random().toFixed(5);

    option.legend = option.legend || {
        tooltip: {show: true}
    };
    getArray(option.legend, 'data').push('line1' + key, 'line2' + key, 'line3' + key);

    var grid = extend({}, patterns.grid);
    grid.id = 'grid' + key;
    getArray(option, 'grid').push(grid);

    getArray(option, 'xAxis').push(extend({
        id: 'xAxis' + key,
        gridId: grid.id,
        type: 'value',
        splitArea: {
            show: true
        }
    }, patterns['xAxis']));

    getArray(option, 'yAxis').push(extend({
        id: 'yAxis' + key,
        gridId: grid.id,
        nameLocation: 'middle',
        nameGap: 40
    }, patterns['yAxis']));

    var patternsSeries = patterns.series || [];

    getArray(option, 'series').push(
        extend({
            id: 'scatter1-id' + key,
            name: 'scatter1' + key,
            xAxisId: 'xAxis' + key,
            yAxisId: 'yAxis' + key,
            type: 'scatter',
            symbolSize: 10,
            data: data.data1,
            smooth: true,
            connectNulls: true
        }, patternsSeries[0]),
        extend({
            id: 'scatter2-id' + key,
            name: 'scatter2' + key,
            xAxisId: 'xAxis' + key,
            yAxisId: 'yAxis' + key,
            type: 'scatter',
            symbolSize: 10,
            data: data.data2,
            connectNulls: true,
            smooth: true
        }, patternsSeries[1]),
        extend({
            id: 'scatter3-id' + key,
            name: 'scatter3' + key,
            xAxisId: 'xAxis' + key,
            yAxisId: 'yAxis' + key,
            type: 'scatter',
            symbolSize: 10,
            symbol: 'circle',
            data: data.data3,
            label: {
                normal: {
                    show: true,
                    textStyle: {color: '#333'}
                }
            },
            connectNulls: true,
            smooth: true
        }, patternsSeries[2])
    );
}


function makeTimeGrid(option, patterns) {
    var data = makeTimeData();
    var key = Math.random().toFixed(5);

    option.legend = option.legend || {
        tooltip: {show: true}
    };
    getArray(option.legend, 'data').push('scatter1' + key, 'scatter2' + key, 'scatter3' + key);

    var grid = extend({}, patterns.grid);
    grid.id = 'grid' + key;
    getArray(option, 'grid').push(grid);

    getArray(option, 'xAxis').push(extend({
        id: 'xAxis' + key,
        type: 'time',
        gridId: grid.id,
        splitArea: {
            show: true
        }
    }, patterns['xAxis']));

    getArray(option, 'yAxis').push(extend({
        id: 'yAxis' + key,
        gridId: grid.id,
        nameLocation: 'middle',
        nameGap: 40
    }, patterns['yAxis']));

    var patternsSeries = patterns.series || [];

    getArray(option, 'series').push(
        extend({
            id: 'scatter1-id' + key,
            name: 'scatter1' + key,
            xAxisId: 'xAxis' + key,
            yAxisId: 'yAxis' + key,
            type: 'line',
            symbolSize: 5,
            label: {
                emphasis: {
                    show: true,
                    textStyle: {
                        color: '#333'
                    }
                }
            },
            data: data.data1,
            smooth: true,
            connectNulls: true
        }, patternsSeries[0]),
        extend({
            id: 'scatter2-id' + key,
            name: 'scatter2' + key,
            xAxisId: 'xAxis' + key,
            yAxisId: 'yAxis' + key,
            type: 'line',
            symbolSize: 5,
            label: {
                emphasis: {
                    show: true,
                    textStyle: {
                        color: '#333'
                    }
                }
            },
            data: data.data2,
            connectNulls: true,
            smooth: true
        }, patternsSeries[1]),
        extend({
            id: 'scatter3-id' + key,
            name: 'scatter3' + key,
            xAxisId: 'xAxis' + key,
            yAxisId: 'yAxis' + key,
            type: 'line',
            symbolSize: 5,
            symbol: 'circle',
            data: data.data3,
            label: {
                emphasis: {
                    show: true,
                    textStyle: {
                        color: '#333'
                    }
                }
            },
            connectNulls: true,
            smooth: true
        }, patternsSeries[2])
    );
}

function makeCategoryCartesian(option, patterns, xAxisIndex, yAxisIndex, scale, catePrefix) {
    var data = makeCategoryData(scale, catePrefix);
    var key = Math.random().toFixed(5);

    var axisColors = [
        '#2f4554', '#c23531', '#61a0a8', '#d48265', '#91c7ae', '#749f83', '#ca8622', '#bda29a','#6e7074', '#546570', '#c4ccd3'
    ];
    if (option.___test_axisColorIndex == null) {
        option.___test_axisColorIndex = 0;
    }

    option.legend = option.legend || {
        tooltip: {show: true}
    };
    getArray(option.legend, 'data').push('line1' + key, 'line2' + key, 'line3' + key);

    var xAxes = getArray(option, 'xAxis');
    var yAxes = getArray(option, 'yAxis');

    if (!xAxes[xAxisIndex]) {
        xAxes[xAxisIndex] = extend({
            data: data.categoryData,
            boundaryGap: false,
            splitArea: {
                show: true
            },
            axisLine: {
                lineStyle: {
                    color: axisColors[option.___test_axisColorIndex++]
                }
            }
        }, patterns['xAxis']);
    }
    if (!yAxes[yAxisIndex]) {
        yAxes[yAxisIndex] = extend({
            nameLocation: 'middle',
            nameGap: 40,
            axisLine: {
                lineStyle: {
                    color: axisColors[option.___test_axisColorIndex++]
                }
            }
        }, patterns['yAxis']);
    }

    var patternsSeries = patterns.series || [];

    getArray(option, 'series').push(
        extend({
            id: 'line1-id' + key,
            name: 'line1' + key,
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            type: 'line',
            symbolSize: 10,
            itemStyle: {
                normal: {
                    color: yAxes[yAxisIndex].axisLine.lineStyle.color
                }
            },
            data: data.data1,
            smooth: true,
            connectNulls: true
        }, patternsSeries[0]),
        extend({
            id: 'line2-id' + key,
            name: 'line2' + key,
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            itemStyle: {
                normal: {
                    color: yAxes[yAxisIndex].axisLine.lineStyle.color
                }
            },
            type: 'line',
            symbolSize: 10,
            data: data.data2,
            connectNulls: true,
            smooth: true
        }, patternsSeries[1])
    );
}
