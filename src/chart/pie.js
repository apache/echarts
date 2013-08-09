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
    function Pie(messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrMath = require('zrender/tool/math');
        var zrUtil = require('zrender/tool/util');

        var self = this;
        self.type = ecConfig.CHART_TYPE_PIE;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();
        
        var _selectedMode;
        var _selected = {};

        function _buildShape() {
            self.selectedMap = {};
            _selected = {};

            var pieCase;        // 饼图箱子
            _selectedMode = false;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_PIE) {
                    series[i] = self.reformOption(series[i]);
                    _selectedMode = _selectedMode || series[i].selectedMode;
                    _selected[i] = [];
                    if (self.deepQuery([series[i], option], 'calculable')) {
                        pieCase = {
                            shape : series[i].radius[0] <= 10
                                    ? 'circle' : 'ring',
                            zlevel : _zlevelBase,
                            hoverable : false,
                            style : {
                                x : series[i].center[0],          // 圆心横坐标
                                y : series[i].center[1],          // 圆心纵坐标
                                r0 : series[i].radius[0] <= 10    // 圆环内半径
                                     ? 0 : series[i].radius[0] - 10,
                                r : series[i].radius[1] + 10,     // 圆环外半径
                                brushType : 'stroke',
                                strokeColor : series[i].calculableHolderColor
                                              || ecConfig.calculableHolderColor
                            }
                        };
                        ecData.pack(pieCase, series[i], i, undefined, -1);
                        self.setCalculable(pieCase);
                        self.shapeList.push(pieCase);
                    }
                    _buildSinglePie(i);
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
            var totalSelected = 0;               // 迭代累计
            var totalValue = 0;                  // 迭代累计

            // 计算需要显示的个数和总值
            for (var i = 0, l = data.length; i < l; i++) {
                itemName = data[i].name;
                if (legend){
                    self.selectedMap[itemName] = legend.isSelected(itemName);
                } else {
                    self.selectedMap[itemName] = true;
                }
                if (self.selectedMap[itemName]) {
                    totalSelected++;
                    totalValue += +data[i].value;
                }
            }

            var percent;
            var startAngle = serie.startAngle.toFixed(2) - 0;
            var endAngle;
            var minAngle = serie.minAngle;
            var totalAngle = 360 - (minAngle * totalSelected);
            var defaultColor;

            for (var i = 0, l = data.length; i < l; i++){
                itemName = data[i].name;
                if (!self.selectedMap[itemName]) {
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

                percent = data[i].value / totalValue;
                endAngle = (percent * totalAngle + startAngle + minAngle)
                           .toFixed(2) - 0;
                percent = (percent * 100).toFixed(2);

                _buildItem(
                    seriesIndex, i, percent, data[i].selected,
                    startAngle, endAngle, defaultColor
                );
                startAngle = endAngle;
            }
        }

        /**
         * 构建单个扇形及指标
         */
        function _buildItem(
            seriesIndex, dataIndex, percent, isSelected,
            startAngle, endAngle, defaultColor
        ) {
            // 扇形
            var sector = _getSector(
                    seriesIndex, dataIndex, percent, isSelected,
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
            self.shapeList.push(sector);

            // 文本标签，需要显示则会有返回
            var label = _getLabel(
                    seriesIndex, dataIndex, percent,
                    startAngle, endAngle, defaultColor,
                    false
                );
            if (label) {
                label._dataIndex = dataIndex;
                self.shapeList.push(label);
            }

            // 文本标签视觉引导线，需要显示则会有返回
            var labelLine = _getLabelLine(
                    seriesIndex, dataIndex,
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
            startAngle, endAngle, defaultColor
        ) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];

            // 多级控制
            var normalColor = self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.color'
                );

            var emphasisColor = self.deepQuery(
                    [data, serie],
                    'itemStyle.emphasis.color'
                );

            var sector = {
                shape : 'sector',             // 扇形
                zlevel : _zlevelBase,
                clickable : true,
                style : {
                    x : serie.center[0],          // 圆心横坐标
                    y : serie.center[1],          // 圆心纵坐标
                    r0 : serie.radius[0],         // 圆环内半径
                    r : serie.radius[1],          // 圆环外半径
                    startAngle : startAngle,
                    endAngle : endAngle,
                    brushType : 'both',
                    color : normalColor || defaultColor,
                    strokeColor : '#fff',
                    lineWidth: 1
                },
                highlightStyle : {
                    color : emphasisColor || normalColor || defaultColor
                }
            };
            
            if (isSelected) {
                var midAngle = 
                    ((sector.style.startAngle + sector.style.endAngle) / 2)
                    .toFixed(2) - 0;
                sector.style._hasSelected = true;
                sector.style._x = sector.style.x;
                sector.style._y = sector.style.y;
                var offset = self.deepQuery([serie], 'selectedOffset');
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

            if (_needLabel(serie, data, false)
                && self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.position'
                ) == 'inner'
            ) {
                sector.style.text = _getLabelText(
                    seriesIndex, dataIndex, percent, 'normal'
                );
                sector.style.textPosition = 'specific';
                sector.style.textColor = self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.textStyle.color'
                ) || '#fff';
                sector.style.textAlign = self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.textStyle.align'
                ) || 'center';
                sector.style.textBaseLine = self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.textStyle.baseline'
                ) || 'middle';
                sector.style.textX = Math.round(
                    serie.center[0]
                    + (serie.radius[1] + serie.radius[0]) / 2
                      * zrMath.cos((startAngle + endAngle) / 2, true)
                );
                sector.style.textY = Math.round(
                    serie.center[1]
                    - (serie.radius[1] + serie.radius[0]) / 2
                       * zrMath.sin((startAngle + endAngle) / 2, true)
                );
                sector.style.textFont = self.getFont(self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.textStyle'
                ));
            }

            if (_needLabel(serie, data, true)
                && self.deepQuery(
                    [data, serie],
                    'itemStyle.emphasis.label.position'
                ) == 'inner'
            ) {
                sector.highlightStyle.text = _getLabelText(
                    seriesIndex, dataIndex, percent, 'emphasis'
                );
                sector.highlightStyle.textPosition = 'specific';
                sector.highlightStyle.textColor = self.deepQuery(
                    [data, serie],
                    'itemStyle.emphasis.label.textStyle.color'
                ) || '#fff';
                sector.highlightStyle.textAlign = self.deepQuery(
                    [data, serie],
                    'itemStyle.emphasis.label.textStyle.align'
                ) || 'center';
                sector.highlightStyle.textBaseLine = self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.textStyle.baseline'
                ) || 'middle';
                sector.highlightStyle.textX = Math.round(
                    serie.center[0]
                    + (serie.radius[1] + serie.radius[0]) / 2
                      * zrMath.cos((startAngle + endAngle) / 2, true)
                );
                sector.highlightStyle.textY = Math.round(
                    serie.center[1]
                    - (serie.radius[1] + serie.radius[0]) / 2
                      * zrMath.sin((startAngle + endAngle) / 2, true)
                );
                sector.highlightStyle.textFont = self.getFont(self.deepQuery(
                    [data, serie],
                    'itemStyle.emphasis.label.textStyle'
                ));
            }

            // “normal下不显示，emphasis显示”添加事件响应
            if (_needLabel(serie, data, true)          // emphasis下显示文本
                || _needLabelLine(serie, data, true)   // emphasis下显示引导线
            ) {
                sector.onmouseover = self.shapeHandler.onmouserover;
            }
            return sector;
        }

        /**
         * 需要显示则会有返回构建好的shape，否则返回undefined
         */
        function _getLabel(
            seriesIndex, dataIndex, percent,
            startAngle, endAngle, defaultColor,
            isEmphasis
        ) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            // 特定状态下是否需要显示文本标签
            if (_needLabel(serie, data, isEmphasis)) {
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

                var centerX = serie.center[0];                      // 圆心横坐标
                var centerY = serie.center[1];                      // 圆心纵坐标
                var midAngle = ((endAngle + startAngle) / 2) % 360; // 角度中值
                var radius;                                         // 标签位置半径
                var textAlign;
                if (labelControl.position == 'outer') {
                    // 外部显示，默认
                    radius = serie.radius[1]
                             + itemStyle[status].labelLine.length
                             + textStyle.fontSize;
                    textAlign = (midAngle >= 150 && midAngle <= 210)
                                ? 'right'
                                : ((midAngle <= 30 || midAngle >= 330)
                                       ? 'left'
                                       : 'center'
                                   );
                    return {
                        shape : 'text',
                        zlevel : _zlevelBase + 1,
                        hoverable : false,
                        style : {
                            x : centerX + radius * zrMath.cos(midAngle, true),
                            y : centerY - radius * zrMath.sin(midAngle, true),
                            color : textStyle.color || defaultColor,
                            text : _getLabelText(
                                seriesIndex, dataIndex, percent, status
                            ),
                            textAlign : textStyle.align
                                        || textAlign,
                            textBaseline : textStyle.baseline || 'middle',
                            textFont : self.getFont(textStyle)
                        },
                        highlightStyle : {
                            brushType : 'fill'
                        }
                    };
                }
                else if (labelControl.position == 'center') {
                    return {
                        shape : 'text',
                        zlevel : _zlevelBase + 1,
                        hoverable : false,
                        style : {
                            x : centerX,
                            y : centerY,
                            color : textStyle.color || defaultColor,
                            text : _getLabelText(
                                seriesIndex, dataIndex, percent, status
                            ),
                            textAlign : textStyle.align
                                        || 'center',
                            textBaseline : textStyle.baseline || 'middle',
                            textFont : self.getFont(textStyle)
                        },
                        highlightStyle : {
                            brushType : 'fill'
                        }
                    };
                }
                else {
                    // 内部显示由sector自带，不返回即可
                    return;
                    /*
                    radius = (serie.radius[0] + serie.radius[1]) / 2;
                    textAlign = 'center';
                    defaultColor = '#fff';
                    */
                }
            }
            else {
                return;
            }
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
            seriesIndex, dataIndex,
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

                var centerX = serie.center[0];                    // 圆心横坐标
                var centerY = serie.center[1];                    // 圆心纵坐标
                // 视觉引导线起点半径
                var midRadius = serie.radius[1];
                // 视觉引导线终点半径
                var maxRadius = midRadius + labelLineControl.length;
                var midAngle = ((endAngle + startAngle) / 2) % 360; // 角度中值
                var cosValue = zrMath.cos(midAngle, true);
                var sinValue = zrMath.sin(midAngle, true);
                // 三角函数缓存已在zrender/tool/math中做了
                return {
                    shape : 'line',
                    zlevel : _zlevelBase + 1,
                    hoverable : false,
                    style : {
                        xStart : centerX + midRadius * cosValue,
                        yStart : centerY - midRadius * sinValue,
                        xEnd : centerX + maxRadius * cosValue,
                        yEnd : centerY - maxRadius * sinValue,
                        strokeColor : lineStyle.color || defaultColor,
                        lineType : lineStyle.type,
                        lineWidth : lineStyle.width
                    }
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

            // 圆心坐标，无则为自适应居中
            if (!opt.center 
                || (opt.center && !(opt.center instanceof Array))) {
                opt.center = [
                    Math.round(zr.getWidth() / 2),
                    Math.round(zr.getHeight() / 2)
                ];
            }
            else {
                if (typeof opt.center[0] == 'undefined') {
                    opt.center[0] = Math.round(zr.getWidth() / 2);
                }
                if (typeof opt.center[1] == 'undefined') {
                    opt.center[1] = Math.round(zr.getHeight() / 2);
                }
            }

            // 传数组实现环形图，[内半径，外半径]，传单个则默认为外半径为
            if (typeof opt.radius == 'undefined') {
                opt.radius = [
                    0,
                    Math.round(Math.min(zr.getWidth(), zr.getHeight()) / 2 - 50)
                ];
            } else if (!(opt.radius instanceof Array)) {
                opt.radius = [0, opt.radius];
            }

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
         * @param {Object} newZr
         * @param {Object} newSeries
         * @param {Object} newComponent
         */
        function init(newOption, newComponent) {
            option = newOption;
            component = newComponent;

            series = option.series;

            self.clear();
            _buildShape();
        }

        /**
         * 刷新
         */
        function refresh() {
            self.clear();
            _buildShape();
        }

        /**
         * 动画设定
         */
        function animation() {
            var duration = self.deepQuery([option], 'animationDuration');
            var easing = self.deepQuery([option], 'animationEasing');
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

                    zr.modShape(self.shapeList[i].id, {
                        rotation : [Math.PI*2, x, y],
                        style : {
                            r0 : 0,
                            r : 0
                        }
                    });

                    serie = ecData.get(self.shapeList[i], 'series');
                    dataIndex = ecData.get(self.shapeList[i], 'dataIndex');
                    zr.animate(self.shapeList[i].id, 'style')
                        .when(
                            (self.deepQuery([serie],'animationDuration')
                            || duration)
                            + dataIndex * 10,

                            {
                                r0 : r0,
                                r : r
                            },

                            'QuinticOut'
                        )
                        .start();
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            (self.deepQuery([serie],'animationDuration')
                            || duration)
                            + dataIndex * 100,

                            {rotation : [0, x, y]},

                            (self.deepQuery([serie], 'animationEasing')
                            || easing)
                        )
                        .start();
                }
                else {
                    dataIndex = self.shapeList[i]._dataIndex;
                    zr.modShape(self.shapeList[i].id, {
                        scale : [0, 0, x, y]
                    });
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            duration + dataIndex * 100,
                            {scale : [1, 1, x, y]},
                            'QuinticOut'
                        )
                        .start();
                }
            }
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
                        offset = self.deepQuery(
                            [series[seriesIndex]],
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

                legend.add(
                    data.name,
                    dragged.style.color || dragged.style.strokeColor
                );
            }
            else {
                // 落到sector上，数据被拖拽到某个数据项上，数据修改
                data = series[seriesIndex].data[dataIndex];
                legend.del(data.name);
                data.name += option.nameConnector
                             + ecData.get(dragged, 'name');
                data.value += ecData.get(dragged, 'value');
                legend.add(
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
            component.legend.del(
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
        self.shapeHandler.onmouserover = function(param) {
            var shape = param.target;
            var seriesIndex = ecData.get(shape, 'seriesIndex');
            var dataIndex = ecData.get(shape, 'dataIndex');
            var percent = ecData.get(shape, 'special');

            var startAngle = shape.style.startAngle;
            var endAngle = shape.style.endAngle;
            var defaultColor = shape.highlightStyle.color;

            // 文本标签，需要显示则会有返回
            var label = _getLabel(
                    seriesIndex, dataIndex, percent,
                    startAngle, endAngle, defaultColor,
                    true
                );
            if (label) {
                zr.addHoverShape(label);
            }

            // 文本标签视觉引导线，需要显示则会有返回
            var labelLine = _getLabelLine(
                    seriesIndex, dataIndex,
                    startAngle, endAngle, defaultColor,
                    true
                );
            if (labelLine) {
                zr.addHoverShape(labelLine);
            }
        };

        self.reformOption = reformOption;   // 重载基类方法
        
        // 接口方法
        self.init = init;
        self.refresh = refresh;
        self.animation = animation;
        self.onclick = onclick;
        self.ondrop = ondrop;
        self.ondragend = ondragend;

        init(option, component);
    }

    // 图表注册
    require('../chart').define('pie', Pie);
    
    return Pie;
});