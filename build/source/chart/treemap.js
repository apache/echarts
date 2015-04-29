define('echarts/chart/treemap', [
    'require',
    './base',
    'zrender/tool/area',
    'zrender/shape/Rectangle',
    'zrender/shape/Text',
    '../layout/TreeMap',
    '../config',
    '../util/ecData',
    'zrender/tool/util',
    '../chart'
], function (require) {
    var ChartBase = require('./base');
    var toolArea = require('zrender/tool/area');
    var RectangleShape = require('zrender/shape/Rectangle');
    var TextShape = require('zrender/shape/Text');
    var TreeMapLayout = require('../layout/TreeMap');
    var ecConfig = require('../config');
    ecConfig.treemap = {
        zlevel: 0,
        z: 1,
        calculable: false,
        clickable: true
    };
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    function Treemap(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
    }
    Treemap.prototype = {
        type: ecConfig.CHART_TYPE_TREEMAP,
        _buildShape: function () {
            var series = this.series;
            this.data = series[0].data;
            this.x0 = 100;
            this.y0 = 50;
            this.width0 = 500;
            this.height0 = 300;
            this._buildTreemap(this.data);
            this.addShapeList();
        },
        _buildTreemap: function (data) {
            var area0 = this.width0 * this.height0;
            var sum = 0;
            var areaArr = [];
            for (var i = 0; i < data.length; i++) {
                sum += data[i].value;
            }
            for (var j = 0; j < data.length; j++) {
                areaArr.push(data[j].value * area0 / sum);
            }
            var treeMapLayout = new TreeMapLayout({
                areas: areaArr,
                x0: this.x0,
                y0: this.y0,
                width0: this.width0,
                height0: this.height0
            });
            var locationArr = treeMapLayout.rectangleList;
            for (var k = 0; k < locationArr.length; k++) {
                var item = locationArr[k];
                this._buildItem(item.x, item.y, item.width, item.height, k);
            }
        },
        _buildItem: function (x, y, width, height, index) {
            var series = this.series;
            var rectangle = this.getRectangle(x, y, width, height, this.data[index].name, index);
            ecData.pack(rectangle, series[0], 0, series[0].data[index], 0, series[0].data[index].name);
            this.shapeList.push(rectangle);
        },
        getRectangle: function (x, y, width, height, text, index) {
            var serie = this.series[0];
            var data = this.data[index];
            var queryTarget = [
                data,
                serie
            ];
            var normal = this.deepMerge(queryTarget, 'itemStyle.normal') || {};
            var emphasis = this.deepMerge(queryTarget, 'itemStyle.emphasis') || {};
            var color = normal.color || this.zr.getColor(index);
            var emphasisColor = emphasis.color || this.zr.getColor(index);
            var borderWidth = normal.borderWidth || 0;
            var borderColor = normal.borderColor || '#ccc';
            var textShape = this.getLabel(x, y, width, height, this.data[index].name, index);
            var rectangleShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                hoverable: true,
                clickable: true,
                style: $.extend({
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    brushType: 'both',
                    color: color,
                    lineWidth: borderWidth,
                    strokeColor: borderColor
                }, textShape.style),
                highlightStyle: $.extend({
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor
                }, textShape.highlightStyle)
            };
            return new RectangleShape(rectangleShape);
        },
        getLabel: function (rectangleX, rectangleY, rectangleWidth, rectangleHeight, text, index) {
            if (!this.series[0].itemStyle.normal.label.show) {
                return {};
            }
            var marginY = 12;
            var marginX = 5;
            var fontSize = 13;
            var textFont = fontSize + 'px Arial';
            var textWidth = toolArea.getTextWidth(text, textFont);
            var textHeight = toolArea.getTextHeight(text, textFont);
            if (marginX + textWidth > rectangleWidth || marginY + textHeight > rectangleHeight) {
                return {};
            }
            var data = this.data[index];
            var textShape = {
                zlevel: this.getZlevelBase() + 1,
                z: this.getZBase() + 1,
                hoverable: false,
                style: {
                    x: rectangleX + marginX,
                    y: rectangleY + marginY,
                    text: text,
                    textColor: '#777',
                    textFont: textFont
                },
                highlightStyle: { text: text }
            };
            textShape = {
                style: { text: text },
                highlightStyle: { text: text }
            };
            textShape = this.addLabel(textShape, this.series[0], data, text);
            textShape.style.textPosition = 'specific';
            textShape.style.textX = rectangleX + marginX;
            textShape.style.textY = rectangleY + marginY;
            textShape.style.textColor = textShape.style.textColor || '#000';
            textShape.highlightStyle.textPosition = 'specific';
            textShape.highlightStyle.textX = rectangleX + marginX;
            textShape.highlightStyle.textY = rectangleY + marginY;
            textShape.highlightStyle.textColor = textShape.highlightStyle.textColor || '#000';
            return textShape;
        },
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            this._buildShape();
        }
    };
    zrUtil.inherits(Treemap, ChartBase);
    require('../chart').define('treemap', Treemap);
    return Treemap;
});define('echarts/layout/TreeMap', ['require'], function (require) {
    function TreeMapLayout(opts) {
        this.rectangleList = [];
        var row = {
            x: opts.x0,
            y: opts.y0,
            width: opts.width0,
            height: opts.height0
        };
        this.squarify(opts.areas, row);
    }
    TreeMapLayout.prototype.squarify = function (areas, row) {
        var layoutDirection = 'VERTICAL';
        var width = row.width;
        var height = row.height;
        if (row.width < row.height) {
            layoutDirection = 'HORIZONTAL';
            width = row.height;
            height = row.width;
        }
        var shapeArr = this.getShapeListInAbstractRow(areas, width, height);
        for (var i = 0; i < shapeArr.length; i++) {
            shapeArr[i].x = 0;
            shapeArr[i].y = 0;
            for (var j = 0; j < i; j++) {
                shapeArr[i].y += shapeArr[j].height;
            }
        }
        var nextRow = {};
        if (layoutDirection == 'VERTICAL') {
            for (var k = 0; k < shapeArr.length; k++) {
                this.rectangleList.push({
                    x: shapeArr[k].x + row.x,
                    y: shapeArr[k].y + row.y,
                    width: shapeArr[k].width,
                    height: shapeArr[k].height
                });
            }
            nextRow = {
                x: shapeArr[0].width + row.x,
                y: row.y,
                width: row.width - shapeArr[0].width,
                height: row.height
            };
        } else {
            for (var l = 0; l < shapeArr.length; l++) {
                this.rectangleList.push({
                    x: shapeArr[l].y + row.x,
                    y: shapeArr[l].x + row.y,
                    width: shapeArr[l].height,
                    height: shapeArr[l].width
                });
            }
            nextRow = {
                x: row.x,
                y: row.y + shapeArr[0].width,
                width: row.width,
                height: row.height - shapeArr[0].width
            };
        }
        var nextAreaArr = areas.slice(shapeArr.length);
        if (nextAreaArr.length === 0) {
            return;
        } else {
            this.squarify(nextAreaArr, nextRow);
        }
    };
    TreeMapLayout.prototype.getShapeListInAbstractRow = function (areas, width, height) {
        if (areas.length === 1) {
            return [{
                    width: width,
                    height: height
                }];
        }
        for (var count = 1; count < areas.length; count++) {
            var shapeArr0 = this.placeFixedNumberRectangles(areas.slice(0, count), width, height);
            var shapeArr1 = this.placeFixedNumberRectangles(areas.slice(0, count + 1), width, height);
            if (this.isFirstBetter(shapeArr0, shapeArr1)) {
                return shapeArr0;
            }
        }
    };
    TreeMapLayout.prototype.placeFixedNumberRectangles = function (areaSubArr, width, height) {
        var count = areaSubArr.length;
        var shapeArr = [];
        var sum = 0;
        for (var i = 0; i < areaSubArr.length; i++) {
            sum += areaSubArr[i];
        }
        var cellWidth = sum / height;
        for (var j = 0; j < count; j++) {
            var cellHeight = height * areaSubArr[j] / sum;
            shapeArr.push({
                width: cellWidth,
                height: cellHeight
            });
        }
        return shapeArr;
    };
    TreeMapLayout.prototype.isFirstBetter = function (shapeArr0, shapeArr1) {
        var ratio0 = shapeArr0[0].height / shapeArr0[0].width;
        ratio0 = ratio0 > 1 ? 1 / ratio0 : ratio0;
        var ratio1 = shapeArr1[0].height / shapeArr1[0].width;
        ratio1 = ratio1 > 1 ? 1 / ratio1 : ratio1;
        if (Math.abs(ratio0 - 1) <= Math.abs(ratio1 - 1)) {
            return true;
        }
        return false;
    };
    return TreeMapLayout;
});