/**
 * echarts
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function(require) {
    var self = {};
    self.init = function(dom, libOption) {
        libOption = libOption || {type : 'canvas'};
        if (libOption.type == 'canvas') {
            return new Echarts(dom);
        }
        else if (libOption.type == 'flash') {
            alert('未配置');
        }
    };

    /**
     * 基于zrender实现Echarts接口层
     * @param {HtmlElement} dom 必要
     * @param {Object} option 可选参数，同setOption
     */
    function Echarts(dom, option) {
        var ecConfig = require('./config');

        var self = this;
        var _zr;
        var _option;
        var _optionBackup;
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

        // 初始化::构造函数
        _init();
        function _init() {
            var zrender = require('zrender');
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

            // 动态扩展zrender shape：icon
            require('./util/shape/icon');

            // 内置图表注册
            var chartLibrary = require('./chart');
            require('./chart/island');
            // 孤岛
            var Island = chartLibrary.get('island');
            _island = new Island(_messageCenter, _zr);
            
            // 内置组件注册
            var componentLibrary = require('./component');
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
            // 工具箱
            var Toolbox = componentLibrary.get('toolbox');
            _toolbox = new Toolbox(_messageCenter, _zr, dom);
        }

        /**
         * 点击事件，响应zrender事件，包装后分发到Echarts层
         */
        function _onclick(param) {
            var len = _chartList.length;
            while (len--) {
                if (_chartList[len].onclick) {
                    _chartList[len].onclick(param);
                }
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
                if (_chartList[len].ondragstart) {
                    _chartList[len].ondragstart(param);
                }
            }

        }

        /**
         * dragging回调，可计算特性实现
         */
        function _ondragenter(param) {
            var len = _chartList.length;
            while (len--) {
                if (_chartList[len].ondragenter) {
                    _chartList[len].ondragenter(param);
                }
            }
        }

        /**
         * dragstart回调，可计算特性实现
         */
        function _ondragover(param) {
            var len = _chartList.length;
            while (len--) {
                if (_chartList[len].ondragover) {
                    _chartList[len].ondragover(param);
                }
            }
        }
        /**
         * dragstart回调，可计算特性实现
         */
        function _ondragleave(param) {
            var len = _chartList.length;
            while (len--) {
                if (_chartList[len].ondragleave) {
                    _chartList[len].ondragleave(param);
                }
            }
        }

        /**
         * dragstart回调，可计算特性实现
         */
        function _ondrop(param) {
            var len = _chartList.length;
            while (len--) {
                if (_chartList[len].ondrop) {
                    _chartList[len].ondrop(param, _status);
                }
            }
            _island.ondrop(param, _status);
        }

        /**
         * dragdone回调 ，可计算特性实现
         */
        function _ondragend(param) {
            var len = _chartList.length;
            while (len--) {
                if (_chartList[len].ondragend) {
                    _chartList[len].ondragend(param, _status);
                }
            }
            _island.ondragend(param, _status);

            // 发生过重计算
            if (_status.needRefresh) {
                _messageCenter.dispatch(
                    ecConfig.EVENT.DATA_CHANGED,
                    param.event,
                    _eventPackage(param.target)
                );
                _messageCenter.dispatch(ecConfig.EVENT.REFRESH);
            }
        }

        function _onlegendSelected(param) {
            // 用于图表间通信
            _status.needRefresh = false;
            for (var l = _chartList.length - 1; l >= 0; l--) {
                if (_chartList[l].onlegendSelected) {
                    _chartList[l].onlegendSelected(param, _status);
                }
            }
            _selectedMap = param.selected;

            if (_status.needRefresh) {
                _messageCenter.dispatch(ecConfig.EVENT.REFRESH);
            }
        }

        function _ondataZoom(param) {
            // 用于图表间通信
            _status.needRefresh = false;
            for (var l = _chartList.length - 1; l >= 0; l--) {
                if (_chartList[l].ondataZoom) {
                    _chartList[l].ondataZoom(param, _status);
                }
            }

            if (_status.needRefresh) {
                _messageCenter.dispatch(ecConfig.EVENT.REFRESH);
            }
        }
        
        function _ondataRange(param) {
            // 用于图表间通信
            _status.needRefresh = false;
            for (var l = _chartList.length - 1; l >= 0; l--) {
                if (_chartList[l].ondataRange) {
                    _chartList[l].ondataRange(param, _status);
                }
            }

            // 没有相互影响，直接刷新即可
            if (_status.needRefresh) {
                _zr.refresh();
            }
        }

        function _onmagicTypeChanged() {
            var magicOption = _toolbox.getMagicOption();
            var len;
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

            len = magicOption.series.length;
            while (len--) {
                magicOption.series[len].data = _optionBackup.series[len].data;
            }

            _render(magicOption);
        }

        function _ondataViewChanged() {
            _messageCenter.dispatch(
                ecConfig.EVENT.DATA_CHANGED
            );
            _messageCenter.dispatch(ecConfig.EVENT.REFRESH);
        }

        function _onrestore() {
            restore();
        }
        
        function _onrefresh() {
            refresh();
        }

        /**
         * 打包Echarts层的事件附件
         */
        function _eventPackage(target) {
            if (target) {
                var ecData = require('./util/ecData');
                return {
                    seriesIndex : ecData.get(target, 'seriesIndex'),
                    dataIndex : ecData.get(target, 'dataIndex')
                };
            }
            return;
        }

        function _render(magicOption) {
            _disposeChartList();
            _zr.clear();

            var chartLibrary = require('./chart');
            var componentLibrary = require('./component');

            // 提示
            var tooltip;
            if (magicOption.tooltip) {
                var Tooltip = componentLibrary.get('tooltip');
                tooltip = new Tooltip(_messageCenter, _zr, magicOption, dom);
                _chartList.push(tooltip);
            }

            // 图例
            var legend;
            if (magicOption.legend) {
                var Legend = new componentLibrary.get('legend');
                legend = new Legend(
                    _messageCenter, _zr, magicOption, _selectedMap
                );
                _chartList.push(legend);
            }
            
            // 色尺
            var dataRange;
            if (magicOption.dataRange) {
                var DataRange = new componentLibrary.get('dataRange');
                dataRange = new DataRange(
                    _messageCenter, _zr, magicOption
                );
                _chartList.push(dataRange);
            }

            var grid;
            var dataZoom;
            var xAxis;
            var yAxis;
            if (magicOption.grid || magicOption.xAxis || magicOption.yAxis) {
                var Grid = componentLibrary.get('grid');
                grid = new Grid(_messageCenter, _zr, magicOption);
                _chartList.push(grid);

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
                tooltip && tooltip.setComponent({
                    'grid' : grid,
                    'xAxis' : xAxis,
                    'yAxis' : yAxis
                });
            }

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
                                'yAxis' : yAxis
                            }
                        );
                        _chartList.push(chart);
                    }
                }
            }

            _island.render(magicOption);

            _toolbox.render(magicOption, {dataZoom: dataZoom});

            if (magicOption.animation) {
                var len = _chartList.length;
                while (len--) {
                    _chartList[len].animation && _chartList[len].animation();
                }
            }

            _zr.render();
        }

        function restore() {
            var zrUtil = require('zrender/tool/util');
            _selectedMap = {};
            _option = zrUtil.clone(_optionBackup);
            _island.clear();
            _toolbox.resetMagicType(_option);
            _render(_option);
        }
        
        function refresh() {
            // 先来后到，不能仅刷新自己，也不能在上一个循环中刷新，如坐标系数据改变会影响其他图表的大小
            // 所以安顺序刷新各种图表，图表内部refresh优化无需更新则不更新~
            for (var i = 0, l = _chartList.length; i < l; i++) {
                _chartList[i].refresh && _chartList[i].refresh();
            }
            _zr.refresh();
        }
        /**
         * 释放图表实例
         */
        function _disposeChartList() {
            var len = _chartList.length;
            while (len--) {
                _chartList[len].dispose && _chartList[len].dispose();
            }
            _chartList = [];
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

            if (!option.series || option.series.length === 0) {
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
            if (typeof _option.animationDuration == 'undefined') {
                _option.animationDuration = ecConfig.animationDuration;
            }
            if (typeof _option.animationEasing == 'undefined') {
                _option.animationEasing = ecConfig.animationEasing;
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
            _selectedMap = {};

            _island.clear();
            _toolbox.resetMagicType(_option);
            _render(_option);
            return self;
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

        function getZrender() {
            return _zr;
        }

        function on(eventName, eventListener) {
            _messageCenter.bind(eventName, eventListener);
            return self;
        }

        function un(eventName, eventListener) {
            _messageCenter.unbind(eventName, eventListener);
            return self;
        }

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

            loadingOption.textStyle.text = loadingOption.text || 'Loading...';

            if (typeof loadingOption.x != 'undefined') {
                loadingOption.textStyle.x = loadingOption.x;
            }

            if (typeof loadingOption.y != 'undefined') {
                loadingOption.textStyle.y = loadingOption.y;
            }
            _zr.showLoading(loadingOption);

            return self;
        }

        function hideLoading() {
            _zr.hideLoading();
            return self;
        }

        function resize() {
            _zr.resize();
            // 先来后到，不能仅刷新自己，也不能在上一个循环中刷新，如坐标系数据改变会影响其他图表的大小
            // 所以安顺序刷新各种图表，图表内部refresh优化无需更新则不更新~
            for (var i = 0, l = _chartList.length; i < l; i++) {
                _chartList[i].resize && _chartList[i].resize();
                _chartList[i].refresh && _chartList[i].refresh();
            }
            _island.resize();
            _toolbox.resize();
            _zr.refresh();
        }

        function clear() {
            _zr.clear();
            return self;
        }

        function dispose() {
            _island.dispose();
            _toolbox.dispose();
            _disposeChartList();
            _messageCenter.unbind();
            _zr.dispose();
            self = null;
            return;
        }

        self.setOption = setOption;
        self.setSeries = setSeries;
        self.getZrender = getZrender;
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