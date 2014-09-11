/**
 * echarts图表类：chord diagram
 *
 * @author pissang (https://github.com/pissang/)
 *
 */

define(function (require) {
    'use strict';
    
    var ComponentBase = require('../component/base');
    var ChartBase = require('./base');
    
    // 图形依赖
    var TextShape = require('zrender/shape/Text');
    var LineShape = require('zrender/shape/Line');
    var SectorShape = require('zrender/shape/Sector');
    var RibbonShape = require('../util/shape/Ribbon');
    
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var vec2 = require('zrender/tool/vector');
    var NDArray = require('../util/ndarray');
    
    var _devicePixelRatio = window.devicePixelRatio || 1;
    
    function Chord(ecTheme, messageCenter, zr, option, myChart) {
        // 基类
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        // 图表基类
        ChartBase.call(this);

        this.refresh(option);
    }
    
    Chord.prototype = {
        type: ecConfig.CHART_TYPE_CHORD,
        /**
         * 绘制图形
         */
        _buildShape: function () {
            var series = this.series;
            this.selectedMap = {};
            this.chordSeries = [];
            this.chordSerieSample = null;
            var matrix = [];
            var serieNumber = 0;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === this.type) {
                    // Use the config of first chord serie
                    if (!this.chordSerieSample) {
                        this.chordSerieSample = series[i];
                        this.reformOption(this.chordSerieSample);
                    }

                    var _isSelected = this.isSelected(series[i].name);
                    // Filter by selected serie
                    this.selectedMap[series[i].name] = _isSelected;
                    if (!_isSelected) {
                        continue;
                    }
                    this.chordSeries.push(series[i]);
                    this.buildMark(i);
                    matrix.push(series[i].matrix);
                    serieNumber++;
                }
            }
            if (!this.chordSerieSample) {
                return;
            }
            if (!this.chordSeries.length) {
                this.addShapeList();
                return;
            }

            var zrWidth = this.zr.getWidth();
            var zrHeight = this.zr.getHeight();
            var zrSize = Math.min(zrWidth, zrHeight);

            this.groups = this.chordSerieSample.data;
            this.startAngle = this.chordSerieSample.startAngle;
            // Constrain to [0, 360]
            this.startAngle = this.startAngle % 360;
            if (this.startAngle < 0) {
                this.startAngle = this.startAngle + 360;
            }
            this.clockWise = this.chordSerieSample.clockWise;
            this.innerRadius = this.parsePercent(
                this.chordSerieSample.radius[0],
                zrSize / 2
            );
            this.outerRadius = this.parsePercent(
                this.chordSerieSample.radius[1],
                zrSize / 2
            );
            this.padding = this.chordSerieSample.padding;
            this.sortGroups = this.chordSerieSample.sort;
            this.sortSubGroups = this.chordSerieSample.sortSub;
            this.showScale = this.chordSerieSample.showScale;
            this.showScaleText = this.chordSerieSample.showScaleText;
            this.center = [
                this.parsePercent(this.chordSerieSample.center[0], zrWidth),
                this.parsePercent(this.chordSerieSample.center[1], zrHeight)
            ];
            var fixSize = 
                this.chordSerieSample.itemStyle.normal.chordStyle.lineStyle.width -
                this.chordSerieSample.itemStyle.normal.lineStyle.width;
            this.strokeFix = 
                (fixSize / _devicePixelRatio) / this.innerRadius / Math.PI * 180;


            this.dataMat = new NDArray(matrix);
            this.dataMat = this.dataMat._transposelike([1, 2, 0]);

            // Filter the data by selected legend
            var res = this._filterData(this.dataMat, this.groups);
            this.dataMat = res[0];
            this.groups = res[1];

            // Check if data is valid
            var shape = this.dataMat.shape();
            if (shape[0] !== shape[1] || shape[0] !== this.groups.length) {
                throw new Error('Data not valid');
            }
            if (shape[0] === 0 || shape[2] === 0) {
                this.addShapeList();
                return;
            }

            // Down to 2 dimension
            // More convenient for angle calculating and sort
            this.dataMat.reshape(shape[0], shape[1] * shape[2]);

            // Processing data
            var sumOut = this.dataMat.sum(1);
            var percents = sumOut.mul(1 / sumOut.sum());

            var groupNumber = shape[0];
            var subGroupNumber = shape[1] * shape[2];

            var groupAngles = percents.mul(360 - this.padding * groupNumber);
            var subGroupAngles = this.dataMat.div(
                this.dataMat.sum(1).reshape(groupNumber, 1)
            );
            subGroupAngles = subGroupAngles.mul(
                groupAngles.sub(this.strokeFix * 2).reshape(groupNumber, 1)
            );

            switch (this.sortGroups) {
                case 'ascending':
                case 'descending':
                    var groupIndices = groupAngles
                            .argsort(0, this.sortGroups);
                    groupAngles['sort'](0, this.sortGroups);
                    sumOut['sort'](0, this.sortGroups);
                    break;
                default:
                    var groupIndices = NDArray.range(shape[0]);
            }

            switch (this.sortSubGroups) {
                case 'ascending':
                case 'descending':
                    var subGroupIndices = subGroupAngles
                            .argsort(1, this.sortSubGroups);
                    subGroupAngles['sort'](1, this.sortSubGroups);
                    break;
                default:
                    var subGroupIndices = NDArray
                            .range(subGroupNumber)
                            .reshape(1, subGroupNumber)
                            .repeat(groupNumber, 0);
            }

            var groupIndicesArr = groupIndices.toArray();
            var groupAnglesArr = groupAngles.toArray();
            var subGroupIndicesArr = subGroupIndices.toArray();
            var subGroupAnglesArr = subGroupAngles.toArray();
            var sumOutArray = sumOut.toArray();

            var sectorAngles = [];
            var chordAngles = new NDArray(
                groupNumber, subGroupNumber
            ).toArray();
            var values = [];
            var start = 0;
            var end = 0;
            for (var i = 0; i < groupNumber; i++) {
                var sortedIdx = groupIndicesArr[i];
                values[sortedIdx] = sumOutArray[i];

                end = start + groupAnglesArr[i];
                sectorAngles[sortedIdx] = [start, end];

                // Sub Group
                var subStart = start + this.strokeFix;
                var subEnd = subStart;
                for (var j = 0; j < subGroupNumber; j++) {
                    subEnd = subStart + subGroupAnglesArr[sortedIdx][j];
                    var subSortedIndex = subGroupIndicesArr[sortedIdx][j];
                    /*jshint maxlen : 200*/
                    chordAngles[sortedIdx][subSortedIndex]
                        = [subStart, subEnd];
                    subStart = subEnd;
                }

                start = end + this.padding;
            }

            // reset data
            this.chordShapes = new NDArray(groupNumber, groupNumber, serieNumber)
                                .toArray();
            this.sectorShapes = [];

            this._buildSectors(sectorAngles, values);

            chordAngles = new NDArray(chordAngles).reshape(
                groupNumber, groupNumber, serieNumber, 2
            ).toArray();
            this._buildChords(chordAngles, this.dataMat.reshape(shape).toArray());

            var res = this.normalizeValue(values);
            if (this.showScale) {
                this._buildScales(
                    res[0],
                    res[1],
                    sectorAngles,
                    new NDArray(res[0]).sum() / (360 - this.padding * groupNumber)
                );
            }
            
            this.addShapeList();
        },

        _filterData: function  (dataMat, groups) {
            var indices = [];
            var groupsFilted = [];
            // Filter by selected group
            for (var i = 0; i < groups.length; i++) {
                var name = groups[i].name;
                this.selectedMap[name] = this.isSelected(name);
                if (!this.selectedMap[name]) {
                    indices.push(i);
                } else {
                    groupsFilted.push(groups[i]);
                }
            }
            if (indices.length) {
                dataMat = dataMat['delete'](indices, 0);
                dataMat = dataMat['delete'](indices, 1);   
            }
            if (!dataMat.size()) {
                return [dataMat, groupsFilted];
            }
            // Empty data also need to be removed
            indices = [];
            var groupsFilted2 = [];
            var shape = dataMat.shape();
            dataMat.reshape(shape[0], shape[1] * shape[2]);
            var sumOutArray = dataMat.sum(1).toArray();
            dataMat.reshape(shape);
            for (var i = 0; i < groupsFilted.length; i++) {
                if (sumOutArray[i] === 0) {
                    indices.push(i);
                } else {
                    groupsFilted2.push(groupsFilted[i]);
                }
            }
            if (indices.length) {
                dataMat = dataMat['delete'](indices, 0);
                dataMat = dataMat['delete'](indices, 1);
            }

            return [dataMat, groupsFilted2];
        },

        _buildSectors: function (angles, data) {
            var len = this.groups.length;
            var len2 = this.chordSeries.length;

            var timeout;

            var showLabel = this.query(
                this.chordSerieSample, 'itemStyle.normal.label.show'
            );
            var labelColor = this.query(
                this.chordSerieSample, 'itemStyle.normal.label.color'
            );
            var rotateLabel = this.query(
                this.chordSerieSample, 'itemStyle.normal.label.rotate'
            );
            var labelDistance = this.query(
                this.chordSerieSample, 'itemStyle.normal.label.distance'
            );

            var self = this;
            function createMouseOver(idx) {
                return function () {
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    timeout = setTimeout(function (){
                        for (var i = 0; i < len; i++) {
                            self.sectorShapes[i].style.opacity 
                                = i === idx ? 1 : 0.1;
                            self.zr.modShape(self.sectorShapes[i].id);

                            for (var j = 0; j < len; j++) {
                                for (var k = 0; k < len2; k++) {
                                    var chordShape = self.chordShapes[i][j][k];
                                    if (chordShape) {
                                        chordShape.style.opacity 
                                            = (i === idx || j === idx)
                                                 ? 0.5 : 0.03;
                                        self.zr.modShape(chordShape.id);
                                    }
                                }
                            }
                        }
                        self.zr.refresh();
                    }, 50);
                };
            }

            function createMouseOut() {
                return function () {
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    timeout = setTimeout(function (){
                        for (var i = 0; i < len; i++) {
                            self.sectorShapes[i].style.opacity = 1.0;
                            self.zr.modShape(self.sectorShapes[i].id);

                            for (var j = 0; j < len; j++) {
                                for (var k = 0; k < len2; k++) {
                                    var chordShape = self.chordShapes[i][j][k];
                                    if (chordShape) {
                                        chordShape.style.opacity = 0.5;
                                        self.zr.modShape(chordShape.id);
                                    } 
                                }
                            }
                        }
                        self.zr.refresh();
                    }, 50);
                };
            }

            for (var i = 0; i < len; i++) {
                var group = this.groups[i];
                var angle = angles[i];
                var _start = (this.clockWise ? (360 - angle[1]) : angle[0]) + this.startAngle;
                var _end = (this.clockWise ? (360 - angle[0]) : angle[1]) + this.startAngle;

                var sector = {
                    zlevel: this._zlevelBase,
                    style: {
                        x: this.center[0],
                        y: this.center[1],
                        r0: this.innerRadius,
                        r: this.outerRadius,
                        startAngle: _start,
                        endAngle: _end,
                        brushType: 'fill',
                        opacity: 1,
                        color: this.getColor(group.name)
                    },
                    clickable: this.chordSerieSample.clickable,
                    highlightStyle: {
                        brushType: 'fill'
                    }
                };
                sector.style.lineWidth = this.deepQuery(
                    [group, this.chordSerieSample],
                    'itemStyle.normal.lineStyle.width'
                );
                sector.highlightStyle.lineWidth = this.deepQuery(
                    [group, this.chordSerieSample],
                    'itemStyle.emphasis.lineStyle.width'
                );
                sector.style.strokeColor = this.deepQuery(
                    [group, this.chordSerieSample],
                    'itemStyle.normal.lineStyle.color'
                );
                sector.highlightStyle.strokeColor = this.deepQuery(
                    [group, this.chordSerieSample],
                    'itemStyle.emphasis.lineStyle.color'
                );
                if (sector.style.lineWidth > 0) {
                    sector.style.brushType = 'both';
                }
                if (sector.highlightStyle.lineWidth > 0) {
                    sector.highlightStyle.brushType = 'both';
                }
                ecData.pack(
                    sector,
                    this.chordSeries[0],
                    0,
                    data[i], i,
                    group.name
                );
                if (showLabel) {
                    var halfAngle = [_start + _end] / 2;
                    halfAngle %= 360;  // Constrain to [0,360]
                    var isRightSide = halfAngle <= 90
                                     || halfAngle >= 270;
                    halfAngle = halfAngle * Math.PI / 180;
                    var v = [Math.cos(halfAngle), -Math.sin(halfAngle)];

                    var distance = this.showScaleText ? 35 + labelDistance : labelDistance;
                    var start = vec2.scale([], v, this.outerRadius + distance);
                    vec2.add(start, start, this.center);

                    var labelShape = {
                        zlevel: this._zlevelBase - 1,
                        hoverable: false,
                        style: {
                            text: group.name,
                            textAlign: isRightSide ? 'left' : 'right',
                            color: labelColor
                        }
                    };
                    if (rotateLabel) {
                        labelShape.rotation = isRightSide ? halfAngle : Math.PI + halfAngle;
                        if (isRightSide) {
                            labelShape.style.x = this.outerRadius + distance;
                        } else {
                            labelShape.style.x = -this.outerRadius - distance;
                        }
                        labelShape.style.y = 0;
                        labelShape.position = this.center;
                    } else {
                        labelShape.style.x = start[0];
                        labelShape.style.y = start[1];
                    }
                    labelShape.style.textColor = this.deepQuery(
                        [group, this.chordSerieSample],
                        'itemStyle.normal.label.textStyle.color'
                    ) || '#fff';
                    labelShape.style.textFont = this.getFont(this.deepQuery(
                        [group, this.chordSerieSample],
                        'itemStyle.normal.label.textStyle'
                    ));
                    labelShape = new TextShape(labelShape);
                    this.shapeList.push(labelShape);
                }

                sector.onmouseover = createMouseOver(i);
                sector.onmouseout = createMouseOut();

                sector = new SectorShape(sector);
                this.shapeList.push(sector);
                this.sectorShapes.push(sector);
            }
        },

        _buildChords : function (angles, dataArr) {
            var len = angles.length;
            if (!len) {
                return;
            }
            var len2 = angles[0][0].length;

            var ribbonLineStyle 
                = this.chordSerieSample.itemStyle.normal.chordStyle.lineStyle;
            var ribbonLineStyleEmphsis
                = this.chordSerieSample.itemStyle.emphasis.chordStyle.lineStyle;

            for (var i = 0; i < len; i++) {
                for (var j = 0; j < len; j++) {
                    for (var k = 0; k < len2; k++) {
                        if (this.chordShapes[j][i][k]) {
                            continue;
                        }

                        var angleIJ0 = angles[i][j][k][0];
                        var angleJI0 = angles[j][i][k][0];

                        var angleIJ1 = angles[i][j][k][1];
                        var angleJI1 = angles[j][i][k][1];

                        if (
                            angleIJ0 - angleJI1 === 0
                            || angleJI0 - angleJI1 === 0
                        ) {
                            this.chordShapes[i][j][k] = null;
                            continue;
                        }

                        var color;
                        if (len2 === 1) {
                            if (angleIJ1 - angleIJ0 <= angleJI1 - angleJI0) {
                                color = this.getColor(this.groups[i].name);
                            } else {
                                color = this.getColor(this.groups[j].name);
                            }
                        } else {
                            color = this.getColor(this.chordSeries[k].name);
                        }
                        var s0 = !this.clockWise ? (360 - angleIJ1) : angleIJ0;
                        var s1 = !this.clockWise ? (360 - angleIJ0) : angleIJ1;
                        var t0 = !this.clockWise ? (360 - angleJI1) : angleJI0;
                        var t1 = !this.clockWise ? (360 - angleJI0) : angleJI1;
                        var chord = {
                            zlevel: this._zlevelBase,
                            style: {
                                x: this.center[0],
                                y: this.center[1],
                                r: this.innerRadius,
                                source0: s0 - this.startAngle,
                                source1: s1 - this.startAngle,
                                target0: t0 - this.startAngle,
                                target1: t1 - this.startAngle,
                                brushType: 'both',
                                opacity: 0.5,
                                color: color,
                                lineWidth: ribbonLineStyle.width,
                                strokeColor: ribbonLineStyle.color
                            },
                            clickable: this.chordSerieSample.clickable,
                            highlightStyle: {
                                brushType: 'both',
                                lineWidth: ribbonLineStyleEmphsis.width,
                                strokeColor: ribbonLineStyleEmphsis.color
                            }
                        };

                        ecData.pack(
                            chord,
                            this.chordSeries[k],
                            k,
                            dataArr[i][j][k], i + '-' +j,
                            this.groups[i].name,
                            this.groups[j].name,
                            dataArr[j][i][k]
                        );

                        chord = new RibbonShape(chord);
                        this.chordShapes[i][j][k] = chord;
                        this.shapeList.push(chord);
                    }
                }
            }
        },

        _buildScales : function (
            values,
            unitPostfix,
            angles,
            unitValue
        ) {
            for (var i = 0; i < angles.length; i++) {
                var subStartAngle = angles[i][0];
                var subEndAngle = angles[i][1];

                var scaleAngle = subStartAngle;
                while (scaleAngle < subEndAngle) {
                    var thelta = ((this.clockWise ? (360 - scaleAngle) : scaleAngle)
                                    + this.startAngle) / 180 * Math.PI;
                    var v = [
                        Math.cos(thelta),
                        -Math.sin(thelta)
                    ];
                    var start = vec2.scale([], v, this.outerRadius + 1);
                    vec2.add(start, start, this.center);
                    var end = vec2.scale([], v, this.outerRadius + this.scaleLineLength);
                    vec2.add(end, end, this.center);
                    var scaleShape = {
                        zlevel: this._zlevelBase - 1,
                        hoverable: false,
                        style: {
                            xStart: start[0],
                            yStart: start[1],
                            xEnd: end[0],
                            yEnd: end[1],
                            lineCap: 'round',
                            brushType: 'stroke',
                            strokeColor: '#666',
                            lineWidth: 1
                        }
                    };

                    scaleShape = new LineShape(scaleShape);
                    this.shapeList.push(scaleShape);

                    scaleAngle += this.scaleUnitAngle;
                }
                if (!this.showScaleText) {
                    continue;
                }

                var scaleTextAngle = subStartAngle;
                var step = unitValue * 5 * this.scaleUnitAngle;
                var scaleValues = NDArray.range(0, values[i], step).toArray();
                while (scaleTextAngle < subEndAngle) {
                    var thelta = this.clockWise 
                                    ? (360 - scaleTextAngle) : scaleTextAngle;
                    thelta = (thelta + this.startAngle) % 360;
                    var isRightSide = thelta <= 90
                                     || thelta >= 270;
                    var textShape = {
                        zlevel: this._zlevelBase - 1,
                        hoverable: false,
                        style: {
                            x: isRightSide 
                                    ? this.outerRadius + this.scaleLineLength + 4 
                                    : -this.outerRadius - this.scaleLineLength - 4,
                            y: 0,
                            text: Math.round(scaleValues.shift()*10)/10 
                                    + unitPostfix,
                            textAlign: isRightSide ? 'left' : 'right'
                        },
                        position: this.center.slice(),
                        rotation: isRightSide
                            ? [thelta / 180 * Math.PI, 0, 0]
                            : [
                                (thelta + 180) / 180 * Math.PI,
                                0, 0
                              ]
                    };

                    textShape = new TextShape(textShape);
                    this.shapeList.push(textShape);
                    scaleTextAngle += this.scaleUnitAngle * 5;
                }
            }
        },

        normalizeValue : function (values) {
            var result = [];
            var max = new NDArray(values).max();
            var unitPostfix, unitScale;
            if (max > 10000) {
                unitPostfix = 'k';
                unitScale = 1 / 1000;
            } else if (max > 10000000) {
                unitPostfix = 'm';
                unitScale = 1 / 1000000;
            } else if (max > 10000000000) {
                unitPostfix  = 'b';
                unitScale = 1 / 1000000000;
            } else {
                unitPostfix = '';
                unitScale = 1;
            }

            for (var i = 0; i < values.length; i++) {
                result[i] = values[i] * unitScale;
            }
            return [result, unitPostfix];
        },

        refresh : function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            
            // Config
            this.chordSeries = [];

            this.strokeFix = 0;
            // Adjacency matrix
            this.sectorShapes = [];
            this.chordShapes = [];
    
            this.scaleLineLength = 4;
            this.scaleUnitAngle = 4;
            
            this.legend = this.component.legend;
            if (this.legend) {
                this.getColor = function(param) {
                    return this.legend.getColor(param);
                };
                this.isSelected = function(param) {
                    return this.legend.isSelected(param);
                };
            } else {
                var colorIndices = {};
                var colorMap = {};
                var count = 0;
                this.getColor = function (key) {
                    if (colorMap[key]) {
                        return colorMap[key];
                    }
                    if (colorIndices[key] === undefined) {
                        colorIndices[key] = count++;
                    }
                    // key is serie name
                    for (var i = 0; i < this.chordSeries.length; i++) {
                        if (this.chordSeries[i].name === key) {
                            colorMap[key] = this.query(
                                this.chordSeries[i],
                                'itemStyle.normal.color'
                            );
                            break;
                        }
                    }
                    if (!colorMap[key]) {
                        var len = this.groups.length;
                        // key is group name
                        for (var i = 0; i < len; i++) {
                            if (this.groups[i].name === key) {
                                colorMap[key] = this.query(
                                    this.groups[i],
                                    'itemStyle.normal.color'
                                );
                                break;
                            }
                        }
                    }
                    if (!colorMap[key]) {
                        colorMap[key] = this.zr.getColor(colorIndices[key]);
                    }

                    return colorMap[key];
                };
                this.isSelected = function () {
                    return true;
                };
            }
            
            this.backupShapeList();
            this._buildShape();
        },

        reformOption : function (opt) {
            var _merge = zrUtil.merge;
            opt = _merge(
                      opt || {},
                      this.ecTheme.chord
                  );
            opt.itemStyle.normal.label.textStyle = _merge(
                opt.itemStyle.normal.label.textStyle || {},
                this.ecTheme.textStyle
            );
        }
    };
    
    zrUtil.inherits(Chord, ChartBase);
    zrUtil.inherits(Chord, ComponentBase);
    
    // 图表注册
    require('../chart').define('chord', Chord);

    return Chord;
});