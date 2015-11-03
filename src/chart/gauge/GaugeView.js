define(function (require) {

    var graphic = require('../../util/graphic');
    var numberUtil = require('../../util/number');
    var parsePercent = numberUtil.parsePercent;
    var zrUtil = require('zrender/core/util');

    function parsePosition(seriesModel, api) {
        var center = seriesModel.get('center');
        var width = api.getWidth();
        var height = api.getHeight();
        var size = Math.min(width, height);
        var cx = parsePercent(center[0], api.getWidth());
        var cy = parsePercent(center[1], api.getHeight());
        var r = parsePercent(seriesModel.get('radius'), size / 2);

        return {
            cx: cx,
            cy: cy,
            r: r
        };
    }

    var PI2 = Math.PI * 2;

    // function getAngleRange(seriesModel) {
    //     var startAngle = seriesModel.get('startAngle');
    //     var endAngle = seriesModel.get('endAngle');
    //     var clockwise = seriesModel.get('clockwise');

    //     // Thresh to [0, Math.PI * 2]
    //     startAngle = startAngle % (PI2);
    //     if (startAngle < 0) {
    //         startAngle = startAngle + PI2;
    //     }
    //     endAngle = endAngle % (PI2);
    //     if (endAngle < 0) {
    //         endAngle = endAngle + PI2;
    //     }

    //     if (startAngle > endAngle && clockwise) {
    //         endAngle += PI2;
    //     }
    //     else if (startAngle < endAngle && !clockwise) {
    //         startAngle += PI2;
    //     }
    //     if (!clockwise) {
    //         var tmp = endAngle;
    //         endAngle = startAngle;
    //         startAngle = tmp;
    //     }

    //     return [startAngle, endAngle];
    // }

    var GaugeView = require('../../view/Chart').extend({

        type: 'gauge',

        render: function (seriesModel, ecModel, api) {

            this.group.removeAll();

            var colorList = seriesModel.get('axisLine.lineStyle.color');
            var posInfo = parsePosition(seriesModel, api);

            this._renderMain(
                seriesModel, ecModel, api, colorList, posInfo
            );
        },

        _renderMain: function (seriesModel, ecModel, api, colorList, posInfo) {
            var group = this.group;

            var axisLineModel = seriesModel.getModel('axisLine');
            var lineStyleModel = axisLineModel.getModel('lineStyle');

            var clockwise = seriesModel.get('clockwise');
            var startAngle = -seriesModel.get('startAngle') / 180 * Math.PI;
            var endAngle = -seriesModel.get('endAngle') / 180 * Math.PI;

            // Thresh to [0, Math.PI * 2]
            // startAngle = startAngle % (PI2);
            // if (startAngle < 0) {
            //     startAngle = startAngle + PI2;
            // }
            // endAngle = endAngle % (PI2);
            // if (endAngle < 0) {
            //     endAngle = endAngle + PI2;
            // }

            var angleRangeSpan = (endAngle - startAngle) % PI2;

            var prevEndAngle = startAngle;
            var axisLineWidth = lineStyleModel.get('width');

            for (var i = 0; i < colorList.length; i++) {
                var endAngle = startAngle + angleRangeSpan * colorList[i][0];
                var sector = new graphic.Sector({
                    shape: {
                        startAngle: prevEndAngle,
                        endAngle: endAngle,
                        cx: posInfo.cx,
                        cy: posInfo.cy,
                        clockwise: clockwise,
                        r0: posInfo.r - axisLineWidth,
                        r: posInfo.r
                    }
                });

                sector.setStyle({
                    fill: colorList[i][1]
                });

                sector.setStyle(lineStyleModel.getLineStyle(
                    // Because we use sector to simulate arc
                    // so the properties for stroking are useless
                    ['color', 'borderWidth', 'borderColor']
                ));

                group.add(sector);

                prevEndAngle = endAngle;
            }

            var getColor = function (percent) {
                // Less than 0
                if (percent <= 0) {
                    return colorList[0][1];
                }
                for (var i = 0; i < colorList.length; i++) {
                    if (colorList[i][0] >= percent
                        && (i === 0 ? 0 : colorList[i - 1][0]) < percent
                    ) {
                        return colorList[i][1];
                    }
                }
                // More than 1
                return colorList[i - 1][1];
            };

            this._renderTicks(
                seriesModel, ecModel, api, getColor, posInfo,
                startAngle, endAngle, clockwise
            );
        },

        _renderTicks: function (
            seriesModel, ecModel, api, getColor, posInfo,
            startAngle, endAngle, clockwise
        ) {
            var group = this.group;
            var cx = posInfo.cx;
            var cy = posInfo.cy;
            var r = posInfo.r;

            var minVal = seriesModel.get('min');
            var maxVal = seriesModel.get('max');

            var splitLineModel = seriesModel.getModel('splitLine');
            var tickModel = seriesModel.getModel('axisTick');
            var labelModel = seriesModel.getModel('axisLabel');

            var labelFormatter = labelModel.get('formatter');

            var splitNumber = seriesModel.get('splitNumber');
            var subSplitNumber = tickModel.get('splitNumber');

            var splitLineLen = splitLineModel.get('length');
            var tickLen = tickModel.get('length');

            var angle = startAngle;
            var step = (endAngle - startAngle) / splitNumber;
            var subStep = step / subSplitNumber;

            var splitLineStyle = splitLineModel.getModel('lineStyle').getLineStyle();
            var tickLineStyle = tickModel.getModel('lineStyle').getLineStyle();
            var textStyleModel = labelModel.getModel('textStyle');

            for (var i = 0; i <= splitNumber; i++) {
                var unitX = Math.cos(angle);
                var unitY = Math.sin(angle);
                // Split line
                if (splitLineModel.get('show')) {
                    var splitLine = new graphic.Line({
                        shape: {
                            x1: unitX * r + cx,
                            y1: unitY * r + cy,
                            x2: unitX * (r - splitLineLen) + cx,
                            y2: unitY * (r - splitLineLen) + cy
                        },
                        style: splitLineStyle
                    });
                    if (splitLineStyle.stroke === 'auto') {
                        splitLine.setStyle({
                            stroke: getColor(i / splitNumber)
                        });
                    }

                    group.add(splitLine);
                }

                // Label
                if (labelModel.get('show')) {
                    var label = numberUtil.round(i / splitNumber * (maxVal - minVal) + minVal);
                    if (labelFormatter) {
                        if (typeof labelFormatter === 'string') {
                            label = labelFormatter.replace('{value}', label);
                        }
                        else if (typeof labelFormatter === 'function') {
                            label = labelFormatter(label);
                        }
                    }
                    var text = new graphic.Text({
                        style: {
                            text: label,
                            x: unitX * (r - splitLineLen - 5) + cx,
                            y: unitY * (r - splitLineLen - 5) + cy,
                            fill: textStyleModel.get('color'),
                            font: textStyleModel.getFont(),
                            textBaseline: unitY < -0.4 ? 'top' : (unitY > 0.4 ? 'bottom' : 'middle'),
                            textAlign: unitX < -0.4 ? 'left' : (unitX > 0.4 ? 'right' : 'center')
                        }
                    });
                    if (text.style.fill === 'auto') {
                        text.setStyle({
                            fill: getColor(i / splitNumber)
                        });
                    }

                    group.add(text);
                }

                // Axis tick
                if (tickModel.get('show') && i !== splitNumber) {
                    for (var j = 0; j <= subSplitNumber; j++) {
                        var unitX = Math.cos(angle);
                        var unitY = Math.sin(angle);
                        var tickLine = new graphic.Line({
                            shape: {
                                x1: unitX * r + cx,
                                y1: unitY * r + cy,
                                x2: unitX * (r - tickLen) + cx,
                                y2: unitY * (r - tickLen) + cy
                            },
                            style: tickLineStyle
                        });

                        if (tickLineStyle.stroke === 'auto') {
                            tickLine.setStyle({
                                stroke: getColor((i + j / subSplitNumber) / splitNumber)
                            });
                        }

                        group.add(tickLine);
                        angle += subStep;
                    }
                    angle -= subStep;
                }
                else {
                    angle += step;
                }
            }

            console.log(startAngle, endAngle);
        },

        _renderPointer: function (seriesModel, ecModel, api, getColor) {

        },

        _renderTitle: function (seriesModel, ecModel, api) {

        },

        _renderDetail: function (seriesModel, ecModel, api) {

        }
    });

    return GaugeView;
});