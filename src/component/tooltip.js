/**
 * echarts组件：提示框
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
     * @param {Object} option 提示框参数
     * @param {HtmlElement} dom 目标对象
     */
    function Tooltip(messageCenter, zr, option, dom) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrConfig = require('zrender/config');
        var zrShape = require('zrender/shape');
        var zrEvent = require('zrender/tool/event');
        var zrArea = require('zrender/tool/area');
        var zrColor = require('zrender/tool/color');
        var zrUtil = require('zrender/tool/util');

        var rectangle = zrShape.get('rectangle');
        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_TOOLTIP;

        var _zlevelBase = self.getZlevelBase();

        var component = {};                     // 组件索引
        var grid;
        var xAxis;
        var yAxis;

        // tooltip dom & css
        var _tDom = document.createElement('div');
        // 通用样式
        var _gCssText = 'position:absolute;'
                        + 'display:block;'
                        + 'border-style:solid;'
                        + 'white-space:nowrap;';
        // 默认样式
        var _defaultCssText;                    // css样式缓存

        var _needAxisTrigger;                   // 坐标轴触发
        var _hidingTicket;
        var _hideDelay;                         // 隐藏延迟
        var _showingTicket;
        var _showDelay;                         // 显示延迟
        var _curTarget;
        var _event;

        var _curTicket;                         // 异步回调标识，用来区分多个请求

        // 缓存一些高宽数据
        var _zrHeight = zr.getHeight();
        var _zrWidth = zr.getWidth();

        var _axisLineShape = {
            shape : 'line',
            id : zr.newShapeId('tooltip'),
            zlevel: _zlevelBase,
            invisible : true,
            hoverable: false,
            style : {
                // lineWidth : 2,
                // strokeColor : ecConfig.categoryAxis.axisLine.lineStyle.color
            }
        };
        var _axisShadowShape = {
            shape : 'line',
            id : zr.newShapeId('tooltip'),
            zlevel: 1,                      // grid上，chart下
            invisible : true,
            hoverable: false,
            style : {
                // lineWidth : 10,
                // strokeColor : ecConfig.categoryAxis.axisLine.lineStyle.color
            }
        };
        zr.addShape(_axisLineShape);
        zr.addShape(_axisShadowShape);

        /**
         * 根据配置设置dom样式
         */
        function _style(opt) {
            if (!opt) {
                return '';
            }
            cssText = [];
            if (opt.transitionDuration) {
                var transitionText = 'left ' + opt.transitionDuration + 's,'
                                    + 'top ' + opt.transitionDuration + 's';
                cssText.push(
                    'transition:' + transitionText
                );
                cssText.push(
                    '-moz-transition:' + transitionText
                );
                cssText.push(
                    '-webkit-transition:' + transitionText
                );
                cssText.push(
                    '-o-transition:' + transitionText
                );
            }

            if (opt.backgroundColor) {
                // for sb ie~
                cssText.push(
                    'background-Color:' + zrColor.toHex(
                        opt.backgroundColor
                    )
                );
                cssText.push('filter:alpha(opacity=70)');
                cssText.push('background-Color:' + opt.backgroundColor);
            }

            if (typeof opt.borderWidth != 'undefined') {
                cssText.push('border-width:' + opt.borderWidth + 'px');
            }

            if (typeof opt.borderColor != 'undefined') {
                cssText.push('border-color:' + opt.borderColor);
            }

            if (typeof opt.borderRadius != 'undefined') {
                cssText.push(
                    'border-radius:' + opt.borderRadius + 'px'
                );
                cssText.push(
                    '-moz-border-radius:' + opt.borderRadius + 'px'
                );
                cssText.push(
                    '-webkit-border-radius:' + opt.borderRadius + 'px'
                );
                cssText.push(
                    '-o-border-radius:' + opt.borderRadius + 'px'
                );
            }

            var textStyle = opt.textStyle;
            if (textStyle) {
                textStyle.color && cssText.push('color:' + textStyle.color);
                textStyle.decoration && cssText.push(
                    'text-decoration:' + textStyle.decoration
                );
                textStyle.align && cssText.push(
                    'text-align:' + textStyle.align
                );
                textStyle.fontFamily && cssText.push(
                    'font-family:' + textStyle.fontFamily
                );
                textStyle.fontSize && cssText.push(
                    'font-size:' + textStyle.fontSize + 'px'
                );
                textStyle.fontSize && cssText.push(
                    'line-height:' + Math.round(textStyle.fontSize*3/2) + 'px'
                );
                textStyle.fontStyle && cssText.push(
                    'font-style:' + textStyle.fontStyle
                );
                textStyle.fontWeight && cssText.push(
                    'font-weight:' + textStyle.fontWeight
                );
            }


            var padding = opt.padding;
            if (typeof padding != 'undefined') {
                padding = self.reformCssArray(padding);
                cssText.push(
                    'padding:' + padding[0] + 'px '
                               + padding[1] + 'px '
                               + padding[2] + 'px '
                               + padding[3] + 'px'
                );
            }

            cssText = cssText.join(';') + ';';

            return cssText;
        }

        function _hide() {
            if (_tDom) {
                _tDom.style.display = 'none';
            }
            var needRefresh = false;
            if (!_axisLineShape.invisible) {
                _axisLineShape.invisible = true;
                zr.modShape(_axisLineShape.id, _axisLineShape);
                needRefresh = true;
            }
            if (!_axisShadowShape.invisible) {
                _axisShadowShape.invisible = true;
                zr.modShape(_axisShadowShape.id, _axisShadowShape);
                needRefresh = true;
            }
            needRefresh && zr.refresh(); 
        }

        function _show(x, y, specialCssText) {
            var domHeight = _tDom.offsetHeight;
            var domWidth = _tDom.offsetWidth;
            if (x + domWidth > _zrWidth) {
                x = _zrWidth - domWidth;
            }
            if (y + domHeight > _zrHeight) {
                y = _zrHeight - domHeight;
            }
            if (y < 20) {
                y = 0;
            }
            _tDom.style.cssText = _gCssText
                                  + _defaultCssText
                                  + (specialCssText ? specialCssText : '')
                                  + 'left:' + x + 'px;top:' + y + 'px;';
            if (_zrWidth - x < 100 || _zrHeight - y < 100) {
                // 太靠边的做一次refixed
                setTimeout(_refixed, 20);
            }
        }
        
        function _refixed() {
            if (_tDom) {
                var cssText = '';
                var domHeight = _tDom.offsetHeight;
                var domWidth = _tDom.offsetWidth;
                if (_tDom.offsetLeft + domWidth > _zrWidth) {
                    cssText += 'left:' + (_zrWidth - domWidth) + 'px;';
                }
                if (_tDom.offsetTop + domHeight > _zrHeight) {
                    cssText += 'top:' + (_zrHeight - domHeight) + 'px;';
                }
                if (cssText !== '') {
                    _tDom.style.cssText += cssText;
                }
            }
        }

        function _tryShow() {
            var needShow;
            var trigger;
            if (!_curTarget) {
                // 坐标轴事件
                _findAxisTrigger();
            }
            else {
                // 数据项事件
                if (_curTarget._type == 'island'
                    && self.deepQuery([option], 'tooltip.show')
                ) {
                    _showItemTrigger();
                    return;
                }
                var serie = ecData.get(_curTarget, 'series');
                var data = ecData.get(_curTarget, 'data');
                needShow = self.deepQuery(
                    [data, serie, option],
                    'tooltip.show'
                );
                if (typeof serie == 'undefined'
                    || typeof data == 'undefined'
                    || needShow === false
                ) {
                    // 不响应tooltip的数据对象延时隐藏
                    clearTimeout(_hidingTicket);
                    clearTimeout(_showingTicket);
                    _hidingTicket = setTimeout(_hide, _hideDelay);
                }
                else {
                    trigger = self.deepQuery(
                        [data, serie, option],
                        'tooltip.trigger'
                    );
                    trigger == 'axis'
                               ? _showAxisTrigger(
                                     serie.xAxisIndex, serie.yAxisIndex,
                                     ecData.get(_curTarget, 'dataIndex')
                                 )
                               : _showItemTrigger();
                }
            }
        }

        function _findAxisTrigger() {
            var series = option.series;
            var xAxisIndex;
            var yAxisIndex;
            if (!xAxis || !yAxis) {
                _hidingTicket = setTimeout(_hide, _hideDelay);
                return;
            }
            for (var i = 0, l = series.length; i < l; i++) {
                // 找到第一个axis触发tooltip的系列
                if (self.deepQuery(
                        [series[i], option], 'tooltip.trigger'
                    ) == 'axis'
                ) {
                    xAxisIndex = series[i].xAxisIndex || 0;
                    yAxisIndex = series[i].yAxisIndex || 0;
                    if (xAxis.getAxis(xAxisIndex)
                        && xAxis.getAxis(xAxisIndex).type
                           == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        // 横轴为类目轴
                        _showAxisTrigger(xAxisIndex, yAxisIndex,
                            _getNearestDataIndex('x', xAxis.getAxis(xAxisIndex))
                        );
                        return;
                    } else if (yAxis.getAxis(yAxisIndex)
                               && yAxis.getAxis(yAxisIndex).type
                                  == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        // 纵轴为类目轴
                        _showAxisTrigger(xAxisIndex, yAxisIndex,
                            _getNearestDataIndex('y', yAxis.getAxis(yAxisIndex))
                        );
                        return;
                    }
                }
            }
        }
        /**
         * 根据坐标轴事件带的属性获取最近的axisDataIndex
         */
        function _getNearestDataIndex(direction, categoryAxis) {
            var dataIndex = -1;
            var x = zrEvent.getX(_event);
            var y = zrEvent.getY(_event);
            if (direction == 'x') {
                // 横轴为类目轴
                var left;
                var right;
                var xEnd = grid.getXend();
                var curCoord = categoryAxis.getCoordByIndex(dataIndex);
                while (curCoord < xEnd) {
                    if (curCoord <= x) {
                        left = curCoord;
                    }
                    if (curCoord >= x) {
                        break;
                    }
                    curCoord = categoryAxis.getCoordByIndex(++dataIndex);
                    right = curCoord;
                }
                if (x - left < right - x) {
                    dataIndex -= 1;
                }
                else {
                    // 离右边近，看是否为最后一个
                    if (typeof categoryAxis.getNameByIndex(dataIndex)
                        == 'undefined'
                    ) {
                        dataIndex = -1;
                    }
                }
                return dataIndex;
            }
            else {
                // 纵轴为类目轴
                var top;
                var bottom;
                var yStart = grid.getY();
                var curCoord = categoryAxis.getCoordByIndex(dataIndex);
                while (curCoord > yStart) {
                    if (curCoord >= y) {
                        bottom = curCoord;
                    }
                    if (curCoord <= y) {
                        break;
                    }
                    curCoord = categoryAxis.getCoordByIndex(++dataIndex);
                    top = curCoord;
                }

                if (y - top > bottom - y) {
                    dataIndex -= 1;
                }
                else {
                    // 离上方边近，看是否为最后一个
                    if (typeof categoryAxis.getNameByIndex(dataIndex)
                        == 'undefined'
                    ) {
                        dataIndex = -1;
                    }
                }
                return dataIndex;
            }
            return -1;
        }

        function _showAxisTrigger(xAxisIndex, yAxisIndex, dataIndex) {
            if (typeof xAxis == 'undefined'
                || typeof yAxis == 'undefined'
                || typeof xAxisIndex == 'undefined'
                || typeof yAxisIndex == 'undefined'
                || dataIndex < 0
            ) {
                // 不响应tooltip的数据对象延时隐藏
                clearTimeout(_hidingTicket);
                clearTimeout(_showingTicket);
                _hidingTicket = setTimeout(_hide, _hideDelay);
                return;
            }
            var series = option.series;
            var seriesArray = [];
            var categoryAxis;
            var x;
            var y;

            var formatter;
            var specialCssText = '';
            if (self.deepQuery([option], 'tooltip.trigger') == 'axis') {
                if (self.deepQuery([option], 'tooltip.show') === false) {
                    return;
                }
                formatter = self.deepQuery([option],'tooltip.formatter');
            }

            if (xAxisIndex != -1
                && xAxis.getAxis(xAxisIndex).type
                   == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
            ) {
                // 横轴为类目轴，找到所有用这条横轴并且axis触发的系列数据
                categoryAxis = xAxis.getAxis(xAxisIndex);
                for (var i = 0, l = series.length; i < l; i++) {
                    if (series[i].xAxisIndex == xAxisIndex
                        && self.deepQuery(
                               [series[i], option], 'tooltip.trigger'
                           ) == 'axis'
                    ) {
                        formatter = self.deepQuery(
                            [series[i]],
                            'tooltip.formatter'
                        ) || formatter;
                        specialCssText += _style(self.deepQuery(
                                              [series[i]], 'tooltip'
                                          ));
                        seriesArray.push(series[i]);
                    }
                }
                y = zrEvent.getY(_event) + 10;
                x = categoryAxis.getCoordByIndex(dataIndex);
                _styleAxisPointer(
                    seriesArray,
                    x, grid.getY(), 
                    x, grid.getYend(),
                    categoryAxis.getGap()
                );
                x += 10;
            }
            else if (yAxisIndex != -1
                     && yAxis.getAxis(yAxisIndex).type
                        == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
            ) {
                // 纵轴为类目轴，找到所有用这条纵轴并且axis触发的系列数据
                categoryAxis = yAxis.getAxis(yAxisIndex);
                for (var i = 0, l = series.length; i < l; i++) {
                    if (series[i].yAxisIndex == yAxisIndex
                        && self.deepQuery(
                               [series[i], option], 'tooltip.trigger'
                           ) == 'axis'
                    ) {
                        formatter = self.deepQuery(
                            [series[i]],
                            'tooltip.formatter'
                        ) || formatter;
                        specialCssText += _style(self.deepQuery(
                                              [series[i]], 'tooltip'
                                          ));
                        seriesArray.push(series[i]);
                    }
                }
                x = zrEvent.getX(_event) + 10;
                y = categoryAxis.getCoordByIndex(dataIndex);
                _styleAxisPointer(
                    seriesArray,
                    grid.getX(), y, 
                    grid.getXend(), y,
                    categoryAxis.getGap()
                );
                y += 10;
            }

            if (seriesArray.length > 0) {
                var data;
                if (typeof formatter == 'function') {
                    var params = [];
                    for (var i = 0, l = seriesArray.length; i < l; i++) {
                        data = seriesArray[i].data[dataIndex];
                        data = typeof data != 'undefined'
                               ? (typeof data.value != 'undefined'
                                   ? data.value
                                   : data)
                               : '-';
                               
                        params.push([
                            seriesArray[i].name,
                            categoryAxis.getNameByIndex(dataIndex),
                            data
                        ]);
                    }
                    _curTicket = 'axis:' + dataIndex;
                    _tDom.innerHTML = formatter(
                        params, _curTicket, _setContent
                    );
                }
                else if (typeof formatter == 'string') {
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}');
                    for (var i = 0, l = seriesArray.length; i < l; i++) {
                        formatter = formatter.replace(
                            '{a' + i + '}',
                            seriesArray[i].name
                        );
                        formatter = formatter.replace(
                            '{b' + i + '}',
                            categoryAxis.getNameByIndex(dataIndex)
                        );
                        data = seriesArray[i].data[dataIndex];
                        data = typeof data != 'undefined'
                               ? (typeof data.value != 'undefined'
                                   ? data.value
                                   : data)
                               : '-';
                        formatter = formatter.replace(
                            '{c' + i + '}',
                            data
                        );
                    }
                    _tDom.innerHTML = formatter;
                }
                else {
                    formatter = categoryAxis.getNameByIndex(dataIndex);
                    for (var i = 0, l = seriesArray.length; i < l; i++) {
                        formatter += '<br/>' + seriesArray[i].name + ' : ';
                        data = seriesArray[i].data[dataIndex];
                        data = data = typeof data != 'undefined'
                               ? (typeof data.value != 'undefined'
                                   ? data.value
                                   : data)
                               : '-';
                        formatter += data;
                    }
                    _tDom.innerHTML = formatter;
                }

                if (!self.hasAppend) {
                    _tDom.style.left = _zrWidth / 2 + 'px';
                    _tDom.style.top = _zrHeight / 2 + 'px';
                    dom.firstChild.appendChild(_tDom);
                    self.hasAppend = true;
                }
                _show(x, y, specialCssText);
            }
        }
        
        function _showItemTrigger() {
            var serie = ecData.get(_curTarget, 'series');
            var data = ecData.get(_curTarget, 'data');
            var name = ecData.get(_curTarget, 'name');
            var value = ecData.get(_curTarget, 'value');
            var speical = ecData.get(_curTarget, 'special');

            // 从低优先级往上找到trigger为item的formatter和样式
            var formatter;
            var specialCssText = '';
            var indicator;
            var html = '';
            if (_curTarget._type != 'island') {
                // 全局
                if (self.deepQuery([option], 'tooltip.trigger') == 'item'
                ) {
                    formatter = self.deepQuery(
                                    [option], 'tooltip.formatter'
                                ) || formatter;
                }
                // 系列
                if (self.deepQuery([serie],  'tooltip.trigger') == 'item'
                ) {
                    formatter = self.deepQuery(
                                    [serie], 'tooltip.formatter'
                                ) || formatter;
                    specialCssText += _style(self.deepQuery(
                                          [serie], 'tooltip'
                                      ));
                }
                // 数据项
                formatter = self.deepQuery(
                                [data], 'tooltip.formatter'
                            ) || formatter;
                specialCssText += _style(self.deepQuery([data], 'tooltip'));
            }
            else {
                formatter = self.deepQuery(
                    [data, serie, option],
                    'tooltip.islandFormatter'
                );
            }

            if (typeof formatter == 'function') {
                _curTicket = serie.name
                             + ':'
                             + ecData.get(_curTarget, 'dataIndex');
                _tDom.innerHTML = formatter(
                    [
                        serie.name,
                        name,
                        value,
                        speical
                    ],
                    _curTicket,
                    _setContent
                );
            }
            else if (typeof formatter == 'string') {
                formatter = formatter.replace('{a}','{a0}')
                                     .replace('{b}','{b0}')
                                     .replace('{c}','{c0}')
                                     .replace('{d}','{d0}');
                formatter = formatter.replace('{a0}', serie.name)
                                     .replace('{b0}', name)
                                     .replace('{c0}', value);

                if (typeof speical != 'undefined') {
                    formatter = formatter.replace('{d0}', speical);
                }

                _tDom.innerHTML = formatter;
            }
            else {
                if (serie.type == ecConfig.CHART_TYPE_SCATTER) {
                    _tDom.innerHTML = serie.name + '<br/>' +
                                      (name === '' ? '' : (name + ' : ')) 
                                      + value +
                                      (typeof speical == 'undefined'
                                      ? ''
                                      : (' (' + speical + ')'));
                }
                else if (serie.type == ecConfig.CHART_TYPE_RADAR) {
                    indicator = self.deepQuery([serie, option], 'indicator');
                    html += (name === '' ? serie.name : name) + '<br />';
                    for (var i = 0 ; i < indicator.length; i ++) {
                        html += indicator[i].name + ' : ' + value[i] + '<br />';
                    }
                    _tDom.innerHTML = html;
                }
                else {
                    _tDom.innerHTML = serie.name + '<br/>' +
                                      name + ' : ' + value +
                                      (typeof speical == 'undefined'
                                      ? ''
                                      : (' (' + speical + ')'));
                }
            }

            if (!self.hasAppend) {
                _tDom.style.left = _zrWidth / 2 + 'px';
                _tDom.style.top = _zrHeight / 2 + 'px';
                dom.firstChild.appendChild(_tDom);
                self.hasAppend = true;
            }

            _show(
                zrEvent.getX(_event) + 20,
                zrEvent.getY(_event) - 20,
                specialCssText
            );

            if (!_axisLineShape.invisible) {
                _axisLineShape.invisible = true;
                zr.modShape(_axisLineShape.id, _axisLineShape);
                zr.refresh();
            }
        }

        /**
         * 设置坐标轴指示器样式 
         */
        function _styleAxisPointer(
            seriesArray, xStart, yStart, xEnd, yEnd, gap
        ) {
            if (seriesArray.length > 0) {
                var queryTarget;
                var curType;
                var axisPointer = option.tooltip.axisPointer;
                var pointType = axisPointer.type;
                var lineColor = axisPointer.lineStyle.color;
                var lineWidth = axisPointer.lineStyle.width;
                var lineType = axisPointer.lineStyle.type;
                var areaSize = axisPointer.areaStyle.size;
                var areaColor = axisPointer.areaStyle.color;
                
                for (var i = 0, l = seriesArray.length; i < l; i++) {
                    if (self.deepQuery(
                           [seriesArray[i], option], 'tooltip.trigger'
                       ) == 'axis'
                    ) {
                        queryTarget = [seriesArray[i]];
                        curType = self.deepQuery(
                            queryTarget,
                            'tooltip.axisPointer.type'
                        );
                        pointType = curType || pointType; 
                        if (curType == 'line') {
                            lineColor = self.deepQuery(
                                queryTarget,
                                'tooltip.axisPointer.lineStyle.color'
                            ) || lineColor;
                            lineWidth = self.deepQuery(
                                queryTarget,
                                'tooltip.axisPointer.lineStyle.width'
                            ) || lineWidth;
                            lineType = self.deepQuery(
                                queryTarget,
                                'tooltip.axisPointer.lineStyle.type'
                            ) || lineType;
                        }
                        else if (curType == 'shadow') {
                            areaSize = self.deepQuery(
                                queryTarget,
                                'tooltip.axisPointer.areaStyle.size'
                            ) || areaSize;
                            areaColor = self.deepQuery(
                                queryTarget,
                                'tooltip.axisPointer.areaStyle.color'
                            ) || areaColor;
                        }
                    }
                }
                
                if (pointType == 'line') {
                    _axisLineShape.style = {
                        xStart : xStart,
                        yStart : yStart,
                        xEnd : xEnd,
                        yEnd : yEnd,
                        strokeColor : lineColor,
                        lineWidth : lineWidth,
                        lineType : lineType
                    };
                    _axisLineShape.invisible = false;
                    zr.modShape(_axisLineShape.id, _axisLineShape);
                }
                else if (pointType == 'shadow') {
                    if (typeof areaSize == 'undefined' 
                        || areaSize == 'auto'
                        || isNaN(areaSize)
                    ) {
                        lineWidth = gap;
                    }
                    else {
                        lineWidth = areaSize;
                    }
                    if (xStart == xEnd) {
                        // 纵向
                        if (Math.abs(grid.getX() - xStart) < 2) {
                            // 最左边
                            lineWidth /= 2;
                            xStart = xEnd = xEnd + lineWidth / 2;
                        }
                        else if (Math.abs(grid.getXend() - xStart) < 2) {
                            // 最右边
                            lineWidth /= 2;
                            xStart = xEnd = xEnd - lineWidth / 2;
                        }
                    }
                    else if (yStart == yEnd) {
                        // 横向
                        if (Math.abs(grid.getY() - yStart) < 2) {
                            // 最上边
                            lineWidth /= 2;
                            yStart = yEnd = yEnd + lineWidth / 2;
                        }
                        else if (Math.abs(grid.getYend() - yStart) < 2) {
                            // 最右边
                            lineWidth /= 2;
                            yStart = yEnd = yEnd - lineWidth / 2;
                        }
                    }
                    _axisShadowShape.style = {
                        xStart : xStart,
                        yStart : yStart,
                        xEnd : xEnd,
                        yEnd : yEnd,
                        strokeColor : areaColor,
                        lineWidth : lineWidth
                    };
                    _axisShadowShape.invisible = false;
                    zr.modShape(_axisShadowShape.id, _axisShadowShape);
                }
                zr.refresh();
            }
        }

        /**
         * zrender事件响应：鼠标移动
         */
        function _onmousemove(param) {
            clearTimeout(_hidingTicket);
            clearTimeout(_showingTicket);
            var target = param.target;
            if (!target && grid) {
                // 判断是否落到直角系里，axis触发的tooltip
                if (_needAxisTrigger
                    && zrArea.isInside(
                           rectangle,
                           grid.getArea(),
                           zrEvent.getX(param.event),
                           zrEvent.getY(param.event)
                       )
                ) {
                    _curTarget = false;
                    _event = param.event;
                    _event._target = _event.target || _event.toElement;
                    _event.zrenderX = zrEvent.getX(_event);
                    _event.zrenderY = zrEvent.getY(_event);
                    _showingTicket = setTimeout(_tryShow, _showDelay);
                }
                else {
                    _hidingTicket = setTimeout(_hide, _hideDelay);
                }
            }
            else {
                _curTarget = target;
                _event = param.event;
                _event._target = _event.target || _event.toElement;
                _event.zrenderX = zrEvent.getX(_event);
                _event.zrenderY = zrEvent.getY(_event);
                _showingTicket = setTimeout(_tryShow, _showDelay);
            }
        }

        /**
         * zrender事件响应：鼠标离开绘图区域
         */
        function _onglobalout() {
            clearTimeout(_hidingTicket);
            clearTimeout(_showingTicket);
            _hidingTicket = setTimeout(_hide, _hideDelay);
        }

        /**
         * 异步回调填充内容
         */
        function _setContent(ticket, content) {
            if (ticket == _curTicket) {
                _tDom.innerHTML = content;
            }
            var cssText = '';
            var domHeight = _tDom.offsetHeight;
            var domWidth = _tDom.offsetWidth;

            if (_tDom.offsetLeft + domWidth > _zrWidth) {
                cssText += 'left:' + (_zrWidth - domWidth) + 'px;';
            }
            if (_tDom.offsetTop + domHeight > _zrHeight) {
                cssText += 'top:' + (_zrHeight - domHeight) + 'px;';
            }
            if (cssText !== '') {
                _tDom.style.cssText += cssText;
            }
            
            if (_zrWidth - _tDom.offsetLeft < 100 
                || _zrHeight - _tDom.offsetTop < 100
            ) {
                // 太靠边的做一次refixed
                setTimeout(_refixed, 20);
            }
        }

        function setComponent(newComponent) {
            component = newComponent;
            grid = component.grid;
            xAxis = component.xAxis;
            yAxis = component.yAxis;
        }

        function init(newOption, newDom) {
            option = newOption;
            dom = newDom;

            option.tooltip = self.reformOption(option.tooltip);
            option.tooltip.textStyle = zrUtil.merge(
                option.tooltip.textStyle,
                ecConfig.textStyle,
                {
                    'overwrite': false,
                    'recursive': true
                }
            );
            // 补全padding属性
            option.tooltip.padding = self.reformCssArray(
                option.tooltip.padding
            );

            _needAxisTrigger = false;
            if (option.tooltip.trigger == 'axis') {
                _needAxisTrigger = true;
            }

            var series = option.series;
            for (var i = 0, l = series.length; i < l; i++) {
                if (self.deepQuery([series[i]], 'tooltip.trigger')
                    == 'axis'
                ) {
                    _needAxisTrigger = true;
                    break;
                }
            }
            
            _showDelay = option.tooltip.showDelay;
            _hideDelay = option.tooltip.hideDelay;
            _defaultCssText = _style(option.tooltip);
            _tDom.style.position = 'absolute';  // 不是多余的，别删！
            self.hasAppend = false;
        }
        
        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                option.tooltip = self.reformOption(option.tooltip);
                option.tooltip.textStyle = zrUtil.merge(
                    option.tooltip.textStyle,
                    ecConfig.textStyle,
                    {
                        'overwrite': false,
                        'recursive': true
                    }
                );
                // 补全padding属性
                option.tooltip.padding = self.reformCssArray(
                    option.tooltip.padding
                );
            }
        }

        /**
         * zrender事件响应：窗口大小改变
         */
        function resize() {
            _zrHeight = zr.getHeight();
            _zrWidth = zr.getWidth();
        }

        /**
         * 释放后实例不可用，重载基类方法
         */
        function dispose() {
            clearTimeout(_hidingTicket);
            clearTimeout(_showingTicket);
            zr.un(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
            zr.un(zrConfig.EVENT.GLOBALOUT, _onglobalout);

            if (self.hasAppend) {
                dom.firstChild.removeChild(_tDom);
            }
            _tDom = null;

            // self.clear();
            self.shapeList = null;
            self = null;
        }

        zr.on(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
        zr.on(zrConfig.EVENT.GLOBALOUT, _onglobalout);

        // 重载基类方法
        self.dispose = dispose;

        self.init = init;
        self.refresh = refresh;
        self.resize = resize;
        self.setComponent = setComponent;
        init(option, dom);
    }

    require('../component').define('tooltip', Tooltip);

    return Tooltip;
});