/**
 * echarts组件基类
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    // 图形依赖
    var CircleShape = require('zrender/shape/Circle');
    var ImageShape = require('zrender/shape/Image');
    var IconShape = require('../util/shape/Icon');
    var MarkLineShape = require('../util/shape/MarkLine');
    
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var ecQuery = require('../util/ecQuery');
    var number = require('../util/number');
    var zrUtil = require('zrender/tool/util');
    var zrArea = require('zrender/tool/area');
    //var zrColor = require('zrender/tool/color');
    
    var EFFECT_ZLEVEL = 7;
    
    var _aniMap = {};
    _aniMap[ecConfig.CHART_TYPE_LINE] = true;
    _aniMap[ecConfig.CHART_TYPE_BAR] = true;
    _aniMap[ecConfig.CHART_TYPE_SCATTER] = true;
    _aniMap[ecConfig.CHART_TYPE_PIE] = true;
    _aniMap[ecConfig.CHART_TYPE_RADAR] = true;
    _aniMap[ecConfig.CHART_TYPE_MAP] = true;
    _aniMap[ecConfig.CHART_TYPE_K] = true;
    _aniMap[ecConfig.CHART_TYPE_CHORD] = true;
    
    function Base(ecTheme, zr, option){
        this.ecTheme = ecTheme;
        this.zr =zr;
        this.option = option;
        this.series = option.series;
        this._zlevelBase = this.getZlevelBase();
        this.shapeList = [];
        this.effectList = [];
        
        var self = this;
        self.hoverConnect = function (param) {
            var target = (param.target || {}).hoverConnect;
            if (target) {
                var zlevel = 10;
                var shape;
                if (!(target instanceof Array)) {
                    shape = self.getShapeById(target);
                    self.zr.addHoverShape(shape);
                    zlevel = Math.min(zlevel, shape.zlevel);
                }
                else {
                    for (var i = 0, l = target.length; i < l; i++) {
                        shape = self.getShapeById(target[i]);
                        self.zr.addHoverShape(shape);
                        zlevel = Math.min(zlevel, shape.zlevel);
                    }
                }
                if (zlevel < param.target.zlevel) {
                    self.zr.addHoverShape(param.target);
                }
            }
        }
    }

    /**
     * 基类方法
     */
    Base.prototype = {
        canvasSupported : require('zrender/tool/env').canvasSupported,
        /**
         * 获取zlevel基数配置
         * @param {Object} contentType
         */
        getZlevelBase : function (contentType) {
            contentType = contentType || this.type + '';

            switch (contentType) {
                case ecConfig.COMPONENT_TYPE_GRID :
                case ecConfig.COMPONENT_TYPE_AXIS_CATEGORY :
                case ecConfig.COMPONENT_TYPE_AXIS_VALUE :
                case ecConfig.COMPONENT_TYPE_POLAR :
                    return 0;

                case ecConfig.CHART_TYPE_LINE :
                case ecConfig.CHART_TYPE_BAR :
                case ecConfig.CHART_TYPE_SCATTER :
                case ecConfig.CHART_TYPE_PIE :
                case ecConfig.CHART_TYPE_RADAR :
                case ecConfig.CHART_TYPE_MAP :
                case ecConfig.CHART_TYPE_K :
                case ecConfig.CHART_TYPE_CHORD:
                    return 2;

                case ecConfig.COMPONENT_TYPE_LEGEND :
                case ecConfig.COMPONENT_TYPE_DATARANGE:
                case ecConfig.COMPONENT_TYPE_DATAZOOM :
                    return 4;

                case ecConfig.CHART_TYPE_ISLAND :
                    return 5;

                case ecConfig.COMPONENT_TYPE_TOOLBOX :
                case ecConfig.COMPONENT_TYPE_TITLE :
                    return 6;

                // EFFECT_ZLEVEL = 7;
                
                case ecConfig.COMPONENT_TYPE_TOOLTIP :
                    return 8;

                default :
                    return 0;
            }
        },

        /**
         * 参数修正&默认值赋值
         * @param {Object} opt 参数
         *
         * @return {Object} 修正后的参数
         */
        reformOption : function (opt) {
            return zrUtil.merge(
                       opt || {},
                       zrUtil.clone(this.ecTheme[this.type] || {})
                   );
        },
        
        /**
         * css类属性数组补全，如padding，margin等~
         */
        reformCssArray : function (p) {
            if (p instanceof Array) {
                switch (p.length + '') {
                    case '4':
                        return p;
                    case '3':
                        return [p[0], p[1], p[2], p[1]];
                    case '2':
                        return [p[0], p[1], p[0], p[1]];
                    case '1':
                        return [p[0], p[0], p[0], p[0]];
                    case '0':
                        return [0, 0, 0, 0];
                }
            }
            else {
                return [p, p, p, p];
            }
        },

        getShapeById : function(id) {
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                if (this.shapeList[i].id == id) {
                    return this.shapeList[i];
                }
            }
            return null;
        },
        
        /**
         * 获取自定义和默认配置合并后的字体设置
         */
        getFont : function (textStyle) {
            var finalTextStyle = zrUtil.merge(
                zrUtil.clone(textStyle) || {},
                this.ecTheme.textStyle
            );
            return finalTextStyle.fontStyle + ' '
                   + finalTextStyle.fontWeight + ' '
                   + finalTextStyle.fontSize + 'px '
                   + finalTextStyle.fontFamily;
        },
        
        /**
         * 添加文本 
         */
        addLabel : function (tarShape, serie, data, name, orient) {
            // 多级控制
            var queryTarget = [data, serie];
            var nLabel = this.deepMerge(queryTarget, 'itemStyle.normal.label');
            var eLabel = this.deepMerge(queryTarget, 'itemStyle.emphasis.label');

            var nTextStyle = nLabel.textStyle || {};
            var eTextStyle = eLabel.textStyle || {};
            
            if (nLabel.show) {
                tarShape.style.text = this._getLabelText(
                    serie, data, name, 'normal'
                );
                tarShape.style.textPosition = 
                    typeof nLabel.position == 'undefined'
                        ? (orient == 'horizontal' ? 'right' : 'top')
                        : nLabel.position;
                tarShape.style.textColor = nTextStyle.color;
                tarShape.style.textFont = this.getFont(nTextStyle);
            }
            if (eLabel.show) {
                tarShape.highlightStyle.text = this._getLabelText(
                    serie, data, name, 'emphasis'
                );
                tarShape.highlightStyle.textPosition = nLabel.show
                    ? tarShape.style.textPosition
                    : (typeof eLabel.position == 'undefined'
                        ? (orient == 'horizontal' ? 'right' : 'top')
                        : eLabel.position);
                tarShape.highlightStyle.textColor = eTextStyle.color;
                tarShape.highlightStyle.textFont = this.getFont(eTextStyle);
            }
            
            return tarShape;
        },
        
        /**
         * 根据lable.format计算label text
         */
        _getLabelText : function (serie, data, name, status) {
            var formatter = this.deepQuery(
                [data, serie],
                'itemStyle.' + status + '.label.formatter'
            );
            if (!formatter && status == 'emphasis') {
                // emphasis时需要看看normal下是否有formatter
                formatter = this.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.formatter'
                );
            }
            
            var value = typeof data != 'undefined'
                        ? (typeof data.value != 'undefined'
                          ? data.value
                          : data)
                        : '-';
            
            if (formatter) {
                if (typeof formatter == 'function') {
                    return formatter(
                        serie.name,
                        name,
                        value
                    );
                }
                else if (typeof formatter == 'string') {
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}');
                    formatter = formatter.replace('{a0}', serie.name)
                                         .replace('{b0}', name)
                                         .replace('{c0}', value);
    
                    return formatter;
                }
            }
            else {
                return value;
            }
        },
        
        buildMark : function (
            serie, seriesIndex, component, markCoordParams, attachStyle
        ) {
            if (this.selectedMap[serie.name]) {
                serie.markPoint && this._buildMarkPoint(
                    serie, seriesIndex, component, markCoordParams, attachStyle
                );
                serie.markLine && this._buildMarkLine(
                    serie, seriesIndex, component, markCoordParams, attachStyle
                );
            }
        },
        
        _buildMarkPoint : function (
            serie, seriesIndex, component, markCoordParams, attachStyle
        ) {
            var _zlevelBase = this.getZlevelBase();
            var mpData;
            var pos;
            var markPoint = zrUtil.clone(serie.markPoint);
            for (var i = 0, l = markPoint.data.length; i < l; i++) {
                mpData = markPoint.data[i];
                pos = this.getMarkCoord(
                          serie, seriesIndex, mpData, markCoordParams
                      );
                markPoint.data[i].x = typeof mpData.x != 'undefined'
                                      ? mpData.x : pos[0];
                markPoint.data[i].y = typeof mpData.y != 'undefined'
                                      ? mpData.y : pos[1];
                if (mpData.type
                    && (mpData.type == 'max' || mpData.type == 'min')
                ) {
                    // 特殊值内置支持
                    markPoint.data[i].value = pos[3];
                    markPoint.data[i].name = mpData.name || mpData.type;
                    markPoint.data[i].symbolSize = markPoint.data[i].symbolSize
                        || (zrArea.getTextWidth(pos[3], this.getFont()) / 2 + 5);
                }
            }
            
            var shapeList = this._markPoint(
                serie, seriesIndex, markPoint, component
            );
            
            for (var i = 0, l = shapeList.length; i < l; i++) {
                shapeList[i].zlevel = _zlevelBase + 1;
                /*
                shapeList[i]._mark = 'point';
                shapeList[i]._x = shapeList[i].style.x 
                                  + shapeList[i].style.width / 2;
                shapeList[i]._y = shapeList[i].style.y 
                                  + shapeList[i].style.height / 2;
                */
                for (var key in attachStyle) {
                    shapeList[i][key] = zrUtil.clone(attachStyle[key]);
                }
                this.shapeList.push(shapeList[i]);
            }
            // 个别特殊图表需要自己addShape
            if (this.type == ecConfig.CHART_TYPE_FORCE
                || this.type == ecConfig.CHART_TYPE_CHORD
            ) {
                for (var i = 0, l = shapeList.length; i < l; i++) {
                    this.zr.addShape(shapeList[i]);
                }
            }
        },
        
        _buildMarkLine : function (
            serie, seriesIndex, component, markCoordParams, attachStyle
        ) {
            var _zlevelBase = this.getZlevelBase();
            var mlData;
            var pos;
            var markLine = zrUtil.clone(serie.markLine);
            for (var i = 0, l = markLine.data.length; i < l; i++) {
                mlData = markLine.data[i];
                if (mlData.type
                    && (mlData.type == 'max' || mlData.type == 'min' || mlData.type == 'average')
                ) {
                    // 特殊值内置支持
                    pos = this.getMarkCoord(serie, seriesIndex, mlData, markCoordParams);
                    markLine.data[i] = [zrUtil.clone(mlData), {}];
                    markLine.data[i][0].name = mlData.name || mlData.type;
                    markLine.data[i][0].value = pos[3];
                    pos = pos[2];
                    mlData = [{},{}];
                }
                else {
                    pos = [
                        this.getMarkCoord(
                            serie, seriesIndex, mlData[0], markCoordParams
                        ),
                        this.getMarkCoord(
                            serie, seriesIndex, mlData[1], markCoordParams
                        )
                    ];
                }
                
                markLine.data[i][0].x = typeof mlData[0].x != 'undefined'
                                      ? mlData[0].x : pos[0][0];
                markLine.data[i][0].y = typeof mlData[0].y != 'undefined'
                                      ? mlData[0].y : pos[0][1];
                markLine.data[i][1].x = typeof mlData[1].x != 'undefined'
                                      ? mlData[1].x : pos[1][0];
                markLine.data[i][1].y = typeof mlData[1].y != 'undefined'
                                      ? mlData[1].y : pos[1][1];
            }
            
            var shapeList = this._markLine(
                serie, seriesIndex, markLine, component
            );
            
            for (var i = 0, l = shapeList.length; i < l; i++) {
                shapeList[i].zlevel = _zlevelBase + 1;
                for (var key in attachStyle) {
                    shapeList[i][key] = zrUtil.clone(attachStyle[key]);
                }
                this.shapeList.push(shapeList[i]);
            }
            // 个别特殊图表需要自己addShape
            if (this.type == ecConfig.CHART_TYPE_FORCE
                || this.type == ecConfig.CHART_TYPE_CHORD
            ) {
                for (var i = 0, l = shapeList.length; i < l; i++) {
                    this.zr.addShape(shapeList[i]);
                }
            }
        },
        
        _markPoint : function (serie, seriesIndex, mpOption, component) {
            zrUtil.merge(
                mpOption,
                this.ecTheme.markPoint
            );
            mpOption.name = serie.name;
                   
            var pList = [];
            var data = mpOption.data;
            var itemShape;
            
            var dataRange = component.dataRange;
            var legend = component.legend;
            var color;
            var value;
            var queryTarget;
            var nColor;
            var eColor;
            var effect;
            var zrWidth = this.zr.getWidth();
            var zrHeight = this.zr.getHeight();
            for (var i = 0, l = data.length; i < l; i++) {
                // 图例
                if (legend) {
                    color = legend.getColor(serie.name);
                }
                // 值域
                if (dataRange) {
                    value = typeof data[i] != 'undefined'
                            ? (typeof data[i].value != 'undefined'
                              ? data[i].value
                              : data[i])
                            : '-';
                    color = isNaN(value) ? color : dataRange.getColor(value);
                    
                    queryTarget = [data[i], mpOption];
                    nColor = this.deepQuery(
                        queryTarget, 'itemStyle.normal.color'
                    ) || color;
                    eColor = this.deepQuery(
                        queryTarget, 'itemStyle.emphasis.color'
                    ) || nColor;
                    // 有值域，并且值域返回null且用户没有自己定义颜色，则隐藏这个mark
                    if (nColor == null && eColor == null) {
                        continue;
                    }
                }
                
                // 标准化一些参数
                data[i].tooltip = data[i].tooltip 
                                  || {trigger:'item'}; // tooltip.trigger指定为item
                data[i].name = typeof data[i].name != 'undefined'
                               ? data[i].name : '';
                data[i].value = typeof data[i].value != 'undefined'
                                ? data[i].value : '';
                
                // 复用getSymbolShape
                itemShape = this.getSymbolShape(
                    mpOption, seriesIndex,      // 系列 
                    data[i], i, data[i].name,   // 数据
                    this.parsePercent(data[i].x, zrWidth),   // 坐标
                    this.parsePercent(data[i].y, zrHeight),  // 坐标
                    'pin', color,               // 默认symbol和color
                    'rgba(0,0,0,0)',
                    'horizontal'                // 走向，用于默认文字定位
                );
                
                effect = this.deepMerge(
                    [data[i], mpOption],
                    'effect'
                );
                if (effect.show) {
                    itemShape.effect = effect;
                }
                
                if (serie.type == ecConfig.CHART_TYPE_MAP) {
                    itemShape._geo = this.getMarkGeo(data[i].name);
                }
                
                // 重新pack一下数据
                ecData.pack(
                    itemShape,
                    serie, seriesIndex,
                    data[i], 0,
                    data[i].name
                );
                pList.push(itemShape);
            }
            //console.log(pList);
            return pList;
        },
        
        _markLine : function (serie, seriesIndex, mlOption, component) {
            zrUtil.merge(
                mlOption,
                this.ecTheme.markLine
            );
            // 标准化一些同时支持Array和String的参数
            mlOption.symbol = mlOption.symbol instanceof Array
                      ? mlOption.symbol.length > 1 
                        ? mlOption.symbol 
                        : [mlOption.symbol[0], mlOption.symbol[0]]
                      : [mlOption.symbol, mlOption.symbol];
            mlOption.symbolSize = mlOption.symbolSize instanceof Array
                      ? mlOption.symbolSize.length > 1 
                        ? mlOption.symbolSize 
                        : [mlOption.symbolSize[0], mlOption.symbolSize[0]]
                      : [mlOption.symbolSize, mlOption.symbolSize];
            mlOption.symbolRotate = mlOption.symbolRotate instanceof Array
                      ? mlOption.symbolRotate.length > 1 
                        ? mlOption.symbolRotate 
                        : [mlOption.symbolRotate[0], mlOption.symbolRotate[0]]
                      : [mlOption.symbolRotate, mlOption.symbolRotate];
            
            mlOption.name = serie.name;
                   
            var pList = [];
            var data = mlOption.data;
            var itemShape;
            
            var dataRange = component.dataRange;
            var legend = component.legend;
            var color;
            var value;
            var queryTarget;
            var nColor;
            var eColor;
            var effect;
            var zrWidth = this.zr.getWidth();
            var zrHeight = this.zr.getHeight();
            var mergeData;
            for (var i = 0, l = data.length; i < l; i++) {
                // 图例
                if (legend) {
                    color = legend.getColor(serie.name);
                }
                // 组装一个mergeData
                mergeData = this.deepMerge(data[i]);
                // 值域
                if (dataRange) {
                    value = typeof mergeData != 'undefined'
                            ? (typeof mergeData.value != 'undefined'
                              ? mergeData.value
                              : mergeData)
                            : '-';
                    color = isNaN(value) ? color : dataRange.getColor(value);
                    
                    queryTarget = [mergeData, mlOption];
                    nColor = this.deepQuery(
                        queryTarget, 'itemStyle.normal.color'
                    ) || color;
                    eColor = this.deepQuery(
                        queryTarget, 'itemStyle.emphasis.color'
                    ) || nColor;
                    // 有值域，并且值域返回null且用户没有自己定义颜色，则隐藏这个mark
                    if (nColor == null && eColor == null) {
                        continue;
                    }
                }
                
                // 标准化一些参数
                data[i][0].tooltip = mergeData.tooltip 
                                     || {trigger:'item'}; // tooltip.trigger指定为item
                data[i][0].name = typeof data[i][0].name != 'undefined'
                                  ? data[i][0].name : '';
                data[i][1].name = typeof data[i][1].name != 'undefined'
                                  ? data[i][1].name : '';
                data[i][0].value = typeof data[i][0].value != 'undefined'
                                   ? data[i][0].value : '';
                
                itemShape = this.getLineMarkShape(
                    mlOption,                   // markLine
                    seriesIndex,
                    data[i],                    // 数据
                    i,
                    this.parsePercent(data[i][0].x, zrWidth),   // 坐标
                    this.parsePercent(data[i][0].y, zrHeight),  // 坐标
                    this.parsePercent(data[i][1].x, zrWidth),   // 坐标
                    this.parsePercent(data[i][1].y, zrHeight),  // 坐标
                    color                       // 默认symbol和color
                );
                
                effect = this.deepMerge(
                    [mergeData, mlOption],
                    'effect'
                );
                if (effect.show) {
                    itemShape.effect = effect;
                }
                
                if (serie.type == ecConfig.CHART_TYPE_MAP) {
                    itemShape._geo = [
                        this.getMarkGeo(data[i][0].name),
                        this.getMarkGeo(data[i][1].name)
                    ];
                }
                
                // 重新pack一下数据
                ecData.pack(
                    itemShape,
                    serie, seriesIndex,
                    data[i][0], 0,
                    data[i][0].name + (data[i][1].name !== '' 
                                      ? (' > ' + data[i][1].name) : '')
                );
                pList.push(itemShape);
            }
            //console.log(pList);
            return pList;
        },
        
        getMarkCoord : function () {
            // 无转换位置
            return [0, 0];
        },
        
        getSymbolShape : function (
            serie, seriesIndex,     // 系列 
            data, dataIndex, name,  // 数据
            x, y,                   // 坐标
            symbol, color,          // 默认symbol和color，来自legend或dataRange全局分配
            emptyColor,             // 折线的emptySymbol用白色填充
            orient                  // 走向，用于默认文字定位
        ) {
            var queryTarget = [data, serie];
            var value = typeof data != 'undefined'
                        ? (typeof data.value != 'undefined'
                          ? data.value
                          : data)
                        : '-';
            
            symbol = this.deepQuery(queryTarget, 'symbol') || symbol;
            var symbolSize = this.deepQuery(queryTarget, 'symbolSize');
            symbolSize = typeof symbolSize == 'function'
                         ? symbolSize(value)
                         : symbolSize;
            var symbolRotate = this.deepQuery(queryTarget, 'symbolRotate');
            
            var normal = this.deepMerge(
                queryTarget,
                'itemStyle.normal'
            );
            var emphasis = this.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            );
            var nBorderWidth = typeof normal.borderWidth != 'undefined'
                       ? normal.borderWidth
                       : (normal.lineStyle && normal.lineStyle.width);
            if (typeof nBorderWidth == 'undefined') {
                nBorderWidth = 0;
            }
            var eBorderWidth = typeof emphasis.borderWidth != 'undefined'
                       ? emphasis.borderWidth
                       : (emphasis.lineStyle && emphasis.lineStyle.width);
            if (typeof eBorderWidth == 'undefined') {
                eBorderWidth = nBorderWidth + 2;
            }
            
            var itemShape = new IconShape({
                style : {
                    iconType : symbol.replace('empty', '').toLowerCase(),
                    x : x - symbolSize,
                    y : y - symbolSize,
                    width : symbolSize * 2,
                    height : symbolSize * 2,
                    brushType : 'both',
                    color : symbol.match('empty') 
                            ? emptyColor 
                            : (this.getItemStyleColor(normal.color, seriesIndex, dataIndex, data)
                               || color),
                    strokeColor : normal.borderColor 
                              || this.getItemStyleColor(normal.color, seriesIndex, dataIndex, data)
                              || color,
                    lineWidth: nBorderWidth
                },
                highlightStyle : {
                    color : symbol.match('empty') 
                            ? emptyColor 
                            : this.getItemStyleColor(emphasis.color, seriesIndex, dataIndex, data),
                    strokeColor : emphasis.borderColor 
                              || normal.borderColor
                              || this.getItemStyleColor(normal.color, seriesIndex, dataIndex, data)
                              || color,
                    lineWidth: eBorderWidth
                },
                clickable : true
            });

            if (symbol.match('image')) {
                itemShape.style.image = 
                    symbol.replace(new RegExp('^image:\\/\\/'), '');
                itemShape = new ImageShape({
                    style : itemShape.style,
                    highlightStyle : itemShape.highlightStyle,
                    clickable : true
                });
            }
            
            if (typeof symbolRotate != 'undefined') {
                itemShape.rotation = [
                    symbolRotate * Math.PI / 180, x, y
                ];
            }
            
            if (symbol.match('star')) {
                itemShape.style.iconType = 'star';
                itemShape.style.n = 
                    (symbol.replace('empty', '').replace('star','') - 0) || 5;
            }
            
            if (symbol == 'none') {
                itemShape.invisible = true;
                itemShape.hoverable = false;
            }
            
            /*
            if (this.deepQuery([data, serie, option], 'calculable')) {
                this.setCalculable(itemShape);
                itemShape.draggable = true;
            }
            */

            itemShape = this.addLabel(
                itemShape, 
                serie, data, name, 
                orient
            );
            
            if (symbol.match('empty')) {
                if (typeof itemShape.style.textColor == 'undefined') {
                    itemShape.style.textColor = itemShape.style.strokeColor;
                }
                if (typeof itemShape.highlightStyle.textColor == 'undefined') {
                    itemShape.highlightStyle.textColor = 
                        itemShape.highlightStyle.strokeColor;
                }
            }
            
            ecData.pack(
                itemShape,
                serie, seriesIndex,
                data, dataIndex,
                name
            );

            itemShape._mark = 'point'; // 复用animationMark
            itemShape._x = x;
            itemShape._y = y;
            
            itemShape._dataIndex = dataIndex;
            itemShape._seriesIndex = seriesIndex;

            return itemShape;
        },
        
        getLineMarkShape : function (
            mlOption,               // 系列 
            seriesIndex,            // 系列索引
            data,                   // 数据
            dataIndex,              // 数据索引
            xStart, yStart,         // 坐标
            xEnd, yEnd,             // 坐标
            color                   // 默认color，来自legend或dataRange全局分配
        ) {
            var value0 = typeof data[0] != 'undefined'
                        ? (typeof data[0].value != 'undefined'
                          ? data[0].value
                          : data[0])
                        : '-';
            var value1 = typeof data[1] != 'undefined'
                        ? (typeof data[1].value != 'undefined'
                          ? data[1].value
                          : data[1])
                        : '-';
            var symbol = [
                this.query(data[0], 'symbol') || mlOption.symbol[0],
                this.query(data[1], 'symbol') || mlOption.symbol[1]
            ];
            var symbolSize = [
                this.query(data[0], 'symbolSize') || mlOption.symbolSize[0],
                this.query(data[1], 'symbolSize') || mlOption.symbolSize[1]
            ];
            symbolSize[0] = typeof symbolSize[0] == 'function'
                            ? symbolSize[0](value0)
                            : symbolSize[0];
            symbolSize[1] = typeof symbolSize[1] == 'function'
                            ? symbolSize[1](value1)
                            : symbolSize[1];
            var symbolRotate = [
                this.query(data[0], 'symbolRotate') || mlOption.symbolRotate[0],
                this.query(data[1], 'symbolRotate') || mlOption.symbolRotate[1]
            ];
            //console.log(symbol, symbolSize, symbolRotate);
            
            var queryTarget = [data[0], mlOption];
            var normal = this.deepMerge(
                queryTarget,
                'itemStyle.normal'
            );
            normal.color = this.getItemStyleColor(normal.color, seriesIndex, dataIndex, data);
            var emphasis = this.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            );
            emphasis.color = this.getItemStyleColor(emphasis.color, seriesIndex, dataIndex, data);
            
            var nlineStyle = normal.lineStyle;
            var elineStyle = emphasis.lineStyle;
            
            var nBorderWidth = nlineStyle.width;
            if (typeof nBorderWidth == 'undefined') {
                nBorderWidth = normal.borderWidth;
            }
            var eBorderWidth = elineStyle.width;
            if (typeof eBorderWidth == 'undefined') {
                if (typeof emphasis.borderWidth != 'undefined') {
                    eBorderWidth = emphasis.borderWidth;
                }
                else {
                    eBorderWidth = nBorderWidth + 2;
                }
            }
            
            var itemShape = new MarkLineShape({
                style : {
                    smooth : mlOption.smooth ? 'spline' : false,
                    symbol : symbol, 
                    symbolSize : symbolSize,
                    symbolRotate : symbolRotate,
                    //data : [data[0].name,data[1].name],
                    xStart : xStart,
                    yStart : yStart,         // 坐标
                    xEnd : xEnd,
                    yEnd : yEnd,             // 坐标
                    brushType : 'both',
                    lineType : nlineStyle.type,
                    shadowColor : nlineStyle.shadowColor,
                    shadowBlur: nlineStyle.shadowBlur,
                    shadowOffsetX: nlineStyle.shadowOffsetX,
                    shadowOffsetY: nlineStyle.shadowOffsetY,
                    color : normal.color || color,
                    strokeColor : nlineStyle.color
                                  || normal.borderColor
                                  || normal.color
                                  || color,
                    lineWidth: nBorderWidth,
                    symbolBorderColor: normal.borderColor
                                       || normal.color
                                       || color,
                    symbolBorder: normal.borderWidth
                },
                highlightStyle : {
                    shadowColor : elineStyle.shadowColor,
                    shadowBlur: elineStyle.shadowBlur,
                    shadowOffsetX: elineStyle.shadowOffsetX,
                    shadowOffsetY: elineStyle.shadowOffsetY,
                    color : emphasis.color|| normal.color || color,
                    strokeColor : elineStyle.color
                                  || nlineStyle.color
                                  || emphasis.borderColor 
                                  || normal.borderColor
                                  || emphasis.color 
                                  || normal.color
                                  || color,
                    lineWidth: eBorderWidth,
                    symbolBorderColor: emphasis.borderColor
                                       || normal.borderColor
                                       || emphasis.color
                                       || normal.color
                                       || color,
                    symbolBorder: typeof emphasis.borderWidth == 'undefined'
                                  ? (normal.borderWidth + 2)
                                  : (emphasis.borderWidth)
                },
                clickable : true
            });
            
            itemShape = this.addLabel(
                itemShape, 
                mlOption, 
                data[0], 
                data[0].name + ' : ' + data[1].name
            );
            
           itemShape._mark = 'line';
           itemShape._x = xEnd;
           itemShape._y = yEnd;
            
            return itemShape;
        },
        
        getItemStyleColor : function (itemColor, seriesIndex, dataIndex, data) {
            return typeof itemColor == 'function'
                   ? itemColor(seriesIndex, dataIndex, data) : itemColor;
            
        },
        
        // 亚像素优化
        subPixelOptimize : function (position, lineWidth) {
            if (lineWidth % 2 == 1) {
                //position += position == Math.ceil(position) ? 0.5 : 0;
                position = Math.floor(position) + 0.5;
            }
            else {
                position = Math.round(position);
            }
            return position;
        },
        
        /**
         * 动画设定
         */
        animation : function () {
            if (_aniMap[this.type]) {
                this.animationMark(this.ecTheme.animationDuration);
            }
            else {
                this.animationEffect();
            }
        },
        
        animationMark : function (duration , easing) {
            var x;
            var y;
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                if (!this.shapeList[i]._mark) {
                    continue;
                }
                x = this.shapeList[i]._x || 0;
                y = this.shapeList[i]._y || 0;
                if (this.shapeList[i]._mark == 'point') {
                    this.zr.modShape(
                        this.shapeList[i].id, 
                        {
                            scale : [0, 0, x, y]
                        },
                        true
                    );
                    this.zr.animate(this.shapeList[i].id, '')
                        .when(
                            duration,
                            {scale : [1, 1, x, y]}
                        )
                        .start(easing || 'QuinticOut');
                }
                else if (this.shapeList[i]._mark == 'line') {
                    if (!this.shapeList[i].style.smooth) {
                        this.zr.modShape(
                            this.shapeList[i].id, 
                            {
                                style : {
                                    pointList : [
                                        [
                                            this.shapeList[i].style.xStart,
                                            this.shapeList[i].style.yStart
                                        ],
                                        [
                                            this.shapeList[i].style.xStart,
                                            this.shapeList[i].style.yStart
                                        ]
                                    ]
                                }
                            },
                            true
                        );
                        this.zr.animate(this.shapeList[i].id, 'style')
                            .when(
                                duration,
                                {
                                    pointList : [
                                        [
                                            this.shapeList[i].style.xStart,
                                            this.shapeList[i].style.yStart
                                        ],
                                        [
                                            x, y
                                        ]
                                    ]
                                }
                            )
                            .start(easing || 'QuinticOut');
                    }
                    else {
                        // 曲线动画
                        this.zr.modShape(
                            this.shapeList[i].id, 
                            {
                                style : {
                                    pointListLength : 1
                                }
                            },
                            true
                        );
                        this.zr.animate(this.shapeList[i].id, 'style')
                            .when(
                                duration,
                                {
                                    pointListLength : this.shapeList[i].style.pointList.length
                                }
                            )
                            .start(easing || 'QuinticOut');
                    }
                }
            }
            this.animationEffect();
        },

        animationEffect : function () {
            this.clearAnimationShape();
            var zlevel = EFFECT_ZLEVEL;
            if (this.canvasSupported) {
                this.zr.modLayer(
                    zlevel,
                    {
                        motionBlur : true,
                        lastFrameAlpha : 0.95
                    }
                );
            }
            
            var color;
            var shadowColor;
            var size;
            var effect;
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                shape = this.shapeList[i];
                if (!shape._mark || !shape.effect || !shape.effect.show) {
                    continue;
                }
                //console.log(shape)
                effect = shape.effect;
                color = effect.color || shape.style.strokeColor || shape.style.color;
                shadowColor = effect.shadowColor || color;
                var effectShape;
                var Offset;
                switch (shape._mark) {
                    case 'point':
                        size = effect.scaleSize;
                        shadowBlur = typeof effect.shadowBlur != 'undefined'
                                     ? effect.shadowBlur : size;
                        effectShape = new IconShape({
                            zlevel : zlevel,
                            style : {
                                brushType : 'stroke',
                                iconType : (shape.style.iconType != 'pin' 
                                            && shape.style.iconType != 'droplet')
                                           ? shape.style.iconType
                                           : 'circle',
                                x : shadowBlur + 1, // 线宽
                                y : shadowBlur + 1,
                                n : shape.style.n,
                                width : shape.style.width * size,
                                height : shape.style.height * size,
                                lineWidth : 1,
                                strokeColor : color,
                                shadowColor : shadowColor,
                                shadowBlur : shadowBlur
                            },
                            draggable : false,
                            hoverable : false
                        });
                        if (this.canvasSupported) {  // 提高性能，换成image
                            effectShape.style.image = this.zr.shapeToImage(
                                effectShape, 
                                effectShape.style.width + shadowBlur * 2 + 2, 
                                effectShape.style.height + shadowBlur * 2 + 2
                            ).style.image;
                            
                            effectShape = new ImageShape({
                                zlevel : effectShape.zlevel,
                                style : effectShape.style,
                                draggable : false,
                                hoverable : false
                            });
                        }
                        Offset = (effectShape.style.width - shape.style.width) / 2;
                        break; 
                    case 'line':
                        size = shape.style.lineWidth * effect.scaleSize;
                        shadowBlur = typeof effect.shadowBlur != 'undefined'
                                     ? effect.shadowBlur : size;
                        effectShape = new CircleShape({
                            zlevel : zlevel,
                            style : {
                                x : shadowBlur,
                                y : shadowBlur,
                                r : size,
                                color : color,
                                shadowColor : shadowColor,
                                shadowBlur : shadowBlur
                            },
                            draggable : false,
                            hoverable : false
                        });
                        if (this.canvasSupported) {  // 提高性能，换成image
                            effectShape.style.image = this.zr.shapeToImage(
                                effectShape, 
                                (size + shadowBlur) * 2,
                                (size + shadowBlur) * 2
                            ).style.image;
                            effectShape = new ImageShape({
                                zlevel : effectShape.zlevel,
                                style : effectShape.style,
                                draggable : false,
                                hoverable : false
                            });
                            Offset = shadowBlur;
                        }
                        else {
                            Offset = 0;
                        }
                        break;
                }
                
                var duration;
                // 改变坐标
                effectShape.position = shape.position;
                if (shape._mark === 'point') {
                    effectShape.style.x = shape.style.x - Offset;
                    effectShape.style.y = shape.style.y - Offset;
                    duration = (effect.period + Math.random() * 10) * 100;
                }
                else if (shape._mark === 'line') {
                    effectShape.style.x = shape.style.xStart - Offset;
                    effectShape.style.y = shape.style.yStart - Offset;
                    var distance = (shape.style.xStart - shape.style.xEnd) 
                                        * (shape.style.xStart - shape.style.xEnd)
                                    +
                                   (shape.style.yStart - shape.style.yEnd) 
                                        * (shape.style.yStart - shape.style.yEnd);
                    duration = Math.round(Math.sqrt(Math.round(
                                   distance * effect.period * effect.period
                               )));
                }
                
                this.effectList.push(effectShape);
                this.zr.addShape(effectShape);
                
                if (shape._mark === 'point') {
                    this.zr.modShape(
                        shape.id, 
                        { invisible : true},
                        true
                    );
                    var centerX = effectShape.style.x + (effectShape.style.width) /2;
                    var centerY = effectShape.style.y + (effectShape.style.height) / 2;
                    this.zr.modShape(
                        effectShape.id, 
                        {
                            scale : [0.1, 0.1, centerX, centerY]
                        },
                        true
                    );
                    
                    this.zr.animate(effectShape.id, '', true)
                        .when(
                            duration,
                            {
                                scale : [1, 1, centerX, centerY]
                            }
                        )
                        .start();
                }
                else if (shape._mark === 'line') {
                    if (!shape.style.smooth) {
                        // 直线
                        this.zr.animate(effectShape.id, 'style', true)
                            .when(
                                duration,
                                {
                                    x : shape._x - Offset,
                                    y : shape._y - Offset
                                }
                            )
                            .start();
                    }
                    else {
                        // 曲线
                        var pointList = shape.style.pointList;
                        var len = pointList.length;
                        duration = Math.round(duration / len);
                        var deferred = this.zr.animate(effectShape.id, 'style', true);
                        var step = Math.ceil(len / 8);
                        for (var j = 0; j < len - step; j+= step) {
                            deferred.when(
                                duration * (j + 1),
                                {
                                    x : pointList[j][0] - Offset,
                                    y : pointList[j][1] - Offset
                                }
                            );
                        }
                        deferred.when(
                            duration * len,
                            {
                                x : pointList[len - 1][0] - Offset,
                                y : pointList[len - 1][1] - Offset
                            }
                        );
                        deferred.start('spline');
                    }
                }
            }
        },
        
        resize : function () {
            this.refresh && this.refresh();
        },

        clearAnimationShape : function () {
            if (this.zr && this.effectList.length > 0) {
                this.zr.modLayer(
                    EFFECT_ZLEVEL, 
                    { motionBlur : false}
                );
                this.zr.delShape(this.effectList);
            }
            this.effectList = [];
        },
        
        /**
         * 清除图形数据，实例仍可用
         */
        clear :function () {
            this.clearAnimationShape();
            if (this.zr) {
                this.zr.delShape(this.shapeList);
            }
            this.shapeList = [];
        },

        /**
         * 释放后实例不可用
         */
        dispose : function () {
            this.clear();
            this.shapeList = null;
            this.effectList = null;
        },
        
        query : ecQuery.query,
        deepQuery : ecQuery.deepQuery,
        deepMerge : ecQuery.deepMerge,
        
        parsePercent : number.parsePercent,
        parseCenter : number.parseCenter,
        parseRadius : number.parseRadius,
        numAddCommas : number.addCommas
    }
    
    return Base;
});
