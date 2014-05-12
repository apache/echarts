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
    
    function Chord(ecConfig, messageCenter, zr, option, component) {
        var self = this;

        var ComponentBase = require('../component/base');
        ComponentBase.call(this, ecConfig, zr);

        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecData = require('../util/ecData');

        var zrUtil = require('zrender/tool/util');
        var vec2 = require('zrender/tool/vector');
        var NDArray = require('../util/ndarray');

        var legend;
        var getColor;
        var isSelected;

        var series;
        this.type = ecConfig.CHART_TYPE_CHORD;

        var _zlevelBase = self.getZlevelBase();

        var chordSerieSample;
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
            chordSerieSample = null;
            var matrix = [];
            var serieNumber = 0;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === self.type) {
                    // Use the config of first chord serie
                    if (!chordSerieSample) {
                        chordSerieSample = series[i];
                        self.reformOption(chordSerieSample);
                    }

                    var _isSelected = isSelected(series[i].name);
                    // Filter by selected serie
                    self.selectedMap[series[i].name] = _isSelected;
                    if (!_isSelected) {
                        continue;
                    }
                    chordSeries.push(series[i]);
                    self.buildMark(
                        series[i],
                        i,
                        component
                    );
                    matrix.push(series[i].matrix);
                    serieNumber++;
                }
            }
            if (!chordSerieSample) {
                return;
            }
            if (!chordSeries.length) {
                return;
            }

            var zrWidth = zr.getWidth();
            var zrHeight = zr.getHeight();
            var zrSize = Math.min(zrWidth, zrHeight);

            groups = chordSerieSample.data;
            startAngle = chordSerieSample.startAngle;
            // Constrain to [0, 360]
            startAngle = startAngle % 360;
            if (startAngle < 0) {
                startAngle = startAngle + 360;
            }
            clockWise = chordSerieSample.clockWise;
            innerRadius = self.parsePercent(
                chordSerieSample.radius[0],
                zrSize / 2
            );
            outerRadius = self.parsePercent(
                chordSerieSample.radius[1],
                zrSize / 2
            );
            padding = chordSerieSample.padding;
            sortGroups = chordSerieSample.sort;
            sortSubGroups = chordSerieSample.sortSub;
            showScale = chordSerieSample.showScale;
            showScaleText = chordSerieSample.showScaleText;
            center = [
                self.parsePercent(chordSerieSample.center[0], zrWidth),
                self.parsePercent(chordSerieSample.center[1], zrHeight)
            ];
            var fixSize = 
                chordSerieSample.itemStyle.normal.chordStyle.lineStyle.width -
                chordSerieSample.itemStyle.normal.lineStyle.width;
            strokeFix = 
                (fixSize / _devicePixelRatio) / innerRadius / Math.PI * 180;


            dataMat = new NDArray(matrix);
            dataMat = dataMat._transposelike([1, 2, 0]);

            // Filter the data by selected legend
            var res = _filterData(dataMat, groups);
            dataMat = res[0];
            groups = res[1];

            // Check if data is valid
            var shape = dataMat.shape();
            if (shape[0] !== shape[1] || shape[0] !== groups.length) {
                throw new Error('Data not valid');
            }
            if (shape[0] === 0 || shape[2] === 0) {
                return;
            }

            // Down to 2 dimension
            // More convenient for angle calculating and sort
            dataMat.reshape(shape[0], shape[1] * shape[2]);

            // Processing data
            var sumOut = dataMat.sum(1);
            var percents = sumOut.mul(1 / sumOut.sum());

            var groupNumber = shape[0];
            var subGroupNumber = shape[1] * shape[2];

            var groupAngles = percents.mul(360 - padding * groupNumber);
            var subGroupAngles = dataMat.div(
                dataMat.sum(1).reshape(groupNumber, 1)
            );
            subGroupAngles = subGroupAngles.mul(
                groupAngles.sub(strokeFix * 2).reshape(groupNumber, 1)
            );

            switch (sortGroups) {
                case 'ascending':
                case 'descending':
                    var groupIndices = groupAngles
                            .argsort(0, sortGroups);
                    groupAngles['sort'](0, sortGroups);
                    sumOut['sort'](0, sortGroups);
                    break;
                default:
                    var groupIndices = NDArray.range(shape[0]);
            }

            switch (sortSubGroups) {
                case 'ascending':
                case 'descending':
                    var subGroupIndices = subGroupAngles
                            .argsort(1, sortSubGroups);
                    subGroupAngles['sort'](1, sortSubGroups);
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
                var subStart = start + strokeFix;
                var subEnd = subStart;
                for (var j = 0; j < subGroupNumber; j++) {
                    subEnd = subStart + subGroupAnglesArr[sortedIdx][j];
                    var subSortedIndex = subGroupIndicesArr[sortedIdx][j];
                    /*jshint maxlen : 200*/
                    chordAngles[sortedIdx][subSortedIndex]
                        = [subStart, subEnd];
                    subStart = subEnd;
                }

                start = end + padding;
            }

            // reset data
            chordShapes = new NDArray(groupNumber, groupNumber, serieNumber)
                                .toArray();
            sectorShapes = [];

            _buildSectors(sectorAngles, values);

            chordAngles = new NDArray(chordAngles).reshape(
                groupNumber, groupNumber, serieNumber, 2
            ).toArray();
            _buildChords(chordAngles, dataMat.reshape(shape).toArray());

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
                self.selectedMap[name] = isSelected(name);
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
        }

        function _buildSectors(angles, data) {
            var len = groups.length;
            var len2 = chordSeries.length;

            var timeout;

            var showLabel = self.query(
                chordSerieSample, 'itemStyle.normal.label.show'
            );
            var labelColor = self.query(
                chordSerieSample, 'itemStyle.normal.label.color'
            );

            function createMouseOver(idx) {
                return function() {
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    timeout = setTimeout(function(){
                        for (var i = 0; i < len; i++) {
                            sectorShapes[i].style.opacity 
                                = i === idx ? 1 : 0.1;
                            zr.modShape(
                                sectorShapes[i].id,
                                sectorShapes[i]
                            );

                            for (var j = 0; j < len; j++) {
                                for (var k = 0; k < len2; k++) {
                                    var chordShape = chordShapes[i][j][k];
                                    if (chordShape) {
                                        chordShape.style.opacity 
                                            = (i === idx || j === idx)
                                                 ? 0.5 : 0.03;
                                        zr.modShape(chordShape.id, chordShape);
                                    }
                                }
                            }
                        }
                        zr.refresh();
                    }, 50);
                };
            }

            function createMouseOut() {
                return function() {
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    timeout = setTimeout(function(){
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
                    }, 50);
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
                    style : {
                        x : center[0],
                        y : center[1],
                        r0 : innerRadius,
                        r : outerRadius,
                        startAngle : _start,
                        endAngle : _end,
                        brushType : 'fill',
                        opacity: 1,
                        color : getColor(group.name)
                    },
                    clickable: true,
                    highlightStyle : {
                        brushType : 'fill'
                    }
                };
                sector.style.lineWidth = self.deepQuery(
                    [group, chordSerieSample],
                    'itemStyle.normal.lineStyle.width'
                );
                sector.highlightStyle.lineWidth = self.deepQuery(
                    [group, chordSerieSample],
                    'itemStyle.emphasis.lineStyle.width'
                );
                sector.style.strokeColor = self.deepQuery(
                    [group, chordSerieSample],
                    'itemStyle.normal.lineStyle.color'
                );
                sector.highlightStyle.strokeColor = self.deepQuery(
                    [group, chordSerieSample],
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
                    chordSeries[0],
                    0,
                    data[i], 0,
                    group.name
                );
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
                            color : labelColor
                        }
                    };
                    labelShape.style.textColor = self.deepQuery(
                        [group, chordSerieSample],
                        'itemStyle.normal.label.textStyle.color'
                    ) || '#fff';
                    labelShape.style.textFont = self.getFont(self.deepQuery(
                        [group, chordSerieSample],
                        'itemStyle.normal.label.textStyle'
                    ));
                    zr.addShape(labelShape);
                    self.shapeList.push(labelShape);
                }

                sector.onmouseover = createMouseOver(i);
                sector.onmouseout = createMouseOut();

                self.shapeList.push(sector);
                sectorShapes.push(sector);
                zr.addShape(sector);
            }
        }

        function _buildChords(angles, dataArr) {
            var len = angles.length;
            if (!len) {
                return;
            }
            var len2 = angles[0][0].length;

            var chordLineStyle 
                = chordSerieSample.itemStyle.normal.chordStyle.lineStyle;
            var chordLineStyleEmphsis
                = chordSerieSample.itemStyle.emphasis.chordStyle.lineStyle;

            for (var i = 0; i < len; i++) {
                for (var j = 0; j < len; j++) {
                    for (var k = 0; k < len2; k++) {
                        if (chordShapes[j][i][k]) {
                            continue;
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
                            if (angleIJ1 - angleIJ0 <= angleJI1 - angleJI0) {
                                color = getColor(groups[i].name);
                            } else {
                                color = getColor(groups[j].name);
                            }
                        } else {
                            color = getColor(chordSeries[k].name);
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
                                opacity : 0.5,
                                color : color,
                                lineWidth : chordLineStyle.width,
                                strokeColor : chordLineStyle.color
                            },
                            clickable: true,
                            highlightStyle : {
                                brushType : 'both',
                                lineWidth : chordLineStyleEmphsis.width,
                                strokeColor : chordLineStyleEmphsis.color
                            }
                        };

                        ecData.pack(
                            chord,
                            chordSeries[k],
                            k,
                            dataArr[i][j][k], 0,
                            groups[i].name,
                            groups[j].name,
                            dataArr[j][i][k]
                        );

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
            legend = component.legend;
            if (legend) {
                getColor = legend.getColor;
                isSelected = legend.isSelected;
            } else {
                var colorIndices = {};
                var colorMap = {};
                var count = 0;
                getColor = function(key) {
                    if (colorMap[key]) {
                        return colorMap[key];
                    }
                    if (colorIndices[key] === undefined) {
                        colorIndices[key] = count++;
                    }
                    // key is serie name
                    for (var i = 0; i < chordSeries.length; i++) {
                        if (chordSeries[i].name === key) {
                            colorMap[key] = self.query(
                                chordSeries[i],
                                'itemStyle.normal.color'
                            );
                            break;
                        }
                    }
                    if (!colorMap[key]) {
                        var len = groups.length;
                        // key is group name
                        for (var i = 0; i < len; i++) {
                            if (groups[i].name === key) {
                                colorMap[key] = self.query(
                                    groups[i],
                                    'itemStyle.normal.color'
                                );
                                break;
                            }
                        }
                    }
                    if (!colorMap[key]) {
                        colorMap[key] = zr.getColor(colorIndices[key]);
                    }

                    return colorMap[key];
                };
                isSelected = function() {
                    return true;
                };
            }
            _buildShape();
        }

        function reformOption(opt) {
            var _merge = zrUtil.merge;
            opt = _merge(
                      opt || {},
                      ecConfig.chord,
                      {
                          'overwrite' : false,
                          'recursive' : true
                      }
                  );
            opt.itemStyle.normal.label.textStyle = _merge(
                opt.itemStyle.normal.label.textStyle || {},
                ecConfig.textStyle,
                {
                    'overwrite' : false,
                    'recursive' : true
                }
            );
        }

        self.init = init;
        self.refresh = refresh;
        self.reformOption = reformOption;

        init(option, component);
    }

    require('../chart').define('chord', Chord);

    return Chord;
});