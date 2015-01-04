define('echarts/chart/eventRiver', [
    'require',
    '../component/base',
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
    var ComponentBase = require('../component/base');
    var ChartBase = require('./base');
    var eventRiverLayout = require('../layout/eventRiver');
    var PolygonShape = require('zrender/shape/Polygon');
    require('../component/axis');
    require('../component/grid');
    require('../component/dataZoom');
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var ecDate = require('../util/date');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    function EventRiver(ecTheme, messageCenter, zr, option, myChart) {
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        ChartBase.call(this);
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
                    for (var j = 0, jLen = series[i].eventList.length; j < jLen; j++) {
                        evolutionList = series[i].eventList[j].evolution;
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
                    for (var j = 0; j < series[i].eventList.length; j++) {
                        this._drawEventBubble(series[i].eventList[j], i, j);
                    }
                }
            }
        },
        _drawEventBubble: function (oneEvent, seriesIndex, dataIndex) {
            var series = this.series;
            var serie = series[seriesIndex];
            var serieName = serie.name || '';
            var data = serie.eventList[dataIndex];
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
                zlevel: this._zlevelBase,
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
            ecData.pack(eventBubbleShape, series[seriesIndex], seriesIndex, series[seriesIndex].eventList[dataIndex], dataIndex, series[seriesIndex].eventList[dataIndex].name);
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
    zrUtil.inherits(EventRiver, ComponentBase);
    require('../chart').define('eventRiver', EventRiver);
    return EventRiver;
});define('echarts/layout/eventRiver', ['require'], function (require) {
    function eventRiverLayout(series, intervalX, area) {
        var space = 5;
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
            for (var j = 0; j < series[i].eventList.length; j++) {
                if (series[i].eventList[j].weight == null) {
                    series[i].eventList[j].weight = 1;
                }
                var importance = 0;
                for (var k = 0; k < series[i].eventList[j].evolution.length; k++) {
                    importance += series[i].eventList[j].evolution[k].valueScale;
                }
                series[i].eventList[j].importance = importance * series[i].eventList[j].weight;
            }
            series[i].eventList.sort(importanceSort);
        }
        for (var i = 0; i < series.length; i++) {
            if (series[i].weight == null) {
                series[i].weight = 1;
            }
            var importance = 0;
            for (var j = 0; j < series[i].eventList.length; j++) {
                importance += series[i].eventList[j].weight;
            }
            series[i].importance = importance * series[i].weight;
        }
        series.sort(importanceSort);
        var minTime = Number.MAX_VALUE;
        var maxTime = 0;
        for (var i = 0; i < series.length; i++) {
            for (var j = 0; j < series[i].eventList.length; j++) {
                for (var k = 0; k < series[i].eventList[j].evolution.length; k++) {
                    var time = series[i].eventList[j].evolution[k].timeScale;
                    minTime = Math.min(minTime, time);
                    maxTime = Math.max(maxTime, time);
                }
            }
        }
        var root = segmentTreeBuild(Math.floor(minTime), Math.ceil(maxTime));
        var totalMaxY = 0;
        for (var i = 0; i < series.length; i++) {
            for (var j = 0; j < series[i].eventList.length; j++) {
                var e = series[i].eventList[j];
                e.time = [];
                e.value = [];
                for (var k = 0; k < series[i].eventList[j].evolution.length; k++) {
                    e.time.push(series[i].eventList[j].evolution[k].timeScale);
                    e.value.push(series[i].eventList[j].evolution[k].valueScale);
                }
                var mxIndex = indexOf(e.value, Math.max.apply(Math, e.value));
                var maxY = segmentTreeQuery(root, e.time[mxIndex], e.time[mxIndex + 1]);
                var k = 0;
                e.y = maxY + e.value[mxIndex] / 2 + space;
                for (k = 0; k < e.time.length - 1; k++) {
                    var curMaxY = segmentTreeQuery(root, e.time[k], e.time[k + 1]);
                    if (e.y - e.value[k] / 2 - space < curMaxY) {
                        e.y = curMaxY + e.value[k] / 2 + space;
                    }
                }
                var curMaxY = segmentTreeQuery(root, e.time[k], e.time[k] + scale);
                if (e.y - e.value[k] / 2 - space < curMaxY) {
                    e.y = curMaxY + e.value[k] / 2 + space;
                }
                series[i].y = e.y;
                totalMaxY = Math.max(totalMaxY, e.y + e.value[mxIndex] / 2);
                for (k = 0; k < e.time.length - 1; k++) {
                    segmentTreeInsert(root, e.time[k], e.time[k + 1], e.y + e.value[k] / 2);
                }
                segmentTreeInsert(root, e.time[k], e.time[k] + scale, e.y + e.value[k] / 2);
            }
        }
        scaleY(series, area, totalMaxY, space);
    }
    function scaleY(series, area, maxY, space) {
        var yBase = area.y;
        var yScale = (area.height - space) / maxY;
        for (var i = 0; i < series.length; i++) {
            series[i].y = series[i].y * yScale + yBase;
            var eventList = series[i].eventList;
            for (var j = 0; j < eventList.length; j++) {
                eventList[j].y = eventList[j].y * yScale + yBase;
                var evolutionList = eventList[j].evolution;
                for (var k = 0; k < evolutionList.length; k++) {
                    evolutionList[k].valueScale *= yScale * 1;
                }
            }
        }
    }
    function segmentTreeBuild(left, right) {
        var root = {
            'left': left,
            'right': right,
            'leftChild': null,
            'rightChild': null,
            'maxValue': 0
        };
        if (left + 1 < right) {
            var mid = Math.round((left + right) / 2);
            root.leftChild = segmentTreeBuild(left, mid);
            root.rightChild = segmentTreeBuild(mid, right);
        }
        return root;
    }
    function segmentTreeQuery(root, left, right) {
        if (right - left < 1) {
            return 0;
        }
        var mid = Math.round((root.left + root.right) / 2);
        var result = 0;
        if (left == root.left && right == root.right) {
            result = root.maxValue;
        } else if (right <= mid && root.leftChild != null) {
            result = segmentTreeQuery(root.leftChild, left, right);
        } else if (left >= mid && root.rightChild != null) {
            result = segmentTreeQuery(root.rightChild, left, right);
        } else {
            var leftValue = 0;
            var rightValue = 0;
            if (root.leftChild != null) {
                leftValue = segmentTreeQuery(root.leftChild, left, mid);
            }
            if (root.rightChild != null) {
                rightValue = segmentTreeQuery(root.rightChild, mid, right);
            }
            result = leftValue > rightValue ? leftValue : rightValue;
        }
        return result;
    }
    function segmentTreeInsert(root, left, right, value) {
        if (root == null) {
            return;
        }
        var mid = Math.round((root.left + root.right) / 2);
        root.maxValue = root.maxValue > value ? root.maxValue : value;
        if (Math.floor(left * 10) == Math.floor(root.left * 10) && Math.floor(right * 10) == Math.floor(root.right * 10)) {
            return;
        } else if (right <= mid) {
            segmentTreeInsert(root.leftChild, left, right, value);
        } else if (left >= mid) {
            segmentTreeInsert(root.rightChild, left, right, value);
        } else {
            segmentTreeInsert(root.leftChild, left, mid, value);
            segmentTreeInsert(root.rightChild, mid, right, value);
        }
    }
    return eventRiverLayout;
});