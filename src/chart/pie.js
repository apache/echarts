/**
 * echarts图表类：饼图
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
    function Pie(ecConfig, messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, ecConfig, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecData = require('../util/ecData');

        var zrMath = require('zrender/tool/math');
        var zrUtil = require('zrender/tool/util');
        var zrColor = require('zrender/tool/color');

        var self = this;
        self.type = ecConfig.CHART_TYPE_PIE;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();
        
        var _selectedMode;
        var _selected = {};

        function _buildShape() {
            var legend = component.legend;
            self.selectedMap = {};
            _selected = {};
            var center;
            var radius;

            var pieCase;        // 饼图箱子
            _selectedMode = false;
            var serieName;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_PIE) {
                    series[i] = self.reformOption(series[i]);
                    serieName = series[i].name || '';
                    // 系列图例开关
                    self.selectedMap[serieName] = 
                        legend ? legend.isSelected(serieName) : true;
                    if (!self.selectedMap[serieName]) {
                        continue;
                    }
                    
                    center = self.parseCenter(zr, series[i].center);
                    radius = self.parseRadius(zr, series[i].radius);
                    _selectedMode = _selectedMode || series[i].selectedMode;
                    _selected[i] = [];
                    if (self.deepQuery([series[i], option], 'calculable')) {
                        pieCase = {
                            shape : radius[0] <= 10 ? 'circle' : 'ring',
                            zlevel : _zlevelBase,
                            hoverable : false,
                            style : {
                                x : center[0],          // 圆心横坐标
                                y : center[1],          // 圆心纵坐标
                                // 圆环内外半径
                                r0 : radius[0] <= 10 ? 0 : radius[0] - 10,
                                r : radius[1] + 10,
                                brushType : 'stroke',
                                lineWidth: 1,
                                strokeColor : series[i].calculableHolderColor
                                              || ecConfig.calculableHolderColor
                            }
                        };
                        ecData.pack(pieCase, series[i], i, undefined, -1);
                        self.setCalculable(pieCase);
                        self.shapeList.push(pieCase);
                    }
                    _buildSinglePie(i);
                    self.buildMark(
                        series[i],
                        i,
                        component
                    );
                }
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建单个饼图
         *
         * @param {number} seriesIndex 系列索引
         */
        function _buildSinglePie(seriesIndex) {
            var serie = series[seriesIndex];
            var data = serie.data;
            var legend = component.legend;
            var itemName;
            var totalSelected = 0;               // 迭代累计选中且非0个数
            var totalSelectedValue0 = 0;         // 迭代累计选中0只个数
            var totalValue = 0;                  // 迭代累计
            var maxValue = Number.NEGATIVE_INFINITY;

            // 计算需要显示的个数和总值
            for (var i = 0, l = data.length; i < l; i++) {
                itemName = data[i].name;
                if (legend){
                    self.selectedMap[itemName] = legend.isSelected(itemName);
                } else {
                    self.selectedMap[itemName] = true;
                }
                if (self.selectedMap[itemName] && !isNaN(data[i].value)) {
                    if (+data[i].value !== 0) {
                        totalSelected++;
                    }
                    else {
                        totalSelectedValue0++;
                    }
                    totalValue += +data[i].value;
                    maxValue = Math.max(maxValue, +data[i].value);
                }
            }

            var percent = 100;
            var lastPercent;    // 相邻细角度优化
            var lastAddRadius = 0;
            var clockWise = serie.clockWise;
            var startAngle = serie.startAngle.toFixed(2) - 0;
            var endAngle;
            var minAngle = serie.minAngle || 0.01; // #bugfixed
            var totalAngle = 360 - (minAngle * totalSelected) 
                                 - 0.01 * totalSelectedValue0;
            var defaultColor;
            var roseType = serie.roseType;
            var radius;
            var r0;     // 扇形内半径
            var r1;     // 扇形外半径

            for (var i = 0, l = data.length; i < l; i++){
                itemName = data[i].name;
                if (!self.selectedMap[itemName] || isNaN(data[i].value)) {
                    continue;
                }
                // 默认颜色策略
                if (legend) {
                    // 有图例则从图例中获取颜色定义
                    defaultColor = legend.getColor(itemName);
                }
                else {
                    // 全局颜色定义
                    defaultColor = zr.getColor(i);
                }

                lastPercent = percent;
                percent = data[i].value / totalValue;
                if (roseType != 'area') {
                    endAngle = clockWise
                        ? (startAngle - percent * totalAngle - (percent !== 0 ? minAngle : 0.01))
                        : (percent * totalAngle + startAngle + (percent !== 0 ? minAngle : 0.01));
                }
                else {
                    endAngle = clockWise
                        ? (startAngle - 360 / l)
                        : (360 / l + startAngle);
                }
                endAngle = endAngle.toFixed(2) - 0;
                percent = (percent * 100).toFixed(2);
                
                radius = self.parseRadius(zr, serie.radius);
                r0 = +radius[0];
                r1 = +radius[1];
                
                if (roseType == 'radius') {
                    r1 = data[i].value / maxValue * (r1 - r0) * 0.8 
                         + (r1 - r0) * 0.2
                         + r0;
                }
                else if (roseType == 'area') {
                    r1 = Math.sqrt(data[i].value / maxValue) * (r1 - r0) + r0;
                }
                
                if (clockWise) {
                    var temp;
                    temp = startAngle;
                    startAngle = endAngle;
                    endAngle = temp; 
                }
                
                // 当前小角度需要检查前一个是否也是小角度，如果是得调整长度，不能完全避免，但能大大降低覆盖概率
                if (i > 0 
                    && percent < 4       // 约15度
                    && lastPercent < 4
                    && _needLabel(serie, data[i], false)
                    && self.deepQuery(
                           [data[i], serie], 'itemStyle.normal.label.position'
                       ) != 'center'
                ) {
                    // 都小就延长，前小后大就缩短
                    lastAddRadius += (percent < 4 ? 20 : -20);
                }
                else {
                    lastAddRadius = 0;
                }
                
                _buildItem(
                    seriesIndex, i, percent, lastAddRadius, // 相邻最小角度优化
                    data[i].selected,
                    r0, r1,
                    startAngle, endAngle, defaultColor
                );
                if (!clockWise) {
                    startAngle = endAngle;
                }
            }
        }

        /**
         * 构建单个扇形及指标
         */
        function _buildItem(
            seriesIndex, dataIndex, percent, lastAddRadius,
            isSelected,
            r0, r1,
            startAngle, endAngle, defaultColor
        ) {
            // 扇形
            var sector = _getSector(
                    seriesIndex, dataIndex, percent, isSelected,
                    r0, r1,
                    startAngle, endAngle, defaultColor
                );
            // 图形需要附加的私有数据
            ecData.pack(
                sector,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                series[seriesIndex].data[dataIndex].name,
                percent
            );
            sector._lastAddRadius = lastAddRadius;
            self.shapeList.push(sector);

            // 文本标签，需要显示则会有返回
            var label = _getLabel(
                    seriesIndex, dataIndex, percent, lastAddRadius,
                    startAngle, endAngle, defaultColor,
                    false
                );
            if (label) {
                label._dataIndex = dataIndex;
                self.shapeList.push(label);
            }

            // 文本标签视觉引导线，需要显示则会有返回
            var labelLine = _getLabelLine(
                    seriesIndex, dataIndex, lastAddRadius,
                    r0, r1,
                    startAngle, endAngle, defaultColor,
                    false
                );
            if (labelLine) {
                labelLine._dataIndex = dataIndex;
                self.shapeList.push(labelLine);
            }
        }

        /**
         * 构建扇形
         */
        function _getSector(
            seriesIndex, dataIndex, percent, isSelected,
            r0, r1,
            startAngle, endAngle, defaultColor
        ) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            var queryTarget = [data, serie];
            var center = self.parseCenter(zr, serie.center);

            // 多级控制
            var normal = self.deepMerge(
                queryTarget,
                'itemStyle.normal'
            ) || {};
            var emphasis = self.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            ) || {};
            var normalColor = self.getItemStyleColor(normal.color, seriesIndex, dataIndex, data)
                              || defaultColor;
            
            var emphasisColor = self.getItemStyleColor(emphasis.color, seriesIndex, dataIndex, data)
                || (typeof normalColor == 'string'
                    ? zrColor.lift(normalColor, -0.2)
                    : normalColor
                );

            var sector = {
                shape : 'sector',             // 扇形
                zlevel : _zlevelBase,
                clickable : true,
                style : {
                    x : center[0],          // 圆心横坐标
                    y : center[1],          // 圆心纵坐标
                    r0 : r0,         // 圆环内半径
                    r : r1,          // 圆环外半径
                    startAngle : startAngle,
                    endAngle : endAngle,
                    brushType : 'both',
                    color : normalColor,
                    lineWidth : normal.borderWidth,
                    strokeColor : normal.borderColor,
                    lineJoin: 'round'
                },
                highlightStyle : {
                    color : emphasisColor,
                    lineWidth : emphasis.borderWidth,
                    strokeColor : emphasis.borderColor,
                    lineJoin: 'round'
                },
                _seriesIndex : seriesIndex, 
                _dataIndex : dataIndex
            };
            
            if (isSelected) {
                var midAngle = 
                    ((sector.style.startAngle + sector.style.endAngle) / 2)
                    .toFixed(2) - 0;
                sector.style._hasSelected = true;
                sector.style._x = sector.style.x;
                sector.style._y = sector.style.y;
                var offset = self.query(serie, 'selectedOffset');
                sector.style.x += zrMath.cos(midAngle, true) * offset;
                sector.style.y -= zrMath.sin(midAngle, true) * offset;
                
                _selected[seriesIndex][dataIndex] = true;
            }
            else {
                _selected[seriesIndex][dataIndex] = false;
            }
            
            
            if (_selectedMode) {
                sector.onclick = self.shapeHandler.onclick;
            }
            
            if (self.deepQuery([data, serie, option], 'calculable')) {
                self.setCalculable(sector);
                sector.draggable = true;
            }

            // “normal下不显示，emphasis显示”添加事件响应
            if (_needLabel(serie, data, true)          // emphasis下显示文本
                || _needLabelLine(serie, data, true)   // emphasis下显示引导线
            ) {
                sector.onmouseover = self.shapeHandler.onmouseover;
            }
            return sector;
        }

        /**
         * 需要显示则会有返回构建好的shape，否则返回undefined
         */
        function _getLabel(
            seriesIndex, dataIndex, percent, lastAddRadius,
            startAngle, endAngle, defaultColor,
            isEmphasis
        ) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            
            // 特定状态下是否需要显示文本标签
            if (!_needLabel(serie, data, isEmphasis)) {
                return;
            }
            
            var status = isEmphasis ? 'emphasis' : 'normal';

            // serie里有默认配置，放心大胆的用！
            var itemStyle = zrUtil.merge(
                    zrUtil.clone(data.itemStyle) || {},
                    serie.itemStyle,
                    {
                        'overwrite' : false,
                        'recursive' : true
                    }
                );
            // label配置
            var labelControl = itemStyle[status].label;
            var textStyle = labelControl.textStyle || {};

            var center = self.parseCenter(zr, serie.center);
            var centerX = center[0];                      // 圆心横坐标
            var centerY = center[1];                      // 圆心纵坐标
            var x;
            var y;
            var midAngle = ((endAngle + startAngle) / 2 + 360) % 360; // 中值
            var radius = self.parseRadius(zr, serie.radius);  // 标签位置半径
            var textAlign;
            var textBaseline = 'middle';
            labelControl.position = labelControl.position 
                                    || itemStyle.normal.label.position;
            if (labelControl.position == 'center') {
                // center显示
                radius = radius[1];
                x = centerX;
                y = centerY;
                textAlign = 'center';
            }
            else if (labelControl.position == 'inner'){
                // 内部显示
                radius = (radius[0] + radius[1]) / 2 + lastAddRadius;
                x = Math.round(
                    centerX + radius * zrMath.cos(midAngle, true)
                );
                y = Math.round(
                    centerY - radius * zrMath.sin(midAngle, true)
                );
                defaultColor = '#fff';
                textAlign = 'center';
                
            }
            else {
                // 外部显示，默认 labelControl.position == 'outer')
                radius = radius[1]
                         - (-itemStyle[status].labelLine.length)
                         //- (-textStyle.fontSize)
                         + lastAddRadius;
                x = centerX + radius * zrMath.cos(midAngle, true);
                y = centerY - radius * zrMath.sin(midAngle, true);
                textAlign = (midAngle >= 90 && midAngle <= 270)
                            ? 'right' : 'left';
            }
            
            if (labelControl.position != 'center'
                && labelControl.position != 'inner'
            ) {
                x += textAlign == 'left' ? 20 : -20;
            }
            data.__labelX = x - (textAlign == 'left' ? 5 : -5);
            data.__labelY = y;
            
            return {
                shape : 'text',
                zlevel : _zlevelBase + 1,
                hoverable : false,
                style : {
                    x : x,
                    y : y,
                    color : textStyle.color || defaultColor,
                    text : _getLabelText(
                        seriesIndex, dataIndex, percent, status
                    ),
                    textAlign : textStyle.align || textAlign,
                    textBaseline : textStyle.baseline || textBaseline,
                    textFont : self.getFont(textStyle)
                },
                highlightStyle : {
                    brushType : 'fill'
                },
                _seriesIndex : seriesIndex, 
                _dataIndex : dataIndex
            };
        }

        /**
         * 根据lable.format计算label text
         */
        function _getLabelText(seriesIndex, dataIndex, percent, status) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            var formatter = self.deepQuery(
                [data, serie],
                'itemStyle.' + status + '.label.formatter'
            );
            
            if (formatter) {
                if (typeof formatter == 'function') {
                    return formatter(
                        serie.name,
                        data.name,
                        data.value,
                        percent
                    );
                }
                else if (typeof formatter == 'string') {
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}')
                                         .replace('{d}','{d0}');
                    formatter = formatter.replace('{a0}', serie.name)
                                         .replace('{b0}', data.name)
                                         .replace('{c0}', data.value)
                                         .replace('{d0}', percent);
    
                    return formatter;
                }
            }
            else {
                return data.name;
            }
        }
        
        /**
         * 需要显示则会有返回构建好的shape，否则返回undefined
         */
        function _getLabelLine(
            seriesIndex, dataIndex, lastAddRadius,
            r0, r1,
            startAngle, endAngle, defaultColor,
            isEmphasis
        ) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];

            // 特定状态下是否需要显示文本标签
            if (_needLabelLine(serie, data, isEmphasis)) {
                var status = isEmphasis ? 'emphasis' : 'normal';

                // serie里有默认配置，放心大胆的用！
                var itemStyle = zrUtil.merge(
                        zrUtil.clone(data.itemStyle) || {},
                        serie.itemStyle,
                        {
                            'overwrite' : false,
                            'recursive' : true
                        }
                    );
                // labelLine配置
                var labelLineControl = itemStyle[status].labelLine;
                var lineStyle = labelLineControl.lineStyle || {};

                var center = self.parseCenter(zr, serie.center);
                var centerX = center[0];                    // 圆心横坐标
                var centerY = center[1];                    // 圆心纵坐标
                // 视觉引导线起点半径
                var midRadius = r1;
                // 视觉引导线终点半径
                var maxRadius = self.parseRadius(zr, serie.radius)[1] 
                                - (-labelLineControl.length)
                                + lastAddRadius;
                var midAngle = ((endAngle + startAngle) / 2) % 360; // 角度中值
                var cosValue = zrMath.cos(midAngle, true);
                var sinValue = zrMath.sin(midAngle, true);
                // 三角函数缓存已在zrender/tool/math中做了
                return {
                    shape : 'brokenLine',
                    zlevel : _zlevelBase + 1,
                    hoverable : false,
                    style : {
                        pointList : [
                            [
                                centerX + midRadius * cosValue,
                                centerY - midRadius * sinValue
                            ],
                            [
                                centerX + maxRadius * cosValue,
                                centerY - maxRadius * sinValue
                            ],
                            [
                                data.__labelX,
                                data.__labelY
                            ]
                        ],
                        //xStart : centerX + midRadius * cosValue,
                        //yStart : centerY - midRadius * sinValue,
                        //xEnd : centerX + maxRadius * cosValue,
                        //yEnd : centerY - maxRadius * sinValue,
                        strokeColor : lineStyle.color || defaultColor,
                        lineType : lineStyle.type,
                        lineWidth : lineStyle.width
                    },
                    _seriesIndex : seriesIndex, 
                    _dataIndex : dataIndex
                };
            }
            else {
                return;
            }
        }

        /**
         * 返回特定状态（normal or emphasis）下是否需要显示label标签文本
         * @param {Object} serie
         * @param {Object} data
         * @param {boolean} isEmphasis true is 'emphasis' and false is 'normal'
         */
        function _needLabel(serie, data, isEmphasis) {
            return self.deepQuery(
                [data, serie],
                'itemStyle.'
                + (isEmphasis ? 'emphasis' : 'normal')
                + '.label.show'
            );
        }

        /**
         * 返回特定状态（normal or emphasis）下是否需要显示labelLine标签视觉引导线
         * @param {Object} serie
         * @param {Object} data
         * @param {boolean} isEmphasis true is 'emphasis' and false is 'normal'
         */
        function _needLabelLine(serie, data, isEmphasis) {
            return self.deepQuery(
                [data, serie],
                'itemStyle.'
                + (isEmphasis ? 'emphasis' : 'normal')
                +'.labelLine.show'
            );
        }
        
        /**
         * 参数修正&默认值赋值，重载基类方法
         * @param {Object} opt 参数
         */
        function reformOption(opt) {
            // 常用方法快捷方式
            var _merge = zrUtil.merge;
            opt = _merge(
                      opt || {},
                      ecConfig.pie,
                      {
                          'overwrite' : false,
                          'recursive' : true
                      }
                  );

            // 通用字体设置
            opt.itemStyle.normal.label.textStyle = _merge(
                opt.itemStyle.normal.label.textStyle || {},
                ecConfig.textStyle,
                {
                    'overwrite' : false,
                    'recursive' : true
                }
            );
            opt.itemStyle.emphasis.label.textStyle = _merge(
                opt.itemStyle.emphasis.label.textStyle || {},
                ecConfig.textStyle,
                {
                    'overwrite' : false,
                    'recursive' : true
                }
            );

            return opt;
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
         * 心跳效果
        function addDataAnimation(params) {
            var aniMap = {}; // seriesIndex索引参数
            for (var i = 0, l = params.length; i < l; i++) {
                aniMap[params[i][0]] = params[i];
            }
            var x;
            var y;
            var r;
            var seriesIndex;
            for (var i = self.shapeList.length - 1; i >= 0; i--) {
                seriesIndex = ecData.get(self.shapeList[i], 'seriesIndex');
                if (aniMap[seriesIndex]) {
                    if (self.shapeList[i].shape == 'sector'
                        || self.shapeList[i].shape == 'circle'
                        || self.shapeList[i].shape == 'ring'
                    ) {
                        r = self.shapeList[i].style.r;
                        zr.animate(self.shapeList[i].id, 'style')
                            .when(
                                300,
                                {r : r * 0.9}
                            )
                            .when(
                                500,
                                {r : r}
                            )
                            .start();
                    }
                }
            }
        }
         */
        
        /**
         * 动态数据增加动画 
         */
        function addDataAnimation(params) {
            var aniMap = {}; // seriesIndex索引参数
            for (var i = 0, l = params.length; i < l; i++) {
                aniMap[params[i][0]] = params[i];
            }
            
            // 构建新的饼图匹配差异做动画
            var sectorMap = {};
            var textMap = {};
            var lineMap = {};
            var backupShapeList = zrUtil.clone(self.shapeList);
            self.shapeList = [];
            
            var seriesIndex;
            var isHead;
            var dataGrow;
            var deltaIdxMap = {};   // 修正新增数据后会对dataIndex产生错位匹配
            for (var i = 0, l = params.length; i < l; i++) {
                seriesIndex = params[i][0];
                isHead = params[i][2];
                dataGrow = params[i][3];
                if (series[seriesIndex]
                    && series[seriesIndex].type == ecConfig.CHART_TYPE_PIE
                ) {
                    if (isHead) {
                        if (!dataGrow) {
                            sectorMap[
                                seriesIndex 
                                + '_' 
                                + series[seriesIndex].data.length
                            ] = 'delete';
                        }
                        deltaIdxMap[seriesIndex] = 1;
                    }
                    else {
                        if (!dataGrow) {
                            sectorMap[seriesIndex + '_-1'] = 'delete';
                            deltaIdxMap[seriesIndex] = -1;
                        }
                        else {
                            deltaIdxMap[seriesIndex] = 0;
                        }
                    }
                    _buildSinglePie(seriesIndex);
                }
            }
            var dataIndex;
            var key;
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                seriesIndex = self.shapeList[i]._seriesIndex;
                dataIndex = self.shapeList[i]._dataIndex;
                key = seriesIndex + '_' + dataIndex;
                // map映射让n*n变n
                switch (self.shapeList[i].shape) {
                    case 'sector' :
                        sectorMap[key] = self.shapeList[i];
                        break;
                    case 'text' :
                        textMap[key] = self.shapeList[i];
                        break;
                    case 'line' :
                        lineMap[key] = self.shapeList[i];
                        break;
                }
            }
            self.shapeList = [];
            var targeSector;
            for (var i = 0, l = backupShapeList.length; i < l; i++) {
                seriesIndex = backupShapeList[i]._seriesIndex;
                if (aniMap[seriesIndex]) {
                    dataIndex = backupShapeList[i]._dataIndex
                                + deltaIdxMap[seriesIndex];
                    key = seriesIndex + '_' + dataIndex;
                    targeSector = sectorMap[key];
                    if (!targeSector) {
                        continue;
                    }
                    if (backupShapeList[i].shape == 'sector') {
                        if (targeSector != 'delete') {
                            // 原有扇形
                            zr.animate(backupShapeList[i].id, 'style')
                                .when(
                                    400,
                                    {
                                        startAngle : 
                                            targeSector.style.startAngle,
                                        endAngle : 
                                            targeSector.style.endAngle
                                    }
                                )
                                .start();
                        }
                        else {
                            // 删除的扇形
                            zr.animate(backupShapeList[i].id, 'style')
                                .when(
                                    400,
                                    deltaIdxMap[seriesIndex] < 0
                                    ? {
                                        endAngle : 
                                            backupShapeList[i].style.startAngle
                                      }
                                    : {
                                        startAngle :
                                            backupShapeList[i].style.endAngle
                                      }
                                )
                                .start();
                        }
                    }
                    else if (backupShapeList[i].shape == 'text'
                             || backupShapeList[i].shape == 'line'
                    ) {
                        if (targeSector == 'delete') {
                            // 删除逻辑一样
                            zr.delShape(backupShapeList[i].id);
                        }
                        else {
                            // 懒得新建变量了，借用一下
                            switch (backupShapeList[i].shape) {
                                case 'text':
                                    targeSector = textMap[key];
                                    zr.animate(backupShapeList[i].id, 'style')
                                        .when(
                                            400,
                                            {
                                                x :targeSector.style.x,
                                                y :targeSector.style.y
                                            }
                                        )
                                        .start();
                                    break;
                                case 'line':
                                    targeSector = lineMap[key];
                                    zr.animate(backupShapeList[i].id, 'style')
                                        .when(
                                            400,
                                            {
                                                xStart:targeSector.style.xStart,
                                                yStart:targeSector.style.yStart,
                                                xEnd : targeSector.style.xEnd,
                                                yEnd : targeSector.style.yEnd
                                            }
                                        )
                                        .start();
                                    break;
                            }
                            
                        }
                    }
                }
            }
            self.shapeList = backupShapeList;
        }

        /**
         * 动画设定
         */
        function animation() {
            var duration = self.query(option, 'animationDuration');
            var easing = self.query(option, 'animationEasing');
            var x;
            var y;
            var r0;
            var r;
            var serie;
            var dataIndex;

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i].shape == 'sector'
                    || self.shapeList[i].shape == 'circle'
                    || self.shapeList[i].shape == 'ring'
                ) {
                    x = self.shapeList[i].style.x;
                    y = self.shapeList[i].style.y;
                    r0 = self.shapeList[i].style.r0;
                    r = self.shapeList[i].style.r;

                    zr.modShape(
                        self.shapeList[i].id, 
                        {
                            rotation : [Math.PI*2, x, y],
                            style : {
                                r0 : 0,
                                r : 0
                            }
                        },
                        true
                    );

                    serie = ecData.get(self.shapeList[i], 'series');
                    dataIndex = ecData.get(self.shapeList[i], 'dataIndex');
                    zr.animate(self.shapeList[i].id, 'style')
                        .when(
                            (self.query(serie,'animationDuration')
                            || duration)
                            + dataIndex * 10,
                            {
                                r0 : r0,
                                r : r
                            }
                        )
                        .start('QuinticOut');
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            (self.query(serie,'animationDuration')
                            || duration)
                            + dataIndex * 100,
                            {rotation : [0, x, y]}
                        )
                        .start(
                            self.query(serie, 'animationEasing') || easing
                        );
                }
                else if (!self.shapeList[i]._mark){
                    dataIndex = self.shapeList[i]._dataIndex;
                    zr.modShape(
                        self.shapeList[i].id, 
                        {
                            scale : [0, 0, x, y]
                        },
                        true
                    );
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            duration + dataIndex * 100,
                            {scale : [1, 1, x, y]}
                        )
                        .start('QuinticOut');
                }
            }
            
            self.animationMark(duration, easing);
        }

        function onclick(param) {
            if (!self.isClick || !param.target) {
                // 没有在当前实例上发生点击直接返回
                return;
            }
            var offset;             // 偏移
            var target = param.target;
            var style = target.style;
            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            for (var i = 0, len = self.shapeList.length; i < len; i++) {
                if (self.shapeList[i].id == target.id) {
                    seriesIndex = ecData.get(target, 'seriesIndex');
                    dataIndex = ecData.get(target, 'dataIndex');
                    // 当前点击的
                    if (!style._hasSelected) {
                        var midAngle = 
                            ((style.startAngle + style.endAngle) / 2)
                            .toFixed(2) - 0;
                        target.style._hasSelected = true;
                        _selected[seriesIndex][dataIndex] = true;
                        target.style._x = target.style.x;
                        target.style._y = target.style.y;
                        offset = self.query(
                            series[seriesIndex],
                            'selectedOffset'
                        );
                        target.style.x += zrMath.cos(midAngle, true) 
                                          * offset;
                        target.style.y -= zrMath.sin(midAngle, true) 
                                          * offset;
                    }
                    else {
                        // 复位
                        target.style.x = target.style._x;
                        target.style.y = target.style._y;
                        target.style._hasSelected = false;
                        _selected[seriesIndex][dataIndex] = false;
                    }
                    
                    zr.modShape(target.id, target);
                }
                else if (self.shapeList[i].style._hasSelected
                         && _selectedMode == 'single'
                ) {
                    seriesIndex = ecData.get(self.shapeList[i], 'seriesIndex');
                    dataIndex = ecData.get(self.shapeList[i], 'dataIndex');
                    // 单选模式下需要取消其他已经选中的
                    self.shapeList[i].style.x = self.shapeList[i].style._x;
                    self.shapeList[i].style.y = self.shapeList[i].style._y;
                    self.shapeList[i].style._hasSelected = false;
                    _selected[seriesIndex][dataIndex] = false;
                    zr.modShape(
                        self.shapeList[i].id, self.shapeList[i]
                    );
                }
            }
            
            messageCenter.dispatch(
                ecConfig.EVENT.PIE_SELECTED,
                param.event,
                {selected : _selected}
            );
            zr.refresh();
        }

        /**
         * 数据项被拖拽进来， 重载基类方法
         */
        function ondrop(param, status) {
            if (!self.isDrop || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            var target = param.target;      // 拖拽安放目标
            var dragged = param.dragged;    // 当前被拖拽的图形对象

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            var data;
            var legend = component.legend;
            if (dataIndex == -1) {
                // 落到pieCase上，数据被拖拽进某个饼图，增加数据
                data = {
                    value : ecData.get(dragged, 'value'),
                    name : ecData.get(dragged, 'name')
                };

                // 修饼图数值不为负值
                if (data.value < 0) {
                    data.value = 0;
                }

                series[seriesIndex].data.push(data);

                legend && legend.add(
                    data.name,
                    dragged.style.color || dragged.style.strokeColor
                );
            }
            else {
                // 落到sector上，数据被拖拽到某个数据项上，数据修改
                var accMath = require('../util/accMath');
                data = series[seriesIndex].data[dataIndex];
                legend && legend.del(data.name);
                data.name += option.nameConnector
                             + ecData.get(dragged, 'name');
                data.value = accMath.accAdd(
                    data.value,
                    ecData.get(dragged, 'value')
                );
                legend && legend.add(
                    data.name,
                    dragged.style.color || dragged.style.strokeColor
                );
            }

            // 别status = {}赋值啊！！
            status.dragIn = status.dragIn || true;

            // 处理完拖拽事件后复位
            self.isDrop = false;

            return;
        }

        /**
         * 数据项被拖拽出去，重载基类方法
         */
        function ondragend(param, status) {
            if (!self.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            var target = param.target;      // 被拖拽图形元素

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            // 被拖拽的图形是饼图sector，删除被拖拽走的数据
            component.legend && component.legend.del(
                series[seriesIndex].data[dataIndex].name
            );
            series[seriesIndex].data.splice(dataIndex, 1);

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.needRefresh = true;

            // 处理完拖拽事件后复位
            self.isDragend = false;

            return;
        }

        /**
         * 输出动态视觉引导线
         */
        self.shapeHandler.onmouseover = function(param) {
            var shape = param.target;
            var seriesIndex = ecData.get(shape, 'seriesIndex');
            var dataIndex = ecData.get(shape, 'dataIndex');
            var percent = ecData.get(shape, 'special');
            var lastAddRadius = shape._lastAddRadius;

            var startAngle = shape.style.startAngle;
            var endAngle = shape.style.endAngle;
            var defaultColor = shape.highlightStyle.color;
            
            // 文本标签，需要显示则会有返回
            var label = _getLabel(
                    seriesIndex, dataIndex, percent, lastAddRadius,
                    startAngle, endAngle, defaultColor,
                    true
                );
            if (label) {
                zr.addHoverShape(label);
            }
            
            // 文本标签视觉引导线，需要显示则会有返回
            var labelLine = _getLabelLine(
                    seriesIndex, dataIndex, lastAddRadius,
                    shape.style.r0, shape.style.r,
                    startAngle, endAngle, defaultColor,
                    true
                );
            if (labelLine) {
                zr.addHoverShape(labelLine);
            }
        };

        self.reformOption = reformOption;   // 重载基类方法
        self.animation = animation;
        
        // 接口方法
        self.init = init;
        self.refresh = refresh;
        self.addDataAnimation = addDataAnimation;
        self.onclick = onclick;
        self.ondrop = ondrop;
        self.ondragend = ondragend;

        init(option, component);
    }

    // 图表注册
    require('../chart').define('pie', Pie);
    
    return Pie;
});