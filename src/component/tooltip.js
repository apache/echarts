/**
 * echarts组件：提示框
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var Base = require('./base');
    
    // 图形依赖
    var LineShape = require('zrender/shape/Line');
    var RectangleShape = require('zrender/shape/Rectangle');
    var rectangleInstance = new RectangleShape({});
    
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var zrConfig = require('zrender/config');
    var zrEvent = require('zrender/tool/event');
    var zrArea = require('zrender/tool/area');
    var zrColor = require('zrender/tool/color');
    var zrUtil = require('zrender/tool/util');
    var zrShapeBase = require('zrender/shape/Base');

    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 提示框参数
     * @param {HtmlElement} dom 目标对象
     * @param {ECharts} myChart 当前图表实例
     */
    function Tooltip(ecTheme, messageCenter, zr, option, dom, myChart) {
        Base.call(this, ecTheme, zr, option);
        
        this.messageCenter = messageCenter;
        this.dom = dom;
        this.myChart = myChart;
        
        var self = this;
        self._onmousemove = function (param) {
            return self.__onmousemove(param);
        };
        self._onglobalout = function (param) {
            return self.__onglobalout(param);
        };
        
        this.zr.on(zrConfig.EVENT.MOUSEMOVE, self._onmousemove);
        this.zr.on(zrConfig.EVENT.GLOBALOUT, self._onglobalout);

        self._hide = function (param) {
            return self.__hide(param);
        };
        self._tryShow = function(param) {
            return self.__tryShow(param);
        };
        self._refixed = function(param) {
            return self.__refixed(param);
        };
        
        this.init(option);
    }
    
    Tooltip.prototype = {
        type : ecConfig.COMPONENT_TYPE_TOOLTIP,
        // 通用样式
        _gCssText : 'position:absolute;'
                        + 'display:block;'
                        + 'border-style:solid;'
                        + 'white-space:nowrap;',
        /**
         * 根据配置设置dom样式
         */
        _style : function (opt) {
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
                padding = this.reformCssArray(padding);
                cssText.push(
                    'padding:' + padding[0] + 'px '
                               + padding[1] + 'px '
                               + padding[2] + 'px '
                               + padding[3] + 'px'
                );
            }

            cssText = cssText.join(';') + ';';

            return cssText;
        },
        
        __hide : function () {
            if (this._tDom) {
                this._tDom.style.display = 'none';
            }
            var needRefresh = false;
            if (!this._axisLineShape.invisible) {
                this._axisLineShape.invisible = true;
                this.zr.modShape(this._axisLineShape.id);
                needRefresh = true;
            }
            if (!this._axisShadowShape.invisible) {
                this._axisShadowShape.invisible = true;
                this.zr.modShape(this._axisShadowShape.id);
                needRefresh = true;
            }
            if (this._lastTipShape && this._lastTipShape.tipShape.length > 0) {
                this.zr.delShape(this._lastTipShape.tipShape);
                this._lastTipShape = false;
            }
            needRefresh && this.zr.refresh(); 
        },
        
        _show : function (x, y, specialCssText) {
            var domHeight = this._tDom.offsetHeight;
            var domWidth = this._tDom.offsetWidth;
            if (x + domWidth > this._zrWidth) {
                // 太靠右
                //x = this._zrWidth - domWidth;
                x -= (domWidth + 40);
            }
            if (y + domHeight > this._zrHeight) {
                // 太靠下
                //y = this._zrHeight - domHeight;
                y -= (domHeight - 20);
            }
            if (y < 20) {
                y = 0;
            }
            this._tDom.style.cssText = this._gCssText
                                  + this._defaultCssText
                                  + (specialCssText ? specialCssText : '')
                                  + 'left:' + x + 'px;top:' + y + 'px;';
            
            if (domHeight < 10 || domWidth < 10) {
                // this._zrWidth - x < 100 || this._zrHeight - y < 100
                setTimeout(this._refixed, 20);
            }
        },
        
        __refixed : function () {
            if (this._tDom) {
                var cssText = '';
                var domHeight = this._tDom.offsetHeight;
                var domWidth = this._tDom.offsetWidth;
                if (this._tDom.offsetLeft + domWidth > this._zrWidth) {
                    cssText += 'left:' + (this._zrWidth - domWidth - 20) + 'px;';
                }
                if (this._tDom.offsetTop + domHeight > this._zrHeight) {
                    cssText += 'top:' + (this._zrHeight - domHeight - 10) + 'px;';
                }
                if (cssText !== '') {
                    this._tDom.style.cssText += cssText;
                }
            }
        },
        
        __tryShow : function () {
            var needShow;
            var trigger;
            if (!this._curTarget) {
                // 坐标轴事件
                this._findPolarTrigger() || this._findAxisTrigger();
            }
            else {
                // 数据项事件
                if (this._curTarget._type == 'island' && option.tooltip.show) {
                    this._showItemTrigger();
                    return;
                }
                var serie = ecData.get(this._curTarget, 'series');
                var data = ecData.get(this._curTarget, 'data');
                needShow = this.deepQuery(
                    [data, serie, option],
                    'tooltip.show'
                );
                if (typeof serie == 'undefined'
                    || typeof data == 'undefined'
                    || needShow === false
                ) {
                    // 不响应tooltip的数据对象延时隐藏
                    clearTimeout(this._hidingTicket);
                    clearTimeout(this._showingTicket);
                    this._hidingTicket = setTimeout(this._hide, this._hideDelay);
                }
                else {
                    trigger = this.deepQuery(
                        [data, serie, option],
                        'tooltip.trigger'
                    );
                    trigger == 'axis'
                               ? this._showAxisTrigger(
                                     serie.xAxisIndex, serie.yAxisIndex,
                                     ecData.get(this._curTarget, 'dataIndex')
                                 )
                               : this._showItemTrigger();
                }
            }
        },

        /**
         * 直角系 
         */
        _findAxisTrigger : function () {
            if (!this.xAxis || !this.yAxis) {
                this._hidingTicket = setTimeout(this._hide, this._hideDelay);
                return;
            }
            var series = this.option.series;
            var xAxisIndex;
            var yAxisIndex;
            for (var i = 0, l = series.length; i < l; i++) {
                // 找到第一个axis触发tooltip的系列
                if (this.deepQuery(
                        [series[i], this.option], 'tooltip.trigger'
                    ) == 'axis'
                ) {
                    xAxisIndex = series[i].xAxisIndex || 0;
                    yAxisIndex = series[i].yAxisIndex || 0;
                    if (this.xAxis.getAxis(xAxisIndex)
                        && this.xAxis.getAxis(xAxisIndex).type
                           == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        // 横轴为类目轴
                        this._showAxisTrigger(xAxisIndex, yAxisIndex,
                            this._getNearestDataIndex('x', this.xAxis.getAxis(xAxisIndex))
                        );
                        return;
                    } 
                    else if (this.yAxis.getAxis(yAxisIndex)
                             && this.yAxis.getAxis(yAxisIndex).type
                                == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        // 纵轴为类目轴
                        this._showAxisTrigger(xAxisIndex, yAxisIndex,
                            this._getNearestDataIndex('y', this.yAxis.getAxis(yAxisIndex))
                        );
                        return;
                    }
                }
            }
        },
        
        /**
         * 极坐标 
         */
        _findPolarTrigger : function () {
            if (!this.polar) {
                return false;
            }
            var x = zrEvent.getX(this._event);
            var y = zrEvent.getY(this._event);
            var polarIndex = this.polar.getNearestIndex([x, y]);
            var valueIndex;
            if (polarIndex) {
                valueIndex = polarIndex.valueIndex;
                polarIndex = polarIndex.polarIndex;
            }
            else {
                polarIndex = -1;
            }
            
            if (polarIndex != -1) {
                return this._showPolarTrigger(polarIndex, valueIndex);
            }
            
            return false;
        },
        
        /**
         * 根据坐标轴事件带的属性获取最近的axisDataIndex
         */
        _getNearestDataIndex : function (direction, categoryAxis) {
            var dataIndex = -1;
            var x = zrEvent.getX(this._event);
            var y = zrEvent.getY(this._event);
            if (direction == 'x') {
                // 横轴为类目轴
                var left;
                var right;
                var xEnd = this.grid.getXend();
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
                var yStart = this.grid.getY();
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
        },

        /**
         * 直角系 
         */
        _showAxisTrigger : function (xAxisIndex, yAxisIndex, dataIndex) {
            !this._event.connectTrigger && this.messageCenter.dispatch(
                ecConfig.EVENT.TOOLTIP_IN_GRID,
                this._event
            );
            if (typeof this.xAxis == 'undefined'
                || typeof this.yAxis == 'undefined'
                || typeof xAxisIndex == 'undefined'
                || typeof yAxisIndex == 'undefined'
                || dataIndex < 0
            ) {
                // 不响应tooltip的数据对象延时隐藏
                clearTimeout(this._hidingTicket);
                clearTimeout(this._showingTicket);
                this._hidingTicket = setTimeout(this._hide, this._hideDelay);
                return;
            }
            var series = this.option.series;
            var seriesArray = [];
            var seriesIndex = [];
            var categoryAxis;
            var x;
            var y;

            var formatter;
            var showContent;
            var specialCssText = '';
            if (this.option.tooltip.trigger == 'axis') {
                if (this.option.tooltip.show === false) {
                    return;
                }
                formatter = this.option.tooltip.formatter;
            }

            if (xAxisIndex != -1
                && this.xAxis.getAxis(xAxisIndex).type
                   == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
            ) {
                // 横轴为类目轴，找到所有用这条横轴并且axis触发的系列数据
                categoryAxis = this.xAxis.getAxis(xAxisIndex);
                for (var i = 0, l = series.length; i < l; i++) {
                    if (!this._isSelected(series[i].name)) {
                        continue;
                    }
                    if (series[i].xAxisIndex == xAxisIndex
                        && this.deepQuery(
                               [series[i], this.option], 'tooltip.trigger'
                           ) == 'axis'
                    ) {
                        showContent = this.query(
                            series[i],
                            'tooltip.showContent'
                        ) || showContent;
                        formatter = this.query(
                            series[i],
                            'tooltip.formatter'
                        ) || formatter;
                        specialCssText += this._style(this.query(
                                              series[i], 'tooltip'
                                          ));
                        seriesArray.push(series[i]);
                        seriesIndex.push(i);
                    }
                }
                // 寻找高亮元素
                this.messageCenter.dispatch(
                    ecConfig.EVENT.TOOLTIP_HOVER,
                    this._event,
                    {
                        seriesIndex : seriesIndex,
                        dataIndex : this.component.dataZoom
                                    ? this.component.dataZoom.getRealDataIndex(
                                        seriesIndex,
                                        dataIndex
                                      )
                                    : dataIndex
                    }
                );
                y = zrEvent.getY(this._event) + 10;
                x = this.subPixelOptimize(
                    categoryAxis.getCoordByIndex(dataIndex),
                    this._axisLineWidth
                );
                this._styleAxisPointer(
                    seriesArray,
                    x, this.grid.getY(), 
                    x, this.grid.getYend(),
                    categoryAxis.getGap()
                );
                x += 10;
            }
            else if (yAxisIndex != -1
                     && this.yAxis.getAxis(yAxisIndex).type
                        == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
            ) {
                // 纵轴为类目轴，找到所有用这条纵轴并且axis触发的系列数据
                categoryAxis = this.yAxis.getAxis(yAxisIndex);
                for (var i = 0, l = series.length; i < l; i++) {
                    if (!this._isSelected(series[i].name)) {
                        continue;
                    }
                    if (series[i].yAxisIndex == yAxisIndex
                        && this.deepQuery(
                               [series[i], this.option], 'tooltip.trigger'
                           ) == 'axis'
                    ) {
                        showContent = this.query(
                            series[i],
                            'tooltip.showContent'
                        ) || showContent;
                        formatter = this.query(
                            series[i],
                            'tooltip.formatter'
                        ) || formatter;
                        specialCssText += this._style(this.query(
                                              series[i], 'tooltip'
                                          ));
                        seriesArray.push(series[i]);
                        seriesIndex.push(i);
                    }
                }
                // 寻找高亮元素
                this.messageCenter.dispatch(
                    ecConfig.EVENT.TOOLTIP_HOVER,
                    this._event,
                    {
                        seriesIndex : seriesIndex,
                        dataIndex : this.component.dataZoom
                                    ? this.component.dataZoom.getRealDataIndex(
                                        seriesIndex,
                                        dataIndex
                                      )
                                    : dataIndex
                    }
                );
                x = zrEvent.getX(this._event) + 10;
                y = this.subPixelOptimize(
                    categoryAxis.getCoordByIndex(dataIndex),
                    this._axisLineWidth
                );
                this._styleAxisPointer(
                    seriesArray,
                    this.grid.getX(), y, 
                    this.grid.getXend(), y,
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
                    this._curTicket = 'axis:' + dataIndex;
                    this._tDom.innerHTML = formatter(
                        params, this._curTicket, this._setContent
                    );
                }
                else if (typeof formatter == 'string') {
                    this._curTicket = NaN;
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}');
                    for (var i = 0, l = seriesArray.length; i < l; i++) {
                        formatter = formatter.replace(
                            '{a' + i + '}',
                            this._encodeHTML(seriesArray[i].name || '')
                        );
                        formatter = formatter.replace(
                            '{b' + i + '}',
                            this._encodeHTML(categoryAxis.getNameByIndex(dataIndex))
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
                            ? data : this.numAddCommas(data)
                        );
                    }
                    this._tDom.innerHTML = formatter;
                }
                else {
                    this._curTicket = NaN;
                    formatter = this._encodeHTML(
                        categoryAxis.getNameByIndex(dataIndex)
                    );

                    for (var i = 0, l = seriesArray.length; i < l; i++) {
                        formatter += '<br/>' 
                                     + this._encodeHTML(seriesArray[i].name || '')
                                     + ' : ';
                        data = seriesArray[i].data[dataIndex];
                        data = typeof data != 'undefined'
                               ? (typeof data.value != 'undefined'
                                   ? data.value
                                   : data)
                               : '-';
                        formatter += data instanceof Array 
                                     ? data : this.numAddCommas(data);
                    }
                    this._tDom.innerHTML = formatter;
                }

                if (showContent === false || !this.option.tooltip.showContent) {
                    // 只用tooltip的行为，不显示主体
                    return;
                }
                
                if (!this.hasAppend) {
                    this._tDom.style.left = this._zrWidth / 2 + 'px';
                    this._tDom.style.top = this._zrHeight / 2 + 'px';
                    this.dom.firstChild.appendChild(this._tDom);
                    this.hasAppend = true;
                }
                this._show(x, y, specialCssText);
            }
        },
        
        /**
         * 极坐标 
         */
        _showPolarTrigger : function (polarIndex, dataIndex) {
            if (typeof this.polar == 'undefined'
                || typeof polarIndex == 'undefined'
                || typeof dataIndex == 'undefined'
                || dataIndex < 0
            ) {
                return false;
            }
            var series = this.option.series;
            var seriesArray = [];

            var formatter;
            var showContent;
            var specialCssText = '';
            if (this.option.tooltip.trigger == 'axis') {
                if (this.option.tooltip.show === false) {
                    return false;
                }
                formatter = this.option.tooltip.formatter;
            }
            var indicatorName = 
                    this.option.polar[polarIndex].indicator[dataIndex].text;

            // 找到所有用这个极坐标并且axis触发的系列数据
            for (var i = 0, l = series.length; i < l; i++) {
                if (!this._isSelected(series[i].name)) {
                    continue;
                }
                if (series[i].polarIndex == polarIndex
                    && this.deepQuery(
                           [series[i], this.option], 'tooltip.trigger'
                       ) == 'axis'
                ) {
                    showContent = this.query(
                        series[i],
                        'tooltip.showContent'
                    ) || showContent;
                    formatter = this.query(
                        series[i],
                        'tooltip.formatter'
                    ) || formatter;
                    specialCssText += this._style(this.query(
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
                        if (!this._isSelected(data.name)) {
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
                    this._curTicket = 'axis:' + dataIndex;
                    this._tDom.innerHTML = formatter(
                        params, this._curTicket, this._setContent
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
                            this._encodeHTML(params[i][0])
                        );
                        formatter = formatter.replace(
                            '{b' + i + '}',
                            this._encodeHTML(params[i][1])
                        );
                        formatter = formatter.replace(
                            '{c' + i + '}',
                            this.numAddCommas(params[i][2])
                        );
                        formatter = formatter.replace(
                            '{d' + i + '}',
                            this._encodeHTML(params[i][3])
                        );
                    }
                    this._tDom.innerHTML = formatter;
                }
                else {
                    formatter = this._encodeHTML(params[0][1]) + '<br/>' 
                                + this._encodeHTML(params[0][3]) + ' : ' 
                                + this.numAddCommas(params[0][2]);
                    for (var i = 1, l = params.length; i < l; i++) {
                        formatter += '<br/>' + this._encodeHTML(params[i][1]) 
                                     + '<br/>';
                        formatter += this._encodeHTML(params[i][3]) + ' : ' 
                                     + this.numAddCommas(params[i][2]);
                    }
                    this._tDom.innerHTML = formatter;
                }

                if (showContent === false || !this.option.tooltip.showContent) {
                    // 只用tooltip的行为，不显示主体
                    return;
                }
                
                if (!this.hasAppend) {
                    this._tDom.style.left = this._zrWidth / 2 + 'px';
                    this._tDom.style.top = this._zrHeight / 2 + 'px';
                    this.dom.firstChild.appendChild(this._tDom);
                    this.hasAppend = true;
                }
                this._show(
                    zrEvent.getX(this._event), 
                    zrEvent.getY(this._event), 
                    specialCssText
                );
                return true;
            }
        },
        
        _showItemTrigger : function () {
            var serie = ecData.get(this._curTarget, 'series');
            var data = ecData.get(this._curTarget, 'data');
            var name = ecData.get(this._curTarget, 'name');
            var value = ecData.get(this._curTarget, 'value');
            var special = ecData.get(this._curTarget, 'special');
            var special2 = ecData.get(this._curTarget, 'special2');
            // 从低优先级往上找到trigger为item的formatter和样式
            var formatter;
            var showContent;
            var specialCssText = '';
            var indicator;
            var html = '';
            if (this._curTarget._type != 'island') {
                // 全局
                if (this.option.tooltip.trigger == 'item') {
                    formatter = this.option.tooltip.formatter;
                }
                // 系列
                if (this.query(serie, 'tooltip.trigger') == 'item') {
                    showContent = this.query(
                                      serie, 'tooltip.showContent'
                                  ) || showContent;
                    formatter = this.query(
                                    serie, 'tooltip.formatter'
                                ) || formatter;
                    specialCssText += this._style(this.query(
                                          serie, 'tooltip'
                                      ));
                }
                // 数据项
                showContent = this.query(
                                  data, 'tooltip.showContent'
                              ) || showContent;
                formatter = this.query(
                                data, 'tooltip.formatter'
                            ) || formatter;
                specialCssText += this._style(this.query(data, 'tooltip'));
            }
            else {
                showContent = this.deepQuery(
                    [data, serie, this.option],
                    'tooltip.showContent'
                );
                formatter = this.deepQuery(
                    [data, serie, this.option],
                    'tooltip.islandFormatter'
                );
            }

            if (typeof formatter == 'function') {
                this._curTicket = (serie.name || '')
                             + ':'
                             + ecData.get(this._curTarget, 'dataIndex');
                this._tDom.innerHTML = formatter(
                    [
                        serie.name || '',
                        name,
                        value,
                        special,
                        special2
                    ],
                    this._curTicket,
                    this._setContent
                );
            }
            else if (typeof formatter == 'string') {
                this._curTicket = NaN;
                formatter = formatter.replace('{a}','{a0}')
                                     .replace('{b}','{b0}')
                                     .replace('{c}','{c0}');
                formatter = formatter.replace(
                                          '{a0}', this._encodeHTML(serie.name || '')
                                      )
                                     .replace('{b0}', this._encodeHTML(name))
                                     .replace(
                                         '{c0}', 
                                         value instanceof Array
                                         ? value : this.numAddCommas(value)
                                     );

                formatter = formatter.replace('{d}','{d0}')
                                     .replace('{d0}', special || '');
                formatter = formatter.replace('{e}','{e0}')
                    .replace('{e0}', ecData.get(this._curTarget, 'special2') || '');

                this._tDom.innerHTML = formatter;
            }
            else {
                this._curTicket = NaN;
                if (serie.type == ecConfig.CHART_TYPE_SCATTER) {
                    this._tDom.innerHTML = (typeof serie.name != 'undefined'
                                          ? (this._encodeHTML(serie.name) + '<br/>')
                                          : ''
                                      ) 
                                      + (name === '' 
                                            ? '' : (this._encodeHTML(name) + ' : ')
                                      ) 
                                      + value 
                                      + (typeof special == 'undefined'
                                          ? ''
                                          : (' (' + special + ')'));
                }
                else if (serie.type == ecConfig.CHART_TYPE_RADAR && special) {
                    indicator = special;
                    html += this._encodeHTML(
                        name === '' ? (serie.name || '') : name
                    );
                    html += html === '' ? '' : '<br />';
                    for (var i = 0 ; i < indicator.length; i ++) {
                        html += this._encodeHTML(indicator[i].text) + ' : ' 
                                + this.numAddCommas(value[i]) + '<br />';
                    }
                    this._tDom.innerHTML = html;
                }
                else if (serie.type == ecConfig.CHART_TYPE_CHORD) {
                    if (typeof special2 == 'undefined') {
                        // 外环上
                        this._tDom.innerHTML = this._encodeHTML(name) + ' (' 
                                          + this.numAddCommas(value) + ')';
                    }
                    else {
                        var name1 = this._encodeHTML(name);
                        var name2 = this._encodeHTML(special);
                        // 内部弦上
                        this._tDom.innerHTML = (typeof serie.name != 'undefined'
                                          ? (this._encodeHTML(serie.name) + '<br/>')
                                          : '')
                              + name1 + ' -> ' + name2 
                              + ' (' + this.numAddCommas(value) + ')'
                              + '<br />'
                              + name2 + ' -> ' + name1
                              + ' (' + this.numAddCommas(special2) + ')';
                    }
                }
                else {
                    this._tDom.innerHTML = (typeof serie.name != 'undefined'
                                      ? (this._encodeHTML(serie.name) + '<br/>')
                                      : '')
                                      + this._encodeHTML(name) + ' : ' 
                                      + this.numAddCommas(value) +
                                      (typeof special == 'undefined'
                                      ? ''
                                      : (' ('+ this.numAddCommas(special) +')')
                                      );
                }
            }

            if (!this._axisLineShape.invisible) {
                this._axisLineShape.invisible = true;
                this.zr.modShape(this._axisLineShape.id);
                this.zr.refresh();
            }
            
            if (showContent === false || !this.option.tooltip.showContent) {
                // 只用tooltip的行为，不显示主体
                return;
            }
            
            if (!this.hasAppend) {
                this._tDom.style.left = this._zrWidth / 2 + 'px';
                this._tDom.style.top = this._zrHeight / 2 + 'px';
                this.dom.firstChild.appendChild(this._tDom);
                this.hasAppend = true;
            }

            this._show(
                zrEvent.getX(this._event) + 20,
                zrEvent.getY(this._event) - 20,
                specialCssText
            );
        },

        /**
         * 设置坐标轴指示器样式 
         */
        _styleAxisPointer : function (seriesArray, xStart, yStart, xEnd, yEnd, gap) {
            if (seriesArray.length > 0) {
                var queryTarget;
                var curType;
                var axisPointer = this.option.tooltip.axisPointer;
                var pointType = axisPointer.type;
                var lineColor = axisPointer.lineStyle.color;
                var lineWidth = axisPointer.lineStyle.width;
                var lineType = axisPointer.lineStyle.type;
                var areaSize = axisPointer.areaStyle.size;
                var areaColor = axisPointer.areaStyle.color;
                
                for (var i = 0, l = seriesArray.length; i < l; i++) {
                    if (this.deepQuery(
                           [seriesArray[i], this.option], 'tooltip.trigger'
                       ) == 'axis'
                    ) {
                        queryTarget = seriesArray[i];
                        curType = this.query(
                            queryTarget,
                            'tooltip.axisPointer.type'
                        );
                        pointType = curType || pointType; 
                        if (curType == 'line') {
                            lineColor = this.query(
                                queryTarget,
                                'tooltip.axisPointer.lineStyle.color'
                            ) || lineColor;
                            lineWidth = this.query(
                                queryTarget,
                                'tooltip.axisPointer.lineStyle.width'
                            ) || lineWidth;
                            lineType = this.query(
                                queryTarget,
                                'tooltip.axisPointer.lineStyle.type'
                            ) || lineType;
                        }
                        else if (curType == 'shadow') {
                            areaSize = this.query(
                                queryTarget,
                                'tooltip.axisPointer.areaStyle.size'
                            ) || areaSize;
                            areaColor = this.query(
                                queryTarget,
                                'tooltip.axisPointer.areaStyle.color'
                            ) || areaColor;
                        }
                    }
                }
                
                if (pointType == 'line') {
                    this._axisLineShape.style = {
                        xStart : xStart,
                        yStart : yStart,
                        xEnd : xEnd,
                        yEnd : yEnd,
                        strokeColor : lineColor,
                        lineWidth : lineWidth,
                        lineType : lineType
                    };
                    this._axisLineShape.invisible = false;
                    this.zr.modShape(this._axisLineShape.id);
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
                        if (Math.abs(this.grid.getX() - xStart) < 2) {
                            // 最左边
                            lineWidth /= 2;
                            xStart = xEnd = xEnd + lineWidth / 2;
                        }
                        else if (Math.abs(this.grid.getXend() - xStart) < 2) {
                            // 最右边
                            lineWidth /= 2;
                            xStart = xEnd = xEnd - lineWidth / 2;
                        }
                    }
                    else if (yStart == yEnd) {
                        // 横向
                        if (Math.abs(this.grid.getY() - yStart) < 2) {
                            // 最上边
                            lineWidth /= 2;
                            yStart = yEnd = yEnd + lineWidth / 2;
                        }
                        else if (Math.abs(this.grid.getYend() - yStart) < 2) {
                            // 最右边
                            lineWidth /= 2;
                            yStart = yEnd = yEnd - lineWidth / 2;
                        }
                    }
                    this._axisShadowShape.style = {
                        xStart : xStart,
                        yStart : yStart,
                        xEnd : xEnd,
                        yEnd : yEnd,
                        strokeColor : areaColor,
                        lineWidth : lineWidth
                    };
                    this._axisShadowShape.invisible = false;
                    this.zr.modShape(this._axisShadowShape.id);
                }
                this.zr.refresh();
            }
        },

        __onmousemove : function (param) {
            clearTimeout(this._hidingTicket);
            clearTimeout(this._showingTicket);
            var target = param.target;
            var mx = zrEvent.getX(param.event);
            var my = zrEvent.getY(param.event);
            if (!target) {
                // 判断是否落到直角系里，axis触发的tooltip
                this._curTarget = false;
                this._event = param.event;
                this._event._target = this._event.target || this._event.toElement;
                this._event.zrenderX = mx;
                this._event.zrenderY = my;
                if (this._needAxisTrigger 
                    && this.grid 
                    && zrArea.isInside(
                        rectangleInstance,
                        this.grid.getArea(),
                        mx,
                        my
                    )
                ) {
                    this._showingTicket = setTimeout(this._tryShow, this._showDelay);
                }
                else if (this._needAxisTrigger 
                        && this.polar 
                        && this.polar.isInside([mx, my]) != -1
                ) {
                    this._showingTicket = setTimeout(this._tryShow, this._showDelay);
                }
                else {
                    !this._event.connectTrigger && this.messageCenter.dispatch(
                        ecConfig.EVENT.TOOLTIP_OUT_GRID,
                        this._event
                    );
                    this._hidingTicket = setTimeout(this._hide, this._hideDelay);
                }
            }
            else {
                this._curTarget = target;
                this._event = param.event;
                this._event._target = this._event.target || this._event.toElement;
                this._event.zrenderX = mx;
                this._event.zrenderY = my;
                var polarIndex;
                if (this._needAxisTrigger 
                    && this.polar 
                    && (polarIndex = this.polar.isInside([mx, my])) != -1
                ) {
                    // 看用这个polar的系列数据是否是axis触发，如果是设置_curTarget为nul
                    var series = this.option.series;
                    for (var i = 0, l = series.length; i < l; i++) {
                        if (series[i].polarIndex == polarIndex
                            && this.deepQuery(
                                   [series[i], this.option], 'tooltip.trigger'
                               ) == 'axis'
                        ) {
                            this._curTarget = null;
                            break;
                        }
                    }
                   
                }
                this._showingTicket = setTimeout(this._tryShow, this._showDelay);
            }
        },

        /**
         * zrender事件响应：鼠标离开绘图区域
         */
        __onglobalout : function () {
            clearTimeout(this._hidingTicket);
            clearTimeout(this._showingTicket);
            this._hidingTicket = setTimeout(this._hide, this._hideDelay);
        },
        
        /**
         * 异步回调填充内容
         */
        _setContent : function (ticket, content) {
            if (!this._tDom) {
                return;
            }
            if (ticket == this._curTicket) {
                this._tDom.innerHTML = content;
            }
            
            setTimeout(this._refixed, 20);
        },

        setComponent : function () {
            this.component = this.myChart.component;
            this.grid = this.component.grid;
            this.xAxis = this.component.xAxis;
            this.yAxis = this.component.yAxis;
            this.polar = this.component.polar;
        },
        
        ontooltipHover : function (param, tipShape) {
            if (!this._lastTipShape // 不存在或者存在但dataIndex发生变化才需要重绘
                || (this._lastTipShape && this._lastTipShape.dataIndex != param.dataIndex)
            ) {
                if (this._lastTipShape && this._lastTipShape.tipShape.length > 0) {
                    this.zr.delShape(this._lastTipShape.tipShape);
                }
                for (var i = 0, l = tipShape.length; i < l; i++) {
                    tipShape[i].zlevel = this._zlevelBase;
                    tipShape[i].style = zrShapeBase.prototype.getHighlightStyle(
                        tipShape[i].style,
                        tipShape[i].highlightStyle
                    );
                    tipShape[i].draggable = false;
                    tipShape[i].hoverable = false;
                    tipShape[i].clickable = false;
                    tipShape[i].ondragend = null;
                    tipShape[i].ondragover = null;
                    tipShape[i].ondrop = null;
                    this.zr.addShape(tipShape[i]);
                }
                this._lastTipShape = {
                    dataIndex : param.dataIndex,
                    tipShape : tipShape
                };
            }
        },
        
        ondragend : function () {
            this._hide();
        },
        
        /**
         * 图例选择
         */
        onlegendSelected : function (param) {
            this._selectedMap = param.selected;
        },
        
        _setSelectedMap : function () {
            if (this.option.legend && this.option.legend.selected) {
                this._selectedMap = this.option.legend.selected;
            }
            else {
                this._selectedMap = {};
            }
        },
        
        _isSelected : function (itemName) {
            if (typeof this._selectedMap[itemName] != 'undefined') {
                return this._selectedMap[itemName];
            }
            else {
                return true; // 没在legend里定义的都为true啊~
            }
        },

        /**
         * 模拟tooltip hover方法
         * {object} params  参数
         *          {seriesIndex: 0, seriesName:'', dataInex:0} line、bar、scatter、k、radar
         *          {seriesIndex: 0, seriesName:'', name:''} map、pie、chord
         */
        showTip : function (params) {
            if (!params) {
                return;
            }
            
            var seriesIndex;
            var series = this.option.series;
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
            var isAxisTrigger = this.deepQuery(
                                    [serie, this.option], 'tooltip.trigger'
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
                        if (typeof this.xAxis == 'undefined' 
                            || typeof this.yAxis == 'undefined'
                            || serie.data.length <= dataIndex
                        ) {
                            return;
                        }
                        var xAxisIndex = serie.xAxisIndex || 0;
                        var yAxisIndex = serie.yAxisIndex || 0;
                        if (this.xAxis.getAxis(xAxisIndex).type 
                            == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                        ) {
                            // 横轴是类目
                            this._event = {
                                zrenderX : this.xAxis.getAxis(xAxisIndex).getCoordByIndex(dataIndex),
                                zrenderY : this.grid.getY() + (this.grid.getYend() - this.grid.getY()) / 4
                            };
                        }
                        else {
                            // 纵轴是类目
                            this._event = {
                                zrenderX : this.grid.getX() + (this.grid.getXend() - this.grid.getX()) / 4,
                                zrenderY : this.yAxis.getAxis(yAxisIndex).getCoordByIndex(dataIndex)
                            };
                        }
                        this._showAxisTrigger(
                            xAxisIndex, 
                            yAxisIndex,
                            dataIndex
                        );
                        break;
                    case ecConfig.CHART_TYPE_RADAR :
                        if (typeof this.polar == 'undefined' 
                            || serie.data[0].value.length <= dataIndex
                        ) {
                            return;
                        }
                        var polarIndex = serie.polarIndex || 0;
                        var vector = this.polar.getVector(polarIndex, dataIndex, 'max');
                        this._event = {
                            zrenderX : vector[0],
                            zrenderY : vector[1]
                        };
                        this._showPolarTrigger(
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
                                this._curTarget = shapeList[i];
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
                            if (shapeList[i].type == 'polygon'
                                && ecData.get(shapeList[i], 'seriesIndex') == seriesIndex
                                && ecData.get(shapeList[i], 'dataIndex') == dataIndex
                            ) {
                                this._curTarget = shapeList[i];
                                var vector = this.polar.getCenter(serie.polarIndex || 0);
                                x = vector[0];
                                y = vector[1];
                                break;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_PIE :
                        var name = params.name;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].type == 'sector'
                                && ecData.get(shapeList[i], 'seriesIndex') == seriesIndex
                                && ecData.get(shapeList[i], 'name') == name
                            ) {
                                this._curTarget = shapeList[i];
                                var style = this._curTarget.style;
                                var midAngle = (style.startAngle + style.endAngle) 
                                                / 2 * Math.PI / 180;
                                x = this._curTarget.style.x + Math.cos(midAngle) * style.r / 1.5;
                                y = this._curTarget.style.y - Math.sin(midAngle) * style.r / 1.5;
                                break;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_MAP :
                        var name = params.name;
                        var mapType = serie.mapType;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].type == 'text'
                                && shapeList[i]._mapType == mapType
                                && shapeList[i].style._text == name
                            ) {
                                this._curTarget = shapeList[i];
                                x = this._curTarget.style.x + this._curTarget.position[0];
                                y = this._curTarget.style.y + this._curTarget.position[1];
                                break;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_CHORD:
                        var name = params.name;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].type == 'sector'
                                && ecData.get(shapeList[i], 'name') == name
                            ) {
                                this._curTarget = shapeList[i];
                                var style = this._curTarget.style;
                                var midAngle = (style.startAngle + style.endAngle) 
                                                / 2 * Math.PI / 180;
                                x = this._curTarget.style.x + Math.cos(midAngle) * (style.r - 2);
                                y = this._curTarget.style.y - Math.sin(midAngle) * (style.r - 2);
                                this.zr.trigger(
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
                            if (shapeList[i].type == 'circle'
                                && ecData.get(shapeList[i], 'name') == name
                            ) {
                                this._curTarget = shapeList[i];
                                x = this._curTarget.position[0];
                                y = this._curTarget.position[1];
                                break;
                            }
                        }
                        break;
                }
                if (typeof x != 'undefined' && typeof y != 'undefined') {
                    this._event = {
                        zrenderX : x,
                        zrenderY : y
                    };
                    this.zr.addHoverShape(this._curTarget);
                    this.zr.refreshHover();
                    this._showItemTrigger();
                }
            }
        },
        
        /**
         * 关闭，公开接口 
         */
        hideTip : function () {
            this._hide();
        },
        
        init : function (newOption) {
            this._tDom = this._tDom || document.createElement('div');
            this._tDom.style.position = 'absolute';  // 不是多余的，别删！
            this.hasAppend = false;
            
            this._axisLineShape && this.zr.delShape(this._axisLineShape);
            this._axisLineShape = new LineShape({
                zlevel: this._zlevelBase,
                invisible : true,
                hoverable: false
            });
            this.zr.addShape(this._axisLineShape);
            
            this._axisShadowShape && this.zr.delShape(this._axisShadowShape);
            this._axisShadowShape = new LineShape({
                zlevel: 1,                      // grid上，chart下
                invisible : true,
                hoverable: false
            });
            this.zr.addShape(this._axisShadowShape);
            
            this.refresh(newOption);
        },
        
        /**
         * 刷新
         */
        refresh : function (newOption) {
            // this.component;
            // this.grid;
            // this.xAxis;
            // this.yAxis;
            // this.polar;
            // this._selectedMap;
            // this._defaultCssText;    // css样式缓存
            // this._needAxisTrigger;   // 坐标轴触发
            // this._curTarget;
            // this._event;
            // this._curTicket;         // 异步回调标识，用来区分多个请求
            
            // 缓存一些高宽数据
            this._zrHeight = this.zr.getHeight();
            this._zrWidth = this.zr.getWidth();
    
            this._lastTipShape = false;
            
            if (newOption) {
                this.option = newOption;
                this.option.tooltip = this.reformOption(this.option.tooltip);
                this.option.tooltip.textStyle = zrUtil.merge(
                    this.option.tooltip.textStyle,
                    this.ecTheme.textStyle
                );
                // 补全padding属性
                this.option.tooltip.padding = this.reformCssArray(
                    this.option.tooltip.padding
                );
    
                this._needAxisTrigger = false;
                if (this.option.tooltip.trigger == 'axis') {
                    this._needAxisTrigger = true;
                }
    
                var series = this.option.series;
                for (var i = 0, l = series.length; i < l; i++) {
                    if (this.query(series[i], 'tooltip.trigger') == 'axis') {
                        this._needAxisTrigger = true;
                        break;
                    }
                }
                // this._hidingTicket;
                // this._showingTicket;
                this._showDelay = this.option.tooltip.showDelay; // 显示延迟
                this._hideDelay = this.option.tooltip.hideDelay; // 隐藏延迟
                this._defaultCssText = this._style(this.option.tooltip);
                
                this._setSelectedMap();
                this._axisLineWidth = this.option.tooltip.axisPointer.lineStyle.width;
            }
        },

        /**
         * 释放后实例不可用，重载基类方法
         */
        dispose : function () {
            clearTimeout(this._hidingTicket);
            clearTimeout(this._showingTicket);
            this.zr.un(zrConfig.EVENT.MOUSEMOVE, self._onmousemove);
            this.zr.un(zrConfig.EVENT.GLOBALOUT, self._onglobalout);

            if (this.hasAppend) {
                this.dom.firstChild.removeChild(this._tDom);
            }
            this._tDom = null;

            // this.clear();
            this.shapeList = null;
        },
        
        /**
         * html转码的方法
         */
        _encodeHTML : function (source) {
            return String(source)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
        }
    };
    
    zrUtil.inherits(Tooltip, Base);
    
    require('../component').define('tooltip', Tooltip);

    return Tooltip;
});