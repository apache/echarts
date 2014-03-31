/**
 * echarts组件： 数值轴
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
     * @param {Object} option 类目轴参数
     * @param {Grid} grid 网格对象
     * @param {Array} series 数据对象
     */
    function ValueAxis(ecConfig, messageCenter, zr, option, component, series) {
        var Base = require('./base');
        Base.call(this, ecConfig, zr);

        var zrUtil = require('zrender/tool/util');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_AXIS_VALUE;

        var grid = component.grid;

        var _zlevelBase = self.getZlevelBase();
        var _min;
        var _max;
        var _hasData;
        var _valueList;
        var _valueLabel;

        function _buildShape() {
            _hasData = false;
            _calculateValue();
            if (!_hasData) {
                return;
            }
            option.splitArea.show && _buildSplitArea();
            option.splitLine.show && _buildSplitLine();
            option.axisLine.show && _buildAxisLine();
            option.axisTick.show && _buildAxisTick();
            option.axisLabel.show && _buildAxisLabel();

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        // 轴线
        function _buildAxisLine() {
            var lineWidth = option.axisLine.lineStyle.width;
            var halfLineWidth = lineWidth / 2;
            var axShape = {
                shape : 'line',
                zlevel : _zlevelBase + 1,
                hoverable : false
            };
            switch (option.position) {
                case 'left' :
                    axShape.style = {
                        xStart : grid.getX() - halfLineWidth,
                        yStart : grid.getYend() + halfLineWidth,
                        xEnd : grid.getX() - halfLineWidth,
                        yEnd : grid.getY() - halfLineWidth
                    };
                    break;
                case 'right' :
                    axShape.style = {
                        xStart : grid.getXend() + halfLineWidth,
                        yStart : grid.getYend() + halfLineWidth,
                        xEnd : grid.getXend() + halfLineWidth,
                        yEnd : grid.getY() - halfLineWidth
                    };
                    break;
                case 'bottom' :
                    axShape.style = {
                        xStart : grid.getX() - halfLineWidth,
                        yStart : grid.getYend() + halfLineWidth,
                        xEnd : grid.getXend() + halfLineWidth,
                        yEnd : grid.getYend() + halfLineWidth
                    };
                    break;
                case 'top' :
                    axShape.style = {
                        xStart : grid.getX() - halfLineWidth,
                        yStart : grid.getY() - halfLineWidth,
                        xEnd : grid.getXend() + halfLineWidth,
                        yEnd : grid.getY() - halfLineWidth
                    };
                    break;
            }
            if (option.name !== '') {
                axShape.style.text = option.name;
                axShape.style.textPosition = option.nameLocation;
                axShape.style.textFont = self.getFont(option.nameTextStyle);
                if (option.nameTextStyle.align) {
                    axShape.style.textAlign = option.nameTextStyle.align;
                }
                if (option.nameTextStyle.baseline) {
                    axShape.style.textBaseline = option.nameTextStyle.baseline;
                }
                if (option.nameTextStyle.color) {
                    axShape.style.textColor = option.nameTextStyle.color;
                }
            }
            axShape.style.strokeColor = option.axisLine.lineStyle.color;
            
            var lineWidth = option.axisLine.lineStyle.width;
            axShape.style.lineWidth = lineWidth;
            // 亚像素优化
            if (option.position == 'left' || option.position == 'right') {
                // 纵向布局，优化x
                axShape.style.xStart 
                    = axShape.style.xEnd 
                    = self.subPixelOptimize(axShape.style.xEnd, lineWidth);
            }
            else {
                // 横向布局，优化y
                axShape.style.yStart 
                    = axShape.style.yEnd 
                    = self.subPixelOptimize(axShape.style.yEnd, lineWidth);
            }
            
            axShape.style.lineType = option.axisLine.lineStyle.type;

            self.shapeList.push(axShape);
        }

        // 小标记
        function _buildAxisTick() {
            var axShape;
            var data       = _valueList;
            var dataLength = _valueList.length;
            var tickOption = option.axisTick;
            var length     = tickOption.length;
            var color      = tickOption.lineStyle.color;
            var lineWidth  = tickOption.lineStyle.width;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var yPosition = option.position == 'bottom'
                        ? (tickOption.inside ? (grid.getYend() - length) : grid.getYend())
                        : (tickOption.inside ? grid.getY() : (grid.getY() - length));
                var x;
                for (var i = 0; i < dataLength; i++) {
                    // 亚像素优化
                    x = self.subPixelOptimize(getCoord(data[i]), lineWidth);
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : x,
                            yStart : yPosition,
                            xEnd : x,
                            yEnd : yPosition + length,
                            strokeColor : color,
                            lineWidth : lineWidth
                        }
                    };
                    self.shapeList.push(axShape);
                }
            }
            else {
                // 纵向
                var xPosition = option.position == 'left'
                        ? (tickOption.inside ? grid.getX() : (grid.getX() - length))
                        : (tickOption.inside ? (grid.getXend() - length) : grid.getXend());

                var y;
                for (var i = 0; i < dataLength; i++) {
                    // 亚像素优化
                    y = self.subPixelOptimize(getCoord(data[i]), lineWidth);
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : xPosition,
                            yStart : y,
                            xEnd : xPosition + length,
                            yEnd : y,
                            strokeColor : color,
                            lineWidth : lineWidth
                        }
                    };
                    self.shapeList.push(axShape);
                }
            }
        }

        // 坐标轴文本
        function _buildAxisLabel() {
            var axShape;
            var data       = _valueList;
            var dataLength = _valueList.length;
            var rotate     = option.axisLabel.rotate;
            var margin     = option.axisLabel.margin;
            var textStyle  = option.axisLabel.textStyle;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var yPosition;
                var baseLine;
                if (option.position == 'bottom') {
                    yPosition = grid.getYend() + margin;
                    baseLine = 'top';
                }
                else {
                    yPosition = grid.getY() - margin;
                    baseLine = 'bottom';
                }

                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        shape : 'text',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            x : getCoord(data[i]),
                            y : yPosition,
                            color : typeof textStyle.color == 'function'
                                    ? textStyle.color(data[i]) : textStyle.color,
                            text : _valueLabel[i],
                            textFont : self.getFont(textStyle),
                            textAlign : 'center',
                            textBaseline : baseLine
                        }
                    };
                    if (rotate) {
                        axShape.style.textAlign = rotate > 0
                                                  ? (option.position == 'bottom'
                                                    ? 'right' : 'left')
                                                  : (option.position == 'bottom'
                                                    ? 'left' : 'right');
                        axShape.rotation = [
                            rotate * Math.PI / 180,
                            axShape.style.x,
                            axShape.style.y
                        ];
                    }
                    self.shapeList.push(axShape);
                }
            }
            else {
                // 纵向
                var xPosition;
                var align;
                if (option.position == 'left') {
                    xPosition = grid.getX() - margin;
                    align = 'right';
                }
                else {
                    xPosition = grid.getXend() + margin;
                    align = 'left';
                }

                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        shape : 'text',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            x : xPosition,
                            y : getCoord(data[i]),
                            color : typeof textStyle.color == 'function'
                                    ? textStyle.color(data[i]) : textStyle.color,
                            text : _valueLabel[i],
                            textFont : self.getFont(textStyle),
                            textAlign : align,
                            textBaseline : (i === 0 && option.name !== '')
                                           ? 'bottom'
                                           : (i == (dataLength - 1) 
                                              && option.name !== '')
                                             ? 'top'
                                             : 'middle'
                        }
                    };
                    
                    if (rotate) {
                        axShape.rotation = [
                            rotate * Math.PI / 180,
                            axShape.style.x,
                            axShape.style.y
                        ];
                    }
                    self.shapeList.push(axShape);
                }
            }
        }

        function _buildSplitLine() {
            var axShape;
            var data        = _valueList;
            var dataLength  = _valueList.length;
            var sLineOption = option.splitLine;
            var lineType    = sLineOption.lineStyle.type;
            var lineWidth   = sLineOption.lineStyle.width;
            var color       = sLineOption.lineStyle.color;
            color = color instanceof Array ? color : [color];
            var colorLength = color.length;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var sy = grid.getY();
                var ey = grid.getYend();
                var x;

                for (var i = 1; i < dataLength - 1; i++) {
                    // 亚像素优化
                    x = self.subPixelOptimize(getCoord(data[i]), lineWidth);
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : x,
                            yStart : sy,
                            xEnd : x,
                            yEnd : ey,
                            strokeColor : color[i % colorLength],
                            lineType : lineType,
                            lineWidth : lineWidth
                        }
                    };
                    self.shapeList.push(axShape);
                }

            }
            else {
                // 纵向
                var sx = grid.getX();
                var ex = grid.getXend();
                var y;

                for (var i = 1; i < dataLength - 1; i++) {
                    // 亚像素优化
                    y = self.subPixelOptimize(getCoord(data[i]), lineWidth);
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : sx,
                            yStart : y,
                            xEnd : ex,
                            yEnd : y,
                            strokeColor : color[i % colorLength],
                            lineType : lineType,
                            lineWidth : lineWidth
                        }
                    };
                    self.shapeList.push(axShape);
                }
            }
        }

        function _buildSplitArea() {
            var axShape;
            var color = option.splitArea.areaStyle.color;

            if (!(color instanceof Array)) {
                // 非数组一律认为是单一颜色的字符串，单一颜色则用一个背景，颜色错误不负责啊！！！
                axShape = {
                    shape : 'rectangle',
                    zlevel : _zlevelBase,
                    hoverable : false,
                    style : {
                        x : grid.getX(),
                        y : grid.getY(),
                        width : grid.getWidth(),
                        height : grid.getHeight(),
                        color : color
                        // type : option.splitArea.areaStyle.type,
                    }
                };
                self.shapeList.push(axShape);
            }
            else {
                // 多颜色
                var colorLength = color.length;
                var data        = _valueList;
                var dataLength  = _valueList.length;

                if (option.position == 'bottom' || option.position == 'top') {
                    // 横向
                    var y = grid.getY();
                    var height = grid.getHeight();
                    var lastX = grid.getX();
                    var curX;

                    for (var i = 0; i <= dataLength; i++) {
                        curX = i < dataLength
                               ? getCoord(data[i])
                               : grid.getXend();
                        axShape = {
                            shape : 'rectangle',
                            zlevel : _zlevelBase,
                            hoverable : false,
                            style : {
                                x : lastX,
                                y : y,
                                width : curX - lastX,
                                height : height,
                                color : color[i % colorLength]
                                // type : option.splitArea.areaStyle.type,
                            }
                        };
                        self.shapeList.push(axShape);
                        lastX = curX;
                    }
                }
                else {
                    // 纵向
                    var x = grid.getX();
                    var width = grid.getWidth();
                    var lastYend = grid.getYend();
                    var curY;

                    for (var i = 0; i <= dataLength; i++) {
                        curY = i < dataLength
                               ? getCoord(data[i])
                               : grid.getY();
                        axShape = {
                            shape : 'rectangle',
                            zlevel : _zlevelBase,
                            hoverable : false,
                            style : {
                                x : x,
                                y : curY,
                                width : width,
                                height : lastYend - curY,
                                color : color[i % colorLength]
                                // type : option.splitArea.areaStyle.type
                            }
                        };
                        self.shapeList.push(axShape);
                        lastYend = curY;
                    }
                }
            }
        }

        /**
         * 极值计算
         */
        function _calculateValue() {
            if (isNaN(option.min - 0) || isNaN(option.max - 0)) {
                // 有一个没指定都得算
                // 数据整形
                var oriData;            // 原始数据
                var data = {};          // 整形后数据抽取
                var value;
                var xIdx;
                var yIdx;
                var legend = component.legend;
                for (var i = 0, l = series.length; i < l; i++) {
                    if (series[i].type != ecConfig.CHART_TYPE_LINE
                        && series[i].type != ecConfig.CHART_TYPE_BAR
                        && series[i].type != ecConfig.CHART_TYPE_SCATTER
                        && series[i].type != ecConfig.CHART_TYPE_K
                    ) {
                        // 非坐标轴支持的不算极值
                        continue;
                    }
                    // 请允许我写开，跟上面一个不是一样东西
                    if (legend && !legend.isSelected(series[i].name)){
                        continue;
                    }

                    // 不指定默认为第一轴线
                    xIdx = series[i].xAxisIndex || 0;
                    yIdx = series[i].yAxisIndex || 0;
                    if ((option.xAxisIndex != xIdx)
                        && (option.yAxisIndex != yIdx)
                    ) {
                        // 不是自己的数据不计算极值
                        continue;
                    }
                    
                    var key = series[i].name || 'kener';
                    if (!series[i].stack) {
                        data[key] = data[key] || [];
                        oriData = series[i].data;
                        for (var j = 0, k = oriData.length; j < k; j++) {
                            value = typeof oriData[j].value != 'undefined'
                                    ? oriData[j].value
                                    : oriData[j];
                            if (series[i].type == ecConfig.CHART_TYPE_SCATTER) {
                                if (option.xAxisIndex != -1) {
                                    data[key].push(value[0]);
                                }
                                if (option.yAxisIndex != -1) {
                                    data[key].push(value[1]);
                                }
                            }
                            else if (series[i].type == ecConfig.CHART_TYPE_K) {
                                data[key].push(value[0]);
                                data[key].push(value[1]);
                                data[key].push(value[2]);
                                data[key].push(value[3]);
                            }
                            else {
                                data[key].push(value);
                            }
                        }
                    }
                    else {
                        // 堆叠数据，需要区分正负向堆叠
                        var keyP = '__Magic_Key_Positive__' + series[i].stack;
                        var keyN = '__Magic_Key_Negative__' + series[i].stack;
                        data[keyP] = data[keyP] || [];
                        data[keyN] = data[keyN] || [];
                        data[key] = data[key] || [];  // scale下还需要记录每一个量
                        oriData = series[i].data;
                        for (var j = 0, k = oriData.length; j < k; j++) {
                            value = typeof oriData[j].value != 'undefined'
                                    ? oriData[j].value
                                    : oriData[j];
                            if (value == '-') {
                                continue;
                            }
                            value = value - 0;
                            if (value >= 0) {
                                if (typeof data[keyP][j] != 'undefined') {
                                    data[keyP][j] += value;
                                }
                                else {
                                    data[keyP][j] = value;
                                }
                            }
                            else {
                                if (typeof data[keyN][j] != 'undefined') {
                                    data[keyN][j] += value;
                                }
                                else {
                                    data[keyN][j] = value;
                                }
                            }
                            if (option.scale) {
                                data[key].push(value);
                            }
                        }
                    }
                }
                // 找极值
                for (var i in data){
                    oriData = data[i];
                    for (var j = 0, k = oriData.length; j < k; j++) {
                        if (!isNaN(oriData[j])){
                            _hasData = true;
                            _min = oriData[j];
                            _max = oriData[j];
                            break;
                        }
                    }
                    if (_hasData) {
                        break;
                    }
                }
                for (var i in data){
                    oriData = data[i];
                    for (var j = 0, k = oriData.length; j < k; j++) {
                        if (!isNaN(oriData[j])){
                            _min = Math.min(_min, oriData[j]);
                            _max = Math.max(_max, oriData[j]);
                        }
                    }
                }
                
                //console.log(_min,_max,'vvvvv111111')
                _min = isNaN(option.min - 0)
                       ? (_min - Math.abs(_min * option.boundaryGap[0]))
                       : (option.min - 0);    // 指定min忽略boundaryGay[0]
    
                _max = isNaN(option.max - 0)
                       ? (_max + Math.abs(_max * option.boundaryGap[1]))
                       : (option.max - 0);    // 指定max忽略boundaryGay[1]
                if (_min == _max) {
                    if (_max === 0) {
                        // 修复全0数据
                        _max = option.power > 0 ? option.power : 1;
                    }
                    // 修复最大值==最小值时数据整形
                    else if (_max > 0) {
                        _min = _max / option.splitNumber;
                    }
                    else { // _max < 0
                        _max = _max / option.splitNumber;
                    }
                }
                _reformValue(option.scale);
            }
            else {
                _hasData = true;
                // 用户指定min max就不多管闲事了
                _min = option.min - 0;    // 指定min忽略boundaryGay[0]
                _max = option.max - 0;    // 指定max忽略boundaryGay[1]
                customerDefine = true;
                _customerValue();
            }
        }

        /**
         * 找到原始数据的极值后根据选项整形最终 _min / _max / _valueList
         * 如果你不知道这个“整形”的用义，请不要试图去理解和修改这个方法！找我也没用，我相信我已经记不起来！
         * 如果你有更简洁的数学推导欢迎重写，后果自负~
         * 一旦你不得不遇到了需要修改或重写的厄运，希望下面的脚手架能帮助你
         * ps:其实我是想说别搞砸了！升级后至少得保证这些case通过！！
         *
         * by linzhifeng@baidu.com 2013-1-8
         * --------
             _valueList = [];
             option = {splitNumber:5,power:100,precision:0};
             _min = 1; _max = 123; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : 0 150 [0, 30, 60, 90, 120, 150]',
                        (_min == 0 && _max == 150) ? 'success' : 'failed');

             _min = 10; _max = 1923; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : 0 2000 [0, 400, 800, 1200, 1600, 2000]',
                        (_min == 0 && _max == 2000) ? 'success' : 'failed');

             _min = 10; _max = 78; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : 0 100 [0, 20, 40, 60, 80, 100]',
                        (_min == 0 && _max == 100) ? 'success' : 'failed');

             _min = -31; _max = -3; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -35 0 [-35, -28, -21, -14, -7, 0]',
                        (_min == -35 && _max == 0) ? 'success' : 'failed');

             _min = -51; _max = 203; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -60 240 [-60, 0, 60, 120, 180, 240]',
                        (_min == -60 && _max == 240) ? 'success' : 'failed');

             _min = -251; _max = 23; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -280 70 [-280, -210, -140, -70, 0, 70]',
                        (_min == -280 && _max == 70) ? 'success' : 'failed');

             option.precision = 2;
             _min = 0.23; _max = 0.78; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : 0.00 1.00'
                 + '["0.00", "0.20", "0.40", "0.60", "0.80", "1.00"]',
                (_min == 0.00 && _max == 1.00) ? 'success' : 'failed');

             _min = -12.23; _max = -0.78; console.log(_min, _max);
             _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -15.00 0.00'
                 + '["-15.00", "-12.00", "-9.00", "-6.00", "-3.00", "0.00"]',
                (_min == -15.00 && _max == 0.00) ? 'success' : 'failed');

             _min = -0.23; _max = 0.78; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -0.30 1.20'
                 + '["-0.30", "0.00", "0.30", "0.60", "0.90", "1.20"]',
                (_min == -0.30 && _max == 1.20) ? 'success' : 'failed');

             _min = -1.23; _max = 0.78; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -1.50 1.00'
                 + '["-1.50", "-1.00", "-0.50", "0.00", "0.50", "1.00"]',
                (_min == -1.50 && _max == 1.00) ? 'success' : 'failed');

             option.precision = 1;
             _min = -2.3; _max = 0.5; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -2.4 0.6'
                 + '["-2.4", "-1.8", "-1.2", "-0.6", "0.0", "0.6"]',
                (_min == -2.4 && _max == 0.6) ? 'success' : 'failed');
         * --------
         */
        function _reformValue(scale) {
            var splitNumber = option.splitNumber;
            var precision = option.precision;
            var splitGap;
            var power;
            if (precision === 0) {    // 整数
                 power = option.power > 1 ? option.power : 1;
            }
            else {                          // 小数
                // 放大倍数后复用整数逻辑，最后再缩小回去
                power = Math.pow(10, precision);
                _min *= power;
                _max *= power;
                power = option.power;
            }
            // console.log(_min,_max)
            var total;
            if (_min >= 0 && _max >= 0) {
                // 双正
                if (!scale) {
                    // power自动降级
                    while ((_max / power < splitNumber) && power != 1) {
                        power = power / 10;
                    }
                    _min = 0;
                }
                else {
                    // power自动降级
                    while (_min < power && power != 1) {
                        power = power / 10;
                    }
                    if (precision === 0) {    // 整数
                        // 满足power
                        _min = Math.floor(_min / power) * power;
                        _max = Math.ceil(_max / power) * power;
                    }
                }
                power = power > 1 ? power / 10 : 1;
                total = _max - _min;
                splitGap = Math.ceil((total / splitNumber) / power) * power;
                _max = _min + splitGap * splitNumber;
            }
            else if (_min <= 0 && _max <= 0) {
                // 双负
                power = -power;
                if (!scale) {
                    // power自动降级
                    while ((_min / power < splitNumber) && power != -1) {
                        power = power / 10;
                    }
                    _max = 0;
                }
                else {
                    // power自动降级
                    while (_max > power && power != -1) {
                        power = power / 10;
                    }
                    if (precision === 0) {    // 整数
                        // 满足power
                        _min = Math.ceil(_min / power) * power;
                        _max = Math.floor(_max / power) * power;
                    }
                }
                power = power < -1 ? power / 10 : -1;
                total = _min - _max;
                splitGap = -Math.ceil((total / splitNumber) / power) * power;
                _min = -splitGap * splitNumber + _max;
            }
            else {
                // 一正一负，确保0被选中
                total = _max - _min;
                // power自动降级
                while ((total / power < splitNumber) && power != 1) {
                    power = power/10;
                }
                // 正数部分的分隔数
                var partSplitNumber = Math.round(_max / total * splitNumber);
                // 修正数据范围极度偏正向，留给负数一个
                partSplitNumber -= (partSplitNumber == splitNumber ? 1 : 0);
                // 修正数据范围极度偏负向，留给正数一个
                partSplitNumber += partSplitNumber === 0 ? 1 : 0;
                splitGap = (Math.ceil(Math.max(
                                          _max / partSplitNumber,
                                          _min / (partSplitNumber - splitNumber)
                                      )
                           / power))
                           * power;

                _max = splitGap * partSplitNumber;
                _min = splitGap * (partSplitNumber - splitNumber);
            }
            //console.log(_min,_max,'vvvvvrrrrrr')
            _valueList = [];
            for (var i = 0; i <= splitNumber; i++) {
                _valueList.push(_min + splitGap * i);
            }

            if (precision !== 0) {    // 小数
                 // 放大倍数后复用整数逻辑，最后再缩小回去
                power = Math.pow(10, precision);
                _min = (_min / power).toFixed(precision) - 0;
                _max = (_max / power).toFixed(precision) - 0;
                for (var i = 0; i <= splitNumber; i++) {
                    _valueList[i] = 
                        (_valueList[i] / power).toFixed(precision) - 0;
                }
            }
            _reformLabelData();
        }
        
        function _customerValue() {
            var splitNumber = option.splitNumber;
            var precision = option.precision;
            var splitGap = (_max - _min) / splitNumber;
            
            _valueList = [];
            for (var i = 0; i <= splitNumber; i++) {
                _valueList.push((_min + splitGap * i).toFixed(precision) - 0);
            }
            _reformLabelData();
        }

        function _reformLabelData() {
            _valueLabel = [];
            var formatter = option.axisLabel.formatter;
            if (formatter) {
                for (var i = 0, l = _valueList.length; i < l; i++) {
                    if (typeof formatter == 'function') {
                        _valueLabel.push(formatter(_valueList[i]));
                    }
                    else if (typeof formatter == 'string') {
                        _valueLabel.push(
                            formatter.replace('{value}',_valueList[i])
                        );
                    }
                }
            }
            else {
                // 每三位默认加,格式化
                for (var i = 0, l = _valueList.length; i < l; i++) {
                    _valueLabel.push(self.numAddCommas(_valueList[i]));
                }
            }

        }
        
        function getExtremum() {
            _calculateValue();
            return {
                min: _min,
                max: _max
            };
        }

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
         * @param {Object} newOption
         * @param {Object} newGrid
         */
        function init(newOption, newGrid, newSeries) {
            if (!newSeries || newSeries.length === 0) {
                return;
            }
            grid = newGrid;
            
            refresh(newOption, newSeries);
        }

        /**
         * 刷新
         */
        function refresh(newOption, newSeries) {
            if (newOption) {
                option = self.reformOption(newOption);
                // 通用字体设置
                option.axisLabel.textStyle = zrUtil.merge(
                    option.axisLabel.textStyle || {},
                    ecConfig.textStyle,
                    {
                        'overwrite' : false,
                        'recursive' : true
                    }
                );
                option.axisLabel.textStyle = zrUtil.merge(
                    option.axisLabel.textStyle || {},
                    ecConfig.textStyle,
                    {
                        'overwrite' : false,
                        'recursive' : true
                    }
                );
                series = newSeries;
            }
            if (zr) {   // 数值轴的另外一个功能只是用来计算极值
                self.clear();
                _buildShape();
            }
        }

        // 根据值换算位置
        function getCoord(value) {
            value = value < _min ? _min : value;
            value = value > _max ? _max : value;

            var valueRange = _max - _min;
            var total;
            var result;
            if (option.position == 'left' || option.position == 'right') {
                // 纵向
                total = grid.getHeight();
                result = grid.getYend() - (value - _min) / valueRange * total;
            }
            else {
                // 横向
                total = grid.getWidth();
                result = (value - _min) / valueRange * total + grid.getX();
            }

            return result;
            // Math.floor可能引起一些偏差，但性能会更好
            /* 准确更重要
            return (value == _min || value == _max)
                   ? result
                   : Math.floor(result);
            */
        }
        
        // 根据值换算绝对大小
        function getCoordSize(value) {
            if (option.position == 'left' || option.position == 'right') {
                // 纵向
                return Math.abs(value / (_max - _min) * grid.getHeight());
            }
            else {
                // 横向
                return Math.abs(value / (_max - _min) * grid.getWidth());
            }
        }

        function getPosition() {
            return option.position;
        }

        self.init = init;
        self.refresh = refresh;
        self.getExtremum = getExtremum;
        self.getCoord = getCoord;
        self.getCoordSize = getCoordSize;
        self.getPosition = getPosition;

        init(option, grid, series);
    }

    require('../component').define('valueAxis', ValueAxis);
    
    return ValueAxis;
});

