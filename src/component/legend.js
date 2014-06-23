/**
 * echarts组件：图例
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var Base = require('./base');
    
    // 图形依赖
    var TextShape = require('zrender/shape/Text');
    var RectangleShape = require('zrender/shape/Rectangle');
    var SectorShape = require('zrender/shape/Sector');
    //var BeziercurveShape = require('zrender/shape/Beziercurve');
    var IconShape = require('../util/shape/Icon');
    var CandleShape = require('../util/shape/Candle');
    
    var ecConfig = require('../config');
    var zrUtil = require('zrender/tool/util');
    var zrArea = require('zrender/tool/area');

    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表参数
     */
    function Legend(ecTheme, messageCenter, zr, option, myChart) {
        if (!this.query(option, 'legend.data')) {
            console.error('option.legend.data has not been defined.');
            return;
        }
        
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);
        
        var self = this;
        self._legendSelected = function (param) {
            self.__legendSelected(param);
        };
        
        this._colorIndex = 0;
        this._colorMap = {};
        this._selectedMap = {};
        
        this.refresh(option);
    }
    
    Legend.prototype = {
        type : ecConfig.COMPONENT_TYPE_LEGEND,
        _buildShape : function () {
            // 图例元素组的位置参数，通过计算所得x, y, width, height
            this._itemGroupLocation = this._getItemGroupLocation();

            this._buildBackground();
            this._buildItem();

            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                this.zr.addShape(this.shapeList[i]);
            }
        },

        /**
         * 构建所有图例元素
         */
        _buildItem : function () {
            var data = this.legendOption.data;
            var dataLength = data.length;
            var itemName;
            var itemType;
            var itemShape;
            var textShape;
            var textStyle  = this.legendOption.textStyle;
            var dataTextStyle;
            var dataFont;

            var zrWidth = this.zr.getWidth();
            var zrHeight = this.zr.getHeight();
            var lastX = this._itemGroupLocation.x;
            var lastY = this._itemGroupLocation.y;
            var itemWidth = this.legendOption.itemWidth;
            var itemHeight = this.legendOption.itemHeight;
            var itemGap = this.legendOption.itemGap;
            var color;

            if (this.legendOption.orient == 'vertical' && this.legendOption.x == 'right') {
                lastX = this._itemGroupLocation.x
                        + this._itemGroupLocation.width
                        - itemWidth;
            }

            for (var i = 0; i < dataLength; i++) {
                dataTextStyle = zrUtil.merge(
                    data[i].textStyle || {},
                    textStyle
                );
                dataFont = this.getFont(dataTextStyle);
                
                itemName = this._getName(data[i]);
                if (itemName === '') {
                    if (this.legendOption.orient == 'horizontal') {
                        lastX = this._itemGroupLocation.x;
                        lastY += itemHeight + itemGap;
                    }
                    else {
                        this.legendOption.x == 'right'
                            ? lastX -= this._itemGroupLocation.maxWidth + itemGap
                            : lastX += this._itemGroupLocation.maxWidth + itemGap;
                        lastY = this._itemGroupLocation.y;
                    }
                    continue;
                }
                itemType = data[i].icon || this._getSomethingByName(itemName).type;
                
                color = this.getColor(itemName);

                if (this.legendOption.orient == 'horizontal') {
                    if (zrWidth - lastX < 200   // 最后200px做分行预判
                        && (itemWidth + 5 + zrArea.getTextWidth(itemName, dataFont)
                            // 分行的最后一个不用算itemGap
                            + (i == dataLength - 1 || data[i+1] === '' ? 0 : itemGap)
                           ) >= zrWidth - lastX
                    ) {
                        lastX = this._itemGroupLocation.x;
                        lastY += itemHeight + itemGap;
                    }
                }
                else {
                    if (zrHeight - lastY < 200   // 最后200px做分行预判
                        && (itemHeight
                            // 分行的最后一个不用算itemGap
                            + (i == dataLength - 1 || data[i+1] === '' ? 0 : itemGap)
                           ) >= zrHeight - lastY
                    ) {
                        this.legendOption.x == 'right'
                        ? lastX -= this._itemGroupLocation.maxWidth + itemGap
                        : lastX += this._itemGroupLocation.maxWidth + itemGap;
                        lastY = this._itemGroupLocation.y;
                    }
                }

                // 图形
                itemShape = this._getItemShapeByType(
                    lastX, lastY,
                    itemWidth, itemHeight,
                    (this._selectedMap[itemName] ? color : '#ccc'),
                    itemType,
                    color
                );
                itemShape._name = itemName;
                itemShape = new IconShape(itemShape);

                // 文字
                textShape = {
                    // shape : 'text',
                    zlevel : this._zlevelBase,
                    style : {
                        x : lastX + itemWidth + 5,
                        y : lastY + itemHeight / 2,
                        color : this._selectedMap[itemName]
                                ? (dataTextStyle.color === 'auto' ? color : dataTextStyle.color)
                                : '#ccc',
                        text: itemName,
                        textFont: dataFont,
                        textBaseline: 'middle'
                    },
                    highlightStyle : {
                        color : color,
                        brushType: 'fill'
                    },
                    hoverable : !!this.legendOption.selectedMode,
                    clickable : !!this.legendOption.selectedMode
                };

                if (this.legendOption.orient == 'vertical'
                    && this.legendOption.x == 'right'
                ) {
                    textShape.style.x -= (itemWidth + 10);
                    textShape.style.textAlign = 'right';
                }

                textShape._name = itemName;
                textShape = new TextShape(textShape);
                
                if (this.legendOption.selectedMode) {
                    itemShape.onclick = textShape.onclick = this._legendSelected;
                    itemShape.onmouseover =  textShape.onmouseover = this.hoverConnect;
                    itemShape.hoverConnect = textShape.id;
                    textShape.hoverConnect = itemShape.id;
                }
                this.shapeList.push(itemShape);
                this.shapeList.push(textShape);

                if (this.legendOption.orient == 'horizontal') {
                    lastX += itemWidth + 5
                             + zrArea.getTextWidth(itemName, dataFont)
                             + itemGap;
                }
                else {
                    lastY += itemHeight + itemGap;
                }
            }
        
            if (this.legendOption.orient == 'horizontal'
                && this.legendOption.x == 'center'
                && lastY != this._itemGroupLocation.y
            ) {
                // 多行橫排居中优化
                this._mLineOptimize();
            }
        },
        
        _getName : function(data) {
            return typeof data.name != 'undefined' ? data.name : data;
        },
        
        // 多行橫排居中优化
        _mLineOptimize : function () {
            var lineOffsetArray = []; // 每行宽度
            var lastX = this._itemGroupLocation.x;
            for (var i = 2, l = this.shapeList.length; i < l; i++) {
                if (this.shapeList[i].style.x == lastX) {
                    lineOffsetArray.push(
                        (
                            this._itemGroupLocation.width 
                            - (
                                this.shapeList[i - 1].style.x
                                + zrArea.getTextWidth(
                                      this.shapeList[i - 1].style.text,
                                      this.shapeList[i - 1].style.textFont
                                  )
                                - lastX
                            )
                        ) / 2
                    );
                }
                else if (i == l - 1) {
                    lineOffsetArray.push(
                        (
                            this._itemGroupLocation.width 
                            - (
                                this.shapeList[i].style.x
                                + zrArea.getTextWidth(
                                      this.shapeList[i].style.text,
                                      this.shapeList[i].style.textFont
                                  )
                                - lastX
                            )
                        ) / 2
                    );
                }
            }
            var curLineIndex = -1;
            for (var i = 1, l = this.shapeList.length; i < l; i++) {
                if (this.shapeList[i].style.x == lastX) {
                    curLineIndex++;
                }
                if (lineOffsetArray[curLineIndex] === 0) {
                    continue;
                }
                else {
                    this.shapeList[i].style.x += lineOffsetArray[curLineIndex];
                }
            }
        },

        _buildBackground : function () {
            var pTop = this.legendOption.padding[0];
            var pRight = this.legendOption.padding[1];
            var pBottom = this.legendOption.padding[2];
            var pLeft = this.legendOption.padding[3];

            this.shapeList.push(new RectangleShape({
                zlevel : this._zlevelBase,
                hoverable :false,
                style : {
                    x : this._itemGroupLocation.x - pLeft,
                    y : this._itemGroupLocation.y - pTop,
                    width : this._itemGroupLocation.width + pLeft + pRight,
                    height : this._itemGroupLocation.height + pTop + pBottom,
                    brushType : this.legendOption.borderWidth === 0 ? 'fill' : 'both',
                    color : this.legendOption.backgroundColor,
                    strokeColor : this.legendOption.borderColor,
                    lineWidth : this.legendOption.borderWidth
                }
            }));
        },

        /**
         * 根据选项计算图例实体的位置坐标
         */
        _getItemGroupLocation : function () {
            var data = this.legendOption.data;
            var dataLength = data.length;
            var itemGap = this.legendOption.itemGap;
            var itemWidth = this.legendOption.itemWidth + 5; // 5px是图形和文字的间隔，不可配
            var itemHeight = this.legendOption.itemHeight;
            var textStyle  = this.legendOption.textStyle;
            var font = this.getFont(textStyle);
            var totalWidth = 0;
            var totalHeight = 0;
            var padding = this.legendOption.padding;
            var zrWidth = this.zr.getWidth() - padding[1] - padding[3];
            var zrHeight = this.zr.getHeight() - padding[0] - padding[2];
            
            var temp = 0; // 宽高计算，用于多行判断
            var maxWidth = 0; // 垂直布局有用
            if (this.legendOption.orient == 'horizontal') {
                // 水平布局，计算总宽度
                totalHeight = itemHeight;
                for (var i = 0; i < dataLength; i++) {
                    if (this._getName(data[i]) === '') {
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
                        textStyle
                    );
                    temp += itemWidth
                            + zrArea.getTextWidth(
                                  this._getName(data[i]),
                                  data[i].textStyle 
                                  ? this.getFont(zrUtil.merge(
                                        data[i].textStyle || {},
                                        textStyle
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
                            this._getName(data[i]),
                            data[i].textStyle 
                            ? this.getFont(zrUtil.merge(
                                  data[i].textStyle || {},
                                  textStyle
                              ))
                            : font
                        )
                    );
                }
                maxWidth += itemWidth;
                totalWidth = maxWidth;
                for (var i = 0; i < dataLength; i++) {
                    if (this._getName(data[i]) === '') {
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

            zrWidth = this.zr.getWidth();
            zrHeight = this.zr.getHeight();
            var x;
            switch (this.legendOption.x) {
                case 'center' :
                    x = Math.floor((zrWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = this.legendOption.padding[3] + this.legendOption.borderWidth;
                    break;
                case 'right' :
                    x = zrWidth
                        - totalWidth
                        - this.legendOption.padding[1]
                        - this.legendOption.padding[3]
                        - this.legendOption.borderWidth * 2;
                    break;
                default :
                    x = this.parsePercent(this.legendOption.x, zrWidth);
                    break;
            }
            
            var y;
            switch (this.legendOption.y) {
                case 'top' :
                    y = this.legendOption.padding[0] + this.legendOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - this.legendOption.padding[0]
                        - this.legendOption.padding[2]
                        - this.legendOption.borderWidth * 2;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = this.parsePercent(this.legendOption.y, zrHeight);
                    break;
            }

            return {
                x : x,
                y : y,
                width : totalWidth,
                height : totalHeight,
                maxWidth : maxWidth
            };
        },

        /**
         * 根据名称返回series数据或data
         */
        _getSomethingByName : function (name) {
            var series = this.option.series;
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
                    || series[i].type == ecConfig.CHART_TYPE_FUNNEL
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
        },
        
        _getItemShapeByType : function (x, y, width, height, color, itemType, defaultColor) {
            var highlightColor = color === '#ccc' ? defaultColor : color;
            var itemShape = {
                zlevel : this._zlevelBase,
                style : {
                    iconType : 'legendicon' + itemType,
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
                hoverable : this.legendOption.selectedMode,
                clickable : this.legendOption.selectedMode
            };
            
            var imageLocation;
            if (itemType.match('image')) {
                var imageLocation = itemType.replace(
                    new RegExp('^image:\\/\\/'), ''
                );
                itemType = 'image';
            }
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
                    itemShape.style.color = this.query(this.ecTheme, 'k.itemStyle.normal.color') 
                                            || '#fff';
                    itemShape.style.strokeColor = color != '#ccc' 
                        ? (this.query(this.ecTheme, 'k.itemStyle.normal.lineStyle.color') 
                           || '#ff3200')
                        : color;
                    break;
                case 'image' :
                    itemShape.style.iconType = 'image';
                    itemShape.style.image = imageLocation;
                    if (color === '#ccc') {
                        itemShape.style.opacity = 0.5;
                    }
                    break;
            }
            return itemShape;
        },

        __legendSelected : function (param) {
            var itemName = param.target._name;
            if (this.legendOption.selectedMode === 'single') {
                for (var k in this._selectedMap) {
                    this._selectedMap[k] = false;
                }
            }
            this._selectedMap[itemName] = !this._selectedMap[itemName];
            this.messageCenter.dispatch(
                ecConfig.EVENT.LEGEND_SELECTED,
                param.event,
                {
                    selected : this._selectedMap,
                    target : itemName
                },
                this.myChart
            );
        },

        /**
         * 刷新
         */
        refresh : function (newOption) {
            if (newOption) {
                this.option = newOption || this.option;
                this.option.legend = this.reformOption(this.option.legend);
                // 补全padding属性
                this.option.legend.padding = this.reformCssArray(
                    this.option.legend.padding
                );
                this.legendOption = this.option.legend;
                
                var data = this.legendOption.data || [];
                var itemName;
                var something;
                var color;
                var queryTarget;
                if (this.legendOption.selected) {
                    for (var k in this.legendOption.selected) {
                        this._selectedMap[k] = typeof this._selectedMap[k] != 'undefined'
                                               ? this._selectedMap[k]
                                               : this.legendOption.selected[k];
                    }
                }
                for (var i = 0, dataLength = data.length; i < dataLength; i++) {
                    itemName = this._getName(data[i]);
                    if (itemName === '') {
                        continue;
                    }
                    something = this._getSomethingByName(itemName);
                    if (!something.series) {
                        this._selectedMap[itemName] = false;
                    } 
                    else {
                        if (something.data
                            && (something.type == ecConfig.CHART_TYPE_PIE
                                || something.type == ecConfig.CHART_TYPE_FORCE
                                || something.type == ecConfig.CHART_TYPE_FUNNEL)
                        ) {
                            queryTarget = [something.data, something.series];
                        }
                        else {
                            queryTarget = [something.series];
                        }
                        
                        color = this.getItemStyleColor(
                            this.deepQuery(queryTarget, 'itemStyle.normal.color'),
                            something.seriesIndex,
                            something.dataIndex,
                            something.data
                        );
                        if (color && something.type != ecConfig.CHART_TYPE_K) {
                            this.setColor(itemName, color);
                        }
                        this._selectedMap[itemName] = 
                            typeof this._selectedMap[itemName] != 'undefined'
                            ? this._selectedMap[itemName] : true; 
                    }
                }
            }
            this.clear();
            this._buildShape();
        },
        
        getRelatedAmount : function(name) {
            var amount = 0;
            var series = this.option.series;
            var data;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].name == name) {
                    // 系列名称优先
                    amount++;
                }

                if (
                    series[i].type == ecConfig.CHART_TYPE_PIE 
                    || series[i].type == ecConfig.CHART_TYPE_RADAR
                    || series[i].type == ecConfig.CHART_TYPE_CHORD
                    || series[i].type == ecConfig.CHART_TYPE_FORCE
                    || series[i].type == ecConfig.CHART_TYPE_FUNNEL
                ) {
                    data = series[i].type != ecConfig.CHART_TYPE_FORCE
                           ? series[i].data         // 饼图、雷达图、和弦图得查找里面的数据名字
                           : series[i].categories;  // 力导布局查找categories配置
                    for (var j = 0, k = data.length; j < k; j++) {
                        if (data[j].name == name && data[j].value != '-') {
                            amount++
                        }
                    }
                }
            }
            return amount;
        },

        setColor : function (legendName, color) {
            this._colorMap[legendName] = color;
        },

        getColor : function (legendName) {
            if (!this._colorMap[legendName]) {
                this._colorMap[legendName] = this.zr.getColor(this._colorIndex++);
            }
            return this._colorMap[legendName];
        },
        
        hasColor : function (legendName) {
            return this._colorMap[legendName] ? this._colorMap[legendName] : false;
        },

        add : function (name, color){
            var data = this.legendOption.data;
            for (var i = 0, dataLength = data.length; i < dataLength; i++) {
                if (this._getName(data[i]) == name) {
                    // 已有就不重复加了
                    return;
                }
            }
            this.legendOption.data.push(name);
            this.setColor(name,color);
            this._selectedMap[name] = true;
        },

        del : function (name){
            var data = this.legendOption.data;
            for (var i = 0, dataLength = data.length; i < dataLength; i++) {
                if (this._getName(data[i]) == name) {
                    return this.legendOption.data.splice(i, 1);
                }
            }
        },
        
        /**
         * 特殊图形元素回调设置
         * @param {Object} name
         * @param {Object} itemShape
         */
        getItemShape : function (name) {
            if (typeof name == 'undefined') {
                return;
            }
            var shape;
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                shape = this.shapeList[i];
                if (shape._name == name && shape.type != 'text') {
                    return shape;
                }
            }
        },
        
        /**
         * 特殊图形元素回调设置
         * @param {Object} name
         * @param {Object} itemShape
         */
        setItemShape : function (name, itemShape) {
            var shape;
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                shape = this.shapeList[i];
                if (shape._name == name && shape.type != 'text') {
                    if (!this._selectedMap[name]) {
                        itemShape.style.color = '#ccc';
                        itemShape.style.strokeColor = '#ccc';
                    }
                    this.zr.modShape(shape.id, itemShape);
                }
            }
        },

        isSelected : function (itemName) {
            if (typeof this._selectedMap[itemName] != 'undefined') {
                return this._selectedMap[itemName];
            }
            else {
                // 没在legend里定义的都为true啊~
                return true;
            }
        },
        
        getSelectedMap : function () {
            return this._selectedMap;
        },
        
        setSelected : function(itemName, selectStatus) {
            if (this.legendOption.selectedMode === 'single') {
                for (var k in this._selectedMap) {
                    this._selectedMap[k] = false;
                }
            }
            this._selectedMap[itemName] = selectStatus;
            this.messageCenter.dispatch(
                ecConfig.EVENT.LEGEND_SELECTED,
                null,
                {
                    selected : this._selectedMap,
                    target : itemName
                },
                this.myChart
            );
        },
        
        /**
         * 图例选择
         */
        onlegendSelected : function (param, status) {
            var legendSelected = param.selected;
            for (var itemName in legendSelected) {
                if (this._selectedMap[itemName] != legendSelected[itemName]) {
                    // 有一项不一致都需要重绘
                    status.needRefresh = true;
                }
                this._selectedMap[itemName] = legendSelected[itemName];
            }
            return;
        }
    };
    
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
            SectorShape.prototype.buildPath(ctx, {
                x : x + width / 2,
                y : y + height + 2,
                r : height + 2,
                r0 : 6,
                startAngle : 45,
                endAngle : 135
            });
        },
        /*
        chord : function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var width = style.width;
            var height = style.height;
            ctx.moveTo(x, y + height);
            BeziercurveShape.prototype.buildPath(ctx, {
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
            BeziercurveShape.prototype.buildPath(ctx, {
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
        },
        */
        k : function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var width = style.width;
            var height = style.height;
            CandleShape.prototype.buildPath(ctx, {
                x : x + width / 2,
                y : [y + 1, y + 1, y + height - 6, y + height],
                width : width - 6
            });
        },
        
        bar : function (ctx, style) {
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
        
        force : function (ctx, style) {
            IconShape.prototype.iconLibrary.circle(ctx, style);
        },
        
        radar: function (ctx, style) {
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
    legendIcon.chord = legendIcon.pie;
    legendIcon.map = legendIcon.bar;
    
    for (var k in legendIcon) {
        IconShape.prototype.iconLibrary['legendicon' + k] = legendIcon[k];
    }
    
    zrUtil.inherits(Legend, Base);
    
    require('../component').define('legend', Legend);
    
    return Legend;
});


