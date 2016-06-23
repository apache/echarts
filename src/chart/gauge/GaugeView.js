define(function (require) {

    var PointerPath = require('./PointerPath');

    var graphic = require('../../util/graphic');
    var numberUtil = require('../../util/number');
    var parsePercent = numberUtil.parsePercent;

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

    function formatLabel(label, labelFormatter) {
        if (labelFormatter) {
            if (typeof labelFormatter === 'string') {
                label = labelFormatter.replace('{value}', label);
            }
            else if (typeof labelFormatter === 'function') {
                label = labelFormatter(label);
            }
        }

        return label;
    }

    var PI2 = Math.PI * 2;

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

            var angleRangeSpan = (endAngle - startAngle) % PI2;

            var prevEndAngle = startAngle;
            var axisLineWidth = lineStyleModel.get('width');

            for (var i = 0; i < colorList.length; i++) {
                // Clamp
                var percent = Math.min(Math.max(colorList[i][0], 0), 1);
                var endAngle = startAngle + angleRangeSpan * percent;
                var sector = new graphic.Sector({
                    shape: {
                        startAngle: prevEndAngle,
                        endAngle: endAngle,
                        cx: posInfo.cx,
                        cy: posInfo.cy,
                        clockwise: clockwise,
                        r0: posInfo.r - axisLineWidth,
                        r: posInfo.r
                    },
                    silent: true
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

            if (!clockwise) {
                var tmp = startAngle;
                startAngle = endAngle;
                endAngle = tmp;
            }

            this._renderTicks(
                seriesModel, ecModel, api, getColor, posInfo,
                startAngle, endAngle, clockwise
            );

            this._renderPointer(
                seriesModel, ecModel, api, getColor, posInfo,
                startAngle, endAngle, clockwise
            );

            this._renderTitle(
                seriesModel, ecModel, api, getColor, posInfo
            );
            this._renderDetail(
                seriesModel, ecModel, api, getColor, posInfo
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

            var splitNumber = seriesModel.get('splitNumber');
            var subSplitNumber = tickModel.get('splitNumber');

            var splitLineLen = parsePercent(
                splitLineModel.get('length'), r
            );
            var tickLen = parsePercent(
                tickModel.get('length'), r
            );

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
                        style: splitLineStyle,
                        silent: true
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
                    var label = formatLabel(
                        numberUtil.round(i / splitNumber * (maxVal - minVal) + minVal),
                        labelModel.get('formatter')
                    );
                    var distance = labelModel.get('distance');

                    var text = new graphic.Text({
                        style: {
                            text: label,
                            x: unitX * (r - splitLineLen - distance) + cx,
                            y: unitY * (r - splitLineLen - distance) + cy,
                            fill: textStyleModel.getTextColor(),
                            textFont: textStyleModel.getFont(),
                            textVerticalAlign: unitY < -0.4 ? 'top' : (unitY > 0.4 ? 'bottom' : 'middle'),
                            textAlign: unitX < -0.4 ? 'left' : (unitX > 0.4 ? 'right' : 'center')
                        },
                        silent: true
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
                            silent: true,
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
        },

        _renderPointer: function (
            seriesModel, ecModel, api, getColor, posInfo,
            startAngle, endAngle, clockwise
        ) {
            var valueExtent = [+seriesModel.get('min'), +seriesModel.get('max')];
            var angleExtent = [startAngle, endAngle];

            if (!clockwise) {
                angleExtent = angleExtent.reverse();
            }

            var data = seriesModel.getData();
            var oldData = this._data;

            var group = this.group;

            data.diff(oldData)
                .add(function (idx) {
                    var pointer = new PointerPath({
                        shape: {
                            angle: startAngle
                        }
                    });

                    graphic.updateProps(pointer, {
                        shape: {
                            angle: numberUtil.linearMap(data.get('value', idx), valueExtent, angleExtent, true)
                        }
                    }, seriesModel);

                    group.add(pointer);
                    data.setItemGraphicEl(idx, pointer);
                })
                .update(function (newIdx, oldIdx) {
                    var pointer = oldData.getItemGraphicEl(oldIdx);

                    graphic.updateProps(pointer, {
                        shape: {
                            angle: numberUtil.linearMap(data.get('value', newIdx), valueExtent, angleExtent, true)
                        }
                    }, seriesModel);

                    group.add(pointer);
                    data.setItemGraphicEl(newIdx, pointer);
                })
                .remove(function (idx) {
                    var pointer = oldData.getItemGraphicEl(idx);
                    group.remove(pointer);
                })
                .execute();

            data.eachItemGraphicEl(function (pointer, idx) {
                var itemModel = data.getItemModel(idx);
                var pointerModel = itemModel.getModel('pointer');

                pointer.setShape({
                    x: posInfo.cx,
                    y: posInfo.cy,
                    width: parsePercent(
                        pointerModel.get('width'), posInfo.r
                    ),
                    r: parsePercent(pointerModel.get('length'), posInfo.r)
                });

                pointer.useStyle(itemModel.getModel('itemStyle.normal').getItemStyle());

                if (pointer.style.fill === 'auto') {
                    pointer.setStyle('fill', getColor(
                        (data.get('value', idx) - valueExtent[0]) / (valueExtent[1] - valueExtent[0])
                    ));
                }

                graphic.setHoverStyle(
                    pointer, itemModel.getModel('itemStyle.emphasis').getItemStyle()
                );
            });

            this._data = data;
        },

        _renderTitle: function (
            seriesModel, ecModel, api, getColor, posInfo
        ) {
            var titleModel = seriesModel.getModel('title');
            if (titleModel.get('show')) {
                var textStyleModel = titleModel.getModel('textStyle');
                var offsetCenter = titleModel.get('offsetCenter');
                var x = posInfo.cx + parsePercent(offsetCenter[0], posInfo.r);
                var y = posInfo.cy + parsePercent(offsetCenter[1], posInfo.r);
                var text = new graphic.Text({
                    style: {
                        x: x,
                        y: y,
                        // FIXME First data name ?
                        text: seriesModel.getData().getName(0),
                        fill: textStyleModel.getTextColor(),
                        textFont: textStyleModel.getFont(),
                        textAlign: 'center',
                        textVerticalAlign: 'middle'
                    }
                });
                this.group.add(text);
            }
        },

        _renderDetail: function (
            seriesModel, ecModel, api, getColor, posInfo
        ) {
            var detailModel = seriesModel.getModel('detail');
            var minVal = seriesModel.get('min');
            var maxVal = seriesModel.get('max');
            if (detailModel.get('show')) {
                var textStyleModel = detailModel.getModel('textStyle');
                var offsetCenter = detailModel.get('offsetCenter');
                var x = posInfo.cx + parsePercent(offsetCenter[0], posInfo.r);
                var y = posInfo.cy + parsePercent(offsetCenter[1], posInfo.r);
                var width = parsePercent(detailModel.get('width'), posInfo.r);
                var height = parsePercent(detailModel.get('height'), posInfo.r);
                var value = seriesModel.getData().get('value', 0);
                var rect = new graphic.Rect({
                    shape: {
                        x: x - width / 2,
                        y: y - height / 2,
                        width: width,
                        height: height
                    },
                    style: {
                        text: formatLabel(
                            // FIXME First data name ?
                            value, detailModel.get('formatter')
                        ),
                        fill: detailModel.get('backgroundColor'),
                        textFill: textStyleModel.getTextColor(),
                        textFont: textStyleModel.getFont()
                    }
                });
                if (rect.style.textFill === 'auto') {
                    rect.setStyle('textFill', getColor(
                        numberUtil.linearMap(value, [minVal, maxVal], [0, 1], true)
                    ));
                }
                rect.setStyle(detailModel.getItemStyle(['color']));
                this.group.add(rect);
            }
        }
    });

    return GaugeView;
});