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
    function CategoryAxis(messageCenter, zr, option, component) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');

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
                        var gap = getCoord(data[1]) -  getCoord(data[0]);
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
                        var gap = getCoord(data[0]) - getCoord(data[1]);
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
            var axShape = {
                shape : 'line',
                zlevel: _zlevelBase + 1,
                hoverable: false
            };
            switch (option.position) {
                case 'left':
                    axShape.style = {
                        xStart : grid.getX(),
                        yStart : grid.getY(),
                        xEnd : grid.getX(),
                        yEnd : grid.getYend()
                    };
                    break;
                case 'right':
                    axShape.style = {
                        xStart : grid.getXend(),
                        yStart : grid.getY(),
                        xEnd : grid.getXend(),
                        yEnd : grid.getYend()
                    };
                    break;
                case 'bottom':
                    axShape.style = {
                        xStart : grid.getX(),
                        yStart : grid.getYend(),
                        xEnd : grid.getXend(),
                        yEnd : grid.getYend()
                    };
                    break;
                case 'top':
                    axShape.style = {
                        xStart : grid.getX(),
                        yStart : grid.getY(),
                        xEnd : grid.getXend(),
                        yEnd : grid.getY()
                    };
                    break;
            }

            axShape.style.strokeColor = option.axisLine.lineStyle.color;
            axShape.style.lineWidth = option.axisLine.lineStyle.width;
            axShape.style.lineType = option.axisLine.lineStyle.type;

            self.shapeList.push(axShape);
        }

        // 小标记
        function _buildAxisTick() {
            var axShape;
            var data       = option.data;
            var dataLength = option.data.length;
            var length     = option.axisTick.length;
            var color      = option.axisTick.lineStyle.color;
            var lineWidth  = option.axisTick.lineStyle.width;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var yPosition = option.position == 'bottom'
                                ? grid.getYend()
                                : (grid.getY() - length);
                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : getCoord(data[i].value || data[i]),
                            yStart : yPosition,
                            xEnd : getCoord(data[i].value || data[i]),
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
                                ? (grid.getX() - length)
                                : grid.getXend();
                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : xPosition,
                            yStart : getCoord(data[i].value || data[i]),
                            xEnd : xPosition + length,
                            yEnd : getCoord(data[i].value || data[i]),
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
                            x : getCoord(data[i].value || data[i]),
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
                            y : getCoord(data[i].value || data[i]),
                            color : dataTextStyle.color,
                            text : _labelData[i].value || _labelData[i],
                            textFont : self.getFont(dataTextStyle),
                            textAlign : align,
                            textBaseline : 'middle'
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
            var data       = option.data;
            var dataLength = option.data.length;
            var color = option.splitLine.lineStyle.color;
            color = color instanceof Array ? color : [color];
            var colorLength = color.length;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var sy = grid.getY();
                var ey = grid.getYend();
                var x;

                for (var i = 0; i < dataLength; i += _interval) {
                    x = getCoord(data[i].value || data[i]);
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
                            lineType : option.splitLine.lineStyle.type,
                            lineWidth : option.splitLine.lineStyle.width
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
                    y = getCoord(data[i].value || data[i]);
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
                            linetype : option.splitLine.lineStyle.type,
                            lineWidth : option.splitLine.lineStyle.width
                        }
                    };
                    self.shapeList.push(axShape);
                }
            }
        }

        function _buildSplitArea() {
            var axShape;
            var color = option.splitArea.areaStyle.color;
            color = color instanceof Array ? color : [color];
            var colorLength = color.length;
            var data        = option.data;
            var dataLength  = option.data.length;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var y = grid.getY();
                var height = grid.getHeight();
                var lastX = grid.getX();
                var curX;

                for (var i = 0; i <= dataLength; i++) {
                    curX = i < dataLength
                           ? getCoord(data[i].value || data[i])
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
                           ? getCoord(data[i].value || data[i])
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
                return total / (dataLength + 1);
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
            var position = option.boundaryGap ? gap : 0;

            // Math.floor可能引起一些偏差，但性能会更好
            for (var i = 0; i < dataLength; i++) {
                if (data[i] == value
                    || (data[i].value && data[i].value == value)
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
                    return (i === 0 || i == dataLength - 1)
                           ? position
                           : Math.floor(position);
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
            else if (dataIndex >= option.data.length) {
                if (option.position == 'bottom' || option.position == 'top') {
                    return grid.getXend();
                }
                else {
                    return grid.getY();
                }
            }
            else {
                return getCoord(option.data[dataIndex]);
            }
        }

        // 根据类目轴数据索引换算类目轴名称
        function getNameByIndex(dataIndex) {
            return option.data[dataIndex];
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
        self.isMainAxis = isMainAxis;
        self.getPosition = getPosition;

        init(option, grid);
    }

    require('../component').define('categoryAxis', CategoryAxis);
    
    return CategoryAxis;
});