/**
 * echarts图表类：维恩图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Loutongbing (娄同兵, loutongbing@126.com)
 */

define(function (require) {
    var ChartBase = require('./base');
    // 图形依赖

    var TextShape = require('zrender/shape/Text');
    var CircleShape = require('zrender/shape/Circle');
    var PathShape = require('zrender/shape/Path');

    var ecConfig = require('../config');
    // 维恩图默认参数
    ecConfig.venn = {
        zlevel: 0,                  // 一级层叠
        z: 1,                       // 二级层叠
        calculable: false
    };

    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');

    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     * @constructor
     * @exports Venn
     */
    function Venn(ecTheme, messageCenter, zr, option, myChart) {
        // 图表基类
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);

        this.refresh(option);
    }
    
    Venn.prototype = {
        type : ecConfig.CHART_TYPE_VENN,
        /**
         * 绘制图形
         */
        _buildShape : function () {
            this.selectedMap = {};
            this._symbol = this.option.symbolList;
            this._queryTarget;
            this._dropBoxList = [];
            this._vennDataCounter = 0;
            var series = this.series;
            var legend = this.component.legend;
            
            for (var i = 0; i < series.length; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_VENN) {
                    series[i] = this.reformOption(series[i]);
                    var serieName = series[i].name || '';

                    // 系列图例开关
                    this.selectedMap[serieName] = 
                        legend ? legend.isSelected(serieName) : true;
                    if (!this.selectedMap[serieName]) {
                        continue;
                    }

                    this._buildVenn(i);
                }
            }
            
            this.addShapeList();
        },
        /**
         * 构建单个
         *
         * @param {Object} data 数据
         */
        _buildVenn : function (seriesIndex) {
            var r0;
            var r1;
            var serie = this.series[seriesIndex];
            var data = serie.data;
            if (data[0].value > data[1].value) {
                r0 = this.zr.getHeight() / 3;
                r1 = r0 * Math.sqrt(data[1].value) / Math.sqrt(data[0].value);
            }
            else {
                r1 = this.zr.getHeight() / 3;
                r0 = r1 * Math.sqrt(data[0].value) / Math.sqrt(data[1].value);
            }

            var x0 = this.zr.getWidth() / 2 - r0;
            // 估值 两个圆心的距离与两圆半径均值之比等于交集与两集合均值的开方之比。
            // 公共距离（coincideLengthAnchor）/ 公共数值开方 = 半径平均值 / 各自数值均值的开方
            var coincideLengthAnchor = ((r0 + r1) / 2) * Math.sqrt(data[2].value) / Math.sqrt((data[0].value + data[1].value) / 2);
            // 如果两者没有公共面积，则圆心距就为两圆半径之和
            var coincideLength = r0 + r1;
            if (data[2].value !== 0) {
                coincideLength = this._getCoincideLength(
                    data[0].value,
                    data[1].value,
                    data[2].value,
                    r0, r1,
                    coincideLengthAnchor,
                    Math.abs(r0 - r1),
                    r0 + r1
                );
            }

            var x1 = x0 +  coincideLength;
            var y = this.zr.getHeight() / 2;
            this._buildItem(
                seriesIndex, 0, data[0],
                x0,
                y,
                r0
            );
            this._buildItem(
                seriesIndex, 1, data[1],
                x1,
                y,
                r1
            );
            // 包含关系与无交集关系均不画公共部分
            if (
                data[2].value !== 0
                && data[2].value !== data[0].value
                && data[2].value !== data[1].value
            ) {
                var xLeft = (r0 * r0 - r1 * r1) / (2 * coincideLength) + coincideLength / 2;
                var xRight = coincideLength / 2 - (r0 * r0 - r1 * r1) / (2 * coincideLength);
                var h = Math.sqrt(r0 * r0 - xLeft * xLeft);
                // 判断大小圆弧
                var rightLargeArcFlag = 0;
                var leftLargeArcFlag = 0;
                if (
                    data[0].value > data[1].value
                    && x1 < x0 + xLeft
                ) {
                    leftLargeArcFlag = 1;
                }
                if (
                    data[0].value < data[1].value
                    && x1 < x0 + xRight
                ) {
                    rightLargeArcFlag = 1;
                }
                this._buildCoincideItem(
                    seriesIndex,
                    2,
                    data[2],
                    x0 + xLeft,
                    y - h,
                    y + h,
                    r0,
                    r1,
                    rightLargeArcFlag,
                    leftLargeArcFlag
                );
            }
        },
        /**
         * 逼近算法得到两圆的间距
         * @param {number} value0 第一个圆的原始数值
         * @param {number} value1 第二个圆的原始数值
         * @param {number} value3 公共部分的原始数值
         * @param {number} r0 第一个圆的半径
         * @param {number} r1 第二个圆的半径
         * @param {number} coincideLengthAnchor 锚定
         * @param {number} coincideLengthAnchorMin 下限
         * @param {number} coincideLengthAnchorMax 上限
         * @return {Node}
        */
        _getCoincideLength: function (
            value0,
            value1,
            value2,
            r0,
            r1,
            coincideLengthAnchor,
            coincideLengthAnchorMin,
            coincideLengthAnchorMax
        ) {
            // 计算
            var x = (r0 * r0 - r1 * r1) / (2 * coincideLengthAnchor) + coincideLengthAnchor / 2;
            var y = coincideLengthAnchor / 2 - (r0 * r0 - r1 * r1) / (2 * coincideLengthAnchor);
            // 夹角
            var alfa = Math.acos(x / r0);
            var beta = Math.acos(y / r1);
            // 第一个圆的面积
            var area0 = r0 * r0 * Math.PI;
            // 计算的公共面积 (思路是扇形减三角形)
            var area2 = alfa * r0 * r0 - x * r0 * Math.sin(alfa) + beta * r1 * r1 - y * r1 * Math.sin(beta);
            var scaleAnchor = area2 / area0;
            var scale = value2 / value0;
            var approximateValue = Math.abs(scaleAnchor / scale);
            if (approximateValue > 0.999 && approximateValue < 1.001) {
                return coincideLengthAnchor;
            }
            // 若是公共面积比较小，使距离减小一些，让公共面积增大
            else if (approximateValue <= 0.999) {
                coincideLengthAnchorMax = coincideLengthAnchor;
                // 二分法计算新的步调
                coincideLengthAnchor = (coincideLengthAnchor + coincideLengthAnchorMin) / 2;
                return this._getCoincideLength(value0, value1, value2, r0, r1,
                    coincideLengthAnchor, coincideLengthAnchorMin, coincideLengthAnchorMax);
            }
            // 若是公共面积比较大，使距离增大一些，让公共面积减小
            else {
                coincideLengthAnchorMin = coincideLengthAnchor;
                coincideLengthAnchor = (coincideLengthAnchor + coincideLengthAnchorMax) / 2;
                return this._getCoincideLength(value0, value1, value2, r0, r1,
                    coincideLengthAnchor, coincideLengthAnchorMin, coincideLengthAnchorMax);
            }
        },

        /**
         * 构建单个圆及指标
         */
        _buildItem : function (
            seriesIndex, dataIndex, dataItem,
            x, y, r
        ) {
            var series = this.series;
            var serie = series[seriesIndex];

            var circle = this.getCircle(
                seriesIndex,
                dataIndex,
                dataItem,
                x, y, r
            );
            ecData.pack(
                circle,
                serie, seriesIndex,
                dataItem, dataIndex,
                dataItem.name
            );
            this.shapeList.push(circle);

            if (serie.itemStyle.normal.label.show) {
                // 文本标签
                var label = this.getLabel(
                    seriesIndex,
                    dataIndex,
                    dataItem,
                    x, y, r
                );
                ecData.pack(
                    label,
                    serie, seriesIndex,
                    serie.data[dataIndex], dataIndex,
                    serie.data[dataIndex].name
                );
                this.shapeList.push(label);
            }
        },

        _buildCoincideItem : function (
            seriesIndex, dataIndex, dataItem,
            x, y0, y1, r0, r1, rightLargeArcFlag, leftLargeArcFlag
        ) {
            var series = this.series;
            var serie = series[seriesIndex];
            var queryTarget = [dataItem, serie];

            // 多级控制
            var normal = this.deepMerge(
                queryTarget,
                'itemStyle.normal'
            ) || {};
            var emphasis = this.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            ) || {};
            var normalColor = normal.color || this.zr.getColor(dataIndex);
            var emphasisColor = emphasis.color || this.zr.getColor(dataIndex);

            var path = 'M' + x + ',' + y0
                       + 'A' + r0 + ',' + r0 + ',0,' + rightLargeArcFlag + ',1,' + x + ',' + y1
                       + 'A' + r1 + ',' + r1 + ',0,' + leftLargeArcFlag + ',1,' + x + ',' + y0;
            var style = {
                color: normalColor,
                // path: rx ry x-axis-rotation large-arc-flag sweep-flag x y
                path: path
            };

            var shape = {
                zlevel: serie.zlevel,
                z: serie.z,
                style: style,
                highlightStyle: {
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor
                }
            };
            shape = new PathShape(shape);
            if (shape.buildPathArray) {
                shape.style.pathArray = shape.buildPathArray(style.path);
            }
            ecData.pack(
                shape,
                series[seriesIndex], 0,
                dataItem, dataIndex,
                dataItem.name
            );
            this.shapeList.push(shape);
        },
        /**
         * 构建圆形
         */
        getCircle : function (
            seriesIndex,
            dataIndex,
            dataItem,
            x, y, r
        ) {
            var serie = this.series[seriesIndex];
            var queryTarget = [dataItem, serie];

            // 多级控制
            var normal = this.deepMerge(
                queryTarget,
                'itemStyle.normal'
            ) || {};
            var emphasis = this.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            ) || {};
            var normalColor = normal.color || this.zr.getColor(dataIndex);
            var emphasisColor = emphasis.color || this.zr.getColor(dataIndex);

            var circle = {
                zlevel: serie.zlevel,
                z: serie.z,
                clickable: true,
                style: {
                    x: x,
                    y: y,
                    r: r,
                    brushType: 'fill',
                    opacity: 1,
                    color: normalColor
                },
                highlightStyle: {
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor
                }
            };

            if (this.deepQuery([dataItem, serie, this.option], 'calculable')) {
                this.setCalculable(circle);
                circle.draggable = true;
            }
            return new CircleShape(circle);

        },

        /**
         * 需要显示则会有返回构建好的shape，否则返回undefined
         */
        getLabel: function (
            seriesIndex,
            dataIndex,
            dataItem,
            x, y, r
        ) {
            var serie = this.series[seriesIndex];
            var itemStyle = serie.itemStyle;
            var queryTarget = [dataItem, serie];

            // 多级控制
            var normal = this.deepMerge(
                queryTarget,
                'itemStyle.normal'
            ) || {};
            var status = 'normal';
            // label配置
            var labelControl = itemStyle[status].label;
            var textStyle = labelControl.textStyle || {};
            var text = this.getLabelText(dataIndex, dataItem, status);
            var textFont = this.getFont(textStyle);
            var textColor = normal.color || this.zr.getColor(dataIndex);
            // 求出label的纵坐标
            var textSize = textStyle.fontSize || 12;

            var textShape = {
                zlevel: serie.zlevel,
                z: serie.z,
                style: {
                    x: x,
                    y: y - r - textSize,
                    color: textStyle.color || textColor,
                    text: text,
                    textFont: textFont,
                    textAlign: 'center'
                }
            };

            return new TextShape(textShape);
        },

        /**
         * 根据lable.format计算label text
         */
        getLabelText : function (dataIndex, dataItem, status) {
            var series = this.series;
            var serie = series[0];
            var formatter = this.deepQuery(
                [dataItem, serie],
                'itemStyle.' + status + '.label.formatter'
            );

            if (formatter) {
                if (typeof formatter == 'function') {
                    return formatter(
                        serie.name,
                        dataItem.name,
                        dataItem.value
                    );
                }
                else if (typeof formatter == 'string') {
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}');
                    formatter = formatter.replace('{a0}', serie.name)
                                         .replace('{b0}', dataItem.name)
                                         .replace('{c0}', dataItem.value);

                    return formatter;
                }
            }
            else {
                return dataItem.name;
            }
        },

        /**
         * 刷新
         */
        refresh : function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }

            this._buildShape();
        }
    };

    zrUtil.inherits(Venn, ChartBase);

    // 图表注册
    require('../chart').define('venn', Venn);

    return Venn;
});