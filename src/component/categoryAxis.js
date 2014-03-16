/**
 * echarts组件： 类目轴
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
     */
    function CategoryAxis(ecConfig, messageCenter, zr, option, component) {
        var Base = require('./base');
        Base.call(this, ecConfig, zr);

        var zrUtil = require('zrender/tool/util');
        var zrArea = require('zrender/tool/area');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_AXIS_CATEGORY;

        var grid = component.grid;

        var _zlevelBase = self.getZlevelBase();
        var _interval;                              // 标签显示的挑选间隔
        var _labelData;

        function _reformLabel() {
            var data = zrUtil.clone(option.data);
            var axisFormatter = option.axisLabel.formatter;
            var formatter;
            for (var i = 0, l = data.length; i < l; i++) {
                formatter = data[i].formatter || axisFormatter;
                if (formatter) {
                    if (typeof formatter == 'function') {
                        if (typeof data[i].value != 'undefined') {
                            data[i].value = formatter(data[i].value);
                        }
                        else {
                            data[i] = formatter(data[i]);
                        }
                    }
                    else if (typeof formatter == 'string') {
                        if (typeof data[i].value != 'undefined') {
                            data[i].value = formatter.replace(
                                '{value}',data[i].value
                            );
                        }
                        else {
                            data[i] = formatter.replace('{value}',data[i]);
                        }
                    }
                }
            }
            return data;
        }

        /**
         * 计算标签显示挑选间隔
         */
        function _getInterval() {
            var interval   = option.axisLabel.interval;
            if (interval == 'auto') {
                // 麻烦的自适应计算
                var fontSize = option.axisLabel.textStyle.fontSize;
                var font = self.getFont(option.axisLabel.textStyle);
                var data = option.data;
                var dataLength = option.data.length;

                if (option.position == 'bottom' || option.position == 'top') {
                    // 横向
                    if (dataLength > 3) {
                        var gap = getGap();
                        var isEnough = false;
                        var labelSpace;
                        var labelSize;
                        interval = 0;
                        while (!isEnough && interval < dataLength) {
                            interval++;
                            isEnough = true;
                            labelSpace = gap * interval - 10; // 标签左右至少间隔为5px
                            for (var i = 0; i < dataLength; i += interval) {
                                if (option.axisLabel.rotate !== 0) {
                                    // 有旋转
                                    labelSize = fontSize;
                                }
                                else if (data[i].textStyle) {
                                    labelSize = zrArea.getTextWidth(
                                        _labelData[i].value || _labelData[i],
                                        self.getFont(
                                            zrUtil.merge(
                                                data[i].textStyle,
                                                option.axisLabel.textStyle,
                                                {
                                                    'overwrite': false,
                                                    'recursive': true
                                                }
                                           )
                                        )
                                    );
                                }
                                else {
                                    labelSize = zrArea.getTextWidth(
                                        _labelData[i].value || _labelData[i],
                                        font
                                    );
                                }

                                if (labelSpace < labelSize) {
                                    // 放不下，中断循环让interval++
                                    isEnough = false;
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        // 少于3个则全部显示
                        interval = 1;
                    }
                }
                else {
                    // 纵向
                    if (dataLength > 3) {
                        var gap = getGap();
                        interval = 1;
                        // 标签上下至少间隔为3px
                        while ((gap * interval - 6) < fontSize
                                && interval < dataLength
                        ) {
                            interval++;
                        }
                    }
                    else {
                        // 少于3个则全部显示
                        interval = 1;
                    }
                }
            }
            else {
                // 用户自定义间隔
                interval += 1;
            }

            return interval;
        }

        function _buildShape() {
            _labelData = _reformLabel();
            _interval = _getInterval();
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
            //var data       = option.data;
            var dataLength = option.data.length;
            var tickOption = option.axisTick;
            var length     = tickOption.length;
            var color      = tickOption.lineStyle.color;
            var lineWidth  = tickOption.lineStyle.width;
            var interval   = tickOption.interval == 'auto' 
                             ? _interval : (tickOption.interval - 0 + 1);
            var onGap      = tickOption.onGap;
            var optGap     = onGap 
                             ? (getGap() / 2) 
                             : typeof onGap == 'undefined'
                                   ? (option.boundaryGap ? (getGap() / 2) : 0)
                                   : 0;
            var startIndex = optGap > 0 ? -interval : 0;                       
            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var yPosition = option.position == 'bottom'
                        ? (tickOption.inside ? (grid.getYend() - length) : grid.getYend())
                        : (tickOption.inside ? grid.getY() : (grid.getY() - length));
                var x;
                for (var i = startIndex; i < dataLength; i += interval) {
                    // 亚像素优化
                    x = self.subPixelOptimize(
                        getCoordByIndex(i) + (i >= 0 ? optGap : 0), lineWidth
                    );
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
                for (var i = startIndex; i < dataLength; i += interval) {
                    // 亚像素优化
                    y = self.subPixelOptimize(
                        getCoordByIndex(i) - (i >= 0 ? optGap : 0), lineWidth
                    );
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
            var data       = option.data;
            var dataLength = option.data.length;
            var rotate     = option.axisLabel.rotate;
            var margin     = option.axisLabel.margin;
            var textStyle  = option.axisLabel.textStyle;
            var dataTextStyle;

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

                for (var i = 0; i < dataLength; i += _interval) {
                    if ((_labelData[i].value || _labelData[i]) === '') {
                        // 空文本优化
                        continue;
                    }
                    dataTextStyle = zrUtil.merge(
                        data[i].textStyle || {},
                        textStyle,
                        {'overwrite': false}
                    );
                    axShape = {
                        shape : 'text',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            x : getCoordByIndex(i),
                            y : yPosition,
                            color : dataTextStyle.color,
                            text : _labelData[i].value || _labelData[i],
                            textFont : self.getFont(dataTextStyle),
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

                for (var i = 0; i < dataLength; i += _interval) {
                    if ((_labelData[i].value || _labelData[i]) === '') {
                        // 空文本优化
                        continue;
                    }
                    dataTextStyle = zrUtil.merge(
                        data[i].textStyle || {},
                        textStyle,
                        {'overwrite': false}
                    );
                    axShape = {
                        shape : 'text',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            x : xPosition,
                            y : getCoordByIndex(i),
                            color : dataTextStyle.color,
                            text : _labelData[i].value || _labelData[i],
                            textFont : self.getFont(dataTextStyle),
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
            //var data       = option.data;
            var dataLength  = option.data.length;
            var sLineOption = option.splitLine;
            var lineType    = sLineOption.lineStyle.type;
            var lineWidth   = sLineOption.lineStyle.width;
            var color       = sLineOption.lineStyle.color;
            color = color instanceof Array ? color : [color];
            var colorLength = color.length;
            
            var onGap      = sLineOption.onGap;
            var optGap     = onGap 
                             ? (getGap() / 2) 
                             : typeof onGap == 'undefined'
                                   ? (option.boundaryGap ? (getGap() / 2) : 0)
                                   : 0;
            dataLength -= (onGap || (typeof onGap == 'undefined' && option.boundaryGap)) ? 1 : 0;
            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var sy = grid.getY();
                var ey = grid.getYend();
                var x;

                for (var i = 0; i < dataLength; i += _interval) {
                    // 亚像素优化
                    x = self.subPixelOptimize(
                        getCoordByIndex(i) + optGap, lineWidth
                    );
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : x,
                            yStart : sy,
                            xEnd : x,
                            yEnd : ey,
                            strokeColor : color[(i / _interval) % colorLength],
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

                for (var i = 0; i < dataLength; i += _interval) {
                    // 亚像素优化
                    y = self.subPixelOptimize(
                        getCoordByIndex(i) - optGap, lineWidth
                    );
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : sx,
                            yStart : y,
                            xEnd : ex,
                            yEnd : y,
                            strokeColor : color[(i / _interval) % colorLength],
                            linetype : lineType,
                            lineWidth : lineWidth
                        }
                    };
                    self.shapeList.push(axShape);
                }
            }
        }

        function _buildSplitArea() {
            var axShape;
            var sAreaOption = option.splitArea;
            var color = sAreaOption.areaStyle.color;
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
                var dataLength  = option.data.length;
        
                var onGap      = sAreaOption.onGap;
                var optGap     = onGap 
                                 ? (getGap() / 2) 
                                 : typeof onGap == 'undefined'
                                       ? (option.boundaryGap ? (getGap() / 2) : 0)
                                       : 0;
                if (option.position == 'bottom' || option.position == 'top') {
                    // 横向
                    var y = grid.getY();
                    var height = grid.getHeight();
                    var lastX = grid.getX();
                    var curX;
    
                    for (var i = 0; i <= dataLength; i += _interval) {
                        curX = i < dataLength
                               ? (getCoordByIndex(i) + optGap)
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
                                color : color[(i / _interval) % colorLength]
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
    
                    for (var i = 0; i <= dataLength; i += _interval) {
                        curY = i < dataLength
                               ? (getCoordByIndex(i) - optGap)
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
                                color : color[(i / _interval) % colorLength]
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
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
         * @param {Object} newOption
         * @param {Object} newGrid
         */
        function init(newOption, newGrid) {
            if (newOption.data.length < 1) {
                return;
            }
            grid = newGrid;

            refresh(newOption);
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
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
            }
            self.clear();
            _buildShape();
        }

        /**
         * 返回间隔
         */
        function getGap() {
            var dataLength = option.data.length;
            var total = (option.position == 'bottom'
                        || option.position == 'top')
                        ? grid.getWidth()
                        : grid.getHeight();
            if (option.boundaryGap) {               // 留空
                return total / dataLength;
            }
            else {                                  // 顶头
                return total / (dataLength > 1 ? (dataLength - 1) : 1);
            }
        }

        // 根据值换算位置
        function getCoord(value) {
            var data = option.data;
            var dataLength = data.length;
            var gap = getGap();
            var position = option.boundaryGap ? (gap / 2) : 0;

            for (var i = 0; i < dataLength; i++) {
                if (data[i] == value
                    || (typeof data[i].value != 'undefined' 
                        && data[i].value == value)
                ) {
                    if (option.position == 'bottom'
                        || option.position == 'top'
                    ) {
                        // 横向
                        position = grid.getX() + position;
                    }
                    else {
                        // 纵向
                        position = grid.getYend() - position;
                    }
                    
                    return position;
                    // Math.floor可能引起一些偏差，但性能会更好
                    /* 准确更重要
                    return (i === 0 || i == dataLength - 1)
                           ? position
                           : Math.floor(position);
                    */
                }
                position += gap;
            }
        }

        // 根据类目轴数据索引换算位置
        function getCoordByIndex(dataIndex) {
            if (dataIndex < 0) {
                if (option.position == 'bottom' || option.position == 'top') {
                    return grid.getX();
                }
                else {
                    return grid.getYend();
                }
            }
            else if (dataIndex > option.data.length - 1) {
                if (option.position == 'bottom' || option.position == 'top') {
                    return grid.getXend();
                }
                else {
                    return grid.getY();
                }
            }
            else {
                var gap = getGap();
                var position = option.boundaryGap ? (gap / 2) : 0;
                position += dataIndex * gap;
                
                if (option.position == 'bottom'
                    || option.position == 'top'
                ) {
                    // 横向
                    position = grid.getX() + position;
                }
                else {
                    // 纵向
                    position = grid.getYend() - position;
                }
                
                return position;
                /* 准确更重要
                return (dataIndex === 0 || dataIndex == option.data.length - 1)
                       ? position
                       : Math.floor(position);
                */
            }
        }

        // 根据类目轴数据索引换算类目轴名称
        function getNameByIndex(dataIndex) {
            var data = option.data[dataIndex];
            if (typeof data != 'undefined' && typeof data.value != 'undefined')
            {
                return data.value;
            }
            else {
                return data;
            }
        }
        
        // 根据类目轴名称换算类目轴数据索引
        function getIndexByName(name) {
            var data = option.data;
            var dataLength = data.length;

            for (var i = 0; i < dataLength; i++) {
                if (data[i] == name
                    || (typeof data[i].value != 'undefined' 
                        && data[i].value == name)
                ) {
                    return i;
                }
            }
        }

        /**
         * 根据类目轴数据索引返回是否为主轴线
         * @param {number} dataIndex 类目轴数据索引
         * @return {boolean} 是否为主轴
         */
        function isMainAxis(dataIndex) {
            return dataIndex % _interval === 0;
        }

        function getPosition() {
            return option.position;
        }

        self.init = init;
        self.refresh = refresh;
        self.getGap = getGap;
        self.getCoord = getCoord;
        self.getCoordByIndex = getCoordByIndex;
        self.getNameByIndex = getNameByIndex;
        self.getIndexByName = getIndexByName;
        self.isMainAxis = isMainAxis;
        self.getPosition = getPosition;

        init(option, grid);
    }

    require('../component').define('categoryAxis', CategoryAxis);
    
    return CategoryAxis;
});