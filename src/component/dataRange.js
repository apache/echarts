/**
 * echarts组件：值域
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
    function DataRange(messageCenter, zr, option) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');
        var zrArea = require('zrender/tool/area');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_DATARANGE;

        var dataRangeOption;                       // 值域选项，共享数据源
        var _zlevelBase = self.getZlevelBase();

        var _itemGroupLocation = {};    // 值域元素组的位置参数，通过计算所得x, y, width, height
        var _calculableLocation;        // 可计算元素的位置缓存
        
        var _startShape;
        var _startMask;
        var _endShape;
        var _endMask;
        var _fillerShae;
        var _range;
        var _syncTicket;

        var _textGap = 10; // 非值文字间隔
        var _gap;
        var _colorList;
        var _valueTextList;

        var _selectedMap = {};

        function _buildShape() {
            _itemGroupLocation = _getItemGroupLocation();
//            console.log(_itemGroupLocation);
            _buildBackground();
            if (dataRangeOption.splitNumber <= 0 
                || dataRangeOption.calculable
            ) {
                _buildGradient();
            }
            else {
                _buildItem();
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建图例型的值域元素
         */
        function _buildItem() {
            var data = _valueTextList;
            var dataLength = data.length;
            var itemName;
            var itemShape;
            var textShape;
            var font = self.getFont(dataRangeOption.textStyle);

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
            if (dataRangeOption.text) {
                needValueText = false;
                // 第一个文字
                if (dataRangeOption.text[0]) {
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
            }

            for (var i = 0; i < dataLength; i++) {
                itemName = data[i];
                color = getColor((dataLength - i) * _gap + dataRangeOption.min);
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
            
            if (!needValueText && dataRangeOption.text[1]) {
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
 
        /**
         * 构建渐变型的值域元素 
         */
        function _buildGradient() {
            var itemShape;
            var textShape;
            var font = self.getFont(dataRangeOption.textStyle);

            var lastX = _itemGroupLocation.x;
            var lastY = _itemGroupLocation.y;
            var itemWidth = dataRangeOption.itemWidth;
            var itemHeight = dataRangeOption.itemHeight;
            var textHeight = zrArea.getTextWidth('国', font);

            
            var needValueText = true;
            if (dataRangeOption.text) {
                needValueText = false;
                // 第一个文字
                if (dataRangeOption.text[0]) {
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
            }
            
            var zrColor = require('zrender/tool/color');
            var per = 1 / (dataRangeOption.color.length - 1);
            var colorList = [];
            for (var i = 0, l = dataRangeOption.color.length; i < l; i++) {
                colorList.push([i * per, dataRangeOption.color[i]]);
            }
            if (dataRangeOption.orient == 'horizontal') {
                itemShape = {
                    shape : 'rectangle',
                    zlevel : _zlevelBase,
                    style : {
                        x : lastX,
                        y : lastY,
                        width : itemWidth * 10,
                        height : itemHeight,
                        color : zrColor.getLinearGradient(
                            lastX, lastY, lastX + itemWidth * 10, lastY,
                            colorList
                        )
                    },
                    hoverable : false
                };
                lastX += itemWidth * 10 + _textGap;
            }
            else {
                itemShape = {
                    shape : 'rectangle',
                    zlevel : _zlevelBase,
                    style : {
                        x : lastX,
                        y : lastY,
                        width : itemWidth,
                        height : itemHeight * 10,
                        color : zrColor.getLinearGradient(
                            lastX, lastY, lastX, lastY + itemHeight * 10,
                            colorList
                        )
                    },
                    hoverable : false
                };
                lastY += itemHeight * 10 + _textGap;
            }
            self.shapeList.push(itemShape);
            if (dataRangeOption.calculable) {
                _calculableLocation = itemShape.style;
                _buildFiller();
                _bulidMask();
                _bulidHandle();
            }
            
            if (!needValueText && dataRangeOption.text[1]) {
                // 最后一个文字
                textShape = _getTextShape(
                    lastX, lastY, dataRangeOption.text[1]
                );

                self.shapeList.push(textShape);
            }
        }
        
        /**
         * 构建填充物
         */
        function _buildFiller() {
            _fillerShae = {
                shape : 'rectangle',
                zlevel : _zlevelBase + 1,
                style : {
                    x : _calculableLocation.x,
                    y : _calculableLocation.y,
                    width : _calculableLocation.width,
                    height : _calculableLocation.height,
                    color : 'rgba(255,255,255,0.2)'
                },
                draggable : true,
                ondrift : _ondrift,
                ondragend : _ondragend,
                _type : 'filler'
            };

            self.shapeList.push(_fillerShae);
        }
        
        /**
         * 构建拖拽手柄
         */
        function _bulidHandle() {
            var x = _calculableLocation.x;
            var y = _calculableLocation.y;
            var width = _calculableLocation.width;
            var height = _calculableLocation.height;
            
            var font = self.getFont(dataRangeOption.textStyle);
            var textHieght = zrArea.getTextWidth('国', font) + 2;
            var textWidth = Math.max(
                    zrArea.getTextWidth(
                        dataRangeOption.precision === 0
                        ? dataRangeOption.max
                        : dataRangeOption.max.toFixed(
                            dataRangeOption.precision
                          ),
                        font),
                    zrArea.getTextWidth(
                        dataRangeOption.precision === 0
                        ? dataRangeOption.min
                        : dataRangeOption.min.toFixed(
                            dataRangeOption.precision
                          ), 
                        font
                    )
                ) + 2;
                            
            var pointListStart;
            var textXStart;
            var textYStart;
            var pointListEnd;
            var textXEnd;
            var textYEnd;
            if (dataRangeOption.orient == 'horizontal') {
                // 水平
                if (dataRangeOption.y != 'bottom') {
                    // 手柄统统在下方
                    pointListStart = [
                        [x, y],
                        [x, y + height + textHieght / 2 * 3],
                        [x - textWidth, y + height + textHieght / 2 * 3],
                        [x - textWidth, y + height + textHieght / 2],
                        [x - textHieght / 2, y + height + textHieght / 2],
                        [x - 1, y + height],
                        [x - 1, y]
                        
                    ];
                    textXStart = x - textWidth / 2;
                    textYStart = y + height + textHieght;
                    
                    pointListEnd = [
                        [x + width, y],
                        [x + width, y + height + textHieght / 2 * 3],
                        [x + width + textWidth, y + height + textHieght/2*3],
                        [x + width + textWidth, y + height + textHieght / 2],
                        [x + width + textHieght / 2, y + height + textHieght/2],
                        [x + width + 1, y + height],
                        [x + width + 1, y]
                    ];
                    textXEnd = x + width + textWidth / 2;
                    textYEnd = textYStart;
                }
                else {
                    // 手柄在上方
                    pointListStart = [
                        [x, y + height],
                        [x, y - textHieght / 2 * 3],
                        [x - textWidth, y - textHieght / 2 * 3],
                        [x - textWidth, y - textHieght / 2],
                        [x - textHieght / 2, y - textHieght / 2],
                        [x - 1, y],
                        [x - 1, y + height]
                        
                    ];
                    textXStart = x - textWidth / 2;
                    textYStart = y - textHieght;
                    
                    pointListEnd = [
                        [x + width, y + height],
                        [x + width, y - textHieght / 2 * 3],
                        [x + width + textWidth, y - textHieght / 2 * 3],
                        [x + width + textWidth, y - textHieght / 2],
                        [x  + width + textHieght / 2, y - textHieght / 2],
                        [x + width + 1, y],
                        [x + width + 1, y + height]
                    ];
                    textXEnd = x + width + textWidth / 2;
                    textYEnd = textYStart;
                }
            }
            else {
                textWidth += textHieght;
                // 垂直
                if (dataRangeOption.x != 'right') {
                    // 手柄统统在右侧
                    pointListStart = [
                        [x, y],
                        [x + width + textWidth, y],
                        [x + width + textWidth, y - textHieght],
                        [x + width + textHieght, y - textHieght],
                        [x + width, y - 1],
                        [x, y - 1]
                    ];
                    textXStart = x + width + textWidth / 2 + textHieght / 2;
                    textYStart = y - textHieght / 2;
                    
                    pointListEnd = [
                        [x, y + height],
                        [x + width + textWidth, y + height],
                        [x + width + textWidth, y + textHieght + height],
                        [x + width + textHieght, y + textHieght + height],
                        [x + width, y + 1 + height],
                        [x, y + height + 1]
                    ];
                    textXEnd = textXStart;
                    textYEnd = y  + height + textHieght / 2;
                }
                else {
                    // 手柄在左侧
                    pointListStart = [
                        [x + width, y],
                        [x - textWidth, y],
                        [x - textWidth, y - textHieght],
                        [x - textHieght, y - textHieght],
                        [x, y - 1],
                        [x + width, y - 1]
                    ];
                    textXStart = x - textWidth / 2 - textHieght / 2;
                    textYStart = y - textHieght / 2;
                    
                    pointListEnd = [
                        [x + width, y + height],
                        [x - textWidth, y + height],
                        [x - textWidth, y + textHieght + height],
                        [x - textHieght, y + textHieght + height],
                        [x, y + 1 + height],
                        [x + width, y + height + 1]
                    ];
                    textXEnd = textXStart;
                    textYEnd = y  + height + textHieght / 2;
                }
            }
            
            _startShape = {
                shape : 'polygon',
                zlevel : _zlevelBase + 1,
                style : {
                    pointList : pointListStart,
                    text : dataRangeOption.max + '',
                    textX : textXStart,
                    textY : textYStart,
                    textPosition : 'specific',
                    textAlign : 'center',
                    textBaseline : 'middle ',
                    textColor: dataRangeOption.textStyle.color,
                    color : getColor(dataRangeOption.max),
                    width : 0,                 // for ondrif计算统一
                    height : 0,
                    x : pointListStart[0][0],
                    y : pointListStart[0][1],
                    _x : pointListStart[0][0],   // 拖拽区域控制缓存
                    _y : pointListStart[0][1]
                },
                draggable : true,
                ondrift : _ondrift,
                ondragend : _ondragend
            };
            
            _endShape = {
                shape : 'polygon',
                zlevel : _zlevelBase + 1,
                style : {
                    pointList : pointListEnd,
                    text : dataRangeOption.min + '',
                    textX : textXEnd,
                    textY : textYEnd,
                    textPosition : 'specific',
                    textAlign : 'center',
                    textBaseline : 'middle ',
                    textColor: dataRangeOption.textStyle.color,
                    color : getColor(dataRangeOption.min),
                    width : 0,                 // for ondrif计算统一
                    height : 0,
                    x : pointListEnd[0][0],
                    y : pointListEnd[0][1],
                    _x : pointListEnd[0][0],   // 拖拽区域控制缓存
                    _y : pointListEnd[0][1]
                },
                draggable : true,
                ondrift : _ondrift,
                ondragend : _ondragend
            };
            self.shapeList.push(_startShape);
            self.shapeList.push(_endShape);
        }
        
        function _bulidMask() {
            var x = _calculableLocation.x;
            var y = _calculableLocation.y;
            var width = _calculableLocation.width;
            var height = _calculableLocation.height;
            _startMask = {
                shape : 'rectangle',
                zlevel : _zlevelBase + 1,
                style : {
                    x : x,
                    y : y,
                    width : dataRangeOption.orient == 'horizontal'
                            ? 0 : width,
                    height : dataRangeOption.orient == 'horizontal'
                             ? height : 0,
                    color : '#ccc'
                },
                hoverable:false
            };
            _endMask = {
                shape : 'rectangle',
                zlevel : _zlevelBase + 1,
                style : {
                    x : dataRangeOption.orient == 'horizontal'
                        ? x + width : x,
                    y : dataRangeOption.orient == 'horizontal'
                        ? y : y + height,
                    width : dataRangeOption.orient == 'horizontal'
                            ? 0 : width,
                    height : dataRangeOption.orient == 'horizontal'
                             ? height : 0,
                    color : '#ccc'
                },
                hoverable:false
            };
            self.shapeList.push(_startMask);
            self.shapeList.push(_endMask);
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
                if (dataRangeOption.text 
                    || dataRangeOption.splitNumber <= 0
                    || dataRangeOption.calculable
                ) {
                    // 指定文字或线性渐变
                    totalWidth = 
                        ((dataRangeOption.splitNumber <= 0
                          || dataRangeOption.calculable)
                          ? (itemWidth * 10 + itemGap)
                          : dataLength * (itemWidth + itemGap))
                        + (dataRangeOption.text 
                           && typeof dataRangeOption.text[0] != 'undefined'
                           ? (zrArea.getTextWidth(
                                  dataRangeOption.text[0],
                                  font
                              ) + _textGap)
                           : 0)
                        + (dataRangeOption.text
                           && typeof dataRangeOption.text[1] != 'undefined'
                           ? (zrArea.getTextWidth(
                                  dataRangeOption.text[1],
                                  font
                              ) + _textGap)
                           : 0);
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
                var maxWidth;
                if (dataRangeOption.text
                    || dataRangeOption.splitNumber <= 0
                    || dataRangeOption.calculable
                ) {
                    // 指定文字或线性渐变
                    totalHeight =
                        ((dataRangeOption.splitNumber <= 0
                          || dataRangeOption.calculable)
                          ? (itemHeight * 10 + itemGap)
                          : dataLength * (itemHeight + itemGap))
                        + (dataRangeOption.text
                           && typeof dataRangeOption.text[0] != 'undefined'
                            ? (_textGap + textHeight)
                            : 0)
                        + (dataRangeOption.text
                           && typeof dataRangeOption.text[1] != 'undefined'
                            ? (_textGap + textHeight)
                            : 0);
                       
                    maxWidth = Math.max(
                        zrArea.getTextWidth(
                            (dataRangeOption.text && dataRangeOption.text[0])
                            || '',
                            font
                        ),
                        zrArea.getTextWidth(
                            (dataRangeOption.text && dataRangeOption.text[1])
                            || '',
                            font
                        )
                    );
                    totalWidth = Math.max(itemWidth, maxWidth);
                }
                else {
                    totalHeight = (itemHeight + itemGap) * dataLength;
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
                totalHeight -= itemGap;     // 减去最后一个的itemGap;
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
                    x = isNaN(x) ? 0 : x;
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
                    y = isNaN(y) ? 0 : y;
                    break;
            }
            
            if (dataRangeOption.calculable) {
                // 留出手柄控件
                var handlerWidth = Math.max(
                    zrArea.getTextWidth(dataRangeOption.max, font),
                    zrArea.getTextWidth(dataRangeOption.min, font)
                );
                if (dataRangeOption.orient == 'horizontal') {
                    if (x < handlerWidth) {
                        x = handlerWidth + 5;
                    }
                    if (x + totalWidth + handlerWidth > zrWidth) {
                        x -= handlerWidth + 5;
                    }
                }
                else {
                    if (y < textHeight) {
                        y = textHeight + 5;
                    }
                    if (y + totalHeight + textHeight > zrHeight) {
                        y -= textHeight + 5;
                    }
                }
            }

            return {
                x : x,
                y : y,
                width : totalWidth,
                height : totalHeight
            };
        }

        // 指定文本
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
            };
        }

        // 色尺legend item shape
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

        /**
         * 拖拽范围控制
         */
        function _ondrift(e, dx, dy) {
            var x = _calculableLocation.x;
            var y = _calculableLocation.y;
            var width = _calculableLocation.width;
            var height = _calculableLocation.height;
            
            if (dataRangeOption.orient == 'horizontal') {
                if (e.style.x + dx <= x) {
                    e.style.x = x;
                }
                else if (e.style.x + dx + e.style.width >= x + width) {
                    e.style.x = x + width - e.style.width;
                }
                else {
                    e.style.x += dx;
                }
            }
            else {
                if (e.style.y + dy <= y) {
                    e.style.y = y;
                }
                else if (e.style.y + dy + e.style.height >= y + height) {
                    e.style.y = y + height - e.style.height;
                }
                else {
                    e.style.y += dy;
                }
            }

            if (e._type == 'filler') {
                _syncHandleShape();
            }
            else {
                //e.position = [e.style.x - e.style._x, e.style.y - e.style._y];
                _syncFillerShape(e);
            }
            
            if (dataRangeOption.realtime) {
                _syncData();
            }
            else {
                clearTimeout(_syncTicket);
                _syncTicket = setTimeout(_syncData, 200);
            }

            return true;
        }
        
        function _ondragend() {
            self.isDragend = true;
        }

        /**
         * 数据项被拖拽出去
         */
        function ondragend(param, status) {
            if (!self.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

             _syncData();

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.dragIn = true;
            
            if (!dataRangeOption.realtime) {
                messageCenter.dispatch(ecConfig.EVENT.DATA_RANGE);
            }
            
            status.needRefresh = false; // 会有消息触发fresh，不用再刷一遍
            // 处理完拖拽事件后复位
            self.isDragend = false;

            return;
        }
        
        
        function _syncHandleShape() {
            var x = _calculableLocation.x;
            var y = _calculableLocation.y;
            var width = _calculableLocation.width;
            var height = _calculableLocation.height;
            
            if (dataRangeOption.orient == 'horizontal') {
                _startShape.style.x = _fillerShae.style.x;
                _startMask.style.width = _startShape.style.x - x;
                
                _endShape.style.x = _fillerShae.style.x
                                    + _fillerShae.style.width;
                _endMask.style.x = _endShape.style.x;
                _endMask.style.width = x + width - _endShape.style.x;
                
                _range.start = Math.ceil(
                    100 - (_startShape.style.x - x) / width * 100
                );
                _range.end = Math.floor(
                    100 - (_endShape.style.x - x) / width * 100
                );
            }
            else {
                _startShape.style.y = _fillerShae.style.y;
                _startMask.style.height = _startShape.style.y - y;
                
                _endShape.style.y = _fillerShae.style.y
                                    + _fillerShae.style.height;
                _endMask.style.y = _endShape.style.y;
                _endMask.style.height = y + height - _endShape.style.y;
                
                _range.start = Math.ceil(
                    100 - (_startShape.style.y - y) / height * 100
                );
                _range.end = Math.floor(
                    100 - (_endShape.style.y - y) / height * 100
                );
            }
            
            _syncShape(false);
        }

        function _syncFillerShape(e) {
            var x = _calculableLocation.x;
            var y = _calculableLocation.y;
            var width = _calculableLocation.width;
            var height = _calculableLocation.height;
            
            var a;
            var b;
            if (dataRangeOption.orient == 'horizontal') {
                a = _startShape.style.x;
                b = _endShape.style.x;
                if (e.id == _startShape.id && a >= b) {
                    // _startShape触发
                    b = a;
                    _endShape.style.x = a;
                }
                else if (e.id == _endShape.id && a >= b) {
                    // _endShape触发
                    a = b;
                    _startShape.style.x = a;
                }
                _fillerShae.style.x = a;
                _fillerShae.style.width = b - a;
                _startMask.style.width = a - x;
                _endMask.style.x = b;
                _endMask.style.width = x + width - b;
                
                _range.start = Math.ceil(100 - (a - x) / width * 100);
                _range.end = Math.floor(100 - (b - x) / width * 100);
            }
            else {
                a = _startShape.style.y;
                b = _endShape.style.y;
                if (e.id == _startShape.id && a >= b) {
                    // _startShape触发
                    b = a;
                    _endShape.style.y = a;
                }
                else if (e.id == _endShape.id && a >= b) {
                    // _endShape触发
                    a = b;
                    _startShape.style.y = a;
                }
                _fillerShae.style.y = a;
                _fillerShae.style.height = b - a;
                _startMask.style.height = a - y;
                _endMask.style.y = b;
                _endMask.style.height = y + height - b;
                
                _range.start = Math.ceil(100 - (a - y) / height * 100);
                _range.end = Math.floor(100 - (b - y) / height * 100);
            }
            
            _syncShape(true);
        }
        
        function _syncShape(needFiller) {
            _startShape.position = [
                _startShape.style.x - _startShape.style._x,
                _startShape.style.y - _startShape.style._y
            ];
            
            if (dataRangeOption.precision === 0) {
                _startShape.style.text = Math.round(
                    _gap * _range.start + dataRangeOption.min
                ) + '';
            } else {
                _startShape.style.text =(
                    _gap * _range.start + dataRangeOption.min
                ).toFixed(dataRangeOption.precision);
            }
            _startShape.style.color = getColor(
                _gap * _range.start + dataRangeOption.min
            );
            
            zr.modShape(_startShape.id, _startShape);
            
            _endShape.position = [
                _endShape.style.x - _endShape.style._x,
                _endShape.style.y - _endShape.style._y
            ];
            
            if (dataRangeOption.precision === 0) {
                _endShape.style.text = Math.round(
                    _gap * _range.end + dataRangeOption.min
                ) + '';
            } else {
                _endShape.style.text = (
                    _gap * _range.end + dataRangeOption.min
                ).toFixed(dataRangeOption.precision);
            }
            _endShape.style.color = getColor(
                _gap * _range.end + dataRangeOption.min
            );
            zr.modShape(_endShape.id, _endShape);

            zr.modShape(_startMask.id, _startMask);
            zr.modShape(_endMask.id, _endMask);
            
            needFiller && zr.modShape(_fillerShae.id, _fillerShae);
             
            zr.refresh();
        }

        function _syncData() {
            if (dataRangeOption.realtime) {
                messageCenter.dispatch(ecConfig.EVENT.DATA_RANGE);
            }
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
            var splitNumber = dataRangeOption.splitNumber <= 0 
                              || dataRangeOption.calculable
                              ? 100
                              : dataRangeOption.splitNumber;
            _colorList = zrColor.getGradientColors(
                dataRangeOption.color,
                (splitNumber - dataRangeOption.color.length)
                / (dataRangeOption.color.length - 1) + 1
            );
            _colorList = _colorList.slice(0, splitNumber);
            //console.log(_colorList.length)
            
            if (dataRangeOption.precision === 0) {
                _gap = Math.round(
                    (dataRangeOption.max - dataRangeOption.min)
                    / splitNumber
                ) || 1;
            } else {
                _gap = (dataRangeOption.max - dataRangeOption.min)
                        / splitNumber;
                _gap = _gap.toFixed(dataRangeOption.precision) - 0;
            }
            
            _valueTextList = [];
            for (var i = 0; i < splitNumber; i++) {
                _selectedMap[i] = true;
                _valueTextList.unshift(
                    (i * _gap + dataRangeOption.min).toFixed(
                        dataRangeOption.precision
                    )
                    + ' - ' 
                    + ((i + 1) * _gap + dataRangeOption.min).toFixed(
                        dataRangeOption.precision
                    )
                );
            }
            
            _range = {
                start: 100,
                end: 0
            };
            // console.log(_valueTextList,_gap);
            // console.log(_colorList);
            
            _buildShape();
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                option.dataRange = self.reformOption(option.dataRange);
                // 补全padding属性
                option.dataRange.padding = self.reformCssArray(
                    option.dataRange.padding
                );
            }
            dataRangeOption = option.dataRange;
            _range = {
                start: 100,
                end: 0
            };
            self.clear();
            _buildShape();
        }

        function getColor(value) {
            if (isNaN(value)) {
                return null;
            }
            
            if (value < dataRangeOption.min) {
                value = dataRangeOption.min;
            }
            else if (value > dataRangeOption.max) {
                value = dataRangeOption.max;
            }
            
            if (dataRangeOption.calculable) {
                if (value > _gap * _range.start + dataRangeOption.min
                    || value < _gap * _range.end + dataRangeOption.min) {
                     return null;
                }
            }
            
            var idx = _colorList.length - Math.ceil(
                (value - dataRangeOption.min) 
                / (dataRangeOption.max - dataRangeOption.min)
                * _colorList.length
            );
            if (idx == _colorList.length) {
                idx--;
            }
            //console.log(value, idx,_colorList[idx])
            if (_selectedMap[idx]) {
                return _colorList[idx];
            }
            else {
                return null;
            }
        }

        self.init = init;
        self.refresh = refresh;
        self.getColor = getColor;
        self.ondragend = ondragend;
        
        init(option);
    }

    require('../component').define('dataRange', DataRange);

    return DataRange;
});


