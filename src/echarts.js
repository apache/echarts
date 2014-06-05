/*!
 * ECharts, a javascript interactive chart library.
 *  
 * Copyright (c) 2014, Baidu Inc.
 * All rights reserved.
 * 
 * LICENSE
 * https://github.com/ecomfe/echarts/blob/master/LICENSE.txt
 */

/**
 * echarts
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var ecConfig = require('./config');
    var zrUtil = require('zrender/tool/util');
    
    var self = {};
    
    var _canvasSupported = require('zrender/tool/env').canvasSupported;
    var _idBase = new Date() - 0;
    var _instances = {};    // ECharts实例map索引
    var DOM_ATTRIBUTE_KEY = '_echarts_instance_';
    
    self.version = '1.4.1';
    self.dependencies = {
        zrender : '1.1.2'
    };
    /**
     * 入口方法 
     */
    self.init = function (dom, theme) {
        var zrender = require('zrender');
        if (((zrender.version || '1.0.3').replace('.', '') - 0)
            < (self.dependencies.zrender.replace('.', '') - 0)
        ) {
            console.error(
                'ZRender ' + (zrender.version || '1.0.3-') 
                + ' is too old for ECharts ' + self.version 
                + '. Current version need ZRender ' 
                + self.dependencies.zrender + '+'
            );
        }
            
        dom = dom instanceof Array ? dom[0] : dom;
        // dom与echarts实例映射索引
        var key = dom.getAttribute(DOM_ATTRIBUTE_KEY);
        if (!key) {
            key = _idBase++;
            dom.setAttribute(DOM_ATTRIBUTE_KEY, key);
        }
        if (_instances[key]) {
            // 同一个dom上多次init，自动释放已有实例
            _instances[key].dispose();
        }
        _instances[key] = new Echarts(dom);
        _instances[key].id = key;
        _instances[key].setTheme(theme);
        
        return  _instances[key];
    };
    
    /**
     * 通过id获得ECharts实例，id可在实例化后读取 
     */
    self.getInstanceById = function (key) {
        return _instances[key];
    };

    /**
     * 基于zrender实现Echarts接口层
     * @param {HtmlElement} dom 必要
     */
    function Echarts(dom) {
        this._themeConfig = zrUtil.clone(ecConfig);

        this.dom = dom;
        // this._zr;
        // this._option;                    // curOption clone
        // this._optionRestore;             // for restore;
        // this._island;
        // this._toolbox;
        // this._timeline;
        // this._refreshInside;             // 内部刷新标志位
        
        this._connected = false;
        this._status = {                    // 用于图表间通信
            dragIn : false,
            dragOut : false,
            needRefresh : false
        };
        this._curEventType = false;         // 破循环信号灯
        this._chartList = [];               // 图表实例
        this._messageCenter = {};           // Echarts层的消息中心，做zrender原始事件转换
        
        // resize方法经常被绑定到window.resize上，闭包一个this
        this.resize = this.resize();
        
        // 初始化::构造函数
        this._init();
    }
    
    Echarts.prototype = {
        /**
         * 初始化::构造函数
         */ 
        _init : function () {
            var self = this;
            var _zr = require('zrender').init(this.dom);
            this._zr = _zr;

            // 添加消息中心的事件分发器特性
            var zrEvent = require('zrender/tool/event');
            zrEvent.Dispatcher.call(this._messageCenter);
            
            this._onevent = function(param){
                return self.__onevent(param);
            };
            for (var e in ecConfig.EVENT) {
                if (e != 'CLICK' && e != 'HOVER' && e != 'MAP_ROAM') {
                    this._messageCenter.bind(ecConfig.EVENT[e], this._onevent);
                }
            }

            var zrConfig = require('zrender/config');
            this._onzrevent = function(param){
                return self.__onzrevent(param);
            };
            // 只关心这些事件
            _zr.on(zrConfig.EVENT.CLICK, this._onzrevent);
            _zr.on(zrConfig.EVENT.MOUSEOVER, this._onzrevent);
            //_zr.on(zrConfig.EVENT.MOUSEWHEEL, this._onzrevent);
            _zr.on(zrConfig.EVENT.DRAGSTART, this._onzrevent);
            _zr.on(zrConfig.EVENT.DRAGEND, this._onzrevent);
            _zr.on(zrConfig.EVENT.DRAGENTER, this._onzrevent);
            _zr.on(zrConfig.EVENT.DRAGOVER, this._onzrevent);
            _zr.on(zrConfig.EVENT.DRAGLEAVE, this._onzrevent);
            _zr.on(zrConfig.EVENT.DROP, this._onzrevent);

            this.chart = {};            // 图表索引
            this.component = {};        // 组件索引
            
            // 内置图表
            // 孤岛
            var Island = require('./chart/island');
            this._island = new Island(this._themeConfig, this._messageCenter, _zr, {}, this);
            this.chart.island = this._island;
            
            // 内置通用组件
            // 工具箱
            var Toolbox = require('./component/toolbox');
            this._toolbox = new Toolbox(this._themeConfig, this._messageCenter, _zr, {}, this);
            this.component.toolbox = this._toolbox;
            
            var componentLibrary = require('./component');
            componentLibrary.define('title', require('./component/title'));
            componentLibrary.define('tooltip', require('./component/tooltip'));
            componentLibrary.define('legend', require('./component/legend'));
        },
        
        /**
         * zrender事件内部分发器
         */
        __onzrevent : function(param){
            var zrConfig = require('zrender/config');
            switch (param.type) {
                case zrConfig.EVENT.CLICK :
                    return this._onclick(param);
                case zrConfig.EVENT.MOUSEOVER :
                    return this._onhover(param);
                case zrConfig.EVENT.DRAGSTART :
                    return this._ondragstart(param);
                case zrConfig.EVENT.DRAGEND :
                    return this._ondragend(param);
                case zrConfig.EVENT.DRAGENTER :
                    return this._ondragenter(param);
                case zrConfig.EVENT.DRAGOVER :
                    return this._ondragover(param);
                case zrConfig.EVENT.DRAGLEAVE :
                    return this._ondragleave(param);
                case zrConfig.EVENT.DROP :
                    return this._ondrop(param);
                case zrConfig.EVENT.MOUSEWHEEL :
                    return this._onmousewheel(param);
            }
        },

        /**
         * ECharts事件处理中心 
         */
        __onevent : function (param){
            param.__echartsId = param.__echartsId || this.id;
            var fromMyself = true;
            if (param.__echartsId != this.id) {
                // 来自其他联动图表的事件
                fromMyself = false;
            }
            
            if (!this._curEventType) {
                this._curEventType = param.type;
            }
            
            switch(param.type) {
                case ecConfig.EVENT.LEGEND_SELECTED :
                    this._onlegendSelected(param);
                    break;
                case ecConfig.EVENT.DATA_ZOOM :
                    if (!fromMyself) {
                        var dz = this.component.dataZoom;
                        if (dz) {
                            dz.silence(true);
                            dz.absoluteZoom(param.zoom);
                            dz.silence(false);
                        }
                    }
                    this._ondataZoom(param);
                    break;        
                case ecConfig.EVENT.DATA_RANGE :
                    fromMyself && this._ondataRange(param);
                    break;        
                case ecConfig.EVENT.MAGIC_TYPE_CHANGED :
                    if (!fromMyself) {
                        var tb = this.component.toolbox;
                        if (tb) {
                            tb.silence(true);
                            tb.setMagicType(param.magicType);
                            tb.silence(false);
                        }
                    }
                    this._onmagicTypeChanged(param);
                    break;        
                case ecConfig.EVENT.DATA_VIEW_CHANGED :
                    fromMyself && this._ondataViewChanged(param);
                    break;        
                case ecConfig.EVENT.TOOLTIP_HOVER :
                    fromMyself && this._tooltipHover(param);
                    break;        
                case ecConfig.EVENT.RESTORE :
                    this._onrestore();
                    break;        
                case ecConfig.EVENT.REFRESH :
                    fromMyself && this._onrefresh(param);
                    break;
                // 鼠标同步
                case ecConfig.EVENT.TOOLTIP_IN_GRID :
                case ecConfig.EVENT.TOOLTIP_OUT_GRID :
                    if (!fromMyself) {
                        // 只处理来自外部的鼠标同步
                        var grid = this.component.grid;
                        if (grid) {
                            this._zr.trigger(
                                'mousemove',
                                {
                                    connectTrigger : true,
                                    zrenderX : grid.getX() + param.x * grid.getWidth(),
                                    zrenderY : grid.getY() + param.y * grid.getHeight()
                                }
                            );
                        }
                    } 
                    else if (this._connected) {
                        // 来自自己，并且存在多图联动，空间坐标映射修改参数分发
                        var grid = this.component.grid;
                        if (grid) {
                            param.x = (param.event.zrenderX - grid.getX()) / grid.getWidth();
                            param.y = (param.event.zrenderY - grid.getY()) / grid.getHeight();
                        }
                    }
                    break;
                /*
                case ecConfig.EVENT.RESIZE :
                case ecConfig.EVENT.DATA_CHANGED :
                case ecConfig.EVENT.PIE_SELECTED :
                case ecConfig.EVENT.MAP_SELECTED :
                    break;
                */
            }
            
            // 多图联动，只做自己的一级事件分发，避免级联事件循环
            if (this._connected && fromMyself && this._curEventType == param.type) { 
                for (var c in this._connected) {
                    this._connected[c].connectedEventHandler(param);
                }
                // 分发完毕后复位
                this._curEventType = null;
            }
            
            if (!fromMyself || (!this._connected && fromMyself)) {  // 处理了完联动事件复位
                this._curEventType = null;
            }
        },
        
        /**
         * 点击事件，响应zrender事件，包装后分发到Echarts层
         */
        _onclick : function (param) {
            var len = this._chartList.length;
            while (len--) {
                this._chartList[len]
                && this._chartList[len].onclick
                && this._chartList[len].onclick(param);
            }
            if (param.target) {
                var ecData = this._eventPackage(param.target);
                if (ecData && typeof ecData.seriesIndex != 'undefined') {
                    this._messageCenter.dispatch(
                        ecConfig.EVENT.CLICK,
                        param.event,
                        ecData
                    );
                }
            }
        },

         /**
         * 悬浮事件，响应zrender事件，包装后分发到Echarts层
         */
        _onhover : function (param) {
            if (param.target) {
                var ecData = this._eventPackage(param.target);
                if (ecData && typeof ecData.seriesIndex != 'undefined') {
                    this._messageCenter.dispatch(
                        ecConfig.EVENT.HOVER,
                        param.event,
                        ecData
                    );
                }
            }
        },

        /**
         * dragstart回调，可计算特性实现
         */
        _ondragstart : function (param) {
            // 复位用于图表间通信拖拽标识
            this._status = {
                dragIn : false,
                dragOut : false,
                needRefresh : false
            };
            var len = this._chartList.length;
            while (len--) {
                this._chartList[len]
                && this._chartList[len].ondragstart
                && this._chartList[len].ondragstart(param);
            }
        },

        /**
         * dragging回调，可计算特性实现
         */
        _ondragenter : function (param) {
            var len = this._chartList.length;
            while (len--) {
                this._chartList[len]
                && this._chartList[len].ondragenter
                && this._chartList[len].ondragenter(param);
            }
        },

        /**
         * dragstart回调，可计算特性实现
         */
        _ondragover : function (param) {
            var len = this._chartList.length;
            while (len--) {
                this._chartList[len]
                && this._chartList[len].ondragover
                && this._chartList[len].ondragover(param);
            }
        },
        
        /**
         * dragstart回调，可计算特性实现
         */
        _ondragleave : function (param) {
            var len = this._chartList.length;
            while (len--) {
                this._chartList[len]
                && this._chartList[len].ondragleave
                && this._chartList[len].ondragleave(param);
            }
        },

        /**
         * dragstart回调，可计算特性实现
         */
        _ondrop : function (param) {
            var len = this._chartList.length;
            while (len--) {
                this._chartList[len]
                && this._chartList[len].ondrop
                && this._chartList[len].ondrop(param, this._status);
            }
            this._island.ondrop(param, this._status);
        },

        /**
         * dragdone回调 ，可计算特性实现
         */
        _ondragend : function (param) {
            var len = this._chartList.length;
            while (len--) {
                this._chartList[len]
                && this._chartList[len].ondragend
                && this._chartList[len].ondragend(param, this._status);
            }
            this._timeline && this._timeline.ondragend(param, this._status);
            this._island.ondragend(param, this._status);

            // 发生过重计算
            if (this._status.needRefresh) {
                this._syncBackupData(this._option);
                this._messageCenter.dispatch(
                    ecConfig.EVENT.DATA_CHANGED,
                    param.event,
                    this._eventPackage(param.target)
                );
                this._messageCenter.dispatch(ecConfig.EVENT.REFRESH);
            }
        },

        /**
         * 图例选择响应
         */
        _onlegendSelected : function (param) {
            // 用于图表间通信
            this._status.needRefresh = false;
            var len = this._chartList.length;
            while (len--) {
                this._chartList[len]
                && this._chartList[len].onlegendSelected
                && this._chartList[len].onlegendSelected(param, this._status);
            }
            if (this._status.needRefresh) {
                this._messageCenter.dispatch(ecConfig.EVENT.REFRESH);
            }
        },

        /**
         * 数据区域缩放响应 
         */
        _ondataZoom : function (param) {
            // 用于图表间通信
            this._status.needRefresh = false;
            var len = this._chartList.length;
            while (len--) {
                this._chartList[len]
                && this._chartList[len].ondataZoom
                && this._chartList[len].ondataZoom(param, this._status);
            }

            if (this._status.needRefresh) {
                this._messageCenter.dispatch(ecConfig.EVENT.REFRESH);
            }
        },

        /**
         * 值域漫游响应 
         */
        _ondataRange : function (param) {
            this._zr.modLayer(ecConfig.EFFECT_ZLEVEL, { motionBlur : false});
            // 用于图表间通信
            this._status.needRefresh = false;
            var len = this._chartList.length;
            while (len--) {
                this._chartList[len]
                && this._chartList[len].ondataRange
                && this._chartList[len].ondataRange(param, this._status);
            }
            
            // 没有相互影响，直接刷新即可
            if (this._status.needRefresh) {
                this._zr.refresh();
            }
        },

        /**
         * 动态类型切换响应 
         */
        _onmagicTypeChanged : function () {
            this._zr.modLayer(ecConfig.EFFECT_ZLEVEL, { motionBlur : false});
            this._render(this._toolbox.getMagicOption());
        },

        /**
         * 数据视图修改响应 
         */
        _ondataViewChanged : function (param) {
            this._syncBackupData(param.option);
            this._messageCenter.dispatch(
                ecConfig.EVENT.DATA_CHANGED,
                null,
                param
            );
            this._messageCenter.dispatch(ecConfig.EVENT.REFRESH);
        },
        
        /**
         * tooltip与图表间通信 
         */
        _tooltipHover : function (param) {
            var len = this._chartList.length;
            var tipShape = [];
            while (len--) {
                this._chartList[len]
                && this._chartList[len].ontooltipHover
                && this._chartList[len].ontooltipHover(param, tipShape);
            }
        },

        /**
         * 还原 
         */
        _onrestore : function () {
            this.restore();
        },

        /**
         * 刷新 
         */
        _onrefresh : function (param) {
            this._refreshInside = true;
            this.refresh(param);
            this._refreshInside = false;
        },
        
        /**
         * 数据修改后的反向同步dataZoom持有的备份数据 
         */
        _syncBackupData : function (curOption) {
            this.component.dataZoom && this.component.dataZoom.syncBackupData(curOption);
        },

        /**
         * 打包Echarts层的事件附件
         */
        _eventPackage : function (target) {
            if (target) {
                var ecData = require('./util/ecData');
                
                var seriesIndex = ecData.get(target, 'seriesIndex');
                var dataIndex = ecData.get(target, 'dataIndex');
                
                dataIndex = seriesIndex != -1 && this.component.dataZoom
                            ? this.component.dataZoom.getRealDataIndex(
                                seriesIndex,
                                dataIndex
                              )
                            : dataIndex;
                return {
                    seriesIndex : seriesIndex,
                    dataIndex : dataIndex,
                    data : ecData.get(target, 'data'),
                    name : ecData.get(target, 'name'),
                    value : ecData.get(target, 'value'),
                    special : ecData.get(target, 'special')
                };
            }
            return;
        },

        /**
         * 图表渲染 
         */
        _render : function (magicOption) {
            this._mergeGlobalConifg(magicOption);
            if (magicOption.backgroundColor) {
                if (!_canvasSupported 
                    && magicOption.backgroundColor.indexOf('rgba') != -1
                ) {
                    // IE6~8对RGBA的处理，filter会带来其他颜色的影响
                    var cList = magicOption.backgroundColor.split(',');
                    this.dom.style.filter = 'alpha(opacity=' +
                        cList[3].substring(0, cList[3].lastIndexOf(')')) * 100
                        + ')';
                    cList.length = 3;
                    cList[0] = cList[0].replace('a', '');
                    this.dom.style.backgroundColor = cList.join(',') + ')';
                }
                else {
                    this.dom.style.backgroundColor = magicOption.backgroundColor;
                }
            }
            
            this._zr.clearAnimation();
            this._chartList = [];

            var chartLibrary = require('./chart');
            var componentLibrary = require('./component');
            
            if (magicOption.xAxis || magicOption.yAxis) {
                magicOption.grid = magicOption.grid || {};
                magicOption.dataZoom = magicOption.dataZoom || {};
            }
            
            var componentList = [
                'title', 'tooltip', 'legend', 'dataRange',
                'grid', 'dataZoom', 'xAxis', 'yAxis', 'polar'
            ];
            
            var ComponentClass;
            var componentType;
            var component;
            for (var i = 0, l = componentList.length; i < l; i++) {
                componentType = componentList[i];
                if (magicOption[componentType]) {
                    if (this.component[componentType]) {
                        this.component[componentType].refresh &&
                        this.component[componentType].refresh(magicOption);
                    }
                    else {
                        ComponentClass = componentLibrary.get(
                            (componentType == 'xAxis' || componentType == 'yAxis')
                            ? 'axis'
                            : componentType
                        );
                        component = new ComponentClass(
                            this._themeConfig, this._messageCenter, this._zr,
                            magicOption, this, componentType
                        );
                        this.component[componentType] = component;
                    }
                    this._chartList.push(this.component[componentType]);
                }
                else if (this.component[componentType]) {
                    this.component[componentType].dispose();
                    this.component[componentType] = null;
                    delete this.component[componentType];
                }
            }

            var ChartClass;
            var chartType;
            var chart;
            var chartMap = {};      // 记录已经初始化的图表
            for (var i = 0, l = magicOption.series.length; i < l; i++) {
                chartType = magicOption.series[i].type;
                if (!chartType) {
                    console.error('series[' + i + '] chart type has not been defined.');
                    continue;
                }
                if (!chartMap[chartType]) {
                    chartMap[chartType] = true;
                    ChartClass = chartLibrary.get(chartType);
                    if (ChartClass) {
                        if (this.chart[chartType]) {
                            chart = this.chart[chartType];
                            chart.refresh(magicOption);
                        }
                        else {
                            chart = new ChartClass(
                                this._themeConfig, this._messageCenter, this._zr,
                                magicOption, this
                            );
                        }
                        this._chartList.push(chart);
                        this.chart[chartType] = chart;
                    }
                    else {
                        console.error(chartType + ' has not been required.');
                    }
                }
            }
            
            // 已有实例但新option不带这类图表的实例释放
            for (chartType in this.chart) {
                if (chartType != ecConfig.CHART_TYPE_ISLAND  && !chartMap[chartType]) {
                    this.chart[chartType].dispose();
                    this.chart[chartType] = null;
                    delete this.chart[chartType];
                }
            }
            
            this.component.grid && this.component.grid.refixAxisShape(this.component);

            this._island.refresh(magicOption);
            this._toolbox.refresh(magicOption);
            
            magicOption.animation && !magicOption.renderAsImage
                ? this._zr.refresh()
                : this._zr.render();
            
            var imgId = 'IMG' + this.id;
            var img = document.getElementById(imgId);
            if (magicOption.renderAsImage && _canvasSupported) {
                // IE8- 不支持图片渲染形式
                if (img) {
                    // 已经渲染过则更新显示
                    img.src = this.getDataURL(magicOption.renderAsImage);
                }
                else {
                    // 没有渲染过插入img dom
                    img = this.getImage(magicOption.renderAsImage);
                    img.id = imgId;
                    img.style.position = 'absolute';
                    img.style.left = 0;
                    img.style.top = 0;
                    this.dom.firstChild.appendChild(img);
                }
                this.un();
                this._zr.un();
                this._disposeChartList();
                this._zr.clear();
            }
            else if (img) {
                // 删除可能存在的img
                img.parentNode.removeChild(img);
            }
            img = null;
            
            this._option = magicOption;
        },

        /**
         * 还原 
         */
        restore : function () {
            this._zr.modLayer(ecConfig.EFFECT_ZLEVEL, { motionBlur : false});
            this._option = zrUtil.clone(this._optionRestore);
            this._disposeChartList();
            this._island.clear();
            this._toolbox.reset(this._option, true);
            this._render(this._option);
        },

        /**
         * 刷新 
         * @param {Object=} param，可选参数，用于附带option，内部同步用，外部不建议带入数据修改，无法同步 
         */
        refresh : function (param) {
            param = param || {};
            var magicOption = param.option;
            
            // 外部调用的refresh且有option带入
            if (!this._refreshInside && param.option) {
                // 做简单的差异合并去同步内部持有的数据克隆，不建议带入数据
                // 开启数据区域缩放、拖拽重计算、数据视图可编辑模式情况下，当用户产生了数据变化后无法同步
                // 如有带入option存在数据变化，请重新setOption
                magicOption = this.getOption();
                zrUtil.merge(magicOption, param.option, true);
                zrUtil.merge(this._optionRestore, param.option, true);
                this._toolbox.reset(magicOption);
            }
            
            this._island.refresh(magicOption);
            this._toolbox.refresh(magicOption);
            
            // 停止动画
            this._zr.clearAnimation();
            this._zr.modLayer(ecConfig.EFFECT_ZLEVEL, { motionBlur : false});
            // 先来后到，安顺序刷新各种图表，图表内部refresh优化检查magicOption，无需更新则不更新~
            for (var i = 0, l = this._chartList.length; i < l; i++) {
                this._chartList[i].refresh && this._chartList[i].refresh(magicOption);
            }
            this.component.grid && this.component.grid.refixAxisShape(this.component);
            this._zr.refresh();
        },

        /**
         * 释放图表实例
         */
        _disposeChartList : function () {
            // 停止动画
            this._zr.clearAnimation();
            this._zr.modLayer(ecConfig.EFFECT_ZLEVEL, { motionBlur : false});
            var len = this._chartList.length;
            while (len--) {
                if (this._chartList[len]) {
                    this.chart[this._chartList[len].type] 
                    && delete this.chart[this._chartList[len].type];
                    
                    this.component[this._chartList[len].type] 
                    && delete this.component[this._chartList[len].type];
                    
                    this._chartList[len].dispose 
                    && this._chartList[len].dispose();
                }
            }
            this._chartList = [];
        },

        /**
         * 非图表全局属性merge~~ 
         */
        _mergeGlobalConifg : function (magicOption) {
            var mergeList = [
                // 背景颜色
                'backgroundColor',
                
                // 拖拽重计算相关
                'calculable', 'calculableColor', 'calculableHolderColor',
                
                // 孤岛显示连接符
                'nameConnector', 'valueConnector',
                
                // 动画相关
                'animation', 'animationThreshold', 'animationDuration',
                'animationEasing', 'addDataAnimation',
                
                // 默认标志图形类型列表
                'symbolList',
                
                // 降低图表内元素拖拽敏感度，单位ms，不建议外部干预
                'DRAG_ENABLE_TIME'
            ];
            var len = mergeList.length;
            while (len--) {
                if (typeof magicOption[mergeList[len]] == 'undefined') {
                    magicOption[mergeList[len]] = this._themeConfig[mergeList[len]];
                }
            }
            
            // 数值系列的颜色列表，不传则采用内置颜色，可配数组，借用zrender实例注入，会有冲突风险，先这样
            var themeColor = (magicOption.color && magicOption.color.length > 0)
                             ? magicOption.color
                             : this._themeConfig.color;
            this._zr.getColor = function (idx) {
                var zrColor = require('zrender/tool/color');
                return zrColor.getColor(idx, themeColor);
            };
        },
        
        /**
         * 万能接口，配置图表实例任何可配置选项，多次调用时option选项做merge处理
         * @param {Object} option
         * @param {boolean=} notMerge 多次调用时option选项是默认是合并（merge）的，
         *                   如果不需求，可以通过notMerger参数为true阻止与上次option的合并
         */
        setOption : function (option, notMerge) {
            if (!option.timeline) {
                return this._setOption(option, notMerge);
            }
            else {
                return this._setTimelineOption(option);
            }
        },
        
        /**
         * 万能接口，配置图表实例任何可配置选项，多次调用时option选项做merge处理
         * @param {Object} option
         * @param {boolean=} notMerge 多次调用时option选项是默认是合并（merge）的，
         *                   如果不需求，可以通过notMerger参数为true阻止与上次option的合并
         */
        _setOption : function (option, notMerge) {
            if (!notMerge && this._option) {
                this._option = zrUtil.merge(
                    this.getOption(),
                    zrUtil.clone(option),
                    true
                );
            }
            else {
                this._option = zrUtil.clone(option);
            }

            if (!this._option.series || this._option.series.length === 0) {
                return;
            }

            this._optionRestore = zrUtil.clone(this._option);
            if (this.component.dataZoom                         // 存在dataZoom控件
                && (this._option.dataZoom                       // 并且新option也存在
                    || (this._option.toolbox
                        && this._option.toolbox.feature
                        && this._option.toolbox.feature.dataZoom
                        && this._option.toolbox.feature.dataZoom.show
                    )
                )
            ) {
                // dataZoom同步数据
                this.component.dataZoom.syncOption(this._option);
            }
            this._toolbox.reset(this._option);
            this._render(this._option);
            return this;
        },

        /**
         * 返回内部持有的当前显示option克隆 
         */
        getOption : function () {
            var magicOption = zrUtil.clone(this._option);
            
            var len;
            // 横轴数据还原
            if (this._optionRestore.xAxis) {
                if (this._optionRestore.xAxis instanceof Array) {
                    len = this._optionRestore.xAxis.length;
                    while (len--) {
                        magicOption.xAxis[len].data = zrUtil.clone(
                            this._optionRestore.xAxis[len].data
                        );
                    }
                }
                else {
                    magicOption.xAxis.data = zrUtil.clone(this._optionRestore.xAxis.data);
                }
            }
            
            // 纵轴数据还原
            if (this._optionRestore.yAxis) {
                if (this._optionRestore.yAxis instanceof Array) {
                    len = this._optionRestore.yAxis.length;
                    while (len--) {
                        magicOption.yAxis[len].data = zrUtil.clone(
                            this._optionRestore.yAxis[len].data
                        );
                    }
                }
                else {
                    magicOption.yAxis.data = zrUtil.clone(this._optionRestore.yAxis.data);
                }
            }

            // 系列数据还原
            len = this._optionRestore.series.length;
            while (len--) {
                magicOption.series[len].data = zrUtil.clone(this._optionRestore.series[len].data);
            }
            
            return magicOption;
        },

        /**
         * 数据设置快捷接口
         * @param {Array} series
         * @param {boolean=} notMerge 多次调用时option选项是默认是合并（merge）的，
         *                   如果不需求，可以通过notMerger参数为true阻止与上次option的合并。
         */
        setSeries : function (series, notMerge) {
            if (!notMerge) {
                this.setOption({series: series});
            }
            else {
                this._option.series = series;
                this.setOption(this._option, notMerge);
            }
            return this;
        },

        /**
         * 返回内部持有的当前显示series克隆 
         */
        getSeries : function () {
            return this.getOption().series;
        },
        
        /**
         * timelineOption接口，配置图表实例任何可配置选项
         * @param {Object} option
         */
        _setTimelineOption : function(option) {
            this._timeline && this._timeline.dispose();
            var Timeline = require('./component/timeline');
            var timeline = new Timeline(
                this._themeConfig, this._messageCenter, this._zr, option, this
            );
            this._timeline = timeline;
            this.component.timeline = this._timeline;
            
            return this;
        },
        
        /**
         * 动态数据添加
         * 形参为单组数据参数，多组时为数据，内容同[seriesIdx, data, isShift, additionData]
         * @param {number} seriesIdx 系列索引
         * @param {number | Object} data 增加数据
         * @param {boolean=} isHead 是否队头加入，默认，不指定或false时为队尾插入
         * @param {boolean=} dataGrow 是否增长数据队列长度，默认，不指定或false时移出目标数组对位数据
         * @param {string=} additionData 是否增加类目轴(饼图为图例)数据，附加操作同isHead和dataGrow
         */
        addData : function (seriesIdx, data, isHead, dataGrow, additionData) {
            var magicOption = this.getOption();
            var params = seriesIdx instanceof Array
                         ? seriesIdx
                         : [[seriesIdx, data, isHead, dataGrow, additionData]];
            var axisIdx;
            var legendDataIdx;
            //this._optionRestore 和 magicOption 都要同步
            for (var i = 0, l = params.length; i < l; i++) {
                seriesIdx = params[i][0];
                data = params[i][1];
                isHead = params[i][2];
                dataGrow = params[i][3];
                additionData = params[i][4];
                if (this._optionRestore.series[seriesIdx]) {
                    if (isHead) {
                        this._optionRestore.series[seriesIdx].data.unshift(data);
                        magicOption.series[seriesIdx].data.unshift(data);
                        if (!dataGrow) {
                            this._optionRestore.series[seriesIdx].data.pop();
                            data = magicOption.series[seriesIdx].data.pop();
                        }
                    }
                    else {
                        this._optionRestore.series[seriesIdx].data.push(data);
                        magicOption.series[seriesIdx].data.push(data);
                        if (!dataGrow) {
                            this._optionRestore.series[seriesIdx].data.shift();
                            data = magicOption.series[seriesIdx].data.shift();
                        }
                    }
                    
                    if (typeof additionData != 'undefined'
                        && this._optionRestore.series[seriesIdx].type == ecConfig.CHART_TYPE_PIE
                        && this._optionRestore.legend 
                        && this._optionRestore.legend.data
                    ) {
                        if (isHead) {
                            this._optionRestore.legend.data.unshift(additionData);
                            magicOption.legend.data.unshift(additionData);
                        }
                        else {
                            this._optionRestore.legend.data.push(additionData);
                            magicOption.legend.data.push(additionData);
                        }
                        if (!dataGrow) {
                            legendDataIdx = zrUtil.indexOf(
                                this._optionRestore.legend.data, data.name
                            );
                            legendDataIdx != -1 
                            && this._optionRestore.legend.data.splice(legendDataIdx, 1);
                            
                            legendDataIdx = zrUtil.indexOf(
                                magicOption.legend.data, data.name
                            );
                            legendDataIdx != -1 
                            && magicOption.legend.data.splice(legendDataIdx, 1);
                        }
                    } 
                    else if (typeof additionData != 'undefined'
                             && typeof this._optionRestore.xAxis != 'undefined'
                             && typeof this._optionRestore.yAxis != 'undefined'
                    ) {
                        // x轴类目
                        axisIdx = this._optionRestore.series[seriesIdx].xAxisIndex || 0;
                        if (typeof this._optionRestore.xAxis[axisIdx].type == 'undefined'
                            || this._optionRestore.xAxis[axisIdx].type == 'category'
                        ) {
                            if (isHead) {
                                this._optionRestore.xAxis[axisIdx].data.unshift(additionData);
                                magicOption.xAxis[axisIdx].data.unshift(additionData);
                                if (!dataGrow) {
                                    this._optionRestore.xAxis[axisIdx].data.pop();
                                    magicOption.xAxis[axisIdx].data.pop();
                                }
                            }
                            else {
                                this._optionRestore.xAxis[axisIdx].data.push(additionData);
                                magicOption.xAxis[axisIdx].data.push(additionData);
                                if (!dataGrow) {
                                    this._optionRestore.xAxis[axisIdx].data.shift();
                                    magicOption.xAxis[axisIdx].data.shift();
                                }
                            }
                        }
                        
                        // y轴类目
                        axisIdx = this._optionRestore.series[seriesIdx].yAxisIndex || 0;
                        if (this._optionRestore.yAxis[axisIdx].type == 'category') {
                            if (isHead) {
                                this._optionRestore.yAxis[axisIdx].data.unshift(additionData);
                                magicOption.yAxis[axisIdx].data.unshift(additionData);
                                if (!dataGrow) {
                                    this._optionRestore.yAxis[axisIdx].data.pop();
                                    magicOption.yAxis[axisIdx].data.pop();
                                }
                            }
                            else {
                                this._optionRestore.yAxis[axisIdx].data.push(additionData);
                                magicOption.yAxis[axisIdx].data.push(additionData);
                                if (!dataGrow) {
                                    this._optionRestore.yAxis[axisIdx].data.shift();
                                    magicOption.yAxis[axisIdx].data.shift();
                                }
                            }
                        }
                    }
                    // 同步图表内状态，动画需要
                    this._option.series[seriesIdx].data = magicOption.series[seriesIdx].data;
                }
            }
            
            this._zr.clearAnimation();
            for (var i = 0, l = this._chartList.length; i < l; i++) {
                if (magicOption.addDataAnimation 
                    && this._chartList[i].addDataAnimation
                ) {
                    this._chartList[i].addDataAnimation(params);
                }
            }
            // dataZoom同步数据
            this.component.dataZoom && this.component.dataZoom.syncOption(magicOption);
            
            this._option = magicOption;
            var self = this;
            setTimeout(function (){
                if (!self._zr) {
                    return; // 已经被释放
                }
                self._zr.clearAnimation();
                for (var i = 0, l = self._chartList.length; i < l; i++) {
                    // 有addData动画就去掉过渡动画
                    self._chartList[i].motionlessOnce = magicOption.addDataAnimation 
                                                        && self._chartList[i].addDataAnimation;
                }
                self._messageCenter.dispatch(
                    ecConfig.EVENT.REFRESH,
                    '',
                    {option: magicOption}
                );
            }, magicOption.addDataAnimation ? 500 : 0);
            return this;
        },

        /**
         * 动态[标注 | 标线]添加
         * @param {number} seriesIdx 系列索引
         * @param {Object} markData [标注 | 标线]对象，支持多个
         */
        addMarkPoint : function (seriesIdx, markData) {
            return this._addMark(seriesIdx, markData, 'markPoint');
        },
        
        addMarkLine : function (seriesIdx, markData) {
            return this._addMark(seriesIdx, markData, 'markLine');
        },
        
        _addMark : function (seriesIdx, markData, markType) {
            if (!(this._option.series && this._option.series[seriesIdx])) {
                return this;
            }
            this._option.series[seriesIdx][markType] 
                =  this._option.series[seriesIdx][markType] || {data: []};
            this._optionRestore.series[seriesIdx][markType] 
                =  this._optionRestore.series[seriesIdx][markType] || {data: []};
            for (var key in markData) {
                if (key == 'data') {
                    // 数据concat
                    this._option.series[seriesIdx][markType].data = 
                        this._option.series[seriesIdx][markType].data.concat(markData.data);
                    this._optionRestore.series[seriesIdx][markType].data = 
                        this._optionRestore.series[seriesIdx][markType].data.concat(markData.data);
                }
                else if (typeof markData[key] != 'object'
                      || typeof this._option.series[seriesIdx][markType][key] == 'undefined'
                ) {
                    // 简单类型或新值直接赋值
                    this._option.series[seriesIdx][markType][key] 
                        = this._optionRestore.series[seriesIdx][markType][key]
                        = markData[key];
                }
                else {
                    // 非数据的复杂对象merge
                    zrUtil.merge(
                        this._option.series[seriesIdx][markType][key], markData[key], true
                    );
                    zrUtil.merge(
                        this._optionRestore.series[seriesIdx][markType][key], markData[key], true
                    );
                }
            }
            
            var chart = this.chart[this._option.series[seriesIdx].type];
            chart && chart.addMark(seriesIdx, markData, markType);
            return this;
        },
        
        /**
         * 动态[标注 | 标线]删除
         * @param {number} seriesIdx 系列索引
         * @param {string} markName [标注 | 标线]名称
         */
        delMarkPoint : function (seriesIdx, markName) {
            return this._delMark(seriesIdx, markName, 'markPoint');
        },
        
        delMarkLine : function (seriesIdx, markName) {
            return this._delMark(seriesIdx, markName, 'markLine');
        },
        
        _delMark : function (seriesIdx, markName, markType) {
            if (!(this._option.series 
                  && this._option.series[seriesIdx] 
                  && this._option.series[seriesIdx][markType]
                  && this._option.series[seriesIdx][markType].data)
            ) {
                return this;
            }
            markName = markName.split(' > ');
            var targetIndex = -1;
            var dataArray =  this._option.series[seriesIdx][markType].data;
            for (var i = 0, l = dataArray.length; i < l; i++) {
                if (dataArray[i] instanceof Array) {
                    targetIndex = dataArray[i][0].name == markName[0] 
                                  && dataArray[i][1].name == markName[1] 
                                  ? i : -1;
                }
                else {
                    targetIndex = dataArray[i].name == markName[0] ? i : -1;
                }
                if (targetIndex != -1) {
                    break;
                }
            }
            
            if (targetIndex != -1) {
                this._option.series[seriesIdx][markType].data.splice(targetIndex, 1);
                this._optionRestore.series[seriesIdx][markType].data.splice(targetIndex, 1);
                var chart = this.chart[this._option.series[seriesIdx].type];
                chart && chart.delMark(seriesIdx, markName.join(' > '), markType);
            }
            
            return this;
        },
        
        /**
         * 获取当前dom 
         */
        getDom : function () {
            return this.dom;
        },
        
        /**
         * 获取当前zrender实例，可用于添加额为的shape和深度控制 
         */
        getZrender : function () {
            return this._zr;
        },

        /**
         * 获取Base64图片dataURL
         * @param {string} imgType 图片类型，支持png|jpeg，默认为png
         * @return imgDataURL
         */
        getDataURL : function (imgType) {
            if (!_canvasSupported) {
                return '';
            }
            if (this._chartList.length === 0) {
                // 渲染为图片
                var imgId = 'IMG' + this.id;
                var img = document.getElementById(imgId);
                if (img) {
                    return img.src;
                }
            }
            // 清除可能存在的tooltip元素
            this.component.tooltip && this.component.tooltip.hideTip();
                
            imgType = imgType || 'png';
            if (imgType != 'png' && imgType != 'jpeg') {
                imgType = 'png';
            }
            var bgColor = this._option.backgroundColor
                          && this._option.backgroundColor.replace(' ','') == 'rgba(0,0,0,0)'
                             ? '#fff' : this._option.backgroundColor;
            return this._zr.toDataURL('image/' + imgType, bgColor); 
        },

        /**
         * 获取img
         * @param {string} imgType 图片类型，支持png|jpeg，默认为png
         * @return img dom
         */
        getImage : function (imgType) {
            var imgDom = document.createElement('img');
            imgDom.src = this.getDataURL(imgType);
            imgDom.title = (this._optionRestore.title && this._optionRestore.title.text)
                           || 'ECharts';
            return imgDom;
        },
        
        /**
         * 获取多图联动的Base64图片dataURL
         * @param {string} imgType 图片类型，支持png|jpeg，默认为png
         * @return imgDataURL
         */
        getConnectedDataURL : function (imgType) {
            if (!this.isConnected()) {
                return this.getDataURL(imgType);
            }
            
            var tempDom;
            var domSize = [
                this.dom.offsetLeft, this.dom.offsetTop, 
                this.dom.offsetWidth, this.dom.offsetHeight
            ];
            var imgList = {
                'self' : {
                    img : this.getDataURL(imgType),
                    left : domSize[0],
                    top : domSize[1],
                    right : domSize[0] + domSize[2],
                    bottom : domSize[1] + domSize[3]
                }
            };
            var minLeft = imgList.self.left;
            var minTop = imgList.self.top;
            var maxRight = imgList.self.right;
            var maxBottom = imgList.self.bottom;
            for (var c in this._connected) {
                tempDom = this._connected[c].getDom();
                domSize = [
                    tempDom.offsetLeft, tempDom.offsetTop, 
                    tempDom.offsetWidth, tempDom.offsetHeight
                ];
                imgList[c] = {
                    img : this._connected[c].getDataURL(imgType),
                    left : domSize[0],
                    top : domSize[1],
                    right : domSize[0] + domSize[2],
                    bottom : domSize[1] + domSize[3]
                };
                minLeft = Math.min(minLeft, imgList[c].left);
                minTop = Math.min(minTop, imgList[c].top);
                maxRight = Math.max(maxRight, imgList[c].right);
                maxBottom = Math.max(maxBottom, imgList[c].bottom);
            }
            
            var zrDom = document.createElement('div');
            zrDom.style.position = 'absolute';
            zrDom.style.left = '-4000px';
            zrDom.style.width = (maxRight - minLeft) + 'px';
            zrDom.style.height = (maxBottom - minTop) + 'px';
            document.body.appendChild(zrDom);
            
            var zrImg = require('zrender').init(zrDom);
            
            var ImageShape = require('zrender/shape/Image');
            for (var c in imgList) {
                zrImg.addShape(new ImageShape({
                    style : {
                        x : imgList[c].left - minLeft,
                        y : imgList[c].top - minTop,
                        image : imgList[c].img
                    }
                }));
            }
            
            zrImg.render();
            var bgColor = this._option.backgroundColor 
                          && this._option.backgroundColor.replace(' ','') == 'rgba(0,0,0,0)'
                          ? '#fff' : this._option.backgroundColor;
                          
            var image = zrImg.toDataURL('image/png', bgColor);
            
            setTimeout(function () {
                zrImg.dispose();
                zrDom.parentNode.removeChild(zrDom);
                zrDom = null;
            },100);
            
            return image;
        },
        
        /**
         * 获取多图联动的img
         * @param {string} imgType 图片类型，支持png|jpeg，默认为png
         * @return img dom
         */
        getConnectedImage : function (imgType) {
            var imgDom = document.createElement('img');
            imgDom.src = this.getConnectedDataURL(imgType);
            imgDom.title = (this._optionRestore.title && this._optionRestore.title.text)
                           || 'ECharts';
            return imgDom;
        },

        /**
         * 绑定事件
         * @param {Object} eventName 事件名称
         * @param {Object} eventListener 事件响应函数
         */
        on : function (eventName, eventListener) {
            this._messageCenter.bind(eventName, eventListener);
            return this;
        },

        /**
         * 解除事件绑定
         * @param {Object} eventName 事件名称
         * @param {Object} eventListener 事件响应函数
         */
        un : function (eventName, eventListener) {
            this._messageCenter.unbind(eventName, eventListener);
            return this;
        },
        
        /**
         * 多图联动 
         * @param connectTarget{ECharts | Array <ECharts>} connectTarget 联动目标
         */
        connect : function (connectTarget) {
            if (!connectTarget) {
                return this;
            }
            
            if (!this._connected) {
                this._connected = {};
            }
            
            if (connectTarget instanceof Array) {
                for (var i = 0, l = connectTarget.length; i < l; i++) {
                    this._connected[connectTarget[i].id] = connectTarget[i];
                }
            }
            else {
                this._connected[connectTarget.id] = connectTarget;
            }
            
            return this;
        },
        
        /**
         * 解除多图联动 
         * @param connectTarget{ECharts | Array <ECharts>} connectTarget 解除联动目标
         */
        disConnect : function (connectTarget) {
            if (!connectTarget || !this._connected) {
                return this;
            }
            
            if (connectTarget instanceof Array) {
                for (var i = 0, l = connectTarget.length; i < l; i++) {
                    delete this._connected[connectTarget[i].id];
                }
            }
            else {
                delete this._connected[connectTarget.id];
            }
            
            for (var k in this._connected) {
                return k, this; // 非空
            }
            
            // 空，转为标志位
            this._connected = false;
            return this;
        },
        
        /**
         * 联动事件响应 
         */
        connectedEventHandler : function (param) {
            if (param.__echartsId != this.id) {
                // 来自其他联动图表的事件
                this._onevent(param);
            }
        },
        
        /**
         * 是否存在多图联动 
         */
        isConnected : function () {
            return !!this._connected;
        },
        
        /**
         * 显示loading过渡 
         * @param {Object} loadingOption
         */
        showLoading : function (loadingOption) {
            var effectList = {
                    bar : require('zrender/loadingEffect/Bar'),
                    bubble : require('zrender/loadingEffect/Bubble'),
                    dynamicLine : require('zrender/loadingEffect/DynamicLine'),
                    ring : require('zrender/loadingEffect/Ring'),
                    spin : require('zrender/loadingEffect/Spin'),
                    whirling : require('zrender/loadingEffect/Whirling')
                };
            this._toolbox.hideDataView();

            loadingOption = loadingOption || {};
            loadingOption.textStyle = loadingOption.textStyle || {};

            var finalTextStyle = zrUtil.merge(
                zrUtil.clone(loadingOption.textStyle),
                this._themeConfig.textStyle
            );
            loadingOption.textStyle.textFont = finalTextStyle.fontStyle + ' '
                                             + finalTextStyle.fontWeight + ' '
                                             + finalTextStyle.fontSize + 'px '
                                             + finalTextStyle.fontFamily;

            loadingOption.textStyle.text = loadingOption.text 
                                           || this._themeConfig.loadingText;

            if (typeof loadingOption.x != 'undefined') {
                loadingOption.textStyle.x = loadingOption.x;
            }
            if (typeof loadingOption.y != 'undefined') {
                loadingOption.textStyle.y = loadingOption.y;
            }
            
            loadingOption.effectOption = loadingOption.effectOption || {};
            loadingOption.effectOption.textStyle = loadingOption.textStyle;
            
            var Effect = loadingOption.effect;
            if (typeof Effect == 'string' || typeof Effect == 'undefined') {
                Effect =  effectList[loadingOption.effect || 'spin'];
            }
            this._zr.showLoading(new Effect(loadingOption.effectOption));
            return this;
        },

        /**
         * 隐藏loading过渡 
         */
        hideLoading : function () {
            this._zr.hideLoading();
            return this;
        },
        
        /**
         * 主题设置 
         */
        setTheme : function (theme) {
            if (theme) {
               if (typeof theme === 'string') {
                    // 默认主题
                    switch (theme) {
                        case 'default':
                            theme = require('./theme/default');
                            break;
                        default:
                            theme = require('./theme/default');
                    }
                }
                else {
                    theme = theme || {};
                }
                
                // 复位默认配置，别好心帮我改成_themeConfig = {};
                for (var key in this._themeConfig) {
                    delete this._themeConfig[key];
                }
                for (var key in ecConfig) {
                    this._themeConfig[key] = zrUtil.clone(ecConfig[key]);
                }
                
                // 颜色数组随theme，不merge
                theme.color && (this._themeConfig.color = []);
                
                // 默认标志图形类型列表，不merge
                theme.symbolList && (this._themeConfig.symbolList = []);
                
                // 应用新主题
                zrUtil.merge(this._themeConfig, zrUtil.clone(theme), true);
            }
            
            if (!_canvasSupported) {   // IE8-
                this._themeConfig.textStyle.fontFamily = this._themeConfig.textStyle.fontFamily2;
            }
            
            this._optionRestore && this.restore();
        },

        /**
         * 视图区域大小变化更新，不默认绑定，供使用方按需调用 
         */
        resize : function () {
            var self = this;
            return function(){
                self._zr.resize();
                if (self._option.renderAsImage && _canvasSupported) {
                    // 渲染为图片重走render模式
                    self._render(self._option);
                    return self;
                }
                // 停止动画
                self._zr.clearAnimation();
                self._zr.modLayer(ecConfig.EFFECT_ZLEVEL, { motionBlur : false});
                self._island.resize();
                self._toolbox.resize();
                self._timeline && self._timeline.resize();
                // 先来后到，不能仅刷新自己，也不能在上一个循环中刷新，如坐标系数据改变会影响其他图表的大小
                // 所以安顺序刷新各种图表，图表内部refresh优化无需更新则不更新~
                for (var i = 0, l = self._chartList.length; i < l; i++) {
                    self._chartList[i].resize && self._chartList[i].resize();
                }
                self.component.grid && self.component.grid.refixAxisShape(self.component);
                self._zr.refresh();
                self._messageCenter.dispatch(ecConfig.EVENT.RESIZE);
                return self;
            };
        },
        
        /**
         * 清除已渲染内容 ，clear后echarts实例可用
         */
        clear : function () {
            this._disposeChartList();
            this._zr.clear();
            this._option = {};
            this._optionRestore = {};
            return this;
        },

        /**
         * 释放，dispose后echarts实例不可用
         */
        dispose : function () {
            var key = this.dom.getAttribute(DOM_ATTRIBUTE_KEY);
            key && delete _instances[key];
        
            this._island.dispose();
            this._toolbox.dispose();
            this._timeline && this._timeline.dispose();
            this._messageCenter.unbind();
            this.clear();
            this._zr.dispose();
            this._zr = null;
            return;
        }
    };

    return self;
});