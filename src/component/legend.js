/**
 * echarts组件：图例
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
    function Legend(ecConfig, messageCenter, zr, option, selected) {
        var Base = require('./base');
        Base.call(this, ecConfig, zr);

        var zrUtil = require('zrender/tool/util');
        var zrArea = require('zrender/tool/area');
        var zrColor = require('zrender/tool/color');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_LEGEND;

        var legendOption;                       // 图例选项，共享数据源
        var _zlevelBase = self.getZlevelBase();

        var _itemGroupLocation = {};    // 图例元素组的位置参数，通过计算所得x, y, width, height

        var _colorIndex = 0;
        var _colorMap = {};
        var _selectedMap = {};

        var icon = require('zrender/shape').get('icon');
        for (var k in legendIcon) {
            icon.define('legendicon' + k, legendIcon[k]);
            //console.log('legendicon' + k, legendIcon[k])
        }

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
            var textStyle  = legendOption.textStyle;
            var dataTextStyle;
            var dataFont;

            var zrWidth = zr.getWidth();
            var zrHeight = zr.getHeight();
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
                dataTextStyle = zrUtil.merge(
                    data[i].textStyle || {},
                    textStyle,
                    {'overwrite': false}
                );
                dataFont = self.getFont(dataTextStyle);
                
                itemName = data[i].name || data[i];
                if (itemName === '') {
                    if (legendOption.orient == 'horizontal') {
                        lastX = _itemGroupLocation.x;
                        lastY += itemHeight + itemGap;
                    }
                    else {
                        legendOption.x == 'right'
                        ? lastX -= _itemGroupLocation.maxWidth + itemGap
                        : lastX += _itemGroupLocation.maxWidth + itemGap;
                        lastY = _itemGroupLocation.y;
                    }
                    continue;
                }
                itemType = _getSomethingByName(itemName).type;
                
                color = getColor(itemName);

                if (legendOption.orient == 'horizontal') {
                    if (zrWidth - lastX < 200   // 最后200px做分行预判
                        && (itemWidth + 5
                            + zrArea.getTextWidth(
                                itemName, 
                                dataFont
                            )
                            // 分行的最后一个不用算itemGap
                            + (i == dataLength - 1 || data[i+1] === ''
                               ? 0 : itemGap))
                            >= zrWidth - lastX
                    ) {
                        lastX = _itemGroupLocation.x;
                        lastY += itemHeight + itemGap;
                    }
                }
                else {
                    if (zrHeight - lastY < 200   // 最后200px做分行预判
                        && (itemHeight
                            // 分行的最后一个不用算itemGap
                            + (i == dataLength - 1 || data[i+1] === ''
                               ? 0 : itemGap))
                            >= zrHeight - lastY
                    ) {
                        legendOption.x == 'right'
                        ? lastX -= _itemGroupLocation.maxWidth + itemGap
                        : lastX += _itemGroupLocation.maxWidth + itemGap;
                        lastY = _itemGroupLocation.y;
                    }
                }

                // 图形
                itemShape = _getItemShapeByType(
                    lastX, lastY,
                    itemWidth, itemHeight,
                    (_selectedMap[itemName] ? color : '#ccc'),
                    itemType,
                    color
                );
                itemShape._name = itemName;
                if (legendOption.selectedMode) {
                    itemShape.onclick = _legendSelected;
                }
                self.shapeList.push(itemShape);

                // 文字
                textShape = {
                    shape : 'text',
                    zlevel : _zlevelBase,
                    style : {
                        x : lastX + itemWidth + 5,
                        y : lastY,
                        color : _selectedMap[itemName]
                                ? (dataTextStyle.color === 'auto' ? color : dataTextStyle.color)
                                : '#ccc',
                        text: itemName,
                        textFont: dataFont,
                        textBaseline: 'top'
                    },
                    highlightStyle : {
                        color : color,
                        brushType: 'fill'
                    },
                    hoverable : !!legendOption.selectedMode,
                    clickable : !!legendOption.selectedMode
                };

                if (legendOption.orient == 'vertical'
                    && legendOption.x == 'right'
                ) {
                    textShape.style.x -= (itemWidth + 10);
                    textShape.style.textAlign = 'right';
                }

                textShape._name = itemName;
                if (legendOption.selectedMode) {
                    textShape.onclick = _legendSelected;
                }
                self.shapeList.push(textShape);

                if (legendOption.orient == 'horizontal') {
                    lastX += itemWidth + 5
                             + zrArea.getTextWidth(itemName, dataFont)
                             + itemGap;
                }
                else {
                    lastY += itemHeight + itemGap;
                }
            }
        
            if (legendOption.orient == 'horizontal'
                && legendOption.x == 'center'
                && lastY != _itemGroupLocation.y
            ) {
                // 多行橫排居中优化
                _mLineOptimize();
            }
        }
        
        // 多行橫排居中优化
        function _mLineOptimize() {
            var lineOffsetArray = []; // 每行宽度
            var lastX = _itemGroupLocation.x;
            for (var i = 2, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i].style.x == lastX) {
                    lineOffsetArray.push(
                        (
                            _itemGroupLocation.width 
                            - (
                                self.shapeList[i - 1].style.x
                                + zrArea.getTextWidth(
                                      self.shapeList[i - 1].style.text,
                                      self.shapeList[i - 1].style.textFont
                                  )
                                - lastX
                            )
                        ) / 2
                    );
                }
                else if (i == l - 1) {
                    lineOffsetArray.push(
                        (
                            _itemGroupLocation.width 
                            - (
                                self.shapeList[i].style.x
                                + zrArea.getTextWidth(
                                      self.shapeList[i].style.text,
                                      self.shapeList[i].style.textFont
                                  )
                                - lastX
                            )
                        ) / 2
                    );
                }
            }
            var curLineIndex = -1;
            for (var i = 1, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i].style.x == lastX) {
                    curLineIndex++;
                }
                if (lineOffsetArray[curLineIndex] === 0) {
                    continue;
                }
                else {
                    self.shapeList[i].style.x += 
                        lineOffsetArray[curLineIndex];
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
            var textStyle  = legendOption.textStyle;
            var font = self.getFont(textStyle);
            var totalWidth = 0;
            var totalHeight = 0;
            var padding = legendOption.padding;
            var zrWidth = zr.getWidth() - padding[1] - padding[3];
            var zrHeight = zr.getHeight() - padding[0] - padding[2];
            
            var temp = 0; // 宽高计算，用于多行判断
            var maxWidth = 0; // 垂直布局有用
            if (legendOption.orient == 'horizontal') {
                // 水平布局，计算总宽度
                totalHeight = itemHeight;
                for (var i = 0; i < dataLength; i++) {
                    if (data[i] === '') {
                        temp -= itemGap;
                        if (temp > zrWidth) {
                            totalWidth = zrWidth;
                            totalHeight += itemHeight + itemGap;
                        }
                        else {
                            totalWidth = Math.max(totalWidth, temp);
                        }
                        totalHeight += itemHeight + itemGap;
                        temp = 0;
                        continue;
                    }
                    dataTextStyle = zrUtil.merge(
                        data[i].textStyle || {},
                        textStyle,
                        {'overwrite': false}
                    );
                    temp += itemWidth
                            + zrArea.getTextWidth(
                                  data[i].name || data[i],
                                  data[i].textStyle 
                                  ? self.getFont(zrUtil.merge(
                                        data[i].textStyle || {},
                                        textStyle,
                                        {'overwrite': false}
                                    ))
                                  : font
                              )
                            + itemGap;
                }
                totalHeight = Math.max(totalHeight, itemHeight);
                temp -= itemGap;    // 减去最后一个的itemGap
                if (temp > zrWidth) {
                    totalWidth = zrWidth;
                    totalHeight += itemHeight + itemGap;
                } else {
                    totalWidth = Math.max(totalWidth, temp);
                }
            }
            else {
                // 垂直布局，计算总高度
                for (var i = 0; i < dataLength; i++) {
                    maxWidth = Math.max(
                        maxWidth,
                        zrArea.getTextWidth(
                            data[i].name || data[i],
                            data[i].textStyle 
                            ? self.getFont(zrUtil.merge(
                                  data[i].textStyle || {},
                                  textStyle,
                                  {'overwrite': false}
                              ))
                            : font
                        )
                    );
                }
                maxWidth += itemWidth;
                totalWidth = maxWidth;
                for (var i = 0; i < dataLength; i++) {
                    if (data[i] === '') {
                        temp -= itemGap;
                        if (temp > zrHeight) {
                            totalHeight = zrHeight;
                            totalWidth += maxWidth + itemGap;
                        }
                        else {
                            totalHeight = Math.max(totalHeight, temp);
                        }
                        totalWidth += maxWidth + itemGap;
                        temp = 0;
                        continue;
                    }
                    temp += itemHeight + itemGap;
                }
                totalWidth = Math.max(totalWidth, maxWidth);
                temp -= itemGap;    // 减去最后一个的itemGap
                if (temp > zrHeight) {
                    totalHeight = zrHeight;
                    totalWidth += maxWidth + itemGap;
                } else {
                    totalHeight = Math.max(totalHeight, temp);
                }
            }

            zrWidth = zr.getWidth();
            zrHeight = zr.getHeight();
            var x;
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
                        - legendOption.padding[3]
                        - legendOption.borderWidth * 2;
                    break;
                default :
                    x = legendOption.x - 0;
                    x = isNaN(x) ? 0 : x;
                    break;
            }

            var y;
            switch (legendOption.y) {
                case 'top' :
                    y = legendOption.padding[0] + legendOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - legendOption.padding[0]
                        - legendOption.padding[2]
                        - legendOption.borderWidth * 2;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = legendOption.y - 0;
                    y = isNaN(y) ? 0 : y;
                    break;
            }

            return {
                x : x,
                y : y,
                width : totalWidth,
                height : totalHeight,
                maxWidth : maxWidth
            };
        }

        /**
         * 根据名称返回series数据或data
         */
        function _getSomethingByName(name) {
            var series = option.series;
            var data;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].name == name) {
                    // 系列名称优先
                    return {
                        type : series[i].type,
                        series : series[i],
                        seriesIndex : i,
                        data : null,
                        dataIndex : -1
                    };
                }

                if (
                    series[i].type == ecConfig.CHART_TYPE_PIE 
                    || series[i].type == ecConfig.CHART_TYPE_RADAR
                    || series[i].type == ecConfig.CHART_TYPE_CHORD
                    || series[i].type == ecConfig.CHART_TYPE_FORCE
                ) {
                    data = series[i].type != ecConfig.CHART_TYPE_FORCE
                           ? series[i].data         // 饼图、雷达图、和弦图得查找里面的数据名字
                           : series[i].categories;  // 力导布局查找categories配置
                    for (var j = 0, k = data.length; j < k; j++) {
                        if (data[j].name == name) {
                            return {
                                type : series[i].type,
                                series : series[i],
                                seriesIndex : i,
                                data : data[j],
                                dataIndex : j
                            };
                        }
                    }
                }
            }
            return {
                type : 'bar',
                series : null,
                seriesIndex : -1,
                data : null,
                dataIndex : -1
            };
        }
        
        function _getItemShapeByType(x, y, width, height, color, itemType, defaultColor) {
            var highlightColor = color === '#ccc' 
                                 ? defaultColor 
                                 : typeof color == 'string' && color != '#ccc' 
                                   ? zrColor.lift(color, -0.3) : color;
            var itemShape = {
                shape : 'icon',
                zlevel : _zlevelBase,
                style : {
                    iconType : 'legendicon' 
                               + (itemType != ecConfig.CHART_TYPE_CHORD   // 和弦复用饼图
                                  ? itemType : ecConfig.CHART_TYPE_PIE),
                    x : x,
                    y : y,
                    width : width,
                    height : height,
                    color : color,
                    strokeColor : color,
                    lineWidth : 2
                },
                highlightStyle: {
                    color : highlightColor,
                    strokeColor : highlightColor,
                    lineWidth : 1
                },
                hoverable : legendOption.selectedMode,
                clickable : legendOption.selectedMode
            };
            // 特殊设置
            switch (itemType) {
                case 'line' :
                    itemShape.style.brushType = 'stroke';
                    itemShape.highlightStyle.lineWidth = 3;
                    break;
                case 'radar' :
                case 'scatter' :   
                    itemShape.highlightStyle.lineWidth = 3;
                    break;
                case 'k' :
                    itemShape.style.brushType = 'both';
                    itemShape.highlightStyle.lineWidth = 3;
                    itemShape.highlightStyle.color =
                    itemShape.style.color = self.query(
                        ecConfig, 'k.itemStyle.normal.color'
                    ) || '#fff';
                    itemShape.style.strokeColor = color != '#ccc' 
                        ? self.query(
                              ecConfig, 'k.itemStyle.normal.lineStyle.color'
                          ) || '#ff3200'
                        : color;
            }
            return itemShape;
        }

        function _legendSelected(param) {
            var itemName = param.target._name;
            if (legendOption.selectedMode === 'single') {
                for (var k in _selectedMap) {
                    _selectedMap[k] = false;
                }
            }
            _selectedMap[itemName] = !_selectedMap[itemName];
            messageCenter.dispatch(
                ecConfig.EVENT.LEGEND_SELECTED,
                param.event,
                {
                    selected : _selectedMap,
                    target : itemName
                }
            );
        }

        function init(newOption) {
            if (!self.query(newOption, 'legend.data')) {
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
            var itemName;
            var something;
            var color;
            var queryTarget;
            for (var i = 0, dataLength = data.length; i < dataLength; i++) {
                itemName = data[i].name || data[i];
                if (itemName === '') {
                    continue;
                }
                something = _getSomethingByName(itemName);
                if (!something.series) {
                    _selectedMap[itemName] = false;
                } 
                else {
                    if (something.data
                        && (something.type == ecConfig.CHART_TYPE_PIE
                            || something.type == ecConfig.CHART_TYPE_FORCE)
                        
                    ) {
                        queryTarget = [something.data, something.series];
                    }
                    else {
                        queryTarget = [something.series];
                    }
                    
                    color = self.getItemStyleColor(
                        self.deepQuery(
                            queryTarget, 'itemStyle.normal.color'
                        ),
                        something.seriesIndex,
                        something.dataIndex,
                        something.data
                    );
                    if (color && something.type != ecConfig.CHART_TYPE_K) {
                        setColor(itemName, color);
                    }
                    _selectedMap[itemName] = true;
                }
            }
            if (selected) {
                for (var k in selected) {
                    _selectedMap[k] = selected[k];
                }
            }
            _buildShape();
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                option.legend = self.reformOption(option.legend);
                // 补全padding属性
                option.legend.padding = self.reformCssArray(
                    option.legend.padding
                );
                if (option.legend.selected) {
                    for (var k in option.legend.selected) {
                        _selectedMap[k] = option.legend.selected[k];
                    }
                }
            }
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
        
        function hasColor(legendName) {
            return _colorMap[legendName] ? _colorMap[legendName] : false;
        }

        function add(name, color){
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
                }
                else {
                    found = true;
                    continue;
                }
            }
            legendOption.data = finalData;
        }
        
        /**
         * 特殊图形元素回调设置
         * @param {Object} name
         * @param {Object} itemShape
         */
        function getItemShape(name) {
            if (typeof name == 'undefined') {
                return;
            }
            var shape;
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                shape = self.shapeList[i];
                if (shape._name == name && shape.shape != 'text') {
                    return shape;
                }
            }
        }
        
        /**
         * 特殊图形元素回调设置
         * @param {Object} name
         * @param {Object} itemShape
         */
        function setItemShape(name, itemShape) {
            var shape;
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                shape = self.shapeList[i];
                if (shape._name == name && shape.shape != 'text') {
                    if (!_selectedMap[name]) {
                        itemShape.style.color = '#ccc';
                        itemShape.style.strokeColor = '#ccc';
                    }
                    zr.modShape(shape.id, itemShape);
                }
            }
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
        
        function getSelectedMap() {
            return _selectedMap;
        }
        
        /**
         * 图例选择
         */
        function onlegendSelected(param, status) {
            var legendSelected = param.selected;
            for (var itemName in _selectedMap) {
                if (_selectedMap[itemName] != legendSelected[itemName]) {
                    // 有一项不一致都需要重绘
                    status.needRefresh = true;
                }
                _selectedMap[itemName] = legendSelected[itemName];
            }
            return;
        }

        self.init = init;
        self.refresh = refresh;
        self.setColor = setColor;
        self.getColor = getColor;
        self.hasColor = hasColor;
        self.add = add;
        self.del = del;
        self.getItemShape = getItemShape;
        self.setItemShape = setItemShape;
        self.isSelected = isSelected;
        self.getSelectedMap = getSelectedMap;
        self.onlegendSelected = onlegendSelected;

        init(option);
    }
    
    var legendIcon = {
        line : function (ctx, style) {
            var dy = style.height / 2;
            ctx.moveTo(style.x,     style.y + dy);
            ctx.lineTo(style.x + style.width,style.y + dy);
        },
        pie : function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var width = style.width;
            var height = style.height;
            var sector = require('zrender/shape').get('sector');
            sector.buildPath(ctx, {
                x : x + width / 2,
                y : y + height + 2,
                r : height + 2,
                r0 : 6,
                startAngle : 45,
                endAngle : 135
            });
        },
        chord : function(ctx, style) {
            var x = style.x;
            var y = style.y;
            var width = style.width;
            var height = style.height;
            var beziercurve = require('zrender/shape').get('beziercurve');
            ctx.moveTo(x, y + height);
            beziercurve.buildPath(ctx, {
                xStart : x,
                yStart : y + height,
                cpX1 : x + width,
                cpY1 : y + height,
                cpX2 : x,
                cpY2 : y + 4,
                xEnd : x + width,
                yEnd : y + 4
            });
            ctx.lineTo(x + width, y);
            beziercurve.buildPath(ctx, {
                xStart : x + width,
                yStart : y,
                cpX1 : x,
                cpY1 : y,
                cpX2 : x + width,
                cpY2 : y + height - 4,
                xEnd : x,
                yEnd : y + height - 4
            });
            ctx.lineTo(x, y + height);
            /*
            var x = style.x + 2;
            var y = style.y;
            var width = style.width - 2;
            var height = style.height;
            var r = width / Math.sqrt(3);
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + width / 4 * 3, y, x + width, y + height);
            ctx.arc(
                x + width / 2, y + height + r / 2, 
                r, -Math.PI / 6, -Math.PI / 6 * 5, true);
            ctx.quadraticCurveTo(x - width / 2, y + height / 3, x, y);
            */
        },
        k : function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var width = style.width;
            var height = style.height;
            var candle = require('zrender/shape').get('candle');
            candle.buildPath(ctx, {
                x : x + width / 2,
                y : [y + 1, y + 1, y + height - 6, y + height],
                width : width - 6
            });
        },
        bar : function (ctx, style) {
            //ctx.rect(style.x, style.y + 1, style.width, style.height - 2);
            var x = style.x;
            var y = style.y +1;
            var width = style.width;
            var height = style.height - 2;
            var r = 3;
            
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + width - r, y);
            ctx.quadraticCurveTo(
                x + width, y, x + width, y + r
            );
            ctx.lineTo(x + width, y + height - r);
            ctx.quadraticCurveTo(
                x + width, y + height, x + width - r, y + height
            );
            ctx.lineTo(x + r, y + height);
            ctx.quadraticCurveTo(
                x, y + height, x, y + height - r
            );
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
        },
        force : function(ctx, style) {
            require('zrender/shape').get('icon').get('circle')(ctx, style);
        },
        radar: function(ctx, style) {
            var n = 6;
            var x = style.x + style.width / 2;
            var y = style.y + style.height / 2;
            var r = style.height / 2;

            var dStep = 2 * Math.PI / n;
            var deg = -Math.PI / 2;
            var xStart = x + r * Math.cos(deg);
            var yStart = y + r * Math.sin(deg);
            
            ctx.moveTo(xStart, yStart);
            deg += dStep;
            for (var i = 0, end = n - 1; i < end; i ++) {
                ctx.lineTo(x + r * Math.cos(deg), y + r * Math.sin(deg));
                deg += dStep;
            }
            ctx.lineTo(xStart, yStart);
        }
    };
    
    require('../component').define('legend', Legend);
    
    return Legend;
});


