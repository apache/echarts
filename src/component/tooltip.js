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
     * @param {ECharts} myChart 当前图表实例
     */
    function Tooltip(ecConfig, messageCenter, zr, option, dom, myChart) {
        var Base = require('./base');
        Base.call(this, ecConfig, zr);

        var ecData = require('../util/ecData');

        var zrConfig = require('zrender/config');
        var zrShape = require('zrender/shape');
        var zrEvent = require('zrender/tool/event');
        var zrArea = require('zrender/tool/area');
        var zrColor = require('zrender/tool/color');
        var zrUtil = require('zrender/tool/util');
        var zrShapeBase = require('zrender/shape/base');

        var rectangle = zrShape.get('rectangle');
        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_TOOLTIP;

        var _zlevelBase = self.getZlevelBase();

        var component = {};                     // 组件索引
        var grid;
        var xAxis;
        var yAxis;
        var polar;

        var _selectedMap = {};
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

        var _lastTipShape = false;
        var _axisLineWidth = 0;
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
            var cssText = [];
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
            if (_lastTipShape && _lastTipShape.tipShape.length > 0) {
                zr.delShape(_lastTipShape.tipShape);
                _lastTipShape = false;
            }
            needRefresh && zr.refresh(); 
        }

        function _show(x, y, specialCssText) {
            var domHeight = _tDom.offsetHeight;
            var domWidth = _tDom.offsetWidth;
            if (x + domWidth > _zrWidth) {
                // 太靠右
                //x = _zrWidth - domWidth;
                x -= (domWidth + 40);
            }
            if (y + domHeight > _zrHeight) {
                // 太靠下
                //y = _zrHeight - domHeight;
                y -= (domHeight - 20);
            }
            if (y < 20) {
                y = 0;
            }
            _tDom.style.cssText = _gCssText
                                  + _defaultCssText
                                  + (specialCssText ? specialCssText : '')
                                  + 'left:' + x + 'px;top:' + y + 'px;';
            
            if (domHeight < 10 || domWidth < 10) {
                // _zrWidth - x < 100 || _zrHeight - y < 100
                setTimeout(_refixed, 20);
            }
        }
        
        function _refixed() {
            if (_tDom) {
                var cssText = '';
                var domHeight = _tDom.offsetHeight;
                var domWidth = _tDom.offsetWidth;
                if (_tDom.offsetLeft + domWidth > _zrWidth) {
                    cssText += 'left:' + (_zrWidth - domWidth - 20) + 'px;';
                }
                if (_tDom.offsetTop + domHeight > _zrHeight) {
                    cssText += 'top:' + (_zrHeight - domHeight - 10) + 'px;';
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
                _findPolarTrigger() || _findAxisTrigger();
            }
            else {
                // 数据项事件
                if (_curTarget._type == 'island' && option.tooltip.show) {
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

        /**
         * 直角系 
         */
        function _findAxisTrigger() {
            if (!xAxis || !yAxis) {
                _hidingTicket = setTimeout(_hide, _hideDelay);
                return;
            }
            var series = option.series;
            var xAxisIndex;
            var yAxisIndex;
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
                    } 
                    else if (yAxis.getAxis(yAxisIndex)
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
         * 极坐标 
         */
        function _findPolarTrigger() {
            if (!polar) {
                return false;
            }
            var x = zrEvent.getX(_event);
            var y = zrEvent.getY(_event);
            var polarIndex = polar.getNearestIndex([x, y]);
            var valueIndex;
            if (polarIndex) {
                valueIndex = polarIndex.valueIndex;
                polarIndex = polarIndex.polarIndex;
            }
            else {
                polarIndex = -1;
            }
            
            if (polarIndex != -1) {
                return _showPolarTrigger(polarIndex, valueIndex);
            }
            
            return false;
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
                    dataIndex -= dataIndex !== 0 ? 1 : 0;
                }
                else {
                    // 离右边近，看是否为最后一个
                    if (typeof categoryAxis.getNameByIndex(dataIndex)
                        == 'undefined'
                    ) {
                        dataIndex -= 1;
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
                    dataIndex -= dataIndex !== 0 ? 1 : 0;
                }
                else {
                    // 离上方边近，看是否为最后一个
                    if (typeof categoryAxis.getNameByIndex(dataIndex)
                        == 'undefined'
                    ) {
                        dataIndex -= 1;
                    }
                }
                return dataIndex;
            }
            return -1;
        }

        /**
         * 直角系 
         */
        function _showAxisTrigger(xAxisIndex, yAxisIndex, dataIndex) {
            !_event.connectTrigger && messageCenter.dispatch(
                ecConfig.EVENT.TOOLTIP_IN_GRID,
                _event
            );
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
            var seriesIndex = [];
            var categoryAxis;
            var x;
            var y;

            var formatter;
            var showContent;
            var specialCssText = '';
            if (option.tooltip.trigger == 'axis') {
                if (option.tooltip.show === false) {
                    return;
                }
                formatter = option.tooltip.formatter;
            }

            if (xAxisIndex != -1
                && xAxis.getAxis(xAxisIndex).type
                   == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
            ) {
                // 横轴为类目轴，找到所有用这条横轴并且axis触发的系列数据
                categoryAxis = xAxis.getAxis(xAxisIndex);
                for (var i = 0, l = series.length; i < l; i++) {
                    if (!_isSelected(series[i].name)) {
                        continue;
                    }
                    if (series[i].xAxisIndex == xAxisIndex
                        && self.deepQuery(
                               [series[i], option], 'tooltip.trigger'
                           ) == 'axis'
                    ) {
                        showContent = self.query(
                            series[i],
                            'tooltip.showContent'
                        ) || showContent;
                        formatter = self.query(
                            series[i],
                            'tooltip.formatter'
                        ) || formatter;
                        specialCssText += _style(self.query(
                                              series[i], 'tooltip'
                                          ));
                        seriesArray.push(series[i]);
                        seriesIndex.push(i);
                    }
                }
                // 寻找高亮元素
                messageCenter.dispatch(
                    ecConfig.EVENT.TOOLTIP_HOVER,
                    _event,
                    {
                        seriesIndex : seriesIndex,
                        dataIndex : component.dataZoom
                                    ? component.dataZoom.getRealDataIndex(
                                        seriesIndex,
                                        dataIndex
                                      )
                                    : dataIndex
                    }
                );
                y = zrEvent.getY(_event) + 10;
                x = self.subPixelOptimize(
                    categoryAxis.getCoordByIndex(dataIndex),
                    _axisLineWidth
                );
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
                    if (!_isSelected(series[i].name)) {
                        continue;
                    }
                    if (series[i].yAxisIndex == yAxisIndex
                        && self.deepQuery(
                               [series[i], option], 'tooltip.trigger'
                           ) == 'axis'
                    ) {
                        showContent = self.query(
                            series[i],
                            'tooltip.showContent'
                        ) || showContent;
                        formatter = self.query(
                            series[i],
                            'tooltip.formatter'
                        ) || formatter;
                        specialCssText += _style(self.query(
                                              series[i], 'tooltip'
                                          ));
                        seriesArray.push(series[i]);
                        seriesIndex.push(i);
                    }
                }
                // 寻找高亮元素
                messageCenter.dispatch(
                    ecConfig.EVENT.TOOLTIP_HOVER,
                    _event,
                    {
                        seriesIndex : seriesIndex,
                        dataIndex : component.dataZoom
                                    ? component.dataZoom.getRealDataIndex(
                                        seriesIndex,
                                        dataIndex
                                      )
                                    : dataIndex
                    }
                );
                x = zrEvent.getX(_event) + 10;
                y = self.subPixelOptimize(
                    categoryAxis.getCoordByIndex(dataIndex),
                    _axisLineWidth
                );
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
                            seriesArray[i].name || '',
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
                    _curTicket = NaN;
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}');
                    for (var i = 0, l = seriesArray.length; i < l; i++) {
                        formatter = formatter.replace(
                            '{a' + i + '}',
                            _encodeHTML(seriesArray[i].name || '')
                        );
                        formatter = formatter.replace(
                            '{b' + i + '}',
                            _encodeHTML(categoryAxis.getNameByIndex(dataIndex))
                        );
                        data = seriesArray[i].data[dataIndex];
                        data = typeof data != 'undefined'
                               ? (typeof data.value != 'undefined'
                                   ? data.value
                                   : data)
                               : '-';
                        formatter = formatter.replace(
                            '{c' + i + '}',
                            data instanceof Array 
                            ? data : self.numAddCommas(data)
                        );
                    }
                    _tDom.innerHTML = formatter;
                }
                else {
                    _curTicket = NaN;
                    formatter = _encodeHTML(
                        categoryAxis.getNameByIndex(dataIndex)
                    );

                    for (var i = 0, l = seriesArray.length; i < l; i++) {
                        formatter += '<br/>' 
                                     + _encodeHTML(seriesArray[i].name || '')
                                     + ' : ';
                        data = seriesArray[i].data[dataIndex];
                        data = typeof data != 'undefined'
                               ? (typeof data.value != 'undefined'
                                   ? data.value
                                   : data)
                               : '-';
                        formatter += data instanceof Array 
                                     ? data : self.numAddCommas(data);
                    }
                    _tDom.innerHTML = formatter;
                }

                if (showContent === false || !option.tooltip.showContent) {
                    // 只用tooltip的行为，不显示主体
                    return;
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
        
        /**
         * 极坐标 
         */
        function _showPolarTrigger(polarIndex, dataIndex) {
            if (typeof polar == 'undefined'
                || typeof polarIndex == 'undefined'
                || typeof dataIndex == 'undefined'
                || dataIndex < 0
            ) {
                return false;
            }
            var series = option.series;
            var seriesArray = [];

            var formatter;
            var showContent;
            var specialCssText = '';
            if (option.tooltip.trigger == 'axis') {
                if (option.tooltip.show === false) {
                    return false;
                }
                formatter = option.tooltip.formatter;
            }
            var indicatorName = 
                    option.polar[polarIndex].indicator[dataIndex].text;

            // 找到所有用这个极坐标并且axis触发的系列数据
            for (var i = 0, l = series.length; i < l; i++) {
                if (!_isSelected(series[i].name)) {
                    continue;
                }
                if (series[i].polarIndex == polarIndex
                    && self.deepQuery(
                           [series[i], option], 'tooltip.trigger'
                       ) == 'axis'
                ) {
                    showContent = self.query(
                        series[i],
                        'tooltip.showContent'
                    ) || showContent;
                    formatter = self.query(
                        series[i],
                        'tooltip.formatter'
                    ) || formatter;
                    specialCssText += _style(self.query(
                                          series[i], 'tooltip'
                                      ));
                    seriesArray.push(series[i]);
                }
            }
            if (seriesArray.length > 0) {
                var polarData;
                var data;
                var params = [];

                for (var i = 0, l = seriesArray.length; i < l; i++) {
                    polarData = seriesArray[i].data;
                    for (var j = 0, k = polarData.length; j < k; j++) {
                        data = polarData[j];
                        if (!_isSelected(data.name)) {
                            continue;
                        }
                        data = typeof data != 'undefined'
                               ? data
                               : {name:'', value: {dataIndex:'-'}};
                               
                        params.push([
                            seriesArray[i].name || '',
                            data.name,
                            data.value[dataIndex],
                            indicatorName
                        ]);
                    }
                }
                if (params.length <= 0) {
                    return;
                }
                if (typeof formatter == 'function') {
                    _curTicket = 'axis:' + dataIndex;
                    _tDom.innerHTML = formatter(
                        params, _curTicket, _setContent
                    );
                }
                else if (typeof formatter == 'string') {
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}')
                                         .replace('{d}','{d0}');
                    for (var i = 0, l = params.length; i < l; i++) {
                        formatter = formatter.replace(
                            '{a' + i + '}',
                            _encodeHTML(params[i][0])
                        );
                        formatter = formatter.replace(
                            '{b' + i + '}',
                            _encodeHTML(params[i][1])
                        );
                        formatter = formatter.replace(
                            '{c' + i + '}',
                            self.numAddCommas(params[i][2])
                        );
                        formatter = formatter.replace(
                            '{d' + i + '}',
                            _encodeHTML(params[i][3])
                        );
                    }
                    _tDom.innerHTML = formatter;
                }
                else {
                    formatter = _encodeHTML(params[0][1]) + '<br/>' 
                                + _encodeHTML(params[0][3]) + ' : ' 
                                + self.numAddCommas(params[0][2]);
                    for (var i = 1, l = params.length; i < l; i++) {
                        formatter += '<br/>' + _encodeHTML(params[i][1]) 
                                     + '<br/>';
                        formatter += _encodeHTML(params[i][3]) + ' : ' 
                                     + self.numAddCommas(params[i][2]);
                    }
                    _tDom.innerHTML = formatter;
                }

                if (showContent === false || !option.tooltip.showContent) {
                    // 只用tooltip的行为，不显示主体
                    return;
                }
                
                if (!self.hasAppend) {
                    _tDom.style.left = _zrWidth / 2 + 'px';
                    _tDom.style.top = _zrHeight / 2 + 'px';
                    dom.firstChild.appendChild(_tDom);
                    self.hasAppend = true;
                }
                _show(
                    zrEvent.getX(_event), 
                    zrEvent.getY(_event), 
                    specialCssText
                );
                return true;
            }
        }
        
        function _showItemTrigger() {
            var serie = ecData.get(_curTarget, 'series');
            var data = ecData.get(_curTarget, 'data');
            var name = ecData.get(_curTarget, 'name');
            var value = ecData.get(_curTarget, 'value');
            var special = ecData.get(_curTarget, 'special');
            var special2 = ecData.get(_curTarget, 'special2');
            // 从低优先级往上找到trigger为item的formatter和样式
            var formatter;
            var showContent;
            var specialCssText = '';
            var indicator;
            var html = '';
            if (_curTarget._type != 'island') {
                // 全局
                if (option.tooltip.trigger == 'item') {
                    formatter = option.tooltip.formatter;
                }
                // 系列
                if (self.query(serie, 'tooltip.trigger') == 'item') {
                    showContent = self.query(
                                      serie, 'tooltip.showContent'
                                  ) || showContent;
                    formatter = self.query(
                                    serie, 'tooltip.formatter'
                                ) || formatter;
                    specialCssText += _style(self.query(
                                          serie, 'tooltip'
                                      ));
                }
                // 数据项
                showContent = self.query(
                                  data, 'tooltip.showContent'
                              ) || showContent;
                formatter = self.query(
                                data, 'tooltip.formatter'
                            ) || formatter;
                specialCssText += _style(self.query(data, 'tooltip'));
            }
            else {
                showContent = self.deepQuery(
                    [data, serie, option],
                    'tooltip.showContent'
                );
                formatter = self.deepQuery(
                    [data, serie, option],
                    'tooltip.islandFormatter'
                );
            }

            if (typeof formatter == 'function') {
                _curTicket = (serie.name || '')
                             + ':'
                             + ecData.get(_curTarget, 'dataIndex');
                _tDom.innerHTML = formatter(
                    [
                        serie.name || '',
                        name,
                        value,
                        special,
                        special2
                    ],
                    _curTicket,
                    _setContent
                );
            }
            else if (typeof formatter == 'string') {
                _curTicket = NaN;
                formatter = formatter.replace('{a}','{a0}')
                                     .replace('{b}','{b0}')
                                     .replace('{c}','{c0}');
                formatter = formatter.replace(
                                          '{a0}', _encodeHTML(serie.name || '')
                                      )
                                     .replace('{b0}', _encodeHTML(name))
                                     .replace(
                                         '{c0}', 
                                         value instanceof Array
                                         ? value : self.numAddCommas(value)
                                     );

                formatter = formatter.replace('{d}','{d0}')
                                     .replace('{d0}', special || '');
                formatter = formatter.replace('{e}','{e0}')
                    .replace('{e0}', ecData.get(_curTarget, 'special2') || '');

                _tDom.innerHTML = formatter;
            }
            else {
                _curTicket = NaN;
                if (serie.type == ecConfig.CHART_TYPE_SCATTER) {
                    _tDom.innerHTML = (typeof serie.name != 'undefined'
                                          ? (_encodeHTML(serie.name) + '<br/>')
                                          : ''
                                      ) 
                                      + (name === '' 
                                            ? '' : (_encodeHTML(name) + ' : ')
                                      ) 
                                      + value 
                                      + (typeof special == 'undefined'
                                          ? ''
                                          : (' (' + special + ')'));
                }
                else if (serie.type == ecConfig.CHART_TYPE_RADAR && special) {
                    indicator = special;
                    html += _encodeHTML(
                        name === '' ? (serie.name || '') : name
                    );
                    html += html === '' ? '' : '<br />';
                    for (var i = 0 ; i < indicator.length; i ++) {
                        html += _encodeHTML(indicator[i].text) + ' : ' 
                                + self.numAddCommas(value[i]) + '<br />';
                    }
                    _tDom.innerHTML = html;
                }
                else if (serie.type == ecConfig.CHART_TYPE_CHORD) {
                    if (typeof special2 == 'undefined') {
                        // 外环上
                        _tDom.innerHTML = _encodeHTML(name) + ' (' 
                                          + self.numAddCommas(value) + ')';
                    }
                    else {
                        var name1 = _encodeHTML(name);
                        var name2 = _encodeHTML(special);
                        // 内部弦上
                        _tDom.innerHTML = (typeof serie.name != 'undefined'
                                          ? (_encodeHTML(serie.name) + '<br/>')
                                          : '')
                              + name1 + ' -> ' + name2 
                              + ' (' + self.numAddCommas(value) + ')'
                              + '<br />'
                              + name2 + ' -> ' + name1
                              + ' (' + self.numAddCommas(special2) + ')';
                    }
                }
                else {
                    _tDom.innerHTML = (typeof serie.name != 'undefined'
                                      ? (_encodeHTML(serie.name) + '<br/>')
                                      : '')
                                      + _encodeHTML(name) + ' : ' 
                                      + self.numAddCommas(value) +
                                      (typeof special == 'undefined'
                                      ? ''
                                      : (' ('+ self.numAddCommas(special) +')')
                                      );
                }
            }

            if (!_axisLineShape.invisible) {
                _axisLineShape.invisible = true;
                zr.modShape(_axisLineShape.id, _axisLineShape);
                zr.refresh();
            }
            
            if (showContent === false || !option.tooltip.showContent) {
                // 只用tooltip的行为，不显示主体
                return;
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
                        queryTarget = seriesArray[i];
                        curType = self.query(
                            queryTarget,
                            'tooltip.axisPointer.type'
                        );
                        pointType = curType || pointType; 
                        if (curType == 'line') {
                            lineColor = self.query(
                                queryTarget,
                                'tooltip.axisPointer.lineStyle.color'
                            ) || lineColor;
                            lineWidth = self.query(
                                queryTarget,
                                'tooltip.axisPointer.lineStyle.width'
                            ) || lineWidth;
                            lineType = self.query(
                                queryTarget,
                                'tooltip.axisPointer.lineStyle.type'
                            ) || lineType;
                        }
                        else if (curType == 'shadow') {
                            areaSize = self.query(
                                queryTarget,
                                'tooltip.axisPointer.areaStyle.size'
                            ) || areaSize;
                            areaColor = self.query(
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
            var mx = zrEvent.getX(param.event);
            var my = zrEvent.getY(param.event);
            if (!target) {
                // 判断是否落到直角系里，axis触发的tooltip
                _curTarget = false;
                _event = param.event;
                _event._target = _event.target || _event.toElement;
                _event.zrenderX = mx;
                _event.zrenderY = my;
                if (_needAxisTrigger 
                    && grid 
                    && zrArea.isInside(
                        rectangle,
                        grid.getArea(),
                        mx,
                        my
                    )
                ) {
                    _showingTicket = setTimeout(_tryShow, _showDelay);
                }
                else if (_needAxisTrigger 
                        && polar 
                        && polar.isInside([mx, my]) != -1
                ) {
                    _showingTicket = setTimeout(_tryShow, _showDelay);
                }
                else {
                    !_event.connectTrigger && messageCenter.dispatch(
                        ecConfig.EVENT.TOOLTIP_OUT_GRID,
                        _event
                    );
                    _hidingTicket = setTimeout(_hide, _hideDelay);
                }
            }
            else {
                _curTarget = target;
                _event = param.event;
                _event._target = _event.target || _event.toElement;
                _event.zrenderX = mx;
                _event.zrenderY = my;
                var polarIndex;
                if (_needAxisTrigger 
                    && polar 
                    && (polarIndex = polar.isInside([mx, my])) != -1
                ) {
                    // 看用这个polar的系列数据是否是axis触发，如果是设置_curTarget为nul
                    var series = option.series;
                    for (var i = 0, l = series.length; i < l; i++) {
                        if (series[i].polarIndex == polarIndex
                            && self.deepQuery(
                                   [series[i], option], 'tooltip.trigger'
                               ) == 'axis'
                        ) {
                            _curTarget = null;
                            break;
                        }
                    }
                   
                }
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
            if (!_tDom) {
                return;
            }
            if (ticket == _curTicket) {
                _tDom.innerHTML = content;
            }
            
            setTimeout(_refixed, 20);
        }

        function setComponent() {
            component = myChart.component;
            grid = component.grid;
            xAxis = component.xAxis;
            yAxis = component.yAxis;
            polar = component.polar;
        }
        
        function ontooltipHover(param, tipShape) {
            if (!_lastTipShape // 不存在或者存在但dataIndex发生变化才需要重绘
                || (_lastTipShape && _lastTipShape.dataIndex != param.dataIndex)
            ) {
                if (_lastTipShape && _lastTipShape.tipShape.length > 0) {
                    zr.delShape(_lastTipShape.tipShape);
                }
                for (var i = 0, l = tipShape.length; i < l; i++) {
                    tipShape[i].id = zr.newShapeId('tooltip');
                    tipShape[i].zlevel = _zlevelBase;
                    tipShape[i].style = zrShapeBase.getHighlightStyle(
                        tipShape[i].style,
                        tipShape[i].highlightStyle
                    );
                    tipShape[i].draggable = false;
                    tipShape[i].hoverable = false;
                    tipShape[i].clickable = false;
                    tipShape[i].ondragend = null;
                    tipShape[i].ondragover = null;
                    tipShape[i].ondrop = null;
                    zr.addShape(tipShape[i]);
                }
                _lastTipShape = {
                    dataIndex : param.dataIndex,
                    tipShape : tipShape
                };
            }
        }
        
        function ondragend() {
            _hide();
        }
        
        /**
         * 图例选择
         */
        function onlegendSelected(param) {
            _selectedMap = param.selected;
        }
        
        function _setSelectedMap() {
            if (option.legend && option.legend.selected) {
                _selectedMap = option.legend.selected;
            }
            else {
                _selectedMap = {};
            }
        }
        
        function _isSelected(itemName) {
            if (typeof _selectedMap[itemName] != 'undefined') {
                return _selectedMap[itemName];
            }
            else {
                return true; // 没在legend里定义的都为true啊~
            }
        }

        /**
         * 模拟tooltip hover方法
         * {object} params  参数
         *          {seriesIndex: 0, seriesName:'', dataInex:0} line、bar、scatter、k、radar
         *          {seriesIndex: 0, seriesName:'', name:''} map、pie、chord
         */
        function showTip(params) {
            if (!params) {
                return;
            }
            
            var seriesIndex;
            var series = option.series;
            if (typeof params.seriesIndex != 'undefined') {
                seriesIndex = params.seriesIndex;
            }
            else {
                var seriesName = params.seriesName;
                for (var i = 0, l = series.length; i < l; i++) {
                    if (series[i].name == seriesName) {
                        seriesIndex = i;
                        break;
                    }
                }
            }
            
            var serie = series[seriesIndex];
            if (typeof serie == 'undefined') {
                return;
            }
            var chart = myChart.chart[serie.type];
            var isAxisTrigger = self.deepQuery(
                                    [serie, option], 'tooltip.trigger'
                                ) == 'axis';
            
            if (!chart) {
                return;
            }
            
            if (isAxisTrigger) {
                // axis trigger
                var dataIndex = params.dataIndex;
                switch (chart.type) {
                    case ecConfig.CHART_TYPE_LINE :
                    case ecConfig.CHART_TYPE_BAR :
                    case ecConfig.CHART_TYPE_K :
                        if (typeof xAxis == 'undefined' 
                            || typeof yAxis == 'undefined'
                            || serie.data.length <= dataIndex
                        ) {
                            return;
                        }
                        var xAxisIndex = serie.xAxisIndex || 0;
                        var yAxisIndex = serie.yAxisIndex || 0;
                        if (xAxis.getAxis(xAxisIndex).type 
                            == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                        ) {
                            // 横轴是类目
                            _event = {
                                zrenderX : xAxis.getAxis(xAxisIndex).getCoordByIndex(dataIndex),
                                zrenderY : grid.getY() + (grid.getYend() - grid.getY()) / 4
                            };
                        }
                        else {
                            // 纵轴是类目
                            _event = {
                                zrenderX : grid.getX() + (grid.getXend() - grid.getX()) / 4,
                                zrenderY : yAxis.getAxis(yAxisIndex).getCoordByIndex(dataIndex)
                            };
                        }
                        _showAxisTrigger(
                            xAxisIndex, 
                            yAxisIndex,
                            dataIndex
                        );
                        break;
                    case ecConfig.CHART_TYPE_RADAR :
                        if (typeof polar == 'undefined' 
                            || serie.data[0].value.length <= dataIndex
                        ) {
                            return;
                        }
                        var polarIndex = serie.polarIndex || 0;
                        var vector = polar.getVector(polarIndex, dataIndex, 'max');
                        _event = {
                            zrenderX : vector[0],
                            zrenderY : vector[1]
                        };
                        _showPolarTrigger(
                            polarIndex, 
                            dataIndex
                        );
                        break;
                }
            }
            else {
                // item trigger
                var shapeList = chart.shapeList;
                var x;
                var y;
                switch (chart.type) {
                    case ecConfig.CHART_TYPE_LINE :
                    case ecConfig.CHART_TYPE_BAR :
                    case ecConfig.CHART_TYPE_K :
                    case ecConfig.CHART_TYPE_SCATTER :
                        var dataIndex = params.dataIndex;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (ecData.get(shapeList[i], 'seriesIndex') == seriesIndex
                                && ecData.get(shapeList[i], 'dataIndex') == dataIndex
                            ) {
                                _curTarget = shapeList[i];
                                x = shapeList[i].style.x;
                                y = chart.type != ecConfig.CHART_TYPE_K 
                                    ? shapeList[i].style.y : shapeList[i].style.y[0];
                                break;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_RADAR :
                        var dataIndex = params.dataIndex;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].shape == 'polygon'
                                && ecData.get(shapeList[i], 'seriesIndex') == seriesIndex
                                && ecData.get(shapeList[i], 'dataIndex') == dataIndex
                            ) {
                                _curTarget = shapeList[i];
                                var vector = polar.getCenter(serie.polarIndex || 0);
                                x = vector[0];
                                y = vector[1];
                                break;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_PIE :
                        var name = params.name;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].shape == 'sector'
                                && ecData.get(shapeList[i], 'seriesIndex') == seriesIndex
                                && ecData.get(shapeList[i], 'name') == name
                            ) {
                                _curTarget = shapeList[i];
                                var style = _curTarget.style;
                                var midAngle = (style.startAngle + style.endAngle) 
                                                / 2 * Math.PI / 180;
                                x = _curTarget.style.x + Math.cos(midAngle) * style.r / 1.5;
                                y = _curTarget.style.y - Math.sin(midAngle) * style.r / 1.5;
                                break;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_MAP :
                        var name = params.name;
                        var mapType = serie.mapType;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].shape == 'text'
                                && shapeList[i]._mapType == mapType
                                && shapeList[i].style._text == name
                            ) {
                                _curTarget = shapeList[i];
                                x = _curTarget.style.x + _curTarget.position[0];
                                y = _curTarget.style.y + _curTarget.position[1];
                                break;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_CHORD:
                        var name = params.name;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].shape == 'sector'
                                && ecData.get(shapeList[i], 'name') == name
                            ) {
                                _curTarget = shapeList[i];
                                var style = _curTarget.style;
                                var midAngle = (style.startAngle + style.endAngle) 
                                                / 2 * Math.PI / 180;
                                x = _curTarget.style.x + Math.cos(midAngle) * (style.r - 2);
                                y = _curTarget.style.y - Math.sin(midAngle) * (style.r - 2);
                                zr.trigger(
                                    zrConfig.EVENT.MOUSEMOVE,
                                    {
                                        zrenderX : x,
                                        zrenderY : y
                                    }
                                );
                                return;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_FORCE:
                        var name = params.name;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].shape == 'circle'
                                && ecData.get(shapeList[i], 'name') == name
                            ) {
                                _curTarget = shapeList[i];
                                x = _curTarget.position[0];
                                y = _curTarget.position[1];
                                break;
                            }
                        }
                        break;
                }
                if (typeof x != 'undefined' && typeof y != 'undefined') {
                    _event = {
                        zrenderX : x,
                        zrenderY : y
                    };
                    zr.addHoverShape(_curTarget);
                    zr.refreshHover();
                    _showItemTrigger();
                }
            }
        }
        
        /**
         * 关闭，公开接口 
         */
        function hideTip() {
            _hide();
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
                if (self.query(series[i], 'tooltip.trigger') == 'axis') {
                    _needAxisTrigger = true;
                    break;
                }
            }
            
            _showDelay = option.tooltip.showDelay;
            _hideDelay = option.tooltip.hideDelay;
            _defaultCssText = _style(option.tooltip);
            _tDom.style.position = 'absolute';  // 不是多余的，别删！
            self.hasAppend = false;
            _setSelectedMap();
            
            _axisLineWidth = option.tooltip.axisPointer.lineStyle.width;
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
                _setSelectedMap();
                _axisLineWidth = option.tooltip.axisPointer.lineStyle.width;
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
        
        /**
         * html转码的方法
         */
        function _encodeHTML(source) {
            return String(source)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
        }
        
        zr.on(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
        zr.on(zrConfig.EVENT.GLOBALOUT, _onglobalout);

        // 重载基类方法
        self.dispose = dispose;

        self.init = init;
        self.refresh = refresh;
        self.resize = resize;
        self.setComponent = setComponent;
        self.ontooltipHover = ontooltipHover;
        self.ondragend = ondragend;
        self.onlegendSelected = onlegendSelected;
        self.showTip = showTip;
        self.hideTip = hideTip;
        init(option, dom);
    }

    require('../component').define('tooltip', Tooltip);

    return Tooltip;
});