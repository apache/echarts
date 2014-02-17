/**
 * echarts图表类：K线图
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
    function K(ecConfig, messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, ecConfig, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecData = require('../util/ecData');
        
        var self = this;
        self.type = ecConfig.CHART_TYPE_K;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();

        function _buildShape() {
            self.selectedMap = {};

            // 水平垂直双向series索引 ，position索引到seriesIndex
            var _position2sIndexMap = {
                top : [],
                bottom : []
            };
            var xAxis;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_K) {
                    series[i] = self.reformOption(series[i]);
                    xAxis = component.xAxis.getAxis(series[i].xAxisIndex);
                    if (xAxis.type == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        _position2sIndexMap[xAxis.getPosition()].push(i);
                    }
                }
            }
            //console.log(_position2sIndexMap)
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
         * 构建单个方向上的K线图
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
            _buildHorizontal(maxDataLength, locationMap);

            for (var i = 0, l = seriesArray.length; i < l; i++) {
                self.buildMark(
                    series[seriesArray[i]],
                    seriesArray[i],
                    component
                );
            }
        }

        /**
         * 数据整形
         * 数组位置映射到系列索引
         */
        function _mapData(seriesArray) {
            var serie;                              // 临时映射变量
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
                } else {
                    self.selectedMap[serieName] = true;
                }

                if (self.selectedMap[serieName]) {
                    locationMap.push(seriesArray[i]);
                }
                // 兼职帮算一下最大长度
                maxDataLength = Math.max(maxDataLength, serie.data.length);
            }
            return {
                locationMap : locationMap,
                maxDataLength : maxDataLength
            };
        }

        /**
         * 构建类目轴为水平方向的K线图系列
         */
        function _buildHorizontal(maxDataLength, locationMap) {
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex;
            var serie;
            var xAxisIndex;
            var categoryAxis;
            var yAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var pointList = {};
            var candleWidth;
            var data;
            var value;
            var barMaxWidth;
            for (var j = 0, k = locationMap.length; j < k; j++) {
                seriesIndex = locationMap[j];
                serie = series[seriesIndex];
                
                xAxisIndex = serie.xAxisIndex || 0;
                categoryAxis = component.xAxis.getAxis(xAxisIndex);
                candleWidth = serie.barWidth 
                              || Math.floor(categoryAxis.getGap() / 2);
                barMaxWidth = serie.barMaxWidth;
                if (barMaxWidth && barMaxWidth < candleWidth) {
                    candleWidth = barMaxWidth;
                }
                yAxisIndex = serie.yAxisIndex || 0;
                valueAxis = component.yAxis.getAxis(yAxisIndex);
                
                pointList[seriesIndex] = [];
                for (var i = 0, l = maxDataLength; i < l; i++) {
                    if (typeof categoryAxis.getNameByIndex(i) 
                        == 'undefined'
                    ) {
                        // 系列数据超出类目轴长度
                        break;
                    }
                    
                    data = serie.data[i];
                    value = typeof data != 'undefined'
                            ? (typeof data.value != 'undefined'
                              ? data.value
                              : data)
                            : '-';
                    if (value == '-' || value.length != 4) {
                        // 数据格式不符
                        continue;
                    }
                    pointList[seriesIndex].push([
                        categoryAxis.getCoordByIndex(i),    // 横坐标
                        candleWidth,
                        valueAxis.getCoord(value[0]),       // 纵坐标：开盘
                        valueAxis.getCoord(value[1]),       // 纵坐标：收盘
                        valueAxis.getCoord(value[2]),       // 纵坐标：最低
                        valueAxis.getCoord(value[3]),       // 纵坐标：最高
                        i,                                  // 数据index
                        categoryAxis.getNameByIndex(i)      // 类目名称
                    ]);
                }
            }
            // console.log(pointList)
            _buildKLine(pointList);
        }

        /**
         * 生成K线
         */
        function _buildKLine(pointList) {
            // normal:
            var nLineWidth;
            var nLineColor;
            var nLineColor0;    // 阴线
            var nColor;
            var nColor0;        // 阴线
            
            // emphasis:
            var eLineWidth;
            var eLineColor;
            var eLineColor0;
            var eColor;
            var eColor0;

            var serie;
            var queryTarget;
            var data;
            var seriesPL;
            var singlePoint;
            var candleType;

            for (var seriesIndex = 0, len = series.length;
                seriesIndex < len;
                seriesIndex++
            ) {
                serie = series[seriesIndex];
                seriesPL = pointList[seriesIndex];
                if (serie.type == ecConfig.CHART_TYPE_K
                    && typeof seriesPL != 'undefined'
                ) {
                    // 多级控制
                    queryTarget = serie;
                    nLineWidth = self.query(
                        queryTarget, 'itemStyle.normal.lineStyle.width'
                    );
                    nLineColor = self.query(
                        queryTarget, 'itemStyle.normal.lineStyle.color'
                    );
                    nLineColor0 = self.query(
                        queryTarget, 'itemStyle.normal.lineStyle.color0'
                    );
                    nColor = self.query(
                        queryTarget, 'itemStyle.normal.color'
                    );
                    nColor0 = self.query(
                        queryTarget, 'itemStyle.normal.color0'
                    );
                    
                    eLineWidth = self.query(
                        queryTarget, 'itemStyle.emphasis.lineStyle.width'
                    );
                    eLineColor = self.query(
                        queryTarget, 'itemStyle.emphasis.lineStyle.color'
                    );
                    eLineColor0 = self.query(
                        queryTarget, 'itemStyle.emphasis.lineStyle.color0'
                    );
                    eColor = self.query(
                        queryTarget, 'itemStyle.emphasis.color'
                    );
                    eColor0 = self.query(
                        queryTarget, 'itemStyle.emphasis.color0'
                    );

                    /*
                     * pointlist=[
                     *      0  x,
                     *      1  width, 
                     *      2  y0,
                     *      3  y1,
                     *      4  y2,
                     *      5  y3,
                     *      6  dataIndex,
                     *      7  categoryName
                     * ]
                     */
                    for (var i = 0, l = seriesPL.length; i < l; i++) {
                        singlePoint = seriesPL[i];
                        data = serie.data[singlePoint[6]];
                        queryTarget = data;
                        candleType = singlePoint[3] < singlePoint[2];
                        self.shapeList.push(_getCandle(
                            seriesIndex,    // seriesIndex
                            singlePoint[6], // dataIndex
                            singlePoint[7], // name
                            
                            singlePoint[0], // x
                            singlePoint[1], // width
                            singlePoint[2], // y开盘
                            singlePoint[3], // y收盘
                            singlePoint[4], // y最低
                            singlePoint[5], // y最高
                            
                            // 填充颜色
                            candleType
                            ? (self.query(          // 阳
                                   queryTarget, 'itemStyle.normal.color'
                               ) || nColor)
                            : (self.query(          // 阴
                                   queryTarget, 'itemStyle.normal.color0'
                               ) || nColor0),
                            
                            // 线宽
                            self.query(
                               queryTarget, 'itemStyle.normal.lineStyle.width'
                            ) || nLineWidth,
                            
                            // 线色
                            candleType
                            ? (self.query(          // 阳
                                   queryTarget,
                                   'itemStyle.normal.lineStyle.color'
                               ) || nLineColor)
                            : (self.query(          // 阴
                                   queryTarget,
                                   'itemStyle.normal.lineStyle.color0'
                               ) || nLineColor0),
                            
                            //------------高亮
                            
                            // 填充颜色
                            candleType
                            ? (self.query(          // 阳
                                   queryTarget, 'itemStyle.emphasis.color'
                               ) || eColor || nColor)
                            : (self.query(          // 阴
                                   queryTarget, 'itemStyle.emphasis.color0'
                               ) || eColor0 || nColor0),
                            
                            // 线宽
                            self.query(
                               queryTarget, 'itemStyle.emphasis.lineStyle.width'
                            ) || eLineWidth || nLineWidth,
                            
                            // 线色
                            candleType
                            ? (self.query(          // 阳
                                   queryTarget,
                                   'itemStyle.emphasis.lineStyle.color'
                               ) || eLineColor || nLineColor)
                            : (self.query(          // 阴
                                   queryTarget,
                                   'itemStyle.emphasis.lineStyle.color0'
                               ) || eLineColor0 || nLineColor0)
                        ));
                    }
                }
            }
            // console.log(self.shapeList)
        }

        /**
         * 生成K线图上的图形
         */
        function _getCandle(
            seriesIndex, dataIndex, name, 
            x, width, y0, y1, y2, y3, 
            nColor, nLinewidth, nLineColor, 
            eColor, eLinewidth, eLineColor
        ) {
            var itemShape = {
                shape : 'candle',
                zlevel : _zlevelBase,
                clickable: true,
                style : {
                    x : x,
                    y : [y0, y1, y2, y3],
                    width : width,
                    color : nColor,
                    strokeColor : nLineColor,
                    lineWidth : nLinewidth,
                    brushType : 'both'
                },
                highlightStyle : {
                    color : eColor,
                    strokeColor : eLineColor,
                    lineWidth : eLinewidth
                },
                _seriesIndex: seriesIndex
            };
            ecData.pack(
                itemShape,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                name
            );

            return itemShape;
        }

        // 位置转换
        function getMarkCoord(serie, seriesIndex, mpData) {
            var xAxis = component.xAxis.getAxis(serie.xAxisIndex);
            var yAxis = component.yAxis.getAxis(serie.yAxisIndex);
            
            return [
                typeof mpData.xAxis != 'string' 
                && xAxis.getCoordByIndex
                ? xAxis.getCoordByIndex(mpData.xAxis || 0)
                : xAxis.getCoord(mpData.xAxis || 0),
                
                typeof mpData.yAxis != 'string' 
                && yAxis.getCoordByIndex
                ? yAxis.getCoordByIndex(mpData.yAxis || 0)
                : yAxis.getCoord(mpData.yAxis || 0)
            ];
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
         * 动画设定
         */
        function addDataAnimation(params) {
            var aniMap = {}; // seriesIndex索引参数
            for (var i = 0, l = params.length; i < l; i++) {
                aniMap[params[i][0]] = params[i];
            }
            var x;
            var dx;
            var y;
            var serie;
            var seriesIndex;
            var dataIndex;
             for (var i = 0, l = self.shapeList.length; i < l; i++) {
                seriesIndex = self.shapeList[i]._seriesIndex;
                if (aniMap[seriesIndex] && !aniMap[seriesIndex][3]) {
                    // 有数据删除才有移动的动画
                    if (self.shapeList[i].shape == 'candle') {
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
                        dx = component.xAxis.getAxis(
                                serie.xAxisIndex || 0
                             ).getGap();
                        x = aniMap[seriesIndex][2] ? dx : -dx;
                        y = 0;
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
            var duration = self.query(option, 'animationDuration');
            var easing = self.query(option, 'animationEasing');
            var x;
            var y;
            var serie;

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i].shape == 'candle') {
                    serie = series[self.shapeList[i]._seriesIndex];
                    x = self.shapeList[i].style.x;
                    y = self.shapeList[i].style.y[0];
                    zr.modShape(
                        self.shapeList[i].id,
                        { scale : [1, 0, x, y] },
                        true
                    );
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            (self.query(serie,'animationDuration')
                            || duration),
                            {scale : [1, 1, x, y]}
                        )
                        .start(
                            self.query(serie, 'animationEasing') || easing
                        );
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
    
    // 动态扩展zrender shape：candle
    require('../util/shape/candle');

    // 图表注册
    require('../chart').define('k', K);
    
    return K;
});