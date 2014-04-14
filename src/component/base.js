/**
 * echarts组件基类
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function(require) {
    function Base(ecConfig, zr){
        var ecData = require('../util/ecData');
        var ecQuery = require('../util/ecQuery');
        var number = require('../util/number');
        var zrUtil = require('zrender/tool/util');
        var zrArea = require('zrender/tool/area');
        //var zrColor = require('zrender/tool/color');
        var self = this;

        self.zr =zr;

        self.shapeList = [];
        self.effectList = [];
        
        var EFFECT_ZLEVEL = 7;
        var _canvasSupported = require('zrender/tool/env').canvasSupported;
        
        var _aniMap = {};
        _aniMap[ecConfig.CHART_TYPE_LINE] = true;
        _aniMap[ecConfig.CHART_TYPE_BAR] = true;
        _aniMap[ecConfig.CHART_TYPE_SCATTER] = true;
        _aniMap[ecConfig.CHART_TYPE_PIE] = true;
        _aniMap[ecConfig.CHART_TYPE_RADAR] = true;
        _aniMap[ecConfig.CHART_TYPE_MAP] = true;
        _aniMap[ecConfig.CHART_TYPE_K] = true;
        _aniMap[ecConfig.CHART_TYPE_CHORD] = true;

        /**
         * 获取zlevel基数配置
         * @param {Object} contentType
         */
        function getZlevelBase(contentType) {
            contentType = contentType || self.type + '';

            switch (contentType) {
                case ecConfig.COMPONENT_TYPE_GRID :
                case ecConfig.COMPONENT_TYPE_AXIS_CATEGORY :
                case ecConfig.COMPONENT_TYPE_AXIS_VALUE :
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
        }

        /**
         * 参数修正&默认值赋值
         * @param {Object} opt 参数
         *
         * @return {Object} 修正后的参数
         */
        function reformOption(opt) {
            return zrUtil.merge(
                       opt || {},
                       zrUtil.clone(ecConfig[self.type] || {}),
                       {
                           'overwrite': false,
                           'recursive': true
                       }
                   );
        }

        /**
         * css类属性数组补全，如padding，margin等~
         */
        function reformCssArray(p) {
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
        }

        /**
         * 获取自定义和默认配置合并后的字体设置
         */
        function getFont(textStyle) {
            var finalTextStyle = zrUtil.merge(
                zrUtil.clone(textStyle) || {},
                ecConfig.textStyle,
                { 'overwrite': false}
            );
            return finalTextStyle.fontStyle + ' '
                   + finalTextStyle.fontWeight + ' '
                   + finalTextStyle.fontSize + 'px '
                   + finalTextStyle.fontFamily;
        }
        
        /**
         * 添加文本 
         */
        function addLabel(tarShape, serie, data, name, orient) {
            // 多级控制
            var queryTarget = [data, serie];
            var nLabel = self.deepMerge(queryTarget, 'itemStyle.normal.label');
            var eLabel = self.deepMerge(queryTarget, 'itemStyle.emphasis.label');

            var nTextStyle = nLabel.textStyle || {};
            var eTextStyle = eLabel.textStyle || {};
            
            if (nLabel.show) {
                tarShape.style.text = _getLabelText(
                    serie, data, name, 'normal'
                );
                tarShape.style.textPosition = 
                    typeof nLabel.position == 'undefined'
                        ? (orient == 'horizontal' ? 'right' : 'top')
                        : nLabel.position;
                tarShape.style.textColor = nTextStyle.color;
                tarShape.style.textFont = self.getFont(nTextStyle);
            }
            if (eLabel.show) {
                tarShape.highlightStyle.text = _getLabelText(
                    serie, data, name, 'emphasis'
                );
                tarShape.highlightStyle.textPosition = nLabel.show
                    ? tarShape.style.textPosition
                    : (typeof eLabel.position == 'undefined'
                        ? (orient == 'horizontal' ? 'right' : 'top')
                        : eLabel.position);
                tarShape.highlightStyle.textColor = eTextStyle.color;
                tarShape.highlightStyle.textFont = self.getFont(eTextStyle);
            }
            
            return tarShape;
        }
        
        /**
         * 根据lable.format计算label text
         */
        function _getLabelText(serie, data, name, status) {
            var formatter = self.deepQuery(
                [data, serie],
                'itemStyle.' + status + '.label.formatter'
            );
            if (!formatter && status == 'emphasis') {
                // emphasis时需要看看normal下是否有formatter
                formatter = self.deepQuery(
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
        }
        
        function buildMark(
            serie, seriesIndex, component, markCoordParams, attachStyle
        ) {
            if (self.selectedMap[serie.name]) {
                serie.markPoint && _buildMarkPoint(
                    serie, seriesIndex, component, markCoordParams, attachStyle
                );
                serie.markLine && _buildMarkLine(
                    serie, seriesIndex, component, markCoordParams, attachStyle
                );
            }
        }
        
        function _buildMarkPoint(
            serie, seriesIndex, component, markCoordParams, attachStyle
        ) {
            var _zlevelBase = self.getZlevelBase();
            var mpData;
            var pos;
            var markPoint = zrUtil.clone(serie.markPoint);
            for (var i = 0, l = markPoint.data.length; i < l; i++) {
                mpData = markPoint.data[i];
                pos = self.getMarkCoord(
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
                        || (zrArea.getTextWidth(pos[3], self.getFont()) / 2 + 5);
                }
            }
            
            var shapeList = _markPoint(
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
                    shapeList[i][key] = attachStyle[key];
                }
                self.shapeList.push(shapeList[i]);
            }
            // 个别特殊图表需要自己addShape
            if (self.type == ecConfig.CHART_TYPE_FORCE
                || self.type == ecConfig.CHART_TYPE_CHORD
            ) {
                for (var i = 0, l = shapeList.length; i < l; i++) {
                    shapeList[i].id = self.zr.newShapeId(self.type);
                    self.zr.addShape(shapeList[i]);
                }
            }
        }
        
        function _buildMarkLine(
            serie, seriesIndex, component, markCoordParams, attachStyle
        ) {
            var _zlevelBase = self.getZlevelBase();
            var mlData;
            var pos;
            var markLine = zrUtil.clone(serie.markLine);
            for (var i = 0, l = markLine.data.length; i < l; i++) {
                mlData = markLine.data[i];
                if (mlData.type
                    && (mlData.type == 'max' || mlData.type == 'min' || mlData.type == 'average')
                ) {
                    // 特殊值内置支持
                    pos = self.getMarkCoord(serie, seriesIndex, mlData, markCoordParams);
                    markLine.data[i] = [zrUtil.clone(mlData), {}];
                    markLine.data[i][0].name = mlData.name || mlData.type;
                    markLine.data[i][0].value = pos[3];
                    pos = pos[2];
                    mlData = [{},{}];
                }
                else {
                    pos = [
                        self.getMarkCoord(
                            serie, seriesIndex, mlData[0], markCoordParams
                        ),
                        self.getMarkCoord(
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
            
            var shapeList = _markLine(
                serie, seriesIndex, markLine, component
            );
            
            for (var i = 0, l = shapeList.length; i < l; i++) {
                shapeList[i].zlevel = _zlevelBase + 1;
                for (var key in attachStyle) {
                    shapeList[i][key] = attachStyle[key];
                }
                self.shapeList.push(shapeList[i]);
            }
            // 个别特殊图表需要自己addShape
            if (self.type == ecConfig.CHART_TYPE_FORCE
                || self.type == ecConfig.CHART_TYPE_CHORD
            ) {
                for (var i = 0, l = shapeList.length; i < l; i++) {
                    shapeList[i].id = self.zr.newShapeId(self.type);
                    self.zr.addShape(shapeList[i]);
                }
            }
        }
        
        function _markPoint(serie, seriesIndex, mpOption, component) {
            zrUtil.merge(
                mpOption,
                ecConfig.markPoint,
                {
                    'overwrite': false,
                    'recursive': true
                }
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
            var zrWidth = self.zr.getWidth();
            var zrHeight = self.zr.getHeight();
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
                    nColor = self.deepQuery(
                        queryTarget, 'itemStyle.normal.color'
                    ) || color;
                    eColor = self.deepQuery(
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
                itemShape = getSymbolShape(
                    mpOption, seriesIndex,      // 系列 
                    data[i], i, data[i].name,   // 数据
                    self.parsePercent(data[i].x, zrWidth),   // 坐标
                    self.parsePercent(data[i].y, zrHeight),  // 坐标
                    'pin', color,               // 默认symbol和color
                    'rgba(0,0,0,0)',
                    'horizontal'                // 走向，用于默认文字定位
                );
                
                effect = self.deepMerge(
                    [data[i], mpOption],
                    'effect'
                );
                if (effect.show) {
                    itemShape.effect = effect;
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
        }
        
        function _markLine(serie, seriesIndex, mlOption, component) {
            zrUtil.merge(
                mlOption,
                ecConfig.markLine,
                {
                    'overwrite': false,
                    'recursive': true
                }
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
            var zrWidth = self.zr.getWidth();
            var zrHeight = self.zr.getHeight();
            var mergeData;
            for (var i = 0, l = data.length; i < l; i++) {
                // 图例
                if (legend) {
                    color = legend.getColor(serie.name);
                }
                // 组装一个mergeData
                mergeData = self.deepMerge(data[i]);
                // 值域
                if (dataRange) {
                    value = typeof mergeData != 'undefined'
                            ? (typeof mergeData.value != 'undefined'
                              ? mergeData.value
                              : mergeData)
                            : '-';
                    color = isNaN(value) ? color : dataRange.getColor(value);
                    
                    queryTarget = [mergeData, mlOption];
                    nColor = self.deepQuery(
                        queryTarget, 'itemStyle.normal.color'
                    ) || color;
                    eColor = self.deepQuery(
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
                
                itemShape = getLineMarkShape(
                    mlOption,                   // markLine
                    seriesIndex,
                    data[i],                    // 数据
                    i,
                    self.parsePercent(data[i][0].x, zrWidth),   // 坐标
                    self.parsePercent(data[i][0].y, zrHeight),  // 坐标
                    self.parsePercent(data[i][1].x, zrWidth),   // 坐标
                    self.parsePercent(data[i][1].y, zrHeight),  // 坐标
                    color                       // 默认symbol和color
                );
                
                effect = self.deepMerge(
                    [mergeData, mlOption],
                    'effect'
                );
                if (effect.show) {
                    itemShape.effect = effect;
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
        }
        
        function getMarkCoord() {
            // 无转换位置
            return [0, 0];
        }
        
        function getSymbolShape(
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
            
            symbol = self.deepQuery(queryTarget, 'symbol') || symbol;
            var symbolSize = self.deepQuery(queryTarget, 'symbolSize');
            symbolSize = typeof symbolSize == 'function'
                         ? symbolSize(value)
                         : symbolSize;
            var symbolRotate = self.deepQuery(queryTarget, 'symbolRotate');
            
            var normal = self.deepMerge(
                queryTarget,
                'itemStyle.normal'
            );
            var emphasis = self.deepMerge(
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
            
            var itemShape = {
                shape : 'icon',
                style : {
                    iconType : symbol.replace('empty', '').toLowerCase(),
                    x : x - symbolSize,
                    y : y - symbolSize,
                    width : symbolSize * 2,
                    height : symbolSize * 2,
                    brushType : 'both',
                    color : symbol.match('empty') 
                            ? emptyColor 
                            : (self.getItemStyleColor(normal.color, seriesIndex, dataIndex, data)
                               || color),
                    strokeColor : normal.borderColor 
                              || self.getItemStyleColor(normal.color, seriesIndex, dataIndex, data)
                              || color,
                    lineWidth: nBorderWidth
                },
                highlightStyle : {
                    color : symbol.match('empty') 
                            ? emptyColor 
                            : self.getItemStyleColor(emphasis.color, seriesIndex, dataIndex, data),
                    strokeColor : emphasis.borderColor 
                              || normal.borderColor
                              || self.getItemStyleColor(normal.color, seriesIndex, dataIndex, data)
                              || color,
                    lineWidth: eBorderWidth
                },
                clickable : true
            };

            if (symbol.match('image')) {
                itemShape.style.image = 
                    symbol.replace(new RegExp('^image:\\/\\/'), '');
                itemShape.shape = 'image';
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
            if (self.deepQuery([data, serie, option], 'calculable')) {
                self.setCalculable(itemShape);
                itemShape.draggable = true;
            }
            */

            itemShape = self.addLabel(
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
        }
        
        function getLineMarkShape(
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
                self.query(data[0], 'symbol') || mlOption.symbol[0],
                self.query(data[1], 'symbol') || mlOption.symbol[1]
            ];
            var symbolSize = [
                self.query(data[0], 'symbolSize') || mlOption.symbolSize[0],
                self.query(data[1], 'symbolSize') || mlOption.symbolSize[1]
            ];
            symbolSize[0] = typeof symbolSize[0] == 'function'
                            ? symbolSize[0](value0)
                            : symbolSize[0];
            symbolSize[1] = typeof symbolSize[1] == 'function'
                            ? symbolSize[1](value1)
                            : symbolSize[1];
            var symbolRotate = [
                self.query(data[0], 'symbolRotate') || mlOption.symbolRotate[0],
                self.query(data[1], 'symbolRotate') || mlOption.symbolRotate[1]
            ];
            //console.log(symbol, symbolSize, symbolRotate);
            
            var queryTarget = [data[0], mlOption];
            var normal = self.deepMerge(
                queryTarget,
                'itemStyle.normal'
            );
            normal.color = self.getItemStyleColor(normal.color, seriesIndex, dataIndex, data);
            var emphasis = self.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            );
            emphasis.color = self.getItemStyleColor(emphasis.color, seriesIndex, dataIndex, data);
            
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
            
            var itemShape = {
                shape : 'markLine',
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
            };
            
            itemShape = self.addLabel(
                itemShape, 
                mlOption, 
                data[0], 
                data[0].name + ' : ' + data[1].name
            );
            
           itemShape._mark = 'line';
           itemShape._x = xEnd;
           itemShape._y = yEnd;
            
            return itemShape;
        }
        
        function getItemStyleColor(itemColor, seriesIndex, dataIndex, data) {
            return typeof itemColor == 'function'
                   ? itemColor(seriesIndex, dataIndex, data) : itemColor;
            
        }
        
        // 亚像素优化
        function subPixelOptimize(position, lineWidth) {
            if (lineWidth % 2 == 1) {
                //position += position == Math.ceil(position) ? 0.5 : 0;
                position = Math.floor(position) + 0.5;
            }
            else {
                position = Math.round(position);
            }
            return position;
        }
        
        /**
         * 动画设定
         */
        function animation() {
            if (_aniMap[self.type]) {
                self.animationMark(ecConfig.animationDuration);
            }
            else {
                self.animationEffect();
            }
        }
        
        function animationMark(duration , easing) {
            var x;
            var y;
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (!self.shapeList[i]._mark) {
                    continue;
                }
                x = self.shapeList[i]._x || 0;
                y = self.shapeList[i]._y || 0;
                if (self.shapeList[i]._mark == 'point') {
                    zr.modShape(
                        self.shapeList[i].id, 
                        {
                            scale : [0, 0, x, y]
                        },
                        true
                    );
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            duration,
                            {scale : [1, 1, x, y]}
                        )
                        .start(easing || 'QuinticOut');
                }
                else if (self.shapeList[i]._mark == 'line') {
                    if (!self.shapeList[i].style.smooth) {
                        zr.modShape(
                            self.shapeList[i].id, 
                            {
                                style : {
                                    pointList : [
                                        [
                                            self.shapeList[i].style.xStart,
                                            self.shapeList[i].style.yStart
                                        ],
                                        [
                                            self.shapeList[i].style.xStart,
                                            self.shapeList[i].style.yStart
                                        ]
                                    ]
                                }
                            },
                            true
                        );
                        zr.animate(self.shapeList[i].id, 'style')
                            .when(
                                duration,
                                {
                                    pointList : [
                                        [
                                            self.shapeList[i].style.xStart,
                                            self.shapeList[i].style.yStart
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
                        zr.modShape(
                            self.shapeList[i].id, 
                            {
                                style : {
                                    pointListLength : 1
                                }
                            },
                            true
                        );
                        zr.animate(self.shapeList[i].id, 'style')
                            .when(
                                duration,
                                {
                                    pointListLength : self.shapeList[i].style.pointList.length
                                }
                            )
                            .start(easing || 'QuinticOut');
                    }
                }
            }
            self.animationEffect();
        }

        function animationEffect() {
            clearAnimationShape();
            var zlevel = EFFECT_ZLEVEL;
            if (_canvasSupported) {
                zr.modLayer(
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
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                shape = self.shapeList[i];
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
                        effectShape = {
                            shape : shape.shape,
                            id : zr.newShapeId(),
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
                        };
                        if (_canvasSupported) {  // 提高性能，换成image
                            effectShape.style.image = zr.shapeToImage(
                                effectShape, 
                                effectShape.style.width + shadowBlur * 2 + 2, 
                                effectShape.style.height + shadowBlur * 2 + 2
                            ).style.image;
                            effectShape.shape = 'image';
                        }
                        Offset = (effectShape.style.width - shape.style.width) / 2;
                        break; 
                    case 'line':
                        size = shape.style.lineWidth * effect.scaleSize;
                        shadowBlur = typeof effect.shadowBlur != 'undefined'
                                     ? effect.shadowBlur : size;
                        effectShape = {
                            shape : 'circle',
                            id : zr.newShapeId(),
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
                        };
                        if (_canvasSupported) {  // 提高性能，换成image
                            effectShape.style.image = zr.shapeToImage(
                                effectShape, 
                                (size + shadowBlur) * 2,
                                (size + shadowBlur) * 2
                            ).style.image;
                            effectShape.shape = 'image';
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
                    var distance = 
                        (shape.style.xStart - shape._x) * (shape.style.xStart - shape._x)
                        +
                        (shape.style.yStart - shape._y) * (shape.style.yStart - shape._y);
                    duration = Math.round(Math.sqrt(Math.round(
                                   distance * effect.period * effect.period
                               )));
                }
                
                self.effectList.push(effectShape);
                zr.addShape(effectShape);
                
                if (shape._mark === 'point') {
                    zr.modShape(
                        shape.id, 
                        { invisible : true},
                        true
                    );
                    var centerX = effectShape.style.x + (effectShape.style.width) /2;
                    var centerY = effectShape.style.y + (effectShape.style.height) / 2;
                    zr.modShape(
                        effectShape.id, 
                        {
                            scale : [0.1, 0.1, centerX, centerY]
                        },
                        true
                    );
                    
                    zr.animate(effectShape.id, '', true)
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
                        zr.animate(effectShape.id, 'style', true)
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
                        var deferred = zr.animate(effectShape.id, 'style', true);
                        for (var j = 0; j < len; j++) {
                            deferred.when(
                                duration * (j + 1),
                                {
                                    x : pointList[j][0] - Offset,
                                    y : pointList[j][1] - Offset
                                }
                            );
                        }
                        deferred.start();
                    }
                }
            }
        }
        
        function resize() {
            self.refresh && self.refresh();
        }

        function clearAnimationShape() {
            if (self.zr && self.effectList.length > 0) {
                self.zr.modLayer(
                    EFFECT_ZLEVEL, 
                    { motionBlur : false}
                );
                self.zr.delShape(self.effectList);
            }
            self.effectList = [];
        }
        
        /**
         * 清除图形数据，实例仍可用
         */
        function clear() {
            clearAnimationShape();
            if (self.zr) {
                self.zr.delShape(self.shapeList);
            }
            self.shapeList = [];
        }

        /**
         * 释放后实例不可用
         */
        function dispose() {
            self.clear();
            self.shapeList = null;
            self.effectList = null;
            self = null;
        }

        /**
         * 基类方法
         */
        self.getZlevelBase = getZlevelBase;
        self.reformOption = reformOption;
        self.reformCssArray = reformCssArray;
        
        self.query = ecQuery.query;
        self.deepQuery = ecQuery.deepQuery;
        self.deepMerge = ecQuery.deepMerge;
        
        self.getFont = getFont;
        self.addLabel = addLabel;
        self.buildMark = buildMark;
        self.getMarkCoord = getMarkCoord;
        self.getSymbolShape = getSymbolShape;
        
        self.parsePercent = number.parsePercent;
        self.parseCenter = number.parseCenter;
        self.parseRadius = number.parseRadius;
        self.numAddCommas = number.addCommas;
        
        self.getItemStyleColor = getItemStyleColor;
        self.subPixelOptimize = subPixelOptimize;
        self.animation = animation;
        self.animationMark = animationMark;
        self.animationEffect = animationEffect;
        self.resize = resize;
        self.clearAnimationShape = clearAnimationShape;
        self.clear = clear;
        self.dispose = dispose;
    }

    return Base;
});
