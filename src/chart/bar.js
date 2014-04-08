/**
 * echarts图表类：柱形图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function(require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Bar(ecConfig, messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, ecConfig, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecData = require('../util/ecData');
        
        var zrColor = require('zrender/tool/color');

        var self = this;
        self.type = ecConfig.CHART_TYPE_BAR;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();

        var _sIndex2colorMap = {};  // series默认颜色索引，seriesIndex索引到color

        function _buildShape() {
            self.selectedMap = {};

            // 水平垂直双向series索引 ，position索引到seriesIndex
            var _position2sIndexMap = {
                top : [],
                bottom : [],
                left : [],
                right : []
            };
            var xAxisIndex;
            var yAxisIndex;
            var xAxis;
            var yAxis;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_BAR) {
                    series[i] = self.reformOption(series[i]);
                    xAxisIndex = series[i].xAxisIndex;
                    yAxisIndex = series[i].yAxisIndex;
                    xAxis = component.xAxis.getAxis(xAxisIndex);
                    yAxis = component.yAxis.getAxis(yAxisIndex);
                    if (xAxis.type == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        _position2sIndexMap[xAxis.getPosition()].push(i);
                    }
                    else if (yAxis.type == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        _position2sIndexMap[yAxis.getPosition()].push(i);
                    }
                }
            }
            // console.log(_position2sIndexMap)
            for (var position in _position2sIndexMap) {
                if (_position2sIndexMap[position].length > 0) {
                    _buildSinglePosition(
                        position, _position2sIndexMap[position]
                    );
                }
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建单个方向上的柱形图
         *
         * @param {number} seriesIndex 系列索引
         */
        function _buildSinglePosition(position, seriesArray) {
            var mapData = _mapData(seriesArray);
            var locationMap = mapData.locationMap;
            var maxDataLength = mapData.maxDataLength;

            if (maxDataLength === 0 || locationMap.length === 0) {
                return;
            }

            switch (position) {
                case 'bottom' :
                case 'top' :
                    _buildHorizontal(maxDataLength, locationMap, seriesArray);
                    break;
                case 'left' :
                case 'right' :
                    _buildVertical(maxDataLength, locationMap, seriesArray);
                    break;
            }
        }


        /**
         * 数据整形
         * 数组位置映射到系列索引
         */
        function _mapData(seriesArray) {
            var serie;                              // 临时映射变量
            var dataIndex = 0;                      // 堆叠数据所在位置映射
            var stackMap = {};                      // 堆叠数据位置映射，堆叠组在二维中的第几项
            var magicStackKey = '__kener__stack__'; // 堆叠命名，非堆叠数据安单一堆叠处理
            var stackKey;                           // 临时映射变量
            var serieName;                          // 临时映射变量
            var legend = component.legend;
            var locationMap = [];                   // 需要返回的东西：数组位置映射到系列索引
            var maxDataLength = 0;                  // 需要返回的东西：最大数据长度
            var iconShape;
            // 计算需要显示的个数和分配位置并记在下面这个结构里
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                serie = series[seriesArray[i]];
                serieName = serie.name;
                if (legend){
                    self.selectedMap[serieName] = legend.isSelected(serieName);
                    _sIndex2colorMap[seriesArray[i]] =
                        legend.getColor(serieName);
                    
                    iconShape = legend.getItemShape(serieName);
                    if (iconShape) {
                        // 回调legend，换一个更形象的icon
                        if (serie.itemStyle.normal.borderWidth > 0) {
                            iconShape.style.x += 1;
                            iconShape.style.y += 1;
                            iconShape.style.width -= 2;
                            iconShape.style.height -= 2;
                            iconShape.style.strokeColor = 
                            iconShape.highlightStyle.strokeColor =
                                serie.itemStyle.normal.borderColor;
                            iconShape.highlightStyle.lineWidth = 3;
                            iconShape.style.brushType = 'both';
                        }
                        legend.setItemShape(serieName, iconShape);
                    }
                } else {
                    self.selectedMap[serieName] = true;
                    _sIndex2colorMap[seriesArray[i]] =
                        zr.getColor(seriesArray[i]);
                }

                if (self.selectedMap[serieName]) {
                    stackKey = serie.stack || (magicStackKey + seriesArray[i]);
                    if (typeof stackMap[stackKey] == 'undefined') {
                        stackMap[stackKey] = dataIndex;
                        locationMap[dataIndex] = [seriesArray[i]];
                        dataIndex++;
                    }
                    else {
                        // 已经分配了位置就推进去就行
                        locationMap[stackMap[stackKey]].push(seriesArray[i]);
                    }
                }
                // 兼职帮算一下最大长度
                maxDataLength = Math.max(maxDataLength, serie.data.length);
            }

            /* 调试输出
            var s = '';
            for (var i = 0, l = maxDataLength; i < l; i++) {
                s = '[';
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    s +='['
                    for (var m = 0, n = locationMap[j].length - 1; m < n; m++) {
                        s += series[locationMap[j][m]].data[i] + ','
                    }
                    s += series[locationMap[j][locationMap[j].length - 1]]
                         .data[i];
                    s += ']'
                }
                s += ']';
                console.log(s);
            }
            console.log(locationMap)
            */

            return {
                locationMap : locationMap,
                maxDataLength : maxDataLength
            };
        }

        /**
         * 构建类目轴为水平方向的柱形图系列
         */
        function _buildHorizontal(maxDataLength, locationMap, seriesArray) {
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var xAxisIndex = serie.xAxisIndex;
            var categoryAxis = component.xAxis.getAxis(xAxisIndex);
            var yAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var size = _mapSize(categoryAxis, locationMap);
            var gap = size.gap;
            var barGap = size.barGap;
            var barWidthMap = size.barWidthMap;
            var barWidth = size.barWidth;                   // 自适应宽度
            var barMinHeightMap = size.barMinHeightMap;
            var barHeight;

            var xMarkMap = {}; // 为标注记录一些参数
            var x;
            var y;
            var lastYP; // 正向堆叠处理
            var baseYP;
            var lastYN; // 负向堆叠处理
            var baseYN;
            var barShape;
            var data;
            var value;
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (typeof categoryAxis.getNameByIndex(i) == 'undefined') {
                    // 系列数据超出类目轴长度
                    break;
                }
                x = categoryAxis.getCoordByIndex(i) - gap / 2;
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    // 堆叠数据用第一条valueAxis
                    yAxisIndex = series[locationMap[j][0]].yAxisIndex || 0;
                    valueAxis = component.yAxis.getAxis(yAxisIndex);
                    baseYP = lastYP = baseYN = lastYN = valueAxis.getCoord(0);
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        xMarkMap[seriesIndex] = xMarkMap[seriesIndex] 
                                                || {
                                                    min : Number.POSITIVE_INFINITY,
                                                    max : Number.NEGATIVE_INFINITY,
                                                    sum : 0,
                                                    counter : 0,
                                                    average : 0
                                                };
                        if (value == '-') {
                            // 空数据在做完后补充拖拽提示框
                            continue;
                        }
                        //y = valueAxis.getCoord(value);
                        if (value > 0) {
                            // 正向堆叠
                            //barHeight = baseYP - y;
                            barHeight = m > 0 
                                        ? valueAxis.getCoordSize(value)
                                        : (baseYP - valueAxis.getCoord(value));
                            // 非堆叠数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            lastYP -= barHeight;
                            y = lastYP;
                        }
                        else if (value < 0){
                            // 负向堆叠
                            //barHeight = y - baseYN;
                            barHeight = m > 0 
                                        ? valueAxis.getCoordSize(value)
                                        : (valueAxis.getCoord(value) - baseYN);
                            // 非堆叠数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            y = lastYN;
                            lastYN += barHeight;
                        }
                        else {
                            // 0值
                            barHeight = 0;//baseYP - y;
                            // 最小高度无效
                            lastYP -= barHeight;
                            y = lastYP;
                        }

                        barShape = _getBarItem(
                            seriesIndex, i,
                            categoryAxis.getNameByIndex(i),
                            x, y,
                            barWidthMap[seriesIndex] || barWidth,
                            barHeight,
                            'vertical'
                        );
                        
                        xMarkMap[seriesIndex][i] = 
                            x + (barWidthMap[seriesIndex] || barWidth) / 2;
                        if (xMarkMap[seriesIndex].min > value) {
                            xMarkMap[seriesIndex].min = value;
                            xMarkMap[seriesIndex].minY = y;
                            xMarkMap[seriesIndex].minX = xMarkMap[seriesIndex][i];
                        }
                        if (xMarkMap[seriesIndex].max < value) {
                            xMarkMap[seriesIndex].max = value;
                            xMarkMap[seriesIndex].maxY = y;
                            xMarkMap[seriesIndex].maxX = xMarkMap[seriesIndex][i];
                        }
                        xMarkMap[seriesIndex].sum += value;
                        xMarkMap[seriesIndex].counter++;
                        self.shapeList.push(barShape);
                    }

                    // 补充空数据的拖拽提示框
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        if (value != '-') {
                            // 只关心空数据
                            continue;
                        }

                        if (self.deepQuery(
                                [data, serie, option], 'calculable'
                            )
                        ) {
                            lastYP -= ecConfig.island.r;
                            y = lastYP;

                            barShape = _getBarItem(
                                seriesIndex, i,
                                categoryAxis.getNameByIndex(i),
                                x + 0.5, y + 0.5,
                                (barWidthMap[seriesIndex] || barWidth) - 1,
                                ecConfig.island.r - 1,
                                'vertical'
                            );
                            barShape.hoverable = false;
                            barShape.draggable = false;
                            barShape.style.lineWidth = 1;
                            barShape.style.brushType = 'stroke';
                            barShape.style.strokeColor =
                                    serie.calculableHolderColor
                                    || ecConfig.calculableHolderColor;

                            self.shapeList.push(barShape);
                        }
                    }

                    x += ((barWidthMap[seriesIndex] || barWidth) + barGap);
                }
            }
            
            for (var j = 0, k = locationMap.length; j < k; j++) {
                for (var m = 0, n = locationMap[j].length; m < n; m++) {
                    seriesIndex = locationMap[j][m];
                    if (xMarkMap[seriesIndex].counter > 0) {
                        xMarkMap[seriesIndex].average = 
                            (xMarkMap[seriesIndex].sum / xMarkMap[seriesIndex].counter).toFixed(2) 
                            - 0;
                    }
                    
                    y = component.yAxis.getAxis(series[seriesIndex].yAxisIndex || 0)
                        .getCoord(xMarkMap[seriesIndex].average);
                        
                    xMarkMap[seriesIndex].averageLine = [
                        [component.grid.getX(), y],
                        [component.grid.getXend(), y]
                    ];
                    xMarkMap[seriesIndex].minLine = [
                        [component.grid.getX(), xMarkMap[seriesIndex].minY],
                        [component.grid.getXend(), xMarkMap[seriesIndex].minY]
                    ];
                    xMarkMap[seriesIndex].maxLine = [
                        [component.grid.getX(), xMarkMap[seriesIndex].maxY],
                        [component.grid.getXend(), xMarkMap[seriesIndex].maxY]
                    ];
                }
            }
                        
            _buildMark(seriesArray, xMarkMap, true);
        }

        /**
         * 构建类目轴为垂直方向的柱形图系列
         */
        function _buildVertical(maxDataLength, locationMap, seriesArray) {
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var yAxisIndex = serie.yAxisIndex;
            var categoryAxis = component.yAxis.getAxis(yAxisIndex);
            var xAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var size = _mapSize(categoryAxis, locationMap);
            var gap = size.gap;
            var barGap = size.barGap;
            var barWidthMap = size.barWidthMap;
            var barWidth = size.barWidth;                   // 自适应宽度
            var barMinHeightMap = size.barMinHeightMap;
            var barHeight;

            var xMarkMap = {}; // 为标注记录一个横向偏移
            var x;
            var y;
            var lastXP; // 正向堆叠处理
            var baseXP;
            var lastXN; // 负向堆叠处理
            var baseXN;
            var barShape;
            var data;
            var value;
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (typeof categoryAxis.getNameByIndex(i) == 'undefined') {
                    // 系列数据超出类目轴长度
                    break;
                }
                y = categoryAxis.getCoordByIndex(i) + gap / 2;
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    // 堆叠数据用第一条valueAxis
                    xAxisIndex = series[locationMap[j][0]].xAxisIndex || 0;
                    valueAxis = component.xAxis.getAxis(xAxisIndex);
                    baseXP = lastXP = baseXN = lastXN = valueAxis.getCoord(0);
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        xMarkMap[seriesIndex] = xMarkMap[seriesIndex] 
                                                || {
                                                    min : Number.POSITIVE_INFINITY,
                                                    max : Number.NEGATIVE_INFINITY,
                                                    sum : 0,
                                                    counter : 0,
                                                    average : 0
                                                };
                        if (value == '-') {
                            // 空数据在做完后补充拖拽提示框
                            continue;
                        }
                        //x = valueAxis.getCoord(value);
                        if (value > 0) {
                            // 正向堆叠
                            //barHeight = x - baseXP;
                            barHeight = m > 0 
                                        ? valueAxis.getCoordSize(value)
                                        : (valueAxis.getCoord(value) - baseXP);
                            // 非堆叠数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            x = lastXP;
                            lastXP += barHeight;
                        }
                        else if (value < 0){
                            // 负向堆叠
                            //barHeight = baseXN - x;
                            barHeight = m > 0 
                                        ? valueAxis.getCoordSize(value)
                                        : (baseXN - valueAxis.getCoord(value));
                            // 非堆叠数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            lastXN -= barHeight;
                            x = lastXN;
                        }
                        else {
                            // 0值
                            barHeight = 0;//x - baseXP;
                            // 最小高度无效
                            x = lastXP;
                            lastXP += barHeight;
                        }

                        barShape = _getBarItem(
                            seriesIndex, i,
                            categoryAxis.getNameByIndex(i),
                            x, y - (barWidthMap[seriesIndex] || barWidth),
                            barHeight,
                            barWidthMap[seriesIndex] || barWidth,
                            'horizontal'
                        );
                        
                        xMarkMap[seriesIndex][i] = 
                            y - (barWidthMap[seriesIndex] || barWidth) / 2;
                        if (xMarkMap[seriesIndex].min > value) {
                            xMarkMap[seriesIndex].min = value;
                            xMarkMap[seriesIndex].minX = x + barHeight;
                            xMarkMap[seriesIndex].minY = xMarkMap[seriesIndex][i];
                        }
                        if (xMarkMap[seriesIndex].max < value) {
                            xMarkMap[seriesIndex].max = value;
                            xMarkMap[seriesIndex].maxX = x + barHeight;
                            xMarkMap[seriesIndex].maxY = xMarkMap[seriesIndex][i];
                        }
                        xMarkMap[seriesIndex].sum += value;
                        xMarkMap[seriesIndex].counter++;
                        self.shapeList.push(barShape);
                    }

                    // 补充空数据的拖拽提示框
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        if (value != '-') {
                            // 只关心空数据
                            continue;
                        }

                        if (self.deepQuery(
                                [data, serie, option], 'calculable'
                            )
                        ) {
                            x = lastXP;
                            lastXP += ecConfig.island.r;

                            barShape = _getBarItem(
                                seriesIndex,
                                i,
                                categoryAxis.getNameByIndex(i),
                                x + 0.5, y + 0.5 - (barWidthMap[seriesIndex] || barWidth),
                                ecConfig.island.r - 1,
                                (barWidthMap[seriesIndex] || barWidth) - 1,
                                'horizontal'
                            );
                            barShape.hoverable = false;
                            barShape.draggable = false;
                            barShape.style.lineWidth = 1;
                            barShape.style.brushType = 'stroke';
                            barShape.style.strokeColor =
                                    serie.calculableHolderColor
                                    || ecConfig.calculableHolderColor;

                            self.shapeList.push(barShape);
                        }
                    }

                    y -= ((barWidthMap[seriesIndex] || barWidth) + barGap);
                }
            }
            
            for (var j = 0, k = locationMap.length; j < k; j++) {
                for (var m = 0, n = locationMap[j].length; m < n; m++) {
                    seriesIndex = locationMap[j][m];
                    if (xMarkMap[seriesIndex].counter > 0) {
                        xMarkMap[seriesIndex].average = 
                            (xMarkMap[seriesIndex].sum / xMarkMap[seriesIndex].counter).toFixed(2)
                            - 0;
                    }
                    
                    x = component.xAxis.getAxis(series[seriesIndex].xAxisIndex || 0)
                        .getCoord(xMarkMap[seriesIndex].average);
                        
                    xMarkMap[seriesIndex].averageLine = [
                        [x, component.grid.getYend()],
                        [x, component.grid.getY()]
                    ];
                    xMarkMap[seriesIndex].minLine = [
                        [xMarkMap[seriesIndex].minX, component.grid.getYend()],
                        [xMarkMap[seriesIndex].minX, component.grid.getY()]
                    ];
                    xMarkMap[seriesIndex].maxLine = [
                        [xMarkMap[seriesIndex].maxX, component.grid.getYend()],
                        [xMarkMap[seriesIndex].maxX, component.grid.getY()]
                    ];
                }
            }
            
            _buildMark(seriesArray, xMarkMap, false);
        }
        
        /**
         * 我真是自找麻烦啊，为啥要允许系列级个性化最小宽度和高度啊！！！
         * @param {CategoryAxis} categoryAxis 类目坐标轴，需要知道类目间隔大小
         * @param {Array} locationMap 整形数据的系列索引
         */
        function _mapSize(categoryAxis, locationMap, ignoreUserDefined) {
            var barWidthMap = {};
            var barMinHeightMap = {};
            var sBarWidth;
            var sBarWidthCounter = 0;
            var sBarWidthTotal = 0;
            var barGap;
            var barCategoryGap;
            var hasFound;
            var queryTarget;

            for (var j = 0, k = locationMap.length; j < k; j++) {
                hasFound = false;   // 同一堆叠第一个barWidth生效
                for (var m = 0, n = locationMap[j].length; m < n; m++) {
                    seriesIndex = locationMap[j][m];
                    queryTarget = series[seriesIndex];
                    if (!ignoreUserDefined) {
                        if (!hasFound) {
                            sBarWidth = self.query(
                                queryTarget,
                                'barWidth'
                            );
                            if (typeof sBarWidth != 'undefined') {
                                // 同一堆叠第一个生效barWidth
                                barWidthMap[seriesIndex] = sBarWidth;
                                sBarWidthTotal += sBarWidth;
                                sBarWidthCounter++;
                                hasFound = true;
                                // 复位前面同一堆叠但没被定义的
                                for (var ii = 0, ll = m; ii < ll; ii++) {
                                    var pSeriesIndex = locationMap[j][ii];
                                    barWidthMap[pSeriesIndex] = sBarWidth;
                                }
                            }
                        } else {
                            barWidthMap[seriesIndex] = sBarWidth;   // 用找到的一个
                        }
                    }

                    barMinHeightMap[seriesIndex] = self.query(
                        queryTarget,
                        'barMinHeight'
                    );
                    barGap = typeof barGap != 'undefined' 
                             ? barGap
                             : self.query(
                                   queryTarget,
                                   'barGap'
                               );
                    barCategoryGap = typeof barCategoryGap != 'undefined' 
                                     ? barCategoryGap
                                     : self.query(
                                           queryTarget,
                                           'barCategoryGap'
                                       );
                }
            }

            var gap;
            var barWidth;
            if (locationMap.length != sBarWidthCounter) {
                // 至少存在一个自适应宽度的柱形图
                if (!ignoreUserDefined) {
                    gap = typeof barCategoryGap == 'string' 
                          && barCategoryGap.match(/%$/)
                              // 百分比
                              ? Math.floor(
                                  categoryAxis.getGap() 
                                  * (100 - parseFloat(barCategoryGap)) 
                                  / 100
                                )
                              // 数值
                              : (categoryAxis.getGap() - barCategoryGap);
                    if (typeof barGap == 'string' && barGap.match(/%$/)) {
                        barGap = parseFloat(barGap) / 100;
                        barWidth = Math.floor(
                            (gap - sBarWidthTotal)
                            / ((locationMap.length - 1) * barGap 
                               + locationMap.length - sBarWidthCounter)
                        );
                        barGap = Math.floor(barWidth * barGap);
                    }
                    else {
                        barGap = parseFloat(barGap);
                        barWidth = Math.floor(
                            (gap - sBarWidthTotal 
                                 - barGap * (locationMap.length - 1)
                            )
                            / (locationMap.length - sBarWidthCounter)
                        );
                    }
                    // 无法满足用户定义的宽度设计，忽略用户宽度，打回重做
                    if (barWidth <= 0) {
                        return _mapSize(categoryAxis, locationMap, true);
                    }
                }
                else {
                    // 忽略用户定义的宽度设定
                    gap = categoryAxis.getGap();
                    barGap = 0;
                    barWidth = Math.floor(gap / locationMap.length);
                    // 已经忽略用户定义的宽度设定依然还无法满足显示，只能硬来了;
                    if (barWidth <= 0) {
                        barWidth = 1;
                    }
                }
            }
            else {
                // 全是自定义宽度，barGap无效，系列间隔决定barGap
                gap = sBarWidthCounter > 1
                      ? (typeof barCategoryGap == 'string' 
                         && barCategoryGap.match(/%$/)
                        )
                          // 百分比
                          ? Math.floor(
                              categoryAxis.getGap() 
                              * (100 - parseFloat(barCategoryGap)) 
                              / 100
                            )
                          // 数值
                          : (categoryAxis.getGap() - barCategoryGap)
                      // 只有一个
                      : sBarWidthTotal;
                barWidth = 0;
                barGap = sBarWidthCounter > 1 
                         ? Math.floor(
                               (gap - sBarWidthTotal) / (sBarWidthCounter - 1)
                           )
                         : 0;
                if (barGap < 0) {
                    // 无法满足用户定义的宽度设计，忽略用户宽度，打回重做
                    return _mapSize(categoryAxis, locationMap, true);
                }
            }

            return {
                barWidthMap : barWidthMap,
                barMinHeightMap : barMinHeightMap ,
                gap : gap,
                barWidth : barWidth,
                barGap : barGap
            };
        }

        /**
         * 生成最终图形数据
         */
        function _getBarItem(
            seriesIndex, dataIndex, name, x, y, width, height, orient
        ) {
            var barShape;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            // 多级控制
            var defaultColor = _sIndex2colorMap[seriesIndex];
            var queryTarget = [data, serie];
            var normalColor = self.deepQuery(
                queryTarget,
                'itemStyle.normal.color'
            ) || defaultColor;
            var emphasisColor = self.deepQuery(
                queryTarget,
                'itemStyle.emphasis.color'
            );
            var normal = self.deepMerge(
                queryTarget,
                'itemStyle.normal'
            );
            var normalBorderWidth = normal.borderWidth;
            var emphasis = self.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            );
            barShape = {
                shape : 'rectangle',
                zlevel : _zlevelBase,
                clickable: true,
                style : {
                    x : x,
                    y : y,
                    width : width,
                    height : height,
                    brushType : 'both',
                    color : self.getItemStyleColor(normalColor, seriesIndex, dataIndex, data),
                    radius : normal.borderRadius,
                    lineWidth : normalBorderWidth,
                    strokeColor : normal.borderColor
                },
                highlightStyle : {
                    color : self.getItemStyleColor(emphasisColor, seriesIndex, dataIndex, data),
                    radius : emphasis.borderRadius,
                    lineWidth : emphasis.borderWidth,
                    strokeColor : emphasis.borderColor
                },
                _orient : orient
            };
            barShape.highlightStyle.color = barShape.highlightStyle.color
                            || (typeof barShape.style.color == 'string'
                                ? zrColor.lift(barShape.style.color, -0.3)
                                : barShape.style.color
                               );
            // 考虑线宽的显示优化
            if (normalBorderWidth > 0
                && barShape.style.height > normalBorderWidth
                && barShape.style.width > normalBorderWidth
            ) {
                barShape.style.y += normalBorderWidth / 2;
                barShape.style.height -= normalBorderWidth;
                barShape.style.x += normalBorderWidth / 2;
                barShape.style.width -= normalBorderWidth;
            }
            else {
                // 太小了或者线宽小于0，废了边线
                barShape.style.brushType = 'fill';
            }
            
            barShape.highlightStyle.textColor = barShape.highlightStyle.color;
            
            barShape = self.addLabel(barShape, serie, data, name, orient);

            if (self.deepQuery([data, serie, option],'calculable')) {
                self.setCalculable(barShape);
                barShape.draggable = true;
            }

            ecData.pack(
                barShape,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                name
            );

            return barShape;
        }

        // 添加标注
        function _buildMark(seriesArray, xMarkMap ,isHorizontal) {
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                self.buildMark(
                    series[seriesArray[i]],
                    seriesArray[i],
                    component,
                    {
                        isHorizontal : isHorizontal,
                        xMarkMap : xMarkMap
                    }
                );
            }
        }
        
        // 位置转换
        function getMarkCoord(serie, seriesIndex, mpData, markCoordParams) {
            var xAxis = component.xAxis.getAxis(serie.xAxisIndex);
            var yAxis = component.yAxis.getAxis(serie.yAxisIndex);
            var dataIndex;
            var pos;
            if (mpData.type
                && (mpData.type == 'max' || mpData.type == 'min' || mpData.type == 'average')
            ) {
                // 特殊值内置支持
                pos = [
                    markCoordParams.xMarkMap[seriesIndex][mpData.type + 'X'],
                    markCoordParams.xMarkMap[seriesIndex][mpData.type + 'Y'],
                    markCoordParams.xMarkMap[seriesIndex][mpData.type + 'Line'],
                    markCoordParams.xMarkMap[seriesIndex][mpData.type]
                ];
            }
            else if (markCoordParams.isHorizontal) {
                // 横向
                dataIndex = typeof mpData.xAxis == 'string'
                            && xAxis.getIndexByName
                            ? xAxis.getIndexByName(mpData.xAxis)
                            : (mpData.xAxis || 0);
                pos = [
                    markCoordParams.xMarkMap[seriesIndex][dataIndex],
                    yAxis.getCoord(mpData.yAxis || 0)
                ];
            }
            else {
                // 纵向
                dataIndex = typeof mpData.yAxis == 'string'
                            && yAxis.getIndexByName
                            ? yAxis.getIndexByName(mpData.yAxis)
                            : (mpData.yAxis || 0);
                pos = [
                    xAxis.getCoord(mpData.xAxis || 0),
                    markCoordParams.xMarkMap[seriesIndex][dataIndex]
                ];
            }
            return pos;
        }
        
        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newSeries
         * @param {Object} newComponent
         */
        function init(newOption, newComponent) {
            component = newComponent;
            refresh(newOption);
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                series = option.series;
            }
            self.clear();
            _buildShape();
        }
        
        /**
         * 动态数据增加动画 
         */
        function addDataAnimation(params) {
            var aniMap = {}; // seriesIndex索引参数
            for (var i = 0, l = params.length; i < l; i++) {
                aniMap[params[i][0]] = params[i];
            }
            var x;
            var dx;
            var y;
            var dy;
            var serie;
            var seriesIndex;
            var dataIndex;
            for (var i = self.shapeList.length - 1; i >= 0; i--) {
                seriesIndex = ecData.get(self.shapeList[i], 'seriesIndex');
                if (aniMap[seriesIndex] && !aniMap[seriesIndex][3]) {
                    // 有数据删除才有移动的动画
                    if (self.shapeList[i].shape == 'rectangle') {
                        // 主动画
                        dataIndex = ecData.get(self.shapeList[i], 'dataIndex');
                        serie = series[seriesIndex];
                        if (aniMap[seriesIndex][2] 
                            && dataIndex == serie.data.length - 1
                        ) {
                            // 队头加入删除末尾
                            zr.delShape(self.shapeList[i].id);
                            continue;
                        }
                        else if (!aniMap[seriesIndex][2] && dataIndex === 0) {
                            // 队尾加入删除头部
                            zr.delShape(self.shapeList[i].id);
                            continue;
                        }
                        if (self.shapeList[i]._orient == 'horizontal') {
                            // 条形图
                            dy = component.yAxis.getAxis(
                                    serie.yAxisIndex || 0
                                 ).getGap();
                            y = aniMap[seriesIndex][2] ? -dy : dy;
                            x = 0;
                        }
                        else {
                            // 柱形图
                            dx = component.xAxis.getAxis(
                                    serie.xAxisIndex || 0
                                 ).getGap();
                            x = aniMap[seriesIndex][2] ? dx : -dx;
                            y = 0;
                        }
                        zr.animate(self.shapeList[i].id, '')
                            .when(
                                500,
                                {position : [x, y]}
                            )
                            .start();
                    }
                }
            }
        }

        /**
         * 动画设定
         */
        function animation() {
            var duration;
            var easing;
            var width;
            var height;
            var x;
            var y;
            var serie;
            var dataIndex;
            var value;
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i].shape == 'rectangle') {
                    serie = ecData.get(self.shapeList[i], 'series');
                    dataIndex = ecData.get(self.shapeList[i], 'dataIndex');
                    value = ecData.get(self.shapeList[i], 'value');
                    duration = self.deepQuery(
                        [serie, option], 'animationDuration'
                    );
                    easing = self.deepQuery(
                        [serie, option], 'animationEasing'
                    );

                    if (self.shapeList[i]._orient == 'horizontal') {
                        // 条形图
                        width = self.shapeList[i].style.width;
                        x = self.shapeList[i].style.x;
                        if (value < 0) {
                            zr.modShape(
                                self.shapeList[i].id,
                                {
                                    style: {
                                        x : x + width,
                                        width: 0
                                    }
                                },
                                true
                            );
                            zr.animate(self.shapeList[i].id, 'style')
                                .when(
                                    duration + dataIndex * 100,
                                    {
                                        x : x,
                                        width : width
                                    }
                                )
                                .start(easing);
                        }
                        else {
                            zr.modShape(
                                self.shapeList[i].id,
                                {
                                    style: {
                                        width: 0
                                    }
                                },
                                true
                            );
                            zr.animate(self.shapeList[i].id, 'style')
                                .when(
                                    duration + dataIndex * 100,
                                    {
                                        width : width
                                    }
                                )
                                .start(easing);
                        }
                    }
                    else {
                        // 柱形图
                        height = self.shapeList[i].style.height;
                        y = self.shapeList[i].style.y;
                        if (value < 0) {
                            zr.modShape(
                                self.shapeList[i].id,
                                {
                                    style: {
                                        height: 0
                                    }
                                },
                                true
                            );
                            zr.animate(self.shapeList[i].id, 'style')
                                .when(
                                    duration + dataIndex * 100,
                                    {
                                        height : height
                                    }
                                )
                                .start(easing);
                        }
                        else {
                            zr.modShape(
                                self.shapeList[i].id,
                                {
                                    style: {
                                        y: y + height,
                                        height: 0
                                    }
                                },
                                true
                            );
                            zr.animate(self.shapeList[i].id, 'style')
                                .when(
                                    duration + dataIndex * 100,
                                    {
                                        y : y,
                                        height : height
                                    }
                                )
                                .start(easing);
                        }
                    }
                }
            }
            
            self.animationMark(duration, easing);
        }

        // 重载基类方法
        self.getMarkCoord = getMarkCoord;
        self.animation = animation;
        
        self.init = init;
        self.refresh = refresh;
        self.addDataAnimation = addDataAnimation;

        init(option, component);
    }

    // 图表注册
    require('../chart').define('bar', Bar);
    
    return Bar;
});