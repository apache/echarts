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
    function Bar(messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

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
                    _buildHorizontal(maxDataLength, locationMap);
                    break;
                case 'left' :
                case 'right' :
                    _buildVertical(maxDataLength, locationMap);
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
            // 计算需要显示的个数和分配位置并记在下面这个结构里
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                serie = series[seriesArray[i]];
                serieName = serie.name;
                if (legend){
                    self.selectedMap[serieName] = legend.isSelected(serieName);
                    _sIndex2colorMap[seriesArray[i]] =
                        legend.getColor(serieName);
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
        function _buildHorizontal(maxDataLength, locationMap) {
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
                    baseYP = lastYP = valueAxis.getCoord(0) - 1;
                    baseYN = lastYN = lastYP + 2;
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        if (value == '-') {
                            // 空数据在做完后补充拖拽提示框
                            continue;
                        }
                        y = valueAxis.getCoord(value);
                        if (value > 0) {
                            // 正向堆叠
                            barHeight = baseYP - y;
                            // 非堆叠数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            lastYP -= barHeight;
                            y = lastYP;
                            lastYP -= 0.5; //白色视觉分隔线宽修正
                        }
                        else if (value < 0){
                            // 负向堆叠
                            barHeight = y - baseYN;
                            // 非堆叠数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            y = lastYN;
                            lastYN += barHeight;
                            lastYN += 0.5; //白色视觉分隔线宽修正
                        }
                        else {
                            // 0值
                            barHeight = baseYP - y;
                            // 最小高度无效
                            lastYP -= barHeight;
                            y = lastYP;
                            lastYP -= 0.5; //白色视觉分隔线宽修正
                        }

                        barShape = _getBarItem(
                            seriesIndex, i,
                            categoryAxis.getNameByIndex(i),
                            x, y,
                            barWidthMap[seriesIndex] || barWidth,
                            barHeight
                        );
                        barShape._orient = 'vertical';

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
                            lastYP -= barMinHeightMap[seriesIndex];
                            y = lastYP;

                            barShape = _getBarItem(
                                seriesIndex, i,
                                categoryAxis.getNameByIndex(i),
                                x + 1, y,
                                (barWidthMap[seriesIndex] || barWidth) - 2,
                                barMinHeightMap[seriesIndex]
                            );
                            barShape.hoverable = false;
                            barShape.draggable = false;
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
        }

        /**
         * 构建类目轴为垂直方向的柱形图系列
         */
        function _buildVertical(maxDataLength, locationMap) {
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
                    baseXP = lastXP = valueAxis.getCoord(0) + 1;
                    baseXN = lastXN = lastXP - 2;
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        if (value == '-') {
                            // 空数据在做完后补充拖拽提示框
                            continue;
                        }
                        x = valueAxis.getCoord(value);
                        if (value > 0) {
                            // 正向堆叠
                            barHeight = x - baseXP;
                            // 非堆叠数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            x = lastXP;
                            lastXP += barHeight;
                            lastXP += 0.5; //白色视觉分隔线宽修正
                        }
                        else if (value < 0){
                            // 负向堆叠
                            barHeight = baseXN - x;
                            // 非堆叠数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            lastXN -= barHeight;
                            x = lastXN;
                            lastXN -= 0.5; //白色视觉分隔线宽修正
                        }
                        else {
                            // 0值
                            barHeight = x - baseXP;
                            // 最小高度无效
                            x = lastXP;
                            lastXP += barHeight;
                            lastXP += 0.5; //白色视觉分隔线宽修正
                        }

                        barShape = _getBarItem(
                            seriesIndex, i,
                            categoryAxis.getNameByIndex(i),
                            x, y - (barWidthMap[seriesIndex] || barWidth),
                            barHeight,
                            barWidthMap[seriesIndex] || barWidth
                        );
                        barShape._orient = 'horizontal';

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
                            lastXP += barMinHeightMap[seriesIndex];

                            barShape = _getBarItem(
                                seriesIndex,
                                i,
                                categoryAxis.getNameByIndex(i),
                                x,
                                y + 1 - (barWidthMap[seriesIndex] || barWidth),
                                barMinHeightMap[seriesIndex],
                                (barWidthMap[seriesIndex] || barWidth) - 2
                            );
                            barShape.hoverable = false;
                            barShape.draggable = false;
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
            var sBarMinHeight;
            var hasFound;

            for (var j = 0, k = locationMap.length; j < k; j++) {
                hasFound = false;   // 同一堆叠第一个barWidth生效
                for (var m = 0, n = locationMap[j].length; m < n; m++) {
                    seriesIndex = locationMap[j][m];
                    if (!ignoreUserDefined) {
                        if (!hasFound) {
                            sBarWidth = self.deepQuery(
                                [series[seriesIndex]],
                                'barWidth'
                            );
                            if (typeof sBarWidth != 'undefined') {
                                barWidthMap[seriesIndex] = sBarWidth;
                                sBarWidthTotal += sBarWidth;
                                sBarWidthCounter++;
                                hasFound = true;
                            }
                        } else {
                            barWidthMap[seriesIndex] = sBarWidth;   // 用找到的一个
                        }
                    }

                    sBarMinHeight = self.deepQuery(
                        [series[seriesIndex]],
                        'barMinHeight'
                    );
                    if (typeof sBarMinHeight != 'undefined') {
                        barMinHeightMap[seriesIndex] = sBarMinHeight;
                    }
                }
            }

            var gap;
            var barWidth;
            var barGap;
            if (locationMap.length != sBarWidthCounter) {
                // 至少存在一个自适应宽度的柱形图
                gap = Math.round(categoryAxis.getGap() * 4 / 5);
                barWidth = Math.round(
                        ((gap - sBarWidthTotal) * 3)
                        / (4 * (locationMap.length) - 3 * sBarWidthCounter - 1)
                    );
                barGap = Math.round(barWidth / 3);
                if (barWidth < 0) {
                    // 无法满足用户定义的宽度设计，忽略用户宽度，打回重做
                    return _mapSize(categoryAxis, locationMap, true);
                }
            }
            else {
                // 全是自定义宽度
                barWidth = 0;
                barGap = Math.round((sBarWidthTotal / sBarWidthCounter) / 3);
                gap = sBarWidthTotal + barGap * (sBarWidthCounter - 1);
                if (Math.round(categoryAxis.getGap() * 4 / 5) < gap) {
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
            seriesIndex, dataIndex, name, x, y, width, height
        ) {
            var barShape;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            // 多级控制
            var defaultColor = _sIndex2colorMap[seriesIndex];
            var normalColor = self.deepQuery(
                [data, serie],
                'itemStyle.normal.color'
            );
            var emphasisColor = self.deepQuery(
                [data, serie],
                'itemStyle.emphasis.color'
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
                    color : normalColor || defaultColor,
                    strokeColor : '#fff'
                },
                highlightStyle : {
                    color : emphasisColor || normalColor || defaultColor
                }
            };

            if (self.deepQuery(
                    [data, serie, option],
                    'calculable'
                )
            ) {
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

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
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
                                }
                            );
                            zr.animate(self.shapeList[i].id, 'style')
                                .when(
                                    duration + dataIndex * 100,
                                    {
                                        x : x,
                                        width : width
                                    },
                                    easing
                                )
                                .start();
                        }
                        else {
                            zr.modShape(
                                self.shapeList[i].id,
                                {
                                    style: {
                                        width: 0
                                    }
                                }
                            );
                            zr.animate(self.shapeList[i].id, 'style')
                                .when(
                                    duration + dataIndex * 100,
                                    {
                                        width : width
                                    },
                                    easing
                                )
                                .start();
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
                                }
                            );
                            zr.animate(self.shapeList[i].id, 'style')
                                .when(
                                    duration + dataIndex * 100,
                                    {
                                        height : height
                                    },
                                    easing
                                )
                                .start();
                        }
                        else {
                            zr.modShape(
                                self.shapeList[i].id,
                                {
                                    style: {
                                        y: y + height,
                                        height: 0
                                    }
                                }
                            );
                            zr.animate(self.shapeList[i].id, 'style')
                                .when(
                                    duration + dataIndex * 100,
                                    {
                                        y : y,
                                        height : height
                                    },
                                    easing
                                )
                                .start();
                        }
                    }
                }
            }
        }

        self.init = init;
        self.refresh = refresh;
        self.animation = animation;

        init(option, component);
    }

    // 图表注册
    require('../chart').define('bar', Bar);
    
    return Bar;
});