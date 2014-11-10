/**
 * echarts图表类：漏斗图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var ComponentBase = require('../component/base');
    var ChartBase = require('./base');
    
    // 图形依赖
    var TextShape = require('zrender/shape/Text');
    var LineShape = require('zrender/shape/Line');
    var PolygonShape = require('zrender/shape/Polygon');

    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var number = require('../util/number');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    var zrArea = require('zrender/tool/area');
    
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Funnel(ecTheme, messageCenter, zr, option, myChart){
        // 基类
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        // 图表基类
        ChartBase.call(this);
        this.refresh(option);
    }
    
    Funnel.prototype = {
        type: ecConfig.CHART_TYPE_FUNNEL,
        /**
         * 绘制图形
         */
        _buildShape: function () {
            var series = this.series;
            var legend = this.component.legend;
            // 复用参数索引
            this._paramsMap = {};
            this._selected = {};
            this.selectedMap = {};
            
            var serieName;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_FUNNEL) {
                    series[i] = this.reformOption(series[i]);
                    this.legendHoverLink = series[i].legendHoverLink || this.legendHoverLink;
                    serieName = series[i].name || '';
                    // 系列图例开关
                    this.selectedMap[serieName] = legend ? legend.isSelected(serieName) : true;
                    if (!this.selectedMap[serieName]) {
                        continue;
                    }
                    this._buildSingleFunnel(i);
                    this.buildMark(i);
                }
            }

            this.addShapeList();
        },
        
        /**
         * 构建单个仪表盘
         *
         * @param {number} seriesIndex 系列索引
         */
        _buildSingleFunnel: function (seriesIndex) {
            var legend = this.component.legend;
            var serie = this.series[seriesIndex];
            var data = this._mapData(seriesIndex);
            var location = this._getLocation(seriesIndex);
            this._paramsMap[seriesIndex] = {
                location: location,
                data: data
            };
            
            var itemName;
            var total = 0;
            var selectedData = [];
            // 计算需要显示的个数和总值
            for (var i = 0, l = data.length; i < l; i++) {
                itemName = data[i].name;
                if (legend){
                    this.selectedMap[itemName] = legend.isSelected(itemName);
                }
                else {
                    this.selectedMap[itemName] = true;
                }
                if (this.selectedMap[itemName] && !isNaN(data[i].value)) {
                    selectedData.push(data[i]);
                    total++;
                }
            }
            if (total === 0) {
                return;
            }
            // 可计算箱子
            var funnelCase = this._buildFunnelCase(seriesIndex);
            var align = serie.funnelAlign;
            var gap = serie.gap;
            var height = total > 1 
                         ? (location.height - (total - 1) * gap) / total : location.height;
            var width;
            var lastY = location.y;
            var lastWidth = serie.sort === 'descending'
                            ? this._getItemWidth(seriesIndex, selectedData[0].value)
                            : number.parsePercent(serie.minSize, location.width);
            var next = serie.sort === 'descending' ? 1 : 0;
            var centerX = location.centerX;
            var pointList= [];
            var x;
            var polygon
            var lastPolygon;
            for (var i = 0, l = selectedData.length; i < l; i++) {
                itemName = selectedData[i].name;
                if (this.selectedMap[itemName] && !isNaN(selectedData[i].value)) {
                    width = i <= l - 2
                            ? this._getItemWidth(seriesIndex, selectedData[i + next].value)
                            : serie.sort === 'descending'
                              ? number.parsePercent(serie.minSize, location.width)
                              : number.parsePercent(serie.maxSize, location.width);
                    switch (align) {
                        case 'left':
                            x = location.x;
                            break;
                        case 'right':
                            x = location.x + location.width - lastWidth;
                            break;
                        default:
                            x = centerX - lastWidth / 2;
                    }
                    polygon = this._buildItem(
                        seriesIndex, selectedData[i]._index,
                        legend // color
                            ? legend.getColor(itemName) 
                            : this.zr.getColor(selectedData[i]._index),
                        x, lastY, lastWidth, width, height, align
                    );
                    lastY += height + gap;
                    lastPolygon = polygon.style.pointList;
                    
                    pointList.unshift([lastPolygon[0][0] - 10, lastPolygon[0][1]]); // 左
                    pointList.push([lastPolygon[1][0] + 10, lastPolygon[1][1]]);    // 右
                    if (i === 0) {
                        if (lastWidth === 0) {
                            lastPolygon = pointList.pop();
                            align == 'center' && (pointList[0][0] += 10);
                            align == 'right' && (pointList[0][0] = lastPolygon[0]);
                            pointList[0][1] -= align == 'center' ? 10 : 15;
                            if (l == 1) {
                                lastPolygon = polygon.style.pointList;
                            }
                        }
                        else {
                            pointList[pointList.length - 1][1] -= 5;
                            pointList[0][1] -=5;
                        }
                    }
                    lastWidth = width;
                }
            }
            
            if (funnelCase) {
                pointList.unshift([lastPolygon[3][0] - 10, lastPolygon[3][1]]); // 左
                pointList.push([lastPolygon[2][0] + 10, lastPolygon[2][1]]);    // 右
                if (lastWidth === 0) {
                    lastPolygon = pointList.pop();
                    align == 'center' && (pointList[0][0] += 10);
                    align == 'right' && (pointList[0][0] = lastPolygon[0]);
                    pointList[0][1] += align == 'center' ? 10 : 15;
                }
                else {
                    pointList[pointList.length - 1][1] += 5;
                    pointList[0][1] +=5;
                }
                funnelCase.style.pointList = pointList;
            }
        },
        
        _buildFunnelCase: function(seriesIndex) {
            var serie = this.series[seriesIndex];
            if (this.deepQuery([serie, this.option], 'calculable')) {
                var location = this._paramsMap[seriesIndex].location;
                var gap = 10;
                var funnelCase = {
                    hoverable: false,
                    style: {
                        pointListd: [
                            [location.x - gap, location.y - gap],
                            [location.x + location.width + gap, location.y - gap],
                            [location.x + location.width + gap, location.y + location.height + gap],
                            [location.x - gap, location.y + location.height + gap]
                        ],
                        brushType: 'stroke',
                        lineWidth: 1,
                        strokeColor: serie.calculableHolderColor
                                     || this.ecTheme.calculableHolderColor
                    }
                };
                ecData.pack(funnelCase, serie, seriesIndex, undefined, -1);
                this.setCalculable(funnelCase);
                funnelCase = new PolygonShape(funnelCase);
                this.shapeList.push(funnelCase);
                return funnelCase;
            }
        },
        
        _getLocation: function (seriesIndex) {
            var gridOption = this.series[seriesIndex];
            var zrWidth = this.zr.getWidth();
            var zrHeight = this.zr.getHeight();
            var x = this.parsePercent(gridOption.x, zrWidth);
            var y = this.parsePercent(gridOption.y, zrHeight);
            
            var width;
            if (gridOption.width == null) {
                width = zrWidth - x - this.parsePercent(gridOption.x2, zrWidth);
            }
            else {
                width = this.parsePercent(gridOption.width, zrWidth);
            }
            
            var height;
            if (gridOption.height == null) {
                height = zrHeight - y - this.parsePercent(gridOption.y2, zrHeight);
            }
            else {
                height = this.parsePercent(gridOption.height, zrHeight);
            }
            
            return {
                x: x,
                y: y,
                width: width,
                height: height,
                centerX: x + width / 2
            };
        },
        
        _mapData: function(seriesIndex) {
            var serie = this.series[seriesIndex];
            var funnelData = zrUtil.clone(serie.data);
            for (var i = 0, l = funnelData.length; i < l; i++) {
                funnelData[i]._index = i;
            }
            function numDescending (a, b) {
                if (a.value === '-') {
                    return 1;
                }
                else if (b.value === '-') {
                    return -1;
                }
                return b.value - a.value;
            }
            function numAscending (a, b) {
                return -numDescending(a, b);
            }
            if (serie.sort != 'none') {
                funnelData.sort(serie.sort === 'descending' ? numDescending : numAscending);
            }
            
            return funnelData;
        },
        
        /**
         * 构建单个扇形及指标
         */
        _buildItem: function (
            seriesIndex, dataIndex, defaultColor,
            x, y, topWidth, bottomWidth, height, align
        ) {
            var series = this.series;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            
            // 漏斗
            var polygon = this.getPolygon(
                    seriesIndex, dataIndex, defaultColor,
                    x, y, topWidth, bottomWidth, height, align
                );
            ecData.pack(
                polygon,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                series[seriesIndex].data[dataIndex].name
            );
            this.shapeList.push(polygon);

            // 文本标签
            var label = this.getLabel(
                    seriesIndex, dataIndex, defaultColor,
                    x, y, topWidth, bottomWidth, height, align
                );
            ecData.pack(
                label,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                series[seriesIndex].data[dataIndex].name
            );
            this.shapeList.push(label);
            // 特定状态下是否需要显示文本标签
            if (!this._needLabel(serie, data,false)) {
                label.invisible = true;
            }

            // 文本标签视觉引导线
            var labelLine = this.getLabelLine(
                    seriesIndex, dataIndex, defaultColor,
                    x, y, topWidth, bottomWidth, height, align
                );
            this.shapeList.push(labelLine);
            // 特定状态下是否需要显示文本标签引导线
            if (!this._needLabelLine(serie, data,false)) {
                labelLine.invisible = true;
            }
            
            var polygonHoverConnect = [];
            var labelHoverConnect = [];
            if (this._needLabelLine(serie, data, true)) {
                polygonHoverConnect.push(labelLine.id);
                labelHoverConnect.push(labelLine.id);
            }
            if (this._needLabel(serie, data, true)) {
                polygonHoverConnect.push(label.id);
                labelHoverConnect.push(polygon.id);
            }
            polygon.hoverConnect = polygonHoverConnect;
            label.hoverConnect = labelHoverConnect;
            
            return polygon;
        },

        /**
         * 根据值计算宽度 
         */
        _getItemWidth: function (seriesIndex, value) {
            var serie = this.series[seriesIndex];
            var location = this._paramsMap[seriesIndex].location;
            var min = serie.min;
            var max = serie.max;
            var minSize = number.parsePercent(serie.minSize, location.width);
            var maxSize = number.parsePercent(serie.maxSize, location.width);
            return value * (maxSize - minSize) / (max - min);
        },
        
        /**
         * 构建扇形
         */
        getPolygon: function (
            seriesIndex, dataIndex, defaultColor,
            xLT, y, topWidth, bottomWidth, height, align
        ) {
            var serie = this.series[seriesIndex];
            var data = serie.data[dataIndex];
            var queryTarget = [data, serie];

            // 多级控制
            var normal = this.deepMerge(
                queryTarget,
                'itemStyle.normal'
            ) || {};
            var emphasis = this.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            ) || {};
            var normalColor = this.getItemStyleColor(normal.color, seriesIndex, dataIndex, data)
                              || defaultColor;
            
            var emphasisColor = this.getItemStyleColor(emphasis.color, seriesIndex, dataIndex, data)
                || (typeof normalColor === 'string'
                    ? zrColor.lift(normalColor, -0.2)
                    : normalColor
                );
            
            var  xLB;
            switch (align) {
                case 'left':
                    xLB = xLT;
                    break;
                case 'right':
                    xLB = xLT + (topWidth - bottomWidth);
                    break;
                default:
                    xLB = xLT + (topWidth - bottomWidth) / 2;
                    break;
            }
            var polygon = {
                zlevel: this._zlevelBase,
                clickable: this.deepQuery(queryTarget, 'clickable'),
                style: {
                    pointList: [
                        [xLT, y],
                        [xLT + topWidth, y],
                        [xLB + bottomWidth, y + height],
                        [xLB, y + height]
                    ],
                    brushType: 'both',
                    color: normalColor,
                    lineWidth: normal.borderWidth,
                    strokeColor: normal.borderColor
                },
                highlightStyle: {
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor
                }
            };
            
            if (this.deepQuery([data, serie, this.option], 'calculable')) {
                this.setCalculable(polygon);
                polygon.draggable = true;
            }

            return new PolygonShape(polygon);
        },

        /**
         * 需要显示则会有返回构建好的shape，否则返回undefined
         */
        getLabel: function (
            seriesIndex, dataIndex, defaultColor,
            x, y, topWidth, bottomWidth, height, align
        ) {
            var serie = this.series[seriesIndex];
            var data = serie.data[dataIndex];
            var location = this._paramsMap[seriesIndex].location;
            // serie里有默认配置，放心大胆的用！
            var itemStyle = zrUtil.merge(
                    zrUtil.clone(data.itemStyle) || {},
                    serie.itemStyle
                );
            var status = 'normal';
            // label配置
            var labelControl = itemStyle[status].label;
            var textStyle = labelControl.textStyle || {};
            var lineLength = itemStyle[status].labelLine.length;

            var text = this.getLabelText(seriesIndex, dataIndex, status);
            var textFont = this.getFont(textStyle);
            var textAlign;
            var textColor = defaultColor;
            labelControl.position = labelControl.position 
                                    || itemStyle.normal.label.position;
            if (labelControl.position === 'inner'
                || labelControl.position === 'inside'
                || labelControl.position === 'center'
            ) {
                // 内部
                textAlign = align;
                textColor = 
                    Math.max(topWidth, bottomWidth) / 2 > zrArea.getTextWidth(text, textFont)
                    ? '#fff' : zrColor.reverse(defaultColor);
            }
            else if (labelControl.position === 'left'){
                // 左侧显示
                textAlign = 'right';
            }
            else {
                // 右侧显示，默认 labelControl.position === 'outer' || 'right)
                textAlign = 'left';
            }
            
            var textShape = {
                zlevel: this._zlevelBase + 1,
                style: {
                    x: this._getLabelPoint(
                           labelControl.position, x, location,
                           topWidth, bottomWidth,lineLength, align
                       ),
                    y: y + height / 2,
                    color: textStyle.color || textColor,
                    text: text,
                    textAlign: textStyle.align || textAlign,
                    textBaseline: textStyle.baseline || 'middle',
                    textFont: textFont
                }
            };
            
            //----------高亮
            status = 'emphasis';
            // label配置
            labelControl = itemStyle[status].label || labelControl;
            textStyle = labelControl.textStyle || textStyle;
            lineLength = itemStyle[status].labelLine.length || lineLength;
            labelControl.position = labelControl.position || itemStyle.normal.label.position;
            text = this.getLabelText(seriesIndex, dataIndex, status);
            textFont = this.getFont(textStyle);
            textColor = defaultColor;
            if (labelControl.position === 'inner' 
                || labelControl.position === 'inside'
                || labelControl.position === 'center'
            ) {
                // 内部
                textAlign = align;
                textColor = 
                    Math.max(topWidth, bottomWidth) / 2 > zrArea.getTextWidth(text, textFont)
                    ? '#fff' : zrColor.reverse(defaultColor);
            }
            else if (labelControl.position === 'left'){
                // 左侧显示
                textAlign = 'right';
            }
            else {
                // 右侧显示，默认 labelControl.position === 'outer' || 'right)
                textAlign = 'left';
            }
            
            textShape.highlightStyle = {
                x: this._getLabelPoint(
                       labelControl.position, x, location,
                       topWidth, bottomWidth,lineLength, align
                   ),
                color: textStyle.color || textColor,
                text: text,
                textAlign: textStyle.align || textAlign,
                textFont: textFont,
                brushType: 'fill'
            };
            
            return new TextShape(textShape);
        },

        /**
         * 根据lable.format计算label text
         */
        getLabelText: function (seriesIndex, dataIndex, status) {
            var series = this.series;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            var formatter = this.deepQuery(
                [data, serie],
                'itemStyle.' + status + '.label.formatter'
            );
            
            if (formatter) {
                if (typeof formatter === 'function') {
                    return formatter.call(
                        this.myChart,
                        serie.name,
                        data.name,
                        data.value
                    );
                }
                else if (typeof formatter === 'string') {
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}');
                    formatter = formatter.replace('{a0}', serie.name)
                                         .replace('{b0}', data.name)
                                         .replace('{c0}', data.value);
    
                    return formatter;
                }
            }
            else {
                return data.name;
            }
        },
        
        /**
         * 需要显示则会有返回构建好的shape，否则返回undefined
         */
        getLabelLine: function (
            seriesIndex, dataIndex, defaultColor,
            x, y, topWidth, bottomWidth, height, align
        ) {
            var serie = this.series[seriesIndex];
            var data = serie.data[dataIndex];
            var location = this._paramsMap[seriesIndex].location;

            // serie里有默认配置，放心大胆的用！
            var itemStyle = zrUtil.merge(
                    zrUtil.clone(data.itemStyle) || {},
                    serie.itemStyle
                );
            var status = 'normal';
            // labelLine配置
            var labelLineControl = itemStyle[status].labelLine;
            var lineLength = itemStyle[status].labelLine.length;
            var lineStyle = labelLineControl.lineStyle || {};
            
            var labelControl = itemStyle[status].label;
            labelControl.position = labelControl.position 
                                    || itemStyle.normal.label.position;

            var lineShape = {
                zlevel: this._zlevelBase + 1,
                hoverable: false,
                style: {
                    xStart: this._getLabelLineStartPoint(x, location, topWidth, bottomWidth, align),
                    yStart: y + height / 2,
                    xEnd: this._getLabelPoint(
                              labelControl.position, x, location,
                              topWidth, bottomWidth,lineLength, align
                          ),
                    yEnd: y + height / 2,
                    strokeColor: lineStyle.color || defaultColor,
                    lineType: lineStyle.type,
                    lineWidth: lineStyle.width
                }
            };
            
            status = 'emphasis';
            // labelLine配置
            labelLineControl = itemStyle[status].labelLine || labelLineControl;
            lineLength = itemStyle[status].labelLine.length || lineLength;
            lineStyle = labelLineControl.lineStyle || lineStyle;

            labelControl = itemStyle[status].label || labelControl;
            labelControl.position = labelControl.position;
            
            lineShape.highlightStyle = {
                xEnd: this._getLabelPoint(
                          labelControl.position, x, location,
                          topWidth, bottomWidth,lineLength, align
                      ),
                strokeColor: lineStyle.color || defaultColor,
                lineType: lineStyle.type,
                lineWidth: lineStyle.width
            };
            
            return new LineShape(lineShape);
        },
        
        _getLabelPoint: function(position, x, location, topWidth, bottomWidth, lineLength, align) {
            position = (position === 'inner' || position === 'inside') ? 'center' : position;
            switch (position) {
                case 'center':
                    return align == 'center'
                            ? (x + topWidth / 2)
                            : align == 'left' ? (x + 10) : (x + topWidth - 10);
                case 'left':
                    // 左侧文本
                    if (lineLength === 'auto') {
                        return location.x - 10;
                    }
                    else {
                        return align == 'center'
                            // 居中布局
                            ? (location.centerX - Math.max(topWidth, bottomWidth) / 2 - lineLength)
                            : align == 'right'
                                // 右对齐布局
                                ? (x 
                                    - (topWidth < bottomWidth ? (bottomWidth - topWidth) : 0)
                                    - lineLength
                                )
                                // 左对齐布局
                                : (location.x - lineLength);
                    }
                    break;
                default:
                    // 右侧文本
                    if (lineLength === 'auto') {
                        return location.x + location.width + 10;
                    }
                    else {
                        return align == 'center'
                            // 居中布局
                            ? (location.centerX + Math.max(topWidth, bottomWidth) / 2 + lineLength)
                            : align == 'right'
                                // 右对齐布局
                                ? (location.x + location.width + lineLength)
                                // 左对齐布局
                                : (x + Math.max(topWidth, bottomWidth) + lineLength);
                    }
            }
        },
        
        _getLabelLineStartPoint: function(x, location, topWidth, bottomWidth, align) {
            return align == 'center'
                   ? location.centerX 
                   : topWidth < bottomWidth
                     ? (x + Math.min(topWidth, bottomWidth) / 2)
                     : (x + Math.max(topWidth, bottomWidth) / 2);
        },

        /**
         * 返回特定状态（normal or emphasis）下是否需要显示label标签文本
         * @param {Object} serie
         * @param {Object} data
         * @param {boolean} isEmphasis true is 'emphasis' and false is 'normal'
         */
        _needLabel: function (serie, data, isEmphasis) {
            return this.deepQuery(
                [data, serie],
                'itemStyle.'
                + (isEmphasis ? 'emphasis' : 'normal')
                + '.label.show'
            );
        },

        /**
         * 返回特定状态（normal or emphasis）下是否需要显示labelLine标签视觉引导线
         * @param {Object} serie
         * @param {Object} data
         * @param {boolean} isEmphasis true is 'emphasis' and false is 'normal'
         */
        _needLabelLine: function (serie, data, isEmphasis) {
            return this.deepQuery(
                [data, serie],
                'itemStyle.'
                + (isEmphasis ? 'emphasis' : 'normal')
                +'.labelLine.show'
            );
        },
        
        /**
         * 刷新
         */
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            
            this.backupShapeList();
            this._buildShape();
        }
    };
    
    zrUtil.inherits(Funnel, ChartBase);
    zrUtil.inherits(Funnel, ComponentBase);
    
    // 图表注册
    require('../chart').define('funnel', Funnel);
    
    return Funnel;
});