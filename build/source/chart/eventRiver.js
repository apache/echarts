define('echarts/chart/eventRiver', [
    'require',
    './base',
    '../layout/eventRiver',
    'zrender/shape/Polygon',
    '../component/axis',
    '../component/grid',
    '../component/dataZoom',
    '../config',
    '../util/ecData',
    '../util/date',
    'zrender/tool/util',
    'zrender/tool/color',
    '../chart'
], function (require) {
    var ChartBase = require('./base');
    var eventRiverLayout = require('../layout/eventRiver');
    var PolygonShape = require('zrender/shape/Polygon');
    require('../component/axis');
    require('../component/grid');
    require('../component/dataZoom');
    var ecConfig = require('../config');
    ecConfig.eventRiver = {
        zlevel: 0,
        z: 2,
        clickable: true,
        legendHoverLink: true,
        itemStyle: {
            normal: {
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 1,
                label: {
                    show: true,
                    position: 'inside',
                    formatter: '{b}'
                }
            },
            emphasis: {
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 1,
                label: { show: true }
            }
        }
    };
    var ecData = require('../util/ecData');
    var ecDate = require('../util/date');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    function EventRiver(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        var self = this;
        self._ondragend = function () {
            self.isDragend = true;
        };
        this.refresh(option);
    }
    EventRiver.prototype = {
        type: ecConfig.CHART_TYPE_EVENTRIVER,
        _buildShape: function () {
            var series = this.series;
            this.selectedMap = {};
            this._dataPreprocessing();
            var legend = this.component.legend;
            var eventRiverSeries = [];
            for (var i = 0; i < series.length; i++) {
                if (series[i].type === this.type) {
                    series[i] = this.reformOption(series[i]);
                    this.legendHoverLink = series[i].legendHoverLink || this.legendHoverLink;
                    var serieName = series[i].name || '';
                    this.selectedMap[serieName] = legend ? legend.isSelected(serieName) : true;
                    if (!this.selectedMap[serieName]) {
                        continue;
                    }
                    this.buildMark(i);
                    eventRiverSeries.push(this.series[i]);
                }
            }
            eventRiverLayout(eventRiverSeries, this._intervalX, this.component.grid.getArea());
            this._drawEventRiver();
            this.addShapeList();
        },
        _dataPreprocessing: function () {
            var series = this.series;
            var xAxis;
            var evolutionList;
            for (var i = 0, iLen = series.length; i < iLen; i++) {
                if (series[i].type === this.type) {
                    xAxis = this.component.xAxis.getAxis(series[i].xAxisIndex || 0);
                    for (var j = 0, jLen = series[i].data.length; j < jLen; j++) {
                        evolutionList = series[i].data[j].evolution;
                        for (var k = 0, kLen = evolutionList.length; k < kLen; k++) {
                            evolutionList[k].timeScale = xAxis.getCoord(ecDate.getNewDate(evolutionList[k].time) - 0);
                            evolutionList[k].valueScale = Math.pow(evolutionList[k].value, 0.8);
                        }
                    }
                }
            }
            this._intervalX = Math.round(this.component.grid.getWidth() / 40);
        },
        _drawEventRiver: function () {
            var series = this.series;
            for (var i = 0; i < series.length; i++) {
                var serieName = series[i].name || '';
                if (series[i].type === this.type && this.selectedMap[serieName]) {
                    for (var j = 0; j < series[i].data.length; j++) {
                        this._drawEventBubble(series[i].data[j], i, j);
                    }
                }
            }
        },
        _drawEventBubble: function (oneEvent, seriesIndex, dataIndex) {
            var series = this.series;
            var serie = series[seriesIndex];
            var serieName = serie.name || '';
            var data = serie.data[dataIndex];
            var queryTarget = [
                data,
                serie
            ];
            var legend = this.component.legend;
            var defaultColor = legend ? legend.getColor(serieName) : this.zr.getColor(seriesIndex);
            var normal = this.deepMerge(queryTarget, 'itemStyle.normal') || {};
            var emphasis = this.deepMerge(queryTarget, 'itemStyle.emphasis') || {};
            var normalColor = this.getItemStyleColor(normal.color, seriesIndex, dataIndex, data) || defaultColor;
            var emphasisColor = this.getItemStyleColor(emphasis.color, seriesIndex, dataIndex, data) || (typeof normalColor === 'string' ? zrColor.lift(normalColor, -0.2) : normalColor);
            var pts = this._calculateControlPoints(oneEvent);
            var eventBubbleShape = {
                zlevel: serie.zlevel,
                z: serie.z,
                clickable: this.deepQuery(queryTarget, 'clickable'),
                style: {
                    pointList: pts,
                    smooth: 'spline',
                    brushType: 'both',
                    lineJoin: 'round',
                    color: normalColor,
                    lineWidth: normal.borderWidth,
                    strokeColor: normal.borderColor
                },
                highlightStyle: {
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor
                },
                draggable: 'vertical',
                ondragend: this._ondragend
            };
            eventBubbleShape = new PolygonShape(eventBubbleShape);
            this.addLabel(eventBubbleShape, serie, data, oneEvent.name);
            ecData.pack(eventBubbleShape, series[seriesIndex], seriesIndex, series[seriesIndex].data[dataIndex], dataIndex, series[seriesIndex].data[dataIndex].name);
            this.shapeList.push(eventBubbleShape);
        },
        _calculateControlPoints: function (oneEvent) {
            var intervalX = this._intervalX;
            var posY = oneEvent.y;
            var evolution = oneEvent.evolution;
            var n = evolution.length;
            if (n < 1) {
                return;
            }
            var time = [];
            var value = [];
            for (var i = 0; i < n; i++) {
                time.push(evolution[i].timeScale);
                value.push(evolution[i].valueScale);
            }
            var pts = [];
            pts.push([
                time[0],
                posY
            ]);
            var i = 0;
            for (i = 0; i < n - 1; i++) {
                pts.push([
                    (time[i] + time[i + 1]) / 2,
                    value[i] / -2 + posY
                ]);
            }
            pts.push([
                (time[i] + (time[i] + intervalX)) / 2,
                value[i] / -2 + posY
            ]);
            pts.push([
                time[i] + intervalX,
                posY
            ]);
            pts.push([
                (time[i] + (time[i] + intervalX)) / 2,
                value[i] / 2 + posY
            ]);
            for (i = n - 1; i > 0; i--) {
                pts.push([
                    (time[i] + time[i - 1]) / 2,
                    value[i - 1] / 2 + posY
                ]);
            }
            return pts;
        },
        ondragend: function (param, status) {
            if (!this.isDragend || !param.target) {
                return;
            }
            status.dragOut = true;
            status.dragIn = true;
            status.needRefresh = false;
            this.isDragend = false;
        },
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            this.backupShapeList();
            this._buildShape();
        }
    };
    zrUtil.inherits(EventRiver, ChartBase);
    require('../chart').define('eventRiver', EventRiver);
    return EventRiver;
});define('echarts/layout/eventRiver', ['require'], function (require) {
    function eventRiverLayout(series, intervalX, area) {
        var space = 4;
        var scale = intervalX;
        function importanceSort(a, b) {
            var x = a.importance;
            var y = b.importance;
            return x > y ? -1 : x < y ? 1 : 0;
        }
        function indexOf(array, value) {
            if (array.indexOf) {
                return array.indexOf(value);
            }
            for (var i = 0, len = array.length; i < len; i++) {
                if (array[i] === value) {
                    return i;
                }
            }
            return -1;
        }
        for (var i = 0; i < series.length; i++) {
            for (var j = 0; j < series[i].data.length; j++) {
                if (series[i].data[j].weight == null) {
                    series[i].data[j].weight = 1;
                }
                var importance = 0;
                for (var k = 0; k < series[i].data[j].evolution.length; k++) {
                    importance += series[i].data[j].evolution[k].valueScale;
                }
                series[i].data[j].importance = importance * series[i].data[j].weight;
            }
            series[i].data.sort(importanceSort);
        }
        for (var i = 0; i < series.length; i++) {
            if (series[i].weight == null) {
                series[i].weight = 1;
            }
            var importance = 0;
            for (var j = 0; j < series[i].data.length; j++) {
                importance += series[i].data[j].weight;
            }
            series[i].importance = importance * series[i].weight;
        }
        series.sort(importanceSort);
        var minTime = Number.MAX_VALUE;
        var maxTime = 0;
        for (var i = 0; i < series.length; i++) {
            for (var j = 0; j < series[i].data.length; j++) {
                for (var k = 0; k < series[i].data[j].evolution.length; k++) {
                    var time = series[i].data[j].evolution[k].timeScale;
                    minTime = Math.min(minTime, time);
                    maxTime = Math.max(maxTime, time);
                }
            }
        }
        minTime = ~~minTime;
        maxTime = ~~maxTime;
        var flagForOffset = function () {
            var length = maxTime - minTime + 1 + ~~intervalX;
            if (length <= 0) {
                return [0];
            }
            var result = [];
            while (length--) {
                result.push(0);
            }
            return result;
        }();
        var flagForPos = flagForOffset.slice(0);
        var bubbleData = [];
        var totalMaxy = 0;
        var totalOffset = 0;
        for (var i = 0; i < series.length; i++) {
            for (var j = 0; j < series[i].data.length; j++) {
                var e = series[i].data[j];
                e.time = [];
                e.value = [];
                var tmp;
                var maxy = 0;
                for (var k = 0; k < series[i].data[j].evolution.length; k++) {
                    tmp = series[i].data[j].evolution[k];
                    e.time.push(tmp.timeScale);
                    e.value.push(tmp.valueScale);
                    maxy = Math.max(maxy, tmp.valueScale);
                }
                bubbleBound(e, intervalX, minTime);
                e.y = findLocation(flagForPos, e, function (e, index) {
                    return e.ypx[index];
                });
                e._offset = findLocation(flagForOffset, e, function () {
                    return space;
                });
                totalMaxy = Math.max(totalMaxy, e.y + maxy);
                totalOffset = Math.max(totalOffset, e._offset);
                bubbleData.push(e);
            }
        }
        scaleY(bubbleData, area, totalMaxy, totalOffset);
    }
    function scaleY(bubbleData, area, maxY, offset) {
        var height = area.height;
        var offsetScale = offset / height > 0.5 ? 0.5 : 1;
        var yBase = area.y;
        var yScale = (area.height - offset) / maxY;
        for (var i = 0, length = bubbleData.length; i < length; i++) {
            var e = bubbleData[i];
            e.y = yBase + yScale * e.y + e._offset * offsetScale;
            delete e.time;
            delete e.value;
            delete e.xpx;
            delete e.ypx;
            delete e._offset;
            var evolutionList = e.evolution;
            for (var k = 0, klen = evolutionList.length; k < klen; k++) {
                evolutionList[k].valueScale *= yScale;
            }
        }
    }
    function line(x0, y0, x1, y1) {
        if (x0 === x1) {
            throw new Error('x0 is equal with x1!!!');
        }
        if (y0 === y1) {
            return function () {
                return y0;
            };
        }
        var k = (y0 - y1) / (x0 - x1);
        var b = (y1 * x0 - y0 * x1) / (x0 - x1);
        return function (x) {
            return k * x + b;
        };
    }
    function bubbleBound(e, intervalX, minX) {
        var space = ~~intervalX;
        var length = e.time.length;
        e.xpx = [];
        e.ypx = [];
        var i = 0;
        var x0 = 0;
        var x1 = 0;
        var y0 = 0;
        var y1 = 0;
        var newline;
        for (; i < length; i++) {
            x0 = ~~e.time[i];
            y0 = e.value[i] / 2;
            if (i === length - 1) {
                x1 = x0 + space;
                y1 = 0;
            } else {
                x1 = ~~e.time[i + 1];
                y1 = e.value[i + 1] / 2;
            }
            newline = line(x0, y0, x1, y1);
            for (var x = x0; x < x1; x++) {
                e.xpx.push(x - minX);
                e.ypx.push(newline(x));
            }
        }
        e.xpx.push(x1 - minX);
        e.ypx.push(y1);
    }
    function findLocation(flags, e, yvalue) {
        var pos = 0;
        var length = e.xpx.length;
        var i = 0;
        var y;
        for (; i < length; i++) {
            y = yvalue(e, i);
            pos = Math.max(pos, y + flags[e.xpx[i]]);
        }
        for (i = 0; i < length; i++) {
            y = yvalue(e, i);
            flags[e.xpx[i]] = pos + y;
        }
        return pos;
    }
    return eventRiverLayout;
});