/**
 * echarts组件：图例
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表参数
     * @param {Object=} selected 用于状态保持
     */
    function Legend(messageCenter, zr, option, selected) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');
        var zrArea = require('zrender/tool/area');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_LEGEND;

        var legendOption;                       // 图例选项，共享数据源
        var _zlevelBase = self.getZlevelBase();

        var _itemGroupLocation = {};    // 图例元素组的位置参数，通过计算所得x, y, width, height

        var _colorIndex = 0;
        var _colorMap = {};
        var _selectedMap = {};


        function _buildShape() {
            _itemGroupLocation = _getItemGroupLocation();

            _buildBackground();
            _buildItem();

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建所有图例元素
         */
        function _buildItem() {
            var data = legendOption.data;
            var dataLength = data.length;
            var itemName;
            var itemType;
            var itemShape;
            var textShape;
            var font = self.getFont(legendOption.textStyle);

            var zrWidth = zr.getWidth();
            var lastX = _itemGroupLocation.x;
            var lastY = _itemGroupLocation.y;
            var itemWidth = legendOption.itemWidth;
            var itemHeight = legendOption.itemHeight;
            var itemGap = legendOption.itemGap;
            var color;

            if (legendOption.orient == 'vertical'
                && legendOption.x == 'right'
            ) {
                lastX = _itemGroupLocation.x
                        + _itemGroupLocation.width
                        - itemWidth;
            }

            for (var i = 0; i < dataLength; i++) {
                itemName = data[i];
                itemType = _getSeriesByName(itemName);
                if (itemType) {
                    itemType = itemType.type;
                } else {
                    itemType = '';
                }
                color = getColor(itemName);

                if (legendOption.orient == 'horizontal') {
                    if (zrWidth - lastX < 200   // 最后200px做分行预判
                        && (itemWidth + 5
                         + zrArea.getTextWidth(itemName, font)
                         + itemGap)
                        >= zrWidth - lastX
                    ) {
                        lastX = 0;
                        lastY += itemHeight + itemGap;
                    }
                }

                // 图形
                itemShape = _getItemShapeByType(
                    lastX, lastY,
                    itemWidth, itemHeight,
                    (_selectedMap[itemName]
                     ? color : '#ccc'),
                    itemType,
                    _selectedMap[itemName]
                );
                itemShape._name = itemName;
                itemShape.onclick = _legendSelected;
                self.shapeList.push(itemShape);

                // 文字
                textShape = {
                    shape : 'text',
                    zlevel : _zlevelBase,
                    style : {
                        x : lastX + itemWidth + 5,
                        y : lastY,
                        color : _selectedMap[itemName]
                                ? legendOption.textStyle.color
                                : '#ccc',
                        text: itemName,
                        textFont: font,
                        textBaseline: 'top'
                    },
                    clickable : true
                };

                if (legendOption.orient == 'vertical'
                    && legendOption.x == 'right'
                ) {
                    textShape.style.x -= (itemWidth + 10);
                    textShape.style.textAlign = 'right';
                }

                textShape._name = itemName;
                textShape.onclick = _legendSelected;
                self.shapeList.push(textShape);

                if (legendOption.orient == 'horizontal') {
                    lastX += itemWidth + 5
                             + zrArea.getTextWidth(itemName, font)
                             + itemGap;
                }
                else {
                    lastY += itemHeight + itemGap;
                }
            }
        }

        function _buildBackground() {
            var pTop = legendOption.padding[0];
            var pRight = legendOption.padding[1];
            var pBottom = legendOption.padding[2];
            var pLeft = legendOption.padding[3];

            self.shapeList.push({
                shape : 'rectangle',
                zlevel : _zlevelBase,
                hoverable :false,
                style : {
                    x : _itemGroupLocation.x - pLeft,
                    y : _itemGroupLocation.y - pTop,
                    width : _itemGroupLocation.width + pLeft + pRight,
                    height : _itemGroupLocation.height + pTop + pBottom,
                    brushType : legendOption.borderWidth === 0
                                ? 'fill' : 'both',
                    color : legendOption.backgroundColor,
                    strokeColor : legendOption.borderColor,
                    lineWidth : legendOption.borderWidth
                }
            });
        }

        /**
         * 根据选项计算图例实体的位置坐标
         */
        function _getItemGroupLocation() {
            var data = legendOption.data;
            var dataLength = data.length;
            var itemGap = legendOption.itemGap;
            var itemWidth = legendOption.itemWidth + 5; // 5px是图形和文字的间隔，不可配
            var itemHeight = legendOption.itemHeight;
            var font = self.getFont(legendOption.textStyle);
            var totalWidth = 0;
            var totalHeight = 0;

            if (legendOption.orient == 'horizontal') {
                // 水平布局，计算总宽度
                for (var i = 0; i < dataLength; i++) {
                    totalWidth += itemWidth
                                  + zrArea.getTextWidth(
                                        data[i],
                                        font
                                    )
                                  + itemGap;
                }
                totalWidth -= itemGap;      // 减去最后一个的itemGap
                totalHeight = itemHeight;
            }
            else {
                // 垂直布局，计算总高度
                totalHeight = (itemHeight + itemGap) * dataLength;
                totalHeight -= itemGap;     // 减去最后一个的itemGap;
                var maxWidth = 0;
                for (var i = 0; i < dataLength; i++) {
                    maxWidth = Math.max(
                        maxWidth,
                        zrArea.getTextWidth(
                            data[i],
                            font
                        )
                    );
                }
                totalWidth = itemWidth + maxWidth;
            }

            var x;
            var zrWidth = zr.getWidth();
            switch (legendOption.x) {
                case 'center' :
                    x = Math.floor((zrWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = legendOption.padding[3] + legendOption.borderWidth;
                    break;
                case 'right' :
                    x = zrWidth
                        - totalWidth
                        - legendOption.padding[1]
                        - legendOption.borderWidth;
                    break;
                default :
                    x = legendOption.x - 0;
                    break;
            }

            var y;
            var zrHeight = zr.getHeight();
            switch (legendOption.y) {
                case 'top' :
                    y = legendOption.padding[0] + legendOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - legendOption.padding[2]
                        - legendOption.borderWidth;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = legendOption.y - 0;
                    break;
            }

            // 水平布局的横向超长自动分行，纵布局超长不考虑
            if (legendOption.orient == 'horizontal' && totalWidth > zrWidth) {
                totalWidth = zrWidth;
                if (x < 0) {
                    x = 0;
                }
                totalHeight += totalHeight + 10;
            }


            return {
                x : x,
                y : y,
                width : totalWidth,
                height : totalHeight
            };
        }

        /**
         * 根据名称返回series数据
         */
        function _getSeriesByName(name) {
            var series = option.series;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].name == name) {
                    // 系列名称优先
                    return series[i];
                }

                if (series[i].type == ecConfig.CHART_TYPE_PIE) {
                    // 饼图得查找里面的数据名字
                    var hasFind = false;
                    var data = series[i].data;
                    for (var j = 0, k = data.length; j < k; j++) {
                        if (data[j].name == name) {
                            hasFind = true;
                            break;
                        }
                    }
                    if (hasFind) {
                        return series[i];
                    }
                }
            }
            return;
        }

        function _getItemShapeByType(x, y, width, height, color, itemType) {
            switch (itemType) {
                case 'line' :
                    return {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        style : {
                            xStart : x,
                            yStart : y + height / 2,
                            xEnd : x + width,
                            yEnd : y + height / 2,
                            strokeColor : color,
                            lineWidth : 5
                        },
                        clickable : true
                    };
                case 'pie' :
                    return {
                        shape : 'sector',
                        zlevel : _zlevelBase,
                        style : {
                            x : x + width / 2,
                            y : y + height + 2,
                            r : height + 2,
                            r0 : 6,
                            startAngle : 45,
                            endAngle : 135,
                            color : color
                        },
                        clickable : true
                    };
                default :
                    return {
                        shape : 'rectangle',
                        zlevel : _zlevelBase,
                        style : {
                            x : x,
                            y : y + 1,
                            width : width,
                            height : height - 2,
                            color : color
                        },
                        clickable : true
                    };
            }
        }

        function _legendSelected(param) {
            var itemName = param.target._name;
            _selectedMap[itemName] = !_selectedMap[itemName];
            messageCenter.dispatch(
                ecConfig.EVENT.LEGEND_SELECTED,
                param.event,
                {selected : _selectedMap}
            );
        }

        function init(newOption) {
            if (!self.deepQuery([newOption], 'legend.data')) {
                return;
            }

            option = newOption;

            option.legend = self.reformOption(option.legend);
            // 补全padding属性
            option.legend.padding = self.reformCssArray(
                option.legend.padding
            );

            legendOption = option.legend;

            self.clear();

            _selectedMap = {};

            var data = legendOption.data || [];
            var finalData = [];
            var itemName;
            var serie;
            var color;
            for (var i = 0, dataLength = data.length; i < dataLength; i++) {
                itemName = data[i];
                serie = _getSeriesByName(itemName);
                if (!serie) {
                    continue;
                } else {
                    finalData.push(data[i]);
                    color = self.deepQuery(
                        [serie], 'itemStyle.normal.color'
                    );
                    if (color) {
                        setColor(itemName, color);
                    }
                    _selectedMap[itemName] = true;
                }
            }
            if (finalData.length > 0) {
                legendOption.data = finalData;
                if (selected) {
                    for (var k in selected) {
                        _selectedMap[k] = selected[k];
                    }
                }
                _buildShape();
            }
        }

        /**
         * 刷新
         */
        function refresh() {
            legendOption = option.legend;
            self.clear();
            _buildShape();
        }

        function setColor(legendName, color) {
            _colorMap[legendName] = color;
        }

        function getColor(legendName) {
            if (!_colorMap[legendName]) {
                _colorMap[legendName] = zr.getColor(_colorIndex++);
            }
            return _colorMap[legendName];
        }

        function add(name,color){
            legendOption.data.push(name);
            setColor(name,color);
            _selectedMap[name] = true;
        }

        function del(name){
            var data = legendOption.data;
            var finalData = [];
            var found = false;
            for (var i = 0, dataLength = data.length; i < dataLength; i++) {
                if (found || data[i] != name) {
                    finalData.push(data[i]);
                } else {
                    found = true;
                    continue;
                }
            }
            legendOption.data = finalData;
        }

        function isSelected(itemName) {
            if (typeof _selectedMap[itemName] != 'undefined') {
                return _selectedMap[itemName];
            }
            else {
                // 没在legend里定义的都为true啊~
                return true;
            }
        }

        self.init = init;
        self.refresh = refresh;
        self.setColor = setColor;
        self.getColor = getColor;
        self.add = add;
        self.del = del;
        self.isSelected = isSelected;

        init(option);
    }

    return Legend;
});


