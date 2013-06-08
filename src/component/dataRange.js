/**
 * echarts组件：值域
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
    function DataRange(messageCenter, zr, option, selected) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');
        var zrArea = require('zrender/tool/area');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_DATARANGE;

        var dataRangeOption;                       // 值域选项，共享数据源
        var _zlevelBase = self.getZlevelBase();

        var _itemGroupLocation = {};    // 值域元素组的位置参数，通过计算所得x, y, width, height

        var _textGap = 10; // 非值文字间隔
        var _gap;
        var _colorList;
        var _valueTextList;

        var _selectedMap = {};

        function _buildShape() {
            _itemGroupLocation = _getItemGroupLocation();
//            console.log(_itemGroupLocation);
            _buildBackground();
            _buildItem();

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建所有值域元素
         */
        function _buildItem() {
            var data = _valueTextList;
            var dataLength = data.length;
            var itemName;
            var itemShape;
            var textShape;
            var font = self.getFont(dataRangeOption.textStyle);

            var zrWidth = zr.getWidth();
            var lastX = _itemGroupLocation.x;
            var lastY = _itemGroupLocation.y;
            var itemWidth = dataRangeOption.itemWidth;
            var itemHeight = dataRangeOption.itemHeight;
            var itemGap = dataRangeOption.itemGap;
            var textHeight = zrArea.getTextWidth('国', font);
            var color;

            if (dataRangeOption.orient == 'vertical'
                && dataRangeOption.x == 'right'
            ) {
                lastX = _itemGroupLocation.x
                        + _itemGroupLocation.width
                        - itemWidth;
            }
            var needValueText = true;
            if (dataRangeOption.text && dataRangeOption.text.length > 0) {
                needValueText = false;
                // 第一个文字
                textShape = _getTextShape(
                    lastX, lastY, dataRangeOption.text[0]
                );
                if (dataRangeOption.orient == 'horizontal') {
                    lastX += zrArea.getTextWidth(
                                 dataRangeOption.text[0],
                                 font
                             )
                             + _textGap;
                }
                else {
                    lastY += textHeight + _textGap;
                }
                self.shapeList.push(textShape);
            }

            for (var i = 0; i < dataLength; i++) {
                itemName = data[i];
                color = getColor((dataLength - i) * _gap);
                // 图形
                itemShape = _getItemShape(
                    lastX, lastY,
                    itemWidth, itemHeight,
                    (_selectedMap[i] ? color : '#ccc')
                );
                itemShape._idx = i;
                itemShape.onclick = _dataRangeSelected;
                self.shapeList.push(itemShape);
                
                if (needValueText) {
                    // 文字
                    textShape = {
                        shape : 'text',
                        zlevel : _zlevelBase,
                        style : {
                            x : lastX + itemWidth + 5,
                            y : lastY,
                            color : _selectedMap[i]
                                    ? dataRangeOption.textStyle.color
                                    : '#ccc',
                            text: data[i],
                            textFont: font,
                            textBaseline: 'top'
                        },
                        clickable : true
                    };
                    if (dataRangeOption.orient == 'vertical'
                        && dataRangeOption.x == 'right'
                    ) {
                        textShape.style.x -= (itemWidth + 10);
                        textShape.style.textAlign = 'right';
                    }
                    textShape._idx = i;
                    textShape.onclick = _dataRangeSelected;
                    self.shapeList.push(textShape);
                }

                if (dataRangeOption.orient == 'horizontal') {
                    lastX += itemWidth 
                             + (needValueText ? 5 : 0)
                             + (needValueText 
                               ? zrArea.getTextWidth(itemName, font)
                               : 0)
                             + itemGap;
                }
                else {
                    lastY += itemHeight + itemGap;
                }
            }
            
            if (!needValueText) {
                if (dataRangeOption.orient == 'horizontal') {
                    lastX = lastX - itemGap + _textGap;
                }
                else {
                    lastY = lastY - itemGap + _textGap;
                }
                // 最后一个文字
                textShape = _getTextShape(
                    lastX, lastY, dataRangeOption.text[1]
                );

                self.shapeList.push(textShape);
            }
        }

        function _buildBackground() {
            var pTop = dataRangeOption.padding[0];
            var pRight = dataRangeOption.padding[1];
            var pBottom = dataRangeOption.padding[2];
            var pLeft = dataRangeOption.padding[3];

            self.shapeList.push({
                shape : 'rectangle',
                zlevel : _zlevelBase,
                hoverable :false,
                style : {
                    x : _itemGroupLocation.x - pLeft,
                    y : _itemGroupLocation.y - pTop,
                    width : _itemGroupLocation.width + pLeft + pRight,
                    height : _itemGroupLocation.height + pTop + pBottom,
                    brushType : dataRangeOption.borderWidth === 0
                                ? 'fill' : 'both',
                    color : dataRangeOption.backgroundColor,
                    strokeColor : dataRangeOption.borderColor,
                    lineWidth : dataRangeOption.borderWidth
                }
            });
        }

        /**
         * 根据选项计算值域实体的位置坐标
         */
        function _getItemGroupLocation() {
            var data = _valueTextList;
            var dataLength = data.length;
            var itemGap = dataRangeOption.itemGap;
            var itemWidth = dataRangeOption.itemWidth;
            var itemHeight = dataRangeOption.itemHeight;
            var totalWidth = 0;
            var totalHeight = 0;
            var font = self.getFont(dataRangeOption.textStyle);
            var textHeight = zrArea.getTextWidth('国', font);

            if (dataRangeOption.orient == 'horizontal') {
                // 水平布局，计算总宽度
                if (dataRangeOption.text && dataRangeOption.text.length > 0) {
                    // 指定文字
                    totalWidth = dataLength * (itemWidth + itemGap) 
                                 + zrArea.getTextWidth(
                                     dataRangeOption.text[0],
                                     font
                                 )
                                 + zrArea.getTextWidth(
                                     dataRangeOption.text[1],
                                     font
                                 )
                                 + _textGap * 2;
                }
                else {
                    // 值标签
                    itemWidth += 5;
                    for (var i = 0; i < dataLength; i++) {
                        totalWidth += itemWidth
                                      + zrArea.getTextWidth(
                                            data[i],
                                            font
                                        )
                                      + itemGap;
                    }
                }
                totalWidth -= itemGap;      // 减去最后一个的itemGap
                totalHeight = Math.max(textHeight, itemHeight);
            }
            else {
                // 垂直布局，计算总高度
                totalHeight = (itemHeight + itemGap) * dataLength;
                totalHeight -= itemGap;     // 减去最后一个的itemGap;
                
                var maxWidth;
                if (dataRangeOption.text && dataRangeOption.text.length > 0) {
                    // 指定文字
                    totalHeight += (_textGap + textHeight) * 2;
                        
                    maxWidth = Math.max(
                        zrArea.getTextWidth(
                            dataRangeOption.text[0],
                            font
                        ),
                        zrArea.getTextWidth(
                            dataRangeOption.text[1],
                            font
                        )
                    );
                    totalWidth = Math.max(itemWidth, maxWidth);
                }
                else {
                    // 值标签
                    itemWidth += 5;
                    maxWidth = 0;
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
            }

            var x;
            var zrWidth = zr.getWidth();
            switch (dataRangeOption.x) {
                case 'center' :
                    x = Math.floor((zrWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = dataRangeOption.padding[3] 
                        + dataRangeOption.borderWidth;
                    break;
                case 'right' :
                    x = zrWidth
                        - totalWidth
                        - dataRangeOption.padding[1]
                        - dataRangeOption.borderWidth;
                    break;
                default :
                    x = dataRangeOption.x - 0;
                    break;
            }

            var y;
            var zrHeight = zr.getHeight();
            switch (dataRangeOption.y) {
                case 'top' :
                    y = dataRangeOption.padding[0] 
                        + dataRangeOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - dataRangeOption.padding[2]
                        - dataRangeOption.borderWidth;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = dataRangeOption.y - 0;
                    break;
            }

            return {
                x : x,
                y : y,
                width : totalWidth,
                height : totalHeight
            };
        }

        function _getTextShape(x, y, text) {
            return {
                shape : 'text',
                zlevel : _zlevelBase,
                style : {
                    x : (dataRangeOption.orient == 'horizontal'
                        ? x
                        : _itemGroupLocation.x 
                          + _itemGroupLocation.width / 2 
                        ),
                    y : (dataRangeOption.orient == 'horizontal'
                        ? _itemGroupLocation.y 
                          + _itemGroupLocation.height / 2
                        : y
                        ),
                    color : dataRangeOption.textStyle.color,
                    text: text,
                    textFont: self.getFont(dataRangeOption.textStyle),
                    textBaseline: (dataRangeOption.orient == 'horizontal'
                                   ? 'middle' : 'top'),
                    textAlign: (dataRangeOption.orient == 'horizontal'
                               ? 'left' : 'center')
                }
            }
        }
        
        function _getItemShape(x, y, width, height, color) {
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

        function _dataRangeSelected(param) {
            var idx = param.target._idx;
            _selectedMap[idx] = !_selectedMap[idx];
            messageCenter.dispatch(ecConfig.EVENT.REFRESH);
        }

        function init(newOption) {
            if (typeof self.deepQuery([newOption], 'dataRange.min') 
                == 'undefined'
                || typeof self.deepQuery([newOption], 'dataRange.max') 
                == 'undefined'
            ) {
                return;
            }

            option = newOption;

            option.dataRange = self.reformOption(option.dataRange);
            // 补全padding属性
            option.dataRange.padding = self.reformCssArray(
                option.dataRange.padding
            );

            dataRangeOption = option.dataRange;

            self.clear();

            _selectedMap = {};

            
            var zrColor = require('zrender/tool/color');
            _colorList = zrColor.getGradientColors(
                dataRangeOption.color,
                (dataRangeOption.splitNumber - dataRangeOption.color.length)
                / (dataRangeOption.color.length - 1) + 1
            );
            
            _gap = Math.round(
                (dataRangeOption.max - dataRangeOption.min)
                / (dataRangeOption.splitNumber - 1)
            );
            _valueTextList = [];
            for (var i = dataRangeOption.min; i <= dataRangeOption.max; i+= _gap){
                _selectedMap[_valueTextList.length] = true;
                _valueTextList.unshift(i + ' - ' + (i + _gap));
            }
           // console.log(_valueTextList,_gap);
           // console.log(_colorList);
            
            _buildShape();
        }

        /**
         * 刷新
         */
        function refresh() {
            dataRangeOption = option.dataRange;
            self.clear();
            _buildShape();
        }

        function getColor(value) {
            if (isNaN(value)) {
                return '#ccc';
            }
            
            var idx = _colorList.length - Math.ceil(value / _gap);
            if (idx < 0) {
                idx = 0;
            }
            
            if (_selectedMap[idx]) {
                return _colorList[idx];
            }
            else {
                return '#ccc'
            }
        }

        self.init = init;
        self.refresh = refresh;
        self.getColor = getColor;
        
        init(option);
    }

    return DataRange;
});


