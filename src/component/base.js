/**
 * echarts组件基类
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function(require) {
    function Base(zr){
        var ecConfig = require('../config');
        var ecData = require('../util/ecData');
        var zrUtil = require('zrender/tool/util');
        var self = this;

        self.zr =zr;

        self.shapeList = [];
        
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

                case ecConfig.COMPONENT_TYPE_TOOLTIP :
                    return 7;

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
         * 获取嵌套选项的基础方法
         * 返回optionTarget中位于optionLocation上的值，如果没有定义，则返回undefined
         */
        function query(optionTarget, optionLocation) {
            if (typeof optionTarget == 'undefined') {
                return undefined;
            }
            if (!optionLocation) {
                return optionTarget;
            }
            optionLocation = optionLocation.split('.');

            var length = optionLocation.length;
            var curIdx = 0;
            while (curIdx < length) {
                optionTarget = optionTarget[optionLocation[curIdx]];
                if (typeof optionTarget == 'undefined') {
                    return undefined;
                }
                curIdx++;
            }
            return optionTarget;
        }
            
        /**
         * 获取多级控制嵌套属性的基础方法
         * 返回ctrList中优先级最高（最靠前）的非undefined属性，ctrList中均无定义则返回undefined
         */
        function deepQuery(ctrList, optionLocation) {
            var finalOption;
            for (var i = 0, l = ctrList.length; i < l; i++) {
                finalOption = query(ctrList[i], optionLocation);
                if (typeof finalOption != 'undefined') {
                    return finalOption;
                }
            }
            return undefined;
        }
        
        /**
         * 获取多级控制嵌套属性的基础方法
         * 根据ctrList中优先级合并产出目标属性
         */
        function deepMerge (ctrList, optionLocation) {
            var finalOption;
            var tempOption;
            var len = ctrList.length;
            while (len--) {
                tempOption = query(ctrList[len], optionLocation);
                if (typeof tempOption != 'undefined') {
                    if (typeof finalOption == 'undefined') {
                        finalOption = zrUtil.clone(tempOption);
                    }
                    else {
                        zrUtil.merge(
                            finalOption, tempOption,
                            { 'overwrite': true, 'recursive': true }
                        );
                    }
                }
            }
            return finalOption;
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
            var nLabel = deepMerge(queryTarget, 'itemStyle.normal.label');
            var eLabel = deepMerge(queryTarget, 'itemStyle.emphasis.label');

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
                pos = [
                    self.getMarkCoord(
                        serie, seriesIndex, mlData[0], markCoordParams
                    ),
                    self.getMarkCoord(
                        serie, seriesIndex, mlData[1], markCoordParams
                    )
                ];
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
                data[i].tooltip = {trigger:'item'}; // tooltip.trigger指定为item
                data[i].name = typeof data[i].name != 'undefined'
                               ? data[i].name : '';
                data[i].value = typeof data[i].value != 'undefined'
                                ? data[i].value : '';
                
                // 复用getSymbolShape
                itemShape = getSymbolShape(
                    mpOption, seriesIndex,      // 系列 
                    data[i], i, data[i].name,   // 数据
                    parsePercent(data[i].x, zrWidth),   // 坐标
                    parsePercent(data[i].y, zrHeight),  // 坐标
                    'pin', color,               // 默认symbol和color
                    'rgba(0,0,0,0)',
                    'horizontal'                // 走向，用于默认文字定位
                );
                
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
            var zrWidth = self.zr.getWidth();
            var zrHeight = self.zr.getHeight();
            for (var i = 0, l = data.length; i < l; i++) {
                // 图例
                if (legend) {
                    color = legend.getColor(serie.name);
                }
                // 值域
                if (dataRange) {
                    value = typeof data[i][0] != 'undefined'
                            ? (typeof data[i][0].value != 'undefined'
                              ? data[i][0].value
                              : data[i][0])
                            : '-';
                    color = isNaN(value) ? color : dataRange.getColor(value);
                    
                    queryTarget = [data[i][0], mlOption];
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
                data[i][0].tooltip = {trigger:'item'}; // tooltip.trigger指定为item
                data[i][0].name = typeof data[i][0].name != 'undefined'
                                  ? data[i][0].name : '';
                data[i][1].name = typeof data[i][1].name != 'undefined'
                                  ? data[i][1].name : '';
                data[i][0].value = typeof data[i][0].value != 'undefined'
                                   ? data[i][0].value : '';
                
                // 复用getSymbolShape
                itemShape = getLineMarkShape(
                    mlOption,                   // markLine 
                    data[i],                    // 数据
                    parsePercent(data[i][0].x, zrWidth),   // 坐标
                    parsePercent(data[i][0].y, zrHeight),  // 坐标
                    parsePercent(data[i][1].x, zrWidth),   // 坐标
                    parsePercent(data[i][1].y, zrHeight),  // 坐标
                    color               // 默认symbol和color
                );
                
                // 重新pack一下数据
                ecData.pack(
                    itemShape,
                    serie, seriesIndex,
                    data[i][0], 0,
                    data[i][0].name + ' : ' + data[i][1].name
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
            serie, seriesIndex,    // 系列 
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
                       : (normal.lineStyle && normal.lineStyle.width * 2);
            if (typeof nBorderWidth == 'undefined') {
                nBorderWidth = 0;
            }
            var eBorderWidth = typeof emphasis.borderWidth != 'undefined'
                       ? emphasis.borderWidth
                       : (emphasis.lineStyle && emphasis.lineStyle.width * 2);
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
                            : (normal.color || color),
                    strokeColor : normal.borderColor || normal.color || color,
                    lineWidth: nBorderWidth
                },
                highlightStyle : {
                    color : symbol.match('empty') 
                            ? emptyColor 
                            : (emphasis.color|| normal.color || color),
                    strokeColor : emphasis.borderColor || normal.borderColor 
                                  || emphasis.color || normal.color || color,
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
            mlOption,                  // 系列 
            data,                   // 数据
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
            var emphasis = self.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            );
            
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
                                  || color
                                  || normal.color,
                    lineWidth: nBorderWidth,
                    symbolBorderColor: normal.borderColor
                                       || color
                                       || normal.color,
                    symbolBorder: normal.borderWidth * 2
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
                                  || color 
                                  || emphasis.color 
                                  || normal.color,
                    lineWidth: eBorderWidth,
                    symbolBorderColor: emphasis.borderColor
                                       || normal.borderColor
                                       || color
                                       || emphasis.color
                                       || normal.color,
                    symbolBorder: typeof emphasis.borderWidth == 'undefined'
                                  ? (normal.borderWidth * 2 + 2)
                                  : (emphasis.borderWidth * 2)
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
        
        /**
         * 百分比计算
         */
        function parsePercent(value, maxValue) {
            if (typeof(value) === 'string') {
                if (_trim(value).match(/%$/)) {
                    return parseFloat(value) / 100 * maxValue;
                } else {
                    return parseFloat(value);
                }
            } else {
                return value;
            }
        }
        
        /**
         * 获取中心坐标
         */ 
        function parseCenter(center) {
            return [
                parsePercent(center[0], self.zr.getWidth()),
                parsePercent(center[1], self.zr.getHeight()),
            ];
        }

        /**
         * 获取自适应半径
         */ 
        function parseRadius(radius) {
            // 传数组实现环形图，[内半径，外半径]，传单个则默认为外半径为
            if (!(radius instanceof Array)) {
                radius = [0, radius];
            }
            var zrSize = Math.min(self.zr.getWidth(), self.zr.getHeight()) / 2;
            return [
                parsePercent(radius[0], zrSize),
                parsePercent(radius[1], zrSize),
            ];
        }
        
        // 每三位默认加,格式化
        function numAddCommas(x){
            x = (x + '').split('.');
            return x[0].replace(/(\d{1,3})(?=(?:\d{3})+(?!\d))/g,'$1,') 
                   + (x.length > 1 ? ('.' + x[1]) : '');
        }
        
        function _trim(str) {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
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
        }
        
        function animationMark(duration /*, easing*/) {
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
                        .start('QuinticOut');
                }
                else if (self.shapeList[i]._mark == 'line') {
                    zr.modShape(
                        self.shapeList[i].id, 
                        {
                            style : {
                                xEnd : self.shapeList[i].style.xStart,
                                yEnd : self.shapeList[i].style.yStart
                            }
                        },
                        true
                    );
                    zr.animate(self.shapeList[i].id, 'style')
                        .when(
                            duration,
                            {
                                xEnd : x,
                                yEnd : y
                            }
                        )
                        .start('QuinticOut');
                }
            }
        }

        function resize() {
            self.refresh && self.refresh();
        }

        /**
         * 清除图形数据，实例仍可用
         */
        function clear() {
            if (self.zr) {
                self.zr.delShape(self.shapeList);
                self.zr.clearAnimation 
                    && self.zr.clearAnimation();
            }
            self.shapeList = [];
        }

        /**
         * 释放后实例不可用
         */
        function dispose() {
            self.clear();
            self.shapeList = null;
            self = null;
        }

        /**
         * 基类方法
         */
        self.getZlevelBase = getZlevelBase;
        self.reformOption = reformOption;
        self.reformCssArray = reformCssArray;
        self.query = query;
        self.deepQuery = deepQuery;
        self.deepMerge = deepMerge;
        self.getFont = getFont;
        self.addLabel = addLabel;
        self.buildMark = buildMark;
        self.getMarkCoord = getMarkCoord;
        self.getSymbolShape = getSymbolShape;
        self.parsePercent = parsePercent;
        self.parseCenter = parseCenter;
        self.parseRadius = parseRadius;
        self.numAddCommas = numAddCommas;
        self.subPixelOptimize = subPixelOptimize;
        self.animation = animation;
        self.animationMark = animationMark;
        self.resize = resize;
        self.clear = clear;
        self.dispose = dispose;
    }

    return Base;
});
