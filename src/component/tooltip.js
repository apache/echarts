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
    var CrossShape = require('../util/shape/Cross');
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
    function Tooltip(ecTheme, messageCenter, zr, option, myChart) {
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);
        
        this.dom = myChart.dom;
        
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
        
        self._setContent = function(ticket, res) {
            return self.__setContent(ticket, res);
        };
        
        this._tDom = this._tDom || document.createElement('div');
        // 避免拖拽时页面选中的尴尬
        this._tDom.onselectstart = function() {
            return false;
        };
        this._tDom.style.position = 'absolute';  // 不是多余的，别删！
        this.hasAppend = false;
        
        this._axisLineShape && this.zr.delShape(this._axisLineShape.id);
        this._axisLineShape = new LineShape({
            zlevel: this._zlevelBase,
            invisible : true,
            hoverable: false
        });
        this.shapeList.push(this._axisLineShape);
        this.zr.addShape(this._axisLineShape);
        
        this._axisShadowShape && this.zr.delShape(this._axisShadowShape.id);
        this._axisShadowShape = new LineShape({
            zlevel: 1,                      // grid上，chart下
            invisible : true,
            hoverable: false
        });
        this.shapeList.push(this._axisShadowShape);
        this.zr.addShape(this._axisShadowShape);
        
        this._axisCrossShape && this.zr.delShape(this._axisCrossShape.id);
        this._axisCrossShape = new CrossShape({
            zlevel: this._zlevelBase,
            invisible : true,
            hoverable: false
        });
        this.shapeList.push(this._axisCrossShape);
        this.zr.addShape(this._axisCrossShape);
        
        this.showing = false;
        this.refresh(option);
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
            if (!this._axisCrossShape.invisible) {
                this._axisCrossShape.invisible = true;
                this.zr.modShape(this._axisCrossShape.id);
                needRefresh = true;
            }
            if (this._lastTipShape && this._lastTipShape.tipShape.length > 0) {
                this.zr.delShape(this._lastTipShape.tipShape);
                this._lastTipShape = false;
                this.shapeList.length = 2;
            }
            needRefresh && this.zr.refresh();
            this.showing = false;
        },
        
        _show : function (position, x, y, specialCssText) {
            var domHeight = this._tDom.offsetHeight;
            var domWidth = this._tDom.offsetWidth;
            if (position) {
                if (typeof position == 'function') {
                    position = position([x, y]);
                }
                if (position instanceof Array) {
                    x = position[0];
                    y = position[1];
                }
            }
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
            this.showing = true;
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
                if (this._curTarget._type == 'island' && this.option.tooltip.show) {
                    this._showItemTrigger();
                    return;
                }
                var serie = ecData.get(this._curTarget, 'series');
                var data = ecData.get(this._curTarget, 'data');
                needShow = this.deepQuery(
                    [data, serie, this.option],
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
                        [data, serie, this.option],
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
            if (!this.component.xAxis || !this.component.yAxis) {
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
                    if (this.component.xAxis.getAxis(xAxisIndex)
                        && this.component.xAxis.getAxis(xAxisIndex).type
                           == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        // 横轴为类目轴
                        this._showAxisTrigger(xAxisIndex, yAxisIndex,
                            this._getNearestDataIndex(
                                'x', this.component.xAxis.getAxis(xAxisIndex)
                            )
                        );
                        return;
                    } 
                    else if (this.component.yAxis.getAxis(yAxisIndex)
                             && this.component.yAxis.getAxis(yAxisIndex).type
                                == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        // 纵轴为类目轴
                        this._showAxisTrigger(xAxisIndex, yAxisIndex,
                            this._getNearestDataIndex(
                                'y', this.component.yAxis.getAxis(yAxisIndex)
                            )
                        );
                        return;
                    }
                    else {
                        // 双数值轴
                        this._showAxisTrigger(xAxisIndex, yAxisIndex, -1);
                        return;
                    }
                }
            }
            if (this.option.tooltip.axisPointer.type == 'cross') {
                this._showAxisTrigger(-1, -1, -1);
            }
        },
        
        /**
         * 极坐标 
         */
        _findPolarTrigger : function () {
            if (!this.component.polar) {
                return false;
            }
            var x = zrEvent.getX(this._event);
            var y = zrEvent.getY(this._event);
            var polarIndex = this.component.polar.getNearestIndex([x, y]);
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
                var xEnd = this.component.grid.getXend();
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
                var yStart = this.component.grid.getY();
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
                this._event,
                null,
                this.myChart
            );
            if (typeof this.component.xAxis == 'undefined'
                || typeof this.component.yAxis == 'undefined'
                || typeof xAxisIndex == 'undefined'
                || typeof yAxisIndex == 'undefined'
                // || dataIndex < 0
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
            var position;
            var showContent;
            var specialCssText = '';
            if (this.option.tooltip.trigger == 'axis') {
                if (this.option.tooltip.show === false) {
                    return;
                }
                formatter = this.option.tooltip.formatter;
                position = this.option.tooltip.position;
            }

            if (xAxisIndex != -1
                && this.component.xAxis.getAxis(xAxisIndex).type
                   == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
            ) {
                // 横轴为类目轴，找到所有用这条横轴并且axis触发的系列数据
                categoryAxis = this.component.xAxis.getAxis(xAxisIndex);
                for (var i = 0, l = series.length; i < l; i++) {
                    if (!this._isSelected(series[i].name)) {
                        continue;
                    }
                    if (series[i].xAxisIndex == xAxisIndex
                        && this.deepQuery([series[i], this.option], 'tooltip.trigger') == 'axis'
                    ) {
                        showContent = this.query(series[i], 'tooltip.showContent') 
                                      || showContent;
                        formatter = this.query(series[i], 'tooltip.formatter') 
                                    || formatter;
                        position = this.query(series[i], 'tooltip.position') 
                                   || position;
                        
                        specialCssText += this._style(this.query(series[i], 'tooltip'));
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
                        dataIndex : dataIndex
                    },
                    this.myChart
                );
                y = zrEvent.getY(this._event);
                x = this.subPixelOptimize(
                    categoryAxis.getCoordByIndex(dataIndex),
                    this._axisLineWidth
                );
                this._styleAxisPointer(
                    seriesArray,
                    x, this.component.grid.getY(), 
                    x, this.component.grid.getYend(),
                    categoryAxis.getGap(), x, y
                );
            }
            else if (yAxisIndex != -1
                     && this.component.yAxis.getAxis(yAxisIndex).type
                        == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
            ) {
                // 纵轴为类目轴，找到所有用这条纵轴并且axis触发的系列数据
                categoryAxis = this.component.yAxis.getAxis(yAxisIndex);
                for (var i = 0, l = series.length; i < l; i++) {
                    if (!this._isSelected(series[i].name)) {
                        continue;
                    }
                    if (series[i].yAxisIndex == yAxisIndex
                        && this.deepQuery([series[i], this.option], 'tooltip.trigger') == 'axis'
                    ) {
                        showContent = this.query(series[i], 'tooltip.showContent') 
                                      || showContent;
                        formatter = this.query(series[i], 'tooltip.formatter') 
                                    || formatter;
                        position = this.query(series[i], 'tooltip.position') 
                                   || position;
                        specialCssText += this._style(this.query(series[i], 'tooltip'));
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
                        dataIndex : dataIndex
                    },
                    this.myChart
                );
                x = zrEvent.getX(this._event);
                y = this.subPixelOptimize(
                    categoryAxis.getCoordByIndex(dataIndex),
                    this._axisLineWidth
                );
                this._styleAxisPointer(
                    seriesArray,
                    this.component.grid.getX(), y, 
                    this.component.grid.getXend(), y,
                    categoryAxis.getGap(), x, y
                );
            }
            else {
                // 双数值轴
                x = zrEvent.getX(this._event);
                y = zrEvent.getY(this._event);
                this._styleAxisPointer(
                    series,
                    this.component.grid.getX(), y, 
                    this.component.grid.getXend(), y,
                    0, x, y
                );
                if (dataIndex >= 0) {
                    this._showItemTrigger();
                }
                else {
                    clearTimeout(this._hidingTicket);
                    clearTimeout(this._showingTicket);
                    this._tDom.style.display = 'none';
                }
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
                this._show(position, x + 10, y + 10, specialCssText);
            }
        },
        
        /**
         * 极坐标 
         */
        _showPolarTrigger : function (polarIndex, dataIndex) {
            if (typeof this.component.polar == 'undefined'
                || typeof polarIndex == 'undefined'
                || typeof dataIndex == 'undefined'
                || dataIndex < 0
            ) {
                return false;
            }
            var series = this.option.series;
            var seriesArray = [];

            var formatter;
            var position;
            var showContent;
            var specialCssText = '';
            if (this.option.tooltip.trigger == 'axis') {
                if (this.option.tooltip.show === false) {
                    return false;
                }
                formatter = this.option.tooltip.formatter;
                position = this.option.tooltip.position;
            }
            var indicatorName = this.option.polar[polarIndex].indicator[dataIndex].text;

            // 找到所有用这个极坐标并且axis触发的系列数据
            for (var i = 0, l = series.length; i < l; i++) {
                if (!this._isSelected(series[i].name)) {
                    continue;
                }
                if (series[i].polarIndex == polarIndex
                    && this.deepQuery([series[i], this.option], 'tooltip.trigger') == 'axis'
                ) {
                    showContent = this.query(series[i], 'tooltip.showContent') 
                                  || showContent;
                    formatter = this.query(series[i], 'tooltip.formatter') 
                                || formatter;
                    position = this.query(series[i], 'tooltip.position') 
                               || position;
                    specialCssText += this._style(this.query(series[i], 'tooltip'));
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
                            typeof data.value[dataIndex].value != 'undefined'
                                ? data.value[dataIndex].value : data.value[dataIndex],
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
                    position,
                    zrEvent.getX(this._event), 
                    zrEvent.getY(this._event), 
                    specialCssText
                );
                return true;
            }
        },
        
        _showItemTrigger : function () {
            if (!this._curTarget) {
                return;
            }
            var serie = ecData.get(this._curTarget, 'series');
            var data = ecData.get(this._curTarget, 'data');
            var name = ecData.get(this._curTarget, 'name');
            var value = ecData.get(this._curTarget, 'value');
            var special = ecData.get(this._curTarget, 'special');
            var special2 = ecData.get(this._curTarget, 'special2');
            // 从低优先级往上找到trigger为item的formatter和样式
            var formatter;
            var position;
            var showContent;
            var specialCssText = '';
            var indicator;
            var html = '';
            if (this._curTarget._type != 'island') {
                // 全局
                if (this.option.tooltip.trigger == 'item') {
                    formatter = this.option.tooltip.formatter;
                    position = this.option.tooltip.position;
                }
                // 系列
                if (this.query(serie, 'tooltip.trigger') == 'item') {
                    showContent = this.query(serie, 'tooltip.showContent') 
                                  || showContent;
                    formatter = this.query(serie, 'tooltip.formatter') 
                                || formatter;
                    position = this.query(serie, 'tooltip.position') 
                               || position;
                    specialCssText += this._style(this.query(serie, 'tooltip'));
                }
                // 数据项
                showContent = this.query(data, 'tooltip.showContent') 
                              || showContent;
                formatter = this.query(data, 'tooltip.formatter') 
                            || formatter;
                position = this.query(data, 'tooltip.position') 
                           || position;
                specialCssText += this._style(this.query(data, 'tooltip'));
            }
            else {
                showContent = this.deepQuery([data, serie, this.option], 'tooltip.showContent');
                formatter = this.deepQuery([data, serie, this.option], 'tooltip.islandFormatter');
                position = this.deepQuery([data, serie, this.option], 'tooltip.islandPosition');
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
                formatter = formatter.replace('{a0}', this._encodeHTML(serie.name || ''))
                                     .replace('{b0}', this._encodeHTML(name))
                                     .replace(
                                         '{c0}', 
                                         value instanceof Array ? value : this.numAddCommas(value)
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
                                      + (name === '' ? '' : (this._encodeHTML(name) + ' : ')) 
                                      + value 
                                      + (typeof special == 'undefined'
                                             ? '' : (' (' + special + ')')
                                        );
                }
                else if (serie.type == ecConfig.CHART_TYPE_RADAR && special) {
                    indicator = special;
                    html += this._encodeHTML(name === '' ? (serie.name || '') : name);
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
                                                ? (this._encodeHTML(serie.name) + '<br/>') : ''
                                               )
                                               + name1 + ' -> ' + name2 
                                               + ' (' + this.numAddCommas(value) + ')'
                                               + '<br />'
                                               + name2 + ' -> ' + name1
                                               + ' (' + this.numAddCommas(special2) + ')';
                    }
                }
                else {
                    this._tDom.innerHTML = (typeof serie.name != 'undefined'
                                                ? (this._encodeHTML(serie.name) + '<br/>') : ''
                                           )
                                           + this._encodeHTML(name) + ' : ' 
                                           + this.numAddCommas(value) +
                                           (typeof special == 'undefined'
                                               ? '' : (' ('+ this.numAddCommas(special) +')')
                                           );
                }
            }

            if (!this._axisLineShape.invisible 
                || !this._axisShadowShape.invisible
            ) {
                this._axisLineShape.invisible = true;
                this.zr.modShape(this._axisLineShape.id);
                this._axisShadowShape.invisible = true;
                this.zr.modShape(this._axisShadowShape.id);
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
                position,
                zrEvent.getX(this._event) + 20,
                zrEvent.getY(this._event) - 20,
                specialCssText
            );
        },

        /**
         * 设置坐标轴指示器样式 
         */
        _styleAxisPointer : function (seriesArray, xStart, yStart, xEnd, yEnd, gap, x, y) {
            if (seriesArray.length > 0) {
                var queryTarget;
                var curType;
                var axisPointer = this.option.tooltip.axisPointer;
                var pointType = axisPointer.type;
                var style = {
                    line : {},
                    cross : {},
                    shadow : {}
                };
                for (var pType in style) {
                    style[pType].color = axisPointer[pType + 'Style'].color;
                    style[pType].width = axisPointer[pType + 'Style'].width;
                    style[pType].type = axisPointer[pType + 'Style'].type;
                }
                for (var i = 0, l = seriesArray.length; i < l; i++) {
                    if (this.deepQuery(
                           [seriesArray[i], this.option], 'tooltip.trigger'
                       ) == 'axis'
                    ) {
                        queryTarget = seriesArray[i];
                        curType = this.query(queryTarget, 'tooltip.axisPointer.type');
                        pointType = curType || pointType; 
                        if (curType) {
                            style[curType].color = this.query(
                                queryTarget,
                                'tooltip.axisPointer.' + curType + 'Style.color'
                            ) || style[curType].color;
                            style[curType].width = this.query(
                                queryTarget,
                                'tooltip.axisPointer.' + curType + 'Style.width'
                            ) || style[curType].width;
                            style[curType].type = this.query(
                                queryTarget,
                                'tooltip.axisPointer.' + curType + 'Style.type'
                            ) || style[curType].type;
                        }
                    }
                }
                
                if (pointType == 'line') {
                    this._axisLineShape.style = {
                        xStart : xStart,
                        yStart : yStart,
                        xEnd : xEnd,
                        yEnd : yEnd,
                        strokeColor : style.line.color,
                        lineWidth : style.line.width,
                        lineType : style.line.type
                    };
                    this._axisLineShape.invisible = false;
                    this.zr.modShape(this._axisLineShape.id);
                }
                else if (pointType == 'cross') {
                    this._axisCrossShape.style = {
                        brushType: 'stroke',
                        rect : this.component.grid.getArea(),
                        x : x,
                        y : y,
                        text : ('( ' 
                               + this.component.xAxis.getAxis(0).getValueFromCoord(x)
                               + ' , '
                               + this.component.yAxis.getAxis(0).getValueFromCoord(y) 
                               + ' )'
                               ).replace('  , ', ' ').replace(' ,  ', ' '),
                        textPosition : 'specific',
                        strokeColor : style.cross.color,
                        lineWidth : style.cross.width,
                        lineType : style.cross.type
                    };
                    if (this.component.grid.getXend() - x > 100) {          // 右侧有空间
                        this._axisCrossShape.style.textAlign = 'left';
                        this._axisCrossShape.style.textX = x + 10;
                    }
                    else {
                        this._axisCrossShape.style.textAlign = 'right';
                        this._axisCrossShape.style.textX = x - 10;
                    }
                    if (y - this.component.grid.getY() > 50) {             // 上方有空间
                        this._axisCrossShape.style.textBaseline = 'bottom';
                        this._axisCrossShape.style.textY = y - 10;
                    }
                    else {
                        this._axisCrossShape.style.textBaseline = 'top';
                        this._axisCrossShape.style.textY = y + 10;
                    }
                    this._axisCrossShape.invisible = false;
                    this.zr.modShape(this._axisCrossShape.id);
                }
                else if (pointType == 'shadow') {
                    if (typeof style.shadow.width == 'undefined' 
                        || style.shadow.width == 'auto'
                        || isNaN(style.shadow.width)
                    ) {
                        style.shadow.width = gap;
                    }
                    if (xStart == xEnd) {
                        // 纵向
                        if (Math.abs(this.component.grid.getX() - xStart) < 2) {
                            // 最左边
                            style.shadow.width /= 2;
                            xStart = xEnd = xEnd + style.shadow.width / 2;
                        }
                        else if (Math.abs(this.component.grid.getXend() - xStart) < 2) {
                            // 最右边
                            style.shadow.width /= 2;
                            xStart = xEnd = xEnd - style.shadow.width / 2;
                        }
                    }
                    else if (yStart == yEnd) {
                        // 横向
                        if (Math.abs(this.component.grid.getY() - yStart) < 2) {
                            // 最上边
                            style.shadow.width /= 2;
                            yStart = yEnd = yEnd + style.shadow.width / 2;
                        }
                        else if (Math.abs(this.component.grid.getYend() - yStart) < 2) {
                            // 最右边
                            style.shadow.width /= 2;
                            yStart = yEnd = yEnd - style.shadow.width / 2;
                        }
                    }
                    this._axisShadowShape.style = {
                        xStart : xStart,
                        yStart : yStart,
                        xEnd : xEnd,
                        yEnd : yEnd,
                        strokeColor : style.shadow.color,
                        lineWidth : style.shadow.width
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
                    && this.component.grid 
                    && zrArea.isInside(rectangleInstance, this.component.grid.getArea(), mx, my)
                ) {
                    this._showingTicket = setTimeout(this._tryShow, this._showDelay);
                }
                else if (this._needAxisTrigger 
                        && this.component.polar 
                        && this.component.polar.isInside([mx, my]) != -1
                ) {
                    this._showingTicket = setTimeout(this._tryShow, this._showDelay);
                }
                else {
                    !this._event.connectTrigger && this.messageCenter.dispatch(
                        ecConfig.EVENT.TOOLTIP_OUT_GRID,
                        this._event,
                        null,
                        this.myChart
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
                    && this.component.polar 
                    && (polarIndex = this.component.polar.isInside([mx, my])) != -1
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
        __setContent : function (ticket, content) {
            if (!this._tDom) {
                return;
            }
            if (ticket == this._curTicket) {
                this._tDom.innerHTML = content;
            }
            
            setTimeout(this._refixed, 20);
        },

        ontooltipHover : function (param, tipShape) {
            if (!this._lastTipShape // 不存在或者存在但dataIndex发生变化才需要重绘
                || (this._lastTipShape && this._lastTipShape.dataIndex != param.dataIndex)
            ) {
                if (this._lastTipShape && this._lastTipShape.tipShape.length > 0) {
                    this.zr.delShape(this._lastTipShape.tipShape);
                    this.shapeList.length = 2;
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
                    this.shapeList.push(tipShape[i]);
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
            if (this.component.legend) {
                this._selectedMap = zrUtil.clone(this.component.legend.getSelectedMap());
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
                        if (typeof this.component.xAxis == 'undefined' 
                            || typeof this.component.yAxis == 'undefined'
                            || serie.data.length <= dataIndex
                        ) {
                            return;
                        }
                        var xAxisIndex = serie.xAxisIndex || 0;
                        var yAxisIndex = serie.yAxisIndex || 0;
                        if (this.component.xAxis.getAxis(xAxisIndex).type 
                            == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                        ) {
                            // 横轴是类目
                            this._event = {
                                zrenderX : this.component.xAxis.getAxis(xAxisIndex)
                                           .getCoordByIndex(dataIndex),
                                zrenderY : this.component.grid.getY() 
                                           + (this.component.grid.getYend() 
                                              - this.component.grid.getY()
                                             ) / 4
                            };
                        }
                        else {
                            // 纵轴是类目
                            this._event = {
                                zrenderX : this.component.grid.getX() 
                                           + (this.component.grid.getXend() 
                                              - this.component.grid.getX()
                                             ) / 4,
                                zrenderY : this.component.yAxis.getAxis(yAxisIndex)
                                           .getCoordByIndex(dataIndex)
                            };
                        }
                        this._showAxisTrigger(
                            xAxisIndex, 
                            yAxisIndex,
                            dataIndex
                        );
                        break;
                    case ecConfig.CHART_TYPE_RADAR :
                        if (typeof this.component.polar == 'undefined' 
                            || serie.data[0].value.length <= dataIndex
                        ) {
                            return;
                        }
                        var polarIndex = serie.polarIndex || 0;
                        var vector = this.component.polar.getVector(
                            polarIndex, dataIndex, 'max'
                        );
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
                                var vector = this.component.polar.getCenter(
                                    serie.polarIndex || 0
                                );
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
                                && shapeList[i].style._name == name
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
        
        /**
         * 刷新
         */
        refresh : function (newOption) {
            // this._selectedMap;
            // this._defaultCssText;    // css样式缓存
            // this._needAxisTrigger;   // 坐标轴触发
            // this._curTarget;
            // this._event;
            // this._curTicket;         // 异步回调标识，用来区分多个请求
            
            // 缓存一些高宽数据
            this._zrHeight = this.zr.getHeight();
            this._zrWidth = this.zr.getWidth();
            
            if (this._lastTipShape && this._lastTipShape.tipShape.length > 0) {
                this.zr.delShape(this._lastTipShape.tipShape);
            }
            this._lastTipShape = false;
            this.shapeList.length = 2;
            
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
            if (this.showing) {
                this._tryShow();
            }
        },

        /**
         * 释放后实例不可用，重载基类方法
         */
        dispose : function () {
            if (this._lastTipShape && this._lastTipShape.tipShape.length > 0) {
                this.zr.delShape(this._lastTipShape.tipShape);
            }
            this.clear();
            this.shapeList = null;
            
            clearTimeout(this._hidingTicket);
            clearTimeout(this._showingTicket);
            this.zr.un(zrConfig.EVENT.MOUSEMOVE, self._onmousemove);
            this.zr.un(zrConfig.EVENT.GLOBALOUT, self._onglobalout);
            
            if (this.hasAppend) {
                this.dom.firstChild.removeChild(this._tDom);
            }
            this._tDom = null;
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