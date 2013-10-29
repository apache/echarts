/**
 * echarts图表类：chord diagram
 *
 * @author pissang (https://github.com/pissang/)
 *
 */

define(function(require) {

    require('../util/shape/chord');

    'use strict';

    var _devicePixelRatio = window.devicePixelRatio || 1;
    
    function Chord(messageCenter, zr, option, component) {
        var self = this;

        var CompomentBase = require('../component/base');
        CompomentBase.call(this, zr);

        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrConfig = require('zrender/config');
        var zrEvent = require('zrender/tool/event');

        var zrUtil = require('zrender/tool/util');
        var vec2 = require('zrender/tool/vector');
        var NDArray = require('../util/ndarray');

        var legend = component.legend;
        var series;
        this.type = ecConfig.CHART_TYPE_CHORD;

        var _zlevelBase = self.getZlevelBase();

        // Config
        var chordSeries = [];
        var groups;
        var startAngle;
        var clockWise;
        var innerRadius;
        var outerRadius;
        var padding;
        var sortGroups;
        var sortSubGroups;
        var center;
        var showScale;
        var showScaleText;
        var showLabel;
        var labelColor;

        var strokeFix = 0;
        // Adjacency matrix
        var dataMat;

        var sectorShapes = [];
        var chordShapes = [];

        var scaleLineLength = 4;
        var scaleUnitAngle = 4;

        function _buildShape() {

            self.selectedMap = {};
            chordSeries = [];
            var chordSerieSample;
            var matrix = [];
            var serieNumber = 0;
            for (var i = 0, l = series.length; i < l; i++) {
                
                if (series[i].type === self.type) {
                    // Use the config of first chord serie
                    if (!chordSerieSample) {
                        chordSerieSample = series[i];
                        self.reformOption(chordSerieSample);
                    }

                    var isSelected = legend.isSelected(series[i].name);
                    // Filter by selected serie
                    self.selectedMap[series[i].name] = isSelected;
                    if (!isSelected) {
                        continue;
                    }
                    chordSeries.push(series[i]);
                    matrix.push(series[i].matrix);
                    serieNumber++;
                }
            }
            if (!chordSerieSample) {
                return;
            }

            groups = chordSerieSample.data;
            startAngle = chordSerieSample.startAngle;
            // Constrain to [0, 360]
            startAngle = startAngle % 360;
            if (startAngle < 0) {
                startAngle = startAngle + 360;
            }
            clockWise = chordSerieSample.clockWise;
            innerRadius = chordSerieSample.radius[0];
            outerRadius = chordSerieSample.radius[1];
            padding = chordSerieSample.padding;
            sortGroups = chordSerieSample.sort;
            sortSubGroups = chordSerieSample.sortSub;
            showScale = chordSerieSample.showScale;
            showScaleText = chordSerieSample.showScaleText;
            center = self.calAbsolute(chordSerieSample.center);
            showLabel = self.deepQuery(
                [chordSerieSample], 'itemStyle.normal.label.show'
            );
            labelColor = self.deepQuery(
                [chordSerieSample], 'itemStyle.normal.label.color'
            );
            // Supporse the line width is 1;
            strokeFix = (1 / _devicePixelRatio) / innerRadius / Math.PI * 180;


            dataMat = new NDArray(matrix);
            dataMat = dataMat._transposelike([1, 2, 0]);

            // Filter the data by selected legend
            res = _filterData(dataMat, groups);
            dataMat = res[0];
            groups = res[1];

            // Check if data is valid
            var shape = dataMat.shape();
            if (shape[0] !== shape[1] || shape[0] !== groups.length) {
                throw new Error('Data not valid');
            }

            // Down to 2 dimension
            // More convenient for angle calculating and sort
            dataMat.reshape(shape[0], shape[1] * shape[2]);

            // Processing data
            var sumOut = dataMat.sum(1);
            switch (sortGroups) {
                case 'ascending':
                case 'descending':
                    var groupIndices = sumOut
                            .argsort({order : sortGroups});
                    sumOut.sort({order : sortGroups});
                    break;
                default:
                    var groupIndices = NDArray.range(shape[0]);
            }

            var percents = sumOut.mul(1 / sumOut.sum());

            var groupNumber = percents.shape()[0];
            var subGroupNumber = groupNumber * serieNumber;

            var groupAngles = percents.mul(360 - padding * groupNumber);
            groupAngles.add(padding, groupAngles);

            var subGroupAngles = dataMat
                    .mul(1 / dataMat.sum() 
                        * (360 - (padding + strokeFix*2) * groupNumber));
            switch (sortSubGroups) {
                case 'ascending':
                case 'descending':
                    var subGroupIndices = subGroupAngles
                            .argsort(1, {order : sortSubGroups});
                    subGroupAngles.sort(1, {order : sortSubGroups});
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
            var groupsTmp = [];
            var chordAngles = new NDArray(
                groupNumber, subGroupNumber
            ).toArray();
            var values = [];
            var start = 0;
            var end = 0;
            for (var i = 0; i < groupNumber; i++) {
                var sortedIdx = groupIndicesArr[i];
                groupsTmp[sortedIdx] = groups[i];
                values[sortedIdx] = sumOutArray[i];

                end = start + groupAnglesArr[i];
                sectorAngles[sortedIdx] = [start, end - padding];

                // Sub Group
                var subStart = start + strokeFix;
                var subEnd = start;
                for (var j = 0; j < subGroupNumber; j++) {
                    subEnd = subStart + subGroupAnglesArr[sortedIdx][j];
                    var subSortedIndex = subGroupIndicesArr[sortedIdx][j];
                    /*jshint maxlen : 200*/
                    chordAngles[sortedIdx][subSortedIndex]
                        = [subStart, subEnd];
                    subStart = subEnd;
                }

                start = end;
            }
            groups = groupsTmp;

            // reset data
            chordShapes = new NDArray(groupNumber, groupNumber, serieNumber)
                                .toArray();
            sectorShapes = [];

            _buildSectors(sectorAngles);

            chordAngles = new NDArray(chordAngles).reshape(
                groupNumber, groupNumber, serieNumber, 2
            ).toArray();
            _buildChords(chordAngles);

            var res = normalizeValue(values);
            if (showScale) {
                _buildScales(
                    res[0],
                    res[1],
                    sectorAngles,
                    new NDArray(res[0]).sum() / (360 - padding * groupNumber)
                );
            }
        }

        function _filterData (dataMat, groups) {
            var indices = [];
            var groupsFilted = [];
            // Filter by selected group
            for (var i = 0; i < groups.length; i++) {
                var name = groups[i].name;
                self.selectedMap[name] = legend.isSelected(name);
                if (!self.selectedMap[name]) {
                    indices.push(i);
                } else {
                    groupsFilted.push(groups[i]);
                }
            }
            if (indices.length) {
                dataMat = dataMat['delete'](indices, 0);
                dataMat = dataMat['delete'](indices, 1);   
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
                    groupsFilted2.push(groups[i]);
                }
            }
            if (indices.length) {
                dataMat = dataMat['delete'](indices, 0);
                dataMat = dataMat['delete'](indices, 1);
            }

            return [dataMat, groupsFilted2];
        }

        function _buildSectors(angles) {
            var len = groups.length;
            var len2 = chordSeries.length;
            function createMouseOver(idx) {
                return function() {
                    for (var i = 0; i < len; i++) {
                        if (i !== idx) {
                            sectorShapes[i].style.opacity = 0.1;
                            zr.modShape(
                                sectorShapes[i].id,
                                sectorShapes[i]
                            );

                            for (var j = 0; j < len; j++) {
                                for (var k = 0; k < len2; k++) {
                                    var chordShape = chordShapes[i][j][k];
                                    if (chordShape) {
                                        chordShape.style.opacity = 0.03;
                                        zr.modShape(chordShape.id, chordShape);
                                    }
                                }
                            }
                        }
                    }
                    zr.refresh();
                };
            }

            function createMouseOut() {
                return function() {
                    for (var i = 0; i < len; i++) {
                        sectorShapes[i].style.opacity = 1.0;
                        zr.modShape(sectorShapes[i].id, sectorShapes[i]);

                        for (var j = 0; j < len; j++) {
                            for (var k = 0; k < len2; k++) {
                                var chordShape = chordShapes[i][j][k];
                                if (chordShape) {
                                    chordShape.style.opacity = 0.5;
                                    zr.modShape(chordShape.id, chordShape);  
                                } 
                            }
                        }
                    }
                    zr.refresh();
                };
            }

            for (var i = 0; i < len; i++) {
                
                var group = groups[i];
                var angle = angles[i];

                var _start = (clockWise ? (360 - angle[1]) : angle[0])
                                + startAngle;
                var _end = (clockWise ? (360 - angle[0]) : angle[1])
                            + startAngle;

                var sector = {
                    id : zr.newShapeId(self.type),
                    shape : 'sector',
                    zlevel : _zlevelBase,
                    hoverable : false,
                    style : {
                        x : center[0],
                        y : center[1],
                        r0 : innerRadius,
                        r : outerRadius,
                        startAngle : _start,
                        endAngle : _end,
                        brushType : 'fill',
                        color : legend.getColor(group.name)
                    }
                };
                if (showLabel) {
                    var halfAngle = [_start + _end] / 2;
                    halfAngle %= 360;  // Constrain to [0,360]
                    var isRightSide = halfAngle <= 90
                                     || halfAngle >= 270;
                    halfAngle = halfAngle * Math.PI / 180;
                    var v = [Math.cos(halfAngle), -Math.sin(halfAngle)];

                    var distance = showScaleText ? 45 : 20;
                    var start = vec2.scale([], v, outerRadius + distance);
                    vec2.add(start, start, center);

                    var labelShape = {
                        shape : 'text',
                        id : zr.newShapeId(self.type),
                        zlevel : _zlevelBase - 1,
                        hoverable : false,
                        style : {
                            x : start[0],
                            y : start[1],
                            text : group.name,
                            textAlign : isRightSide ? 'left' : 'right',
                            color : labelColor,
                            hoverable : false
                        }
                    };
                    zr.addShape(labelShape);
                    self.shapeList.push(labelShape)
                }

                sector.onmouseover = createMouseOver(i);
                sector.onmouseout = createMouseOut();

                self.shapeList.push(sector);
                sectorShapes.push(sector);
                zr.addShape(sector);
            }
        }

        function _buildChords(angles) {
            var len = angles.length;
            if (!len) {
                return;
            }
            var len2 = angles[0][0].length;

            for (var i = 0; i < len; i++) {
                for (var j = 0; j < len; j++) {
                    for (var k = 0; k < len2; k++) {
                        if (chordShapes[j][i][k]) {
                            chordShapes[i][j][k] = chordShapes[j][i][k];
                        }

                        var angleIJ0 = angles[i][j][k][0];
                        var angleJI0 = angles[j][i][k][0];

                        var angleIJ1 = angles[i][j][k][1];
                        var angleJI1 = angles[j][i][k][1];

                        if (angleIJ0 - angleJI1 === 0 ||
                            angleJI0 - angleJI1 === 0) {
                            chordShapes[i][j][k] = null;
                            continue;
                        }

                        var color;
                        if (len2 === 1) {
                            color = angleIJ1 - angleIJ0 < angleJI1 - angleJI0
                                        ? legend.getColor(groups[i].name)
                                        : legend.getColor(groups[j].name);
                        } else {
                            color = legend.getColor(chordSeries[k].name);
                        }
                        var s0 = !clockWise ? (360 - angleIJ1) : angleIJ0;
                        var s1 = !clockWise ? (360 - angleIJ0) : angleIJ1;
                        var t0 = !clockWise ? (360 - angleJI1) : angleJI0;
                        var t1 = !clockWise ? (360 - angleJI0) : angleJI1;
                        var chord = {
                            id : zr.newShapeId(self.type),
                            shape : 'chord',
                            zlevel : _zlevelBase,
                            style : {
                                center : center,
                                r : innerRadius,
                                source0 : s0 - startAngle,
                                source1 : s1 - startAngle,
                                target0 : t0 - startAngle,
                                target1 : t1 - startAngle,
                                brushType : 'both',
                                strokeColor : 'black',
                                opacity : 0.5,
                                color : color
                            }
                        };

                        chordShapes[i][j][k] = chord;
                        self.shapeList.push(chord);
                        zr.addShape(chord);
                    }
                }
            }
        }

        function _buildScales(
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
                    var thelta = ((clockWise ? (360 - scaleAngle) : scaleAngle)
                                    + startAngle) / 180 * Math.PI;
                    var v = [
                            Math.cos(thelta),
                            -Math.sin(thelta)
                            ];
                    var start = vec2.scale([], v, outerRadius + 1);
                    vec2.add(start, start, center);
                    var end = vec2.scale([], v, outerRadius + scaleLineLength);
                    vec2.add(end, end, center);
                    var scaleShape = {
                        shape : 'line',
                        id : zr.newShapeId(self.type),
                        zlevel : _zlevelBase - 1,
                        hoverable : false,
                        style : {
                            xStart : start[0],
                            yStart : start[1],
                            xEnd : end[0],
                            yEnd : end[1],
                            lineCap : 'round',
                            brushType : 'stroke',
                            strokeColor : '#666'
                        }   
                    };

                    self.shapeList.push(scaleShape);
                    zr.addShape(scaleShape);

                    scaleAngle += scaleUnitAngle;
                }
                if (!showScaleText) {
                    continue;
                }

                var scaleTextAngle = subStartAngle;
                var step = unitValue * 5 * scaleUnitAngle;
                var scaleValues = NDArray.range(0, values[i], step).toArray();
                while (scaleTextAngle < subEndAngle) {
                    var thelta = clockWise 
                                    ? (360 - scaleTextAngle) : scaleTextAngle;
                    thelta = (thelta + startAngle) % 360;
                    var isRightSide = thelta <= 90
                                     || thelta >= 270;
                    var textShape = {
                        shape : 'text',
                        id : zr.newShapeId(self.type),
                        zlevel : _zlevelBase - 1,
                        hoverable : false,
                        style : {
                            x : isRightSide 
                                    ? outerRadius + scaleLineLength + 4 
                                    : -outerRadius - scaleLineLength - 4,
                            y : 0,
                            text : Math.round(scaleValues.shift()*10)/10 
                                    + unitPostfix,
                            textAlign : isRightSide ? 'left' : 'right'
                        },
                        position : center.slice(),
                        rotation : isRightSide
                            ? [thelta / 180 * Math.PI, 0, 0]
                            : [
                                (thelta + 180) / 180 * Math.PI,
                                0, 0
                              ]
                    };

                    self.shapeList.push(textShape);
                    zr.addShape(textShape);
                    scaleTextAngle += scaleUnitAngle * 5;
                }
            }
        }

        function normalizeValue(values) {
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
        }

        function init(newOption, newComponent) {
            component = newComponent;
            refresh(newOption);
        }

        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                series = option.series;
            }
            self.clear();
            _buildShape();

            zr.refresh();
        }

        self.init = init;
        self.refresh = refresh;

        init(option, component);
    }

    require('../chart').define('chord', Chord);

    return Chord;
});