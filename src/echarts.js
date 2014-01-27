/*!
 * ECharts, a javascript interactive chart library.
 *  
 * Copyright (c) 2013, Baidu Inc.
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
define(function(require) {
    var self = {};
    var echarts = self;     // 提供内部反向使用静态方法；
    self.version = '1.3.7';
    self.dependencies = {
        zrender : '1.0.9'
    };
    /**
     * 入口方法 
     */
    self.init = function(dom/*, theme*/) {
        dom = dom instanceof Array ? dom[0] : dom;
        if (G_vmlCanvasManager) {
            // IE8-
            var ecConfig = require('./config');
            ecConfig.textStyle.fontFamily = ecConfig.textStyle.fontFamily2;
        }
        return new Echarts(dom);
    };

    /**
     * 基于zrender实现Echarts接口层
     * @param {HtmlElement} dom 必要
     * @param {Object} option 可选参数，同setOption
     */
    function Echarts(dom, option) {
        var ecConfig = require('./config');

        var self = this;
        var _id = '__ECharts__' + new Date() - 0;
        var _zr;
        var _option;
        var _optionBackup;          // for各种change和zoom
        var _optionRestore;         // for restore;
        var _chartList;             // 图表实例
        var _messageCenter;         // Echarts层的消息中心，做zrender原始事件转换

        var _status = {         // 用于图表间通信
            dragIn : false,
            dragOut : false,
            needRefresh : false
        };

        var _selectedMap;
        var _island;
        var _toolbox;
        
        var _refreshInside;     // 内部刷新标志位

        // 初始化::构造函数
        _init();
        function _init() {
            var zrender = require('zrender');
            if (((zrender.version || '1.0.3').replace('.', '') - 0)
                < (echarts.dependencies.zrender.replace('.', '') - 0)
            ) {
                console.error(
                    'ZRender ' + (zrender.version || '1.0.3-') 
                    + ' is too old for ECharts ' + echarts.version 
                    + '. Current version need ZRender ' 
                    + echarts.dependencies.zrender + '+'
                );
            }
            _zr = zrender.init(dom);

            var zrUtil = require('zrender/tool/util');
            _option = zrUtil.clone(option || {});

            _chartList = [];            // 图表实例

            _messageCenter = {};        // Echarts层的消息中心，做zrender原始事件转换
            // 添加消息中心的事件分发器特性
            var zrEvent = require('zrender/tool/event');
            zrEvent.Dispatcher.call(_messageCenter);
            _messageCenter.bind(
                ecConfig.EVENT.LEGEND_SELECTED, _onlegendSelected
            );
            _messageCenter.bind(
                ecConfig.EVENT.DATA_ZOOM, _ondataZoom
            );
            _messageCenter.bind(
                ecConfig.EVENT.DATA_RANGE, _ondataRange
            );
            _messageCenter.bind(
                ecConfig.EVENT.MAGIC_TYPE_CHANGED, _onmagicTypeChanged
            );
            _messageCenter.bind(
                ecConfig.EVENT.DATA_VIEW_CHANGED, _ondataViewChanged
            );
            _messageCenter.bind(
                ecConfig.EVENT.TOOLTIP_HOVER, _tooltipHover
            );
            _messageCenter.bind(
                ecConfig.EVENT.RESTORE, _onrestore
            );
            _messageCenter.bind(
                ecConfig.EVENT.REFRESH, _onrefresh
            );

            var zrConfig = require('zrender/config');
            _zr.on(zrConfig.EVENT.CLICK, _onclick);
            _zr.on(zrConfig.EVENT.MOUSEOVER, _onhover);
            _zr.on(zrConfig.EVENT.MOUSEWHEEL, _onmousewheel);
            _zr.on(zrConfig.EVENT.DRAGSTART, _ondragstart);
            _zr.on(zrConfig.EVENT.DRAGEND, _ondragend);
            _zr.on(zrConfig.EVENT.DRAGENTER, _ondragenter);
            _zr.on(zrConfig.EVENT.DRAGOVER, _ondragover);
            _zr.on(zrConfig.EVENT.DRAGLEAVE, _ondragleave);
            _zr.on(zrConfig.EVENT.DROP, _ondrop);

            // 动态扩展zrender shape：icon、markLine
            require('./util/shape/icon');
            require('./util/shape/markLine');

            // 内置图表注册
            var chartLibrary = require('./chart');
            require('./chart/island');
            // 孤岛
            var Island = chartLibrary.get('island');
            _island = new Island(_messageCenter, _zr);
            
            // 内置组件注册
            var componentLibrary = require('./component');
            require('./component/title');
            require('./component/axis');
            require('./component/categoryAxis');
            require('./component/valueAxis');
            require('./component/grid');
            require('./component/dataZoom');
            require('./component/legend');
            require('./component/dataRange');
            require('./component/tooltip');
            require('./component/toolbox');
            require('./component/dataView');
            require('./component/polar');
            // 工具箱
            var Toolbox = componentLibrary.get('toolbox');
            _toolbox = new Toolbox(_messageCenter, _zr, dom);
            
            _disposeChartList();
        }

        /**
         * 点击事件，响应zrender事件，包装后分发到Echarts层
         */
        function _onclick(param) {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].onclick
                && _chartList[len].onclick(param);
            }
            if (param.target) {
                var ecData = _eventPackage(param.target);
                if (ecData && typeof ecData.seriesIndex != 'undefined') {
                    _messageCenter.dispatch(
                        ecConfig.EVENT.CLICK,
                        param.event,
                        ecData
                    );
                }
            }
        }

         /**
         * 悬浮事件，响应zrender事件，包装后分发到Echarts层
         */
        function _onhover(param) {
            if (param.target) {
                var ecData = _eventPackage(param.target);
                if (ecData && typeof ecData.seriesIndex != 'undefined') {
                    _messageCenter.dispatch(
                        ecConfig.EVENT.HOVER,
                        param.event,
                        ecData
                    );
                }
            }
        }

        /**
         * 滚轮回调，孤岛可计算特性
         */
        function _onmousewheel(param) {
            _messageCenter.dispatch(
                ecConfig.EVENT.MOUSEWHEEL,
                param.event,
                _eventPackage(param.target)
            );
        }

        /**
         * dragstart回调，可计算特性实现
         */
        function _ondragstart(param) {
            // 复位用于图表间通信拖拽标识
            _status = {
                dragIn : false,
                dragOut : false,
                needRefresh : false
            };
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondragstart
                && _chartList[len].ondragstart(param);
            }

        }

        /**
         * dragging回调，可计算特性实现
         */
        function _ondragenter(param) {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondragenter
                && _chartList[len].ondragenter(param);
            }
        }

        /**
         * dragstart回调，可计算特性实现
         */
        function _ondragover(param) {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondragover
                && _chartList[len].ondragover(param);
            }
        }
        /**
         * dragstart回调，可计算特性实现
         */
        function _ondragleave(param) {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondragleave
                && _chartList[len].ondragleave(param);
            }
        }

        /**
         * dragstart回调，可计算特性实现
         */
        function _ondrop(param) {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondrop
                && _chartList[len].ondrop(param, _status);
            }
            _island.ondrop(param, _status);
        }

        /**
         * dragdone回调 ，可计算特性实现
         */
        function _ondragend(param) {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondragend
                && _chartList[len].ondragend(param, _status);
            }
            _island.ondragend(param, _status);

            // 发生过重计算
            if (_status.needRefresh) {
                _syncBackupData(_island.getOption());
                _messageCenter.dispatch(
                    ecConfig.EVENT.DATA_CHANGED,
                    param.event,
                    _eventPackage(param.target)
                );
                _messageCenter.dispatch(ecConfig.EVENT.REFRESH);
            }
        }

        /**
         * 图例选择响应
         */
        function _onlegendSelected(param) {
            // 用于图表间通信
            _status.needRefresh = false;
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].onlegendSelected
                && _chartList[len].onlegendSelected(param, _status);
            }
            
            _selectedMap = param.selected;

            if (_status.needRefresh) {
                _messageCenter.dispatch(ecConfig.EVENT.REFRESH);
            }
        }

        /**
         * 数据区域缩放响应 
         */
        function _ondataZoom(param) {
            // 用于图表间通信
            _status.needRefresh = false;
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondataZoom
                && _chartList[len].ondataZoom(param, _status);
            }

            if (_status.needRefresh) {
                _messageCenter.dispatch(ecConfig.EVENT.REFRESH);
            }
        }

        /**
         * 值域漫游响应 
         */
        function _ondataRange(param) {
            // 用于图表间通信
            _status.needRefresh = false;
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondataRange
                && _chartList[len].ondataRange(param, _status);
            }

            // 没有相互影响，直接刷新即可
            if (_status.needRefresh) {
                _zr.refresh();
            }
        }

        /**
         * 动态类型切换响应 
         */
        function _onmagicTypeChanged() {
            _render(_getMagicOption());
        }

        /**
         * 数据视图修改响应 
         */
        function _ondataViewChanged(param) {
            _syncBackupData(param.option);
            _messageCenter.dispatch(
                ecConfig.EVENT.DATA_CHANGED,
                null,
                param
            );
            _messageCenter.dispatch(ecConfig.EVENT.REFRESH);
        }
        
        /**
         * tooltip与图表间通信 
         */
        function _tooltipHover(param) {
            var len = _chartList.length;
            var tipShape = [];
            while (len--) {
                _chartList[len]
                && _chartList[len].ontooltipHover
                && _chartList[len].ontooltipHover(param, tipShape);
            }
        }

        /**
         * 还原 
         */
        function _onrestore() {
            self.restore();
        }

        /**
         * 刷新 
         */
        function _onrefresh(param) {
            _refreshInside = true;
            self.refresh(param);
            _refreshInside = false;
        }

        /**
         * 当前正在使用的option，还原可能存在的dataZoom
         */
        function _getMagicOption(targetOption) {
            var magicOption = targetOption || _toolbox.getMagicOption();
            var len;
            // 横轴数据还原
            if (_optionBackup.xAxis) {
                if (_optionBackup.xAxis instanceof Array) {
                    len = _optionBackup.xAxis.length;
                    while (len--) {
                        magicOption.xAxis[len].data =
                            _optionBackup.xAxis[len].data;
                    }
                }
                else {
                    magicOption.xAxis.data = _optionBackup.xAxis.data;
                }
            }
            
            // 纵轴数据还原
            if (_optionBackup.yAxis) {
                if (_optionBackup.yAxis instanceof Array) {
                    len = _optionBackup.yAxis.length;
                    while (len--) {
                        magicOption.yAxis[len].data =
                            _optionBackup.yAxis[len].data;
                    }
                }
                else {
                    magicOption.yAxis.data = _optionBackup.yAxis.data;
                }
            }

            // 系列数据还原
            len = magicOption.series.length;
            while (len--) {
                magicOption.series[len].data = _optionBackup.series[len].data;
            }
            return magicOption;
        }
        
        /**
         * 数据修改后的反向同步备份数据 
         */
        function _syncBackupData(curOption) {
            if ((curOption.dataZoom && curOption.dataZoom.show)
                || (curOption.toolbox
                    && curOption.toolbox.show
                    && curOption.toolbox.feature
                    && curOption.toolbox.feature.dataZoom
                )
            ) {
                // 有dataZoom就dataZoom做同步
                for (var i = 0, l = _chartList.length; i < l; i++) {
                    if (_chartList[i].type == ecConfig.COMPONENT_TYPE_DATAZOOM
                    ) {
                        _chartList[i].syncBackupData(curOption, _optionBackup);
                        return;
                    }
                }
            }
            
            // 没有就ECharts做
            var curSeries = curOption.series;
            var curData;
            for (var i = 0, l = curSeries.length; i < l; i++) {
                curData = curSeries[i].data;
                for (var j = 0, k = curData.length; j < k; j++) {
                    _optionBackup.series[i].data[j] = curData[j];
                }
            }
        }

        /**
         * 打包Echarts层的事件附件
         */
        function _eventPackage(target) {
            if (target) {
                var ecData = require('./util/ecData');
                
                var seriesIndex = ecData.get(target, 'seriesIndex');
                var dataIndex = ecData.get(target, 'dataIndex');
                
                dataIndex = self.component.dataZoom
                            ? self.component.dataZoom.getRealDataIndex(
                                seriesIndex,
                                dataIndex
                              )
                            : dataIndex;
                return {
                    seriesIndex : seriesIndex,
                    dataIndex : dataIndex,
                    data : ecData.get(target, 'data'),
                    name : ecData.get(target, 'name'),
                    value : ecData.get(target, 'value')
                };
            }
            return;
        }

        /**
         * 图表渲染 
         */
        function _render(magicOption) {
            _disposeChartList();
            _zr.clear();

            var chartLibrary = require('./chart');
            var componentLibrary = require('./component');

            // 标题
            var title;
            if (magicOption.title) {
                var Title = new componentLibrary.get('title');
                title = new Title(
                    _messageCenter, _zr, magicOption
                );
                _chartList.push(title);
                self.component.title = title;
            }

            // 提示
            var tooltip;
            if (magicOption.tooltip) {
                var Tooltip = componentLibrary.get('tooltip');
                tooltip = new Tooltip(_messageCenter, _zr, magicOption, dom);
                _chartList.push(tooltip);
                self.component.tooltip = tooltip;
            }

            // 图例
            var legend;
            if (magicOption.legend) {
                var Legend = new componentLibrary.get('legend');
                legend = new Legend(
                    _messageCenter, _zr, magicOption, _selectedMap
                );
                _chartList.push(legend);
                self.component.legend = legend;
            }

            // 值域控件
            var dataRange;
            if (magicOption.dataRange) {
                var DataRange = new componentLibrary.get('dataRange');
                dataRange = new DataRange(
                    _messageCenter, _zr, magicOption
                );
                _chartList.push(dataRange);
                self.component.dataRange = dataRange;
            }

            // 直角坐标系
            var grid;
            var dataZoom;
            var xAxis;
            var yAxis;
            if (magicOption.grid || magicOption.xAxis || magicOption.yAxis) {
                var Grid = componentLibrary.get('grid');
                grid = new Grid(_messageCenter, _zr, magicOption);
                _chartList.push(grid);
                self.component.grid = grid;

                var DataZoom = componentLibrary.get('dataZoom');
                dataZoom = new DataZoom(
                    _messageCenter,
                    _zr,
                    magicOption,
                    {
                        'legend' : legend,
                        'grid' : grid
                    }
                );
                _chartList.push(dataZoom);
                self.component.dataZoom = dataZoom;

                var Axis = componentLibrary.get('axis');
                xAxis = new Axis(
                    _messageCenter,
                    _zr,
                    magicOption,
                    {
                        'legend' : legend,
                        'grid' : grid
                    },
                    'xAxis'
                );
                _chartList.push(xAxis);
                self.component.xAxis = xAxis;

                yAxis = new Axis(
                    _messageCenter,
                    _zr,
                    magicOption,
                    {
                        'legend' : legend,
                        'grid' : grid
                    },
                    'yAxis'
                );
                _chartList.push(yAxis);
                self.component.yAxis = yAxis;
            }

            // 极坐标系
            var polar;
            if (magicOption.polar) {
                var Polar = componentLibrary.get('polar');
                polar = new Polar(
                    _messageCenter,
                    _zr,
                    magicOption,
                    {
                        'legend' : legend
                    }
                );
                _chartList.push(polar);
                self.component.polar = polar;
            }
            
            tooltip && tooltip.setComponent({
                'grid' : grid,
                'xAxis' : xAxis,
                'yAxis' : yAxis,
                'polar' : polar
            });

            var ChartClass;
            var chartType;
            var chart;
            var chartMap = {};      // 记录已经初始化的图表
            for (var i = 0, l = magicOption.series.length; i < l; i++) {
                chartType = magicOption.series[i].type;
                if (!chartType) {
                    continue;
                }
                if (!chartMap[chartType]) {
                    chartMap[chartType] = true;
                    ChartClass = chartLibrary.get(chartType);
                    if (ChartClass) {
                        chart = new ChartClass(
                            _messageCenter,
                            _zr,
                            magicOption,
                            {
                                'tooltip' : tooltip,
                                'legend' : legend,
                                'dataRange' : dataRange,
                                'grid' : grid,
                                'xAxis' : xAxis,
                                'yAxis' : yAxis,
                                'polar' : polar
                            }
                        );
                        _chartList.push(chart);
                        self.chart[chartType] = chart;
                    }
                }
            }

            _island.render(magicOption);

            _toolbox.render(magicOption, {dataZoom: dataZoom});

            if (magicOption.animation && !magicOption.renderAsImage) {
                var len = _chartList.length;
                while (len--) {
                    chart = _chartList[len];                 
                    if (chart 
                        && chart.animation 
                        && chart.shapeList 
                        && chart.shapeList.length 
                           < magicOption.animationThreshold
                    ) {
                        chart.animation();
                    }
                }
            }

            _zr.render();
            
            var imgId = 'IMG' + _id;
            var img = document.getElementById(imgId);
            if (magicOption.renderAsImage && !G_vmlCanvasManager) {
                // IE8- 不支持图片渲染形式
                if (img) {
                    // 已经渲染过则更新显示
                    img.src = getDataURL(magicOption.renderAsImage);
                }
                else {
                    // 没有渲染过插入img dom
                    img = getImage(magicOption.renderAsImage);
                    img.id = imgId;
                    img.style.position = 'absolute';
                    img.style.left = 0;
                    img.style.top = 0;
                    dom.firstChild.appendChild(img);
                }
                un();
                _zr.un();
                _disposeChartList();
                _zr.clear();
            }
            else if (img) {
                // 删除可能存在的img
                img.parentNode.removeChild(img);
            }
            img = null;
        }

        /**
         * 还原 
         */
        function restore() {
            var zrUtil = require('zrender/tool/util');
            if (_optionRestore.legend && _optionRestore.legend.selected) {
                _selectedMap = _optionRestore.legend.selected;
            }
            else {
                _selectedMap = {};
            }
            _optionBackup = zrUtil.clone(_optionRestore);
            _option = zrUtil.clone(_optionRestore);
            _island.clear();
            _toolbox.reset(_option);
            _render(_option);
        }

        /**
         * 刷新 
         * @param {Object=} param，可选参数，用于附带option，内部同步用，外部不建议带入数据修改，无法同步 
         */
        function refresh(param) {
            param = param || {};
            var magicOption = param.option;
            
            // 外部调用的refresh且有option带入
            if (!_refreshInside && param.option) {
                // 做简单的差异合并去同步内部持有的数据克隆，不建议带入数据
                // 开启数据区域缩放、拖拽重计算、数据视图可编辑模式情况下，当用户产生了数据变化后无法同步
                // 如有带入option存在数据变化，请重新setOption
                var zrUtil = require('zrender/tool/util');
                if (_optionBackup.toolbox
                    && _optionBackup.toolbox.show
                    && _optionBackup.toolbox.feature.magicType
                    && _optionBackup.toolbox.feature.magicType.length > 0
                ) {
                    magicOption = _getMagicOption();
                }
                else {
                    magicOption = _getMagicOption(_island.getOption());
                }
                zrUtil.merge(
                    magicOption, param.option,
                    { 'overwrite': true, 'recursive': true }
                );
                zrUtil.merge(
                    _optionBackup, param.option,
                    { 'overwrite': true, 'recursive': true }
                );
                zrUtil.merge(
                    _optionRestore, param.option,
                    { 'overwrite': true, 'recursive': true }
                );
                _island.refresh(magicOption);
                _toolbox.refresh(magicOption);
            }
            
            // 先来后到，安顺序刷新各种图表，图表内部refresh优化检查magicOption，无需更新则不更新~
            for (var i = 0, l = _chartList.length; i < l; i++) {
                _chartList[i].refresh && _chartList[i].refresh(magicOption);
            }
            _zr.refresh();
        }

        /**
         * 释放图表实例
         */
        function _disposeChartList() {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].dispose 
                && _chartList[len].dispose();
            }
            _chartList = [];
            
            self.chart = {
                island : _island
            };
            self.component = {
                toolbox : _toolbox
            };
        }

        /**
         * 万能接口，配置图表实例任何可配置选项，多次调用时option选项做merge处理
         * @param {Object} option
         * @param {boolean=} notMerge 多次调用时option选项是默认是合并（merge）的，
         *                   如果不需求，可以通过notMerger参数为true阻止与上次option的合并
         */
        function setOption(option, notMerge) {
            var zrUtil = require('zrender/tool/util');
            if (!notMerge) {
                zrUtil.merge(
                    _option,
                    zrUtil.clone(option),
                    {
                        'overwrite': true,
                        'recursive': true
                    }
                );
            }
            else {
                _option = zrUtil.clone(option);
            }

            if (!_option.series || _option.series.length === 0) {
                return;
            }

            // 非图表全局属性merge~~
            if (typeof _option.calculable == 'undefined') {
                _option.calculable = ecConfig.calculable;
            }
            if (typeof _option.nameConnector == 'undefined') {
                _option.nameConnector = ecConfig.nameConnector;
            }
            if (typeof _option.valueConnector == 'undefined') {
                _option.valueConnector = ecConfig.valueConnector;
            }
            if (typeof _option.animation == 'undefined') {
                _option.animation = ecConfig.animation;
            }
            if (typeof _option.animationThreshold == 'undefined') {
                _option.animationThreshold = ecConfig.animationThreshold;
            }
            if (typeof _option.animationDuration == 'undefined') {
                _option.animationDuration = ecConfig.animationDuration;
            }
            if (typeof _option.animationEasing == 'undefined') {
                _option.animationEasing = ecConfig.animationEasing;
            }
            if (typeof _option.addDataAnimation == 'undefined') {
                _option.addDataAnimation = ecConfig.addDataAnimation;
            }

            var zrColor = require('zrender/tool/color');
            // 数值系列的颜色列表，不传则采用内置颜色，可配数组
            if (_option.color && _option.color.length > 0) {
                _zr.getColor = function(idx) {
                    return zrColor.getColor(idx, _option.color);
                };
            }
            else {
                _zr.getColor = function(idx) {
                    return zrColor.getColor(idx, ecConfig.color);
                };
            }
            // calculable可计算颜色提示
            _zr.getCalculableColor = function () {
                return _option.calculableColor || ecConfig.calculableColor;
            };

            _optionBackup = zrUtil.clone(_option);
            _optionRestore = zrUtil.clone(_option);
            
            if (_option.legend && _option.legend.selected) {
                _selectedMap = _option.legend.selected;
            }
            else {
                _selectedMap = {};
            }

            _island.clear();
            _toolbox.reset(_option);
            _render(_option);
            return self;
        }

        /**
         * 返回内部持有的当前显示option克隆 
         */
        function getOption() {
            var zrUtil = require('zrender/tool/util');
            if (_optionBackup.toolbox
                && _optionBackup.toolbox.show
                && _optionBackup.toolbox.feature.magicType
                && _optionBackup.toolbox.feature.magicType.length > 0
            ) {
                 return zrUtil.clone(_getMagicOption());
            }
            else {
                 return zrUtil.clone(_getMagicOption(_island.getOption()));
            }
        }

        /**
         * 数据设置快捷接口
         * @param {Array} series
         * @param {boolean=} notMerge 多次调用时option选项是默认是合并（merge）的，
         *                   如果不需求，可以通过notMerger参数为true阻止与上次option的合并。
         */
        function setSeries(series, notMerge) {
            if (!notMerge) {
                self.setOption({series: series});
            }
            else {
                _option.series = series;
                self.setOption(_option, notMerge);
            }
            return self;
        }

        /**
         * 返回内部持有的当前显示series克隆 
         */
        function getSeries() {
            return getOption().series;
        }
        
        /**
         * 动态数据添加
         * 形参为单组数据参数，多组时为数据，内容同[seriesIdx, data, isShift, additionData]
         * @param {number} seriesIdx 系列索引
         * @param {number | Object} data 增加数据
         * @param {boolean=} isHead 是否队头加入，默认，不指定或false时为队尾插入
         * @param {boolean=} dataGrow 是否增长数据队列长度，默认，不指定或false时移出目标数组对位数据
         * @param {string=} additionData 是否增加类目轴(饼图为图例)数据，附加操作同isHead和dataGrow
         */
        function addData(seriesIdx, data, isHead, dataGrow, additionData) {
            var zrUtil = require('zrender/tool/util');
            var params = seriesIdx instanceof Array
                         ? seriesIdx
                         : [[seriesIdx, data, isHead, dataGrow, additionData]];
            var axisIdx;
            var legendDataIdx;
            var magicOption;
            if (_optionBackup.toolbox
                && _optionBackup.toolbox.show
                && _optionBackup.toolbox.feature.magicType
                && _optionBackup.toolbox.feature.magicType.length > 0
            ) {
                magicOption = _getMagicOption();
            }
            else {
                magicOption = _getMagicOption(_island.getOption());
            }
            //_optionRestore 和 _optionBackup都要同步
            for (var i = 0, l = params.length; i < l; i++) {
                seriesIdx = params[i][0];
                data = params[i][1];
                isHead = params[i][2];
                dataGrow = params[i][3];
                additionData = params[i][4];
                if (_optionRestore.series[seriesIdx]) {
                    if (isHead) {
                        _optionRestore.series[seriesIdx].data.unshift(data);
                        _optionBackup.series[seriesIdx].data.unshift(data);
                        if (!dataGrow) {
                            _optionRestore.series[seriesIdx].data.pop();
                            data = _optionBackup.series[seriesIdx].data.pop();
                        }
                    }
                    else {
                        _optionRestore.series[seriesIdx].data.push(data);
                        _optionBackup.series[seriesIdx].data.push(data);
                        if (!dataGrow) {
                            _optionRestore.series[seriesIdx].data.shift();
                            data = _optionBackup.series[seriesIdx].data.shift();
                        }
                    }
                    
                    if (typeof additionData != 'undefined'
                        && _optionRestore.series[seriesIdx].type 
                           == ecConfig.CHART_TYPE_PIE
                        && _optionBackup.legend 
                        && _optionBackup.legend.data
                    ) {
                        magicOption.legend.data = _optionBackup.legend.data;
                        if (isHead) {
                            _optionRestore.legend.data.unshift(additionData);
                            _optionBackup.legend.data.unshift(additionData);
                        }
                        else {
                            _optionRestore.legend.data.push(additionData);
                            _optionBackup.legend.data.push(additionData);
                        }
                        if (!dataGrow) {
                            legendDataIdx = zrUtil.indexOf(
                                _optionBackup.legend.data,
                                data.name
                            );
                            legendDataIdx != -1
                            && (
                                _optionRestore.legend.data.splice(
                                    legendDataIdx, 1
                                ),
                                _optionBackup.legend.data.splice(
                                    legendDataIdx, 1
                                )
                            );
                        }
                        _selectedMap[additionData] = true;
                    } 
                    else  if (typeof additionData != 'undefined'
                        && typeof _optionRestore.xAxis != 'undefined'
                        && typeof _optionRestore.yAxis != 'undefined'
                    ) {
                        // x轴类目
                        axisIdx = _optionRestore.series[seriesIdx].xAxisIndex
                                  || 0;
                        if (typeof _optionRestore.xAxis[axisIdx].type 
                            == 'undefined'
                            || _optionRestore.xAxis[axisIdx].type == 'category'
                        ) {
                            if (isHead) {
                                _optionRestore.xAxis[axisIdx].data.unshift(
                                    additionData
                                );
                                _optionBackup.xAxis[axisIdx].data.unshift(
                                    additionData
                                );
                                if (!dataGrow) {
                                    _optionRestore.xAxis[axisIdx].data.pop();
                                    _optionBackup.xAxis[axisIdx].data.pop();
                                }
                            }
                            else {
                                _optionRestore.xAxis[axisIdx].data.push(
                                    additionData
                                );
                                _optionBackup.xAxis[axisIdx].data.push(
                                    additionData
                                );
                                if (!dataGrow) {
                                    _optionRestore.xAxis[axisIdx].data.shift();
                                    _optionBackup.xAxis[axisIdx].data.shift();
                                }
                            }
                        }
                        
                        // y轴类目
                        axisIdx = _optionRestore.series[seriesIdx].yAxisIndex
                                  || 0;
                        if (_optionRestore.yAxis[axisIdx].type == 'category') {
                            if (isHead) {
                                _optionRestore.yAxis[axisIdx].data.unshift(
                                    additionData
                                );
                                _optionBackup.yAxis[axisIdx].data.unshift(
                                    additionData
                                );
                                if (!dataGrow) {
                                    _optionRestore.yAxis[axisIdx].data.pop();
                                    _optionBackup.yAxis[axisIdx].data.pop();
                                }
                            }
                            else {
                                _optionRestore.yAxis[axisIdx].data.push(
                                    additionData
                                );
                                _optionBackup.yAxis[axisIdx].data.push(
                                    additionData
                                );
                                if (!dataGrow) {
                                    _optionRestore.yAxis[axisIdx].data.shift();
                                    _optionBackup.yAxis[axisIdx].data.shift();
                                }
                            }
                        }
                    }
                }
            }
            magicOption.legend && (magicOption.legend.selected = _selectedMap);
            // dataZoom同步数据
            for (var i = 0, l = _chartList.length; i < l; i++) {
                if (magicOption.addDataAnimation 
                    && _chartList[i].addDataAnimation
                ) {
                    _chartList[i].addDataAnimation(params);
                }
                if (_chartList[i].type 
                    == ecConfig.COMPONENT_TYPE_DATAZOOM
                ) {
                    _chartList[i].silence(true);
                    _chartList[i].init(magicOption);
                    _chartList[i].silence(false);
                }
            }
            _island.refresh(magicOption);
            _toolbox.refresh(magicOption);
            setTimeout(function(){
                _messageCenter.dispatch(
                    ecConfig.EVENT.REFRESH,
                    '',
                    {option: magicOption}
                );
            }, magicOption.addDataAnimation ? 500 : 0);
            return self;
        }

        /**
         * 获取当前zrender实例，可用于添加额为的shape和深度控制 
         */
        function getZrender() {
            return _zr;
        }

        /**
         * 获取Base64图片dataURL
         * @param {string} imgType 图片类型，支持png|jpeg，默认为png
         * @return imgDataURL
         */
        function getDataURL(imgType) {
            if (G_vmlCanvasManager) {
                return '';
            }
            if (_chartList.length === 0) {
                // 渲染为图片
                var imgId = 'IMG' + _id;
                var img = document.getElementById(imgId);
                if (img) {
                    return img.src;
                }
            }
            imgType = imgType || 'png';
            if (imgType != 'png' && imgType != 'jpeg') {
                imgType = 'png';
            }
            return _zr.toDataURL('image/' + imgType); 
        }

        /**
         * 获取img
         * @param {string} imgType 图片类型，支持png|jpeg，默认为png
         * @return img dom
         */
        function getImage(imgType) {
            var imgDom = document.createElement('img');
            imgDom.src = getDataURL(imgType);
            imgDom.title = (_optionRestore.title && _optionRestore.title.text)
                           || 'ECharts';
            return imgDom;
        }

        /**
         * 绑定事件
         * @param {Object} eventName 事件名称
         * @param {Object} eventListener 事件响应函数
         */
        function on(eventName, eventListener) {
            _messageCenter.bind(eventName, eventListener);
            return self;
        }

        /**
         * 解除事件绑定
         * @param {Object} eventName 事件名称
         * @param {Object} eventListener 事件响应函数
         */
        function un(eventName, eventListener) {
            _messageCenter.unbind(eventName, eventListener);
            return self;
        }

        /**
         * 显示loading过渡 
         * @param {Object} loadingOption
         */
        function showLoading(loadingOption) {
            _toolbox.hideDataView();

            var zrUtil = require('zrender/tool/util');
            loadingOption = loadingOption || {};
            loadingOption.textStyle = loadingOption.textStyle || {};

            var finalTextStyle = zrUtil.merge(
                zrUtil.clone(loadingOption.textStyle),
                ecConfig.textStyle,
                { 'overwrite': false}
            );
            loadingOption.textStyle.textFont = finalTextStyle.fontStyle + ' '
                                            + finalTextStyle.fontWeight + ' '
                                            + finalTextStyle.fontSize + 'px '
                                            + finalTextStyle.fontFamily;

            loadingOption.textStyle.text = loadingOption.text 
                                           || ecConfig.loadingText;

            if (typeof loadingOption.x != 'undefined') {
                loadingOption.textStyle.x = loadingOption.x;
            }

            if (typeof loadingOption.y != 'undefined') {
                loadingOption.textStyle.y = loadingOption.y;
            }
            _zr.showLoading(loadingOption);

            return self;
        }

        /**
         * 隐藏loading过渡 
         */
        function hideLoading() {
            _zr.hideLoading();
            return self;
        }

        /**
         * 视图区域大小变化更新，不默认绑定，供使用方按需调用 
         */
        function resize() {
            _zr.resize();
            if (_option.renderAsImage && !G_vmlCanvasManager) {
                // 渲染为图片重走render模式
                _render(_option);
                return self;
            }
            // 先来后到，不能仅刷新自己，也不能在上一个循环中刷新，如坐标系数据改变会影响其他图表的大小
            // 所以安顺序刷新各种图表，图表内部refresh优化无需更新则不更新~
            for (var i = 0, l = _chartList.length; i < l; i++) {
                _chartList[i].resize && _chartList[i].resize();
            }
            _island.resize();
            _toolbox.resize();
            _zr.refresh();
            _messageCenter.dispatch(
                ecConfig.EVENT.RESIZE
            );
            return self;
        }

        /**
         * 清楚已渲染内容 ，clear后echarts实例可用
         */
        function clear() {
            _zr.clear();
            return self;
        }

        /**
         * 释放，dispose后echarts实例不可用
         */
        function dispose() {
            _island.dispose();
            _toolbox.dispose();
            _disposeChartList();
            _messageCenter.unbind();
            _zr.dispose();
            self = null;
            return;
        }

        // 接口方法暴漏
        self.setOption = setOption;
        self.setSeries = setSeries;
        self.addData = addData;
        self.getOption = getOption;
        self.getSeries = getSeries;
        self.getZrender = getZrender;
        self.getDataURL = getDataURL;
        self.getImage =  getImage;
        self.on = on;
        self.un = un;
        self.showLoading = showLoading;
        self.hideLoading = hideLoading;
        self.resize = resize;
        self.refresh = refresh;
        self.restore = restore;
        self.clear = clear;
        self.dispose = dispose;
    }

    return self;
});