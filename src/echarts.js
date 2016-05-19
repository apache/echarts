/*!
 * ECharts, a javascript interactive chart library.
 *
 * Copyright (c) 2015, Baidu Inc.
 * All rights reserved.
 *
 * LICENSE
 * https://github.com/ecomfe/echarts/blob/master/LICENSE.txt
 */

/**
 * @module echarts
 */
define(function (require) {

    var GlobalModel = require('./model/Global');
    var ExtensionAPI = require('./ExtensionAPI');
    var CoordinateSystemManager = require('./CoordinateSystem');
    var OptionManager = require('./model/OptionManager');

    var ComponentModel = require('./model/Component');
    var SeriesModel = require('./model/Series');

    var ComponentView = require('./view/Component');
    var ChartView = require('./view/Chart');
    var graphic = require('./util/graphic');

    var zrender = require('zrender');
    var zrUtil = require('zrender/core/util');
    var colorTool = require('zrender/tool/color');
    var env = require('zrender/core/env');
    var Eventful = require('zrender/mixin/Eventful');

    var each = zrUtil.each;

    var VISUAL_CODING_STAGES = ['echarts', 'chart', 'component'];

    // TODO Transform first or filter first
    var PROCESSOR_STAGES = ['transform', 'filter', 'statistic'];

    function createRegisterEventWithLowercaseName(method) {
        return function (eventName, handler, context) {
            // Event name is all lowercase
            eventName = eventName && eventName.toLowerCase();
            Eventful.prototype[method].call(this, eventName, handler, context);
        };
    }
    /**
     * @module echarts~MessageCenter
     */
    function MessageCenter() {
        Eventful.call(this);
    }
    MessageCenter.prototype.on = createRegisterEventWithLowercaseName('on');
    MessageCenter.prototype.off = createRegisterEventWithLowercaseName('off');
    MessageCenter.prototype.one = createRegisterEventWithLowercaseName('one');
    zrUtil.mixin(MessageCenter, Eventful);
    /**
     * @module echarts~ECharts
     */
    function ECharts (dom, theme, opts) {
        opts = opts || {};

        // Get theme by name
        if (typeof theme === 'string') {
            theme = themeStorage[theme];
        }

        if (theme) {
            each(optionPreprocessorFuncs, function (preProcess) {
                preProcess(theme);
            });
        }
        /**
         * @type {string}
         */
        this.id;
        /**
         * Group id
         * @type {string}
         */
        this.group;
        /**
         * @type {HTMLDomElement}
         * @private
         */
        this._dom = dom;
        /**
         * @type {module:zrender/ZRender}
         * @private
         */
        this._zr = zrender.init(dom, {
            renderer: opts.renderer || 'canvas',
            devicePixelRatio: opts.devicePixelRatio
        });

        /**
         * @type {Object}
         * @private
         */
        this._theme = zrUtil.clone(theme);

        /**
         * @type {Array.<module:echarts/view/Chart>}
         * @private
         */
        this._chartsViews = [];

        /**
         * @type {Object.<string, module:echarts/view/Chart>}
         * @private
         */
        this._chartsMap = {};

        /**
         * @type {Array.<module:echarts/view/Component>}
         * @private
         */
        this._componentsViews = [];

        /**
         * @type {Object.<string, module:echarts/view/Component>}
         * @private
         */
        this._componentsMap = {};

        /**
         * @type {module:echarts/ExtensionAPI}
         * @private
         */
        this._api = new ExtensionAPI(this);

        /**
         * @type {module:echarts/CoordinateSystem}
         * @private
         */
        this._coordSysMgr = new CoordinateSystemManager();

        Eventful.call(this);

        /**
         * @type {module:echarts~MessageCenter}
         * @private
         */
        this._messageCenter = new MessageCenter();

        // Init mouse events
        this._initEvents();

        // In case some people write `window.onresize = chart.resize`
        this.resize = zrUtil.bind(this.resize, this);
    }

    var echartsProto = ECharts.prototype;

    /**
     * @return {HTMLDomElement}
     */
    echartsProto.getDom = function () {
        return this._dom;
    };

    /**
     * @return {module:zrender~ZRender}
     */
    echartsProto.getZr = function () {
        return this._zr;
    };

    /**
     * @param {Object} option
     * @param {boolean} notMerge
     * @param {boolean} [notRefreshImmediately=false] Useful when setOption frequently.
     */
    echartsProto.setOption = function (option, notMerge, notRefreshImmediately) {
        if (!this._model || notMerge) {
            this._model = new GlobalModel(
                null, null, this._theme, new OptionManager(this._api)
            );
        }

        this._model.setOption(option, optionPreprocessorFuncs);

        updateMethods.prepareAndUpdate.call(this);

        !notRefreshImmediately && this._zr.refreshImmediately();
    };

    /**
     * @DEPRECATED
     */
    echartsProto.setTheme = function () {
        console.log('ECharts#setTheme() is DEPRECATED in ECharts 3.0');
    };

    /**
     * @return {module:echarts/model/Global}
     */
    echartsProto.getModel = function () {
        return this._model;
    };

    /**
     * @return {Object}
     */
    echartsProto.getOption = function () {
        return this._model.getOption();
    };

    /**
     * @return {number}
     */
    echartsProto.getWidth = function () {
        return this._zr.getWidth();
    };

    /**
     * @return {number}
     */
    echartsProto.getHeight = function () {
        return this._zr.getHeight();
    };

    /**
     * Get canvas which has all thing rendered
     * @param {Object} opts
     * @param {string} [opts.backgroundColor]
     */
    echartsProto.getRenderedCanvas = function (opts) {
        if (!env.canvasSupported) {
            return;
        }
        opts = opts || {};
        opts.pixelRatio = opts.pixelRatio || 1;
        opts.backgroundColor = opts.backgroundColor
            || this._model.get('backgroundColor');
        var zr = this._zr;
        var list = zr.storage.getDisplayList();
        // Stop animations
        zrUtil.each(list, function (el) {
            el.stopAnimation(true);
        });
        return zr.painter.getRenderedCanvas(opts);
    };
    /**
     * @return {string}
     * @param {Object} opts
     * @param {string} [opts.type='png']
     * @param {string} [opts.pixelRatio=1]
     * @param {string} [opts.backgroundColor]
     */
    echartsProto.getDataURL = function (opts) {
        opts = opts || {};
        var excludeComponents = opts.excludeComponents;
        var ecModel = this._model;
        var excludesComponentViews = [];
        var self = this;

        each(excludeComponents, function (componentType) {
            ecModel.eachComponent({
                mainType: componentType
            }, function (component) {
                var view = self._componentsMap[component.__viewId];
                if (!view.group.ignore) {
                    excludesComponentViews.push(view);
                    view.group.ignore = true;
                }
            });
        });

        var url = this.getRenderedCanvas(opts).toDataURL(
            'image/' + (opts && opts.type || 'png')
        );

        each(excludesComponentViews, function (view) {
            view.group.ignore = false;
        });
        return url;
    };


    /**
     * @return {string}
     * @param {Object} opts
     * @param {string} [opts.type='png']
     * @param {string} [opts.pixelRatio=1]
     * @param {string} [opts.backgroundColor]
     */
    echartsProto.getConnectedDataURL = function (opts) {
        if (!env.canvasSupported) {
            return;
        }
        var groupId = this.group;
        var mathMin = Math.min;
        var mathMax = Math.max;
        var MAX_NUMBER = Infinity;
        if (connectedGroups[groupId]) {
            var left = MAX_NUMBER;
            var top = MAX_NUMBER;
            var right = -MAX_NUMBER;
            var bottom = -MAX_NUMBER;
            var canvasList = [];
            var dpr = (opts && opts.pixelRatio) || 1;
            for (var id in instances) {
                var chart = instances[id];
                if (chart.group === groupId) {
                    var canvas = chart.getRenderedCanvas(
                        zrUtil.clone(opts)
                    );
                    var boundingRect = chart.getDom().getBoundingClientRect();
                    left = mathMin(boundingRect.left, left);
                    top = mathMin(boundingRect.top, top);
                    right = mathMax(boundingRect.right, right);
                    bottom = mathMax(boundingRect.bottom, bottom);
                    canvasList.push({
                        dom: canvas,
                        left: boundingRect.left,
                        top: boundingRect.top
                    });
                }
            }

            left *= dpr;
            top *= dpr;
            right *= dpr;
            bottom *= dpr;
            var width = right - left;
            var height = bottom - top;
            var targetCanvas = zrUtil.createCanvas();
            targetCanvas.width = width;
            targetCanvas.height = height;
            var zr = zrender.init(targetCanvas);

            each(canvasList, function (item) {
                var img = new graphic.Image({
                    style: {
                        x: item.left * dpr - left,
                        y: item.top * dpr - top,
                        image: item.dom
                    }
                });
                zr.add(img);
            });
            zr.refreshImmediately();

            return targetCanvas.toDataURL('image/' + (opts && opts.type || 'png'));
        }
        else {
            return this.getDataURL(opts);
        }
    };

    var updateMethods = {

        /**
         * @param {Object} payload
         * @private
         */
        update: function (payload) {
            // console.time && console.time('update');

            var ecModel = this._model;
            var api = this._api;
            var coordSysMgr = this._coordSysMgr;
            // update before setOption
            if (!ecModel) {
                return;
            }

            // Fixme First time update ?
            ecModel.restoreData();

            // TODO
            // Save total ecModel here for undo/redo (after restoring data and before processing data).
            // Undo (restoration of total ecModel) can be carried out in 'action' or outside API call.

            // Create new coordinate system each update
            // In LineView may save the old coordinate system and use it to get the orignal point
            coordSysMgr.create(this._model, this._api);

            processData.call(this, ecModel, api);

            stackSeriesData.call(this, ecModel);

            coordSysMgr.update(ecModel, api);

            doLayout.call(this, ecModel, payload);

            doVisualCoding.call(this, ecModel, payload);

            doRender.call(this, ecModel, payload);

            // Set background
            var backgroundColor = ecModel.get('backgroundColor') || 'transparent';

            var painter = this._zr.painter;
            // TODO all use clearColor ?
            if (painter.isSingleCanvas && painter.isSingleCanvas()) {
                this._zr.configLayer(0, {
                    clearColor: backgroundColor
                });
            }
            else {
                // In IE8
                if (!env.canvasSupported) {
                    var colorArr = colorTool.parse(backgroundColor);
                    backgroundColor = colorTool.stringify(colorArr, 'rgb');
                    if (colorArr[3] === 0) {
                        backgroundColor = 'transparent';
                    }
                }
                backgroundColor = backgroundColor;
                this._dom.style.backgroundColor = backgroundColor;
            }

            // console.time && console.timeEnd('update');
        },

        // PENDING
        /**
         * @param {Object} payload
         * @private
         */
        updateView: function (payload) {
            var ecModel = this._model;

            // update before setOption
            if (!ecModel) {
                return;
            }

            doLayout.call(this, ecModel, payload);

            doVisualCoding.call(this, ecModel, payload);

            invokeUpdateMethod.call(this, 'updateView', ecModel, payload);
        },

        /**
         * @param {Object} payload
         * @private
         */
        updateVisual: function (payload) {
            var ecModel = this._model;

            // update before setOption
            if (!ecModel) {
                return;
            }

            doVisualCoding.call(this, ecModel, payload);

            invokeUpdateMethod.call(this, 'updateVisual', ecModel, payload);
        },

        /**
         * @param {Object} payload
         * @private
         */
        updateLayout: function (payload) {
            var ecModel = this._model;

            // update before setOption
            if (!ecModel) {
                return;
            }

            doLayout.call(this, ecModel, payload);

            invokeUpdateMethod.call(this, 'updateLayout', ecModel, payload);
        },

        /**
         * @param {Object} payload
         * @private
         */
        highlight: function (payload) {
            toggleHighlight.call(this, 'highlight', payload);
        },

        /**
         * @param {Object} payload
         * @private
         */
        downplay: function (payload) {
            toggleHighlight.call(this, 'downplay', payload);
        },

        /**
         * @param {Object} payload
         * @private
         */
        prepareAndUpdate: function (payload) {
            var ecModel = this._model;

            prepareView.call(this, 'component', ecModel);

            prepareView.call(this, 'chart', ecModel);

            updateMethods.update.call(this, payload);
        }
    };

    /**
     * @param {Object} payload
     * @private
     */
    function toggleHighlight(method, payload) {
        var ecModel = this._model;

        // dispatchAction before setOption
        if (!ecModel) {
            return;
        }

        ecModel.eachComponent(
            {mainType: 'series', query: payload},
            function (seriesModel, index) {
                var chartView = this._chartsMap[seriesModel.__viewId];
                if (chartView && chartView.__alive) {
                    chartView[method](
                        seriesModel, ecModel, this._api, payload
                    );
                }
            },
            this
        );
    }

    /**
     * Resize the chart
     */
    echartsProto.resize = function () {
        this._zr.resize();

        var optionChanged = this._model && this._model.resetOption('media');
        updateMethods[optionChanged ? 'prepareAndUpdate' : 'update'].call(this);

        // Resize loading effect
        this._loadingFX && this._loadingFX.resize();
    };

    var defaultLoadingEffect = require('./loading/default');
    /**
     * Show loading effect
     * @param  {string} [name='default']
     * @param  {Object} [cfg]
     */
    echartsProto.showLoading = function (name, cfg) {
        if (zrUtil.isObject(name)) {
            cfg = name;
            name = 'default';
        }
        this.hideLoading();
        var el = defaultLoadingEffect(this._api, cfg);
        var zr = this._zr;
        this._loadingFX = el;

        zr.add(el);
    };

    /**
     * Hide loading effect
     */
    echartsProto.hideLoading = function () {
        this._loadingFX && this._zr.remove(this._loadingFX);
        this._loadingFX = null;
    };

    /**
     * @param {Object} eventObj
     * @return {Object}
     */
    echartsProto.makeActionFromEvent = function (eventObj) {
        var payload = zrUtil.extend({}, eventObj);
        payload.type = eventActionMap[eventObj.type];
        return payload;
    };

    /**
     * @pubilc
     * @param {Object} payload
     * @param {string} [payload.type] Action type
     * @param {boolean} [silent=false] Whether trigger event.
     */
    echartsProto.dispatchAction = function (payload, silent) {
        var actionWrap = actions[payload.type];
        if (actionWrap) {
            var actionInfo = actionWrap.actionInfo;
            var updateMethod = actionInfo.update || 'update';

            var payloads = [payload];
            var batched = false;
            // Batch action
            if (payload.batch) {
                batched = true;
                payloads = zrUtil.map(payload.batch, function (item) {
                    item = zrUtil.defaults(zrUtil.extend({}, item), payload);
                    item.batch = null;
                    return item;
                });
            }

            var eventObjBatch = [];
            var eventObj;
            var isHighlightOrDownplay = payload.type === 'highlight' || payload.type === 'downplay';
            for (var i = 0; i < payloads.length; i++) {
                var batchItem = payloads[i];
                // Action can specify the event by return it.
                eventObj = actionWrap.action(batchItem, this._model);
                // Emit event outside
                eventObj = eventObj || zrUtil.extend({}, batchItem);
                // Convert type to eventType
                eventObj.type = actionInfo.event || eventObj.type;
                eventObjBatch.push(eventObj);

                // Highlight and downplay are special.
                isHighlightOrDownplay && updateMethods[updateMethod].call(this, batchItem);
            }

            (updateMethod !== 'none' && !isHighlightOrDownplay)
                && updateMethods[updateMethod].call(this, payload);

            if (!silent) {
                // Follow the rule of action batch
                if (batched) {
                    eventObj = {
                        type: actionInfo.event || payload.type,
                        batch: eventObjBatch
                    };
                }
                else {
                    eventObj = eventObjBatch[0];
                }
                this._messageCenter.trigger(eventObj.type, eventObj);
            }
        }
    };

    /**
     * Register event
     * @method
     */
    echartsProto.on = createRegisterEventWithLowercaseName('on');
    echartsProto.off = createRegisterEventWithLowercaseName('off');
    echartsProto.one = createRegisterEventWithLowercaseName('one');

    /**
     * @param {string} methodName
     * @private
     */
    function invokeUpdateMethod(methodName, ecModel, payload) {
        var api = this._api;

        // Update all components
        each(this._componentsViews, function (component) {
            var componentModel = component.__model;
            component[methodName](componentModel, ecModel, api, payload);

            updateZ(componentModel, component);
        }, this);

        // Upate all charts
        ecModel.eachSeries(function (seriesModel, idx) {
            var chart = this._chartsMap[seriesModel.__viewId];
            chart[methodName](seriesModel, ecModel, api, payload);

            updateZ(seriesModel, chart);
        }, this);

    }

    /**
     * Prepare view instances of charts and components
     * @param  {module:echarts/model/Global} ecModel
     * @private
     */
    function prepareView(type, ecModel) {
        var isComponent = type === 'component';
        var viewList = isComponent ? this._componentsViews : this._chartsViews;
        var viewMap = isComponent ? this._componentsMap : this._chartsMap;
        var zr = this._zr;

        for (var i = 0; i < viewList.length; i++) {
            viewList[i].__alive = false;
        }

        ecModel[isComponent ? 'eachComponent' : 'eachSeries'](function (componentType, model) {
            if (isComponent) {
                if (componentType === 'series') {
                    return;
                }
            }
            else {
                model = componentType;
            }

            // Consider: id same and type changed.
            var viewId = model.id + '_' + model.type;
            var view = viewMap[viewId];
            if (!view) {
                var classType = ComponentModel.parseClassType(model.type);
                var Clazz = isComponent
                    ? ComponentView.getClass(classType.main, classType.sub)
                    : ChartView.getClass(classType.sub);
                if (Clazz) {
                    view = new Clazz();
                    view.init(ecModel, this._api);
                    viewMap[viewId] = view;
                    viewList.push(view);
                    zr.add(view.group);
                }
                else {
                    // Error
                    return;
                }
            }

            model.__viewId = viewId;
            view.__alive = true;
            view.__id = viewId;
            view.__model = model;
        }, this);

        for (var i = 0; i < viewList.length;) {
            var view = viewList[i];
            if (!view.__alive) {
                zr.remove(view.group);
                view.dispose(ecModel, this._api);
                viewList.splice(i, 1);
                delete viewMap[view.__id];
            }
            else {
                i++;
            }
        }
    }

    /**
     * Processor data in each series
     *
     * @param {module:echarts/model/Global} ecModel
     * @private
     */
    function processData(ecModel, api) {
        each(PROCESSOR_STAGES, function (stage) {
            each(dataProcessorFuncs[stage] || [], function (process) {
                process(ecModel, api);
            });
        });
    }

    /**
     * @private
     */
    function stackSeriesData(ecModel) {
        var stackedDataMap = {};
        ecModel.eachSeries(function (series) {
            var stack = series.get('stack');
            var data = series.getData();
            if (stack && data.type === 'list') {
                var previousStack = stackedDataMap[stack];
                if (previousStack) {
                    data.stackedOn = previousStack;
                }
                stackedDataMap[stack] = data;
            }
        });
    }

    /**
     * Layout before each chart render there series, after visual coding and data processing
     *
     * @param {module:echarts/model/Global} ecModel
     * @private
     */
    function doLayout(ecModel, payload) {
        var api = this._api;
        each(layoutFuncs, function (layout) {
            layout(ecModel, api, payload);
        });
    }

    /**
     * Code visual infomation from data after data processing
     *
     * @param {module:echarts/model/Global} ecModel
     * @private
     */
    function doVisualCoding(ecModel, payload) {
        each(VISUAL_CODING_STAGES, function (stage) {
            each(visualCodingFuncs[stage] || [], function (visualCoding) {
                visualCoding(ecModel, payload);
            });
        });
    }

    /**
     * Render each chart and component
     * @private
     */
    function doRender(ecModel, payload) {
        var api = this._api;
        // Render all components
        each(this._componentsViews, function (componentView) {
            var componentModel = componentView.__model;
            componentView.render(componentModel, ecModel, api, payload);

            updateZ(componentModel, componentView);
        }, this);

        each(this._chartsViews, function (chart) {
            chart.__alive = false;
        }, this);

        // Render all charts
        ecModel.eachSeries(function (seriesModel, idx) {
            var chartView = this._chartsMap[seriesModel.__viewId];
            chartView.__alive = true;
            chartView.render(seriesModel, ecModel, api, payload);

            chartView.group.silent = !!seriesModel.get('silent');

            updateZ(seriesModel, chartView);
        }, this);

        // Remove groups of unrendered charts
        each(this._chartsViews, function (chart) {
            if (!chart.__alive) {
                chart.remove(ecModel, api);
            }
        }, this);
    }

    var MOUSE_EVENT_NAMES = [
        'click', 'dblclick', 'mouseover', 'mouseout', 'mousedown', 'mouseup', 'globalout'
    ];
    /**
     * @private
     */
    echartsProto._initEvents = function () {
        each(MOUSE_EVENT_NAMES, function (eveName) {
            this._zr.on(eveName, function (e) {
                var ecModel = this.getModel();
                var el = e.target;
                if (el && el.dataIndex != null) {
                    var dataModel = el.dataModel || ecModel.getSeriesByIndex(el.seriesIndex);
                    var params = dataModel && dataModel.getDataParams(el.dataIndex, el.dataType) || {};
                    params.event = e;
                    params.type = eveName;
                    this.trigger(eveName, params);
                }
                // If element has custom eventData of components
                else if (el && el.eventData) {
                    this.trigger(eveName, el.eventData);
                }
            }, this);
        }, this);

        each(eventActionMap, function (actionType, eventType) {
            this._messageCenter.on(eventType, function (event) {
                this.trigger(eventType, event);
            }, this);
        }, this);
    };

    /**
     * @return {boolean}
     */
    echartsProto.isDisposed = function () {
        return this._disposed;
    };

    /**
     * Clear
     */
    echartsProto.clear = function () {
        this.setOption({}, true);
    };
    /**
     * Dispose instance
     */
    echartsProto.dispose = function () {
        this._disposed = true;
        var api = this._api;
        var ecModel = this._model;

        each(this._componentsViews, function (component) {
            component.dispose(ecModel, api);
        });
        each(this._chartsViews, function (chart) {
            chart.dispose(ecModel, api);
        });

        this._zr.dispose();

        delete instances[this.id];
    };

    zrUtil.mixin(ECharts, Eventful);

    /**
     * @param {module:echarts/model/Series|module:echarts/model/Component} model
     * @param {module:echarts/view/Component|module:echarts/view/Chart} view
     * @return {string}
     */
    function updateZ(model, view) {
        var z = model.get('z');
        var zlevel = model.get('zlevel');
        // Set z and zlevel
        view.group.traverse(function (el) {
            z != null && (el.z = z);
            zlevel != null && (el.zlevel = zlevel);
        });
    }
    /**
     * @type {Array.<Function>}
     * @inner
     */
    var actions = [];

    /**
     * Map eventType to actionType
     * @type {Object}
     */
    var eventActionMap = {};

    /**
     * @type {Array.<Function>}
     * @inner
     */
    var layoutFuncs = [];

    /**
     * Data processor functions of each stage
     * @type {Array.<Object.<string, Function>>}
     * @inner
     */
    var dataProcessorFuncs = {};

    /**
     * @type {Array.<Function>}
     * @inner
     */
    var optionPreprocessorFuncs = [];

    /**
     * Visual coding functions of each stage
     * @type {Array.<Object.<string, Function>>}
     * @inner
     */
    var visualCodingFuncs = {};
    /**
     * Theme storage
     * @type {Object.<key, Object>}
     */
    var themeStorage = {};


    var instances = {};
    var connectedGroups = {};

    var idBase = new Date() - 0;
    var groupIdBase = new Date() - 0;
    var DOM_ATTRIBUTE_KEY = '_echarts_instance_';
    /**
     * @alias module:echarts
     */
    var echarts = {
        /**
         * @type {number}
         */
        version: '3.1.10',
        dependencies: {
            zrender: '3.1.0'
        }
    };

    function enableConnect(chart) {

        var STATUS_PENDING = 0;
        var STATUS_UPDATING = 1;
        var STATUS_UPDATED = 2;
        var STATUS_KEY = '__connectUpdateStatus';
        function updateConnectedChartsStatus(charts, status) {
            for (var i = 0; i < charts.length; i++) {
                var otherChart = charts[i];
                otherChart[STATUS_KEY] = status;
            }
        }
        zrUtil.each(eventActionMap, function (actionType, eventType) {
            chart._messageCenter.on(eventType, function (event) {
                if (connectedGroups[chart.group] && chart[STATUS_KEY] !== STATUS_PENDING) {
                    var action = chart.makeActionFromEvent(event);
                    var otherCharts = [];
                    for (var id in instances) {
                        var otherChart = instances[id];
                        if (otherChart !== chart && otherChart.group === chart.group) {
                            otherCharts.push(otherChart);
                        }
                    }
                    updateConnectedChartsStatus(otherCharts, STATUS_PENDING);
                    each(otherCharts, function (otherChart) {
                        if (otherChart[STATUS_KEY] !== STATUS_UPDATING) {
                            otherChart.dispatchAction(action);
                        }
                    });
                    updateConnectedChartsStatus(otherCharts, STATUS_UPDATED);
                }
            });
        });

    }
    /**
     * @param {HTMLDomElement} dom
     * @param {Object} [theme]
     * @param {Object} opts
     */
    echarts.init = function (dom, theme, opts) {
        // Check version
        if ((zrender.version.replace('.', '') - 0) < (echarts.dependencies.zrender.replace('.', '') - 0)) {
            throw new Error(
                'ZRender ' + zrender.version
                + ' is too old for ECharts ' + echarts.version
                + '. Current version need ZRender '
                + echarts.dependencies.zrender + '+'
            );
        }
        if (!dom) {
            throw new Error('Initialize failed: invalid dom.');
        }

        var chart = new ECharts(dom, theme, opts);
        chart.id = 'ec_' + idBase++;
        instances[chart.id] = chart;

        dom.setAttribute &&
            dom.setAttribute(DOM_ATTRIBUTE_KEY, chart.id);

        enableConnect(chart);

        return chart;
    };

    /**
     * @return {string|Array.<module:echarts~ECharts>} groupId
     */
    echarts.connect = function (groupId) {
        // Is array of charts
        if (zrUtil.isArray(groupId)) {
            var charts = groupId;
            groupId = null;
            // If any chart has group
            zrUtil.each(charts, function (chart) {
                if (chart.group != null) {
                    groupId = chart.group;
                }
            });
            groupId = groupId || ('g_' + groupIdBase++);
            zrUtil.each(charts, function (chart) {
                chart.group = groupId;
            });
        }
        connectedGroups[groupId] = true;
        return groupId;
    };

    /**
     * @return {string} groupId
     */
    echarts.disConnect = function (groupId) {
        connectedGroups[groupId] = false;
    };

    /**
     * Dispose a chart instance
     * @param  {module:echarts~ECharts|HTMLDomElement|string} chart
     */
    echarts.dispose = function (chart) {
        if (zrUtil.isDom(chart)) {
            chart = echarts.getInstanceByDom(chart);
        }
        else if (typeof chart === 'string') {
            chart = instances[chart];
        }
        if ((chart instanceof ECharts) && !chart.isDisposed()) {
            chart.dispose();
        }
    };

    /**
     * @param  {HTMLDomElement} dom
     * @return {echarts~ECharts}
     */
    echarts.getInstanceByDom = function (dom) {
        var key = dom.getAttribute(DOM_ATTRIBUTE_KEY);
        return instances[key];
    };
    /**
     * @param {string} key
     * @return {echarts~ECharts}
     */
    echarts.getInstanceById = function (key) {
        return instances[key];
    };

    /**
     * Register theme
     */
    echarts.registerTheme = function (name, theme) {
        themeStorage[name] = theme;
    };

    /**
     * Register option preprocessor
     * @param {Function} preprocessorFunc
     */
    echarts.registerPreprocessor = function (preprocessorFunc) {
        optionPreprocessorFuncs.push(preprocessorFunc);
    };

    /**
     * @param {string} stage
     * @param {Function} processorFunc
     */
    echarts.registerProcessor = function (stage, processorFunc) {
        if (zrUtil.indexOf(PROCESSOR_STAGES, stage) < 0) {
            throw new Error('stage should be one of ' + PROCESSOR_STAGES);
        }
        var funcs = dataProcessorFuncs[stage] || (dataProcessorFuncs[stage] = []);
        funcs.push(processorFunc);
    };

    /**
     * Usage:
     * registerAction('someAction', 'someEvent', function () { ... });
     * registerAction('someAction', function () { ... });
     * registerAction(
     *     {type: 'someAction', event: 'someEvent', update: 'updateView'},
     *     function () { ... }
     * );
     *
     * @param {(string|Object)} actionInfo
     * @param {string} actionInfo.type
     * @param {string} [actionInfo.event]
     * @param {string} [actionInfo.update]
     * @param {string} [eventName]
     * @param {Function} action
     */
    echarts.registerAction = function (actionInfo, eventName, action) {
        if (typeof eventName === 'function') {
            action = eventName;
            eventName = '';
        }
        var actionType = zrUtil.isObject(actionInfo)
            ? actionInfo.type
            : ([actionInfo, actionInfo = {
                event: eventName
            }][0]);

        // Event name is all lowercase
        actionInfo.event = (actionInfo.event || actionType).toLowerCase();
        eventName = actionInfo.event;

        if (!actions[actionType]) {
            actions[actionType] = {action: action, actionInfo: actionInfo};
        }
        eventActionMap[eventName] = actionType;
    };

    /**
     * @param {string} type
     * @param {*} CoordinateSystem
     */
    echarts.registerCoordinateSystem = function (type, CoordinateSystem) {
        CoordinateSystemManager.register(type, CoordinateSystem);
    };

    /**
     * @param {*} layout
     */
    echarts.registerLayout = function (layout) {
        // PENDING All functions ?
        if (zrUtil.indexOf(layoutFuncs, layout) < 0) {
            layoutFuncs.push(layout);
        }
    };

    /**
     * @param {string} stage
     * @param {Function} visualCodingFunc
     */
    echarts.registerVisualCoding = function (stage, visualCodingFunc) {
        if (zrUtil.indexOf(VISUAL_CODING_STAGES, stage) < 0) {
            throw new Error('stage should be one of ' + VISUAL_CODING_STAGES);
        }
        var funcs = visualCodingFuncs[stage] || (visualCodingFuncs[stage] = []);
        funcs.push(visualCodingFunc);
    };

    /**
     * @param {Object} opts
     */
    echarts.extendChartView = function (opts) {
        return ChartView.extend(opts);
    };

    /**
     * @param {Object} opts
     */
    echarts.extendComponentModel = function (opts) {
        return ComponentModel.extend(opts);
    };

    /**
     * @param {Object} opts
     */
    echarts.extendSeriesModel = function (opts) {
        return SeriesModel.extend(opts);
    };

    /**
     * @param {Object} opts
     */
    echarts.extendComponentView = function (opts) {
        return ComponentView.extend(opts);
    };

    /**
     * ZRender need a canvas context to do measureText.
     * But in node environment canvas may be created by node-canvas.
     * So we need to specify how to create a canvas instead of using document.createElement('canvas')
     *
     * Be careful of using it in the browser.
     *
     * @param {Function} creator
     * @example
     *     var Canvas = require('canvas');
     *     var echarts = require('echarts');
     *     echarts.setCanvasCreator(function () {
     *         // Small size is enough.
     *         return new Canvas(32, 32);
     *     });
     */
    echarts.setCanvasCreator = function (creator) {
        zrUtil.createCanvas = creator;
    };

    echarts.registerVisualCoding('echarts', zrUtil.curry(
        require('./visual/seriesColor'), '', 'itemStyle'
    ));
    echarts.registerPreprocessor(require('./preprocessor/backwardCompat'));

    // Default action
    echarts.registerAction({
        type: 'highlight',
        event: 'highlight',
        update: 'highlight'
    }, zrUtil.noop);
    echarts.registerAction({
        type: 'downplay',
        event: 'downplay',
        update: 'downplay'
    }, zrUtil.noop);


    // --------
    // Exports
    // --------

    echarts.graphic = require('./util/graphic');
    echarts.number = require('./util/number');
    echarts.format = require('./util/format');
    echarts.matrix = require('zrender/core/matrix');
    echarts.vector = require('zrender/core/vector');

    echarts.util = {};
    each([
            'map', 'each', 'filter', 'indexOf', 'inherits',
            'reduce', 'filter', 'bind', 'curry', 'isArray',
            'isString', 'isObject', 'isFunction', 'extend'
        ],
        function (name) {
            echarts.util[name] = zrUtil[name];
        }
    );

    return echarts;
});