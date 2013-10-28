/**
 * echarts图表类：chord diagram
 *
 * @author pissang (https://github.com/pissang/)
 *
 */

define(function(require) {

    require('../util/shape/chord');

    'use strict';
    
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
        var startAngle;
        var clockWise;
        var innerRadius;
        var outerRadius;
        var padding;
        var sortGroups;
        var sortSubGroups;
        var center;

        // Adjacency matrix
        var dataMat;

        var sectorShapes = [];
        var chordShapes = [];

        var scaleLineLength = 4;
        var scaleUnitAngle = 4;

        function _buildShape() {

            self.selectedMap = {};
            var chordSerie;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === self.type) {
                    chordSerie = series[i];

                    self.reformOption(chordSerie);

                    innerRadius = chordSerie.radius[0];
                    outerRadius = chordSerie.radius[1];
                    padding = chordSerie.padding;
                    sortGroups = chordSerie.sort;
                    sortSubGroups = chordSerie.sortSub;
                    center = self.calAbsolute(chordSerie.center);
                }
            }
            if (!chordSerie) {
                return;
            }

            var groups = chordSerie.data;
            var data = chordSerie.matrix;
            
            startAngle = chordSerie.startAngle;
            clockWise = chordSerie.clockWise;

            dataMat = new NDArray(data);

            // Filter the data by selected legend
            res = _filterData(dataMat, groups);
            dataMat = res[0];
            groups = res[1];

            var shape = dataMat.shape();
            // Check if data is valid
            if (shape[0] !== shape[1] || shape[0] !== groups.length) {
                throw new Error('Data not valid');
            }

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

            var len = percents.shape()[0];

            var groupAngles = percents.mul(360 - padding * len);
            groupAngles.add(padding, groupAngles);

            var subGroupAngles = dataMat
                    .mul(1 / dataMat.sum() * (360 - padding * len));
            switch (sortSubGroups) {
                case 'ascending':
                case 'descending':
                    var subGroupIndices = subGroupAngles
                            .argsort(1, {order : sortSubGroups});
                    subGroupAngles.sort(1, {order : sortSubGroups});
                    break;
                default:
                    var subGroupIndices = NDArray
                            .range(len).reshape(1, len).repeat(len, 0);
            }

            var groupIndicesArr = groupIndices.toArray();
            var groupAnglesArr = groupAngles.toArray();
            var subGroupIndicesArr = subGroupIndices.toArray();
            var subGroupAnglesArr = subGroupAngles.toArray();
            var sumOutArray = sumOut.toArray();

            var sectorAngles = [];
            var groupsTmp = [];
            var chordAngles = new NDArray(len, len).toArray();
            var values = [];
            var start = 0;
            var end = 0;
            for (var i = 0; i < len; i++) {
                var sortedIdx = groupIndicesArr[i];
                groupsTmp[sortedIdx] = groups[i];
                values[sortedIdx] = sumOutArray[i];

                end = start + groupAnglesArr[i];
                sectorAngles[sortedIdx] = [start, end - padding];

                // Sub Group
                var subStart = start;
                var subEnd = start;
                for (var j = 0; j < len; j++) {
                    subEnd = subStart + subGroupAnglesArr[sortedIdx][j];
                    /*jshint maxlen : 200*/
                    chordAngles[sortedIdx][subGroupIndicesArr[sortedIdx][j]]
                        = [subStart, subEnd];
                    subStart = subEnd;
                }

                start = end;
            }
            groups = groupsTmp;

            // reset data
            chordShapes = new NDArray(len, len).toArray();
            sectorShapes = [];

            _buildSectors(
                groups,
                sectorAngles,
                center,
                innerRadius,
                outerRadius
            );

            _buildChords(
                groups,
                chordAngles,
                center,
                innerRadius
            );

            var res = normalizeValue(values);
            _buildScales(
                res[0],
                res[1],
                sectorAngles,
                center,
                outerRadius,
                new NDArray(res[0]).sum() / (360 - padding * len)
            );
        }

        function _filterData (dataMat, groups) {
            var indices = [];
            var groupsFilted = [];
            for (var i = 0; i < groups.length; i++) {
                var name = groups[i].name;
                self.selectedMap[name] = legend.isSelected(name);
                if (!self.selectedMap[name]) {
                    indices.push(i);
                } else {
                    groupsFilted.push(groups[i]);
                }
            }

            dataMat = dataMat.delete(indices, 0);
            dataMat = dataMat.delete(indices, 1);

            return [dataMat, groupsFilted];
        }

        function _buildSectors(
            groups,
            angles,
            center,
            innerRadius,
            outerRadius
        ) {
            var len = groups.length;

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
                                var chordShape = chordShapes[i][j];
                                chordShape.style.opacity = 0.03;
                                zr.modShape(chordShape.id, chordShape);
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
                            var chordShape = chordShapes[i][j];
                            chordShape.style.opacity = 0.5;
                            zr.modShape(chordShape.id, chordShape);
                        }
                    }
                    zr.refresh();
                };
            }

            for (var i = 0; i < len; i++) {
                
                var group = groups[i];
                var angle = angles[i];

                var _start = (clockWise ? (360 - angle[1]) : angle[0]) + startAngle;
                var _end = (clockWise ? (360 - angle[0]) : angle[1]) + startAngle;
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

                sector.onmouseover = createMouseOver(i);

                sector.onmouseout = createMouseOut();

                self.shapeList.push(sector);
                sectorShapes.push(sector);
                zr.addShape(sector);
            }
        }

        function _buildChords(
            groups,
            angles,
            center,
            radius
        ) {
            var len = angles.length;

            for (var i = 0; i < len; i++) {
                for (var j = 0; j < len; j++) {

                    if (chordShapes[j][i]) {
                        chordShapes[i][j] = chordShapes[j][i];
                    }

                    var angleIJ0 = angles[i][j][0];
                    var angleJI0 = angles[j][i][0];

                    var angleIJ1 = angles[i][j][1];
                    var angleJI1 = angles[j][i][1];

                    var color = angleIJ1 - angleIJ0 < angleJI1 - angleJI0
                                    ? legend.getColor(groups[i].name)
                                    : legend.getColor(groups[j].name);

                    var chord = {
                        id : zr.newShapeId(self.type),
                        shape : 'chord',
                        zlevel : _zlevelBase,
                        style : {
                            center : center,
                            r : radius,
                            source0 : (!clockWise ? (360 - angleIJ1) : angleIJ0)-startAngle,
                            source1 : (!clockWise ? (360 - angleIJ0) : angleIJ1)-startAngle,
                            target0 : (!clockWise ? (360 - angleJI1) : angleJI0)-startAngle,
                            target1 : (!clockWise ? (360 - angleJI0) : angleJI1)-startAngle,
                            brushType : 'both',
                            strokeColor : 'black',
                            opacity : 0.5,
                            color : color
                        }
                    };

                    chordShapes[i][j] = chord;
                    self.shapeList.push(chord);
                    zr.addShape(chord);
                }
            }
        }

        function _buildScales(
            values,
            unitPostfix,
            angles,
            center,
            radius,
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
                    var start = vec2.scale([], v, radius + 1);
                    vec2.add(start, start, center);
                    var end = vec2.scale([], v, radius + scaleLineLength);
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

                var scaleTextAngle = subStartAngle;
                var step = unitValue * 5 * scaleUnitAngle;
                var scaleValues = NDArray.range(0, values[i], step).toArray();
                while (scaleTextAngle < subEndAngle) {
                    var thelta = (clockWise ? (360 - scaleTextAngle) : scaleTextAngle)
                                    + startAngle;
                    thelta = thelta - 360;
                    var isRightSide = thelta <= 90
                                     && thelta >= -90;
                    var textShape = {
                        shape : 'text',
                        id : zr.newShapeId(self.type),
                        zlevel : _zlevelBase - 1,
                        hoverable : false,
                        style : {
                            x : isRightSide 
                                    ? radius + scaleLineLength + 2 
                                    : -radius - scaleLineLength - 34,
                            y : 0,
                            text : Math.round(scaleValues.shift()*10)/10 
                                    + unitPostfix
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