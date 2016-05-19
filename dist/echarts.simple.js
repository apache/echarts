(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["echarts"] = factory();
	else
		root["echarts"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Export echarts as CommonJS module
	 */
	module.exports = __webpack_require__(1);

	__webpack_require__(92);
	__webpack_require__(128);
	__webpack_require__(133);
	__webpack_require__(107);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

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


	    var GlobalModel = __webpack_require__(2);
	    var ExtensionAPI = __webpack_require__(24);
	    var CoordinateSystemManager = __webpack_require__(25);
	    var OptionManager = __webpack_require__(26);

	    var ComponentModel = __webpack_require__(19);
	    var SeriesModel = __webpack_require__(27);

	    var ComponentView = __webpack_require__(28);
	    var ChartView = __webpack_require__(41);
	    var graphic = __webpack_require__(42);

	    var zrender = __webpack_require__(78);
	    var zrUtil = __webpack_require__(3);
	    var colorTool = __webpack_require__(38);
	    var env = __webpack_require__(79);
	    var Eventful = __webpack_require__(32);

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

	    var defaultLoadingEffect = __webpack_require__(88);
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
	        __webpack_require__(89), '', 'itemStyle'
	    ));
	    echarts.registerPreprocessor(__webpack_require__(90));

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

	    echarts.graphic = __webpack_require__(42);
	    echarts.number = __webpack_require__(7);
	    echarts.format = __webpack_require__(6);
	    echarts.matrix = __webpack_require__(17);
	    echarts.vector = __webpack_require__(16);

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

	    module.exports = echarts;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * ECharts global model
	 *
	 * @module {echarts/model/Global}
	 *
	 */



	    var zrUtil = __webpack_require__(3);
	    var modelUtil = __webpack_require__(5);
	    var Model = __webpack_require__(8);
	    var each = zrUtil.each;
	    var filter = zrUtil.filter;
	    var map = zrUtil.map;
	    var isArray = zrUtil.isArray;
	    var indexOf = zrUtil.indexOf;
	    var isObject = zrUtil.isObject;

	    var ComponentModel = __webpack_require__(19);

	    var globalDefault = __webpack_require__(23);

	    var OPTION_INNER_KEY = '\0_ec_inner';

	    /**
	     * @alias module:echarts/model/Global
	     *
	     * @param {Object} option
	     * @param {module:echarts/model/Model} parentModel
	     * @param {Object} theme
	     */
	    var GlobalModel = Model.extend({

	        constructor: GlobalModel,

	        init: function (option, parentModel, theme, optionManager) {
	            theme = theme || {};

	            this.option = null; // Mark as not initialized.

	            /**
	             * @type {module:echarts/model/Model}
	             * @private
	             */
	            this._theme = new Model(theme);

	            /**
	             * @type {module:echarts/model/OptionManager}
	             */
	            this._optionManager = optionManager;
	        },

	        setOption: function (option, optionPreprocessorFuncs) {
	            zrUtil.assert(
	                !(OPTION_INNER_KEY in option),
	                'please use chart.getOption()'
	            );

	            this._optionManager.setOption(option, optionPreprocessorFuncs);

	            this.resetOption();
	        },

	        /**
	         * @param {string} type null/undefined: reset all.
	         *                      'recreate': force recreate all.
	         *                      'timeline': only reset timeline option
	         *                      'media': only reset media query option
	         * @return {boolean} Whether option changed.
	         */
	        resetOption: function (type) {
	            var optionChanged = false;
	            var optionManager = this._optionManager;

	            if (!type || type === 'recreate') {
	                var baseOption = optionManager.mountOption(type === 'recreate');

	                if (!this.option || type === 'recreate') {
	                    initBase.call(this, baseOption);
	                }
	                else {
	                    this.restoreData();
	                    this.mergeOption(baseOption);
	                }
	                optionChanged = true;
	            }

	            if (type === 'timeline' || type === 'media') {
	                this.restoreData();
	            }

	            if (!type || type === 'recreate' || type === 'timeline') {
	                var timelineOption = optionManager.getTimelineOption(this);
	                timelineOption && (this.mergeOption(timelineOption), optionChanged = true);
	            }

	            if (!type || type === 'recreate' || type === 'media') {
	                var mediaOptions = optionManager.getMediaOption(this, this._api);
	                if (mediaOptions.length) {
	                    each(mediaOptions, function (mediaOption) {
	                        this.mergeOption(mediaOption, optionChanged = true);
	                    }, this);
	                }
	            }

	            return optionChanged;
	        },

	        /**
	         * @protected
	         */
	        mergeOption: function (newOption) {
	            var option = this.option;
	            var componentsMap = this._componentsMap;
	            var newCptTypes = [];

	            // 如果不存在对应的 component model 则直接 merge
	            each(newOption, function (componentOption, mainType) {
	                if (componentOption == null) {
	                    return;
	                }

	                if (!ComponentModel.hasClass(mainType)) {
	                    option[mainType] = option[mainType] == null
	                        ? zrUtil.clone(componentOption)
	                        : zrUtil.merge(option[mainType], componentOption, true);
	                }
	                else {
	                    newCptTypes.push(mainType);
	                }
	            });

	            // FIXME OPTION 同步是否要改回原来的
	            ComponentModel.topologicalTravel(
	                newCptTypes, ComponentModel.getAllClassMainTypes(), visitComponent, this
	            );

	            function visitComponent(mainType, dependencies) {
	                var newCptOptionList = modelUtil.normalizeToArray(newOption[mainType]);

	                var mapResult = modelUtil.mappingToExists(
	                    componentsMap[mainType], newCptOptionList
	                );

	                makeKeyInfo(mainType, mapResult);

	                var dependentModels = getComponentsByTypes(
	                    componentsMap, dependencies
	                );

	                option[mainType] = [];
	                componentsMap[mainType] = [];

	                each(mapResult, function (resultItem, index) {
	                    var componentModel = resultItem.exist;
	                    var newCptOption = resultItem.option;

	                    zrUtil.assert(
	                        isObject(newCptOption) || componentModel,
	                        'Empty component definition'
	                    );

	                    // Consider where is no new option and should be merged using {},
	                    // see removeEdgeAndAdd in topologicalTravel and
	                    // ComponentModel.getAllClassMainTypes.
	                    if (!newCptOption) {
	                        componentModel.mergeOption({}, this);
	                        componentModel.optionUpdated(this);
	                    }
	                    else {
	                        var ComponentModelClass = ComponentModel.getClass(
	                            mainType, resultItem.keyInfo.subType, true
	                        );

	                        if (componentModel && componentModel instanceof ComponentModelClass) {
	                            componentModel.mergeOption(newCptOption, this);
	                            componentModel.optionUpdated(this);
	                        }
	                        else {
	                            // PENDING Global as parent ?
	                            componentModel = new ComponentModelClass(
	                                newCptOption, this, this,
	                                zrUtil.extend(
	                                    {
	                                        dependentModels: dependentModels,
	                                        componentIndex: index
	                                    },
	                                    resultItem.keyInfo
	                                )
	                            );
	                            // Call optionUpdated after init
	                            componentModel.optionUpdated(this);
	                        }
	                    }

	                    componentsMap[mainType][index] = componentModel;
	                    option[mainType][index] = componentModel.option;
	                }, this);

	                // Backup series for filtering.
	                if (mainType === 'series') {
	                    this._seriesIndices = createSeriesIndices(componentsMap.series);
	                }
	            }
	        },

	        /**
	         * Get option for output (cloned option and inner info removed)
	         * @public
	         * @return {Object}
	         */
	        getOption: function () {
	            var option = zrUtil.clone(this.option);

	            each(option, function (opts, mainType) {
	                if (ComponentModel.hasClass(mainType)) {
	                    var opts = modelUtil.normalizeToArray(opts);
	                    for (var i = opts.length - 1; i >= 0; i--) {
	                        // Remove options with inner id.
	                        if (modelUtil.isIdInner(opts[i])) {
	                            opts.splice(i, 1);
	                        }
	                    }
	                    option[mainType] = opts;
	                }
	            });

	            delete option[OPTION_INNER_KEY];

	            return option;
	        },

	        /**
	         * @return {module:echarts/model/Model}
	         */
	        getTheme: function () {
	            return this._theme;
	        },

	        /**
	         * @param {string} mainType
	         * @param {number} [idx=0]
	         * @return {module:echarts/model/Component}
	         */
	        getComponent: function (mainType, idx) {
	            var list = this._componentsMap[mainType];
	            if (list) {
	                return list[idx || 0];
	            }
	        },

	        /**
	         * @param {Object} condition
	         * @param {string} condition.mainType
	         * @param {string} [condition.subType] If ignore, only query by mainType
	         * @param {number} [condition.index] Either input index or id or name.
	         * @param {string} [condition.id] Either input index or id or name.
	         * @param {string} [condition.name] Either input index or id or name.
	         * @return {Array.<module:echarts/model/Component>}
	         */
	        queryComponents: function (condition) {
	            var mainType = condition.mainType;
	            if (!mainType) {
	                return [];
	            }

	            var index = condition.index;
	            var id = condition.id;
	            var name = condition.name;

	            var cpts = this._componentsMap[mainType];

	            if (!cpts || !cpts.length) {
	                return [];
	            }

	            var result;

	            if (index != null) {
	                if (!isArray(index)) {
	                    index = [index];
	                }
	                result = filter(map(index, function (idx) {
	                    return cpts[idx];
	                }), function (val) {
	                    return !!val;
	                });
	            }
	            else if (id != null) {
	                var isIdArray = isArray(id);
	                result = filter(cpts, function (cpt) {
	                    return (isIdArray && indexOf(id, cpt.id) >= 0)
	                        || (!isIdArray && cpt.id === id);
	                });
	            }
	            else if (name != null) {
	                var isNameArray = isArray(name);
	                result = filter(cpts, function (cpt) {
	                    return (isNameArray && indexOf(name, cpt.name) >= 0)
	                        || (!isNameArray && cpt.name === name);
	                });
	            }

	            return filterBySubType(result, condition);
	        },

	        /**
	         * The interface is different from queryComponents,
	         * which is convenient for inner usage.
	         *
	         * @usage
	         * var result = findComponents(
	         *     {mainType: 'dataZoom', query: {dataZoomId: 'abc'}}
	         * );
	         * var result = findComponents(
	         *     {mainType: 'series', subType: 'pie', query: {seriesName: 'uio'}}
	         * );
	         * var result = findComponents(
	         *     {mainType: 'series'},
	         *     function (model, index) {...}
	         * );
	         * // result like [component0, componnet1, ...]
	         *
	         * @param {Object} condition
	         * @param {string} condition.mainType Mandatory.
	         * @param {string} [condition.subType] Optional.
	         * @param {Object} [condition.query] like {xxxIndex, xxxId, xxxName},
	         *        where xxx is mainType.
	         *        If query attribute is null/undefined or has no index/id/name,
	         *        do not filtering by query conditions, which is convenient for
	         *        no-payload situations or when target of action is global.
	         * @param {Function} [condition.filter] parameter: component, return boolean.
	         * @return {Array.<module:echarts/model/Component>}
	         */
	        findComponents: function (condition) {
	            var query = condition.query;
	            var mainType = condition.mainType;

	            var queryCond = getQueryCond(query);
	            var result = queryCond
	                ? this.queryComponents(queryCond)
	                : this._componentsMap[mainType];

	            return doFilter(filterBySubType(result, condition));

	            function getQueryCond(q) {
	                var indexAttr = mainType + 'Index';
	                var idAttr = mainType + 'Id';
	                var nameAttr = mainType + 'Name';
	                return q && (
	                        q.hasOwnProperty(indexAttr)
	                        || q.hasOwnProperty(idAttr)
	                        || q.hasOwnProperty(nameAttr)
	                    )
	                    ? {
	                        mainType: mainType,
	                        // subType will be filtered finally.
	                        index: q[indexAttr],
	                        id: q[idAttr],
	                        name: q[nameAttr]
	                    }
	                    : null;
	            }

	            function doFilter(res) {
	                return condition.filter
	                     ? filter(res, condition.filter)
	                     : res;
	            }
	        },

	        /**
	         * @usage
	         * eachComponent('legend', function (legendModel, index) {
	         *     ...
	         * });
	         * eachComponent(function (componentType, model, index) {
	         *     // componentType does not include subType
	         *     // (componentType is 'xxx' but not 'xxx.aa')
	         * });
	         * eachComponent(
	         *     {mainType: 'dataZoom', query: {dataZoomId: 'abc'}},
	         *     function (model, index) {...}
	         * );
	         * eachComponent(
	         *     {mainType: 'series', subType: 'pie', query: {seriesName: 'uio'}},
	         *     function (model, index) {...}
	         * );
	         *
	         * @param {string|Object=} mainType When mainType is object, the definition
	         *                                  is the same as the method 'findComponents'.
	         * @param {Function} cb
	         * @param {*} context
	         */
	        eachComponent: function (mainType, cb, context) {
	            var componentsMap = this._componentsMap;

	            if (typeof mainType === 'function') {
	                context = cb;
	                cb = mainType;
	                each(componentsMap, function (components, componentType) {
	                    each(components, function (component, index) {
	                        cb.call(context, componentType, component, index);
	                    });
	                });
	            }
	            else if (zrUtil.isString(mainType)) {
	                each(componentsMap[mainType], cb, context);
	            }
	            else if (isObject(mainType)) {
	                var queryResult = this.findComponents(mainType);
	                each(queryResult, cb, context);
	            }
	        },

	        /**
	         * @param {string} name
	         * @return {Array.<module:echarts/model/Series>}
	         */
	        getSeriesByName: function (name) {
	            var series = this._componentsMap.series;
	            return filter(series, function (oneSeries) {
	                return oneSeries.name === name;
	            });
	        },

	        /**
	         * @param {number} seriesIndex
	         * @return {module:echarts/model/Series}
	         */
	        getSeriesByIndex: function (seriesIndex) {
	            return this._componentsMap.series[seriesIndex];
	        },

	        /**
	         * @param {string} subType
	         * @return {Array.<module:echarts/model/Series>}
	         */
	        getSeriesByType: function (subType) {
	            var series = this._componentsMap.series;
	            return filter(series, function (oneSeries) {
	                return oneSeries.subType === subType;
	            });
	        },

	        /**
	         * @return {Array.<module:echarts/model/Series>}
	         */
	        getSeries: function () {
	            return this._componentsMap.series.slice();
	        },

	        /**
	         * After filtering, series may be different
	         * frome raw series.
	         *
	         * @param {Function} cb
	         * @param {*} context
	         */
	        eachSeries: function (cb, context) {
	            assertSeriesInitialized(this);
	            each(this._seriesIndices, function (rawSeriesIndex) {
	                var series = this._componentsMap.series[rawSeriesIndex];
	                cb.call(context, series, rawSeriesIndex);
	            }, this);
	        },

	        /**
	         * Iterate raw series before filtered.
	         *
	         * @param {Function} cb
	         * @param {*} context
	         */
	        eachRawSeries: function (cb, context) {
	            each(this._componentsMap.series, cb, context);
	        },

	        /**
	         * After filtering, series may be different.
	         * frome raw series.
	         *
	         * @parma {string} subType
	         * @param {Function} cb
	         * @param {*} context
	         */
	        eachSeriesByType: function (subType, cb, context) {
	            assertSeriesInitialized(this);
	            each(this._seriesIndices, function (rawSeriesIndex) {
	                var series = this._componentsMap.series[rawSeriesIndex];
	                if (series.subType === subType) {
	                    cb.call(context, series, rawSeriesIndex);
	                }
	            }, this);
	        },

	        /**
	         * Iterate raw series before filtered of given type.
	         *
	         * @parma {string} subType
	         * @param {Function} cb
	         * @param {*} context
	         */
	        eachRawSeriesByType: function (subType, cb, context) {
	            return each(this.getSeriesByType(subType), cb, context);
	        },

	        /**
	         * @param {module:echarts/model/Series} seriesModel
	         */
	        isSeriesFiltered: function (seriesModel) {
	            assertSeriesInitialized(this);
	            return zrUtil.indexOf(this._seriesIndices, seriesModel.componentIndex) < 0;
	        },

	        /**
	         * @param {Function} cb
	         * @param {*} context
	         */
	        filterSeries: function (cb, context) {
	            assertSeriesInitialized(this);
	            var filteredSeries = filter(
	                this._componentsMap.series, cb, context
	            );
	            this._seriesIndices = createSeriesIndices(filteredSeries);
	        },

	        restoreData: function () {
	            var componentsMap = this._componentsMap;

	            this._seriesIndices = createSeriesIndices(componentsMap.series);

	            var componentTypes = [];
	            each(componentsMap, function (components, componentType) {
	                componentTypes.push(componentType);
	            });

	            ComponentModel.topologicalTravel(
	                componentTypes,
	                ComponentModel.getAllClassMainTypes(),
	                function (componentType, dependencies) {
	                    each(componentsMap[componentType], function (component) {
	                        component.restoreData();
	                    });
	                }
	            );
	        }

	    });

	    /**
	     * @inner
	     */
	    function mergeTheme(option, theme) {
	        for (var name in theme) {
	            // 如果有 component model 则把具体的 merge 逻辑交给该 model 处理
	            if (!ComponentModel.hasClass(name)) {
	                if (typeof theme[name] === 'object') {
	                    option[name] = !option[name]
	                        ? zrUtil.clone(theme[name])
	                        : zrUtil.merge(option[name], theme[name], false);
	                }
	                else {
	                    if (option[name] == null) {
	                        option[name] = theme[name];
	                    }
	                }
	            }
	        }
	    }

	    function initBase(baseOption) {
	        baseOption = baseOption;

	        // Using OPTION_INNER_KEY to mark that this option can not be used outside,
	        // i.e. `chart.setOption(chart.getModel().option);` is forbiden.
	        this.option = {};
	        this.option[OPTION_INNER_KEY] = 1;

	        /**
	         * @type {Object.<string, Array.<module:echarts/model/Model>>}
	         * @private
	         */
	        this._componentsMap = {};

	        /**
	         * Mapping between filtered series list and raw series list.
	         * key: filtered series indices, value: raw series indices.
	         * @type {Array.<nubmer>}
	         * @private
	         */
	        this._seriesIndices = null;

	        mergeTheme(baseOption, this._theme.option);

	        // TODO Needs clone when merging to the unexisted property
	        zrUtil.merge(baseOption, globalDefault, false);

	        this.mergeOption(baseOption);
	    }

	    /**
	     * @inner
	     * @param {Array.<string>|string} types model types
	     * @return {Object} key: {string} type, value: {Array.<Object>} models
	     */
	    function getComponentsByTypes(componentsMap, types) {
	        if (!zrUtil.isArray(types)) {
	            types = types ? [types] : [];
	        }

	        var ret = {};
	        each(types, function (type) {
	            ret[type] = (componentsMap[type] || []).slice();
	        });

	        return ret;
	    }

	    /**
	     * @inner
	     */
	    function makeKeyInfo(mainType, mapResult) {
	        // We use this id to hash component models and view instances
	        // in echarts. id can be specified by user, or auto generated.

	        // The id generation rule ensures new view instance are able
	        // to mapped to old instance when setOption are called in
	        // no-merge mode. So we generate model id by name and plus
	        // type in view id.

	        // name can be duplicated among components, which is convenient
	        // to specify multi components (like series) by one name.

	        // Ensure that each id is distinct.
	        var idMap = {};

	        each(mapResult, function (item, index) {
	            var existCpt = item.exist;
	            existCpt && (idMap[existCpt.id] = item);
	        });

	        each(mapResult, function (item, index) {
	            var opt = item.option;

	            zrUtil.assert(
	                !opt || opt.id == null || !idMap[opt.id] || idMap[opt.id] === item,
	                'id duplicates: ' + (opt && opt.id)
	            );

	            opt && opt.id != null && (idMap[opt.id] = item);

	            // Complete subType
	            if (isObject(opt)) {
	                var subType = determineSubType(mainType, opt, item.exist);
	                item.keyInfo = {mainType: mainType, subType: subType};
	            }
	        });

	        // Make name and id.
	        each(mapResult, function (item, index) {
	            var existCpt = item.exist;
	            var opt = item.option;
	            var keyInfo = item.keyInfo;

	            if (!isObject(opt)) {
	                return;
	            }

	            // name can be overwitten. Consider case: axis.name = '20km'.
	            // But id generated by name will not be changed, which affect
	            // only in that case: setOption with 'not merge mode' and view
	            // instance will be recreated, which can be accepted.
	            keyInfo.name = opt.name != null
	                ? opt.name + ''
	                : existCpt
	                ? existCpt.name
	                : '\0-';

	            if (existCpt) {
	                keyInfo.id = existCpt.id;
	            }
	            else if (opt.id != null) {
	                keyInfo.id = opt.id + '';
	            }
	            else {
	                // Consider this situatoin:
	                //  optionA: [{name: 'a'}, {name: 'a'}, {..}]
	                //  optionB [{..}, {name: 'a'}, {name: 'a'}]
	                // Series with the same name between optionA and optionB
	                // should be mapped.
	                var idNum = 0;
	                do {
	                    keyInfo.id = '\0' + keyInfo.name + '\0' + idNum++;
	                }
	                while (idMap[keyInfo.id]);
	            }

	            idMap[keyInfo.id] = item;
	        });
	    }

	    /**
	     * @inner
	     */
	    function determineSubType(mainType, newCptOption, existComponent) {
	        var subType = newCptOption.type
	            ? newCptOption.type
	            : existComponent
	            ? existComponent.subType
	            // Use determineSubType only when there is no existComponent.
	            : ComponentModel.determineSubType(mainType, newCptOption);

	        // tooltip, markline, markpoint may always has no subType
	        return subType;
	    }

	    /**
	     * @inner
	     */
	    function createSeriesIndices(seriesModels) {
	        return map(seriesModels, function (series) {
	            return series.componentIndex;
	        }) || [];
	    }

	    /**
	     * @inner
	     */
	    function filterBySubType(components, condition) {
	        // Using hasOwnProperty for restrict. Consider
	        // subType is undefined in user payload.
	        return condition.hasOwnProperty('subType')
	            ? filter(components, function (cpt) {
	                return cpt.subType === condition.subType;
	            })
	            : components;
	    }

	    /**
	     * @inner
	     */
	    function assertSeriesInitialized(ecModel) {
	        // Components that use _seriesIndices should depends on series component,
	        // which make sure that their initialization is after series.
	        if (!ecModel._seriesIndices) {
	            throw new Error('Series has not been initialized yet.');
	        }
	    }

	    module.exports = GlobalModel;


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @module zrender/core/util
	 */

	    var Gradient = __webpack_require__(4);
	    // 用于处理merge时无法遍历Date等对象的问题
	    var BUILTIN_OBJECT = {
	        '[object Function]': 1,
	        '[object RegExp]': 1,
	        '[object Date]': 1,
	        '[object Error]': 1,
	        '[object CanvasGradient]': 1
	    };

	    var objToString = Object.prototype.toString;

	    var arrayProto = Array.prototype;
	    var nativeForEach = arrayProto.forEach;
	    var nativeFilter = arrayProto.filter;
	    var nativeSlice = arrayProto.slice;
	    var nativeMap = arrayProto.map;
	    var nativeReduce = arrayProto.reduce;

	    /**
	     * @param {*} source
	     * @return {*} 拷贝后的新对象
	     */
	    function clone(source) {
	        if (typeof source == 'object' && source !== null) {
	            var result = source;
	            if (source instanceof Array) {
	                result = [];
	                for (var i = 0, len = source.length; i < len; i++) {
	                    result[i] = clone(source[i]);
	                }
	            }
	            else if (
	                !isBuildInObject(source)
	                // 是否为 dom 对象
	                && !isDom(source)
	            ) {
	                result = {};
	                for (var key in source) {
	                    if (source.hasOwnProperty(key)) {
	                        result[key] = clone(source[key]);
	                    }
	                }
	            }

	            return result;
	        }

	        return source;
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {*} target
	     * @param {*} source
	     * @param {boolean} [overwrite=false]
	     */
	    function merge(target, source, overwrite) {
	        // We should escapse that source is string
	        // and enter for ... in ...
	        if (!isObject(source) || !isObject(target)) {
	            return overwrite ? clone(source) : target;
	        }

	        for (var key in source) {
	            if (source.hasOwnProperty(key)) {
	                var targetProp = target[key];
	                var sourceProp = source[key];

	                if (isObject(sourceProp)
	                    && isObject(targetProp)
	                    && !isArray(sourceProp)
	                    && !isArray(targetProp)
	                    && !isDom(sourceProp)
	                    && !isDom(targetProp)
	                    && !isBuildInObject(sourceProp)
	                    && !isBuildInObject(targetProp)
	                ) {
	                    // 如果需要递归覆盖，就递归调用merge
	                    merge(targetProp, sourceProp, overwrite);
	                }
	                else if (overwrite || !(key in target)) {
	                    // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
	                    // NOTE，在 target[key] 不存在的时候也是直接覆盖
	                    target[key] = clone(source[key], true);
	                }
	            }
	        }

	        return target;
	    }

	    /**
	     * @param {Array} targetAndSources The first item is target, and the rests are source.
	     * @param {boolean} [overwrite=false]
	     * @return {*} target
	     */
	    function mergeAll(targetAndSources, overwrite) {
	        var result = targetAndSources[0];
	        for (var i = 1, len = targetAndSources.length; i < len; i++) {
	            result = merge(result, targetAndSources[i], overwrite);
	        }
	        return result;
	    }

	    /**
	     * @param {*} target
	     * @param {*} source
	     * @memberOf module:zrender/core/util
	     */
	    function extend(target, source) {
	        for (var key in source) {
	            if (source.hasOwnProperty(key)) {
	                target[key] = source[key];
	            }
	        }
	        return target;
	    }

	    /**
	     * @param {*} target
	     * @param {*} source
	     * @param {boolen} [overlay=false]
	     * @memberOf module:zrender/core/util
	     */
	    function defaults(target, source, overlay) {
	        for (var key in source) {
	            if (source.hasOwnProperty(key)
	                && (overlay ? source[key] != null : target[key] == null)
	            ) {
	                target[key] = source[key];
	            }
	        }
	        return target;
	    }

	    function createCanvas() {
	        return document.createElement('canvas');
	    }
	    // FIXME
	    var _ctx;
	    function getContext() {
	        if (!_ctx) {
	            // Use util.createCanvas instead of createCanvas
	            // because createCanvas may be overwritten in different environment
	            _ctx = util.createCanvas().getContext('2d');
	        }
	        return _ctx;
	    }

	    /**
	     * 查询数组中元素的index
	     * @memberOf module:zrender/core/util
	     */
	    function indexOf(array, value) {
	        if (array) {
	            if (array.indexOf) {
	                return array.indexOf(value);
	            }
	            for (var i = 0, len = array.length; i < len; i++) {
	                if (array[i] === value) {
	                    return i;
	                }
	            }
	        }
	        return -1;
	    }

	    /**
	     * 构造类继承关系
	     *
	     * @memberOf module:zrender/core/util
	     * @param {Function} clazz 源类
	     * @param {Function} baseClazz 基类
	     */
	    function inherits(clazz, baseClazz) {
	        var clazzPrototype = clazz.prototype;
	        function F() {}
	        F.prototype = baseClazz.prototype;
	        clazz.prototype = new F();

	        for (var prop in clazzPrototype) {
	            clazz.prototype[prop] = clazzPrototype[prop];
	        }
	        clazz.prototype.constructor = clazz;
	        clazz.superClass = baseClazz;
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {Object|Function} target
	     * @param {Object|Function} sorce
	     * @param {boolean} overlay
	     */
	    function mixin(target, source, overlay) {
	        target = 'prototype' in target ? target.prototype : target;
	        source = 'prototype' in source ? source.prototype : source;

	        defaults(target, source, overlay);
	    }

	    /**
	     * @param {Array|TypedArray} data
	     */
	    function isArrayLike(data) {
	        if (! data) {
	            return;
	        }
	        if (typeof data == 'string') {
	            return false;
	        }
	        return typeof data.length == 'number';
	    }

	    /**
	     * 数组或对象遍历
	     * @memberOf module:zrender/core/util
	     * @param {Object|Array} obj
	     * @param {Function} cb
	     * @param {*} [context]
	     */
	    function each(obj, cb, context) {
	        if (!(obj && cb)) {
	            return;
	        }
	        if (obj.forEach && obj.forEach === nativeForEach) {
	            obj.forEach(cb, context);
	        }
	        else if (obj.length === +obj.length) {
	            for (var i = 0, len = obj.length; i < len; i++) {
	                cb.call(context, obj[i], i, obj);
	            }
	        }
	        else {
	            for (var key in obj) {
	                if (obj.hasOwnProperty(key)) {
	                    cb.call(context, obj[key], key, obj);
	                }
	            }
	        }
	    }

	    /**
	     * 数组映射
	     * @memberOf module:zrender/core/util
	     * @param {Array} obj
	     * @param {Function} cb
	     * @param {*} [context]
	     * @return {Array}
	     */
	    function map(obj, cb, context) {
	        if (!(obj && cb)) {
	            return;
	        }
	        if (obj.map && obj.map === nativeMap) {
	            return obj.map(cb, context);
	        }
	        else {
	            var result = [];
	            for (var i = 0, len = obj.length; i < len; i++) {
	                result.push(cb.call(context, obj[i], i, obj));
	            }
	            return result;
	        }
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {Array} obj
	     * @param {Function} cb
	     * @param {Object} [memo]
	     * @param {*} [context]
	     * @return {Array}
	     */
	    function reduce(obj, cb, memo, context) {
	        if (!(obj && cb)) {
	            return;
	        }
	        if (obj.reduce && obj.reduce === nativeReduce) {
	            return obj.reduce(cb, memo, context);
	        }
	        else {
	            for (var i = 0, len = obj.length; i < len; i++) {
	                memo = cb.call(context, memo, obj[i], i, obj);
	            }
	            return memo;
	        }
	    }

	    /**
	     * 数组过滤
	     * @memberOf module:zrender/core/util
	     * @param {Array} obj
	     * @param {Function} cb
	     * @param {*} [context]
	     * @return {Array}
	     */
	    function filter(obj, cb, context) {
	        if (!(obj && cb)) {
	            return;
	        }
	        if (obj.filter && obj.filter === nativeFilter) {
	            return obj.filter(cb, context);
	        }
	        else {
	            var result = [];
	            for (var i = 0, len = obj.length; i < len; i++) {
	                if (cb.call(context, obj[i], i, obj)) {
	                    result.push(obj[i]);
	                }
	            }
	            return result;
	        }
	    }

	    /**
	     * 数组项查找
	     * @memberOf module:zrender/core/util
	     * @param {Array} obj
	     * @param {Function} cb
	     * @param {*} [context]
	     * @return {Array}
	     */
	    function find(obj, cb, context) {
	        if (!(obj && cb)) {
	            return;
	        }
	        for (var i = 0, len = obj.length; i < len; i++) {
	            if (cb.call(context, obj[i], i, obj)) {
	                return obj[i];
	            }
	        }
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {Function} func
	     * @param {*} context
	     * @return {Function}
	     */
	    function bind(func, context) {
	        var args = nativeSlice.call(arguments, 2);
	        return function () {
	            return func.apply(context, args.concat(nativeSlice.call(arguments)));
	        };
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {Function} func
	     * @return {Function}
	     */
	    function curry(func) {
	        var args = nativeSlice.call(arguments, 1);
	        return function () {
	            return func.apply(this, args.concat(nativeSlice.call(arguments)));
	        };
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {*} value
	     * @return {boolean}
	     */
	    function isArray(value) {
	        return objToString.call(value) === '[object Array]';
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {*} value
	     * @return {boolean}
	     */
	    function isFunction(value) {
	        return typeof value === 'function';
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {*} value
	     * @return {boolean}
	     */
	    function isString(value) {
	        return objToString.call(value) === '[object String]';
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {*} value
	     * @return {boolean}
	     */
	    function isObject(value) {
	        // Avoid a V8 JIT bug in Chrome 19-20.
	        // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
	        var type = typeof value;
	        return type === 'function' || (!!value && type == 'object');
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {*} value
	     * @return {boolean}
	     */
	    function isBuildInObject(value) {
	        return !!BUILTIN_OBJECT[objToString.call(value)]
	            || (value instanceof Gradient);
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {*} value
	     * @return {boolean}
	     */
	    function isDom(value) {
	        return value && value.nodeType === 1
	               && typeof(value.nodeName) == 'string';
	    }

	    /**
	     * If value1 is not null, then return value1, otherwise judget rest of values.
	     * @memberOf module:zrender/core/util
	     * @return {*} Final value
	     */
	    function retrieve(values) {
	        for (var i = 0, len = arguments.length; i < len; i++) {
	            if (arguments[i] != null) {
	                return arguments[i];
	            }
	        }
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {Array} arr
	     * @param {number} startIndex
	     * @param {number} endIndex
	     * @return {Array}
	     */
	    function slice() {
	        return Function.call.apply(nativeSlice, arguments);
	    }

	    /**
	     * @memberOf module:zrender/core/util
	     * @param {boolean} condition
	     * @param {string} message
	     */
	    function assert(condition, message) {
	        if (!condition) {
	            throw new Error(message);
	        }
	    }

	    var util = {
	        inherits: inherits,
	        mixin: mixin,
	        clone: clone,
	        merge: merge,
	        mergeAll: mergeAll,
	        extend: extend,
	        defaults: defaults,
	        getContext: getContext,
	        createCanvas: createCanvas,
	        indexOf: indexOf,
	        slice: slice,
	        find: find,
	        isArrayLike: isArrayLike,
	        each: each,
	        map: map,
	        reduce: reduce,
	        filter: filter,
	        bind: bind,
	        curry: curry,
	        isArray: isArray,
	        isString: isString,
	        isObject: isObject,
	        isFunction: isFunction,
	        isBuildInObject: isBuildInObject,
	        isDom: isDom,
	        retrieve: retrieve,
	        assert: assert,
	        noop: function () {}
	    };
	    module.exports = util;



/***/ },
/* 4 */
/***/ function(module, exports) {

	

	    /**
	     * @param {Array.<Object>} colorStops
	     */
	    var Gradient = function (colorStops) {

	        this.colorStops = colorStops || [];
	    };

	    Gradient.prototype = {

	        constructor: Gradient,

	        addColorStop: function (offset, color) {
	            this.colorStops.push({

	                offset: offset,

	                color: color
	            });
	        }
	    };

	    module.exports = Gradient;


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	

	    var formatUtil = __webpack_require__(6);
	    var nubmerUtil = __webpack_require__(7);
	    var zrUtil = __webpack_require__(3);

	    var AXIS_DIMS = ['x', 'y', 'z', 'radius', 'angle'];

	    var modelUtil = {};

	    /**
	     * Create "each" method to iterate names.
	     *
	     * @pubilc
	     * @param  {Array.<string>} names
	     * @param  {Array.<string>=} attrs
	     * @return {Function}
	     */
	    modelUtil.createNameEach = function (names, attrs) {
	        names = names.slice();
	        var capitalNames = zrUtil.map(names, modelUtil.capitalFirst);
	        attrs = (attrs || []).slice();
	        var capitalAttrs = zrUtil.map(attrs, modelUtil.capitalFirst);

	        return function (callback, context) {
	            zrUtil.each(names, function (name, index) {
	                var nameObj = {name: name, capital: capitalNames[index]};

	                for (var j = 0; j < attrs.length; j++) {
	                    nameObj[attrs[j]] = name + capitalAttrs[j];
	                }

	                callback.call(context, nameObj);
	            });
	        };
	    };

	    /**
	     * @public
	     */
	    modelUtil.capitalFirst = function (str) {
	        return str ? str.charAt(0).toUpperCase() + str.substr(1) : str;
	    };

	    /**
	     * Iterate each dimension name.
	     *
	     * @public
	     * @param {Function} callback The parameter is like:
	     *                            {
	     *                                name: 'angle',
	     *                                capital: 'Angle',
	     *                                axis: 'angleAxis',
	     *                                axisIndex: 'angleAixs',
	     *                                index: 'angleIndex'
	     *                            }
	     * @param {Object} context
	     */
	    modelUtil.eachAxisDim = modelUtil.createNameEach(AXIS_DIMS, ['axisIndex', 'axis', 'index']);

	    /**
	     * If value is not array, then translate it to array.
	     * @param  {*} value
	     * @return {Array} [value] or value
	     */
	    modelUtil.normalizeToArray = function (value) {
	        return zrUtil.isArray(value)
	            ? value
	            : value == null
	            ? []
	            : [value];
	    };

	    /**
	     * If tow dataZoomModels has the same axis controlled, we say that they are 'linked'.
	     * dataZoomModels and 'links' make up one or more graphics.
	     * This function finds the graphic where the source dataZoomModel is in.
	     *
	     * @public
	     * @param {Function} forEachNode Node iterator.
	     * @param {Function} forEachEdgeType edgeType iterator
	     * @param {Function} edgeIdGetter Giving node and edgeType, return an array of edge id.
	     * @return {Function} Input: sourceNode, Output: Like {nodes: [], dims: {}}
	     */
	    modelUtil.createLinkedNodesFinder = function (forEachNode, forEachEdgeType, edgeIdGetter) {

	        return function (sourceNode) {
	            var result = {
	                nodes: [],
	                records: {} // key: edgeType.name, value: Object (key: edge id, value: boolean).
	            };

	            forEachEdgeType(function (edgeType) {
	                result.records[edgeType.name] = {};
	            });

	            if (!sourceNode) {
	                return result;
	            }

	            absorb(sourceNode, result);

	            var existsLink;
	            do {
	                existsLink = false;
	                forEachNode(processSingleNode);
	            }
	            while (existsLink);

	            function processSingleNode(node) {
	                if (!isNodeAbsorded(node, result) && isLinked(node, result)) {
	                    absorb(node, result);
	                    existsLink = true;
	                }
	            }

	            return result;
	        };

	        function isNodeAbsorded(node, result) {
	            return zrUtil.indexOf(result.nodes, node) >= 0;
	        }

	        function isLinked(node, result) {
	            var hasLink = false;
	            forEachEdgeType(function (edgeType) {
	                zrUtil.each(edgeIdGetter(node, edgeType) || [], function (edgeId) {
	                    result.records[edgeType.name][edgeId] && (hasLink = true);
	                });
	            });
	            return hasLink;
	        }

	        function absorb(node, result) {
	            result.nodes.push(node);
	            forEachEdgeType(function (edgeType) {
	                zrUtil.each(edgeIdGetter(node, edgeType) || [], function (edgeId) {
	                    result.records[edgeType.name][edgeId] = true;
	                });
	            });
	        }
	    };

	    /**
	     * Sync default option between normal and emphasis like `position` and `show`
	     * In case some one will write code like
	     *     label: {
	     *         normal: {
	     *             show: false,
	     *             position: 'outside',
	     *             textStyle: {
	     *                 fontSize: 18
	     *             }
	     *         },
	     *         emphasis: {
	     *             show: true
	     *         }
	     *     }
	     * @param {Object} opt
	     * @param {Array.<string>} subOpts
	     */
	     modelUtil.defaultEmphasis = function (opt, subOpts) {
	        if (opt) {
	            var emphasisOpt = opt.emphasis = opt.emphasis || {};
	            var normalOpt = opt.normal = opt.normal || {};

	            // Default emphasis option from normal
	            zrUtil.each(subOpts, function (subOptName) {
	                var val = zrUtil.retrieve(emphasisOpt[subOptName], normalOpt[subOptName]);
	                if (val != null) {
	                    emphasisOpt[subOptName] = val;
	                }
	            });
	        }
	    };

	    modelUtil.LABEL_OPTIONS = ['position', 'show', 'textStyle', 'distance', 'formatter'];

	    /**
	     * data could be [12, 2323, {value: 223}, [1221, 23], {value: [2, 23]}]
	     * This helper method retieves value from data.
	     * @param {string|number|Date|Array|Object} dataItem
	     * @return {number|string|Date|Array.<number|string|Date>}
	     */
	    modelUtil.getDataItemValue = function (dataItem) {
	        // Performance sensitive.
	        return dataItem && (dataItem.value == null ? dataItem : dataItem.value);
	    };

	    /**
	     * This helper method convert value in data.
	     * @param {string|number|Date} value
	     * @param {Object|string} [dimInfo] If string (like 'x'), dimType defaults 'number'.
	     */
	    modelUtil.converDataValue = function (value, dimInfo) {
	        // Performance sensitive.
	        var dimType = dimInfo && dimInfo.type;
	        if (dimType === 'ordinal') {
	            return value;
	        }

	        if (dimType === 'time' && !isFinite(value) && value != null && value !== '-') {
	            value = +nubmerUtil.parseDate(value);
	        }

	        // dimType defaults 'number'.
	        // If dimType is not ordinal and value is null or undefined or NaN or '-',
	        // parse to NaN.
	        return (value == null || value === '')
	            ? NaN : +value; // If string (like '-'), using '+' parse to NaN
	    };

	    modelUtil.dataFormatMixin = {
	        /**
	         * Get params for formatter
	         * @param {number} dataIndex
	         * @param {string} [dataType]
	         * @return {Object}
	         */
	        getDataParams: function (dataIndex, dataType) {
	            var data = this.getData(dataType);

	            var seriesIndex = this.seriesIndex;
	            var seriesName = this.name;

	            var rawValue = this.getRawValue(dataIndex, dataType);
	            var rawDataIndex = data.getRawIndex(dataIndex);
	            var name = data.getName(dataIndex, true);
	            var itemOpt = data.getRawDataItem(dataIndex);

	            return {
	                componentType: this.mainType,
	                componentSubType: this.subType,
	                seriesType: this.mainType === 'series' ? this.subType : null,
	                seriesIndex: seriesIndex,
	                seriesName: seriesName,
	                name: name,
	                dataIndex: rawDataIndex,
	                data: itemOpt,
	                dataType: dataType,
	                value: rawValue,
	                color: data.getItemVisual(dataIndex, 'color'),

	                // Param name list for mapping `a`, `b`, `c`, `d`, `e`
	                $vars: ['seriesName', 'name', 'value']
	            };
	        },

	        /**
	         * Format label
	         * @param {number} dataIndex
	         * @param {string} [status='normal'] 'normal' or 'emphasis'
	         * @param {string} [dataType]
	         * @param {number} [dimIndex]
	         * @return {string}
	         */
	        getFormattedLabel: function (dataIndex, status, dataType, dimIndex) {
	            status = status || 'normal';
	            var data = this.getData(dataType);
	            var itemModel = data.getItemModel(dataIndex);

	            var params = this.getDataParams(dataIndex, dataType);
	            if (dimIndex != null && zrUtil.isArray(params.value)) {
	                params.value = params.value[dimIndex];
	            }

	            var formatter = itemModel.get(['label', status, 'formatter']);

	            if (typeof formatter === 'function') {
	                params.status = status;
	                return formatter(params);
	            }
	            else if (typeof formatter === 'string') {
	                return formatUtil.formatTpl(formatter, params);
	            }
	        },

	        /**
	         * Get raw value in option
	         * @param {number} idx
	         * @param {string} [dataType]
	         * @return {Object}
	         */
	        getRawValue: function (idx, dataType) {
	            var data = this.getData(dataType);
	            var dataItem = data.getRawDataItem(idx);
	            if (dataItem != null) {
	                return (zrUtil.isObject(dataItem) && !zrUtil.isArray(dataItem))
	                    ? dataItem.value : dataItem;
	            }
	        },

	        /**
	         * Should be implemented.
	         * @param {number} dataIndex
	         * @param {boolean} [multipleSeries=false]
	         * @param {number} [dataType]
	         * @return {string} tooltip string
	         */
	        formatTooltip: zrUtil.noop
	    };

	    /**
	     * Mapping to exists for merge.
	     *
	     * @public
	     * @param {Array.<Object>|Array.<module:echarts/model/Component>} exists
	     * @param {Object|Array.<Object>} newCptOptions
	     * @return {Array.<Object>} Result, like [{exist: ..., option: ...}, {}],
	     *                          which order is the same as exists.
	     */
	    modelUtil.mappingToExists = function (exists, newCptOptions) {
	        // Mapping by the order by original option (but not order of
	        // new option) in merge mode. Because we should ensure
	        // some specified index (like xAxisIndex) is consistent with
	        // original option, which is easy to understand, espatially in
	        // media query. And in most case, merge option is used to
	        // update partial option but not be expected to change order.
	        newCptOptions = (newCptOptions || []).slice();

	        var result = zrUtil.map(exists || [], function (obj, index) {
	            return {exist: obj};
	        });

	        // Mapping by id or name if specified.
	        zrUtil.each(newCptOptions, function (cptOption, index) {
	            if (!zrUtil.isObject(cptOption)) {
	                return;
	            }

	            for (var i = 0; i < result.length; i++) {
	                var exist = result[i].exist;
	                if (!result[i].option // Consider name: two map to one.
	                    && (
	                        // id has highest priority.
	                        (cptOption.id != null && exist.id === cptOption.id + '')
	                        || (cptOption.name != null
	                            && !modelUtil.isIdInner(cptOption)
	                            && !modelUtil.isIdInner(exist)
	                            && exist.name === cptOption.name + ''
	                        )
	                    )
	                ) {
	                    result[i].option = cptOption;
	                    newCptOptions[index] = null;
	                    break;
	                }
	            }
	        });

	        // Otherwise mapping by index.
	        zrUtil.each(newCptOptions, function (cptOption, index) {
	            if (!zrUtil.isObject(cptOption)) {
	                return;
	            }

	            var i = 0;
	            for (; i < result.length; i++) {
	                var exist = result[i].exist;
	                if (!result[i].option
	                    && !modelUtil.isIdInner(exist)
	                    // Caution:
	                    // Do not overwrite id. But name can be overwritten,
	                    // because axis use name as 'show label text'.
	                    // 'exist' always has id and name and we dont
	                    // need to check it.
	                    && cptOption.id == null
	                ) {
	                    result[i].option = cptOption;
	                    break;
	                }
	            }

	            if (i >= result.length) {
	                result.push({option: cptOption});
	            }
	        });

	        return result;
	    };

	    /**
	     * @public
	     * @param {Object} cptOption
	     * @return {boolean}
	     */
	    modelUtil.isIdInner = function (cptOption) {
	        return zrUtil.isObject(cptOption)
	            && cptOption.id
	            && (cptOption.id + '').indexOf('\0_ec_\0') === 0;
	    };

	    module.exports = modelUtil;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	

	    var zrUtil = __webpack_require__(3);
	    var numberUtil = __webpack_require__(7);

	    /**
	     * 每三位默认加,格式化
	     * @type {string|number} x
	     */
	    function addCommas(x) {
	        if (isNaN(x)) {
	            return '-';
	        }
	        x = (x + '').split('.');
	        return x[0].replace(/(\d{1,3})(?=(?:\d{3})+(?!\d))/g,'$1,')
	               + (x.length > 1 ? ('.' + x[1]) : '');
	    }

	    /**
	     * @param {string} str
	     * @return {string} str
	     */
	    function toCamelCase(str) {
	        return str.toLowerCase().replace(/-(.)/g, function(match, group1) {
	            return group1.toUpperCase();
	        });
	    }

	    /**
	     * Normalize css liked array configuration
	     * e.g.
	     *  3 => [3, 3, 3, 3]
	     *  [4, 2] => [4, 2, 4, 2]
	     *  [4, 3, 2] => [4, 3, 2, 3]
	     * @param {number|Array.<number>} val
	     */
	    function normalizeCssArray(val) {
	        var len = val.length;
	        if (typeof (val) === 'number') {
	            return [val, val, val, val];
	        }
	        else if (len === 2) {
	            // vertical | horizontal
	            return [val[0], val[1], val[0], val[1]];
	        }
	        else if (len === 3) {
	            // top | horizontal | bottom
	            return [val[0], val[1], val[2], val[1]];
	        }
	        return val;
	    }

	    function encodeHTML(source) {
	        return String(source)
	            .replace(/&/g, '&amp;')
	            .replace(/</g, '&lt;')
	            .replace(/>/g, '&gt;')
	            .replace(/"/g, '&quot;')
	            .replace(/'/g, '&#39;');
	    }

	    var TPL_VAR_ALIAS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

	    function wrapVar(varName, seriesIdx) {
	        return '{' + varName + (seriesIdx == null ? '' : seriesIdx) + '}';
	    }
	    /**
	     * Template formatter
	     * @param  {string} tpl
	     * @param  {Array.<Object>|Object} paramsList
	     * @return {string}
	     */
	    function formatTpl(tpl, paramsList) {
	        if (!zrUtil.isArray(paramsList)) {
	            paramsList = [paramsList];
	        }
	        var seriesLen = paramsList.length;
	        if (!seriesLen) {
	            return '';
	        }

	        var $vars = paramsList[0].$vars;
	        for (var i = 0; i < $vars.length; i++) {
	            var alias = TPL_VAR_ALIAS[i];
	            tpl = tpl.replace(wrapVar(alias),  wrapVar(alias, 0));
	        }
	        for (var seriesIdx = 0; seriesIdx < seriesLen; seriesIdx++) {
	            for (var k = 0; k < $vars.length; k++) {
	                tpl = tpl.replace(
	                    wrapVar(TPL_VAR_ALIAS[k], seriesIdx),
	                    paramsList[seriesIdx][$vars[k]]
	                );
	            }
	        }

	        return tpl;
	    }

	    /**
	     * ISO Date format
	     * @param {string} tpl
	     * @param {number} value
	     * @inner
	     */
	    function formatTime(tpl, value) {
	        if (tpl === 'week'
	            || tpl === 'month'
	            || tpl === 'quarter'
	            || tpl === 'half-year'
	            || tpl === 'year'
	        ) {
	            tpl = 'MM-dd\nyyyy';
	        }

	        var date = numberUtil.parseDate(value);
	        var y = date.getFullYear();
	        var M = date.getMonth() + 1;
	        var d = date.getDate();
	        var h = date.getHours();
	        var m = date.getMinutes();
	        var s = date.getSeconds();

	        tpl = tpl.replace('MM', s2d(M))
	            .toLowerCase()
	            .replace('yyyy', y)
	            .replace('yy', y % 100)
	            .replace('dd', s2d(d))
	            .replace('d', d)
	            .replace('hh', s2d(h))
	            .replace('h', h)
	            .replace('mm', s2d(m))
	            .replace('m', m)
	            .replace('ss', s2d(s))
	            .replace('s', s);

	        return tpl;
	    }

	    /**
	     * @param {string} str
	     * @return {string}
	     * @inner
	     */
	    function s2d(str) {
	        return str < 10 ? ('0' + str) : str;
	    }

	    module.exports = {

	        normalizeCssArray: normalizeCssArray,

	        addCommas: addCommas,

	        toCamelCase: toCamelCase,

	        encodeHTML: encodeHTML,

	        formatTpl: formatTpl,

	        formatTime: formatTime
	    };


/***/ },
/* 7 */
/***/ function(module, exports) {

	/**
	 * 数值处理模块
	 * @module echarts/util/number
	 */



	    var number = {};

	    var RADIAN_EPSILON = 1e-4;

	    function _trim(str) {
	        return str.replace(/^\s+/, '').replace(/\s+$/, '');
	    }

	    /**
	     * Linear mapping a value from domain to range
	     * @memberOf module:echarts/util/number
	     * @param  {(number|Array.<number>)} val
	     * @param  {Array.<number>} domain Domain extent domain[0] can be bigger than domain[1]
	     * @param  {Array.<number>} range  Range extent range[0] can be bigger than range[1]
	     * @param  {boolean} clamp
	     * @return {(number|Array.<number>}
	     */
	    number.linearMap = function (val, domain, range, clamp) {
	        var subDomain = domain[1] - domain[0];
	        var subRange = range[1] - range[0];

	        if (subDomain === 0) {
	            return subRange === 0
	                ? range[0]
	                : (range[0] + range[1]) / 2;
	        }

	        // Avoid accuracy problem in edge, such as
	        // 146.39 - 62.83 === 83.55999999999999.
	        // See echarts/test/ut/spec/util/number.js#linearMap#accuracyError
	        // It is a little verbose for efficiency considering this method
	        // is a hotspot.
	        if (clamp) {
	            if (subDomain > 0) {
	                if (val <= domain[0]) {
	                    return range[0];
	                }
	                else if (val >= domain[1]) {
	                    return range[1];
	                }
	            }
	            else {
	                if (val >= domain[0]) {
	                    return range[0];
	                }
	                else if (val <= domain[1]) {
	                    return range[1];
	                }
	            }
	        }
	        else {
	            if (val === domain[0]) {
	                return range[0];
	            }
	            if (val === domain[1]) {
	                return range[1];
	            }
	        }

	        return (val - domain[0]) / subDomain * subRange + range[0];
	    };

	    /**
	     * Convert a percent string to absolute number.
	     * Returns NaN if percent is not a valid string or number
	     * @memberOf module:echarts/util/number
	     * @param {string|number} percent
	     * @param {number} all
	     * @return {number}
	     */
	    number.parsePercent = function(percent, all) {
	        switch (percent) {
	            case 'center':
	            case 'middle':
	                percent = '50%';
	                break;
	            case 'left':
	            case 'top':
	                percent = '0%';
	                break;
	            case 'right':
	            case 'bottom':
	                percent = '100%';
	                break;
	        }
	        if (typeof percent === 'string') {
	            if (_trim(percent).match(/%$/)) {
	                return parseFloat(percent) / 100 * all;
	            }

	            return parseFloat(percent);
	        }

	        return percent == null ? NaN : +percent;
	    };

	    /**
	     * Fix rounding error of float numbers
	     * @param {number} x
	     * @return {number}
	     */
	    number.round = function (x) {
	        // PENDING
	        return +(+x).toFixed(10);
	    };

	    number.asc = function (arr) {
	        arr.sort(function (a, b) {
	            return a - b;
	        });
	        return arr;
	    };

	    /**
	     * Get precision
	     * @param {number} val
	     */
	    number.getPrecision = function (val) {
	        if (isNaN(val)) {
	            return 0;
	        }
	        // It is much faster than methods converting number to string as follows
	        //      var tmp = val.toString();
	        //      return tmp.length - 1 - tmp.indexOf('.');
	        // especially when precision is low
	        var e = 1;
	        var count = 0;
	        while (Math.round(val * e) / e !== val) {
	            e *= 10;
	            count++;
	        }
	        return count;
	    };

	    /**
	     * @param {Array.<number>} dataExtent
	     * @param {Array.<number>} pixelExtent
	     * @return {number}  precision
	     */
	    number.getPixelPrecision = function (dataExtent, pixelExtent) {
	        var log = Math.log;
	        var LN10 = Math.LN10;
	        var dataQuantity = Math.floor(log(dataExtent[1] - dataExtent[0]) / LN10);
	        var sizeQuantity = Math.round(log(Math.abs(pixelExtent[1] - pixelExtent[0])) / LN10);
	        return Math.max(
	            -dataQuantity + sizeQuantity,
	            0
	        );
	    };

	    // Number.MAX_SAFE_INTEGER, ie do not support.
	    number.MAX_SAFE_INTEGER = 9007199254740991;

	    /**
	     * To 0 - 2 * PI, considering negative radian.
	     * @param {number} radian
	     * @return {number}
	     */
	    number.remRadian = function (radian) {
	        var pi2 = Math.PI * 2;
	        return (radian % pi2 + pi2) % pi2;
	    };

	    /**
	     * @param {type} radian
	     * @return {boolean}
	     */
	    number.isRadianAroundZero = function (val) {
	        return val > -RADIAN_EPSILON && val < RADIAN_EPSILON;
	    };

	    /**
	     * @param {string|Date|number} value
	     * @return {number} timestamp
	     */
	    number.parseDate = function (value) {
	        return value instanceof Date
	            ? value
	            : new Date(
	                typeof value === 'string'
	                    ? value.replace(/-/g, '/')
	                    : Math.round(value)
	            );
	    };

	    /**
	     * Quantity of a number. e.g. 0.1, 1, 10, 100
	     * @param  {number} val
	     * @return {number}
	     */
	    number.quantity = function (val) {
	        return Math.pow(10, Math.floor(Math.log(val) / Math.LN10));
	    };

	    // "Nice Numbers for Graph Labels" of Graphic Gems
	    /**
	     * find a “nice” number approximately equal to x. Round the number if round = true, take ceiling if round = false
	     * The primary observation is that the “nicest” numbers in decimal are 1, 2, and 5, and all power-of-ten multiples of these numbers.
	     * @param  {number} val
	     * @param  {boolean} round
	     * @return {number}
	     */
	    number.nice = function (val, round) {
	        var exp10 = number.quantity(val);
	        var f = val / exp10; // between 1 and 10
	        var nf;
	        if (round) {
	            if (f < 1.5) { nf = 1; }
	            else if (f < 2.5) { nf = 2; }
	            else if (f < 4) { nf = 3; }
	            else if (f < 7) { nf = 5; }
	            else { nf = 10; }
	        }
	        else {
	            if (f < 1) { nf = 1; }
	            else if (f < 2) { nf = 2; }
	            else if (f < 3) { nf = 3; }
	            else if (f < 5) { nf = 5; }
	            else { nf = 10; }
	        }
	        return nf * exp10;
	    };

	    module.exports = number;


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @module echarts/model/Model
	 */


	    var zrUtil = __webpack_require__(3);
	    var clazzUtil = __webpack_require__(9);

	    /**
	     * @alias module:echarts/model/Model
	     * @constructor
	     * @param {Object} option
	     * @param {module:echarts/model/Model} [parentModel]
	     * @param {module:echarts/model/Global} [ecModel]
	     * @param {Object} extraOpt
	     */
	    function Model(option, parentModel, ecModel, extraOpt) {
	        /**
	         * @type {module:echarts/model/Model}
	         * @readOnly
	         */
	        this.parentModel = parentModel;

	        /**
	         * @type {module:echarts/model/Global}
	         * @readOnly
	         */
	        this.ecModel = ecModel;

	        /**
	         * @type {Object}
	         * @protected
	         */
	        this.option = option;

	        // Simple optimization
	        if (this.init) {
	            if (arguments.length <= 4) {
	                this.init(option, parentModel, ecModel, extraOpt);
	            }
	            else {
	                this.init.apply(this, arguments);
	            }
	        }
	    }

	    Model.prototype = {

	        constructor: Model,

	        /**
	         * Model 的初始化函数
	         * @param {Object} option
	         */
	        init: null,

	        /**
	         * 从新的 Option merge
	         */
	        mergeOption: function (option) {
	            zrUtil.merge(this.option, option, true);
	        },

	        /**
	         * @param {string} path
	         * @param {boolean} [ignoreParent=false]
	         * @return {*}
	         */
	        get: function (path, ignoreParent) {
	            if (!path) {
	                return this.option;
	            }

	            if (typeof path === 'string') {
	                path = path.split('.');
	            }

	            var obj = this.option;
	            var parentModel = this.parentModel;
	            for (var i = 0; i < path.length; i++) {
	                // Ignore empty
	                if (!path[i]) {
	                    continue;
	                }
	                // obj could be number/string/... (like 0)
	                obj = (obj && typeof obj === 'object') ? obj[path[i]] : null;
	                if (obj == null) {
	                    break;
	                }
	            }
	            if (obj == null && parentModel && !ignoreParent) {
	                obj = parentModel.get(path);
	            }
	            return obj;
	        },

	        /**
	         * @param {string} key
	         * @param {boolean} [ignoreParent=false]
	         * @return {*}
	         */
	        getShallow: function (key, ignoreParent) {
	            var option = this.option;
	            var val = option && option[key];
	            var parentModel = this.parentModel;
	            if (val == null && parentModel && !ignoreParent) {
	                val = parentModel.getShallow(key);
	            }
	            return val;
	        },

	        /**
	         * @param {string} path
	         * @param {module:echarts/model/Model} [parentModel]
	         * @return {module:echarts/model/Model}
	         */
	        getModel: function (path, parentModel) {
	            var obj = this.get(path, true);
	            var thisParentModel = this.parentModel;
	            var model = new Model(
	                obj, parentModel || (thisParentModel && thisParentModel.getModel(path)),
	                this.ecModel
	            );
	            return model;
	        },

	        /**
	         * If model has option
	         */
	        isEmpty: function () {
	            return this.option == null;
	        },

	        restoreData: function () {},

	        // Pending
	        clone: function () {
	            var Ctor = this.constructor;
	            return new Ctor(zrUtil.clone(this.option));
	        },

	        setReadOnly: function (properties) {
	            clazzUtil.setReadOnly(this, properties);
	        }
	    };

	    // Enable Model.extend.
	    clazzUtil.enableClassExtend(Model);

	    var mixin = zrUtil.mixin;
	    mixin(Model, __webpack_require__(10));
	    mixin(Model, __webpack_require__(12));
	    mixin(Model, __webpack_require__(13));
	    mixin(Model, __webpack_require__(18));

	    module.exports = Model;


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	

	    var zrUtil = __webpack_require__(3);

	    var clazz = {};

	    var TYPE_DELIMITER = '.';
	    var IS_CONTAINER = '___EC__COMPONENT__CONTAINER___';
	    /**
	     * @public
	     */
	    var parseClassType = clazz.parseClassType = function (componentType) {
	        var ret = {main: '', sub: ''};
	        if (componentType) {
	            componentType = componentType.split(TYPE_DELIMITER);
	            ret.main = componentType[0] || '';
	            ret.sub = componentType[1] || '';
	        }
	        return ret;
	    };
	    /**
	     * @public
	     */
	    clazz.enableClassExtend = function (RootClass, preConstruct) {
	        RootClass.extend = function (proto) {
	            var ExtendedClass = function () {
	                preConstruct && preConstruct.apply(this, arguments);
	                RootClass.apply(this, arguments);
	            };

	            zrUtil.extend(ExtendedClass.prototype, proto);

	            ExtendedClass.extend = this.extend;
	            ExtendedClass.superCall = superCall;
	            ExtendedClass.superApply = superApply;
	            zrUtil.inherits(ExtendedClass, this);
	            ExtendedClass.superClass = this;

	            return ExtendedClass;
	        };
	    };

	    // superCall should have class info, which can not be fetch from 'this'.
	    // Consider this case:
	    // class A has method f,
	    // class B inherits class A, overrides method f, f call superApply('f'),
	    // class C inherits class B, do not overrides method f,
	    // then when method of class C is called, dead loop occured.
	    function superCall(context, methodName) {
	        var args = zrUtil.slice(arguments, 2);
	        return this.superClass.prototype[methodName].apply(context, args);
	    }

	    function superApply(context, methodName, args) {
	        return this.superClass.prototype[methodName].apply(context, args);
	    }

	    /**
	     * @param {Object} entity
	     * @param {Object} options
	     * @param {boolean} [options.registerWhenExtend]
	     * @public
	     */
	    clazz.enableClassManagement = function (entity, options) {
	        options = options || {};

	        /**
	         * Component model classes
	         * key: componentType,
	         * value:
	         *     componentClass, when componentType is 'xxx'
	         *     or Object.<subKey, componentClass>, when componentType is 'xxx.yy'
	         * @type {Object}
	         */
	        var storage = {};

	        entity.registerClass = function (Clazz, componentType) {
	            if (componentType) {
	                componentType = parseClassType(componentType);

	                if (!componentType.sub) {
	                    if (storage[componentType.main]) {
	                        throw new Error(componentType.main + 'exists.');
	                    }
	                    storage[componentType.main] = Clazz;
	                }
	                else if (componentType.sub !== IS_CONTAINER) {
	                    var container = makeContainer(componentType);
	                    container[componentType.sub] = Clazz;
	                }
	            }
	            return Clazz;
	        };

	        entity.getClass = function (componentTypeMain, subType, throwWhenNotFound) {
	            var Clazz = storage[componentTypeMain];

	            if (Clazz && Clazz[IS_CONTAINER]) {
	                Clazz = subType ? Clazz[subType] : null;
	            }

	            if (throwWhenNotFound && !Clazz) {
	                throw new Error(
	                    'Component ' + componentTypeMain + '.' + (subType || '') + ' not exists. Load it first.'
	                );
	            }

	            return Clazz;
	        };

	        entity.getClassesByMainType = function (componentType) {
	            componentType = parseClassType(componentType);

	            var result = [];
	            var obj = storage[componentType.main];

	            if (obj && obj[IS_CONTAINER]) {
	                zrUtil.each(obj, function (o, type) {
	                    type !== IS_CONTAINER && result.push(o);
	                });
	            }
	            else {
	                result.push(obj);
	            }

	            return result;
	        };

	        entity.hasClass = function (componentType) {
	            // Just consider componentType.main.
	            componentType = parseClassType(componentType);
	            return !!storage[componentType.main];
	        };

	        /**
	         * @return {Array.<string>} Like ['aa', 'bb'], but can not be ['aa.xx']
	         */
	        entity.getAllClassMainTypes = function () {
	            var types = [];
	            zrUtil.each(storage, function (obj, type) {
	                types.push(type);
	            });
	            return types;
	        };

	        /**
	         * If a main type is container and has sub types
	         * @param  {string}  mainType
	         * @return {boolean}
	         */
	        entity.hasSubTypes = function (componentType) {
	            componentType = parseClassType(componentType);
	            var obj = storage[componentType.main];
	            return obj && obj[IS_CONTAINER];
	        };

	        entity.parseClassType = parseClassType;

	        function makeContainer(componentType) {
	            var container = storage[componentType.main];
	            if (!container || !container[IS_CONTAINER]) {
	                container = storage[componentType.main] = {};
	                container[IS_CONTAINER] = true;
	            }
	            return container;
	        }

	        if (options.registerWhenExtend) {
	            var originalExtend = entity.extend;
	            if (originalExtend) {
	                entity.extend = function (proto) {
	                    var ExtendedClass = originalExtend.call(this, proto);
	                    return entity.registerClass(ExtendedClass, proto.type);
	                };
	            }
	        }

	        return entity;
	    };

	    /**
	     * @param {string|Array.<string>} properties
	     */
	    clazz.setReadOnly = function (obj, properties) {
	        // FIXME It seems broken in IE8 simulation of IE11
	        // if (!zrUtil.isArray(properties)) {
	        //     properties = properties != null ? [properties] : [];
	        // }
	        // zrUtil.each(properties, function (prop) {
	        //     var value = obj[prop];

	        //     Object.defineProperty
	        //         && Object.defineProperty(obj, prop, {
	        //             value: value, writable: false
	        //         });
	        //     zrUtil.isArray(obj[prop])
	        //         && Object.freeze
	        //         && Object.freeze(obj[prop]);
	        // });
	    };

	    module.exports = clazz;


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	
	    var getLineStyle = __webpack_require__(11)(
	        [
	            ['lineWidth', 'width'],
	            ['stroke', 'color'],
	            ['opacity'],
	            ['shadowBlur'],
	            ['shadowOffsetX'],
	            ['shadowOffsetY'],
	            ['shadowColor']
	        ]
	    );
	    module.exports = {
	        getLineStyle: function (excludes) {
	            var style = getLineStyle.call(this, excludes);
	            var lineDash = this.getLineDash();
	            lineDash && (style.lineDash = lineDash);
	            return style;
	        },

	        getLineDash: function () {
	            var lineType = this.get('type');
	            return (lineType === 'solid' || lineType == null) ? null
	                : (lineType === 'dashed' ? [5, 5] : [1, 1]);
	        }
	    };


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	// TODO Parse shadow style
	// TODO Only shallow path support

	    var zrUtil = __webpack_require__(3);

	    module.exports = function (properties) {
	        // Normalize
	        for (var i = 0; i < properties.length; i++) {
	            if (!properties[i][1]) {
	               properties[i][1] = properties[i][0];
	            }
	        }
	        return function (excludes) {
	            var style = {};
	            for (var i = 0; i < properties.length; i++) {
	                var propName = properties[i][1];
	                if (excludes && zrUtil.indexOf(excludes, propName) >= 0) {
	                    continue;
	                }
	                var val = this.getShallow(propName);
	                if (val != null) {
	                    style[properties[i][0]] = val;
	                }
	            }
	            return style;
	        };
	    };


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	
	    module.exports = {
	        getAreaStyle: __webpack_require__(11)(
	            [
	                ['fill', 'color'],
	                ['shadowBlur'],
	                ['shadowOffsetX'],
	                ['shadowOffsetY'],
	                ['opacity'],
	                ['shadowColor']
	            ]
	        )
	    };


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	

	    var textContain = __webpack_require__(14);

	    function getShallow(model, path) {
	        return model && model.getShallow(path);
	    }

	    module.exports = {
	        /**
	         * Get color property or get color from option.textStyle.color
	         * @return {string}
	         */
	        getTextColor: function () {
	            var ecModel = this.ecModel;
	            return this.getShallow('color')
	                || (ecModel && ecModel.get('textStyle.color'));
	        },

	        /**
	         * Create font string from fontStyle, fontWeight, fontSize, fontFamily
	         * @return {string}
	         */
	        getFont: function () {
	            var ecModel = this.ecModel;
	            var gTextStyleModel = ecModel && ecModel.getModel('textStyle');
	            return [
	                // FIXME in node-canvas fontWeight is before fontStyle
	                this.getShallow('fontStyle') || getShallow(gTextStyleModel, 'fontStyle'),
	                this.getShallow('fontWeight') || getShallow(gTextStyleModel, 'fontWeight'),
	                (this.getShallow('fontSize') || getShallow(gTextStyleModel, 'fontSize') || 12) + 'px',
	                this.getShallow('fontFamily') || getShallow(gTextStyleModel, 'fontFamily') || 'sans-serif'
	            ].join(' ');
	        },

	        getTextRect: function (text) {
	            var textStyle = this.get('textStyle') || {};
	            return textContain.getBoundingRect(
	                text,
	                this.getFont(),
	                textStyle.align,
	                textStyle.baseline
	            );
	        },

	        ellipsis: function (text, containerWidth, options) {
	            return textContain.ellipsis(
	                text, this.getFont(), containerWidth, options
	            );
	        }
	    };


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	

	    var textWidthCache = {};
	    var textWidthCacheCounter = 0;
	    var TEXT_CACHE_MAX = 5000;

	    var util = __webpack_require__(3);
	    var BoundingRect = __webpack_require__(15);

	    function getTextWidth(text, textFont) {
	        var key = text + ':' + textFont;
	        if (textWidthCache[key]) {
	            return textWidthCache[key];
	        }

	        var textLines = (text + '').split('\n');
	        var width = 0;

	        for (var i = 0, l = textLines.length; i < l; i++) {
	            // measureText 可以被覆盖以兼容不支持 Canvas 的环境
	            width = Math.max(textContain.measureText(textLines[i], textFont).width, width);
	        }

	        if (textWidthCacheCounter > TEXT_CACHE_MAX) {
	            textWidthCacheCounter = 0;
	            textWidthCache = {};
	        }
	        textWidthCacheCounter++;
	        textWidthCache[key] = width;

	        return width;
	    }

	    function getTextRect(text, textFont, textAlign, textBaseline) {
	        var textLineLen = ((text || '') + '').split('\n').length;

	        var width = getTextWidth(text, textFont);
	        // FIXME 高度计算比较粗暴
	        var lineHeight = getTextWidth('国', textFont);
	        var height = textLineLen * lineHeight;

	        var rect = new BoundingRect(0, 0, width, height);
	        // Text has a special line height property
	        rect.lineHeight = lineHeight;

	        switch (textBaseline) {
	            case 'bottom':
	            case 'alphabetic':
	                rect.y -= lineHeight;
	                break;
	            case 'middle':
	                rect.y -= lineHeight / 2;
	                break;
	            // case 'hanging':
	            // case 'top':
	        }

	        // FIXME Right to left language
	        switch (textAlign) {
	            case 'end':
	            case 'right':
	                rect.x -= rect.width;
	                break;
	            case 'center':
	                rect.x -= rect.width / 2;
	                break;
	            // case 'start':
	            // case 'left':
	        }

	        return rect;
	    }

	    function adjustTextPositionOnRect(textPosition, rect, textRect, distance) {

	        var x = rect.x;
	        var y = rect.y;

	        var height = rect.height;
	        var width = rect.width;

	        var textHeight = textRect.height;

	        var halfHeight = height / 2 - textHeight / 2;

	        var textAlign = 'left';

	        switch (textPosition) {
	            case 'left':
	                x -= distance;
	                y += halfHeight;
	                textAlign = 'right';
	                break;
	            case 'right':
	                x += distance + width;
	                y += halfHeight;
	                textAlign = 'left';
	                break;
	            case 'top':
	                x += width / 2;
	                y -= distance + textHeight;
	                textAlign = 'center';
	                break;
	            case 'bottom':
	                x += width / 2;
	                y += height + distance;
	                textAlign = 'center';
	                break;
	            case 'inside':
	                x += width / 2;
	                y += halfHeight;
	                textAlign = 'center';
	                break;
	            case 'insideLeft':
	                x += distance;
	                y += halfHeight;
	                textAlign = 'left';
	                break;
	            case 'insideRight':
	                x += width - distance;
	                y += halfHeight;
	                textAlign = 'right';
	                break;
	            case 'insideTop':
	                x += width / 2;
	                y += distance;
	                textAlign = 'center';
	                break;
	            case 'insideBottom':
	                x += width / 2;
	                y += height - textHeight - distance;
	                textAlign = 'center';
	                break;
	            case 'insideTopLeft':
	                x += distance;
	                y += distance;
	                textAlign = 'left';
	                break;
	            case 'insideTopRight':
	                x += width - distance;
	                y += distance;
	                textAlign = 'right';
	                break;
	            case 'insideBottomLeft':
	                x += distance;
	                y += height - textHeight - distance;
	                break;
	            case 'insideBottomRight':
	                x += width - distance;
	                y += height - textHeight - distance;
	                textAlign = 'right';
	                break;
	        }

	        return {
	            x: x,
	            y: y,
	            textAlign: textAlign,
	            textBaseline: 'top'
	        };
	    }

	    /**
	     * Show ellipsis if overflow.
	     *
	     * @param  {string} text
	     * @param  {string} textFont
	     * @param  {string} containerWidth
	     * @param  {Object} [options]
	     * @param  {number} [options.ellipsis='...']
	     * @param  {number} [options.maxIterations=3]
	     * @param  {number} [options.minCharacters=3]
	     * @return {string}
	     */
	    function textEllipsis(text, textFont, containerWidth, options) {
	        if (!containerWidth) {
	            return '';
	        }

	        options = util.defaults({
	            ellipsis: '...',
	            minCharacters: 3,
	            maxIterations: 3,
	            cnCharWidth: getTextWidth('国', textFont),
	            // FIXME
	            // 未考虑非等宽字体
	            ascCharWidth: getTextWidth('a', textFont)
	        }, options, true);

	        containerWidth -= getTextWidth(options.ellipsis);

	        var textLines = (text + '').split('\n');

	        for (var i = 0, len = textLines.length; i < len; i++) {
	            textLines[i] = textLineTruncate(
	                textLines[i], textFont, containerWidth, options
	            );
	        }

	        return textLines.join('\n');
	    }

	    function textLineTruncate(text, textFont, containerWidth, options) {
	        // FIXME
	        // 粗糙得写的，尚未考虑性能和各种语言、字体的效果。
	        for (var i = 0;; i++) {
	            var lineWidth = getTextWidth(text, textFont);

	            if (lineWidth < containerWidth || i >= options.maxIterations) {
	                text += options.ellipsis;
	                break;
	            }

	            var subLength = i === 0
	                ? estimateLength(text, containerWidth, options)
	                : Math.floor(text.length * containerWidth / lineWidth);

	            if (subLength < options.minCharacters) {
	                text = '';
	                break;
	            }

	            text = text.substr(0, subLength);
	        }

	        return text;
	    }

	    function estimateLength(text, containerWidth, options) {
	        var width = 0;
	        var i = 0;
	        for (var len = text.length; i < len && width < containerWidth; i++) {
	            var charCode = text.charCodeAt(i);
	            width += (0 <= charCode && charCode <= 127)
	                ? options.ascCharWidth : options.cnCharWidth;
	        }
	        return i;
	    }

	    var textContain = {

	        getWidth: getTextWidth,

	        getBoundingRect: getTextRect,

	        adjustTextPositionOnRect: adjustTextPositionOnRect,

	        ellipsis: textEllipsis,

	        measureText: function (text, textFont) {
	            var ctx = util.getContext();
	            ctx.font = textFont;
	            return ctx.measureText(text);
	        }
	    };

	    module.exports = textContain;


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * @module echarts/core/BoundingRect
	 */


	    var vec2 = __webpack_require__(16);
	    var matrix = __webpack_require__(17);

	    var v2ApplyTransform = vec2.applyTransform;
	    var mathMin = Math.min;
	    var mathAbs = Math.abs;
	    var mathMax = Math.max;
	    /**
	     * @alias module:echarts/core/BoundingRect
	     */
	    function BoundingRect(x, y, width, height) {
	        /**
	         * @type {number}
	         */
	        this.x = x;
	        /**
	         * @type {number}
	         */
	        this.y = y;
	        /**
	         * @type {number}
	         */
	        this.width = width;
	        /**
	         * @type {number}
	         */
	        this.height = height;
	    }

	    BoundingRect.prototype = {

	        constructor: BoundingRect,

	        /**
	         * @param {module:echarts/core/BoundingRect} other
	         */
	        union: function (other) {
	            var x = mathMin(other.x, this.x);
	            var y = mathMin(other.y, this.y);

	            this.width = mathMax(
	                    other.x + other.width,
	                    this.x + this.width
	                ) - x;
	            this.height = mathMax(
	                    other.y + other.height,
	                    this.y + this.height
	                ) - y;
	            this.x = x;
	            this.y = y;
	        },

	        /**
	         * @param {Array.<number>} m
	         * @methods
	         */
	        applyTransform: (function () {
	            var min = [];
	            var max = [];
	            return function (m) {
	                // In case usage like this
	                // el.getBoundingRect().applyTransform(el.transform)
	                // And element has no transform
	                if (!m) {
	                    return;
	                }
	                min[0] = this.x;
	                min[1] = this.y;
	                max[0] = this.x + this.width;
	                max[1] = this.y + this.height;

	                v2ApplyTransform(min, min, m);
	                v2ApplyTransform(max, max, m);

	                this.x = mathMin(min[0], max[0]);
	                this.y = mathMin(min[1], max[1]);
	                this.width = mathAbs(max[0] - min[0]);
	                this.height = mathAbs(max[1] - min[1]);
	            };
	        })(),

	        /**
	         * Calculate matrix of transforming from self to target rect
	         * @param  {module:zrender/core/BoundingRect} b
	         * @return {Array.<number>}
	         */
	        calculateTransform: function (b) {
	            var a = this;
	            var sx = b.width / a.width;
	            var sy = b.height / a.height;

	            var m = matrix.create();

	            // 矩阵右乘
	            matrix.translate(m, m, [-a.x, -a.y]);
	            matrix.scale(m, m, [sx, sy]);
	            matrix.translate(m, m, [b.x, b.y]);

	            return m;
	        },

	        /**
	         * @param {(module:echarts/core/BoundingRect|Object)} b
	         * @return {boolean}
	         */
	        intersect: function (b) {
	            var a = this;
	            var ax0 = a.x;
	            var ax1 = a.x + a.width;
	            var ay0 = a.y;
	            var ay1 = a.y + a.height;

	            var bx0 = b.x;
	            var bx1 = b.x + b.width;
	            var by0 = b.y;
	            var by1 = b.y + b.height;

	            return ! (ax1 < bx0 || bx1 < ax0 || ay1 < by0 || by1 < ay0);
	        },

	        contain: function (x, y) {
	            var rect = this;
	            return x >= rect.x
	                && x <= (rect.x + rect.width)
	                && y >= rect.y
	                && y <= (rect.y + rect.height);
	        },

	        /**
	         * @return {module:echarts/core/BoundingRect}
	         */
	        clone: function () {
	            return new BoundingRect(this.x, this.y, this.width, this.height);
	        },

	        /**
	         * Copy from another rect
	         */
	        copy: function (other) {
	            this.x = other.x;
	            this.y = other.y;
	            this.width = other.width;
	            this.height = other.height;
	        }
	    };

	    module.exports = BoundingRect;


/***/ },
/* 16 */
/***/ function(module, exports) {

	
	    var ArrayCtor = typeof Float32Array === 'undefined'
	        ? Array
	        : Float32Array;

	    /**
	     * @typedef {Float32Array|Array.<number>} Vector2
	     */
	    /**
	     * 二维向量类
	     * @exports zrender/tool/vector
	     */
	    var vector = {
	        /**
	         * 创建一个向量
	         * @param {number} [x=0]
	         * @param {number} [y=0]
	         * @return {Vector2}
	         */
	        create: function (x, y) {
	            var out = new ArrayCtor(2);
	            out[0] = x || 0;
	            out[1] = y || 0;
	            return out;
	        },

	        /**
	         * 复制向量数据
	         * @param {Vector2} out
	         * @param {Vector2} v
	         * @return {Vector2}
	         */
	        copy: function (out, v) {
	            out[0] = v[0];
	            out[1] = v[1];
	            return out;
	        },

	        /**
	         * 克隆一个向量
	         * @param {Vector2} v
	         * @return {Vector2}
	         */
	        clone: function (v) {
	            var out = new ArrayCtor(2);
	            out[0] = v[0];
	            out[1] = v[1];
	            return out;
	        },

	        /**
	         * 设置向量的两个项
	         * @param {Vector2} out
	         * @param {number} a
	         * @param {number} b
	         * @return {Vector2} 结果
	         */
	        set: function (out, a, b) {
	            out[0] = a;
	            out[1] = b;
	            return out;
	        },

	        /**
	         * 向量相加
	         * @param {Vector2} out
	         * @param {Vector2} v1
	         * @param {Vector2} v2
	         */
	        add: function (out, v1, v2) {
	            out[0] = v1[0] + v2[0];
	            out[1] = v1[1] + v2[1];
	            return out;
	        },

	        /**
	         * 向量缩放后相加
	         * @param {Vector2} out
	         * @param {Vector2} v1
	         * @param {Vector2} v2
	         * @param {number} a
	         */
	        scaleAndAdd: function (out, v1, v2, a) {
	            out[0] = v1[0] + v2[0] * a;
	            out[1] = v1[1] + v2[1] * a;
	            return out;
	        },

	        /**
	         * 向量相减
	         * @param {Vector2} out
	         * @param {Vector2} v1
	         * @param {Vector2} v2
	         */
	        sub: function (out, v1, v2) {
	            out[0] = v1[0] - v2[0];
	            out[1] = v1[1] - v2[1];
	            return out;
	        },

	        /**
	         * 向量长度
	         * @param {Vector2} v
	         * @return {number}
	         */
	        len: function (v) {
	            return Math.sqrt(this.lenSquare(v));
	        },

	        /**
	         * 向量长度平方
	         * @param {Vector2} v
	         * @return {number}
	         */
	        lenSquare: function (v) {
	            return v[0] * v[0] + v[1] * v[1];
	        },

	        /**
	         * 向量乘法
	         * @param {Vector2} out
	         * @param {Vector2} v1
	         * @param {Vector2} v2
	         */
	        mul: function (out, v1, v2) {
	            out[0] = v1[0] * v2[0];
	            out[1] = v1[1] * v2[1];
	            return out;
	        },

	        /**
	         * 向量除法
	         * @param {Vector2} out
	         * @param {Vector2} v1
	         * @param {Vector2} v2
	         */
	        div: function (out, v1, v2) {
	            out[0] = v1[0] / v2[0];
	            out[1] = v1[1] / v2[1];
	            return out;
	        },

	        /**
	         * 向量点乘
	         * @param {Vector2} v1
	         * @param {Vector2} v2
	         * @return {number}
	         */
	        dot: function (v1, v2) {
	            return v1[0] * v2[0] + v1[1] * v2[1];
	        },

	        /**
	         * 向量缩放
	         * @param {Vector2} out
	         * @param {Vector2} v
	         * @param {number} s
	         */
	        scale: function (out, v, s) {
	            out[0] = v[0] * s;
	            out[1] = v[1] * s;
	            return out;
	        },

	        /**
	         * 向量归一化
	         * @param {Vector2} out
	         * @param {Vector2} v
	         */
	        normalize: function (out, v) {
	            var d = vector.len(v);
	            if (d === 0) {
	                out[0] = 0;
	                out[1] = 0;
	            }
	            else {
	                out[0] = v[0] / d;
	                out[1] = v[1] / d;
	            }
	            return out;
	        },

	        /**
	         * 计算向量间距离
	         * @param {Vector2} v1
	         * @param {Vector2} v2
	         * @return {number}
	         */
	        distance: function (v1, v2) {
	            return Math.sqrt(
	                (v1[0] - v2[0]) * (v1[0] - v2[0])
	                + (v1[1] - v2[1]) * (v1[1] - v2[1])
	            );
	        },

	        /**
	         * 向量距离平方
	         * @param {Vector2} v1
	         * @param {Vector2} v2
	         * @return {number}
	         */
	        distanceSquare: function (v1, v2) {
	            return (v1[0] - v2[0]) * (v1[0] - v2[0])
	                + (v1[1] - v2[1]) * (v1[1] - v2[1]);
	        },

	        /**
	         * 求负向量
	         * @param {Vector2} out
	         * @param {Vector2} v
	         */
	        negate: function (out, v) {
	            out[0] = -v[0];
	            out[1] = -v[1];
	            return out;
	        },

	        /**
	         * 插值两个点
	         * @param {Vector2} out
	         * @param {Vector2} v1
	         * @param {Vector2} v2
	         * @param {number} t
	         */
	        lerp: function (out, v1, v2, t) {
	            out[0] = v1[0] + t * (v2[0] - v1[0]);
	            out[1] = v1[1] + t * (v2[1] - v1[1]);
	            return out;
	        },

	        /**
	         * 矩阵左乘向量
	         * @param {Vector2} out
	         * @param {Vector2} v
	         * @param {Vector2} m
	         */
	        applyTransform: function (out, v, m) {
	            var x = v[0];
	            var y = v[1];
	            out[0] = m[0] * x + m[2] * y + m[4];
	            out[1] = m[1] * x + m[3] * y + m[5];
	            return out;
	        },
	        /**
	         * 求两个向量最小值
	         * @param  {Vector2} out
	         * @param  {Vector2} v1
	         * @param  {Vector2} v2
	         */
	        min: function (out, v1, v2) {
	            out[0] = Math.min(v1[0], v2[0]);
	            out[1] = Math.min(v1[1], v2[1]);
	            return out;
	        },
	        /**
	         * 求两个向量最大值
	         * @param  {Vector2} out
	         * @param  {Vector2} v1
	         * @param  {Vector2} v2
	         */
	        max: function (out, v1, v2) {
	            out[0] = Math.max(v1[0], v2[0]);
	            out[1] = Math.max(v1[1], v2[1]);
	            return out;
	        }
	    };

	    vector.length = vector.len;
	    vector.lengthSquare = vector.lenSquare;
	    vector.dist = vector.distance;
	    vector.distSquare = vector.distanceSquare;

	    module.exports = vector;



/***/ },
/* 17 */
/***/ function(module, exports) {

	
	    var ArrayCtor = typeof Float32Array === 'undefined'
	        ? Array
	        : Float32Array;
	    /**
	     * 3x2矩阵操作类
	     * @exports zrender/tool/matrix
	     */
	    var matrix = {
	        /**
	         * 创建一个单位矩阵
	         * @return {Float32Array|Array.<number>}
	         */
	        create : function() {
	            var out = new ArrayCtor(6);
	            matrix.identity(out);

	            return out;
	        },
	        /**
	         * 设置矩阵为单位矩阵
	         * @param {Float32Array|Array.<number>} out
	         */
	        identity : function(out) {
	            out[0] = 1;
	            out[1] = 0;
	            out[2] = 0;
	            out[3] = 1;
	            out[4] = 0;
	            out[5] = 0;
	            return out;
	        },
	        /**
	         * 复制矩阵
	         * @param {Float32Array|Array.<number>} out
	         * @param {Float32Array|Array.<number>} m
	         */
	        copy: function(out, m) {
	            out[0] = m[0];
	            out[1] = m[1];
	            out[2] = m[2];
	            out[3] = m[3];
	            out[4] = m[4];
	            out[5] = m[5];
	            return out;
	        },
	        /**
	         * 矩阵相乘
	         * @param {Float32Array|Array.<number>} out
	         * @param {Float32Array|Array.<number>} m1
	         * @param {Float32Array|Array.<number>} m2
	         */
	        mul : function (out, m1, m2) {
	            // Consider matrix.mul(m, m2, m);
	            // where out is the same as m2.
	            // So use temp variable to escape error.
	            var out0 = m1[0] * m2[0] + m1[2] * m2[1];
	            var out1 = m1[1] * m2[0] + m1[3] * m2[1];
	            var out2 = m1[0] * m2[2] + m1[2] * m2[3];
	            var out3 = m1[1] * m2[2] + m1[3] * m2[3];
	            var out4 = m1[0] * m2[4] + m1[2] * m2[5] + m1[4];
	            var out5 = m1[1] * m2[4] + m1[3] * m2[5] + m1[5];
	            out[0] = out0;
	            out[1] = out1;
	            out[2] = out2;
	            out[3] = out3;
	            out[4] = out4;
	            out[5] = out5;
	            return out;
	        },
	        /**
	         * 平移变换
	         * @param {Float32Array|Array.<number>} out
	         * @param {Float32Array|Array.<number>} a
	         * @param {Float32Array|Array.<number>} v
	         */
	        translate : function(out, a, v) {
	            out[0] = a[0];
	            out[1] = a[1];
	            out[2] = a[2];
	            out[3] = a[3];
	            out[4] = a[4] + v[0];
	            out[5] = a[5] + v[1];
	            return out;
	        },
	        /**
	         * 旋转变换
	         * @param {Float32Array|Array.<number>} out
	         * @param {Float32Array|Array.<number>} a
	         * @param {number} rad
	         */
	        rotate : function(out, a, rad) {
	            var aa = a[0];
	            var ac = a[2];
	            var atx = a[4];
	            var ab = a[1];
	            var ad = a[3];
	            var aty = a[5];
	            var st = Math.sin(rad);
	            var ct = Math.cos(rad);

	            out[0] = aa * ct + ab * st;
	            out[1] = -aa * st + ab * ct;
	            out[2] = ac * ct + ad * st;
	            out[3] = -ac * st + ct * ad;
	            out[4] = ct * atx + st * aty;
	            out[5] = ct * aty - st * atx;
	            return out;
	        },
	        /**
	         * 缩放变换
	         * @param {Float32Array|Array.<number>} out
	         * @param {Float32Array|Array.<number>} a
	         * @param {Float32Array|Array.<number>} v
	         */
	        scale : function(out, a, v) {
	            var vx = v[0];
	            var vy = v[1];
	            out[0] = a[0] * vx;
	            out[1] = a[1] * vy;
	            out[2] = a[2] * vx;
	            out[3] = a[3] * vy;
	            out[4] = a[4] * vx;
	            out[5] = a[5] * vy;
	            return out;
	        },
	        /**
	         * 求逆矩阵
	         * @param {Float32Array|Array.<number>} out
	         * @param {Float32Array|Array.<number>} a
	         */
	        invert : function(out, a) {

	            var aa = a[0];
	            var ac = a[2];
	            var atx = a[4];
	            var ab = a[1];
	            var ad = a[3];
	            var aty = a[5];

	            var det = aa * ad - ab * ac;
	            if (!det) {
	                return null;
	            }
	            det = 1.0 / det;

	            out[0] = ad * det;
	            out[1] = -ab * det;
	            out[2] = -ac * det;
	            out[3] = aa * det;
	            out[4] = (ac * aty - ad * atx) * det;
	            out[5] = (ab * atx - aa * aty) * det;
	            return out;
	        }
	    };

	    module.exports = matrix;



/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	
	    module.exports = {
	        getItemStyle: __webpack_require__(11)(
	            [
	                ['fill', 'color'],
	                ['stroke', 'borderColor'],
	                ['lineWidth', 'borderWidth'],
	                ['opacity'],
	                ['shadowBlur'],
	                ['shadowOffsetX'],
	                ['shadowOffsetY'],
	                ['shadowColor']
	            ]
	        )
	    };


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Component model
	 *
	 * @module echarts/model/Component
	 */


	    var Model = __webpack_require__(8);
	    var zrUtil = __webpack_require__(3);
	    var arrayPush = Array.prototype.push;
	    var componentUtil = __webpack_require__(20);
	    var clazzUtil = __webpack_require__(9);
	    var layout = __webpack_require__(21);

	    /**
	     * @alias module:echarts/model/Component
	     * @constructor
	     * @param {Object} option
	     * @param {module:echarts/model/Model} parentModel
	     * @param {module:echarts/model/Model} ecModel
	     */
	    var ComponentModel = Model.extend({

	        type: 'component',

	        /**
	         * @readOnly
	         * @type {string}
	         */
	        id: '',

	        /**
	         * @readOnly
	         */
	        name: '',

	        /**
	         * @readOnly
	         * @type {string}
	         */
	        mainType: '',

	        /**
	         * @readOnly
	         * @type {string}
	         */
	        subType: '',

	        /**
	         * @readOnly
	         * @type {number}
	         */
	        componentIndex: 0,

	        /**
	         * @type {Object}
	         * @protected
	         */
	        defaultOption: null,

	        /**
	         * @type {module:echarts/model/Global}
	         * @readOnly
	         */
	        ecModel: null,

	        /**
	         * key: componentType
	         * value:  Component model list, can not be null.
	         * @type {Object.<string, Array.<module:echarts/model/Model>>}
	         * @readOnly
	         */
	        dependentModels: [],

	        /**
	         * @type {string}
	         * @readOnly
	         */
	        uid: null,

	        /**
	         * Support merge layout params.
	         * Only support 'box' now (left/right/top/bottom/width/height).
	         * @type {string|Object} Object can be {ignoreSize: true}
	         * @readOnly
	         */
	        layoutMode: null,


	        init: function (option, parentModel, ecModel, extraOpt) {
	            this.mergeDefaultAndTheme(this.option, this.ecModel);
	        },

	        mergeDefaultAndTheme: function (option, ecModel) {
	            var layoutMode = this.layoutMode;
	            var inputPositionParams = layoutMode
	                ? layout.getLayoutParams(option) : {};

	            var themeModel = ecModel.getTheme();
	            zrUtil.merge(option, themeModel.get(this.mainType));
	            zrUtil.merge(option, this.getDefaultOption());

	            if (layoutMode) {
	                layout.mergeLayoutParam(option, inputPositionParams, layoutMode);
	            }
	        },

	        mergeOption: function (option) {
	            zrUtil.merge(this.option, option, true);

	            var layoutMode = this.layoutMode;
	            if (layoutMode) {
	                layout.mergeLayoutParam(this.option, option, layoutMode);
	            }
	        },

	        // Hooker after init or mergeOption
	        optionUpdated: function (ecModel) {},

	        getDefaultOption: function () {
	            if (!this.hasOwnProperty('__defaultOption')) {
	                var optList = [];
	                var Class = this.constructor;
	                while (Class) {
	                    var opt = Class.prototype.defaultOption;
	                    opt && optList.push(opt);
	                    Class = Class.superClass;
	                }

	                var defaultOption = {};
	                for (var i = optList.length - 1; i >= 0; i--) {
	                    defaultOption = zrUtil.merge(defaultOption, optList[i], true);
	                }
	                this.__defaultOption = defaultOption;
	            }
	            return this.__defaultOption;
	        }

	    });

	    // Reset ComponentModel.extend, add preConstruct.
	    clazzUtil.enableClassExtend(
	        ComponentModel,
	        function (option, parentModel, ecModel, extraOpt) {
	            // Set dependentModels, componentIndex, name, id, mainType, subType.
	            zrUtil.extend(this, extraOpt);

	            this.uid = componentUtil.getUID('componentModel');

	            // this.setReadOnly([
	            //     'type', 'id', 'uid', 'name', 'mainType', 'subType',
	            //     'dependentModels', 'componentIndex'
	            // ]);
	        }
	    );

	    // Add capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
	    clazzUtil.enableClassManagement(
	        ComponentModel, {registerWhenExtend: true}
	    );
	    componentUtil.enableSubTypeDefaulter(ComponentModel);

	    // Add capability of ComponentModel.topologicalTravel.
	    componentUtil.enableTopologicalTravel(ComponentModel, getDependencies);

	    function getDependencies(componentType) {
	        var deps = [];
	        zrUtil.each(ComponentModel.getClassesByMainType(componentType), function (Clazz) {
	            arrayPush.apply(deps, Clazz.prototype.dependencies || []);
	        });
	        // Ensure main type
	        return zrUtil.map(deps, function (type) {
	            return clazzUtil.parseClassType(type).main;
	        });
	    }

	    zrUtil.mixin(ComponentModel, __webpack_require__(22));

	    module.exports = ComponentModel;


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	

	    var zrUtil = __webpack_require__(3);
	    var clazz = __webpack_require__(9);

	    var parseClassType = clazz.parseClassType;

	    var base = 0;

	    var componentUtil = {};

	    var DELIMITER = '_';

	    /**
	     * @public
	     * @param {string} type
	     * @return {string}
	     */
	    componentUtil.getUID = function (type) {
	        // Considering the case of crossing js context,
	        // use Math.random to make id as unique as possible.
	        return [(type || ''), base++, Math.random()].join(DELIMITER);
	    };

	    /**
	     * @inner
	     */
	    componentUtil.enableSubTypeDefaulter = function (entity) {

	        var subTypeDefaulters = {};

	        entity.registerSubTypeDefaulter = function (componentType, defaulter) {
	            componentType = parseClassType(componentType);
	            subTypeDefaulters[componentType.main] = defaulter;
	        };

	        entity.determineSubType = function (componentType, option) {
	            var type = option.type;
	            if (!type) {
	                var componentTypeMain = parseClassType(componentType).main;
	                if (entity.hasSubTypes(componentType) && subTypeDefaulters[componentTypeMain]) {
	                    type = subTypeDefaulters[componentTypeMain](option);
	                }
	            }
	            return type;
	        };

	        return entity;
	    };

	    /**
	     * Topological travel on Activity Network (Activity On Vertices).
	     * Dependencies is defined in Model.prototype.dependencies, like ['xAxis', 'yAxis'].
	     *
	     * If 'xAxis' or 'yAxis' is absent in componentTypeList, just ignore it in topology.
	     *
	     * If there is circle dependencey, Error will be thrown.
	     *
	     */
	    componentUtil.enableTopologicalTravel = function (entity, dependencyGetter) {

	        /**
	         * @public
	         * @param {Array.<string>} targetNameList Target Component type list.
	         *                                           Can be ['aa', 'bb', 'aa.xx']
	         * @param {Array.<string>} fullNameList By which we can build dependency graph.
	         * @param {Function} callback Params: componentType, dependencies.
	         * @param {Object} context Scope of callback.
	         */
	        entity.topologicalTravel = function (targetNameList, fullNameList, callback, context) {
	            if (!targetNameList.length) {
	                return;
	            }

	            var result = makeDepndencyGraph(fullNameList);
	            var graph = result.graph;
	            var stack = result.noEntryList;

	            var targetNameSet = {};
	            zrUtil.each(targetNameList, function (name) {
	                targetNameSet[name] = true;
	            });

	            while (stack.length) {
	                var currComponentType = stack.pop();
	                var currVertex = graph[currComponentType];
	                var isInTargetNameSet = !!targetNameSet[currComponentType];
	                if (isInTargetNameSet) {
	                    callback.call(context, currComponentType, currVertex.originalDeps.slice());
	                    delete targetNameSet[currComponentType];
	                }
	                zrUtil.each(
	                    currVertex.successor,
	                    isInTargetNameSet ? removeEdgeAndAdd : removeEdge
	                );
	            }

	            zrUtil.each(targetNameSet, function () {
	                throw new Error('Circle dependency may exists');
	            });

	            function removeEdge(succComponentType) {
	                graph[succComponentType].entryCount--;
	                if (graph[succComponentType].entryCount === 0) {
	                    stack.push(succComponentType);
	                }
	            }

	            // Consider this case: legend depends on series, and we call
	            // chart.setOption({series: [...]}), where only series is in option.
	            // If we do not have 'removeEdgeAndAdd', legendModel.mergeOption will
	            // not be called, but only sereis.mergeOption is called. Thus legend
	            // have no chance to update its local record about series (like which
	            // name of series is available in legend).
	            function removeEdgeAndAdd(succComponentType) {
	                targetNameSet[succComponentType] = true;
	                removeEdge(succComponentType);
	            }
	        };

	        /**
	         * DepndencyGraph: {Object}
	         * key: conponentType,
	         * value: {
	         *     successor: [conponentTypes...],
	         *     originalDeps: [conponentTypes...],
	         *     entryCount: {number}
	         * }
	         */
	        function makeDepndencyGraph(fullNameList) {
	            var graph = {};
	            var noEntryList = [];

	            zrUtil.each(fullNameList, function (name) {

	                var thisItem = createDependencyGraphItem(graph, name);
	                var originalDeps = thisItem.originalDeps = dependencyGetter(name);

	                var availableDeps = getAvailableDependencies(originalDeps, fullNameList);
	                thisItem.entryCount = availableDeps.length;
	                if (thisItem.entryCount === 0) {
	                    noEntryList.push(name);
	                }

	                zrUtil.each(availableDeps, function (dependentName) {
	                    if (zrUtil.indexOf(thisItem.predecessor, dependentName) < 0) {
	                        thisItem.predecessor.push(dependentName);
	                    }
	                    var thatItem = createDependencyGraphItem(graph, dependentName);
	                    if (zrUtil.indexOf(thatItem.successor, dependentName) < 0) {
	                        thatItem.successor.push(name);
	                    }
	                });
	            });

	            return {graph: graph, noEntryList: noEntryList};
	        }

	        function createDependencyGraphItem(graph, name) {
	            if (!graph[name]) {
	                graph[name] = {predecessor: [], successor: []};
	            }
	            return graph[name];
	        }

	        function getAvailableDependencies(originalDeps, fullNameList) {
	            var availableDeps = [];
	            zrUtil.each(originalDeps, function (dep) {
	                zrUtil.indexOf(fullNameList, dep) >= 0 && availableDeps.push(dep);
	            });
	            return availableDeps;
	        }
	    };

	    module.exports = componentUtil;


/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	// Layout helpers for each component positioning


	    var zrUtil = __webpack_require__(3);
	    var BoundingRect = __webpack_require__(15);
	    var numberUtil = __webpack_require__(7);
	    var formatUtil = __webpack_require__(6);
	    var parsePercent = numberUtil.parsePercent;
	    var each = zrUtil.each;

	    var layout = {};

	    var LOCATION_PARAMS = ['left', 'right', 'top', 'bottom', 'width', 'height'];

	    function boxLayout(orient, group, gap, maxWidth, maxHeight) {
	        var x = 0;
	        var y = 0;
	        if (maxWidth == null) {
	            maxWidth = Infinity;
	        }
	        if (maxHeight == null) {
	            maxHeight = Infinity;
	        }
	        var currentLineMaxSize = 0;
	        group.eachChild(function (child, idx) {
	            var position = child.position;
	            var rect = child.getBoundingRect();
	            var nextChild = group.childAt(idx + 1);
	            var nextChildRect = nextChild && nextChild.getBoundingRect();
	            var nextX;
	            var nextY;
	            if (orient === 'horizontal') {
	                var moveX = rect.width + (nextChildRect ? (-nextChildRect.x + rect.x) : 0);
	                nextX = x + moveX;
	                // Wrap when width exceeds maxWidth or meet a `newline` group
	                if (nextX > maxWidth || child.newline) {
	                    x = 0;
	                    nextX = moveX;
	                    y += currentLineMaxSize + gap;
	                    currentLineMaxSize = rect.height;
	                }
	                else {
	                    currentLineMaxSize = Math.max(currentLineMaxSize, rect.height);
	                }
	            }
	            else {
	                var moveY = rect.height + (nextChildRect ? (-nextChildRect.y + rect.y) : 0);
	                nextY = y + moveY;
	                // Wrap when width exceeds maxHeight or meet a `newline` group
	                if (nextY > maxHeight || child.newline) {
	                    x += currentLineMaxSize + gap;
	                    y = 0;
	                    nextY = moveY;
	                    currentLineMaxSize = rect.width;
	                }
	                else {
	                    currentLineMaxSize = Math.max(currentLineMaxSize, rect.width);
	                }
	            }

	            if (child.newline) {
	                return;
	            }

	            position[0] = x;
	            position[1] = y;

	            orient === 'horizontal'
	                ? (x = nextX + gap)
	                : (y = nextY + gap);
	        });
	    }

	    /**
	     * VBox or HBox layouting
	     * @param {string} orient
	     * @param {module:zrender/container/Group} group
	     * @param {number} gap
	     * @param {number} [width=Infinity]
	     * @param {number} [height=Infinity]
	     */
	    layout.box = boxLayout;

	    /**
	     * VBox layouting
	     * @param {module:zrender/container/Group} group
	     * @param {number} gap
	     * @param {number} [width=Infinity]
	     * @param {number} [height=Infinity]
	     */
	    layout.vbox = zrUtil.curry(boxLayout, 'vertical');

	    /**
	     * HBox layouting
	     * @param {module:zrender/container/Group} group
	     * @param {number} gap
	     * @param {number} [width=Infinity]
	     * @param {number} [height=Infinity]
	     */
	    layout.hbox = zrUtil.curry(boxLayout, 'horizontal');

	    /**
	     * If x or x2 is not specified or 'center' 'left' 'right',
	     * the width would be as long as possible.
	     * If y or y2 is not specified or 'middle' 'top' 'bottom',
	     * the height would be as long as possible.
	     *
	     * @param {Object} positionInfo
	     * @param {number|string} [positionInfo.x]
	     * @param {number|string} [positionInfo.y]
	     * @param {number|string} [positionInfo.x2]
	     * @param {number|string} [positionInfo.y2]
	     * @param {Object} containerRect
	     * @param {string|number} margin
	     * @return {Object} {width, height}
	     */
	    layout.getAvailableSize = function (positionInfo, containerRect, margin) {
	        var containerWidth = containerRect.width;
	        var containerHeight = containerRect.height;

	        var x = parsePercent(positionInfo.x, containerWidth);
	        var y = parsePercent(positionInfo.y, containerHeight);
	        var x2 = parsePercent(positionInfo.x2, containerWidth);
	        var y2 = parsePercent(positionInfo.y2, containerHeight);

	        (isNaN(x) || isNaN(parseFloat(positionInfo.x))) && (x = 0);
	        (isNaN(x2) || isNaN(parseFloat(positionInfo.x2))) && (x2 = containerWidth);
	        (isNaN(y) || isNaN(parseFloat(positionInfo.y))) && (y = 0);
	        (isNaN(y2) || isNaN(parseFloat(positionInfo.y2))) && (y2 = containerHeight);

	        margin = formatUtil.normalizeCssArray(margin || 0);

	        return {
	            width: Math.max(x2 - x - margin[1] - margin[3], 0),
	            height: Math.max(y2 - y - margin[0] - margin[2], 0)
	        };
	    };

	    /**
	     * Parse position info.
	     *
	     * @param {Object} positionInfo
	     * @param {number|string} [positionInfo.left]
	     * @param {number|string} [positionInfo.top]
	     * @param {number|string} [positionInfo.right]
	     * @param {number|string} [positionInfo.bottom]
	     * @param {number|string} [positionInfo.width]
	     * @param {number|string} [positionInfo.height]
	     * @param {number|string} [positionInfo.aspect] Aspect is width / height
	     * @param {Object} containerRect
	     * @param {string|number} [margin]
	     *
	     * @return {module:zrender/core/BoundingRect}
	     */
	    layout.getLayoutRect = function (
	        positionInfo, containerRect, margin
	    ) {
	        margin = formatUtil.normalizeCssArray(margin || 0);

	        var containerWidth = containerRect.width;
	        var containerHeight = containerRect.height;

	        var left = parsePercent(positionInfo.left, containerWidth);
	        var top = parsePercent(positionInfo.top, containerHeight);
	        var right = parsePercent(positionInfo.right, containerWidth);
	        var bottom = parsePercent(positionInfo.bottom, containerHeight);
	        var width = parsePercent(positionInfo.width, containerWidth);
	        var height = parsePercent(positionInfo.height, containerHeight);

	        var verticalMargin = margin[2] + margin[0];
	        var horizontalMargin = margin[1] + margin[3];
	        var aspect = positionInfo.aspect;

	        // If width is not specified, calculate width from left and right
	        if (isNaN(width)) {
	            width = containerWidth - right - horizontalMargin - left;
	        }
	        if (isNaN(height)) {
	            height = containerHeight - bottom - verticalMargin - top;
	        }

	        // If width and height are not given
	        // 1. Graph should not exceeds the container
	        // 2. Aspect must be keeped
	        // 3. Graph should take the space as more as possible
	        if (isNaN(width) && isNaN(height)) {
	            if (aspect > containerWidth / containerHeight) {
	                width = containerWidth * 0.8;
	            }
	            else {
	                height = containerHeight * 0.8;
	            }
	        }

	        if (aspect != null) {
	            // Calculate width or height with given aspect
	            if (isNaN(width)) {
	                width = aspect * height;
	            }
	            if (isNaN(height)) {
	                height = width / aspect;
	            }
	        }

	        // If left is not specified, calculate left from right and width
	        if (isNaN(left)) {
	            left = containerWidth - right - width - horizontalMargin;
	        }
	        if (isNaN(top)) {
	            top = containerHeight - bottom - height - verticalMargin;
	        }

	        // Align left and top
	        switch (positionInfo.left || positionInfo.right) {
	            case 'center':
	                left = containerWidth / 2 - width / 2 - margin[3];
	                break;
	            case 'right':
	                left = containerWidth - width - horizontalMargin;
	                break;
	        }
	        switch (positionInfo.top || positionInfo.bottom) {
	            case 'middle':
	            case 'center':
	                top = containerHeight / 2 - height / 2 - margin[0];
	                break;
	            case 'bottom':
	                top = containerHeight - height - verticalMargin;
	                break;
	        }
	        // If something is wrong and left, top, width, height are calculated as NaN
	        left = left || 0;
	        top = top || 0;
	        if (isNaN(width)) {
	            // Width may be NaN if only one value is given except width
	            width = containerWidth - left - (right || 0);
	        }
	        if (isNaN(height)) {
	            // Height may be NaN if only one value is given except height
	            height = containerHeight - top - (bottom || 0);
	        }

	        var rect = new BoundingRect(left + margin[3], top + margin[0], width, height);
	        rect.margin = margin;
	        return rect;
	    };

	    /**
	     * Position group of component in viewport
	     *  Group position is specified by either
	     *  {left, top}, {right, bottom}
	     *  If all properties exists, right and bottom will be igonred.
	     *
	     * @param {module:zrender/container/Group} group
	     * @param {Object} positionInfo
	     * @param {number|string} [positionInfo.left]
	     * @param {number|string} [positionInfo.top]
	     * @param {number|string} [positionInfo.right]
	     * @param {number|string} [positionInfo.bottom]
	     * @param {Object} containerRect
	     * @param {string|number} margin
	     */
	    layout.positionGroup = function (
	        group, positionInfo, containerRect, margin
	    ) {
	        var groupRect = group.getBoundingRect();

	        positionInfo = zrUtil.extend(zrUtil.clone(positionInfo), {
	            width: groupRect.width,
	            height: groupRect.height
	        });

	        positionInfo = layout.getLayoutRect(
	            positionInfo, containerRect, margin
	        );

	        group.position = [
	            positionInfo.x - groupRect.x,
	            positionInfo.y - groupRect.y
	        ];
	    };

	    /**
	     * Consider Case:
	     * When defulat option has {left: 0, width: 100}, and we set {right: 0}
	     * through setOption or media query, using normal zrUtil.merge will cause
	     * {right: 0} does not take effect.
	     *
	     * @example
	     * ComponentModel.extend({
	     *     init: function () {
	     *         ...
	     *         var inputPositionParams = layout.getLayoutParams(option);
	     *         this.mergeOption(inputPositionParams);
	     *     },
	     *     mergeOption: function (newOption) {
	     *         newOption && zrUtil.merge(thisOption, newOption, true);
	     *         layout.mergeLayoutParam(thisOption, newOption);
	     *     }
	     * });
	     *
	     * @param {Object} targetOption
	     * @param {Object} newOption
	     * @param {Object|string} [opt]
	     * @param {boolean} [opt.ignoreSize=false] Some component must has width and height.
	     */
	    layout.mergeLayoutParam = function (targetOption, newOption, opt) {
	        !zrUtil.isObject(opt) && (opt = {});
	        var hNames = ['width', 'left', 'right']; // Order by priority.
	        var vNames = ['height', 'top', 'bottom']; // Order by priority.
	        var hResult = merge(hNames);
	        var vResult = merge(vNames);

	        copy(hNames, targetOption, hResult);
	        copy(vNames, targetOption, vResult);

	        function merge(names) {
	            var newParams = {};
	            var newValueCount = 0;
	            var merged = {};
	            var mergedValueCount = 0;
	            var enoughParamNumber = opt.ignoreSize ? 1 : 2;

	            each(names, function (name) {
	                merged[name] = targetOption[name];
	            });
	            each(names, function (name) {
	                // Consider case: newOption.width is null, which is
	                // set by user for removing width setting.
	                hasProp(newOption, name) && (newParams[name] = merged[name] = newOption[name]);
	                hasValue(newParams, name) && newValueCount++;
	                hasValue(merged, name) && mergedValueCount++;
	            });

	            // Case: newOption: {width: ..., right: ...},
	            // or targetOption: {right: ...} and newOption: {width: ...},
	            // There is no conflict when merged only has params count
	            // little than enoughParamNumber.
	            if (mergedValueCount === enoughParamNumber || !newValueCount) {
	                return merged;
	            }
	            // Case: newOption: {width: ..., right: ...},
	            // Than we can make sure user only want those two, and ignore
	            // all origin params in targetOption.
	            else if (newValueCount >= enoughParamNumber) {
	                return newParams;
	            }
	            else {
	                // Chose another param from targetOption by priority.
	                // When 'ignoreSize', enoughParamNumber is 1 and those will not happen.
	                for (var i = 0; i < names.length; i++) {
	                    var name = names[i];
	                    if (!hasProp(newParams, name) && hasProp(targetOption, name)) {
	                        newParams[name] = targetOption[name];
	                        break;
	                    }
	                }
	                return newParams;
	            }
	        }

	        function hasProp(obj, name) {
	            return obj.hasOwnProperty(name);
	        }

	        function hasValue(obj, name) {
	            return obj[name] != null && obj[name] !== 'auto';
	        }

	        function copy(names, target, source) {
	            each(names, function (name) {
	                target[name] = source[name];
	            });
	        }
	    };

	    /**
	     * Retrieve 'left', 'right', 'top', 'bottom', 'width', 'height' from object.
	     * @param {Object} source
	     * @return {Object} Result contains those props.
	     */
	    layout.getLayoutParams = function (source) {
	        return layout.copyLayoutParams({}, source);
	    };

	    /**
	     * Retrieve 'left', 'right', 'top', 'bottom', 'width', 'height' from object.
	     * @param {Object} source
	     * @return {Object} Result contains those props.
	     */
	    layout.copyLayoutParams = function (target, source) {
	        source && target && each(LOCATION_PARAMS, function (name) {
	            source.hasOwnProperty(name) && (target[name] = source[name]);
	        });
	        return target;
	    };

	    module.exports = layout;


/***/ },
/* 22 */
/***/ function(module, exports) {

	

	    module.exports = {
	        getBoxLayoutParams: function () {
	            return {
	                left: this.get('left'),
	                top: this.get('top'),
	                right: this.get('right'),
	                bottom: this.get('bottom'),
	                width: this.get('width'),
	                height: this.get('height')
	            };
	        }
	    };


/***/ },
/* 23 */
/***/ function(module, exports) {

	
	    var platform = '';
	    // Navigator not exists in node
	    if (typeof navigator !== 'undefined') {
	        platform = navigator.platform || '';
	    }
	    module.exports = {
	        // 全图默认背景
	        // backgroundColor: 'rgba(0,0,0,0)',

	        // https://dribbble.com/shots/1065960-Infographic-Pie-chart-visualization
	        // color: ['#5793f3', '#d14a61', '#fd9c35', '#675bba', '#fec42c', '#dd4444', '#d4df5a', '#cd4870'],
	        // 浅色
	        // color: ['#bcd3bb', '#e88f70', '#edc1a5', '#9dc5c8', '#e1e8c8', '#7b7c68', '#e5b5b5', '#f0b489', '#928ea8', '#bda29a'],
	        // color: ['#cc5664', '#9bd6ec', '#ea946e', '#8acaaa', '#f1ec64', '#ee8686', '#a48dc1', '#5da6bc', '#b9dcae'],
	        // 深色
	        color: ['#c23531','#2f4554', '#61a0a8', '#d48265', '#91c7ae','#749f83',  '#ca8622', '#bda29a','#6e7074', '#546570', '#c4ccd3'],

	        // 默认需要 Grid 配置项
	        grid: {},
	        // 主题，主题
	        textStyle: {
	            // color: '#000',
	            // decoration: 'none',
	            // PENDING
	            fontFamily: platform.match(/^Win/) ? 'Microsoft YaHei' : 'sans-serif',
	            // fontFamily: 'Arial, Verdana, sans-serif',
	            fontSize: 12,
	            fontStyle: 'normal',
	            fontWeight: 'normal'
	        },
	        // 主题，默认标志图形类型列表
	        // symbolList: [
	        //     'circle', 'rectangle', 'triangle', 'diamond',
	        //     'emptyCircle', 'emptyRectangle', 'emptyTriangle', 'emptyDiamond'
	        // ],
	        animation: true,                // 过渡动画是否开启
	        animationThreshold: 2000,       // 动画元素阀值，产生的图形原素超过2000不出动画
	        animationDuration: 1000,        // 过渡动画参数：进入
	        animationDurationUpdate: 300,   // 过渡动画参数：更新
	        animationEasing: 'exponentialOut',    //BounceOut
	        animationEasingUpdate: 'cubicOut'
	    };


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var zrUtil = __webpack_require__(3);

	    var echartsAPIList = [
	        'getDom', 'getZr', 'getWidth', 'getHeight', 'dispatchAction',
	        'on', 'off', 'getDataURL', 'getConnectedDataURL', 'getModel', 'getOption'
	    ];

	    function ExtensionAPI(chartInstance) {
	        zrUtil.each(echartsAPIList, function (name) {
	            this[name] = zrUtil.bind(chartInstance[name], chartInstance);
	        }, this);
	    }

	    module.exports = ExtensionAPI;


/***/ },
/* 25 */
/***/ function(module, exports) {

	'use strict';


	    // var zrUtil = require('zrender/lib/core/util');
	    var coordinateSystemCreators = {};

	    function CoordinateSystemManager() {

	        this._coordinateSystems = [];
	    }

	    CoordinateSystemManager.prototype = {

	        constructor: CoordinateSystemManager,

	        create: function (ecModel, api) {
	            var coordinateSystems = [];
	            for (var type in coordinateSystemCreators) {
	                var list = coordinateSystemCreators[type].create(ecModel, api);
	                list && (coordinateSystems = coordinateSystems.concat(list));
	            }

	            this._coordinateSystems = coordinateSystems;
	        },

	        update: function (ecModel, api) {
	            var coordinateSystems = this._coordinateSystems;
	            for (var i = 0; i < coordinateSystems.length; i++) {
	                // FIXME MUST have
	                coordinateSystems[i].update && coordinateSystems[i].update(ecModel, api);
	            }
	        }
	    };

	    CoordinateSystemManager.register = function (type, coordinateSystemCreator) {
	        coordinateSystemCreators[type] = coordinateSystemCreator;
	    };

	    CoordinateSystemManager.get = function (type) {
	        return coordinateSystemCreators[type];
	    };

	    module.exports = CoordinateSystemManager;


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * ECharts option manager
	 *
	 * @module {echarts/model/OptionManager}
	 */



	    var zrUtil = __webpack_require__(3);
	    var modelUtil = __webpack_require__(5);
	    var ComponentModel = __webpack_require__(19);
	    var each = zrUtil.each;
	    var clone = zrUtil.clone;
	    var map = zrUtil.map;
	    var merge = zrUtil.merge;

	    var QUERY_REG = /^(min|max)?(.+)$/;

	    /**
	     * TERM EXPLANATIONS:
	     *
	     * [option]:
	     *
	     *     An object that contains definitions of components. For example:
	     *     var option = {
	     *         title: {...},
	     *         legend: {...},
	     *         visualMap: {...},
	     *         series: [
	     *             {data: [...]},
	     *             {data: [...]},
	     *             ...
	     *         ]
	     *     };
	     *
	     * [rawOption]:
	     *
	     *     An object input to echarts.setOption. 'rawOption' may be an
	     *     'option', or may be an object contains multi-options. For example:
	     *     var option = {
	     *         baseOption: {
	     *             title: {...},
	     *             legend: {...},
	     *             series: [
	     *                 {data: [...]},
	     *                 {data: [...]},
	     *                 ...
	     *             ]
	     *         },
	     *         timeline: {...},
	     *         options: [
	     *             {title: {...}, series: {data: [...]}},
	     *             {title: {...}, series: {data: [...]}},
	     *             ...
	     *         ],
	     *         media: [
	     *             {
	     *                 query: {maxWidth: 320},
	     *                 option: {series: {x: 20}, visualMap: {show: false}}
	     *             },
	     *             {
	     *                 query: {minWidth: 320, maxWidth: 720},
	     *                 option: {series: {x: 500}, visualMap: {show: true}}
	     *             },
	     *             {
	     *                 option: {series: {x: 1200}, visualMap: {show: true}}
	     *             }
	     *         ]
	     *     };
	     *
	     * @alias module:echarts/model/OptionManager
	     * @param {module:echarts/ExtensionAPI} api
	     */
	    function OptionManager(api) {

	        /**
	         * @private
	         * @type {module:echarts/ExtensionAPI}
	         */
	        this._api = api;

	        /**
	         * @private
	         * @type {Array.<number>}
	         */
	        this._timelineOptions = [];

	        /**
	         * @private
	         * @type {Array.<Object>}
	         */
	        this._mediaList = [];

	        /**
	         * @private
	         * @type {Object}
	         */
	        this._mediaDefault;

	        /**
	         * -1, means default.
	         * empty means no media.
	         * @private
	         * @type {Array.<number>}
	         */
	        this._currentMediaIndices = [];

	        /**
	         * @private
	         * @type {Object}
	         */
	        this._optionBackup;

	        /**
	         * @private
	         * @type {Object}
	         */
	        this._newBaseOption;
	    }

	    // timeline.notMerge is not supported in ec3. Firstly there is rearly
	    // case that notMerge is needed. Secondly supporting 'notMerge' requires
	    // rawOption cloned and backuped when timeline changed, which does no
	    // good to performance. What's more, that both timeline and setOption
	    // method supply 'notMerge' brings complex and some problems.
	    // Consider this case:
	    // (step1) chart.setOption({timeline: {notMerge: false}, ...}, false);
	    // (step2) chart.setOption({timeline: {notMerge: true}, ...}, false);

	    OptionManager.prototype = {

	        constructor: OptionManager,

	        /**
	         * @public
	         * @param {Object} rawOption Raw option.
	         * @param {module:echarts/model/Global} ecModel
	         * @param {Array.<Function>} optionPreprocessorFuncs
	         * @return {Object} Init option
	         */
	        setOption: function (rawOption, optionPreprocessorFuncs) {
	            rawOption = clone(rawOption, true);

	            // FIXME
	            // 如果 timeline options 或者 media 中设置了某个属性，而baseOption中没有设置，则进行警告。

	            var oldOptionBackup = this._optionBackup;
	            var newParsedOption = parseRawOption.call(
	                this, rawOption, optionPreprocessorFuncs
	            );
	            this._newBaseOption = newParsedOption.baseOption;

	            // For setOption at second time (using merge mode);
	            if (oldOptionBackup) {
	                // Only baseOption can be merged.
	                mergeOption(oldOptionBackup.baseOption, newParsedOption.baseOption);

	                // For simplicity, timeline options and media options do not support merge,
	                // that is, if you `setOption` twice and both has timeline options, the latter
	                // timeline opitons will not be merged to the formers, but just substitude them.
	                if (newParsedOption.timelineOptions.length) {
	                    oldOptionBackup.timelineOptions = newParsedOption.timelineOptions;
	                }
	                if (newParsedOption.mediaList.length) {
	                    oldOptionBackup.mediaList = newParsedOption.mediaList;
	                }
	                if (newParsedOption.mediaDefault) {
	                    oldOptionBackup.mediaDefault = newParsedOption.mediaDefault;
	                }
	            }
	            else {
	                this._optionBackup = newParsedOption;
	            }
	        },

	        /**
	         * @param {boolean} isRecreate
	         * @return {Object}
	         */
	        mountOption: function (isRecreate) {
	            var optionBackup = this._optionBackup;

	            // TODO
	            // 如果没有reset功能则不clone。

	            this._timelineOptions = map(optionBackup.timelineOptions, clone);
	            this._mediaList = map(optionBackup.mediaList, clone);
	            this._mediaDefault = clone(optionBackup.mediaDefault);
	            this._currentMediaIndices = [];

	            return clone(isRecreate
	                // this._optionBackup.baseOption, which is created at the first `setOption`
	                // called, and is merged into every new option by inner method `mergeOption`
	                // each time `setOption` called, can be only used in `isRecreate`, because
	                // its reliability is under suspicion. In other cases option merge is
	                // proformed by `model.mergeOption`.
	                ? optionBackup.baseOption : this._newBaseOption
	            );
	        },

	        /**
	         * @param {module:echarts/model/Global} ecModel
	         * @return {Object}
	         */
	        getTimelineOption: function (ecModel) {
	            var option;
	            var timelineOptions = this._timelineOptions;

	            if (timelineOptions.length) {
	                // getTimelineOption can only be called after ecModel inited,
	                // so we can get currentIndex from timelineModel.
	                var timelineModel = ecModel.getComponent('timeline');
	                if (timelineModel) {
	                    option = clone(
	                        timelineOptions[timelineModel.getCurrentIndex()],
	                        true
	                    );
	                }
	            }

	            return option;
	        },

	        /**
	         * @param {module:echarts/model/Global} ecModel
	         * @return {Array.<Object>}
	         */
	        getMediaOption: function (ecModel) {
	            var ecWidth = this._api.getWidth();
	            var ecHeight = this._api.getHeight();
	            var mediaList = this._mediaList;
	            var mediaDefault = this._mediaDefault;
	            var indices = [];
	            var result = [];

	            // No media defined.
	            if (!mediaList.length && !mediaDefault) {
	                return result;
	            }

	            // Multi media may be applied, the latter defined media has higher priority.
	            for (var i = 0, len = mediaList.length; i < len; i++) {
	                if (applyMediaQuery(mediaList[i].query, ecWidth, ecHeight)) {
	                    indices.push(i);
	                }
	            }

	            // FIXME
	            // 是否mediaDefault应该强制用户设置，否则可能修改不能回归。
	            if (!indices.length && mediaDefault) {
	                indices = [-1];
	            }

	            if (indices.length && !indicesEquals(indices, this._currentMediaIndices)) {
	                result = map(indices, function (index) {
	                    return clone(
	                        index === -1 ? mediaDefault.option : mediaList[index].option
	                    );
	                });
	            }
	            // Otherwise return nothing.

	            this._currentMediaIndices = indices;

	            return result;
	        }
	    };

	    function parseRawOption(rawOption, optionPreprocessorFuncs) {
	        var timelineOptions = [];
	        var mediaList = [];
	        var mediaDefault;
	        var baseOption;

	        // Compatible with ec2.
	        var timelineOpt = rawOption.timeline;

	        if (rawOption.baseOption) {
	            baseOption = rawOption.baseOption;
	        }

	        // For timeline
	        if (timelineOpt || rawOption.options) {
	            baseOption = baseOption || {};
	            timelineOptions = (rawOption.options || []).slice();
	        }

	        // For media query
	        if (rawOption.media) {
	            baseOption = baseOption || {};
	            var media = rawOption.media;
	            each(media, function (singleMedia) {
	                if (singleMedia && singleMedia.option) {
	                    if (singleMedia.query) {
	                        mediaList.push(singleMedia);
	                    }
	                    else if (!mediaDefault) {
	                        // Use the first media default.
	                        mediaDefault = singleMedia;
	                    }
	                }
	            });
	        }

	        // For normal option
	        if (!baseOption) {
	            baseOption = rawOption;
	        }

	        // Set timelineOpt to baseOption in ec3,
	        // which is convenient for merge option.
	        if (!baseOption.timeline) {
	            baseOption.timeline = timelineOpt;
	        }

	        // Preprocess.
	        each([baseOption].concat(timelineOptions)
	            .concat(zrUtil.map(mediaList, function (media) {
	                return media.option;
	            })),
	            function (option) {
	                each(optionPreprocessorFuncs, function (preProcess) {
	                    preProcess(option);
	                });
	            }
	        );

	        return {
	            baseOption: baseOption,
	            timelineOptions: timelineOptions,
	            mediaDefault: mediaDefault,
	            mediaList: mediaList
	        };
	    }

	    /**
	     * @see <http://www.w3.org/TR/css3-mediaqueries/#media1>
	     * Support: width, height, aspectRatio
	     * Can use max or min as prefix.
	     */
	    function applyMediaQuery(query, ecWidth, ecHeight) {
	        var realMap = {
	            width: ecWidth,
	            height: ecHeight,
	            aspectratio: ecWidth / ecHeight // lowser case for convenientce.
	        };

	        var applicatable = true;

	        zrUtil.each(query, function (value, attr) {
	            var matched = attr.match(QUERY_REG);

	            if (!matched || !matched[1] || !matched[2]) {
	                return;
	            }

	            var operator = matched[1];
	            var realAttr = matched[2].toLowerCase();

	            if (!compare(realMap[realAttr], value, operator)) {
	                applicatable = false;
	            }
	        });

	        return applicatable;
	    }

	    function compare(real, expect, operator) {
	        if (operator === 'min') {
	            return real >= expect;
	        }
	        else if (operator === 'max') {
	            return real <= expect;
	        }
	        else { // Equals
	            return real === expect;
	        }
	    }

	    function indicesEquals(indices1, indices2) {
	        // indices is always order by asc and has only finite number.
	        return indices1.join(',') === indices2.join(',');
	    }

	    /**
	     * Consider case:
	     * `chart.setOption(opt1);`
	     * Then user do some interaction like dataZoom, dataView changing.
	     * `chart.setOption(opt2);`
	     * Then user press 'reset button' in toolbox.
	     *
	     * After doing that all of the interaction effects should be reset, the
	     * chart should be the same as the result of invoke
	     * `chart.setOption(opt1); chart.setOption(opt2);`.
	     *
	     * Although it is not able ensure that
	     * `chart.setOption(opt1); chart.setOption(opt2);` is equivalents to
	     * `chart.setOption(merge(opt1, opt2));` exactly,
	     * this might be the only simple way to implement that feature.
	     *
	     * MEMO: We've considered some other approaches:
	     * 1. Each model handle its self restoration but not uniform treatment.
	     *     (Too complex in logic and error-prone)
	     * 2. Use a shadow ecModel. (Performace expensive)
	     */
	    function mergeOption(oldOption, newOption) {
	        newOption = newOption || {};

	        each(newOption, function (newCptOpt, mainType) {
	            if (newCptOpt == null) {
	                return;
	            }

	            var oldCptOpt = oldOption[mainType];

	            if (!ComponentModel.hasClass(mainType)) {
	                oldOption[mainType] = merge(oldCptOpt, newCptOpt, true);
	            }
	            else {
	                newCptOpt = modelUtil.normalizeToArray(newCptOpt);
	                oldCptOpt = modelUtil.normalizeToArray(oldCptOpt);

	                var mapResult = modelUtil.mappingToExists(oldCptOpt, newCptOpt);

	                oldOption[mainType] = map(mapResult, function (item) {
	                    return (item.option && item.exist)
	                        ? merge(item.exist, item.option, true)
	                        : (item.exist || item.option);
	                });
	            }
	        });
	    }

	    module.exports = OptionManager;


/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var zrUtil = __webpack_require__(3);
	    var formatUtil = __webpack_require__(6);
	    var modelUtil = __webpack_require__(5);
	    var ComponentModel = __webpack_require__(19);

	    var encodeHTML = formatUtil.encodeHTML;
	    var addCommas = formatUtil.addCommas;

	    var SeriesModel = ComponentModel.extend({

	        type: 'series.__base__',

	        /**
	         * @readOnly
	         */
	        seriesIndex: 0,

	        // coodinateSystem will be injected in the echarts/CoordinateSystem
	        coordinateSystem: null,

	        /**
	         * @type {Object}
	         * @protected
	         */
	        defaultOption: null,

	        /**
	         * Data provided for legend
	         * @type {Function}
	         */
	        // PENDING
	        legendDataProvider: null,

	        init: function (option, parentModel, ecModel, extraOpt) {

	            /**
	             * @type {number}
	             * @readOnly
	             */
	            this.seriesIndex = this.componentIndex;

	            this.mergeDefaultAndTheme(option, ecModel);

	            /**
	             * @type {module:echarts/data/List|module:echarts/data/Tree|module:echarts/data/Graph}
	             * @private
	             */
	            this._dataBeforeProcessed = this.getInitialData(option, ecModel);

	            // If we reverse the order (make this._data firstly, and then make
	            // this._dataBeforeProcessed by cloneShallow), cloneShallow will
	            // cause this._data.graph.data !== this._data when using
	            // module:echarts/data/Graph or module:echarts/data/Tree.
	            // See module:echarts/data/helper/linkList
	            this._data = this._dataBeforeProcessed.cloneShallow();
	        },

	        /**
	         * Util for merge default and theme to option
	         * @param  {Object} option
	         * @param  {module:echarts/model/Global} ecModel
	         */
	        mergeDefaultAndTheme: function (option, ecModel) {
	            zrUtil.merge(
	                option,
	                ecModel.getTheme().get(this.subType)
	            );
	            zrUtil.merge(option, this.getDefaultOption());

	            // Default label emphasis `position` and `show`
	            // FIXME Set label in mergeOption
	            modelUtil.defaultEmphasis(option.label, modelUtil.LABEL_OPTIONS);

	            this.fillDataTextStyle(option.data);
	        },

	        mergeOption: function (newSeriesOption, ecModel) {
	            newSeriesOption = zrUtil.merge(this.option, newSeriesOption, true);
	            this.fillDataTextStyle(newSeriesOption.data);

	            var data = this.getInitialData(newSeriesOption, ecModel);
	            // TODO Merge data?
	            if (data) {
	                this._data = data;
	                this._dataBeforeProcessed = data.cloneShallow();
	            }
	        },

	        fillDataTextStyle: function (data) {
	            // Default data label emphasis `position` and `show`
	            // FIXME Tree structure data ?
	            // FIXME Performance ?
	            if (data) {
	                for (var i = 0; i < data.length; i++) {
	                    if (data[i] && data[i].label) {
	                        modelUtil.defaultEmphasis(data[i].label, modelUtil.LABEL_OPTIONS);
	                    }
	                }
	            }
	        },

	        /**
	         * Init a data structure from data related option in series
	         * Must be overwritten
	         */
	        getInitialData: function () {},

	        /**
	         * @param {string} [dataType]
	         * @return {module:echarts/data/List}
	         */
	        getData: function (dataType) {
	            return dataType == null ? this._data : this._data.getLinkedData(dataType);
	        },

	        /**
	         * @param {module:echarts/data/List} data
	         */
	        setData: function (data) {
	            this._data = data;
	        },

	        /**
	         * Get data before processed
	         * @return {module:echarts/data/List}
	         */
	        getRawData: function () {
	            return this._dataBeforeProcessed;
	        },

	        /**
	         * Coord dimension to data dimension.
	         *
	         * By default the result is the same as dimensions of series data.
	         * But in some series data dimensions are different from coord dimensions (i.e.
	         * candlestick and boxplot). Override this method to handle those cases.
	         *
	         * Coord dimension to data dimension can be one-to-many
	         *
	         * @param {string} coordDim
	         * @return {Array.<string>} dimensions on the axis.
	         */
	        coordDimToDataDim: function (coordDim) {
	            return [coordDim];
	        },

	        /**
	         * Convert data dimension to coord dimension.
	         *
	         * @param {string|number} dataDim
	         * @return {string}
	         */
	        dataDimToCoordDim: function (dataDim) {
	            return dataDim;
	        },

	        /**
	         * Get base axis if has coordinate system and has axis.
	         * By default use coordSys.getBaseAxis();
	         * Can be overrided for some chart.
	         * @return {type} description
	         */
	        getBaseAxis: function () {
	            var coordSys = this.coordinateSystem;
	            return coordSys && coordSys.getBaseAxis && coordSys.getBaseAxis();
	        },

	        // FIXME
	        /**
	         * Default tooltip formatter
	         *
	         * @param {number} dataIndex
	         * @param {boolean} [multipleSeries=false]
	         * @param {number} [dataType]
	         */
	        formatTooltip: function (dataIndex, multipleSeries, dataType) {
	            var data = this._data;
	            var value = this.getRawValue(dataIndex);
	            var formattedValue = zrUtil.isArray(value)
	                ? zrUtil.map(value, addCommas).join(', ') : addCommas(value);
	            var name = data.getName(dataIndex);
	            var color = data.getItemVisual(dataIndex, 'color');
	            var colorEl = '<span style="display:inline-block;margin-right:5px;'
	                + 'border-radius:10px;width:9px;height:9px;background-color:' + color + '"></span>';

	            var seriesName = this.name;
	            // FIXME
	            if (seriesName === '\0-') {
	                // Not show '-'
	                seriesName = '';
	            }
	            return !multipleSeries
	                ? ((seriesName && encodeHTML(seriesName) + '<br />') + colorEl
	                    + (name
	                        ? encodeHTML(name) + ' : ' + formattedValue
	                        : formattedValue)
	                  )
	                : (colorEl + encodeHTML(this.name) + ' : ' + formattedValue);
	        },

	        restoreData: function () {
	            this._data = this._dataBeforeProcessed.cloneShallow();
	        },

	        getAxisTooltipDataIndex: null
	    });

	    zrUtil.mixin(SeriesModel, modelUtil.dataFormatMixin);

	    module.exports = SeriesModel;


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	

	    var Group = __webpack_require__(29);
	    var componentUtil = __webpack_require__(20);
	    var clazzUtil = __webpack_require__(9);

	    var Component = function () {
	        /**
	         * @type {module:zrender/container/Group}
	         * @readOnly
	         */
	        this.group = new Group();

	        /**
	         * @type {string}
	         * @readOnly
	         */
	        this.uid = componentUtil.getUID('viewComponent');
	    };

	    Component.prototype = {

	        constructor: Component,

	        init: function (ecModel, api) {},

	        render: function (componentModel, ecModel, api, payload) {},

	        dispose: function () {}
	    };

	    var componentProto = Component.prototype;
	    componentProto.updateView
	        = componentProto.updateLayout
	        = componentProto.updateVisual
	        = function (seriesModel, ecModel, api, payload) {
	            // Do nothing;
	        };
	    // Enable Component.extend.
	    clazzUtil.enableClassExtend(Component);

	    // Enable capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
	    clazzUtil.enableClassManagement(Component, {registerWhenExtend: true});

	    module.exports = Component;


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Group是一个容器，可以插入子节点，Group的变换也会被应用到子节点上
	 * @module zrender/graphic/Group
	 * @example
	 *     var Group = require('zrender/lib/container/Group');
	 *     var Circle = require('zrender/lib/graphic/shape/Circle');
	 *     var g = new Group();
	 *     g.position[0] = 100;
	 *     g.position[1] = 100;
	 *     g.add(new Circle({
	 *         style: {
	 *             x: 100,
	 *             y: 100,
	 *             r: 20,
	 *         }
	 *     }));
	 *     zr.add(g);
	 */


	    var zrUtil = __webpack_require__(3);
	    var Element = __webpack_require__(30);
	    var BoundingRect = __webpack_require__(15);

	    /**
	     * @alias module:zrender/graphic/Group
	     * @constructor
	     * @extends module:zrender/mixin/Transformable
	     * @extends module:zrender/mixin/Eventful
	     */
	    var Group = function (opts) {

	        opts = opts || {};

	        Element.call(this, opts);

	        for (var key in opts) {
	            this[key] = opts[key];
	        }

	        this._children = [];

	        this.__storage = null;

	        this.__dirty = true;
	    };

	    Group.prototype = {

	        constructor: Group,

	        /**
	         * @type {string}
	         */
	        type: 'group',

	        /**
	         * 所有子孙元素是否响应鼠标事件
	         * @name module:/zrender/container/Group#silent
	         * @type {boolean}
	         * @default false
	         */
	        silent: false,

	        /**
	         * @return {Array.<module:zrender/Element>}
	         */
	        children: function () {
	            return this._children.slice();
	        },

	        /**
	         * 获取指定 index 的儿子节点
	         * @param  {number} idx
	         * @return {module:zrender/Element}
	         */
	        childAt: function (idx) {
	            return this._children[idx];
	        },

	        /**
	         * 获取指定名字的儿子节点
	         * @param  {string} name
	         * @return {module:zrender/Element}
	         */
	        childOfName: function (name) {
	            var children = this._children;
	            for (var i = 0; i < children.length; i++) {
	                if (children[i].name === name) {
	                    return children[i];
	                }
	             }
	        },

	        /**
	         * @return {number}
	         */
	        childCount: function () {
	            return this._children.length;
	        },

	        /**
	         * 添加子节点到最后
	         * @param {module:zrender/Element} child
	         */
	        add: function (child) {
	            if (child && child !== this && child.parent !== this) {

	                this._children.push(child);

	                this._doAdd(child);
	            }

	            return this;
	        },

	        /**
	         * 添加子节点在 nextSibling 之前
	         * @param {module:zrender/Element} child
	         * @param {module:zrender/Element} nextSibling
	         */
	        addBefore: function (child, nextSibling) {
	            if (child && child !== this && child.parent !== this
	                && nextSibling && nextSibling.parent === this) {

	                var children = this._children;
	                var idx = children.indexOf(nextSibling);

	                if (idx >= 0) {
	                    children.splice(idx, 0, child);
	                    this._doAdd(child);
	                }
	            }

	            return this;
	        },

	        _doAdd: function (child) {
	            if (child.parent) {
	                child.parent.remove(child);
	            }

	            child.parent = this;

	            var storage = this.__storage;
	            var zr = this.__zr;
	            if (storage && storage !== child.__storage) {

	                storage.addToMap(child);

	                if (child instanceof Group) {
	                    child.addChildrenToStorage(storage);
	                }
	            }

	            zr && zr.refresh();
	        },

	        /**
	         * 移除子节点
	         * @param {module:zrender/Element} child
	         */
	        remove: function (child) {
	            var zr = this.__zr;
	            var storage = this.__storage;
	            var children = this._children;

	            var idx = zrUtil.indexOf(children, child);
	            if (idx < 0) {
	                return this;
	            }
	            children.splice(idx, 1);

	            child.parent = null;

	            if (storage) {

	                storage.delFromMap(child.id);

	                if (child instanceof Group) {
	                    child.delChildrenFromStorage(storage);
	                }
	            }

	            zr && zr.refresh();

	            return this;
	        },

	        /**
	         * 移除所有子节点
	         */
	        removeAll: function () {
	            var children = this._children;
	            var storage = this.__storage;
	            var child;
	            var i;
	            for (i = 0; i < children.length; i++) {
	                child = children[i];
	                if (storage) {
	                    storage.delFromMap(child.id);
	                    if (child instanceof Group) {
	                        child.delChildrenFromStorage(storage);
	                    }
	                }
	                child.parent = null;
	            }
	            children.length = 0;

	            return this;
	        },

	        /**
	         * 遍历所有子节点
	         * @param  {Function} cb
	         * @param  {}   context
	         */
	        eachChild: function (cb, context) {
	            var children = this._children;
	            for (var i = 0; i < children.length; i++) {
	                var child = children[i];
	                cb.call(context, child, i);
	            }
	            return this;
	        },

	        /**
	         * 深度优先遍历所有子孙节点
	         * @param  {Function} cb
	         * @param  {}   context
	         */
	        traverse: function (cb, context) {
	            for (var i = 0; i < this._children.length; i++) {
	                var child = this._children[i];
	                cb.call(context, child);

	                if (child.type === 'group') {
	                    child.traverse(cb, context);
	                }
	            }
	            return this;
	        },

	        addChildrenToStorage: function (storage) {
	            for (var i = 0; i < this._children.length; i++) {
	                var child = this._children[i];
	                storage.addToMap(child);
	                if (child instanceof Group) {
	                    child.addChildrenToStorage(storage);
	                }
	            }
	        },

	        delChildrenFromStorage: function (storage) {
	            for (var i = 0; i < this._children.length; i++) {
	                var child = this._children[i];
	                storage.delFromMap(child.id);
	                if (child instanceof Group) {
	                    child.delChildrenFromStorage(storage);
	                }
	            }
	        },

	        dirty: function () {
	            this.__dirty = true;
	            this.__zr && this.__zr.refresh();
	            return this;
	        },

	        /**
	         * @return {module:zrender/core/BoundingRect}
	         */
	        getBoundingRect: function (includeChildren) {
	            // TODO Caching
	            // TODO Transform
	            var rect = null;
	            var tmpRect = new BoundingRect(0, 0, 0, 0);
	            var children = includeChildren || this._children;
	            var tmpMat = [];

	            for (var i = 0; i < children.length; i++) {
	                var child = children[i];
	                if (child.ignore || child.invisible) {
	                    continue;
	                }

	                var childRect = child.getBoundingRect();
	                var transform = child.getLocalTransform(tmpMat);
	                if (transform) {
	                    tmpRect.copy(childRect);
	                    tmpRect.applyTransform(transform);
	                    rect = rect || tmpRect.clone();
	                    rect.union(tmpRect);
	                }
	                else {
	                    rect = rect || childRect.clone();
	                    rect.union(childRect);
	                }
	            }
	            return rect || tmpRect;
	        }
	    };

	    zrUtil.inherits(Group, Element);

	    module.exports = Group;


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * @module zrender/Element
	 */


	    var guid = __webpack_require__(31);
	    var Eventful = __webpack_require__(32);
	    var Transformable = __webpack_require__(33);
	    var Animatable = __webpack_require__(34);
	    var zrUtil = __webpack_require__(3);

	    /**
	     * @alias module:zrender/Element
	     * @constructor
	     * @extends {module:zrender/mixin/Animatable}
	     * @extends {module:zrender/mixin/Transformable}
	     * @extends {module:zrender/mixin/Eventful}
	     */
	    var Element = function (opts) {

	        Transformable.call(this, opts);
	        Eventful.call(this, opts);
	        Animatable.call(this, opts);

	        /**
	         * 画布元素ID
	         * @type {string}
	         */
	        this.id = opts.id || guid();
	    };

	    Element.prototype = {

	        /**
	         * 元素类型
	         * Element type
	         * @type {string}
	         */
	        type: 'element',

	        /**
	         * 元素名字
	         * Element name
	         * @type {string}
	         */
	        name: '',

	        /**
	         * ZRender 实例对象，会在 element 添加到 zrender 实例中后自动赋值
	         * ZRender instance will be assigned when element is associated with zrender
	         * @name module:/zrender/Element#__zr
	         * @type {module:zrender/ZRender}
	         */
	        __zr: null,

	        /**
	         * 图形是否忽略，为true时忽略图形的绘制以及事件触发
	         * If ignore drawing and events of the element object
	         * @name module:/zrender/Element#ignore
	         * @type {boolean}
	         * @default false
	         */
	        ignore: false,

	        /**
	         * 用于裁剪的路径(shape)，所有 Group 内的路径在绘制时都会被这个路径裁剪
	         * 该路径会继承被裁减对象的变换
	         * @type {module:zrender/graphic/Path}
	         * @see http://www.w3.org/TR/2dcontext/#clipping-region
	         * @readOnly
	         */
	        clipPath: null,

	        /**
	         * Drift element
	         * @param  {number} dx dx on the global space
	         * @param  {number} dy dy on the global space
	         */
	        drift: function (dx, dy) {
	            switch (this.draggable) {
	                case 'horizontal':
	                    dy = 0;
	                    break;
	                case 'vertical':
	                    dx = 0;
	                    break;
	            }

	            var m = this.transform;
	            if (!m) {
	                m = this.transform = [1, 0, 0, 1, 0, 0];
	            }
	            m[4] += dx;
	            m[5] += dy;

	            this.decomposeTransform();
	            this.dirty();
	        },

	        /**
	         * Hook before update
	         */
	        beforeUpdate: function () {},
	        /**
	         * Hook after update
	         */
	        afterUpdate: function () {},
	        /**
	         * Update each frame
	         */
	        update: function () {
	            this.updateTransform();
	        },

	        /**
	         * @param  {Function} cb
	         * @param  {}   context
	         */
	        traverse: function (cb, context) {},

	        /**
	         * @protected
	         */
	        attrKV: function (key, value) {
	            if (key === 'position' || key === 'scale' || key === 'origin') {
	                // Copy the array
	                if (value) {
	                    var target = this[key];
	                    if (!target) {
	                        target = this[key] = [];
	                    }
	                    target[0] = value[0];
	                    target[1] = value[1];
	                }
	            }
	            else {
	                this[key] = value;
	            }
	        },

	        /**
	         * Hide the element
	         */
	        hide: function () {
	            this.ignore = true;
	            this.__zr && this.__zr.refresh();
	        },

	        /**
	         * Show the element
	         */
	        show: function () {
	            this.ignore = false;
	            this.__zr && this.__zr.refresh();
	        },

	        /**
	         * @param {string|Object} key
	         * @param {*} value
	         */
	        attr: function (key, value) {
	            if (typeof key === 'string') {
	                this.attrKV(key, value);
	            }
	            else if (zrUtil.isObject(key)) {
	                for (var name in key) {
	                    if (key.hasOwnProperty(name)) {
	                        this.attrKV(name, key[name]);
	                    }
	                }
	            }
	            this.dirty();

	            return this;
	        },

	        /**
	         * @param {module:zrender/graphic/Path} clipPath
	         */
	        setClipPath: function (clipPath) {
	            var zr = this.__zr;
	            if (zr) {
	                clipPath.addSelfToZr(zr);
	            }

	            // Remove previous clip path
	            if (this.clipPath && this.clipPath !== clipPath) {
	                this.removeClipPath();
	            }

	            this.clipPath = clipPath;
	            clipPath.__zr = zr;
	            clipPath.__clipTarget = this;

	            this.dirty();
	        },

	        /**
	         */
	        removeClipPath: function () {
	            var clipPath = this.clipPath;
	            if (clipPath) {
	                if (clipPath.__zr) {
	                    clipPath.removeSelfFromZr(clipPath.__zr);
	                }

	                clipPath.__zr = null;
	                clipPath.__clipTarget = null;
	                this.clipPath = null;

	                this.dirty();
	            }
	        },

	        /**
	         * Add self from zrender instance.
	         * Not recursively because it will be invoked when element added to storage.
	         * @param {module:zrender/ZRender} zr
	         */
	        addSelfToZr: function (zr) {
	            this.__zr = zr;
	            // 添加动画
	            var animators = this.animators;
	            if (animators) {
	                for (var i = 0; i < animators.length; i++) {
	                    zr.animation.addAnimator(animators[i]);
	                }
	            }

	            if (this.clipPath) {
	                this.clipPath.addSelfToZr(zr);
	            }
	        },

	        /**
	         * Remove self from zrender instance.
	         * Not recursively because it will be invoked when element added to storage.
	         * @param {module:zrender/ZRender} zr
	         */
	        removeSelfFromZr: function (zr) {
	            this.__zr = null;
	            // 移除动画
	            var animators = this.animators;
	            if (animators) {
	                for (var i = 0; i < animators.length; i++) {
	                    zr.animation.removeAnimator(animators[i]);
	                }
	            }

	            if (this.clipPath) {
	                this.clipPath.removeSelfFromZr(zr);
	            }
	        }
	    };

	    zrUtil.mixin(Element, Animatable);
	    zrUtil.mixin(Element, Transformable);
	    zrUtil.mixin(Element, Eventful);

	    module.exports = Element;


/***/ },
/* 31 */
/***/ function(module, exports) {

	/**
	 * zrender: 生成唯一id
	 *
	 * @author errorrik (errorrik@gmail.com)
	 */


	        var idStart = 0x0907;

	        module.exports = function () {
	            return 'zr_' + (idStart++);
	        };
	    


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 事件扩展
	 * @module zrender/mixin/Eventful
	 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
	 *         pissang (https://www.github.com/pissang)
	 */


	    var arrySlice = Array.prototype.slice;
	    var zrUtil = __webpack_require__(3);
	    var indexOf = zrUtil.indexOf;

	    /**
	     * 事件分发器
	     * @alias module:zrender/mixin/Eventful
	     * @constructor
	     */
	    var Eventful = function () {
	        this._$handlers = {};
	    };

	    Eventful.prototype = {

	        constructor: Eventful,

	        /**
	         * 单次触发绑定，trigger后销毁
	         *
	         * @param {string} event 事件名
	         * @param {Function} handler 响应函数
	         * @param {Object} context
	         */
	        one: function (event, handler, context) {
	            var _h = this._$handlers;

	            if (!handler || !event) {
	                return this;
	            }

	            if (!_h[event]) {
	                _h[event] = [];
	            }

	            if (indexOf(_h[event], event) >= 0) {
	                return this;
	            }

	            _h[event].push({
	                h: handler,
	                one: true,
	                ctx: context || this
	            });

	            return this;
	        },

	        /**
	         * 绑定事件
	         * @param {string} event 事件名
	         * @param {Function} handler 事件处理函数
	         * @param {Object} [context]
	         */
	        on: function (event, handler, context) {
	            var _h = this._$handlers;

	            if (!handler || !event) {
	                return this;
	            }

	            if (!_h[event]) {
	                _h[event] = [];
	            }

	            _h[event].push({
	                h: handler,
	                one: false,
	                ctx: context || this
	            });

	            return this;
	        },

	        /**
	         * 是否绑定了事件
	         * @param  {string}  event
	         * @return {boolean}
	         */
	        isSilent: function (event) {
	            var _h = this._$handlers;
	            return _h[event] && _h[event].length;
	        },

	        /**
	         * 解绑事件
	         * @param {string} event 事件名
	         * @param {Function} [handler] 事件处理函数
	         */
	        off: function (event, handler) {
	            var _h = this._$handlers;

	            if (!event) {
	                this._$handlers = {};
	                return this;
	            }

	            if (handler) {
	                if (_h[event]) {
	                    var newList = [];
	                    for (var i = 0, l = _h[event].length; i < l; i++) {
	                        if (_h[event][i]['h'] != handler) {
	                            newList.push(_h[event][i]);
	                        }
	                    }
	                    _h[event] = newList;
	                }

	                if (_h[event] && _h[event].length === 0) {
	                    delete _h[event];
	                }
	            }
	            else {
	                delete _h[event];
	            }

	            return this;
	        },

	        /**
	         * 事件分发
	         *
	         * @param {string} type 事件类型
	         */
	        trigger: function (type) {
	            if (this._$handlers[type]) {
	                var args = arguments;
	                var argLen = args.length;

	                if (argLen > 3) {
	                    args = arrySlice.call(args, 1);
	                }

	                var _h = this._$handlers[type];
	                var len = _h.length;
	                for (var i = 0; i < len;) {
	                    // Optimize advise from backbone
	                    switch (argLen) {
	                        case 1:
	                            _h[i]['h'].call(_h[i]['ctx']);
	                            break;
	                        case 2:
	                            _h[i]['h'].call(_h[i]['ctx'], args[1]);
	                            break;
	                        case 3:
	                            _h[i]['h'].call(_h[i]['ctx'], args[1], args[2]);
	                            break;
	                        default:
	                            // have more than 2 given arguments
	                            _h[i]['h'].apply(_h[i]['ctx'], args);
	                            break;
	                    }

	                    if (_h[i]['one']) {
	                        _h.splice(i, 1);
	                        len--;
	                    }
	                    else {
	                        i++;
	                    }
	                }
	            }

	            return this;
	        },

	        /**
	         * 带有context的事件分发, 最后一个参数是事件回调的context
	         * @param {string} type 事件类型
	         */
	        triggerWithContext: function (type) {
	            if (this._$handlers[type]) {
	                var args = arguments;
	                var argLen = args.length;

	                if (argLen > 4) {
	                    args = arrySlice.call(args, 1, args.length - 1);
	                }
	                var ctx = args[args.length - 1];

	                var _h = this._$handlers[type];
	                var len = _h.length;
	                for (var i = 0; i < len;) {
	                    // Optimize advise from backbone
	                    switch (argLen) {
	                        case 1:
	                            _h[i]['h'].call(ctx);
	                            break;
	                        case 2:
	                            _h[i]['h'].call(ctx, args[1]);
	                            break;
	                        case 3:
	                            _h[i]['h'].call(ctx, args[1], args[2]);
	                            break;
	                        default:
	                            // have more than 2 given arguments
	                            _h[i]['h'].apply(ctx, args);
	                            break;
	                    }

	                    if (_h[i]['one']) {
	                        _h.splice(i, 1);
	                        len--;
	                    }
	                    else {
	                        i++;
	                    }
	                }
	            }

	            return this;
	        }
	    };

	    // 对象可以通过 onxxxx 绑定事件
	    /**
	     * @event module:zrender/mixin/Eventful#onclick
	     * @type {Function}
	     * @default null
	     */
	    /**
	     * @event module:zrender/mixin/Eventful#onmouseover
	     * @type {Function}
	     * @default null
	     */
	    /**
	     * @event module:zrender/mixin/Eventful#onmouseout
	     * @type {Function}
	     * @default null
	     */
	    /**
	     * @event module:zrender/mixin/Eventful#onmousemove
	     * @type {Function}
	     * @default null
	     */
	    /**
	     * @event module:zrender/mixin/Eventful#onmousewheel
	     * @type {Function}
	     * @default null
	     */
	    /**
	     * @event module:zrender/mixin/Eventful#onmousedown
	     * @type {Function}
	     * @default null
	     */
	    /**
	     * @event module:zrender/mixin/Eventful#onmouseup
	     * @type {Function}
	     * @default null
	     */
	    /**
	     * @event module:zrender/mixin/Eventful#ondragstart
	     * @type {Function}
	     * @default null
	     */
	    /**
	     * @event module:zrender/mixin/Eventful#ondragend
	     * @type {Function}
	     * @default null
	     */
	    /**
	     * @event module:zrender/mixin/Eventful#ondragenter
	     * @type {Function}
	     * @default null
	     */
	    /**
	     * @event module:zrender/mixin/Eventful#ondragleave
	     * @type {Function}
	     * @default null
	     */
	    /**
	     * @event module:zrender/mixin/Eventful#ondragover
	     * @type {Function}
	     * @default null
	     */
	    /**
	     * @event module:zrender/mixin/Eventful#ondrop
	     * @type {Function}
	     * @default null
	     */

	    module.exports = Eventful;



/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * 提供变换扩展
	 * @module zrender/mixin/Transformable
	 * @author pissang (https://www.github.com/pissang)
	 */


	    var matrix = __webpack_require__(17);
	    var vector = __webpack_require__(16);
	    var mIdentity = matrix.identity;

	    var EPSILON = 5e-5;

	    function isNotAroundZero(val) {
	        return val > EPSILON || val < -EPSILON;
	    }

	    /**
	     * @alias module:zrender/mixin/Transformable
	     * @constructor
	     */
	    var Transformable = function (opts) {
	        opts = opts || {};
	        // If there are no given position, rotation, scale
	        if (!opts.position) {
	            /**
	             * 平移
	             * @type {Array.<number>}
	             * @default [0, 0]
	             */
	            this.position = [0, 0];
	        }
	        if (opts.rotation == null) {
	            /**
	             * 旋转
	             * @type {Array.<number>}
	             * @default 0
	             */
	            this.rotation = 0;
	        }
	        if (!opts.scale) {
	            /**
	             * 缩放
	             * @type {Array.<number>}
	             * @default [1, 1]
	             */
	            this.scale = [1, 1];
	        }
	        /**
	         * 旋转和缩放的原点
	         * @type {Array.<number>}
	         * @default null
	         */
	        this.origin = this.origin || null;
	    };

	    var transformableProto = Transformable.prototype;
	    transformableProto.transform = null;

	    /**
	     * 判断是否需要有坐标变换
	     * 如果有坐标变换, 则从position, rotation, scale以及父节点的transform计算出自身的transform矩阵
	     */
	    transformableProto.needLocalTransform = function () {
	        return isNotAroundZero(this.rotation)
	            || isNotAroundZero(this.position[0])
	            || isNotAroundZero(this.position[1])
	            || isNotAroundZero(this.scale[0] - 1)
	            || isNotAroundZero(this.scale[1] - 1);
	    };

	    transformableProto.updateTransform = function () {
	        var parent = this.parent;
	        var parentHasTransform = parent && parent.transform;
	        var needLocalTransform = this.needLocalTransform();

	        var m = this.transform;
	        if (!(needLocalTransform || parentHasTransform)) {
	            m && mIdentity(m);
	            return;
	        }

	        m = m || matrix.create();

	        if (needLocalTransform) {
	            this.getLocalTransform(m);
	        }
	        else {
	            mIdentity(m);
	        }

	        // 应用父节点变换
	        if (parentHasTransform) {
	            if (needLocalTransform) {
	                matrix.mul(m, parent.transform, m);
	            }
	            else {
	                matrix.copy(m, parent.transform);
	            }
	        }
	        // 保存这个变换矩阵
	        this.transform = m;

	        this.invTransform = this.invTransform || matrix.create();
	        matrix.invert(this.invTransform, m);
	    };

	    transformableProto.getLocalTransform = function (m) {
	        m = m || [];
	        mIdentity(m);

	        var origin = this.origin;

	        var scale = this.scale;
	        var rotation = this.rotation;
	        var position = this.position;
	        if (origin) {
	            // Translate to origin
	            m[4] -= origin[0];
	            m[5] -= origin[1];
	        }
	        matrix.scale(m, m, scale);
	        if (rotation) {
	            matrix.rotate(m, m, rotation);
	        }
	        if (origin) {
	            // Translate back from origin
	            m[4] += origin[0];
	            m[5] += origin[1];
	        }

	        m[4] += position[0];
	        m[5] += position[1];

	        return m;
	    };
	    /**
	     * 将自己的transform应用到context上
	     * @param {Context2D} ctx
	     */
	    transformableProto.setTransform = function (ctx) {
	        var m = this.transform;
	        if (m) {
	            ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
	        }
	    };

	    var tmpTransform = [];

	    /**
	     * 分解`transform`矩阵到`position`, `rotation`, `scale`
	     */
	    transformableProto.decomposeTransform = function () {
	        if (!this.transform) {
	            return;
	        }
	        var parent = this.parent;
	        var m = this.transform;
	        if (parent && parent.transform) {
	            // Get local transform and decompose them to position, scale, rotation
	            matrix.mul(tmpTransform, parent.invTransform, m);
	            m = tmpTransform;
	        }
	        var sx = m[0] * m[0] + m[1] * m[1];
	        var sy = m[2] * m[2] + m[3] * m[3];
	        var position = this.position;
	        var scale = this.scale;
	        if (isNotAroundZero(sx - 1)) {
	            sx = Math.sqrt(sx);
	        }
	        if (isNotAroundZero(sy - 1)) {
	            sy = Math.sqrt(sy);
	        }
	        if (m[0] < 0) {
	            sx = -sx;
	        }
	        if (m[3] < 0) {
	            sy = -sy;
	        }
	        position[0] = m[4];
	        position[1] = m[5];
	        scale[0] = sx;
	        scale[1] = sy;
	        this.rotation = Math.atan2(-m[1] / sy, m[0] / sx);
	    };

	    /**
	     * Get global scale
	     * @return {Array.<number>}
	     */
	    transformableProto.getGlobalScale = function () {
	        var m = this.transform;
	        if (!m) {
	            return [1, 1];
	        }
	        var sx = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
	        var sy = Math.sqrt(m[2] * m[2] + m[3] * m[3]);
	        if (m[0] < 0) {
	            sx = -sx;
	        }
	        if (m[3] < 0) {
	            sy = -sy;
	        }
	        return [sx, sy];
	    };
	    /**
	     * 变换坐标位置到 shape 的局部坐标空间
	     * @method
	     * @param {number} x
	     * @param {number} y
	     * @return {Array.<number>}
	     */
	    transformableProto.transformCoordToLocal = function (x, y) {
	        var v2 = [x, y];
	        var invTransform = this.invTransform;
	        if (invTransform) {
	            vector.applyTransform(v2, v2, invTransform);
	        }
	        return v2;
	    };

	    /**
	     * 变换局部坐标位置到全局坐标空间
	     * @method
	     * @param {number} x
	     * @param {number} y
	     * @return {Array.<number>}
	     */
	    transformableProto.transformCoordToGlobal = function (x, y) {
	        var v2 = [x, y];
	        var transform = this.transform;
	        if (transform) {
	            vector.applyTransform(v2, v2, transform);
	        }
	        return v2;
	    };

	    module.exports = Transformable;



/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * @module zrender/mixin/Animatable
	 */


	    var Animator = __webpack_require__(35);
	    var util = __webpack_require__(3);
	    var isString = util.isString;
	    var isFunction = util.isFunction;
	    var isObject = util.isObject;
	    var log = __webpack_require__(39);

	    /**
	     * @alias modue:zrender/mixin/Animatable
	     * @constructor
	     */
	    var Animatable = function () {

	        /**
	         * @type {Array.<module:zrender/animation/Animator>}
	         * @readOnly
	         */
	        this.animators = [];
	    };

	    Animatable.prototype = {

	        constructor: Animatable,

	        /**
	         * 动画
	         *
	         * @param {string} path 需要添加动画的属性获取路径，可以通过a.b.c来获取深层的属性
	         * @param {boolean} [loop] 动画是否循环
	         * @return {module:zrender/animation/Animator}
	         * @example:
	         *     el.animate('style', false)
	         *         .when(1000, {x: 10} )
	         *         .done(function(){ // Animation done })
	         *         .start()
	         */
	        animate: function (path, loop) {
	            var target;
	            var animatingShape = false;
	            var el = this;
	            var zr = this.__zr;
	            if (path) {
	                var pathSplitted = path.split('.');
	                var prop = el;
	                // If animating shape
	                animatingShape = pathSplitted[0] === 'shape';
	                for (var i = 0, l = pathSplitted.length; i < l; i++) {
	                    if (!prop) {
	                        continue;
	                    }
	                    prop = prop[pathSplitted[i]];
	                }
	                if (prop) {
	                    target = prop;
	                }
	            }
	            else {
	                target = el;
	            }

	            if (!target) {
	                log(
	                    'Property "'
	                    + path
	                    + '" is not existed in element '
	                    + el.id
	                );
	                return;
	            }

	            var animators = el.animators;

	            var animator = new Animator(target, loop);

	            animator.during(function (target) {
	                el.dirty(animatingShape);
	            })
	            .done(function () {
	                // FIXME Animator will not be removed if use `Animator#stop` to stop animation
	                animators.splice(util.indexOf(animators, animator), 1);
	            });

	            animators.push(animator);

	            // If animate after added to the zrender
	            if (zr) {
	                zr.animation.addAnimator(animator);
	            }

	            return animator;
	        },

	        /**
	         * 停止动画
	         * @param {boolean} forwardToLast If move to last frame before stop
	         */
	        stopAnimation: function (forwardToLast) {
	            var animators = this.animators;
	            var len = animators.length;
	            for (var i = 0; i < len; i++) {
	                animators[i].stop(forwardToLast);
	            }
	            animators.length = 0;

	            return this;
	        },

	        /**
	         * @param {Object} target
	         * @param {number} [time=500] Time in ms
	         * @param {string} [easing='linear']
	         * @param {number} [delay=0]
	         * @param {Function} [callback]
	         *
	         * @example
	         *  // Animate position
	         *  el.animateTo({
	         *      position: [10, 10]
	         *  }, function () { // done })
	         *
	         *  // Animate shape, style and position in 100ms, delayed 100ms, with cubicOut easing
	         *  el.animateTo({
	         *      shape: {
	         *          width: 500
	         *      },
	         *      style: {
	         *          fill: 'red'
	         *      }
	         *      position: [10, 10]
	         *  }, 100, 100, 'cubicOut', function () { // done })
	         */
	         // TODO Return animation key
	        animateTo: function (target, time, delay, easing, callback) {
	            // animateTo(target, time, easing, callback);
	            if (isString(delay)) {
	                callback = easing;
	                easing = delay;
	                delay = 0;
	            }
	            // animateTo(target, time, delay, callback);
	            else if (isFunction(easing)) {
	                callback = easing;
	                easing = 'linear';
	                delay = 0;
	            }
	            // animateTo(target, time, callback);
	            else if (isFunction(delay)) {
	                callback = delay;
	                delay = 0;
	            }
	            // animateTo(target, callback)
	            else if (isFunction(time)) {
	                callback = time;
	                time = 500;
	            }
	            // animateTo(target)
	            else if (!time) {
	                time = 500;
	            }
	            // Stop all previous animations
	            this.stopAnimation();
	            this._animateToShallow('', this, target, time, delay, easing, callback);

	            // Animators may be removed immediately after start
	            // if there is nothing to animate
	            var animators = this.animators.slice();
	            var count = animators.length;
	            function done() {
	                count--;
	                if (!count) {
	                    callback && callback();
	                }
	            }

	            // No animators. This should be checked before animators[i].start(),
	            // because 'done' may be executed immediately if no need to animate.
	            if (!count) {
	                callback && callback();
	            }
	            // Start after all animators created
	            // Incase any animator is done immediately when all animation properties are not changed
	            for (var i = 0; i < animators.length; i++) {
	                animators[i]
	                    .done(done)
	                    .start(easing);
	            }
	        },

	        /**
	         * @private
	         * @param {string} path=''
	         * @param {Object} source=this
	         * @param {Object} target
	         * @param {number} [time=500]
	         * @param {number} [delay=0]
	         *
	         * @example
	         *  // Animate position
	         *  el._animateToShallow({
	         *      position: [10, 10]
	         *  })
	         *
	         *  // Animate shape, style and position in 100ms, delayed 100ms
	         *  el._animateToShallow({
	         *      shape: {
	         *          width: 500
	         *      },
	         *      style: {
	         *          fill: 'red'
	         *      }
	         *      position: [10, 10]
	         *  }, 100, 100)
	         */
	        _animateToShallow: function (path, source, target, time, delay) {
	            var objShallow = {};
	            var propertyCount = 0;
	            for (var name in target) {
	                if (source[name] != null) {
	                    if (isObject(target[name]) && !util.isArrayLike(target[name])) {
	                        this._animateToShallow(
	                            path ? path + '.' + name : name,
	                            source[name],
	                            target[name],
	                            time,
	                            delay
	                        );
	                    }
	                    else {
	                        objShallow[name] = target[name];
	                        propertyCount++;
	                    }
	                }
	                else if (target[name] != null) {
	                    // Attr directly if not has property
	                    // FIXME, if some property not needed for element ?
	                    if (!path) {
	                        this.attr(name, target[name]);
	                    }
	                    else {  // Shape or style
	                        var props = {};
	                        props[path] = {};
	                        props[path][name] = target[name];
	                        this.attr(props);
	                    }
	                }
	            }

	            if (propertyCount > 0) {
	                this.animate(path, false)
	                    .when(time == null ? 500 : time, objShallow)
	                    .delay(delay || 0);
	            }

	            return this;
	        }
	    };

	    module.exports = Animatable;


/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @module echarts/animation/Animator
	 */


	    var Clip = __webpack_require__(36);
	    var color = __webpack_require__(38);
	    var util = __webpack_require__(3);
	    var isArrayLike = util.isArrayLike;

	    var arraySlice = Array.prototype.slice;

	    function defaultGetter(target, key) {
	        return target[key];
	    }

	    function defaultSetter(target, key, value) {
	        target[key] = value;
	    }

	    /**
	     * @param  {number} p0
	     * @param  {number} p1
	     * @param  {number} percent
	     * @return {number}
	     */
	    function interpolateNumber(p0, p1, percent) {
	        return (p1 - p0) * percent + p0;
	    }

	    /**
	     * @param  {string} p0
	     * @param  {string} p1
	     * @param  {number} percent
	     * @return {string}
	     */
	    function interpolateString(p0, p1, percent) {
	        return percent > 0.5 ? p1 : p0;
	    }

	    /**
	     * @param  {Array} p0
	     * @param  {Array} p1
	     * @param  {number} percent
	     * @param  {Array} out
	     * @param  {number} arrDim
	     */
	    function interpolateArray(p0, p1, percent, out, arrDim) {
	        var len = p0.length;
	        if (arrDim == 1) {
	            for (var i = 0; i < len; i++) {
	                out[i] = interpolateNumber(p0[i], p1[i], percent);
	            }
	        }
	        else {
	            var len2 = p0[0].length;
	            for (var i = 0; i < len; i++) {
	                for (var j = 0; j < len2; j++) {
	                    out[i][j] = interpolateNumber(
	                        p0[i][j], p1[i][j], percent
	                    );
	                }
	            }
	        }
	    }

	    // arr0 is source array, arr1 is target array.
	    // Do some preprocess to avoid error happened when interpolating from arr0 to arr1
	    function fillArr(arr0, arr1, arrDim) {
	        var arr0Len = arr0.length;
	        var arr1Len = arr1.length;
	        if (arr0Len !== arr1Len) {
	            // FIXME Not work for TypedArray
	            var isPreviousLarger = arr0Len > arr1Len;
	            if (isPreviousLarger) {
	                // Cut the previous
	                arr0.length = arr1Len;
	            }
	            else {
	                // Fill the previous
	                for (var i = arr0Len; i < arr1Len; i++) {
	                    arr0.push(
	                        arrDim === 1 ? arr1[i] : arraySlice.call(arr1[i])
	                    );
	                }
	            }
	        }
	        // Handling NaN value
	        var len2 = arr0[0] && arr0[0].length;
	        for (var i = 0; i < arr0.length; i++) {
	            if (arrDim === 1) {
	                if (isNaN(arr0[i])) {
	                    arr0[i] = arr1[i];
	                }
	            }
	            else {
	                for (var j = 0; j < len2; j++) {
	                    if (isNaN(arr0[i][j])) {
	                        arr0[i][j] = arr1[i][j];
	                    }
	                }
	            }
	        }
	    }

	    /**
	     * @param  {Array} arr0
	     * @param  {Array} arr1
	     * @param  {number} arrDim
	     * @return {boolean}
	     */
	    function isArraySame(arr0, arr1, arrDim) {
	        if (arr0 === arr1) {
	            return true;
	        }
	        var len = arr0.length;
	        if (len !== arr1.length) {
	            return false;
	        }
	        if (arrDim === 1) {
	            for (var i = 0; i < len; i++) {
	                if (arr0[i] !== arr1[i]) {
	                    return false;
	                }
	            }
	        }
	        else {
	            var len2 = arr0[0].length;
	            for (var i = 0; i < len; i++) {
	                for (var j = 0; j < len2; j++) {
	                    if (arr0[i][j] !== arr1[i][j]) {
	                        return false;
	                    }
	                }
	            }
	        }
	        return true;
	    }

	    /**
	     * Catmull Rom interpolate array
	     * @param  {Array} p0
	     * @param  {Array} p1
	     * @param  {Array} p2
	     * @param  {Array} p3
	     * @param  {number} t
	     * @param  {number} t2
	     * @param  {number} t3
	     * @param  {Array} out
	     * @param  {number} arrDim
	     */
	    function catmullRomInterpolateArray(
	        p0, p1, p2, p3, t, t2, t3, out, arrDim
	    ) {
	        var len = p0.length;
	        if (arrDim == 1) {
	            for (var i = 0; i < len; i++) {
	                out[i] = catmullRomInterpolate(
	                    p0[i], p1[i], p2[i], p3[i], t, t2, t3
	                );
	            }
	        }
	        else {
	            var len2 = p0[0].length;
	            for (var i = 0; i < len; i++) {
	                for (var j = 0; j < len2; j++) {
	                    out[i][j] = catmullRomInterpolate(
	                        p0[i][j], p1[i][j], p2[i][j], p3[i][j],
	                        t, t2, t3
	                    );
	                }
	            }
	        }
	    }

	    /**
	     * Catmull Rom interpolate number
	     * @param  {number} p0
	     * @param  {number} p1
	     * @param  {number} p2
	     * @param  {number} p3
	     * @param  {number} t
	     * @param  {number} t2
	     * @param  {number} t3
	     * @return {number}
	     */
	    function catmullRomInterpolate(p0, p1, p2, p3, t, t2, t3) {
	        var v0 = (p2 - p0) * 0.5;
	        var v1 = (p3 - p1) * 0.5;
	        return (2 * (p1 - p2) + v0 + v1) * t3
	                + (-3 * (p1 - p2) - 2 * v0 - v1) * t2
	                + v0 * t + p1;
	    }

	    function cloneValue(value) {
	        if (isArrayLike(value)) {
	            var len = value.length;
	            if (isArrayLike(value[0])) {
	                var ret = [];
	                for (var i = 0; i < len; i++) {
	                    ret.push(arraySlice.call(value[i]));
	                }
	                return ret;
	            }

	            return arraySlice.call(value);
	        }

	        return value;
	    }

	    function rgba2String(rgba) {
	        rgba[0] = Math.floor(rgba[0]);
	        rgba[1] = Math.floor(rgba[1]);
	        rgba[2] = Math.floor(rgba[2]);

	        return 'rgba(' + rgba.join(',') + ')';
	    }

	    function createTrackClip (animator, easing, oneTrackDone, keyframes, propName) {
	        var getter = animator._getter;
	        var setter = animator._setter;
	        var useSpline = easing === 'spline';

	        var trackLen = keyframes.length;
	        if (!trackLen) {
	            return;
	        }
	        // Guess data type
	        var firstVal = keyframes[0].value;
	        var isValueArray = isArrayLike(firstVal);
	        var isValueColor = false;
	        var isValueString = false;

	        // For vertices morphing
	        var arrDim = (
	                isValueArray
	                && isArrayLike(firstVal[0])
	            )
	            ? 2 : 1;
	        var trackMaxTime;
	        // Sort keyframe as ascending
	        keyframes.sort(function(a, b) {
	            return a.time - b.time;
	        });

	        trackMaxTime = keyframes[trackLen - 1].time;
	        // Percents of each keyframe
	        var kfPercents = [];
	        // Value of each keyframe
	        var kfValues = [];
	        var prevValue = keyframes[0].value;
	        var isAllValueEqual = true;
	        for (var i = 0; i < trackLen; i++) {
	            kfPercents.push(keyframes[i].time / trackMaxTime);
	            // Assume value is a color when it is a string
	            var value = keyframes[i].value;

	            // Check if value is equal, deep check if value is array
	            if (!((isValueArray && isArraySame(value, prevValue, arrDim))
	                || (!isValueArray && value === prevValue))) {
	                isAllValueEqual = false;
	            }
	            prevValue = value;

	            // Try converting a string to a color array
	            if (typeof value == 'string') {
	                var colorArray = color.parse(value);
	                if (colorArray) {
	                    value = colorArray;
	                    isValueColor = true;
	                }
	                else {
	                    isValueString = true;
	                }
	            }
	            kfValues.push(value);
	        }
	        if (isAllValueEqual) {
	            return;
	        }

	        var lastValue = kfValues[trackLen - 1];
	        // Polyfill array and NaN value
	        for (var i = 0; i < trackLen - 1; i++) {
	            if (isValueArray) {
	                fillArr(kfValues[i], lastValue, arrDim);
	            }
	            else {
	                if (isNaN(kfValues[i]) && !isNaN(lastValue) && !isValueString && !isValueColor) {
	                    kfValues[i] = lastValue;
	                }
	            }
	        }
	        isValueArray && fillArr(getter(animator._target, propName), lastValue, arrDim);

	        // Cache the key of last frame to speed up when
	        // animation playback is sequency
	        var lastFrame = 0;
	        var lastFramePercent = 0;
	        var start;
	        var w;
	        var p0;
	        var p1;
	        var p2;
	        var p3;

	        if (isValueColor) {
	            var rgba = [0, 0, 0, 0];
	        }

	        var onframe = function (target, percent) {
	            // Find the range keyframes
	            // kf1-----kf2---------current--------kf3
	            // find kf2 and kf3 and do interpolation
	            var frame;
	            if (percent < lastFramePercent) {
	                // Start from next key
	                start = Math.min(lastFrame + 1, trackLen - 1);
	                for (frame = start; frame >= 0; frame--) {
	                    if (kfPercents[frame] <= percent) {
	                        break;
	                    }
	                }
	                frame = Math.min(frame, trackLen - 2);
	            }
	            else {
	                for (frame = lastFrame; frame < trackLen; frame++) {
	                    if (kfPercents[frame] > percent) {
	                        break;
	                    }
	                }
	                frame = Math.min(frame - 1, trackLen - 2);
	            }
	            lastFrame = frame;
	            lastFramePercent = percent;

	            var range = (kfPercents[frame + 1] - kfPercents[frame]);
	            if (range === 0) {
	                return;
	            }
	            else {
	                w = (percent - kfPercents[frame]) / range;
	            }
	            if (useSpline) {
	                p1 = kfValues[frame];
	                p0 = kfValues[frame === 0 ? frame : frame - 1];
	                p2 = kfValues[frame > trackLen - 2 ? trackLen - 1 : frame + 1];
	                p3 = kfValues[frame > trackLen - 3 ? trackLen - 1 : frame + 2];
	                if (isValueArray) {
	                    catmullRomInterpolateArray(
	                        p0, p1, p2, p3, w, w * w, w * w * w,
	                        getter(target, propName),
	                        arrDim
	                    );
	                }
	                else {
	                    var value;
	                    if (isValueColor) {
	                        value = catmullRomInterpolateArray(
	                            p0, p1, p2, p3, w, w * w, w * w * w,
	                            rgba, 1
	                        );
	                        value = rgba2String(rgba);
	                    }
	                    else if (isValueString) {
	                        // String is step(0.5)
	                        return interpolateString(p1, p2, w);
	                    }
	                    else {
	                        value = catmullRomInterpolate(
	                            p0, p1, p2, p3, w, w * w, w * w * w
	                        );
	                    }
	                    setter(
	                        target,
	                        propName,
	                        value
	                    );
	                }
	            }
	            else {
	                if (isValueArray) {
	                    interpolateArray(
	                        kfValues[frame], kfValues[frame + 1], w,
	                        getter(target, propName),
	                        arrDim
	                    );
	                }
	                else {
	                    var value;
	                    if (isValueColor) {
	                        interpolateArray(
	                            kfValues[frame], kfValues[frame + 1], w,
	                            rgba, 1
	                        );
	                        value = rgba2String(rgba);
	                    }
	                    else if (isValueString) {
	                        // String is step(0.5)
	                        return interpolateString(kfValues[frame], kfValues[frame + 1], w);
	                    }
	                    else {
	                        value = interpolateNumber(kfValues[frame], kfValues[frame + 1], w);
	                    }
	                    setter(
	                        target,
	                        propName,
	                        value
	                    );
	                }
	            }
	        };

	        var clip = new Clip({
	            target: animator._target,
	            life: trackMaxTime,
	            loop: animator._loop,
	            delay: animator._delay,
	            onframe: onframe,
	            ondestroy: oneTrackDone
	        });

	        if (easing && easing !== 'spline') {
	            clip.easing = easing;
	        }

	        return clip;
	    }

	    /**
	     * @alias module:zrender/animation/Animator
	     * @constructor
	     * @param {Object} target
	     * @param {boolean} loop
	     * @param {Function} getter
	     * @param {Function} setter
	     */
	    var Animator = function(target, loop, getter, setter) {
	        this._tracks = {};
	        this._target = target;

	        this._loop = loop || false;

	        this._getter = getter || defaultGetter;
	        this._setter = setter || defaultSetter;

	        this._clipCount = 0;

	        this._delay = 0;

	        this._doneList = [];

	        this._onframeList = [];

	        this._clipList = [];
	    };

	    Animator.prototype = {
	        /**
	         * 设置动画关键帧
	         * @param  {number} time 关键帧时间，单位是ms
	         * @param  {Object} props 关键帧的属性值，key-value表示
	         * @return {module:zrender/animation/Animator}
	         */
	        when: function(time /* ms */, props) {
	            var tracks = this._tracks;
	            for (var propName in props) {
	                if (!tracks[propName]) {
	                    tracks[propName] = [];
	                    // Invalid value
	                    var value = this._getter(this._target, propName);
	                    if (value == null) {
	                        // zrLog('Invalid property ' + propName);
	                        continue;
	                    }
	                    // If time is 0
	                    //  Then props is given initialize value
	                    // Else
	                    //  Initialize value from current prop value
	                    if (time !== 0) {
	                        tracks[propName].push({
	                            time: 0,
	                            value: cloneValue(value)
	                        });
	                    }
	                }
	                tracks[propName].push({
	                    time: time,
	                    value: props[propName]
	                });
	            }
	            return this;
	        },
	        /**
	         * 添加动画每一帧的回调函数
	         * @param  {Function} callback
	         * @return {module:zrender/animation/Animator}
	         */
	        during: function (callback) {
	            this._onframeList.push(callback);
	            return this;
	        },

	        _doneCallback: function () {
	            // Clear all tracks
	            this._tracks = {};
	            // Clear all clips
	            this._clipList.length = 0;

	            var doneList = this._doneList;
	            var len = doneList.length;
	            for (var i = 0; i < len; i++) {
	                doneList[i].call(this);
	            }
	        },
	        /**
	         * 开始执行动画
	         * @param  {string|Function} easing
	         *         动画缓动函数，详见{@link module:zrender/animation/easing}
	         * @return {module:zrender/animation/Animator}
	         */
	        start: function (easing) {

	            var self = this;
	            var clipCount = 0;

	            var oneTrackDone = function() {
	                clipCount--;
	                if (!clipCount) {
	                    self._doneCallback();
	                }
	            };

	            var lastClip;
	            for (var propName in this._tracks) {
	                var clip = createTrackClip(
	                    this, easing, oneTrackDone,
	                    this._tracks[propName], propName
	                );
	                if (clip) {
	                    this._clipList.push(clip);
	                    clipCount++;

	                    // If start after added to animation
	                    if (this.animation) {
	                        this.animation.addClip(clip);
	                    }

	                    lastClip = clip;
	                }
	            }

	            // Add during callback on the last clip
	            if (lastClip) {
	                var oldOnFrame = lastClip.onframe;
	                lastClip.onframe = function (target, percent) {
	                    oldOnFrame(target, percent);

	                    for (var i = 0; i < self._onframeList.length; i++) {
	                        self._onframeList[i](target, percent);
	                    }
	                };
	            }

	            if (!clipCount) {
	                this._doneCallback();
	            }
	            return this;
	        },
	        /**
	         * 停止动画
	         * @param {boolean} forwardToLast If move to last frame before stop
	         */
	        stop: function (forwardToLast) {
	            var clipList = this._clipList;
	            var animation = this.animation;
	            for (var i = 0; i < clipList.length; i++) {
	                var clip = clipList[i];
	                if (forwardToLast) {
	                    // Move to last frame before stop
	                    clip.onframe(this._target, 1);
	                }
	                animation && animation.removeClip(clip);
	            }
	            clipList.length = 0;
	        },
	        /**
	         * 设置动画延迟开始的时间
	         * @param  {number} time 单位ms
	         * @return {module:zrender/animation/Animator}
	         */
	        delay: function (time) {
	            this._delay = time;
	            return this;
	        },
	        /**
	         * 添加动画结束的回调
	         * @param  {Function} cb
	         * @return {module:zrender/animation/Animator}
	         */
	        done: function(cb) {
	            if (cb) {
	                this._doneList.push(cb);
	            }
	            return this;
	        },

	        /**
	         * @return {Array.<module:zrender/animation/Clip>}
	         */
	        getClips: function () {
	            return this._clipList;
	        }
	    };

	    module.exports = Animator;


/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 动画主控制器
	 * @config target 动画对象，可以是数组，如果是数组的话会批量分发onframe等事件
	 * @config life(1000) 动画时长
	 * @config delay(0) 动画延迟时间
	 * @config loop(true)
	 * @config gap(0) 循环的间隔时间
	 * @config onframe
	 * @config easing(optional)
	 * @config ondestroy(optional)
	 * @config onrestart(optional)
	 *
	 * TODO pause
	 */


	    var easingFuncs = __webpack_require__(37);

	    function Clip(options) {

	        this._target = options.target;

	        // 生命周期
	        this._life = options.life || 1000;
	        // 延时
	        this._delay = options.delay || 0;
	        // 开始时间
	        // this._startTime = new Date().getTime() + this._delay;// 单位毫秒
	        this._initialized = false;

	        // 是否循环
	        this.loop = options.loop == null ? false : options.loop;

	        this.gap = options.gap || 0;

	        this.easing = options.easing || 'Linear';

	        this.onframe = options.onframe;
	        this.ondestroy = options.ondestroy;
	        this.onrestart = options.onrestart;
	    }

	    Clip.prototype = {

	        constructor: Clip,

	        step: function (time) {
	            // Set startTime on first step, or _startTime may has milleseconds different between clips
	            // PENDING
	            if (!this._initialized) {
	                this._startTime = new Date().getTime() + this._delay;
	                this._initialized = true;
	            }

	            var percent = (time - this._startTime) / this._life;

	            // 还没开始
	            if (percent < 0) {
	                return;
	            }

	            percent = Math.min(percent, 1);

	            var easing = this.easing;
	            var easingFunc = typeof easing == 'string' ? easingFuncs[easing] : easing;
	            var schedule = typeof easingFunc === 'function'
	                ? easingFunc(percent)
	                : percent;

	            this.fire('frame', schedule);

	            // 结束
	            if (percent == 1) {
	                if (this.loop) {
	                    this.restart();
	                    // 重新开始周期
	                    // 抛出而不是直接调用事件直到 stage.update 后再统一调用这些事件
	                    return 'restart';
	                }

	                // 动画完成将这个控制器标识为待删除
	                // 在Animation.update中进行批量删除
	                this._needsRemove = true;
	                return 'destroy';
	            }

	            return null;
	        },

	        restart: function() {
	            var time = new Date().getTime();
	            var remainder = (time - this._startTime) % this._life;
	            this._startTime = new Date().getTime() - remainder + this.gap;

	            this._needsRemove = false;
	        },

	        fire: function(eventType, arg) {
	            eventType = 'on' + eventType;
	            if (this[eventType]) {
	                this[eventType](this._target, arg);
	            }
	        }
	    };

	    module.exports = Clip;



/***/ },
/* 37 */
/***/ function(module, exports) {

	/**
	 * 缓动代码来自 https://github.com/sole/tween.js/blob/master/src/Tween.js
	 * @see http://sole.github.io/tween.js/examples/03_graphs.html
	 * @exports zrender/animation/easing
	 */

	    var easing = {
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        linear: function (k) {
	            return k;
	        },

	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        quadraticIn: function (k) {
	            return k * k;
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        quadraticOut: function (k) {
	            return k * (2 - k);
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        quadraticInOut: function (k) {
	            if ((k *= 2) < 1) {
	                return 0.5 * k * k;
	            }
	            return -0.5 * (--k * (k - 2) - 1);
	        },

	        // 三次方的缓动（t^3）
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        cubicIn: function (k) {
	            return k * k * k;
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        cubicOut: function (k) {
	            return --k * k * k + 1;
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        cubicInOut: function (k) {
	            if ((k *= 2) < 1) {
	                return 0.5 * k * k * k;
	            }
	            return 0.5 * ((k -= 2) * k * k + 2);
	        },

	        // 四次方的缓动（t^4）
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        quarticIn: function (k) {
	            return k * k * k * k;
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        quarticOut: function (k) {
	            return 1 - (--k * k * k * k);
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        quarticInOut: function (k) {
	            if ((k *= 2) < 1) {
	                return 0.5 * k * k * k * k;
	            }
	            return -0.5 * ((k -= 2) * k * k * k - 2);
	        },

	        // 五次方的缓动（t^5）
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        quinticIn: function (k) {
	            return k * k * k * k * k;
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        quinticOut: function (k) {
	            return --k * k * k * k * k + 1;
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        quinticInOut: function (k) {
	            if ((k *= 2) < 1) {
	                return 0.5 * k * k * k * k * k;
	            }
	            return 0.5 * ((k -= 2) * k * k * k * k + 2);
	        },

	        // 正弦曲线的缓动（sin(t)）
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        sinusoidalIn: function (k) {
	            return 1 - Math.cos(k * Math.PI / 2);
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        sinusoidalOut: function (k) {
	            return Math.sin(k * Math.PI / 2);
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        sinusoidalInOut: function (k) {
	            return 0.5 * (1 - Math.cos(Math.PI * k));
	        },

	        // 指数曲线的缓动（2^t）
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        exponentialIn: function (k) {
	            return k === 0 ? 0 : Math.pow(1024, k - 1);
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        exponentialOut: function (k) {
	            return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        exponentialInOut: function (k) {
	            if (k === 0) {
	                return 0;
	            }
	            if (k === 1) {
	                return 1;
	            }
	            if ((k *= 2) < 1) {
	                return 0.5 * Math.pow(1024, k - 1);
	            }
	            return 0.5 * (-Math.pow(2, -10 * (k - 1)) + 2);
	        },

	        // 圆形曲线的缓动（sqrt(1-t^2)）
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        circularIn: function (k) {
	            return 1 - Math.sqrt(1 - k * k);
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        circularOut: function (k) {
	            return Math.sqrt(1 - (--k * k));
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        circularInOut: function (k) {
	            if ((k *= 2) < 1) {
	                return -0.5 * (Math.sqrt(1 - k * k) - 1);
	            }
	            return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
	        },

	        // 创建类似于弹簧在停止前来回振荡的动画
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        elasticIn: function (k) {
	            var s;
	            var a = 0.1;
	            var p = 0.4;
	            if (k === 0) {
	                return 0;
	            }
	            if (k === 1) {
	                return 1;
	            }
	            if (!a || a < 1) {
	                a = 1; s = p / 4;
	            }
	            else {
	                s = p * Math.asin(1 / a) / (2 * Math.PI);
	            }
	            return -(a * Math.pow(2, 10 * (k -= 1)) *
	                        Math.sin((k - s) * (2 * Math.PI) / p));
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        elasticOut: function (k) {
	            var s;
	            var a = 0.1;
	            var p = 0.4;
	            if (k === 0) {
	                return 0;
	            }
	            if (k === 1) {
	                return 1;
	            }
	            if (!a || a < 1) {
	                a = 1; s = p / 4;
	            }
	            else {
	                s = p * Math.asin(1 / a) / (2 * Math.PI);
	            }
	            return (a * Math.pow(2, -10 * k) *
	                    Math.sin((k - s) * (2 * Math.PI) / p) + 1);
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        elasticInOut: function (k) {
	            var s;
	            var a = 0.1;
	            var p = 0.4;
	            if (k === 0) {
	                return 0;
	            }
	            if (k === 1) {
	                return 1;
	            }
	            if (!a || a < 1) {
	                a = 1; s = p / 4;
	            }
	            else {
	                s = p * Math.asin(1 / a) / (2 * Math.PI);
	            }
	            if ((k *= 2) < 1) {
	                return -0.5 * (a * Math.pow(2, 10 * (k -= 1))
	                    * Math.sin((k - s) * (2 * Math.PI) / p));
	            }
	            return a * Math.pow(2, -10 * (k -= 1))
	                    * Math.sin((k - s) * (2 * Math.PI) / p) * 0.5 + 1;

	        },

	        // 在某一动画开始沿指示的路径进行动画处理前稍稍收回该动画的移动
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        backIn: function (k) {
	            var s = 1.70158;
	            return k * k * ((s + 1) * k - s);
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        backOut: function (k) {
	            var s = 1.70158;
	            return --k * k * ((s + 1) * k + s) + 1;
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        backInOut: function (k) {
	            var s = 1.70158 * 1.525;
	            if ((k *= 2) < 1) {
	                return 0.5 * (k * k * ((s + 1) * k - s));
	            }
	            return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
	        },

	        // 创建弹跳效果
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        bounceIn: function (k) {
	            return 1 - easing.bounceOut(1 - k);
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        bounceOut: function (k) {
	            if (k < (1 / 2.75)) {
	                return 7.5625 * k * k;
	            }
	            else if (k < (2 / 2.75)) {
	                return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
	            }
	            else if (k < (2.5 / 2.75)) {
	                return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
	            }
	            else {
	                return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
	            }
	        },
	        /**
	        * @param {number} k
	        * @return {number}
	        */
	        bounceInOut: function (k) {
	            if (k < 0.5) {
	                return easing.bounceIn(k * 2) * 0.5;
	            }
	            return easing.bounceOut(k * 2 - 1) * 0.5 + 0.5;
	        }
	    };

	    module.exports = easing;




/***/ },
/* 38 */
/***/ function(module, exports) {

	/**
	 * @module zrender/tool/color
	 */


	    var kCSSColorTable = {
	        'transparent': [0,0,0,0], 'aliceblue': [240,248,255,1],
	        'antiquewhite': [250,235,215,1], 'aqua': [0,255,255,1],
	        'aquamarine': [127,255,212,1], 'azure': [240,255,255,1],
	        'beige': [245,245,220,1], 'bisque': [255,228,196,1],
	        'black': [0,0,0,1], 'blanchedalmond': [255,235,205,1],
	        'blue': [0,0,255,1], 'blueviolet': [138,43,226,1],
	        'brown': [165,42,42,1], 'burlywood': [222,184,135,1],
	        'cadetblue': [95,158,160,1], 'chartreuse': [127,255,0,1],
	        'chocolate': [210,105,30,1], 'coral': [255,127,80,1],
	        'cornflowerblue': [100,149,237,1], 'cornsilk': [255,248,220,1],
	        'crimson': [220,20,60,1], 'cyan': [0,255,255,1],
	        'darkblue': [0,0,139,1], 'darkcyan': [0,139,139,1],
	        'darkgoldenrod': [184,134,11,1], 'darkgray': [169,169,169,1],
	        'darkgreen': [0,100,0,1], 'darkgrey': [169,169,169,1],
	        'darkkhaki': [189,183,107,1], 'darkmagenta': [139,0,139,1],
	        'darkolivegreen': [85,107,47,1], 'darkorange': [255,140,0,1],
	        'darkorchid': [153,50,204,1], 'darkred': [139,0,0,1],
	        'darksalmon': [233,150,122,1], 'darkseagreen': [143,188,143,1],
	        'darkslateblue': [72,61,139,1], 'darkslategray': [47,79,79,1],
	        'darkslategrey': [47,79,79,1], 'darkturquoise': [0,206,209,1],
	        'darkviolet': [148,0,211,1], 'deeppink': [255,20,147,1],
	        'deepskyblue': [0,191,255,1], 'dimgray': [105,105,105,1],
	        'dimgrey': [105,105,105,1], 'dodgerblue': [30,144,255,1],
	        'firebrick': [178,34,34,1], 'floralwhite': [255,250,240,1],
	        'forestgreen': [34,139,34,1], 'fuchsia': [255,0,255,1],
	        'gainsboro': [220,220,220,1], 'ghostwhite': [248,248,255,1],
	        'gold': [255,215,0,1], 'goldenrod': [218,165,32,1],
	        'gray': [128,128,128,1], 'green': [0,128,0,1],
	        'greenyellow': [173,255,47,1], 'grey': [128,128,128,1],
	        'honeydew': [240,255,240,1], 'hotpink': [255,105,180,1],
	        'indianred': [205,92,92,1], 'indigo': [75,0,130,1],
	        'ivory': [255,255,240,1], 'khaki': [240,230,140,1],
	        'lavender': [230,230,250,1], 'lavenderblush': [255,240,245,1],
	        'lawngreen': [124,252,0,1], 'lemonchiffon': [255,250,205,1],
	        'lightblue': [173,216,230,1], 'lightcoral': [240,128,128,1],
	        'lightcyan': [224,255,255,1], 'lightgoldenrodyellow': [250,250,210,1],
	        'lightgray': [211,211,211,1], 'lightgreen': [144,238,144,1],
	        'lightgrey': [211,211,211,1], 'lightpink': [255,182,193,1],
	        'lightsalmon': [255,160,122,1], 'lightseagreen': [32,178,170,1],
	        'lightskyblue': [135,206,250,1], 'lightslategray': [119,136,153,1],
	        'lightslategrey': [119,136,153,1], 'lightsteelblue': [176,196,222,1],
	        'lightyellow': [255,255,224,1], 'lime': [0,255,0,1],
	        'limegreen': [50,205,50,1], 'linen': [250,240,230,1],
	        'magenta': [255,0,255,1], 'maroon': [128,0,0,1],
	        'mediumaquamarine': [102,205,170,1], 'mediumblue': [0,0,205,1],
	        'mediumorchid': [186,85,211,1], 'mediumpurple': [147,112,219,1],
	        'mediumseagreen': [60,179,113,1], 'mediumslateblue': [123,104,238,1],
	        'mediumspringgreen': [0,250,154,1], 'mediumturquoise': [72,209,204,1],
	        'mediumvioletred': [199,21,133,1], 'midnightblue': [25,25,112,1],
	        'mintcream': [245,255,250,1], 'mistyrose': [255,228,225,1],
	        'moccasin': [255,228,181,1], 'navajowhite': [255,222,173,1],
	        'navy': [0,0,128,1], 'oldlace': [253,245,230,1],
	        'olive': [128,128,0,1], 'olivedrab': [107,142,35,1],
	        'orange': [255,165,0,1], 'orangered': [255,69,0,1],
	        'orchid': [218,112,214,1], 'palegoldenrod': [238,232,170,1],
	        'palegreen': [152,251,152,1], 'paleturquoise': [175,238,238,1],
	        'palevioletred': [219,112,147,1], 'papayawhip': [255,239,213,1],
	        'peachpuff': [255,218,185,1], 'peru': [205,133,63,1],
	        'pink': [255,192,203,1], 'plum': [221,160,221,1],
	        'powderblue': [176,224,230,1], 'purple': [128,0,128,1],
	        'red': [255,0,0,1], 'rosybrown': [188,143,143,1],
	        'royalblue': [65,105,225,1], 'saddlebrown': [139,69,19,1],
	        'salmon': [250,128,114,1], 'sandybrown': [244,164,96,1],
	        'seagreen': [46,139,87,1], 'seashell': [255,245,238,1],
	        'sienna': [160,82,45,1], 'silver': [192,192,192,1],
	        'skyblue': [135,206,235,1], 'slateblue': [106,90,205,1],
	        'slategray': [112,128,144,1], 'slategrey': [112,128,144,1],
	        'snow': [255,250,250,1], 'springgreen': [0,255,127,1],
	        'steelblue': [70,130,180,1], 'tan': [210,180,140,1],
	        'teal': [0,128,128,1], 'thistle': [216,191,216,1],
	        'tomato': [255,99,71,1], 'turquoise': [64,224,208,1],
	        'violet': [238,130,238,1], 'wheat': [245,222,179,1],
	        'white': [255,255,255,1], 'whitesmoke': [245,245,245,1],
	        'yellow': [255,255,0,1], 'yellowgreen': [154,205,50,1]
	    };

	    function clampCssByte(i) {  // Clamp to integer 0 .. 255.
	        i = Math.round(i);  // Seems to be what Chrome does (vs truncation).
	        return i < 0 ? 0 : i > 255 ? 255 : i;
	    }

	    function clampCssAngle(i) {  // Clamp to integer 0 .. 360.
	        i = Math.round(i);  // Seems to be what Chrome does (vs truncation).
	        return i < 0 ? 0 : i > 360 ? 360 : i;
	    }

	    function clampCssFloat(f) {  // Clamp to float 0.0 .. 1.0.
	        return f < 0 ? 0 : f > 1 ? 1 : f;
	    }

	    function parseCssInt(str) {  // int or percentage.
	        if (str.length && str.charAt(str.length - 1) === '%') {
	            return clampCssByte(parseFloat(str) / 100 * 255);
	        }
	        return clampCssByte(parseInt(str, 10));
	    }

	    function parseCssFloat(str) {  // float or percentage.
	        if (str.length && str.charAt(str.length - 1) === '%') {
	            return clampCssFloat(parseFloat(str) / 100);
	        }
	        return clampCssFloat(parseFloat(str));
	    }

	    function cssHueToRgb(m1, m2, h) {
	        if (h < 0) {
	            h += 1;
	        }
	        else if (h > 1) {
	            h -= 1;
	        }

	        if (h * 6 < 1) {
	            return m1 + (m2 - m1) * h * 6;
	        }
	        if (h * 2 < 1) {
	            return m2;
	        }
	        if (h * 3 < 2) {
	            return m1 + (m2 - m1) * (2/3 - h) * 6;
	        }
	        return m1;
	    }

	    function lerp(a, b, p) {
	        return a + (b - a) * p;
	    }

	    /**
	     * @param {string} colorStr
	     * @return {Array.<number>}
	     * @memberOf module:zrender/util/color
	     */
	    function parse(colorStr) {
	        if (!colorStr) {
	            return;
	        }
	        // colorStr may be not string
	        colorStr = colorStr + '';
	        // Remove all whitespace, not compliant, but should just be more accepting.
	        var str = colorStr.replace(/ /g, '').toLowerCase();

	        // Color keywords (and transparent) lookup.
	        if (str in kCSSColorTable) {
	            return kCSSColorTable[str].slice();  // dup.
	        }

	        // #abc and #abc123 syntax.
	        if (str.charAt(0) === '#') {
	            if (str.length === 4) {
	                var iv = parseInt(str.substr(1), 16);  // TODO(deanm): Stricter parsing.
	                if (!(iv >= 0 && iv <= 0xfff)) {
	                    return;  // Covers NaN.
	                }
	                return [
	                    ((iv & 0xf00) >> 4) | ((iv & 0xf00) >> 8),
	                    (iv & 0xf0) | ((iv & 0xf0) >> 4),
	                    (iv & 0xf) | ((iv & 0xf) << 4),
	                    1
	                ];
	            }
	            else if (str.length === 7) {
	                var iv = parseInt(str.substr(1), 16);  // TODO(deanm): Stricter parsing.
	                if (!(iv >= 0 && iv <= 0xffffff)) {
	                    return;  // Covers NaN.
	                }
	                return [
	                    (iv & 0xff0000) >> 16,
	                    (iv & 0xff00) >> 8,
	                    iv & 0xff,
	                    1
	                ];
	            }

	            return;
	        }
	        var op = str.indexOf('('), ep = str.indexOf(')');
	        if (op !== -1 && ep + 1 === str.length) {
	            var fname = str.substr(0, op);
	            var params = str.substr(op + 1, ep - (op + 1)).split(',');
	            var alpha = 1;  // To allow case fallthrough.
	            switch (fname) {
	                case 'rgba':
	                    if (params.length !== 4) {
	                        return;
	                    }
	                    alpha = parseCssFloat(params.pop()); // jshint ignore:line
	                // Fall through.
	                case 'rgb':
	                    if (params.length !== 3) {
	                        return;
	                    }
	                    return [
	                        parseCssInt(params[0]),
	                        parseCssInt(params[1]),
	                        parseCssInt(params[2]),
	                        alpha
	                    ];
	                case 'hsla':
	                    if (params.length !== 4) {
	                        return;
	                    }
	                    params[3] = parseCssFloat(params[3]);
	                    return hsla2rgba(params);
	                case 'hsl':
	                    if (params.length !== 3) {
	                        return;
	                    }
	                    return hsla2rgba(params);
	                default:
	                    return;
	            }
	        }

	        return;
	    }

	    /**
	     * @param {Array.<number>} hsla
	     * @return {Array.<number>} rgba
	     */
	    function hsla2rgba(hsla) {
	        var h = (((parseFloat(hsla[0]) % 360) + 360) % 360) / 360;  // 0 .. 1
	        // NOTE(deanm): According to the CSS spec s/l should only be
	        // percentages, but we don't bother and let float or percentage.
	        var s = parseCssFloat(hsla[1]);
	        var l = parseCssFloat(hsla[2]);
	        var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
	        var m1 = l * 2 - m2;

	        var rgba = [
	            clampCssByte(cssHueToRgb(m1, m2, h + 1 / 3) * 255),
	            clampCssByte(cssHueToRgb(m1, m2, h) * 255),
	            clampCssByte(cssHueToRgb(m1, m2, h - 1 / 3) * 255)
	        ];

	        if (hsla.length === 4) {
	            rgba[3] = hsla[3];
	        }

	        return rgba;
	    }

	    /**
	     * @param {Array.<number>} rgba
	     * @return {Array.<number>} hsla
	     */
	    function rgba2hsla(rgba) {
	        if (!rgba) {
	            return;
	        }

	        // RGB from 0 to 255
	        var R = rgba[0] / 255;
	        var G = rgba[1] / 255;
	        var B = rgba[2] / 255;

	        var vMin = Math.min(R, G, B); // Min. value of RGB
	        var vMax = Math.max(R, G, B); // Max. value of RGB
	        var delta = vMax - vMin; // Delta RGB value

	        var L = (vMax + vMin) / 2;
	        var H;
	        var S;
	        // HSL results from 0 to 1
	        if (delta === 0) {
	            H = 0;
	            S = 0;
	        }
	        else {
	            if (L < 0.5) {
	                S = delta / (vMax + vMin);
	            }
	            else {
	                S = delta / (2 - vMax - vMin);
	            }

	            var deltaR = (((vMax - R) / 6) + (delta / 2)) / delta;
	            var deltaG = (((vMax - G) / 6) + (delta / 2)) / delta;
	            var deltaB = (((vMax - B) / 6) + (delta / 2)) / delta;

	            if (R === vMax) {
	                H = deltaB - deltaG;
	            }
	            else if (G === vMax) {
	                H = (1 / 3) + deltaR - deltaB;
	            }
	            else if (B === vMax) {
	                H = (2 / 3) + deltaG - deltaR;
	            }

	            if (H < 0) {
	                H += 1;
	            }

	            if (H > 1) {
	                H -= 1;
	            }
	        }

	        var hsla = [H * 360, S, L];

	        if (rgba[3] != null) {
	            hsla.push(rgba[3]);
	        }

	        return hsla;
	    }

	    /**
	     * @param {string} color
	     * @param {number} level
	     * @return {string}
	     * @memberOf module:zrender/util/color
	     */
	    function lift(color, level) {
	        var colorArr = parse(color);
	        if (colorArr) {
	            for (var i = 0; i < 3; i++) {
	                if (level < 0) {
	                    colorArr[i] = colorArr[i] * (1 - level) | 0;
	                }
	                else {
	                    colorArr[i] = ((255 - colorArr[i]) * level + colorArr[i]) | 0;
	                }
	            }
	            return stringify(colorArr, colorArr.length === 4 ? 'rgba' : 'rgb');
	        }
	    }

	    /**
	     * @param {string} color
	     * @return {string}
	     * @memberOf module:zrender/util/color
	     */
	    function toHex(color, level) {
	        var colorArr = parse(color);
	        if (colorArr) {
	            return ((1 << 24) + (colorArr[0] << 16) + (colorArr[1] << 8) + (+colorArr[2])).toString(16).slice(1);
	        }
	    }

	    /**
	     * Map value to color. Faster than mapToColor methods because color is represented by rgba array
	     * @param {number} normalizedValue A float between 0 and 1.
	     * @param {Array.<Array.<number>>} colors List of rgba color array
	     * @param {Array.<number>} [out] Mapped gba color array
	     * @return {Array.<number>}
	     */
	    function fastMapToColor(normalizedValue, colors, out) {
	        if (!(colors && colors.length)
	            || !(normalizedValue >= 0 && normalizedValue <= 1)
	        ) {
	            return;
	        }
	        out = out || [0, 0, 0, 0];
	        var value = normalizedValue * (colors.length - 1);
	        var leftIndex = Math.floor(value);
	        var rightIndex = Math.ceil(value);
	        var leftColor = colors[leftIndex];
	        var rightColor = colors[rightIndex];
	        var dv = value - leftIndex;
	        out[0] = clampCssByte(lerp(leftColor[0], rightColor[0], dv));
	        out[1] = clampCssByte(lerp(leftColor[1], rightColor[1], dv));
	        out[2] = clampCssByte(lerp(leftColor[2], rightColor[2], dv));
	        out[3] = clampCssByte(lerp(leftColor[3], rightColor[3], dv));
	        return out;
	    }
	    /**
	     * @param {number} normalizedValue A float between 0 and 1.
	     * @param {Array.<string>} colors Color list.
	     * @param {boolean=} fullOutput Default false.
	     * @return {(string|Object)} Result color. If fullOutput,
	     *                           return {color: ..., leftIndex: ..., rightIndex: ..., value: ...},
	     * @memberOf module:zrender/util/color
	     */
	    function mapToColor(normalizedValue, colors, fullOutput) {
	        if (!(colors && colors.length)
	            || !(normalizedValue >= 0 && normalizedValue <= 1)
	        ) {
	            return;
	        }

	        var value = normalizedValue * (colors.length - 1);
	        var leftIndex = Math.floor(value);
	        var rightIndex = Math.ceil(value);
	        var leftColor = parse(colors[leftIndex]);
	        var rightColor = parse(colors[rightIndex]);
	        var dv = value - leftIndex;

	        var color = stringify(
	            [
	                clampCssByte(lerp(leftColor[0], rightColor[0], dv)),
	                clampCssByte(lerp(leftColor[1], rightColor[1], dv)),
	                clampCssByte(lerp(leftColor[2], rightColor[2], dv)),
	                clampCssFloat(lerp(leftColor[3], rightColor[3], dv))
	            ],
	            'rgba'
	        );

	        return fullOutput
	            ? {
	                color: color,
	                leftIndex: leftIndex,
	                rightIndex: rightIndex,
	                value: value
	            }
	            : color;
	    }

	    /**
	     * @param {string} color
	     * @param {number=} h 0 ~ 360, ignore when null.
	     * @param {number=} s 0 ~ 1, ignore when null.
	     * @param {number=} l 0 ~ 1, ignore when null.
	     * @return {string} Color string in rgba format.
	     * @memberOf module:zrender/util/color
	     */
	    function modifyHSL(color, h, s, l) {
	        color = parse(color);

	        if (color) {
	            color = rgba2hsla(color);
	            h != null && (color[0] = clampCssAngle(h));
	            s != null && (color[1] = parseCssFloat(s));
	            l != null && (color[2] = parseCssFloat(l));

	            return stringify(hsla2rgba(color), 'rgba');
	        }
	    }

	    /**
	     * @param {string} color
	     * @param {number=} alpha 0 ~ 1
	     * @return {string} Color string in rgba format.
	     * @memberOf module:zrender/util/color
	     */
	    function modifyAlpha(color, alpha) {
	        color = parse(color);

	        if (color && alpha != null) {
	            color[3] = clampCssFloat(alpha);
	            return stringify(color, 'rgba');
	        }
	    }

	    /**
	     * @param {Array.<string>} colors Color list.
	     * @param {string} type 'rgba', 'hsva', ...
	     * @return {string} Result color.
	     */
	    function stringify(arrColor, type) {
	        if (type === 'rgb' || type === 'hsv' || type === 'hsl') {
	            arrColor = arrColor.slice(0, 3);
	        }
	        return type + '(' + arrColor.join(',') + ')';
	    }

	    module.exports = {
	        parse: parse,
	        lift: lift,
	        toHex: toHex,
	        fastMapToColor: fastMapToColor,
	        mapToColor: mapToColor,
	        modifyHSL: modifyHSL,
	        modifyAlpha: modifyAlpha,
	        stringify: stringify
	    };




/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	
	        var config = __webpack_require__(40);

	        /**
	         * @exports zrender/tool/log
	         * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
	         */
	        module.exports = function() {
	            if (config.debugMode === 0) {
	                return;
	            }
	            else if (config.debugMode == 1) {
	                for (var k in arguments) {
	                    throw new Error(arguments[k]);
	                }
	            }
	            else if (config.debugMode > 1) {
	                for (var k in arguments) {
	                    console.log(arguments[k]);
	                }
	            }
	        };

	        /* for debug
	        return function(mes) {
	            document.getElementById('wrong-message').innerHTML =
	                mes + ' ' + (new Date() - 0)
	                + '<br/>' 
	                + document.getElementById('wrong-message').innerHTML;
	        };
	        */
	    


/***/ },
/* 40 */
/***/ function(module, exports) {

	
	    var dpr = 1;
	    // If in browser environment
	    if (typeof window !== 'undefined') {
	        dpr = Math.max(window.devicePixelRatio || 1, 1);
	    }
	    /**
	     * config默认配置项
	     * @exports zrender/config
	     * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
	     */
	    var config = {
	        /**
	         * debug日志选项：catchBrushException为true下有效
	         * 0 : 不生成debug数据，发布用
	         * 1 : 异常抛出，调试用
	         * 2 : 控制台输出，调试用
	         */
	        debugMode: 0,

	        // retina 屏幕优化
	        devicePixelRatio: dpr
	    };
	    module.exports = config;




/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	

	    var Group = __webpack_require__(29);
	    var componentUtil = __webpack_require__(20);
	    var clazzUtil = __webpack_require__(9);

	    function Chart() {

	        /**
	         * @type {module:zrender/container/Group}
	         * @readOnly
	         */
	        this.group = new Group();

	        /**
	         * @type {string}
	         * @readOnly
	         */
	        this.uid = componentUtil.getUID('viewChart');
	    }

	    Chart.prototype = {

	        type: 'chart',

	        /**
	         * Init the chart
	         * @param  {module:echarts/model/Global} ecModel
	         * @param  {module:echarts/ExtensionAPI} api
	         */
	        init: function (ecModel, api) {},

	        /**
	         * Render the chart
	         * @param  {module:echarts/model/Series} seriesModel
	         * @param  {module:echarts/model/Global} ecModel
	         * @param  {module:echarts/ExtensionAPI} api
	         * @param  {Object} payload
	         */
	        render: function (seriesModel, ecModel, api, payload) {},

	        /**
	         * Highlight series or specified data item
	         * @param  {module:echarts/model/Series} seriesModel
	         * @param  {module:echarts/model/Global} ecModel
	         * @param  {module:echarts/ExtensionAPI} api
	         * @param  {Object} payload
	         */
	        highlight: function (seriesModel, ecModel, api, payload) {
	            toggleHighlight(seriesModel.getData(), payload, 'emphasis');
	        },

	        /**
	         * Downplay series or specified data item
	         * @param  {module:echarts/model/Series} seriesModel
	         * @param  {module:echarts/model/Global} ecModel
	         * @param  {module:echarts/ExtensionAPI} api
	         * @param  {Object} payload
	         */
	        downplay: function (seriesModel, ecModel, api, payload) {
	            toggleHighlight(seriesModel.getData(), payload, 'normal');
	        },

	        /**
	         * Remove self
	         * @param  {module:echarts/model/Global} ecModel
	         * @param  {module:echarts/ExtensionAPI} api
	         */
	        remove: function (ecModel, api) {
	            this.group.removeAll();
	        },

	        /**
	         * Dispose self
	         * @param  {module:echarts/model/Global} ecModel
	         * @param  {module:echarts/ExtensionAPI} api
	         */
	        dispose: function () {}
	    };

	    var chartProto = Chart.prototype;
	    chartProto.updateView
	        = chartProto.updateLayout
	        = chartProto.updateVisual
	        = function (seriesModel, ecModel, api, payload) {
	            this.render(seriesModel, ecModel, api, payload);
	        };

	    /**
	     * Set state of single element
	     * @param  {module:zrender/Element} el
	     * @param  {string} state
	     */
	    function elSetState(el, state) {
	        if (el) {
	            el.trigger(state);
	            if (el.type === 'group') {
	                for (var i = 0; i < el.childCount(); i++) {
	                    elSetState(el.childAt(i), state);
	                }
	            }
	        }
	    }
	    /**
	     * @param  {module:echarts/data/List} data
	     * @param  {Object} payload
	     * @param  {string} state 'normal'|'emphasis'
	     * @inner
	     */
	    function toggleHighlight(data, payload, state) {
	        if (payload.dataIndex != null) {
	            var el = data.getItemGraphicEl(payload.dataIndex);
	            elSetState(el, state);
	        }
	        else if (payload.name) {
	            var dataIndex = data.indexOfName(payload.name);
	            var el = data.getItemGraphicEl(dataIndex);
	            elSetState(el, state);
	        }
	        else {
	            data.eachItemGraphicEl(function (el) {
	                elSetState(el, state);
	            });
	        }
	    }

	    // Enable Chart.extend.
	    clazzUtil.enableClassExtend(Chart);

	    // Add capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
	    clazzUtil.enableClassManagement(Chart, {registerWhenExtend: true});

	    module.exports = Chart;


/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var zrUtil = __webpack_require__(3);

	    var pathTool = __webpack_require__(43);
	    var round = Math.round;
	    var Path = __webpack_require__(44);
	    var colorTool = __webpack_require__(38);
	    var matrix = __webpack_require__(17);
	    var vector = __webpack_require__(16);
	    var Gradient = __webpack_require__(4);

	    var graphic = {};

	    graphic.Group = __webpack_require__(29);

	    graphic.Image = __webpack_require__(59);

	    graphic.Text = __webpack_require__(62);

	    graphic.Circle = __webpack_require__(63);

	    graphic.Sector = __webpack_require__(64);

	    graphic.Ring = __webpack_require__(65);

	    graphic.Polygon = __webpack_require__(66);

	    graphic.Polyline = __webpack_require__(70);

	    graphic.Rect = __webpack_require__(71);

	    graphic.Line = __webpack_require__(72);

	    graphic.BezierCurve = __webpack_require__(73);

	    graphic.Arc = __webpack_require__(74);

	    graphic.CompoundPath = __webpack_require__(75);

	    graphic.LinearGradient = __webpack_require__(76);

	    graphic.RadialGradient = __webpack_require__(77);

	    graphic.BoundingRect = __webpack_require__(15);

	    /**
	     * Extend shape with parameters
	     */
	    graphic.extendShape = function (opts) {
	        return Path.extend(opts);
	    };

	    /**
	     * Extend path
	     */
	    graphic.extendPath = function (pathData, opts) {
	        return pathTool.extendFromString(pathData, opts);
	    };

	    /**
	     * Create a path element from path data string
	     * @param {string} pathData
	     * @param {Object} opts
	     * @param {module:zrender/core/BoundingRect} rect
	     * @param {string} [layout=cover] 'center' or 'cover'
	     */
	    graphic.makePath = function (pathData, opts, rect, layout) {
	        var path = pathTool.createFromString(pathData, opts);
	        var boundingRect = path.getBoundingRect();
	        if (rect) {
	            var aspect = boundingRect.width / boundingRect.height;

	            if (layout === 'center') {
	                // Set rect to center, keep width / height ratio.
	                var width = rect.height * aspect;
	                var height;
	                if (width <= rect.width) {
	                    height = rect.height;
	                }
	                else {
	                    width = rect.width;
	                    height = width / aspect;
	                }
	                var cx = rect.x + rect.width / 2;
	                var cy = rect.y + rect.height / 2;

	                rect.x = cx - width / 2;
	                rect.y = cy - height / 2;
	                rect.width = width;
	                rect.height = height;
	            }

	            this.resizePath(path, rect);
	        }
	        return path;
	    };

	    graphic.mergePath = pathTool.mergePath,

	    /**
	     * Resize a path to fit the rect
	     * @param {module:zrender/graphic/Path} path
	     * @param {Object} rect
	     */
	    graphic.resizePath = function (path, rect) {
	        if (!path.applyTransform) {
	            return;
	        }

	        var pathRect = path.getBoundingRect();

	        var m = pathRect.calculateTransform(rect);

	        path.applyTransform(m);
	    };

	    /**
	     * Sub pixel optimize line for canvas
	     *
	     * @param {Object} param
	     * @param {Object} [param.shape]
	     * @param {number} [param.shape.x1]
	     * @param {number} [param.shape.y1]
	     * @param {number} [param.shape.x2]
	     * @param {number} [param.shape.y2]
	     * @param {Object} [param.style]
	     * @param {number} [param.style.lineWidth]
	     * @return {Object} Modified param
	     */
	    graphic.subPixelOptimizeLine = function (param) {
	        var subPixelOptimize = graphic.subPixelOptimize;
	        var shape = param.shape;
	        var lineWidth = param.style.lineWidth;

	        if (round(shape.x1 * 2) === round(shape.x2 * 2)) {
	            shape.x1 = shape.x2 = subPixelOptimize(shape.x1, lineWidth, true);
	        }
	        if (round(shape.y1 * 2) === round(shape.y2 * 2)) {
	            shape.y1 = shape.y2 = subPixelOptimize(shape.y1, lineWidth, true);
	        }
	        return param;
	    };

	    /**
	     * Sub pixel optimize rect for canvas
	     *
	     * @param {Object} param
	     * @param {Object} [param.shape]
	     * @param {number} [param.shape.x]
	     * @param {number} [param.shape.y]
	     * @param {number} [param.shape.width]
	     * @param {number} [param.shape.height]
	     * @param {Object} [param.style]
	     * @param {number} [param.style.lineWidth]
	     * @return {Object} Modified param
	     */
	    graphic.subPixelOptimizeRect = function (param) {
	        var subPixelOptimize = graphic.subPixelOptimize;
	        var shape = param.shape;
	        var lineWidth = param.style.lineWidth;
	        var originX = shape.x;
	        var originY = shape.y;
	        var originWidth = shape.width;
	        var originHeight = shape.height;
	        shape.x = subPixelOptimize(shape.x, lineWidth, true);
	        shape.y = subPixelOptimize(shape.y, lineWidth, true);
	        shape.width = Math.max(
	            subPixelOptimize(originX + originWidth, lineWidth, false) - shape.x,
	            originWidth === 0 ? 0 : 1
	        );
	        shape.height = Math.max(
	            subPixelOptimize(originY + originHeight, lineWidth, false) - shape.y,
	            originHeight === 0 ? 0 : 1
	        );
	        return param;
	    };

	    /**
	     * Sub pixel optimize for canvas
	     *
	     * @param {number} position Coordinate, such as x, y
	     * @param {number} lineWidth Should be nonnegative integer.
	     * @param {boolean=} positiveOrNegative Default false (negative).
	     * @return {number} Optimized position.
	     */
	    graphic.subPixelOptimize = function (position, lineWidth, positiveOrNegative) {
	        // Assure that (position + lineWidth / 2) is near integer edge,
	        // otherwise line will be fuzzy in canvas.
	        var doubledPosition = round(position * 2);
	        return (doubledPosition + round(lineWidth)) % 2 === 0
	            ? doubledPosition / 2
	            : (doubledPosition + (positiveOrNegative ? 1 : -1)) / 2;
	    };

	    function hasFillOrStroke(fillOrStroke) {
	        return fillOrStroke != null && fillOrStroke != 'none';
	    }

	    function liftColor(color) {
	        return color instanceof Gradient ? color : colorTool.lift(color, -0.1);
	    }

	    /**
	     * @private
	     */
	    function cacheElementStl(el) {
	        if (el.__hoverStlDirty) {
	            var stroke = el.style.stroke;
	            var fill = el.style.fill;

	            // Create hoverStyle on mouseover
	            var hoverStyle = el.__hoverStl;
	            hoverStyle.fill = hoverStyle.fill
	                || (hasFillOrStroke(fill) ? liftColor(fill) : null);
	            hoverStyle.stroke = hoverStyle.stroke
	                || (hasFillOrStroke(stroke) ? liftColor(stroke) : null);

	            var normalStyle = {};
	            for (var name in hoverStyle) {
	                if (hoverStyle.hasOwnProperty(name)) {
	                    normalStyle[name] = el.style[name];
	                }
	            }

	            el.__normalStl = normalStyle;

	            el.__hoverStlDirty = false;
	        }
	    }

	    /**
	     * @private
	     */
	    function doSingleEnterHover(el) {
	        if (el.__isHover) {
	            return;
	        }

	        cacheElementStl(el);

	        el.setStyle(el.__hoverStl);
	        el.z2 += 1;

	        el.__isHover = true;
	    }

	    /**
	     * @inner
	     */
	    function doSingleLeaveHover(el) {
	        if (!el.__isHover) {
	            return;
	        }

	        var normalStl = el.__normalStl;
	        normalStl && el.setStyle(normalStl);
	        el.z2 -= 1;

	        el.__isHover = false;
	    }

	    /**
	     * @inner
	     */
	    function doEnterHover(el) {
	        el.type === 'group'
	            ? el.traverse(function (child) {
	                if (child.type !== 'group') {
	                    doSingleEnterHover(child);
	                }
	            })
	            : doSingleEnterHover(el);
	    }

	    function doLeaveHover(el) {
	        el.type === 'group'
	            ? el.traverse(function (child) {
	                if (child.type !== 'group') {
	                    doSingleLeaveHover(child);
	                }
	            })
	            : doSingleLeaveHover(el);
	    }

	    /**
	     * @inner
	     */
	    function setElementHoverStl(el, hoverStl) {
	        // If element has sepcified hoverStyle, then use it instead of given hoverStyle
	        // Often used when item group has a label element and it's hoverStyle is different
	        el.__hoverStl = el.hoverStyle || hoverStl || {};
	        el.__hoverStlDirty = true;

	        if (el.__isHover) {
	            cacheElementStl(el);
	        }
	    }

	    /**
	     * @inner
	     */
	    function onElementMouseOver() {
	        // Only if element is not in emphasis status
	        !this.__isEmphasis && doEnterHover(this);
	    }

	    /**
	     * @inner
	     */
	    function onElementMouseOut() {
	        // Only if element is not in emphasis status
	        !this.__isEmphasis && doLeaveHover(this);
	    }

	    /**
	     * @inner
	     */
	    function enterEmphasis() {
	        this.__isEmphasis = true;
	        doEnterHover(this);
	    }

	    /**
	     * @inner
	     */
	    function leaveEmphasis() {
	        this.__isEmphasis = false;
	        doLeaveHover(this);
	    }

	    /**
	     * Set hover style of element
	     * @param {module:zrender/Element} el
	     * @param {Object} [hoverStyle]
	     */
	    graphic.setHoverStyle = function (el, hoverStyle) {
	        el.type === 'group'
	            ? el.traverse(function (child) {
	                if (child.type !== 'group') {
	                    setElementHoverStl(child, hoverStyle);
	                }
	            })
	            : setElementHoverStl(el, hoverStyle);
	        // Remove previous bound handlers
	        el.on('mouseover', onElementMouseOver)
	          .on('mouseout', onElementMouseOut);

	        // Emphasis, normal can be triggered manually
	        el.on('emphasis', enterEmphasis)
	          .on('normal', leaveEmphasis);
	    };

	    /**
	     * Set text option in the style
	     * @param {Object} textStyle
	     * @param {module:echarts/model/Model} labelModel
	     * @param {string} color
	     */
	    graphic.setText = function (textStyle, labelModel, color) {
	        var labelPosition = labelModel.getShallow('position') || 'inside';
	        var labelColor = labelPosition.indexOf('inside') >= 0 ? 'white' : color;
	        var textStyleModel = labelModel.getModel('textStyle');
	        zrUtil.extend(textStyle, {
	            textDistance: labelModel.getShallow('distance') || 5,
	            textFont: textStyleModel.getFont(),
	            textPosition: labelPosition,
	            textFill: textStyleModel.getTextColor() || labelColor
	        });
	    };

	    function animateOrSetProps(isUpdate, el, props, animatableModel, dataIndex, cb) {
	        if (typeof dataIndex === 'function') {
	            cb = dataIndex;
	            dataIndex = null;
	        }

	        var postfix = isUpdate ? 'Update' : '';
	        var duration = animatableModel
	            && animatableModel.getShallow('animationDuration' + postfix);
	        var animationEasing = animatableModel
	            && animatableModel.getShallow('animationEasing' + postfix);
	        var animationDelay = animatableModel
	            && animatableModel.getShallow('animationDelay' + postfix);
	        if (typeof animationDelay === 'function') {
	            animationDelay = animationDelay(dataIndex);
	        }

	        animatableModel && animatableModel.getShallow('animation')
	            ? el.animateTo(props, duration, animationDelay || 0, animationEasing, cb)
	            : (el.attr(props), cb && cb());
	    }
	    /**
	     * Update graphic element properties with or without animation according to the configuration in series
	     * @param {module:zrender/Element} el
	     * @param {Object} props
	     * @param {module:echarts/model/Model} [animatableModel]
	     * @param {number} [dataIndex]
	     * @param {Function} [cb]
	     * @example
	     *     graphic.updateProps(el, {
	     *         position: [100, 100]
	     *     }, seriesModel, dataIndex, function () { console.log('Animation done!'); });
	     *     // Or
	     *     graphic.updateProps(el, {
	     *         position: [100, 100]
	     *     }, seriesModel, function () { console.log('Animation done!'); });
	     */
	    graphic.updateProps = zrUtil.curry(animateOrSetProps, true);

	    /**
	     * Init graphic element properties with or without animation according to the configuration in series
	     * @param {module:zrender/Element} el
	     * @param {Object} props
	     * @param {module:echarts/model/Model} [animatableModel]
	     * @param {Function} cb
	     */
	    graphic.initProps = zrUtil.curry(animateOrSetProps, false);

	    /**
	     * Get transform matrix of target (param target),
	     * in coordinate of its ancestor (param ancestor)
	     *
	     * @param {module:zrender/mixin/Transformable} target
	     * @param {module:zrender/mixin/Transformable} [ancestor]
	     */
	    graphic.getTransform = function (target, ancestor) {
	        var mat = matrix.identity([]);

	        while (target && target !== ancestor) {
	            matrix.mul(mat, target.getLocalTransform(), mat);
	            target = target.parent;
	        }

	        return mat;
	    };

	    /**
	     * Apply transform to an vertex.
	     * @param {Array.<number>} vertex [x, y]
	     * @param {Array.<number>} transform Transform matrix: like [1, 0, 0, 1, 0, 0]
	     * @param {boolean=} invert Whether use invert matrix.
	     * @return {Array.<number>} [x, y]
	     */
	    graphic.applyTransform = function (vertex, transform, invert) {
	        if (invert) {
	            transform = matrix.invert([], transform);
	        }
	        return vector.applyTransform([], vertex, transform);
	    };

	    /**
	     * @param {string} direction 'left' 'right' 'top' 'bottom'
	     * @param {Array.<number>} transform Transform matrix: like [1, 0, 0, 1, 0, 0]
	     * @param {boolean=} invert Whether use invert matrix.
	     * @return {string} Transformed direction. 'left' 'right' 'top' 'bottom'
	     */
	    graphic.transformDirection = function (direction, transform, invert) {

	        // Pick a base, ensure that transform result will not be (0, 0).
	        var hBase = (transform[4] === 0 || transform[5] === 0 || transform[0] === 0)
	            ? 1 : Math.abs(2 * transform[4] / transform[0]);
	        var vBase = (transform[4] === 0 || transform[5] === 0 || transform[2] === 0)
	            ? 1 : Math.abs(2 * transform[4] / transform[2]);

	        var vertex = [
	            direction === 'left' ? -hBase : direction === 'right' ? hBase : 0,
	            direction === 'top' ? -vBase : direction === 'bottom' ? vBase : 0
	        ];

	        vertex = graphic.applyTransform(vertex, transform, invert);

	        return Math.abs(vertex[0]) > Math.abs(vertex[1])
	            ? (vertex[0] > 0 ? 'right' : 'left')
	            : (vertex[1] > 0 ? 'bottom' : 'top');
	    };

	    module.exports = graphic;


/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	

	    var Path = __webpack_require__(44);
	    var PathProxy = __webpack_require__(48);
	    var transformPath = __webpack_require__(58);
	    var matrix = __webpack_require__(17);

	    // command chars
	    var cc = [
	        'm', 'M', 'l', 'L', 'v', 'V', 'h', 'H', 'z', 'Z',
	        'c', 'C', 'q', 'Q', 't', 'T', 's', 'S', 'a', 'A'
	    ];

	    var mathSqrt = Math.sqrt;
	    var mathSin = Math.sin;
	    var mathCos = Math.cos;
	    var PI = Math.PI;

	    var vMag = function(v) {
	        return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
	    };
	    var vRatio = function(u, v) {
	        return (u[0] * v[0] + u[1] * v[1]) / (vMag(u) * vMag(v));
	    };
	    var vAngle = function(u, v) {
	        return (u[0] * v[1] < u[1] * v[0] ? -1 : 1)
	                * Math.acos(vRatio(u, v));
	    };

	    function processArc(x1, y1, x2, y2, fa, fs, rx, ry, psiDeg, cmd, path) {
	        var psi = psiDeg * (PI / 180.0);
	        var xp = mathCos(psi) * (x1 - x2) / 2.0
	                 + mathSin(psi) * (y1 - y2) / 2.0;
	        var yp = -1 * mathSin(psi) * (x1 - x2) / 2.0
	                 + mathCos(psi) * (y1 - y2) / 2.0;

	        var lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);

	        if (lambda > 1) {
	            rx *= mathSqrt(lambda);
	            ry *= mathSqrt(lambda);
	        }

	        var f = (fa === fs ? -1 : 1)
	            * mathSqrt((((rx * rx) * (ry * ry))
	                    - ((rx * rx) * (yp * yp))
	                    - ((ry * ry) * (xp * xp))) / ((rx * rx) * (yp * yp)
	                    + (ry * ry) * (xp * xp))
	                ) || 0;

	        var cxp = f * rx * yp / ry;
	        var cyp = f * -ry * xp / rx;

	        var cx = (x1 + x2) / 2.0
	                 + mathCos(psi) * cxp
	                 - mathSin(psi) * cyp;
	        var cy = (y1 + y2) / 2.0
	                + mathSin(psi) * cxp
	                + mathCos(psi) * cyp;

	        var theta = vAngle([ 1, 0 ], [ (xp - cxp) / rx, (yp - cyp) / ry ]);
	        var u = [ (xp - cxp) / rx, (yp - cyp) / ry ];
	        var v = [ (-1 * xp - cxp) / rx, (-1 * yp - cyp) / ry ];
	        var dTheta = vAngle(u, v);

	        if (vRatio(u, v) <= -1) {
	            dTheta = PI;
	        }
	        if (vRatio(u, v) >= 1) {
	            dTheta = 0;
	        }
	        if (fs === 0 && dTheta > 0) {
	            dTheta = dTheta - 2 * PI;
	        }
	        if (fs === 1 && dTheta < 0) {
	            dTheta = dTheta + 2 * PI;
	        }

	        path.addData(cmd, cx, cy, rx, ry, theta, dTheta, psi, fs);
	    }

	    function createPathProxyFromString(data) {
	        if (!data) {
	            return [];
	        }

	        // command string
	        var cs = data.replace(/-/g, ' -')
	            .replace(/  /g, ' ')
	            .replace(/ /g, ',')
	            .replace(/,,/g, ',');

	        var n;
	        // create pipes so that we can split the data
	        for (n = 0; n < cc.length; n++) {
	            cs = cs.replace(new RegExp(cc[n], 'g'), '|' + cc[n]);
	        }

	        // create array
	        var arr = cs.split('|');
	        // init context point
	        var cpx = 0;
	        var cpy = 0;

	        var path = new PathProxy();
	        var CMD = PathProxy.CMD;

	        var prevCmd;
	        for (n = 1; n < arr.length; n++) {
	            var str = arr[n];
	            var c = str.charAt(0);
	            var off = 0;
	            var p = str.slice(1).replace(/e,-/g, 'e-').split(',');
	            var cmd;

	            if (p.length > 0 && p[0] === '') {
	                p.shift();
	            }

	            for (var i = 0; i < p.length; i++) {
	                p[i] = parseFloat(p[i]);
	            }
	            while (off < p.length && !isNaN(p[off])) {
	                if (isNaN(p[0])) {
	                    break;
	                }
	                var ctlPtx;
	                var ctlPty;

	                var rx;
	                var ry;
	                var psi;
	                var fa;
	                var fs;

	                var x1 = cpx;
	                var y1 = cpy;

	                // convert l, H, h, V, and v to L
	                switch (c) {
	                    case 'l':
	                        cpx += p[off++];
	                        cpy += p[off++];
	                        cmd = CMD.L;
	                        path.addData(cmd, cpx, cpy);
	                        break;
	                    case 'L':
	                        cpx = p[off++];
	                        cpy = p[off++];
	                        cmd = CMD.L;
	                        path.addData(cmd, cpx, cpy);
	                        break;
	                    case 'm':
	                        cpx += p[off++];
	                        cpy += p[off++];
	                        cmd = CMD.M;
	                        path.addData(cmd, cpx, cpy);
	                        c = 'l';
	                        break;
	                    case 'M':
	                        cpx = p[off++];
	                        cpy = p[off++];
	                        cmd = CMD.M;
	                        path.addData(cmd, cpx, cpy);
	                        c = 'L';
	                        break;
	                    case 'h':
	                        cpx += p[off++];
	                        cmd = CMD.L;
	                        path.addData(cmd, cpx, cpy);
	                        break;
	                    case 'H':
	                        cpx = p[off++];
	                        cmd = CMD.L;
	                        path.addData(cmd, cpx, cpy);
	                        break;
	                    case 'v':
	                        cpy += p[off++];
	                        cmd = CMD.L;
	                        path.addData(cmd, cpx, cpy);
	                        break;
	                    case 'V':
	                        cpy = p[off++];
	                        cmd = CMD.L;
	                        path.addData(cmd, cpx, cpy);
	                        break;
	                    case 'C':
	                        cmd = CMD.C;
	                        path.addData(
	                            cmd, p[off++], p[off++], p[off++], p[off++], p[off++], p[off++]
	                        );
	                        cpx = p[off - 2];
	                        cpy = p[off - 1];
	                        break;
	                    case 'c':
	                        cmd = CMD.C;
	                        path.addData(
	                            cmd,
	                            p[off++] + cpx, p[off++] + cpy,
	                            p[off++] + cpx, p[off++] + cpy,
	                            p[off++] + cpx, p[off++] + cpy
	                        );
	                        cpx += p[off - 2];
	                        cpy += p[off - 1];
	                        break;
	                    case 'S':
	                        ctlPtx = cpx;
	                        ctlPty = cpy;
	                        var len = path.len();
	                        var pathData = path.data;
	                        if (prevCmd === CMD.C) {
	                            ctlPtx += cpx - pathData[len - 4];
	                            ctlPty += cpy - pathData[len - 3];
	                        }
	                        cmd = CMD.C;
	                        x1 = p[off++];
	                        y1 = p[off++];
	                        cpx = p[off++];
	                        cpy = p[off++];
	                        path.addData(cmd, ctlPtx, ctlPty, x1, y1, cpx, cpy);
	                        break;
	                    case 's':
	                        ctlPtx = cpx;
	                        ctlPty = cpy;
	                        var len = path.len();
	                        var pathData = path.data;
	                        if (prevCmd === CMD.C) {
	                            ctlPtx += cpx - pathData[len - 4];
	                            ctlPty += cpy - pathData[len - 3];
	                        }
	                        cmd = CMD.C;
	                        x1 = cpx + p[off++];
	                        y1 = cpy + p[off++];
	                        cpx += p[off++];
	                        cpy += p[off++];
	                        path.addData(cmd, ctlPtx, ctlPty, x1, y1, cpx, cpy);
	                        break;
	                    case 'Q':
	                        x1 = p[off++];
	                        y1 = p[off++];
	                        cpx = p[off++];
	                        cpy = p[off++];
	                        cmd = CMD.Q;
	                        path.addData(cmd, x1, y1, cpx, cpy);
	                        break;
	                    case 'q':
	                        x1 = p[off++] + cpx;
	                        y1 = p[off++] + cpy;
	                        cpx += p[off++];
	                        cpy += p[off++];
	                        cmd = CMD.Q;
	                        path.addData(cmd, x1, y1, cpx, cpy);
	                        break;
	                    case 'T':
	                        ctlPtx = cpx;
	                        ctlPty = cpy;
	                        var len = path.len();
	                        var pathData = path.data;
	                        if (prevCmd === CMD.Q) {
	                            ctlPtx += cpx - pathData[len - 4];
	                            ctlPty += cpy - pathData[len - 3];
	                        }
	                        cpx = p[off++];
	                        cpy = p[off++];
	                        cmd = CMD.Q;
	                        path.addData(cmd, ctlPtx, ctlPty, cpx, cpy);
	                        break;
	                    case 't':
	                        ctlPtx = cpx;
	                        ctlPty = cpy;
	                        var len = path.len();
	                        var pathData = path.data;
	                        if (prevCmd === CMD.Q) {
	                            ctlPtx += cpx - pathData[len - 4];
	                            ctlPty += cpy - pathData[len - 3];
	                        }
	                        cpx += p[off++];
	                        cpy += p[off++];
	                        cmd = CMD.Q;
	                        path.addData(cmd, ctlPtx, ctlPty, cpx, cpy);
	                        break;
	                    case 'A':
	                        rx = p[off++];
	                        ry = p[off++];
	                        psi = p[off++];
	                        fa = p[off++];
	                        fs = p[off++];

	                        x1 = cpx, y1 = cpy;
	                        cpx = p[off++];
	                        cpy = p[off++];
	                        cmd = CMD.A;
	                        processArc(
	                            x1, y1, cpx, cpy, fa, fs, rx, ry, psi, cmd, path
	                        );
	                        break;
	                    case 'a':
	                        rx = p[off++];
	                        ry = p[off++];
	                        psi = p[off++];
	                        fa = p[off++];
	                        fs = p[off++];

	                        x1 = cpx, y1 = cpy;
	                        cpx += p[off++];
	                        cpy += p[off++];
	                        cmd = CMD.A;
	                        processArc(
	                            x1, y1, cpx, cpy, fa, fs, rx, ry, psi, cmd, path
	                        );
	                        break;
	                }
	            }

	            if (c === 'z' || c === 'Z') {
	                cmd = CMD.Z;
	                path.addData(cmd);
	            }

	            prevCmd = cmd;
	        }

	        path.toStatic();

	        return path;
	    }

	    // TODO Optimize double memory cost problem
	    function createPathOptions(str, opts) {
	        var pathProxy = createPathProxyFromString(str);
	        var transform;
	        opts = opts || {};
	        opts.buildPath = function (path) {
	            path.setData(pathProxy.data);
	            transform && transformPath(path, transform);
	            // Svg and vml renderer don't have context
	            var ctx = path.getContext();
	            if (ctx) {
	                path.rebuildPath(ctx);
	            }
	        };

	        opts.applyTransform = function (m) {
	            if (!transform) {
	                transform = matrix.create();
	            }
	            matrix.mul(transform, m, transform);
	        };

	        return opts;
	    }

	    module.exports = {
	        /**
	         * Create a Path object from path string data
	         * http://www.w3.org/TR/SVG/paths.html#PathData
	         * @param  {Object} opts Other options
	         */
	        createFromString: function (str, opts) {
	            return new Path(createPathOptions(str, opts));
	        },

	        /**
	         * Create a Path class from path string data
	         * @param  {string} str
	         * @param  {Object} opts Other options
	         */
	        extendFromString: function (str, opts) {
	            return Path.extend(createPathOptions(str, opts));
	        },

	        /**
	         * Merge multiple paths
	         */
	        // TODO Apply transform
	        // TODO stroke dash
	        // TODO Optimize double memory cost problem
	        mergePath: function (pathEls, opts) {
	            var pathList = [];
	            var len = pathEls.length;
	            var pathEl;
	            var i;
	            for (i = 0; i < len; i++) {
	                pathEl = pathEls[i];
	                if (pathEl.__dirty) {
	                    pathEl.buildPath(pathEl.path, pathEl.shape);
	                }
	                pathList.push(pathEl.path);
	            }

	            var pathBundle = new Path(opts);
	            pathBundle.buildPath = function (path) {
	                path.appendPath(pathList);
	                // Svg and vml renderer don't have context
	                var ctx = path.getContext();
	                if (ctx) {
	                    path.rebuildPath(ctx);
	                }
	            };

	            return pathBundle;
	        }
	    };


/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Path element
	 * @module zrender/graphic/Path
	 */



	    var Displayable = __webpack_require__(45);
	    var zrUtil = __webpack_require__(3);
	    var PathProxy = __webpack_require__(48);
	    var pathContain = __webpack_require__(51);

	    var Gradient = __webpack_require__(4);

	    function pathHasFill(style) {
	        var fill = style.fill;
	        return fill != null && fill !== 'none';
	    }

	    function pathHasStroke(style) {
	        var stroke = style.stroke;
	        return stroke != null && stroke !== 'none' && style.lineWidth > 0;
	    }

	    var abs = Math.abs;

	    /**
	     * @alias module:zrender/graphic/Path
	     * @extends module:zrender/graphic/Displayable
	     * @constructor
	     * @param {Object} opts
	     */
	    function Path(opts) {
	        Displayable.call(this, opts);

	        /**
	         * @type {module:zrender/core/PathProxy}
	         * @readOnly
	         */
	        this.path = new PathProxy();
	    }

	    Path.prototype = {

	        constructor: Path,

	        type: 'path',

	        __dirtyPath: true,

	        strokeContainThreshold: 5,

	        brush: function (ctx) {
	            ctx.save();

	            var style = this.style;
	            var path = this.path;
	            var hasStroke = pathHasStroke(style);
	            var hasFill = pathHasFill(style);
	            var hasFillGradient = hasFill && !!(style.fill.colorStops);
	            var hasStrokeGradient = hasStroke && !!(style.stroke.colorStops);

	            style.bind(ctx, this);
	            this.setTransform(ctx);

	            if (this.__dirtyPath) {
	                var rect = this.getBoundingRect();
	                // Update gradient because bounding rect may changed
	                if (hasFillGradient) {
	                    this._fillGradient = style.getGradient(ctx, style.fill, rect);
	                }
	                if (hasStrokeGradient) {
	                    this._strokeGradient = style.getGradient(ctx, style.stroke, rect);
	                }
	            }
	            // Use the gradient
	            if (hasFillGradient) {
	                ctx.fillStyle = this._fillGradient;
	            }
	            if (hasStrokeGradient) {
	                ctx.strokeStyle = this._strokeGradient;
	            }

	            var lineDash = style.lineDash;
	            var lineDashOffset = style.lineDashOffset;

	            var ctxLineDash = !!ctx.setLineDash;

	            // Update path sx, sy
	            var scale = this.getGlobalScale();
	            path.setScale(scale[0], scale[1]);

	            // Proxy context
	            // Rebuild path in following 2 cases
	            // 1. Path is dirty
	            // 2. Path needs javascript implemented lineDash stroking.
	            //    In this case, lineDash information will not be saved in PathProxy
	            if (this.__dirtyPath || (
	                lineDash && !ctxLineDash && hasStroke
	            )) {
	                path = this.path.beginPath(ctx);

	                // Setting line dash before build path
	                if (lineDash && !ctxLineDash) {
	                    path.setLineDash(lineDash);
	                    path.setLineDashOffset(lineDashOffset);
	                }

	                this.buildPath(path, this.shape);

	                // Clear path dirty flag
	                this.__dirtyPath = false;
	            }
	            else {
	                // Replay path building
	                ctx.beginPath();
	                this.path.rebuildPath(ctx);
	            }

	            hasFill && path.fill(ctx);

	            if (lineDash && ctxLineDash) {
	                ctx.setLineDash(lineDash);
	                ctx.lineDashOffset = lineDashOffset;
	            }

	            hasStroke && path.stroke(ctx);

	            // Draw rect text
	            if (style.text != null) {
	                // var rect = this.getBoundingRect();
	                this.drawRectText(ctx, this.getBoundingRect());
	            }

	            ctx.restore();
	        },

	        buildPath: function (ctx, shapeCfg) {},

	        getBoundingRect: function () {
	            var rect = this._rect;
	            var style = this.style;
	            var needsUpdateRect = !rect;
	            if (needsUpdateRect) {
	                var path = this.path;
	                if (this.__dirtyPath) {
	                    path.beginPath();
	                    this.buildPath(path, this.shape);
	                }
	                rect = path.getBoundingRect();
	            }
	            this._rect = rect;

	            if (pathHasStroke(style)) {
	                // Needs update rect with stroke lineWidth when
	                // 1. Element changes scale or lineWidth
	                // 2. Shape is changed
	                var rectWithStroke = this._rectWithStroke || (this._rectWithStroke = rect.clone());
	                if (this.__dirty || needsUpdateRect) {
	                    rectWithStroke.copy(rect);
	                    // FIXME Must after updateTransform
	                    var w = style.lineWidth;
	                    // PENDING, Min line width is needed when line is horizontal or vertical
	                    var lineScale = style.strokeNoScale ? this.getLineScale() : 1;

	                    // Only add extra hover lineWidth when there are no fill
	                    if (!pathHasFill(style)) {
	                        w = Math.max(w, this.strokeContainThreshold);
	                    }
	                    // Consider line width
	                    // Line scale can't be 0;
	                    if (lineScale > 1e-10) {
	                        rectWithStroke.width += w / lineScale;
	                        rectWithStroke.height += w / lineScale;
	                        rectWithStroke.x -= w / lineScale / 2;
	                        rectWithStroke.y -= w / lineScale / 2;
	                    }
	                }

	                // Return rect with stroke
	                return rectWithStroke;
	            }

	            return rect;
	        },

	        contain: function (x, y) {
	            var localPos = this.transformCoordToLocal(x, y);
	            var rect = this.getBoundingRect();
	            var style = this.style;
	            x = localPos[0];
	            y = localPos[1];

	            if (rect.contain(x, y)) {
	                var pathData = this.path.data;
	                if (pathHasStroke(style)) {
	                    var lineWidth = style.lineWidth;
	                    var lineScale = style.strokeNoScale ? this.getLineScale() : 1;
	                    // Line scale can't be 0;
	                    if (lineScale > 1e-10) {
	                        // Only add extra hover lineWidth when there are no fill
	                        if (!pathHasFill(style)) {
	                            lineWidth = Math.max(lineWidth, this.strokeContainThreshold);
	                        }
	                        if (pathContain.containStroke(
	                            pathData, lineWidth / lineScale, x, y
	                        )) {
	                            return true;
	                        }
	                    }
	                }
	                if (pathHasFill(style)) {
	                    return pathContain.contain(pathData, x, y);
	                }
	            }
	            return false;
	        },

	        /**
	         * @param  {boolean} dirtyPath
	         */
	        dirty: function (dirtyPath) {
	            if (arguments.length ===0) {
	                dirtyPath = true;
	            }
	            // Only mark dirty, not mark clean
	            if (dirtyPath) {
	                this.__dirtyPath = dirtyPath;
	                this._rect = null;
	            }

	            this.__dirty = true;

	            this.__zr && this.__zr.refresh();

	            // Used as a clipping path
	            if (this.__clipTarget) {
	                this.__clipTarget.dirty();
	            }
	        },

	        /**
	         * Alias for animate('shape')
	         * @param {boolean} loop
	         */
	        animateShape: function (loop) {
	            return this.animate('shape', loop);
	        },

	        // Overwrite attrKV
	        attrKV: function (key, value) {
	            // FIXME
	            if (key === 'shape') {
	                this.setShape(value);
	            }
	            else {
	                Displayable.prototype.attrKV.call(this, key, value);
	            }
	        },

	        /**
	         * @param {Object|string} key
	         * @param {*} value
	         */
	        setShape: function (key, value) {
	            var shape = this.shape;
	            // Path from string may not have shape
	            if (shape) {
	                if (zrUtil.isObject(key)) {
	                    for (var name in key) {
	                        shape[name] = key[name];
	                    }
	                }
	                else {
	                    shape[key] = value;
	                }
	                this.dirty(true);
	            }
	            return this;
	        },

	        getLineScale: function () {
	            var m = this.transform;
	            // Get the line scale.
	            // Determinant of `m` means how much the area is enlarged by the
	            // transformation. So its square root can be used as a scale factor
	            // for width.
	            return m && abs(m[0] - 1) > 1e-10 && abs(m[3] - 1) > 1e-10
	                ? Math.sqrt(abs(m[0] * m[3] - m[2] * m[1]))
	                : 1;
	        }
	    };

	    /**
	     * 扩展一个 Path element, 比如星形，圆等。
	     * Extend a path element
	     * @param {Object} props
	     * @param {string} props.type Path type
	     * @param {Function} props.init Initialize
	     * @param {Function} props.buildPath Overwrite buildPath method
	     * @param {Object} [props.style] Extended default style config
	     * @param {Object} [props.shape] Extended default shape config
	     */
	    Path.extend = function (defaults) {
	        var Sub = function (opts) {
	            Path.call(this, opts);

	            if (defaults.style) {
	                // Extend default style
	                this.style.extendFrom(defaults.style, false);
	            }

	            // Extend default shape
	            var defaultShape = defaults.shape;
	            if (defaultShape) {
	                this.shape = this.shape || {};
	                var thisShape = this.shape;
	                for (var name in defaultShape) {
	                    if (
	                        ! thisShape.hasOwnProperty(name)
	                        && defaultShape.hasOwnProperty(name)
	                    ) {
	                        thisShape[name] = defaultShape[name];
	                    }
	                }
	            }

	            defaults.init && defaults.init.call(this, opts);
	        };

	        zrUtil.inherits(Sub, Path);

	        // FIXME 不能 extend position, rotation 等引用对象
	        for (var name in defaults) {
	            // Extending prototype values and methods
	            if (name !== 'style' && name !== 'shape') {
	                Sub.prototype[name] = defaults[name];
	            }
	        }

	        return Sub;
	    };

	    zrUtil.inherits(Path, Displayable);

	    module.exports = Path;


/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 可绘制的图形基类
	 * Base class of all displayable graphic objects
	 * @module zrender/graphic/Displayable
	 */



	    var zrUtil = __webpack_require__(3);

	    var Style = __webpack_require__(46);

	    var Element = __webpack_require__(30);
	    var RectText = __webpack_require__(47);
	    // var Stateful = require('./mixin/Stateful');

	    /**
	     * @alias module:zrender/graphic/Displayable
	     * @extends module:zrender/Element
	     * @extends module:zrender/graphic/mixin/RectText
	     */
	    function Displayable(opts) {

	        opts = opts || {};

	        Element.call(this, opts);

	        // Extend properties
	        for (var name in opts) {
	            if (
	                opts.hasOwnProperty(name) &&
	                name !== 'style'
	            ) {
	                this[name] = opts[name];
	            }
	        }

	        /**
	         * @type {module:zrender/graphic/Style}
	         */
	        this.style = new Style(opts.style);

	        this._rect = null;
	        // Shapes for cascade clipping.
	        this.__clipPaths = [];

	        // FIXME Stateful must be mixined after style is setted
	        // Stateful.call(this, opts);
	    }

	    Displayable.prototype = {

	        constructor: Displayable,

	        type: 'displayable',

	        /**
	         * Displayable 是否为脏，Painter 中会根据该标记判断是否需要是否需要重新绘制
	         * Dirty flag. From which painter will determine if this displayable object needs brush
	         * @name module:zrender/graphic/Displayable#__dirty
	         * @type {boolean}
	         */
	        __dirty: true,

	        /**
	         * 图形是否可见，为true时不绘制图形，但是仍能触发鼠标事件
	         * If ignore drawing of the displayable object. Mouse event will still be triggered
	         * @name module:/zrender/graphic/Displayable#invisible
	         * @type {boolean}
	         * @default false
	         */
	        invisible: false,

	        /**
	         * @name module:/zrender/graphic/Displayable#z
	         * @type {number}
	         * @default 0
	         */
	        z: 0,

	        /**
	         * @name module:/zrender/graphic/Displayable#z
	         * @type {number}
	         * @default 0
	         */
	        z2: 0,

	        /**
	         * z层level，决定绘画在哪层canvas中
	         * @name module:/zrender/graphic/Displayable#zlevel
	         * @type {number}
	         * @default 0
	         */
	        zlevel: 0,

	        /**
	         * 是否可拖拽
	         * @name module:/zrender/graphic/Displayable#draggable
	         * @type {boolean}
	         * @default false
	         */
	        draggable: false,

	        /**
	         * 是否正在拖拽
	         * @name module:/zrender/graphic/Displayable#draggable
	         * @type {boolean}
	         * @default false
	         */
	        dragging: false,

	        /**
	         * 是否相应鼠标事件
	         * @name module:/zrender/graphic/Displayable#silent
	         * @type {boolean}
	         * @default false
	         */
	        silent: false,

	        /**
	         * If enable culling
	         * @type {boolean}
	         * @default false
	         */
	        culling: false,

	        /**
	         * Mouse cursor when hovered
	         * @name module:/zrender/graphic/Displayable#cursor
	         * @type {string}
	         */
	        cursor: 'pointer',

	        /**
	         * If hover area is bounding rect
	         * @name module:/zrender/graphic/Displayable#rectHover
	         * @type {string}
	         */
	        rectHover: false,

	        beforeBrush: function (ctx) {},

	        afterBrush: function (ctx) {},

	        /**
	         * 图形绘制方法
	         * @param {Canvas2DRenderingContext} ctx
	         */
	        // Interface
	        brush: function (ctx) {},

	        /**
	         * 获取最小包围盒
	         * @return {module:zrender/core/BoundingRect}
	         */
	        // Interface
	        getBoundingRect: function () {},

	        /**
	         * 判断坐标 x, y 是否在图形上
	         * If displayable element contain coord x, y
	         * @param  {number} x
	         * @param  {number} y
	         * @return {boolean}
	         */
	        contain: function (x, y) {
	            return this.rectContain(x, y);
	        },

	        /**
	         * @param  {Function} cb
	         * @param  {}   context
	         */
	        traverse: function (cb, context) {
	            cb.call(context, this);
	        },

	        /**
	         * 判断坐标 x, y 是否在图形的包围盒上
	         * If bounding rect of element contain coord x, y
	         * @param  {number} x
	         * @param  {number} y
	         * @return {boolean}
	         */
	        rectContain: function (x, y) {
	            var coord = this.transformCoordToLocal(x, y);
	            var rect = this.getBoundingRect();
	            return rect.contain(coord[0], coord[1]);
	        },

	        /**
	         * 标记图形元素为脏，并且在下一帧重绘
	         * Mark displayable element dirty and refresh next frame
	         */
	        dirty: function () {
	            this.__dirty = true;

	            this._rect = null;

	            this.__zr && this.__zr.refresh();
	        },

	        /**
	         * 图形是否会触发事件
	         * If displayable object binded any event
	         * @return {boolean}
	         */
	        // TODO, 通过 bind 绑定的事件
	        // isSilent: function () {
	        //     return !(
	        //         this.hoverable || this.draggable
	        //         || this.onmousemove || this.onmouseover || this.onmouseout
	        //         || this.onmousedown || this.onmouseup || this.onclick
	        //         || this.ondragenter || this.ondragover || this.ondragleave
	        //         || this.ondrop
	        //     );
	        // },
	        /**
	         * Alias for animate('style')
	         * @param {boolean} loop
	         */
	        animateStyle: function (loop) {
	            return this.animate('style', loop);
	        },

	        attrKV: function (key, value) {
	            if (key !== 'style') {
	                Element.prototype.attrKV.call(this, key, value);
	            }
	            else {
	                this.style.set(value);
	            }
	        },

	        /**
	         * @param {Object|string} key
	         * @param {*} value
	         */
	        setStyle: function (key, value) {
	            this.style.set(key, value);
	            this.dirty(false);
	            return this;
	        },

	        /**
	         * Use given style object
	         * @param  {Object} obj
	         */
	        useStyle: function (obj) {
	            this.style = new Style(obj);
	            this.dirty(false);
	            return this;
	        }
	    };

	    zrUtil.inherits(Displayable, Element);

	    zrUtil.mixin(Displayable, RectText);
	    // zrUtil.mixin(Displayable, Stateful);

	    module.exports = Displayable;


/***/ },
/* 46 */
/***/ function(module, exports) {

	/**
	 * @module zrender/graphic/Style
	 */



	    var STYLE_LIST_COMMON = [
	        'lineCap', 'lineJoin', 'miterLimit',
	        'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'shadowColor'
	    ];

	    var Style = function (opts) {
	        this.extendFrom(opts);
	    };

	    Style.prototype = {

	        constructor: Style,

	        /**
	         * @type {string}
	         */
	        fill: '#000000',

	        /**
	         * @type {string}
	         */
	        stroke: null,

	        /**
	         * @type {number}
	         */
	        opacity: 1,

	        /**
	         * @type {Array.<number>}
	         */
	        lineDash: null,

	        /**
	         * @type {number}
	         */
	        lineDashOffset: 0,

	        /**
	         * @type {number}
	         */
	        shadowBlur: 0,

	        /**
	         * @type {number}
	         */
	        shadowOffsetX: 0,

	        /**
	         * @type {number}
	         */
	        shadowOffsetY: 0,

	        /**
	         * @type {number}
	         */
	        lineWidth: 1,

	        /**
	         * If stroke ignore scale
	         * @type {Boolean}
	         */
	        strokeNoScale: false,

	        // Bounding rect text configuration
	        // Not affected by element transform
	        /**
	         * @type {string}
	         */
	        text: null,

	        /**
	         * @type {string}
	         */
	        textFill: '#000',

	        /**
	         * @type {string}
	         */
	        textStroke: null,

	        /**
	         * 'inside', 'left', 'right', 'top', 'bottom'
	         * [x, y]
	         * @type {string|Array.<number>}
	         * @default 'inside'
	         */
	        textPosition: 'inside',

	        /**
	         * @type {string}
	         */
	        textBaseline: null,

	        /**
	         * @type {string}
	         */
	        textAlign: null,

	        /**
	         * @type {string}
	         */
	        textVerticalAlign: null,

	        /**
	         * @type {number}
	         */
	        textDistance: 5,

	        /**
	         * @type {number}
	         */
	        textShadowBlur: 0,

	        /**
	         * @type {number}
	         */
	        textShadowOffsetX: 0,

	        /**
	         * @type {number}
	         */
	        textShadowOffsetY: 0,

	        /**
	         * @param {CanvasRenderingContext2D} ctx
	         */
	        bind: function (ctx, el) {
	            var fill = this.fill;
	            var stroke = this.stroke;
	            for (var i = 0; i < STYLE_LIST_COMMON.length; i++) {
	                var styleName = STYLE_LIST_COMMON[i];

	                if (this[styleName] != null) {
	                    ctx[styleName] = this[styleName];
	                }
	            }
	            if (stroke != null) {
	                var lineWidth = this.lineWidth;
	                ctx.lineWidth = lineWidth / (
	                    (this.strokeNoScale && el && el.getLineScale) ? el.getLineScale() : 1
	                );
	            }
	            // Gradient will be created and set in Path#brush. So ignore it here
	            if (fill != null && fill !== 'none' && !fill.colorStops) {
	                ctx.fillStyle = fill;
	            }
	            if (stroke != null && stroke !== 'none' && !stroke.colorStops) {
	                 // Use canvas gradient if has
	                ctx.strokeStyle = stroke;
	            }
	            this.opacity != null && (ctx.globalAlpha = this.opacity);
	        },

	        /**
	         * Extend from other style
	         * @param {zrender/graphic/Style} otherStyle
	         * @param {boolean} overwrite
	         */
	        extendFrom: function (otherStyle, overwrite) {
	            if (otherStyle) {
	                var target = this;
	                for (var name in otherStyle) {
	                    if (otherStyle.hasOwnProperty(name)
	                        && (overwrite || ! target.hasOwnProperty(name))
	                    ) {
	                        target[name] = otherStyle[name];
	                    }
	                }
	            }
	        },

	        /**
	         * Batch setting style with a given object
	         * @param {Object|string} obj
	         * @param {*} [obj]
	         */
	        set: function (obj, value) {
	            if (typeof obj === 'string') {
	                this[obj] = value;
	            }
	            else {
	                this.extendFrom(obj, true);
	            }
	        },

	        /**
	         * Clone
	         * @return {zrender/graphic/Style} [description]
	         */
	        clone: function () {
	            var newStyle = new this.constructor();
	            newStyle.extendFrom(this, true);
	            return newStyle;
	        },

	        createLinearGradient: function (ctx, obj, rect) {
	            // var size =
	            var x = obj.x * rect.width + rect.x;
	            var x2 = obj.x2 * rect.width + rect.x;
	            var y = obj.y * rect.height + rect.y;
	            var y2 = obj.y2 * rect.height + rect.y;

	            var canvasGradient = ctx.createLinearGradient(x, y, x2, y2);

	            return canvasGradient;
	        },

	        createRadialGradient: function (ctx, obj, rect) {
	            var width = rect.width;
	            var height = rect.height;
	            var min = Math.min(width, height);

	            var x = obj.x * width + rect.x;
	            var y = obj.y * height + rect.y;
	            var r = obj.r * min;

	            var canvasGradient = ctx.createRadialGradient(x, y, 0, x, y, r);

	            return canvasGradient;
	        },

	        getGradient: function (ctx, obj, rect) {
	            var method = obj.type === 'radial' ? 'createRadialGradient' : 'createLinearGradient';
	            var canvasGradient = this[method](ctx, obj, rect);
	            var colorStops = obj.colorStops;
	            for (var i = 0; i < colorStops.length; i++) {
	                canvasGradient.addColorStop(
	                    colorStops[i].offset, colorStops[i].color
	                );
	            }
	            return canvasGradient;
	        }
	    };

	    var styleProto = Style.prototype;
	    var name;
	    var i;
	    for (i = 0; i < STYLE_LIST_COMMON.length; i++) {
	        name = STYLE_LIST_COMMON[i];
	        if (!(name in styleProto)) {
	            styleProto[name] = null;
	        }
	    }

	    module.exports = Style;


/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Mixin for drawing text in a element bounding rect
	 * @module zrender/mixin/RectText
	 */



	    var textContain = __webpack_require__(14);
	    var BoundingRect = __webpack_require__(15);

	    var tmpRect = new BoundingRect();

	    var RectText = function () {};

	    function parsePercent(value, maxValue) {
	        if (typeof value === 'string') {
	            if (value.lastIndexOf('%') >= 0) {
	                return parseFloat(value) / 100 * maxValue;
	            }
	            return parseFloat(value);
	        }
	        return value;
	    }

	    function setTransform(ctx, m) {
	        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
	    }

	    RectText.prototype = {

	        constructor: RectText,

	        /**
	         * Draw text in a rect with specified position.
	         * @param  {CanvasRenderingContext} ctx
	         * @param  {Object} rect Displayable rect
	         * @return {Object} textRect Alternative precalculated text bounding rect
	         */
	        drawRectText: function (ctx, rect, textRect) {
	            var style = this.style;
	            var text = style.text;
	            // Convert to string
	            text != null && (text += '');
	            if (!text) {
	                return;
	            }
	            var x;
	            var y;
	            var textPosition = style.textPosition;
	            var distance = style.textDistance;
	            var align = style.textAlign;
	            var font = style.textFont || style.font;
	            var baseline = style.textBaseline;
	            var verticalAlign = style.textVerticalAlign;

	            textRect = textRect || textContain.getBoundingRect(text, font, align, baseline);

	            // Transform rect to view space
	            var transform = this.transform;
	            var invTransform = this.invTransform;
	            if (transform) {
	                tmpRect.copy(rect);
	                tmpRect.applyTransform(transform);
	                rect = tmpRect;
	                // Transform back
	                setTransform(ctx, invTransform);
	            }

	            // Text position represented by coord
	            if (textPosition instanceof Array) {
	                // Percent
	                x = rect.x + parsePercent(textPosition[0], rect.width);
	                y = rect.y + parsePercent(textPosition[1], rect.height);
	                align = align || 'left';
	                baseline = baseline || 'top';

	                if (verticalAlign) {
	                    switch (verticalAlign) {
	                        case 'middle':
	                            y -= textRect.height / 2 - textRect.lineHeight / 2;
	                            break;
	                        case 'bottom':
	                            y -= textRect.height - textRect.lineHeight / 2;
	                            break;
	                        default:
	                            y += textRect.lineHeight / 2;
	                    }
	                    // Force bseline to be middle
	                    baseline = 'middle';
	                }
	            }
	            else {
	                var res = textContain.adjustTextPositionOnRect(
	                    textPosition, rect, textRect, distance
	                );
	                x = res.x;
	                y = res.y;
	                // Default align and baseline when has textPosition
	                align = align || res.textAlign;
	                baseline = baseline || res.textBaseline;
	            }

	            ctx.textAlign = align;
	            ctx.textBaseline = baseline;

	            var textFill = style.textFill;
	            var textStroke = style.textStroke;
	            textFill && (ctx.fillStyle = textFill);
	            textStroke && (ctx.strokeStyle = textStroke);
	            ctx.font = font;

	            // Text shadow
	            ctx.shadowColor = style.textShadowColor;
	            ctx.shadowBlur = style.textShadowBlur;
	            ctx.shadowOffsetX = style.textShadowOffsetX;
	            ctx.shadowOffsetY = style.textShadowOffsetY;

	            var textLines = text.split('\n');
	            for (var i = 0; i < textLines.length; i++) {
	                textFill && ctx.fillText(textLines[i], x, y);
	                textStroke && ctx.strokeText(textLines[i], x, y);
	                y += textRect.lineHeight;
	            }

	            // Transform again
	            transform && setTransform(ctx, transform);
	        }
	    };

	    module.exports = RectText;


/***/ },
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * Path 代理，可以在`buildPath`中用于替代`ctx`, 会保存每个path操作的命令到pathCommands属性中
	 * 可以用于 isInsidePath 判断以及获取boundingRect
	 *
	 * @module zrender/core/PathProxy
	 * @author Yi Shen (http://www.github.com/pissang)
	 */

	 // TODO getTotalLength, getPointAtLength


	    var curve = __webpack_require__(49);
	    var vec2 = __webpack_require__(16);
	    var bbox = __webpack_require__(50);
	    var BoundingRect = __webpack_require__(15);
	    var dpr = __webpack_require__(40).devicePixelRatio;

	    var CMD = {
	        M: 1,
	        L: 2,
	        C: 3,
	        Q: 4,
	        A: 5,
	        Z: 6,
	        // Rect
	        R: 7
	    };

	    var min = [];
	    var max = [];
	    var min2 = [];
	    var max2 = [];
	    var mathMin = Math.min;
	    var mathMax = Math.max;
	    var mathCos = Math.cos;
	    var mathSin = Math.sin;
	    var mathSqrt = Math.sqrt;
	    var mathAbs = Math.abs;

	    var hasTypedArray = typeof Float32Array != 'undefined';

	    /**
	     * @alias module:zrender/core/PathProxy
	     * @constructor
	     */
	    var PathProxy = function () {

	        /**
	         * Path data. Stored as flat array
	         * @type {Array.<Object>}
	         */
	        this.data = [];

	        this._len = 0;

	        this._ctx = null;

	        this._xi = 0;
	        this._yi = 0;

	        this._x0 = 0;
	        this._y0 = 0;

	        // Unit x, Unit y. Provide for avoiding drawing that too short line segment
	        this._ux = 0;
	        this._uy = 0;
	    };

	    /**
	     * 快速计算Path包围盒（并不是最小包围盒）
	     * @return {Object}
	     */
	    PathProxy.prototype = {

	        constructor: PathProxy,

	        _lineDash: null,

	        _dashOffset: 0,

	        _dashIdx: 0,

	        _dashSum: 0,

	        /**
	         * @readOnly
	         */
	        setScale: function (sx, sy) {
	            this._ux = mathAbs(1 / dpr / sx) || 0;
	            this._uy = mathAbs(1 / dpr / sy) || 0;
	        },

	        getContext: function () {
	            return this._ctx;
	        },

	        /**
	         * @param  {CanvasRenderingContext2D} ctx
	         * @return {module:zrender/core/PathProxy}
	         */
	        beginPath: function (ctx) {
	            this._ctx = ctx;

	            ctx && ctx.beginPath();

	            // Reset
	            this._len = 0;

	            if (this._lineDash) {
	                this._lineDash = null;

	                this._dashOffset = 0;
	            }

	            return this;
	        },

	        /**
	         * @param  {number} x
	         * @param  {number} y
	         * @return {module:zrender/core/PathProxy}
	         */
	        moveTo: function (x, y) {
	            this.addData(CMD.M, x, y);
	            this._ctx && this._ctx.moveTo(x, y);

	            // x0, y0, xi, yi 是记录在 _dashedXXXXTo 方法中使用
	            // xi, yi 记录当前点, x0, y0 在 closePath 的时候回到起始点。
	            // 有可能在 beginPath 之后直接调用 lineTo，这时候 x0, y0 需要
	            // 在 lineTo 方法中记录，这里先不考虑这种情况，dashed line 也只在 IE10- 中不支持
	            this._x0 = x;
	            this._y0 = y;

	            this._xi = x;
	            this._yi = y;

	            return this;
	        },

	        /**
	         * @param  {number} x
	         * @param  {number} y
	         * @return {module:zrender/core/PathProxy}
	         */
	        lineTo: function (x, y) {
	            var exceedUnit = mathAbs(x - this._xi) > this._ux
	                || mathAbs(y - this._yi) > this._uy
	                // Force draw the first segment
	                || this._len === 0;

	            this.addData(CMD.L, x, y);

	            if (this._ctx && exceedUnit) {
	                this._needsDash() ? this._dashedLineTo(x, y)
	                    : this._ctx.lineTo(x, y);
	            }
	            if (exceedUnit) {
	                this._xi = x;
	                this._yi = y;
	            }

	            return this;
	        },

	        /**
	         * @param  {number} x1
	         * @param  {number} y1
	         * @param  {number} x2
	         * @param  {number} y2
	         * @param  {number} x3
	         * @param  {number} y3
	         * @return {module:zrender/core/PathProxy}
	         */
	        bezierCurveTo: function (x1, y1, x2, y2, x3, y3) {
	            this.addData(CMD.C, x1, y1, x2, y2, x3, y3);
	            if (this._ctx) {
	                this._needsDash() ? this._dashedBezierTo(x1, y1, x2, y2, x3, y3)
	                    : this._ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
	            }
	            this._xi = x3;
	            this._yi = y3;
	            return this;
	        },

	        /**
	         * @param  {number} x1
	         * @param  {number} y1
	         * @param  {number} x2
	         * @param  {number} y2
	         * @return {module:zrender/core/PathProxy}
	         */
	        quadraticCurveTo: function (x1, y1, x2, y2) {
	            this.addData(CMD.Q, x1, y1, x2, y2);
	            if (this._ctx) {
	                this._needsDash() ? this._dashedQuadraticTo(x1, y1, x2, y2)
	                    : this._ctx.quadraticCurveTo(x1, y1, x2, y2);
	            }
	            this._xi = x2;
	            this._yi = y2;
	            return this;
	        },

	        /**
	         * @param  {number} cx
	         * @param  {number} cy
	         * @param  {number} r
	         * @param  {number} startAngle
	         * @param  {number} endAngle
	         * @param  {boolean} anticlockwise
	         * @return {module:zrender/core/PathProxy}
	         */
	        arc: function (cx, cy, r, startAngle, endAngle, anticlockwise) {
	            this.addData(
	                CMD.A, cx, cy, r, r, startAngle, endAngle - startAngle, 0, anticlockwise ? 0 : 1
	            );
	            this._ctx && this._ctx.arc(cx, cy, r, startAngle, endAngle, anticlockwise);

	            this._xi = mathCos(endAngle) * r + cx;
	            this._xi = mathSin(endAngle) * r + cx;
	            return this;
	        },

	        // TODO
	        arcTo: function (x1, y1, x2, y2, radius) {
	            if (this._ctx) {
	                this._ctx.arcTo(x1, y1, x2, y2, radius);
	            }
	            return this;
	        },

	        // TODO
	        rect: function (x, y, w, h) {
	            this._ctx && this._ctx.rect(x, y, w, h);
	            this.addData(CMD.R, x, y, w, h);
	            return this;
	        },

	        /**
	         * @return {module:zrender/core/PathProxy}
	         */
	        closePath: function () {
	            this.addData(CMD.Z);

	            var ctx = this._ctx;
	            var x0 = this._x0;
	            var y0 = this._y0;
	            if (ctx) {
	                this._needsDash() && this._dashedLineTo(x0, y0);
	                ctx.closePath();
	            }

	            this._xi = x0;
	            this._yi = y0;
	            return this;
	        },

	        /**
	         * Context 从外部传入，因为有可能是 rebuildPath 完之后再 fill。
	         * stroke 同样
	         * @param {CanvasRenderingContext2D} ctx
	         * @return {module:zrender/core/PathProxy}
	         */
	        fill: function (ctx) {
	            ctx && ctx.fill();
	            this.toStatic();
	        },

	        /**
	         * @param {CanvasRenderingContext2D} ctx
	         * @return {module:zrender/core/PathProxy}
	         */
	        stroke: function (ctx) {
	            ctx && ctx.stroke();
	            this.toStatic();
	        },

	        /**
	         * 必须在其它绘制命令前调用
	         * Must be invoked before all other path drawing methods
	         * @return {module:zrender/core/PathProxy}
	         */
	        setLineDash: function (lineDash) {
	            if (lineDash instanceof Array) {
	                this._lineDash = lineDash;

	                this._dashIdx = 0;

	                var lineDashSum = 0;
	                for (var i = 0; i < lineDash.length; i++) {
	                    lineDashSum += lineDash[i];
	                }
	                this._dashSum = lineDashSum;
	            }
	            return this;
	        },

	        /**
	         * 必须在其它绘制命令前调用
	         * Must be invoked before all other path drawing methods
	         * @return {module:zrender/core/PathProxy}
	         */
	        setLineDashOffset: function (offset) {
	            this._dashOffset = offset;
	            return this;
	        },

	        /**
	         *
	         * @return {boolean}
	         */
	        len: function () {
	            return this._len;
	        },

	        /**
	         * 直接设置 Path 数据
	         */
	        setData: function (data) {

	            var len = data.length;

	            if (! (this.data && this.data.length == len) && hasTypedArray) {
	                this.data = new Float32Array(len);
	            }

	            for (var i = 0; i < len; i++) {
	                this.data[i] = data[i];
	            }

	            this._len = len;
	        },

	        /**
	         * 添加子路径
	         * @param {module:zrender/core/PathProxy|Array.<module:zrender/core/PathProxy>} path
	         */
	        appendPath: function (path) {
	            if (!(path instanceof Array)) {
	                path = [path];
	            }
	            var len = path.length;
	            var appendSize = 0;
	            var offset = this._len;
	            for (var i = 0; i < len; i++) {
	                appendSize += path[i].len();
	            }
	            if (hasTypedArray && (this.data instanceof Float32Array)) {
	                this.data = new Float32Array(offset + appendSize);
	            }
	            for (var i = 0; i < len; i++) {
	                var appendPathData = path[i].data;
	                for (var k = 0; k < appendPathData.length; k++) {
	                    this.data[offset++] = appendPathData[k];
	                }
	            }
	            this._len = offset;
	        },

	        /**
	         * 填充 Path 数据。
	         * 尽量复用而不申明新的数组。大部分图形重绘的指令数据长度都是不变的。
	         */
	        addData: function (cmd) {
	            var data = this.data;
	            if (this._len + arguments.length > data.length) {
	                // 因为之前的数组已经转换成静态的 Float32Array
	                // 所以不够用时需要扩展一个新的动态数组
	                this._expandData();
	                data = this.data;
	            }
	            for (var i = 0; i < arguments.length; i++) {
	                data[this._len++] = arguments[i];
	            }

	            this._prevCmd = cmd;
	        },

	        _expandData: function () {
	            // Only if data is Float32Array
	            if (!(this.data instanceof Array)) {
	                var newData = [];
	                for (var i = 0; i < this._len; i++) {
	                    newData[i] = this.data[i];
	                }
	                this.data = newData;
	            }
	        },

	        /**
	         * If needs js implemented dashed line
	         * @return {boolean}
	         * @private
	         */
	        _needsDash: function () {
	            return this._lineDash;
	        },

	        _dashedLineTo: function (x1, y1) {
	            var dashSum = this._dashSum;
	            var offset = this._dashOffset;
	            var lineDash = this._lineDash;
	            var ctx = this._ctx;

	            var x0 = this._xi;
	            var y0 = this._yi;
	            var dx = x1 - x0;
	            var dy = y1 - y0;
	            var dist = mathSqrt(dx * dx + dy * dy);
	            var x = x0;
	            var y = y0;
	            var dash;
	            var nDash = lineDash.length;
	            var idx;
	            dx /= dist;
	            dy /= dist;

	            if (offset < 0) {
	                // Convert to positive offset
	                offset = dashSum + offset;
	            }
	            offset %= dashSum;
	            x -= offset * dx;
	            y -= offset * dy;

	            while ((dx >= 0 && x <= x1) || (dx < 0 && x > x1)) {
	                idx = this._dashIdx;
	                dash = lineDash[idx];
	                x += dx * dash;
	                y += dy * dash;
	                this._dashIdx = (idx + 1) % nDash;
	                // Skip positive offset
	                if ((dx > 0 && x < x0) || (dx < 0 && x > x0)) {
	                    continue;
	                }
	                ctx[idx % 2 ? 'moveTo' : 'lineTo'](
	                    dx >= 0 ? mathMin(x, x1) : mathMax(x, x1),
	                    dy >= 0 ? mathMin(y, y1) : mathMax(y, y1)
	                );
	            }
	            // Offset for next lineTo
	            dx = x - x1;
	            dy = y - y1;
	            this._dashOffset = -mathSqrt(dx * dx + dy * dy);
	        },

	        // Not accurate dashed line to
	        _dashedBezierTo: function (x1, y1, x2, y2, x3, y3) {
	            var dashSum = this._dashSum;
	            var offset = this._dashOffset;
	            var lineDash = this._lineDash;
	            var ctx = this._ctx;

	            var x0 = this._xi;
	            var y0 = this._yi;
	            var t;
	            var dx;
	            var dy;
	            var cubicAt = curve.cubicAt;
	            var bezierLen = 0;
	            var idx = this._dashIdx;
	            var nDash = lineDash.length;

	            var x;
	            var y;

	            var tmpLen = 0;

	            if (offset < 0) {
	                // Convert to positive offset
	                offset = dashSum + offset;
	            }
	            offset %= dashSum;
	            // Bezier approx length
	            for (t = 0; t < 1; t += 0.1) {
	                dx = cubicAt(x0, x1, x2, x3, t + 0.1)
	                    - cubicAt(x0, x1, x2, x3, t);
	                dy = cubicAt(y0, y1, y2, y3, t + 0.1)
	                    - cubicAt(y0, y1, y2, y3, t);
	                bezierLen += mathSqrt(dx * dx + dy * dy);
	            }

	            // Find idx after add offset
	            for (; idx < nDash; idx++) {
	                tmpLen += lineDash[idx];
	                if (tmpLen > offset) {
	                    break;
	                }
	            }
	            t = (tmpLen - offset) / bezierLen;

	            while (t <= 1) {

	                x = cubicAt(x0, x1, x2, x3, t);
	                y = cubicAt(y0, y1, y2, y3, t);

	                // Use line to approximate dashed bezier
	                // Bad result if dash is long
	                idx % 2 ? ctx.moveTo(x, y)
	                    : ctx.lineTo(x, y);

	                t += lineDash[idx] / bezierLen;

	                idx = (idx + 1) % nDash;
	            }

	            // Finish the last segment and calculate the new offset
	            (idx % 2 !== 0) && ctx.lineTo(x3, y3);
	            dx = x3 - x;
	            dy = y3 - y;
	            this._dashOffset = -mathSqrt(dx * dx + dy * dy);
	        },

	        _dashedQuadraticTo: function (x1, y1, x2, y2) {
	            // Convert quadratic to cubic using degree elevation
	            var x3 = x2;
	            var y3 = y2;
	            x2 = (x2 + 2 * x1) / 3;
	            y2 = (y2 + 2 * y1) / 3;
	            x1 = (this._xi + 2 * x1) / 3;
	            y1 = (this._yi + 2 * y1) / 3;

	            this._dashedBezierTo(x1, y1, x2, y2, x3, y3);
	        },

	        /**
	         * 转成静态的 Float32Array 减少堆内存占用
	         * Convert dynamic array to static Float32Array
	         */
	        toStatic: function () {
	            var data = this.data;
	            if (data instanceof Array) {
	                data.length = this._len;
	                if (hasTypedArray) {
	                    this.data = new Float32Array(data);
	                }
	            }
	        },

	        /**
	         * @return {module:zrender/core/BoundingRect}
	         */
	        getBoundingRect: function () {
	            min[0] = min[1] = min2[0] = min2[1] = Number.MAX_VALUE;
	            max[0] = max[1] = max2[0] = max2[1] = -Number.MAX_VALUE;

	            var data = this.data;
	            var xi = 0;
	            var yi = 0;
	            var x0 = 0;
	            var y0 = 0;

	            for (var i = 0; i < data.length;) {
	                var cmd = data[i++];

	                if (i == 1) {
	                    // 如果第一个命令是 L, C, Q
	                    // 则 previous point 同绘制命令的第一个 point
	                    //
	                    // 第一个命令为 Arc 的情况下会在后面特殊处理
	                    xi = data[i];
	                    yi = data[i + 1];

	                    x0 = xi;
	                    y0 = yi;
	                }

	                switch (cmd) {
	                    case CMD.M:
	                        // moveTo 命令重新创建一个新的 subpath, 并且更新新的起点
	                        // 在 closePath 的时候使用
	                        x0 = data[i++];
	                        y0 = data[i++];
	                        xi = x0;
	                        yi = y0;
	                        min2[0] = x0;
	                        min2[1] = y0;
	                        max2[0] = x0;
	                        max2[1] = y0;
	                        break;
	                    case CMD.L:
	                        bbox.fromLine(xi, yi, data[i], data[i + 1], min2, max2);
	                        xi = data[i++];
	                        yi = data[i++];
	                        break;
	                    case CMD.C:
	                        bbox.fromCubic(
	                            xi, yi, data[i++], data[i++], data[i++], data[i++], data[i], data[i + 1],
	                            min2, max2
	                        );
	                        xi = data[i++];
	                        yi = data[i++];
	                        break;
	                    case CMD.Q:
	                        bbox.fromQuadratic(
	                            xi, yi, data[i++], data[i++], data[i], data[i + 1],
	                            min2, max2
	                        );
	                        xi = data[i++];
	                        yi = data[i++];
	                        break;
	                    case CMD.A:
	                        // TODO Arc 判断的开销比较大
	                        var cx = data[i++];
	                        var cy = data[i++];
	                        var rx = data[i++];
	                        var ry = data[i++];
	                        var startAngle = data[i++];
	                        var endAngle = data[i++] + startAngle;
	                        // TODO Arc 旋转
	                        var psi = data[i++];
	                        var anticlockwise = 1 - data[i++];

	                        if (i == 1) {
	                            // 直接使用 arc 命令
	                            // 第一个命令起点还未定义
	                            x0 = mathCos(startAngle) * rx + cx;
	                            y0 = mathSin(startAngle) * ry + cy;
	                        }

	                        bbox.fromArc(
	                            cx, cy, rx, ry, startAngle, endAngle,
	                            anticlockwise, min2, max2
	                        );

	                        xi = mathCos(endAngle) * rx + cx;
	                        yi = mathSin(endAngle) * ry + cy;
	                        break;
	                    case CMD.R:
	                        x0 = xi = data[i++];
	                        y0 = yi = data[i++];
	                        var width = data[i++];
	                        var height = data[i++];
	                        // Use fromLine
	                        bbox.fromLine(x0, y0, x0 + width, y0 + height, min2, max2);
	                        break;
	                    case CMD.Z:
	                        xi = x0;
	                        yi = y0;
	                        break;
	                }

	                // Union
	                vec2.min(min, min, min2);
	                vec2.max(max, max, max2);
	            }

	            // No data
	            if (i === 0) {
	                min[0] = min[1] = max[0] = max[1] = 0;
	            }

	            return new BoundingRect(
	                min[0], min[1], max[0] - min[0], max[1] - min[1]
	            );
	        },

	        /**
	         * Rebuild path from current data
	         * Rebuild path will not consider javascript implemented line dash.
	         * @param {CanvasRenderingContext} ctx
	         */
	        rebuildPath: function (ctx) {
	            var d = this.data;
	            var x0, y0;
	            var xi, yi;
	            var x, y;
	            var ux = this._ux;
	            var uy = this._uy;
	            var len = this._len;
	            for (var i = 0; i < len;) {
	                var cmd = d[i++];

	                if (i == 1) {
	                    // 如果第一个命令是 L, C, Q
	                    // 则 previous point 同绘制命令的第一个 point
	                    //
	                    // 第一个命令为 Arc 的情况下会在后面特殊处理
	                    xi = d[i];
	                    yi = d[i + 1];

	                    x0 = xi;
	                    y0 = yi;
	                }
	                switch (cmd) {
	                    case CMD.M:
	                        x0 = xi = d[i++];
	                        y0 = yi = d[i++];
	                        ctx.moveTo(xi, yi);
	                        break;
	                    case CMD.L:
	                        x = d[i++];
	                        y = d[i++];
	                        // Not draw too small seg between
	                        if (mathAbs(x - xi) > ux || mathAbs(y - yi) > uy || i === len - 1) {
	                            ctx.lineTo(x, y);
	                            xi = x;
	                            yi = y;
	                        }
	                        break;
	                    case CMD.C:
	                        ctx.bezierCurveTo(
	                            d[i++], d[i++], d[i++], d[i++], d[i++], d[i++]
	                        );
	                        xi = d[i - 2];
	                        yi = d[i - 1];
	                        break;
	                    case CMD.Q:
	                        ctx.quadraticCurveTo(d[i++], d[i++], d[i++], d[i++]);
	                        xi = d[i - 2];
	                        yi = d[i - 1];
	                        break;
	                    case CMD.A:
	                        var cx = d[i++];
	                        var cy = d[i++];
	                        var rx = d[i++];
	                        var ry = d[i++];
	                        var theta = d[i++];
	                        var dTheta = d[i++];
	                        var psi = d[i++];
	                        var fs = d[i++];
	                        var r = (rx > ry) ? rx : ry;
	                        var scaleX = (rx > ry) ? 1 : rx / ry;
	                        var scaleY = (rx > ry) ? ry / rx : 1;
	                        var isEllipse = Math.abs(rx - ry) > 1e-3;
	                        var endAngle = theta + dTheta;
	                        if (isEllipse) {
	                            ctx.translate(cx, cy);
	                            ctx.rotate(psi);
	                            ctx.scale(scaleX, scaleY);
	                            ctx.arc(0, 0, r, theta, endAngle, 1 - fs);
	                            ctx.scale(1 / scaleX, 1 / scaleY);
	                            ctx.rotate(-psi);
	                            ctx.translate(-cx, -cy);
	                        }
	                        else {
	                            ctx.arc(cx, cy, r, theta, endAngle, 1 - fs);
	                        }

	                        if (i == 1) {
	                            // 直接使用 arc 命令
	                            // 第一个命令起点还未定义
	                            x0 = mathCos(theta) * rx + cx;
	                            y0 = mathSin(theta) * ry + cy;
	                        }
	                        xi = mathCos(endAngle) * rx + cx;
	                        yi = mathSin(endAngle) * ry + cy;
	                        break;
	                    case CMD.R:
	                        x0 = xi = d[i];
	                        y0 = yi = d[i + 1];
	                        ctx.rect(d[i++], d[i++], d[i++], d[i++]);
	                        break;
	                    case CMD.Z:
	                        ctx.closePath();
	                        xi = x0;
	                        yi = y0;
	                }
	            }
	        }
	    };

	    PathProxy.CMD = CMD;

	    module.exports = PathProxy;


/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * 曲线辅助模块
	 * @module zrender/core/curve
	 * @author pissang(https://www.github.com/pissang)
	 */


	    var vec2 = __webpack_require__(16);
	    var v2Create = vec2.create;
	    var v2DistSquare = vec2.distSquare;
	    var mathPow = Math.pow;
	    var mathSqrt = Math.sqrt;

	    var EPSILON = 1e-8;
	    var EPSILON_NUMERIC = 1e-4;

	    var THREE_SQRT = mathSqrt(3);
	    var ONE_THIRD = 1 / 3;

	    // 临时变量
	    var _v0 = v2Create();
	    var _v1 = v2Create();
	    var _v2 = v2Create();
	    // var _v3 = vec2.create();

	    function isAroundZero(val) {
	        return val > -EPSILON && val < EPSILON;
	    }
	    function isNotAroundZero(val) {
	        return val > EPSILON || val < -EPSILON;
	    }
	    /**
	     * 计算三次贝塞尔值
	     * @memberOf module:zrender/core/curve
	     * @param  {number} p0
	     * @param  {number} p1
	     * @param  {number} p2
	     * @param  {number} p3
	     * @param  {number} t
	     * @return {number}
	     */
	    function cubicAt(p0, p1, p2, p3, t) {
	        var onet = 1 - t;
	        return onet * onet * (onet * p0 + 3 * t * p1)
	             + t * t * (t * p3 + 3 * onet * p2);
	    }

	    /**
	     * 计算三次贝塞尔导数值
	     * @memberOf module:zrender/core/curve
	     * @param  {number} p0
	     * @param  {number} p1
	     * @param  {number} p2
	     * @param  {number} p3
	     * @param  {number} t
	     * @return {number}
	     */
	    function cubicDerivativeAt(p0, p1, p2, p3, t) {
	        var onet = 1 - t;
	        return 3 * (
	            ((p1 - p0) * onet + 2 * (p2 - p1) * t) * onet
	            + (p3 - p2) * t * t
	        );
	    }

	    /**
	     * 计算三次贝塞尔方程根，使用盛金公式
	     * @memberOf module:zrender/core/curve
	     * @param  {number} p0
	     * @param  {number} p1
	     * @param  {number} p2
	     * @param  {number} p3
	     * @param  {number} val
	     * @param  {Array.<number>} roots
	     * @return {number} 有效根数目
	     */
	    function cubicRootAt(p0, p1, p2, p3, val, roots) {
	        // Evaluate roots of cubic functions
	        var a = p3 + 3 * (p1 - p2) - p0;
	        var b = 3 * (p2 - p1 * 2 + p0);
	        var c = 3 * (p1  - p0);
	        var d = p0 - val;

	        var A = b * b - 3 * a * c;
	        var B = b * c - 9 * a * d;
	        var C = c * c - 3 * b * d;

	        var n = 0;

	        if (isAroundZero(A) && isAroundZero(B)) {
	            if (isAroundZero(b)) {
	                roots[0] = 0;
	            }
	            else {
	                var t1 = -c / b;  //t1, t2, t3, b is not zero
	                if (t1 >= 0 && t1 <= 1) {
	                    roots[n++] = t1;
	                }
	            }
	        }
	        else {
	            var disc = B * B - 4 * A * C;

	            if (isAroundZero(disc)) {
	                var K = B / A;
	                var t1 = -b / a + K;  // t1, a is not zero
	                var t2 = -K / 2;  // t2, t3
	                if (t1 >= 0 && t1 <= 1) {
	                    roots[n++] = t1;
	                }
	                if (t2 >= 0 && t2 <= 1) {
	                    roots[n++] = t2;
	                }
	            }
	            else if (disc > 0) {
	                var discSqrt = mathSqrt(disc);
	                var Y1 = A * b + 1.5 * a * (-B + discSqrt);
	                var Y2 = A * b + 1.5 * a * (-B - discSqrt);
	                if (Y1 < 0) {
	                    Y1 = -mathPow(-Y1, ONE_THIRD);
	                }
	                else {
	                    Y1 = mathPow(Y1, ONE_THIRD);
	                }
	                if (Y2 < 0) {
	                    Y2 = -mathPow(-Y2, ONE_THIRD);
	                }
	                else {
	                    Y2 = mathPow(Y2, ONE_THIRD);
	                }
	                var t1 = (-b - (Y1 + Y2)) / (3 * a);
	                if (t1 >= 0 && t1 <= 1) {
	                    roots[n++] = t1;
	                }
	            }
	            else {
	                var T = (2 * A * b - 3 * a * B) / (2 * mathSqrt(A * A * A));
	                var theta = Math.acos(T) / 3;
	                var ASqrt = mathSqrt(A);
	                var tmp = Math.cos(theta);

	                var t1 = (-b - 2 * ASqrt * tmp) / (3 * a);
	                var t2 = (-b + ASqrt * (tmp + THREE_SQRT * Math.sin(theta))) / (3 * a);
	                var t3 = (-b + ASqrt * (tmp - THREE_SQRT * Math.sin(theta))) / (3 * a);
	                if (t1 >= 0 && t1 <= 1) {
	                    roots[n++] = t1;
	                }
	                if (t2 >= 0 && t2 <= 1) {
	                    roots[n++] = t2;
	                }
	                if (t3 >= 0 && t3 <= 1) {
	                    roots[n++] = t3;
	                }
	            }
	        }
	        return n;
	    }

	    /**
	     * 计算三次贝塞尔方程极限值的位置
	     * @memberOf module:zrender/core/curve
	     * @param  {number} p0
	     * @param  {number} p1
	     * @param  {number} p2
	     * @param  {number} p3
	     * @param  {Array.<number>} extrema
	     * @return {number} 有效数目
	     */
	    function cubicExtrema(p0, p1, p2, p3, extrema) {
	        var b = 6 * p2 - 12 * p1 + 6 * p0;
	        var a = 9 * p1 + 3 * p3 - 3 * p0 - 9 * p2;
	        var c = 3 * p1 - 3 * p0;

	        var n = 0;
	        if (isAroundZero(a)) {
	            if (isNotAroundZero(b)) {
	                var t1 = -c / b;
	                if (t1 >= 0 && t1 <=1) {
	                    extrema[n++] = t1;
	                }
	            }
	        }
	        else {
	            var disc = b * b - 4 * a * c;
	            if (isAroundZero(disc)) {
	                extrema[0] = -b / (2 * a);
	            }
	            else if (disc > 0) {
	                var discSqrt = mathSqrt(disc);
	                var t1 = (-b + discSqrt) / (2 * a);
	                var t2 = (-b - discSqrt) / (2 * a);
	                if (t1 >= 0 && t1 <= 1) {
	                    extrema[n++] = t1;
	                }
	                if (t2 >= 0 && t2 <= 1) {
	                    extrema[n++] = t2;
	                }
	            }
	        }
	        return n;
	    }

	    /**
	     * 细分三次贝塞尔曲线
	     * @memberOf module:zrender/core/curve
	     * @param  {number} p0
	     * @param  {number} p1
	     * @param  {number} p2
	     * @param  {number} p3
	     * @param  {number} t
	     * @param  {Array.<number>} out
	     */
	    function cubicSubdivide(p0, p1, p2, p3, t, out) {
	        var p01 = (p1 - p0) * t + p0;
	        var p12 = (p2 - p1) * t + p1;
	        var p23 = (p3 - p2) * t + p2;

	        var p012 = (p12 - p01) * t + p01;
	        var p123 = (p23 - p12) * t + p12;

	        var p0123 = (p123 - p012) * t + p012;
	        // Seg0
	        out[0] = p0;
	        out[1] = p01;
	        out[2] = p012;
	        out[3] = p0123;
	        // Seg1
	        out[4] = p0123;
	        out[5] = p123;
	        out[6] = p23;
	        out[7] = p3;
	    }

	    /**
	     * 投射点到三次贝塞尔曲线上，返回投射距离。
	     * 投射点有可能会有一个或者多个，这里只返回其中距离最短的一个。
	     * @param {number} x0
	     * @param {number} y0
	     * @param {number} x1
	     * @param {number} y1
	     * @param {number} x2
	     * @param {number} y2
	     * @param {number} x3
	     * @param {number} y3
	     * @param {number} x
	     * @param {number} y
	     * @param {Array.<number>} [out] 投射点
	     * @return {number}
	     */
	    function cubicProjectPoint(
	        x0, y0, x1, y1, x2, y2, x3, y3,
	        x, y, out
	    ) {
	        // http://pomax.github.io/bezierinfo/#projections
	        var t;
	        var interval = 0.005;
	        var d = Infinity;
	        var prev;
	        var next;
	        var d1;
	        var d2;

	        _v0[0] = x;
	        _v0[1] = y;

	        // 先粗略估计一下可能的最小距离的 t 值
	        // PENDING
	        for (var _t = 0; _t < 1; _t += 0.05) {
	            _v1[0] = cubicAt(x0, x1, x2, x3, _t);
	            _v1[1] = cubicAt(y0, y1, y2, y3, _t);
	            d1 = v2DistSquare(_v0, _v1);
	            if (d1 < d) {
	                t = _t;
	                d = d1;
	            }
	        }
	        d = Infinity;

	        // At most 32 iteration
	        for (var i = 0; i < 32; i++) {
	            if (interval < EPSILON_NUMERIC) {
	                break;
	            }
	            prev = t - interval;
	            next = t + interval;
	            // t - interval
	            _v1[0] = cubicAt(x0, x1, x2, x3, prev);
	            _v1[1] = cubicAt(y0, y1, y2, y3, prev);

	            d1 = v2DistSquare(_v1, _v0);

	            if (prev >= 0 && d1 < d) {
	                t = prev;
	                d = d1;
	            }
	            else {
	                // t + interval
	                _v2[0] = cubicAt(x0, x1, x2, x3, next);
	                _v2[1] = cubicAt(y0, y1, y2, y3, next);
	                d2 = v2DistSquare(_v2, _v0);

	                if (next <= 1 && d2 < d) {
	                    t = next;
	                    d = d2;
	                }
	                else {
	                    interval *= 0.5;
	                }
	            }
	        }
	        // t
	        if (out) {
	            out[0] = cubicAt(x0, x1, x2, x3, t);
	            out[1] = cubicAt(y0, y1, y2, y3, t);
	        }
	        // console.log(interval, i);
	        return mathSqrt(d);
	    }

	    /**
	     * 计算二次方贝塞尔值
	     * @param  {number} p0
	     * @param  {number} p1
	     * @param  {number} p2
	     * @param  {number} t
	     * @return {number}
	     */
	    function quadraticAt(p0, p1, p2, t) {
	        var onet = 1 - t;
	        return onet * (onet * p0 + 2 * t * p1) + t * t * p2;
	    }

	    /**
	     * 计算二次方贝塞尔导数值
	     * @param  {number} p0
	     * @param  {number} p1
	     * @param  {number} p2
	     * @param  {number} t
	     * @return {number}
	     */
	    function quadraticDerivativeAt(p0, p1, p2, t) {
	        return 2 * ((1 - t) * (p1 - p0) + t * (p2 - p1));
	    }

	    /**
	     * 计算二次方贝塞尔方程根
	     * @param  {number} p0
	     * @param  {number} p1
	     * @param  {number} p2
	     * @param  {number} t
	     * @param  {Array.<number>} roots
	     * @return {number} 有效根数目
	     */
	    function quadraticRootAt(p0, p1, p2, val, roots) {
	        var a = p0 - 2 * p1 + p2;
	        var b = 2 * (p1 - p0);
	        var c = p0 - val;

	        var n = 0;
	        if (isAroundZero(a)) {
	            if (isNotAroundZero(b)) {
	                var t1 = -c / b;
	                if (t1 >= 0 && t1 <= 1) {
	                    roots[n++] = t1;
	                }
	            }
	        }
	        else {
	            var disc = b * b - 4 * a * c;
	            if (isAroundZero(disc)) {
	                var t1 = -b / (2 * a);
	                if (t1 >= 0 && t1 <= 1) {
	                    roots[n++] = t1;
	                }
	            }
	            else if (disc > 0) {
	                var discSqrt = mathSqrt(disc);
	                var t1 = (-b + discSqrt) / (2 * a);
	                var t2 = (-b - discSqrt) / (2 * a);
	                if (t1 >= 0 && t1 <= 1) {
	                    roots[n++] = t1;
	                }
	                if (t2 >= 0 && t2 <= 1) {
	                    roots[n++] = t2;
	                }
	            }
	        }
	        return n;
	    }

	    /**
	     * 计算二次贝塞尔方程极限值
	     * @memberOf module:zrender/core/curve
	     * @param  {number} p0
	     * @param  {number} p1
	     * @param  {number} p2
	     * @return {number}
	     */
	    function quadraticExtremum(p0, p1, p2) {
	        var divider = p0 + p2 - 2 * p1;
	        if (divider === 0) {
	            // p1 is center of p0 and p2
	            return 0.5;
	        }
	        else {
	            return (p0 - p1) / divider;
	        }
	    }

	    /**
	     * 细分二次贝塞尔曲线
	     * @memberOf module:zrender/core/curve
	     * @param  {number} p0
	     * @param  {number} p1
	     * @param  {number} p2
	     * @param  {number} t
	     * @param  {Array.<number>} out
	     */
	    function quadraticSubdivide(p0, p1, p2, t, out) {
	        var p01 = (p1 - p0) * t + p0;
	        var p12 = (p2 - p1) * t + p1;
	        var p012 = (p12 - p01) * t + p01;

	        // Seg0
	        out[0] = p0;
	        out[1] = p01;
	        out[2] = p012;

	        // Seg1
	        out[3] = p012;
	        out[4] = p12;
	        out[5] = p2;
	    }

	    /**
	     * 投射点到二次贝塞尔曲线上，返回投射距离。
	     * 投射点有可能会有一个或者多个，这里只返回其中距离最短的一个。
	     * @param {number} x0
	     * @param {number} y0
	     * @param {number} x1
	     * @param {number} y1
	     * @param {number} x2
	     * @param {number} y2
	     * @param {number} x
	     * @param {number} y
	     * @param {Array.<number>} out 投射点
	     * @return {number}
	     */
	    function quadraticProjectPoint(
	        x0, y0, x1, y1, x2, y2,
	        x, y, out
	    ) {
	        // http://pomax.github.io/bezierinfo/#projections
	        var t;
	        var interval = 0.005;
	        var d = Infinity;

	        _v0[0] = x;
	        _v0[1] = y;

	        // 先粗略估计一下可能的最小距离的 t 值
	        // PENDING
	        for (var _t = 0; _t < 1; _t += 0.05) {
	            _v1[0] = quadraticAt(x0, x1, x2, _t);
	            _v1[1] = quadraticAt(y0, y1, y2, _t);
	            var d1 = v2DistSquare(_v0, _v1);
	            if (d1 < d) {
	                t = _t;
	                d = d1;
	            }
	        }
	        d = Infinity;

	        // At most 32 iteration
	        for (var i = 0; i < 32; i++) {
	            if (interval < EPSILON_NUMERIC) {
	                break;
	            }
	            var prev = t - interval;
	            var next = t + interval;
	            // t - interval
	            _v1[0] = quadraticAt(x0, x1, x2, prev);
	            _v1[1] = quadraticAt(y0, y1, y2, prev);

	            var d1 = v2DistSquare(_v1, _v0);

	            if (prev >= 0 && d1 < d) {
	                t = prev;
	                d = d1;
	            }
	            else {
	                // t + interval
	                _v2[0] = quadraticAt(x0, x1, x2, next);
	                _v2[1] = quadraticAt(y0, y1, y2, next);
	                var d2 = v2DistSquare(_v2, _v0);
	                if (next <= 1 && d2 < d) {
	                    t = next;
	                    d = d2;
	                }
	                else {
	                    interval *= 0.5;
	                }
	            }
	        }
	        // t
	        if (out) {
	            out[0] = quadraticAt(x0, x1, x2, t);
	            out[1] = quadraticAt(y0, y1, y2, t);
	        }
	        // console.log(interval, i);
	        return mathSqrt(d);
	    }

	    module.exports = {

	        cubicAt: cubicAt,

	        cubicDerivativeAt: cubicDerivativeAt,

	        cubicRootAt: cubicRootAt,

	        cubicExtrema: cubicExtrema,

	        cubicSubdivide: cubicSubdivide,

	        cubicProjectPoint: cubicProjectPoint,

	        quadraticAt: quadraticAt,

	        quadraticDerivativeAt: quadraticDerivativeAt,

	        quadraticRootAt: quadraticRootAt,

	        quadraticExtremum: quadraticExtremum,

	        quadraticSubdivide: quadraticSubdivide,

	        quadraticProjectPoint: quadraticProjectPoint
	    };


/***/ },
/* 50 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @author Yi Shen(https://github.com/pissang)
	 */


	    var vec2 = __webpack_require__(16);
	    var curve = __webpack_require__(49);

	    var bbox = {};
	    var mathMin = Math.min;
	    var mathMax = Math.max;
	    var mathSin = Math.sin;
	    var mathCos = Math.cos;

	    var start = vec2.create();
	    var end = vec2.create();
	    var extremity = vec2.create();

	    var PI2 = Math.PI * 2;
	    /**
	     * 从顶点数组中计算出最小包围盒，写入`min`和`max`中
	     * @module zrender/core/bbox
	     * @param {Array<Object>} points 顶点数组
	     * @param {number} min
	     * @param {number} max
	     */
	    bbox.fromPoints = function(points, min, max) {
	        if (points.length === 0) {
	            return;
	        }
	        var p = points[0];
	        var left = p[0];
	        var right = p[0];
	        var top = p[1];
	        var bottom = p[1];
	        var i;

	        for (i = 1; i < points.length; i++) {
	            p = points[i];
	            left = mathMin(left, p[0]);
	            right = mathMax(right, p[0]);
	            top = mathMin(top, p[1]);
	            bottom = mathMax(bottom, p[1]);
	        }

	        min[0] = left;
	        min[1] = top;
	        max[0] = right;
	        max[1] = bottom;
	    };

	    /**
	     * @memberOf module:zrender/core/bbox
	     * @param {number} x0
	     * @param {number} y0
	     * @param {number} x1
	     * @param {number} y1
	     * @param {Array.<number>} min
	     * @param {Array.<number>} max
	     */
	    bbox.fromLine = function (x0, y0, x1, y1, min, max) {
	        min[0] = mathMin(x0, x1);
	        min[1] = mathMin(y0, y1);
	        max[0] = mathMax(x0, x1);
	        max[1] = mathMax(y0, y1);
	    };

	    var xDim = [];
	    var yDim = [];
	    /**
	     * 从三阶贝塞尔曲线(p0, p1, p2, p3)中计算出最小包围盒，写入`min`和`max`中
	     * @memberOf module:zrender/core/bbox
	     * @param {number} x0
	     * @param {number} y0
	     * @param {number} x1
	     * @param {number} y1
	     * @param {number} x2
	     * @param {number} y2
	     * @param {number} x3
	     * @param {number} y3
	     * @param {Array.<number>} min
	     * @param {Array.<number>} max
	     */
	    bbox.fromCubic = function(
	        x0, y0, x1, y1, x2, y2, x3, y3, min, max
	    ) {
	        var cubicExtrema = curve.cubicExtrema;
	        var cubicAt = curve.cubicAt;
	        var i;
	        var n = cubicExtrema(x0, x1, x2, x3, xDim);
	        min[0] = Infinity;
	        min[1] = Infinity;
	        max[0] = -Infinity;
	        max[1] = -Infinity;

	        for (i = 0; i < n; i++) {
	            var x = cubicAt(x0, x1, x2, x3, xDim[i]);
	            min[0] = mathMin(x, min[0]);
	            max[0] = mathMax(x, max[0]);
	        }
	        n = cubicExtrema(y0, y1, y2, y3, yDim);
	        for (i = 0; i < n; i++) {
	            var y = cubicAt(y0, y1, y2, y3, yDim[i]);
	            min[1] = mathMin(y, min[1]);
	            max[1] = mathMax(y, max[1]);
	        }

	        min[0] = mathMin(x0, min[0]);
	        max[0] = mathMax(x0, max[0]);
	        min[0] = mathMin(x3, min[0]);
	        max[0] = mathMax(x3, max[0]);

	        min[1] = mathMin(y0, min[1]);
	        max[1] = mathMax(y0, max[1]);
	        min[1] = mathMin(y3, min[1]);
	        max[1] = mathMax(y3, max[1]);
	    };

	    /**
	     * 从二阶贝塞尔曲线(p0, p1, p2)中计算出最小包围盒，写入`min`和`max`中
	     * @memberOf module:zrender/core/bbox
	     * @param {number} x0
	     * @param {number} y0
	     * @param {number} x1
	     * @param {number} y1
	     * @param {number} x2
	     * @param {number} y2
	     * @param {Array.<number>} min
	     * @param {Array.<number>} max
	     */
	    bbox.fromQuadratic = function(x0, y0, x1, y1, x2, y2, min, max) {
	        var quadraticExtremum = curve.quadraticExtremum;
	        var quadraticAt = curve.quadraticAt;
	        // Find extremities, where derivative in x dim or y dim is zero
	        var tx =
	            mathMax(
	                mathMin(quadraticExtremum(x0, x1, x2), 1), 0
	            );
	        var ty =
	            mathMax(
	                mathMin(quadraticExtremum(y0, y1, y2), 1), 0
	            );

	        var x = quadraticAt(x0, x1, x2, tx);
	        var y = quadraticAt(y0, y1, y2, ty);

	        min[0] = mathMin(x0, x2, x);
	        min[1] = mathMin(y0, y2, y);
	        max[0] = mathMax(x0, x2, x);
	        max[1] = mathMax(y0, y2, y);
	    };

	    /**
	     * 从圆弧中计算出最小包围盒，写入`min`和`max`中
	     * @method
	     * @memberOf module:zrender/core/bbox
	     * @param {number} x
	     * @param {number} y
	     * @param {number} rx
	     * @param {number} ry
	     * @param {number} startAngle
	     * @param {number} endAngle
	     * @param {number} anticlockwise
	     * @param {Array.<number>} min
	     * @param {Array.<number>} max
	     */
	    bbox.fromArc = function (
	        x, y, rx, ry, startAngle, endAngle, anticlockwise, min, max
	    ) {
	        var vec2Min = vec2.min;
	        var vec2Max = vec2.max;

	        var diff = Math.abs(startAngle - endAngle);


	        if (diff % PI2 < 1e-4 && diff > 1e-4) {
	            // Is a circle
	            min[0] = x - rx;
	            min[1] = y - ry;
	            max[0] = x + rx;
	            max[1] = y + ry;
	            return;
	        }

	        start[0] = mathCos(startAngle) * rx + x;
	        start[1] = mathSin(startAngle) * ry + y;

	        end[0] = mathCos(endAngle) * rx + x;
	        end[1] = mathSin(endAngle) * ry + y;

	        vec2Min(min, start, end);
	        vec2Max(max, start, end);

	        // Thresh to [0, Math.PI * 2]
	        startAngle = startAngle % (PI2);
	        if (startAngle < 0) {
	            startAngle = startAngle + PI2;
	        }
	        endAngle = endAngle % (PI2);
	        if (endAngle < 0) {
	            endAngle = endAngle + PI2;
	        }

	        if (startAngle > endAngle && !anticlockwise) {
	            endAngle += PI2;
	        }
	        else if (startAngle < endAngle && anticlockwise) {
	            startAngle += PI2;
	        }
	        if (anticlockwise) {
	            var tmp = endAngle;
	            endAngle = startAngle;
	            startAngle = tmp;
	        }

	        // var number = 0;
	        // var step = (anticlockwise ? -Math.PI : Math.PI) / 2;
	        for (var angle = 0; angle < endAngle; angle += Math.PI / 2) {
	            if (angle > startAngle) {
	                extremity[0] = mathCos(angle) * rx + x;
	                extremity[1] = mathSin(angle) * ry + y;

	                vec2Min(min, extremity, min);
	                vec2Max(max, extremity, max);
	            }
	        }
	    };

	    module.exports = bbox;



/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var CMD = __webpack_require__(48).CMD;
	    var line = __webpack_require__(52);
	    var cubic = __webpack_require__(53);
	    var quadratic = __webpack_require__(54);
	    var arc = __webpack_require__(55);
	    var normalizeRadian = __webpack_require__(56).normalizeRadian;
	    var curve = __webpack_require__(49);

	    var windingLine = __webpack_require__(57);

	    var containStroke = line.containStroke;

	    var PI2 = Math.PI * 2;

	    var EPSILON = 1e-4;

	    function isAroundEqual(a, b) {
	        return Math.abs(a - b) < EPSILON;
	    }

	    // 临时数组
	    var roots = [-1, -1, -1];
	    var extrema = [-1, -1];

	    function swapExtrema() {
	        var tmp = extrema[0];
	        extrema[0] = extrema[1];
	        extrema[1] = tmp;
	    }

	    function windingCubic(x0, y0, x1, y1, x2, y2, x3, y3, x, y) {
	        // Quick reject
	        if (
	            (y > y0 && y > y1 && y > y2 && y > y3)
	            || (y < y0 && y < y1 && y < y2 && y < y3)
	        ) {
	            return 0;
	        }
	        var nRoots = curve.cubicRootAt(y0, y1, y2, y3, y, roots);
	        if (nRoots === 0) {
	            return 0;
	        }
	        else {
	            var w = 0;
	            var nExtrema = -1;
	            var y0_, y1_;
	            for (var i = 0; i < nRoots; i++) {
	                var t = roots[i];
	                var x_ = curve.cubicAt(x0, x1, x2, x3, t);
	                if (x_ < x) { // Quick reject
	                    continue;
	                }
	                if (nExtrema < 0) {
	                    nExtrema = curve.cubicExtrema(y0, y1, y2, y3, extrema);
	                    if (extrema[1] < extrema[0] && nExtrema > 1) {
	                        swapExtrema();
	                    }
	                    y0_ = curve.cubicAt(y0, y1, y2, y3, extrema[0]);
	                    if (nExtrema > 1) {
	                        y1_ = curve.cubicAt(y0, y1, y2, y3, extrema[1]);
	                    }
	                }
	                if (nExtrema == 2) {
	                    // 分成三段单调函数
	                    if (t < extrema[0]) {
	                        w += y0_ < y0 ? 1 : -1;
	                    }
	                    else if (t < extrema[1]) {
	                        w += y1_ < y0_ ? 1 : -1;
	                    }
	                    else {
	                        w += y3 < y1_ ? 1 : -1;
	                    }
	                }
	                else {
	                    // 分成两段单调函数
	                    if (t < extrema[0]) {
	                        w += y0_ < y0 ? 1 : -1;
	                    }
	                    else {
	                        w += y3 < y0_ ? 1 : -1;
	                    }
	                }
	            }
	            return w;
	        }
	    }

	    function windingQuadratic(x0, y0, x1, y1, x2, y2, x, y) {
	        // Quick reject
	        if (
	            (y > y0 && y > y1 && y > y2)
	            || (y < y0 && y < y1 && y < y2)
	        ) {
	            return 0;
	        }
	        var nRoots = curve.quadraticRootAt(y0, y1, y2, y, roots);
	        if (nRoots === 0) {
	            return 0;
	        }
	        else {
	            var t = curve.quadraticExtremum(y0, y1, y2);
	            if (t >= 0 && t <= 1) {
	                var w = 0;
	                var y_ = curve.quadraticAt(y0, y1, y2, t);
	                for (var i = 0; i < nRoots; i++) {
	                    var x_ = curve.quadraticAt(x0, x1, x2, roots[i]);
	                    if (x_ < x) {   // Quick reject
	                        continue;
	                    }
	                    if (roots[i] < t) {
	                        w += y_ < y0 ? 1 : -1;
	                    }
	                    else {
	                        w += y2 < y_ ? 1 : -1;
	                    }
	                }
	                return w;
	            }
	            else {
	                var x_ = curve.quadraticAt(x0, x1, x2, roots[0]);
	                if (x_ < x) {   // Quick reject
	                    return 0;
	                }
	                return y2 < y0 ? 1 : -1;
	            }
	        }
	    }

	    // TODO
	    // Arc 旋转
	    function windingArc(
	        cx, cy, r, startAngle, endAngle, anticlockwise, x, y
	    ) {
	        y -= cy;
	        if (y > r || y < -r) {
	            return 0;
	        }
	        var tmp = Math.sqrt(r * r - y * y);
	        roots[0] = -tmp;
	        roots[1] = tmp;

	        var diff = Math.abs(startAngle - endAngle);
	        if (diff < 1e-4) {
	            return 0;
	        }
	        if (diff % PI2 < 1e-4) {
	            // Is a circle
	            startAngle = 0;
	            endAngle = PI2;
	            var dir = anticlockwise ? 1 : -1;
	            if (x >= roots[0] + cx && x <= roots[1] + cx) {
	                return dir;
	            } else {
	                return 0;
	            }
	        }

	        if (anticlockwise) {
	            var tmp = startAngle;
	            startAngle = normalizeRadian(endAngle);
	            endAngle = normalizeRadian(tmp);
	        }
	        else {
	            startAngle = normalizeRadian(startAngle);
	            endAngle = normalizeRadian(endAngle);
	        }
	        if (startAngle > endAngle) {
	            endAngle += PI2;
	        }

	        var w = 0;
	        for (var i = 0; i < 2; i++) {
	            var x_ = roots[i];
	            if (x_ + cx > x) {
	                var angle = Math.atan2(y, x_);
	                var dir = anticlockwise ? 1 : -1;
	                if (angle < 0) {
	                    angle = PI2 + angle;
	                }
	                if (
	                    (angle >= startAngle && angle <= endAngle)
	                    || (angle + PI2 >= startAngle && angle + PI2 <= endAngle)
	                ) {
	                    if (angle > Math.PI / 2 && angle < Math.PI * 1.5) {
	                        dir = -dir;
	                    }
	                    w += dir;
	                }
	            }
	        }
	        return w;
	    }

	    function containPath(data, lineWidth, isStroke, x, y) {
	        var w = 0;
	        var xi = 0;
	        var yi = 0;
	        var x0 = 0;
	        var y0 = 0;

	        for (var i = 0; i < data.length;) {
	            var cmd = data[i++];
	            // Begin a new subpath
	            if (cmd === CMD.M && i > 1) {
	                // Close previous subpath
	                if (!isStroke) {
	                    w += windingLine(xi, yi, x0, y0, x, y);
	                }
	                // 如果被任何一个 subpath 包含
	                if (w !== 0) {
	                    return true;
	                }
	            }

	            if (i == 1) {
	                // 如果第一个命令是 L, C, Q
	                // 则 previous point 同绘制命令的第一个 point
	                //
	                // 第一个命令为 Arc 的情况下会在后面特殊处理
	                xi = data[i];
	                yi = data[i + 1];

	                x0 = xi;
	                y0 = yi;
	            }

	            switch (cmd) {
	                case CMD.M:
	                    // moveTo 命令重新创建一个新的 subpath, 并且更新新的起点
	                    // 在 closePath 的时候使用
	                    x0 = data[i++];
	                    y0 = data[i++];
	                    xi = x0;
	                    yi = y0;
	                    break;
	                case CMD.L:
	                    if (isStroke) {
	                        if (containStroke(xi, yi, data[i], data[i + 1], lineWidth, x, y)) {
	                            return true;
	                        }
	                    }
	                    else {
	                        // NOTE 在第一个命令为 L, C, Q 的时候会计算出 NaN
	                        w += windingLine(xi, yi, data[i], data[i + 1], x, y) || 0;
	                    }
	                    xi = data[i++];
	                    yi = data[i++];
	                    break;
	                case CMD.C:
	                    if (isStroke) {
	                        if (cubic.containStroke(xi, yi,
	                            data[i++], data[i++], data[i++], data[i++], data[i], data[i + 1],
	                            lineWidth, x, y
	                        )) {
	                            return true;
	                        }
	                    }
	                    else {
	                        w += windingCubic(
	                            xi, yi,
	                            data[i++], data[i++], data[i++], data[i++], data[i], data[i + 1],
	                            x, y
	                        ) || 0;
	                    }
	                    xi = data[i++];
	                    yi = data[i++];
	                    break;
	                case CMD.Q:
	                    if (isStroke) {
	                        if (quadratic.containStroke(xi, yi,
	                            data[i++], data[i++], data[i], data[i + 1],
	                            lineWidth, x, y
	                        )) {
	                            return true;
	                        }
	                    }
	                    else {
	                        w += windingQuadratic(
	                            xi, yi,
	                            data[i++], data[i++], data[i], data[i + 1],
	                            x, y
	                        ) || 0;
	                    }
	                    xi = data[i++];
	                    yi = data[i++];
	                    break;
	                case CMD.A:
	                    // TODO Arc 判断的开销比较大
	                    var cx = data[i++];
	                    var cy = data[i++];
	                    var rx = data[i++];
	                    var ry = data[i++];
	                    var theta = data[i++];
	                    var dTheta = data[i++];
	                    // TODO Arc 旋转
	                    var psi = data[i++];
	                    var anticlockwise = 1 - data[i++];
	                    var x1 = Math.cos(theta) * rx + cx;
	                    var y1 = Math.sin(theta) * ry + cy;
	                    // 不是直接使用 arc 命令
	                    if (i > 1) {
	                        w += windingLine(xi, yi, x1, y1, x, y);
	                    }
	                    else {
	                        // 第一个命令起点还未定义
	                        x0 = x1;
	                        y0 = y1;
	                    }
	                    // zr 使用scale来模拟椭圆, 这里也对x做一定的缩放
	                    var _x = (x - cx) * ry / rx + cx;
	                    if (isStroke) {
	                        if (arc.containStroke(
	                            cx, cy, ry, theta, theta + dTheta, anticlockwise,
	                            lineWidth, _x, y
	                        )) {
	                            return true;
	                        }
	                    }
	                    else {
	                        w += windingArc(
	                            cx, cy, ry, theta, theta + dTheta, anticlockwise,
	                            _x, y
	                        );
	                    }
	                    xi = Math.cos(theta + dTheta) * rx + cx;
	                    yi = Math.sin(theta + dTheta) * ry + cy;
	                    break;
	                case CMD.R:
	                    x0 = xi = data[i++];
	                    y0 = yi = data[i++];
	                    var width = data[i++];
	                    var height = data[i++];
	                    var x1 = x0 + width;
	                    var y1 = y0 + height;
	                    if (isStroke) {
	                        if (containStroke(x0, y0, x1, y0, lineWidth, x, y)
	                          || containStroke(x1, y0, x1, y1, lineWidth, x, y)
	                          || containStroke(x1, y1, x0, y1, lineWidth, x, y)
	                          || containStroke(x0, y1, x1, y1, lineWidth, x, y)
	                        ) {
	                            return true;
	                        }
	                    }
	                    else {
	                        // FIXME Clockwise ?
	                        w += windingLine(x1, y0, x1, y1, x, y);
	                        w += windingLine(x0, y1, x0, y0, x, y);
	                    }
	                    break;
	                case CMD.Z:
	                    if (isStroke) {
	                        if (containStroke(
	                            xi, yi, x0, y0, lineWidth, x, y
	                        )) {
	                            return true;
	                        }
	                    }
	                    else {
	                        // Close a subpath
	                        w += windingLine(xi, yi, x0, y0, x, y);
	                        // 如果被任何一个 subpath 包含
	                        if (w !== 0) {
	                            return true;
	                        }
	                    }
	                    xi = x0;
	                    yi = y0;
	                    break;
	            }
	        }
	        if (!isStroke && !isAroundEqual(yi, y0)) {
	            w += windingLine(xi, yi, x0, y0, x, y) || 0;
	        }
	        return w !== 0;
	    }

	    module.exports = {
	        contain: function (pathData, x, y) {
	            return containPath(pathData, 0, false, x, y);
	        },

	        containStroke: function (pathData, lineWidth, x, y) {
	            return containPath(pathData, lineWidth, true, x, y);
	        }
	    };


/***/ },
/* 52 */
/***/ function(module, exports) {

	
	    module.exports = {
	        /**
	         * 线段包含判断
	         * @param  {number}  x0
	         * @param  {number}  y0
	         * @param  {number}  x1
	         * @param  {number}  y1
	         * @param  {number}  lineWidth
	         * @param  {number}  x
	         * @param  {number}  y
	         * @return {boolean}
	         */
	        containStroke: function (x0, y0, x1, y1, lineWidth, x, y) {
	            if (lineWidth === 0) {
	                return false;
	            }
	            var _l = lineWidth;
	            var _a = 0;
	            var _b = x0;
	            // Quick reject
	            if (
	                (y > y0 + _l && y > y1 + _l)
	                || (y < y0 - _l && y < y1 - _l)
	                || (x > x0 + _l && x > x1 + _l)
	                || (x < x0 - _l && x < x1 - _l)
	            ) {
	                return false;
	            }

	            if (x0 !== x1) {
	                _a = (y0 - y1) / (x0 - x1);
	                _b = (x0 * y1 - x1 * y0) / (x0 - x1) ;
	            }
	            else {
	                return Math.abs(x - x0) <= _l / 2;
	            }
	            var tmp = _a * x - y + _b;
	            var _s = tmp * tmp / (_a * _a + 1);
	            return _s <= _l / 2 * _l / 2;
	        }
	    };


/***/ },
/* 53 */
/***/ function(module, exports, __webpack_require__) {

	

	    var curve = __webpack_require__(49);

	    module.exports = {
	        /**
	         * 三次贝塞尔曲线描边包含判断
	         * @param  {number}  x0
	         * @param  {number}  y0
	         * @param  {number}  x1
	         * @param  {number}  y1
	         * @param  {number}  x2
	         * @param  {number}  y2
	         * @param  {number}  x3
	         * @param  {number}  y3
	         * @param  {number}  lineWidth
	         * @param  {number}  x
	         * @param  {number}  y
	         * @return {boolean}
	         */
	        containStroke: function(x0, y0, x1, y1, x2, y2, x3, y3, lineWidth, x, y) {
	            if (lineWidth === 0) {
	                return false;
	            }
	            var _l = lineWidth;
	            // Quick reject
	            if (
	                (y > y0 + _l && y > y1 + _l && y > y2 + _l && y > y3 + _l)
	                || (y < y0 - _l && y < y1 - _l && y < y2 - _l && y < y3 - _l)
	                || (x > x0 + _l && x > x1 + _l && x > x2 + _l && x > x3 + _l)
	                || (x < x0 - _l && x < x1 - _l && x < x2 - _l && x < x3 - _l)
	            ) {
	                return false;
	            }
	            var d = curve.cubicProjectPoint(
	                x0, y0, x1, y1, x2, y2, x3, y3,
	                x, y, null
	            );
	            return d <= _l / 2;
	        }
	    };


/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	

	    var curve = __webpack_require__(49);

	    module.exports = {
	        /**
	         * 二次贝塞尔曲线描边包含判断
	         * @param  {number}  x0
	         * @param  {number}  y0
	         * @param  {number}  x1
	         * @param  {number}  y1
	         * @param  {number}  x2
	         * @param  {number}  y2
	         * @param  {number}  lineWidth
	         * @param  {number}  x
	         * @param  {number}  y
	         * @return {boolean}
	         */
	        containStroke: function (x0, y0, x1, y1, x2, y2, lineWidth, x, y) {
	            if (lineWidth === 0) {
	                return false;
	            }
	            var _l = lineWidth;
	            // Quick reject
	            if (
	                (y > y0 + _l && y > y1 + _l && y > y2 + _l)
	                || (y < y0 - _l && y < y1 - _l && y < y2 - _l)
	                || (x > x0 + _l && x > x1 + _l && x > x2 + _l)
	                || (x < x0 - _l && x < x1 - _l && x < x2 - _l)
	            ) {
	                return false;
	            }
	            var d = curve.quadraticProjectPoint(
	                x0, y0, x1, y1, x2, y2,
	                x, y, null
	            );
	            return d <= _l / 2;
	        }
	    };


/***/ },
/* 55 */
/***/ function(module, exports, __webpack_require__) {

	

	    var normalizeRadian = __webpack_require__(56).normalizeRadian;
	    var PI2 = Math.PI * 2;

	    module.exports = {
	        /**
	         * 圆弧描边包含判断
	         * @param  {number}  cx
	         * @param  {number}  cy
	         * @param  {number}  r
	         * @param  {number}  startAngle
	         * @param  {number}  endAngle
	         * @param  {boolean}  anticlockwise
	         * @param  {number} lineWidth
	         * @param  {number}  x
	         * @param  {number}  y
	         * @return {Boolean}
	         */
	        containStroke: function (
	            cx, cy, r, startAngle, endAngle, anticlockwise,
	            lineWidth, x, y
	        ) {

	            if (lineWidth === 0) {
	                return false;
	            }
	            var _l = lineWidth;

	            x -= cx;
	            y -= cy;
	            var d = Math.sqrt(x * x + y * y);

	            if ((d - _l > r) || (d + _l < r)) {
	                return false;
	            }
	            if (Math.abs(startAngle - endAngle) % PI2 < 1e-4) {
	                // Is a circle
	                return true;
	            }
	            if (anticlockwise) {
	                var tmp = startAngle;
	                startAngle = normalizeRadian(endAngle);
	                endAngle = normalizeRadian(tmp);
	            } else {
	                startAngle = normalizeRadian(startAngle);
	                endAngle = normalizeRadian(endAngle);
	            }
	            if (startAngle > endAngle) {
	                endAngle += PI2;
	            }

	            var angle = Math.atan2(y, x);
	            if (angle < 0) {
	                angle += PI2;
	            }
	            return (angle >= startAngle && angle <= endAngle)
	                || (angle + PI2 >= startAngle && angle + PI2 <= endAngle);
	        }
	    };


/***/ },
/* 56 */
/***/ function(module, exports) {

	

	    var PI2 = Math.PI * 2;
	    module.exports = {
	        normalizeRadian: function(angle) {
	            angle %= PI2;
	            if (angle < 0) {
	                angle += PI2;
	            }
	            return angle;
	        }
	    };


/***/ },
/* 57 */
/***/ function(module, exports) {

	
	    module.exports = function windingLine(x0, y0, x1, y1, x, y) {
	        if ((y > y0 && y > y1) || (y < y0 && y < y1)) {
	            return 0;
	        }
	        if (y1 === y0) {
	            return 0;
	        }
	        var dir = y1 < y0 ? 1 : -1;
	        var t = (y - y0) / (y1 - y0);
	        var x_ = t * (x1 - x0) + x0;

	        return x_ > x ? dir : 0;
	    };


/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {

	

	    var CMD = __webpack_require__(48).CMD;
	    var vec2 = __webpack_require__(16);
	    var v2ApplyTransform = vec2.applyTransform;

	    var points = [[], [], []];
	    var mathSqrt = Math.sqrt;
	    var mathAtan2 = Math.atan2;
	    function transformPath(path, m) {
	        var data = path.data;
	        var cmd;
	        var nPoint;
	        var i;
	        var j;
	        var k;
	        var p;

	        var M = CMD.M;
	        var C = CMD.C;
	        var L = CMD.L;
	        var R = CMD.R;
	        var A = CMD.A;
	        var Q = CMD.Q;

	        for (i = 0, j = 0; i < data.length;) {
	            cmd = data[i++];
	            j = i;
	            nPoint = 0;

	            switch (cmd) {
	                case M:
	                    nPoint = 1;
	                    break;
	                case L:
	                    nPoint = 1;
	                    break;
	                case C:
	                    nPoint = 3;
	                    break;
	                case Q:
	                    nPoint = 2;
	                    break;
	                case A:
	                    var x = m[4];
	                    var y = m[5];
	                    var sx = mathSqrt(m[0] * m[0] + m[1] * m[1]);
	                    var sy = mathSqrt(m[2] * m[2] + m[3] * m[3]);
	                    var angle = mathAtan2(-m[1] / sy, m[0] / sx);
	                    // cx
	                    data[i++] += x;
	                    // cy
	                    data[i++] += y;
	                    // Scale rx and ry
	                    // FIXME Assume psi is 0 here
	                    data[i++] *= sx;
	                    data[i++] *= sy;

	                    // Start angle
	                    data[i++] += angle;
	                    // end angle
	                    data[i++] += angle;
	                    // FIXME psi
	                    i += 2;
	                    j = i;
	                    break;
	                case R:
	                    // x0, y0
	                    p[0] = data[i++];
	                    p[1] = data[i++];
	                    v2ApplyTransform(p, p, m);
	                    data[j++] = p[0];
	                    data[j++] = p[1];
	                    // x1, y1
	                    p[0] += data[i++];
	                    p[1] += data[i++];
	                    v2ApplyTransform(p, p, m);
	                    data[j++] = p[0];
	                    data[j++] = p[1];
	            }

	            for (k = 0; k < nPoint; k++) {
	                var p = points[k];
	                p[0] = data[i++];
	                p[1] = data[i++];

	                v2ApplyTransform(p, p, m);
	                // Write back
	                data[j++] = p[0];
	                data[j++] = p[1];
	            }
	        }
	    }

	    module.exports = transformPath;


/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Image element
	 * @module zrender/graphic/Image
	 */



	    var Displayable = __webpack_require__(45);
	    var BoundingRect = __webpack_require__(15);
	    var zrUtil = __webpack_require__(3);
	    var roundRectHelper = __webpack_require__(60);

	    var LRU = __webpack_require__(61);
	    var globalImageCache = new LRU(50);
	    /**
	     * @alias zrender/graphic/Image
	     * @extends module:zrender/graphic/Displayable
	     * @constructor
	     * @param {Object} opts
	     */
	    function ZImage(opts) {
	        Displayable.call(this, opts);
	    }

	    ZImage.prototype = {

	        constructor: ZImage,

	        type: 'image',

	        brush: function (ctx) {
	            var style = this.style;
	            var src = style.image;
	            var image;

	            // style.image is a url string
	            if (typeof src === 'string') {
	                image = this._image;
	            }
	            // style.image is an HTMLImageElement or HTMLCanvasElement or Canvas
	            else {
	                image = src;
	            }
	            // FIXME Case create many images with src
	            if (!image && src) {
	                // Try get from global image cache
	                var cachedImgObj = globalImageCache.get(src);
	                if (!cachedImgObj) {
	                    // Create a new image
	                    image = new Image();
	                    image.onload = function () {
	                        image.onload = null;
	                        for (var i = 0; i < cachedImgObj.pending.length; i++) {
	                            cachedImgObj.pending[i].dirty();
	                        }
	                    };
	                    cachedImgObj = {
	                        image: image,
	                        pending: [this]
	                    };
	                    image.src = src;
	                    globalImageCache.put(src, cachedImgObj);
	                    this._image = image;
	                    return;
	                }
	                else {
	                    image = cachedImgObj.image;
	                    this._image = image;
	                    // Image is not complete finish, add to pending list
	                    if (!image.width || !image.height) {
	                        cachedImgObj.pending.push(this);
	                        return;
	                    }
	                }
	            }

	            if (image) {
	                // 图片已经加载完成
	                // if (image.nodeName.toUpperCase() == 'IMG') {
	                //     if (!image.complete) {
	                //         return;
	                //     }
	                // }
	                // Else is canvas

	                var width = style.width || image.width;
	                var height = style.height || image.height;
	                var x = style.x || 0;
	                var y = style.y || 0;
	                // 图片加载失败
	                if (!image.width || !image.height) {
	                    return;
	                }

	                ctx.save();

	                style.bind(ctx);

	                // 设置transform
	                this.setTransform(ctx);

	                if (style.r) {
	                    // Border radius clipping
	                    // FIXME
	                    ctx.beginPath();
	                    roundRectHelper.buildPath(ctx, style);
	                    ctx.clip();
	                }

	                if (style.sWidth && style.sHeight) {
	                    var sx = style.sx || 0;
	                    var sy = style.sy || 0;
	                    ctx.drawImage(
	                        image,
	                        sx, sy, style.sWidth, style.sHeight,
	                        x, y, width, height
	                    );
	                }
	                else if (style.sx && style.sy) {
	                    var sx = style.sx;
	                    var sy = style.sy;
	                    var sWidth = width - sx;
	                    var sHeight = height - sy;
	                    ctx.drawImage(
	                        image,
	                        sx, sy, sWidth, sHeight,
	                        x, y, width, height
	                    );
	                }
	                else {
	                    ctx.drawImage(image, x, y, width, height);
	                }

	                // 如果没设置宽和高的话自动根据图片宽高设置
	                if (style.width == null) {
	                    style.width = width;
	                }
	                if (style.height == null) {
	                    style.height = height;
	                }

	                // Draw rect text
	                if (style.text != null) {
	                    this.drawRectText(ctx, this.getBoundingRect());
	                }

	                ctx.restore();
	            }
	        },

	        getBoundingRect: function () {
	            var style = this.style;
	            if (! this._rect) {
	                this._rect = new BoundingRect(
	                    style.x || 0, style.y || 0, style.width || 0, style.height || 0
	                );
	            }
	            return this._rect;
	        }
	    };

	    zrUtil.inherits(ZImage, Displayable);

	    module.exports = ZImage;


/***/ },
/* 60 */
/***/ function(module, exports) {

	

	    module.exports = {
	        buildPath: function (ctx, shape) {
	            var x = shape.x;
	            var y = shape.y;
	            var width = shape.width;
	            var height = shape.height;
	            var r = shape.r;
	            var r1;
	            var r2;
	            var r3;
	            var r4;

	            // Convert width and height to positive for better borderRadius
	            if (width < 0) {
	                x = x + width;
	                width = -width;
	            }
	            if (height < 0) {
	                y = y + height;
	                height = -height;
	            }

	            if (typeof r === 'number') {
	                r1 = r2 = r3 = r4 = r;
	            }
	            else if (r instanceof Array) {
	                if (r.length === 1) {
	                    r1 = r2 = r3 = r4 = r[0];
	                }
	                else if (r.length === 2) {
	                    r1 = r3 = r[0];
	                    r2 = r4 = r[1];
	                }
	                else if (r.length === 3) {
	                    r1 = r[0];
	                    r2 = r4 = r[1];
	                    r3 = r[2];
	                }
	                else {
	                    r1 = r[0];
	                    r2 = r[1];
	                    r3 = r[2];
	                    r4 = r[3];
	                }
	            }
	            else {
	                r1 = r2 = r3 = r4 = 0;
	            }

	            var total;
	            if (r1 + r2 > width) {
	                total = r1 + r2;
	                r1 *= width / total;
	                r2 *= width / total;
	            }
	            if (r3 + r4 > width) {
	                total = r3 + r4;
	                r3 *= width / total;
	                r4 *= width / total;
	            }
	            if (r2 + r3 > height) {
	                total = r2 + r3;
	                r2 *= height / total;
	                r3 *= height / total;
	            }
	            if (r1 + r4 > height) {
	                total = r1 + r4;
	                r1 *= height / total;
	                r4 *= height / total;
	            }
	            ctx.moveTo(x + r1, y);
	            ctx.lineTo(x + width - r2, y);
	            r2 !== 0 && ctx.quadraticCurveTo(
	                x + width, y, x + width, y + r2
	            );
	            ctx.lineTo(x + width, y + height - r3);
	            r3 !== 0 && ctx.quadraticCurveTo(
	                x + width, y + height, x + width - r3, y + height
	            );
	            ctx.lineTo(x + r4, y + height);
	            r4 !== 0 && ctx.quadraticCurveTo(
	                x, y + height, x, y + height - r4
	            );
	            ctx.lineTo(x, y + r1);
	            r1 !== 0 && ctx.quadraticCurveTo(x, y, x + r1, y);
	        }
	    };


/***/ },
/* 61 */
/***/ function(module, exports) {

	// Simple LRU cache use doubly linked list
	// @module zrender/core/LRU


	    /**
	     * Simple double linked list. Compared with array, it has O(1) remove operation.
	     * @constructor
	     */
	    var LinkedList = function() {

	        /**
	         * @type {module:zrender/core/LRU~Entry}
	         */
	        this.head = null;

	        /**
	         * @type {module:zrender/core/LRU~Entry}
	         */
	        this.tail = null;

	        this._len = 0;
	    };

	    var linkedListProto = LinkedList.prototype;
	    /**
	     * Insert a new value at the tail
	     * @param  {} val
	     * @return {module:zrender/core/LRU~Entry}
	     */
	    linkedListProto.insert = function(val) {
	        var entry = new Entry(val);
	        this.insertEntry(entry);
	        return entry;
	    };

	    /**
	     * Insert an entry at the tail
	     * @param  {module:zrender/core/LRU~Entry} entry
	     */
	    linkedListProto.insertEntry = function(entry) {
	        if (!this.head) {
	            this.head = this.tail = entry;
	        }
	        else {
	            this.tail.next = entry;
	            entry.prev = this.tail;
	            this.tail = entry;
	        }
	        this._len++;
	    };

	    /**
	     * Remove entry.
	     * @param  {module:zrender/core/LRU~Entry} entry
	     */
	    linkedListProto.remove = function(entry) {
	        var prev = entry.prev;
	        var next = entry.next;
	        if (prev) {
	            prev.next = next;
	        }
	        else {
	            // Is head
	            this.head = next;
	        }
	        if (next) {
	            next.prev = prev;
	        }
	        else {
	            // Is tail
	            this.tail = prev;
	        }
	        entry.next = entry.prev = null;
	        this._len--;
	    };

	    /**
	     * @return {number}
	     */
	    linkedListProto.len = function() {
	        return this._len;
	    };

	    /**
	     * @constructor
	     * @param {} val
	     */
	    var Entry = function(val) {
	        /**
	         * @type {}
	         */
	        this.value = val;

	        /**
	         * @type {module:zrender/core/LRU~Entry}
	         */
	        this.next;

	        /**
	         * @type {module:zrender/core/LRU~Entry}
	         */
	        this.prev;
	    };

	    /**
	     * LRU Cache
	     * @constructor
	     * @alias module:zrender/core/LRU
	     */
	    var LRU = function(maxSize) {

	        this._list = new LinkedList();

	        this._map = {};

	        this._maxSize = maxSize || 10;
	    };

	    var LRUProto = LRU.prototype;

	    /**
	     * @param  {string} key
	     * @param  {} value
	     */
	    LRUProto.put = function(key, value) {
	        var list = this._list;
	        var map = this._map;
	        if (map[key] == null) {
	            var len = list.len();
	            if (len >= this._maxSize && len > 0) {
	                // Remove the least recently used
	                var leastUsedEntry = list.head;
	                list.remove(leastUsedEntry);
	                delete map[leastUsedEntry.key];
	            }

	            var entry = list.insert(value);
	            entry.key = key;
	            map[key] = entry;
	        }
	    };

	    /**
	     * @param  {string} key
	     * @return {}
	     */
	    LRUProto.get = function(key) {
	        var entry = this._map[key];
	        var list = this._list;
	        if (entry != null) {
	            // Put the latest used entry in the tail
	            if (entry !== list.tail) {
	                list.remove(entry);
	                list.insertEntry(entry);
	            }

	            return entry.value;
	        }
	    };

	    /**
	     * Clear the cache
	     */
	    LRUProto.clear = function() {
	        this._list.clear();
	        this._map = {};
	    };

	    module.exports = LRU;


/***/ },
/* 62 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Text element
	 * @module zrender/graphic/Text
	 *
	 * TODO Wrapping
	 *
	 * Text not support gradient
	 */



	    var Displayable = __webpack_require__(45);
	    var zrUtil = __webpack_require__(3);
	    var textContain = __webpack_require__(14);

	    /**
	     * @alias zrender/graphic/Text
	     * @extends module:zrender/graphic/Displayable
	     * @constructor
	     * @param {Object} opts
	     */
	    var Text = function (opts) {
	        Displayable.call(this, opts);
	    };

	    Text.prototype = {

	        constructor: Text,

	        type: 'text',

	        brush: function (ctx) {
	            var style = this.style;
	            var x = style.x || 0;
	            var y = style.y || 0;
	            // Convert to string
	            var text = style.text;
	            var textFill = style.fill;
	            var textStroke = style.stroke;

	            // Convert to string
	            text != null && (text += '');

	            if (text) {
	                ctx.save();

	                this.style.bind(ctx);
	                this.setTransform(ctx);

	                textFill && (ctx.fillStyle = textFill);
	                textStroke && (ctx.strokeStyle = textStroke);

	                ctx.font = style.textFont || style.font;
	                ctx.textAlign = style.textAlign;

	                if (style.textVerticalAlign) {
	                    var rect = textContain.getBoundingRect(
	                        text, ctx.font, style.textAlign, 'top'
	                    );
	                    // Ignore textBaseline
	                    ctx.textBaseline = 'middle';
	                    switch (style.textVerticalAlign) {
	                        case 'middle':
	                            y -= rect.height / 2 - rect.lineHeight / 2;
	                            break;
	                        case 'bottom':
	                            y -= rect.height - rect.lineHeight / 2;
	                            break;
	                        default:
	                            y += rect.lineHeight / 2;
	                    }
	                }
	                else {
	                    ctx.textBaseline = style.textBaseline;
	                }
	                var lineHeight = textContain.measureText('国', ctx.font).width;

	                var textLines = text.split('\n');
	                for (var i = 0; i < textLines.length; i++) {
	                    textFill && ctx.fillText(textLines[i], x, y);
	                    textStroke && ctx.strokeText(textLines[i], x, y);
	                    y += lineHeight;
	                }

	                ctx.restore();
	            }
	        },

	        getBoundingRect: function () {
	            if (!this._rect) {
	                var style = this.style;
	                var textVerticalAlign = style.textVerticalAlign;
	                var rect = textContain.getBoundingRect(
	                    style.text + '', style.textFont || style.font, style.textAlign,
	                    textVerticalAlign ? 'top' : style.textBaseline
	                );
	                switch (textVerticalAlign) {
	                    case 'middle':
	                        rect.y -= rect.height / 2;
	                        break;
	                    case 'bottom':
	                        rect.y -= rect.height;
	                        break;
	                }
	                rect.x += style.x || 0;
	                rect.y += style.y || 0;
	                this._rect = rect;
	            }
	            return this._rect;
	        }
	    };

	    zrUtil.inherits(Text, Displayable);

	    module.exports = Text;


/***/ },
/* 63 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * 圆形
	 * @module zrender/shape/Circle
	 */



	    module.exports = __webpack_require__(44).extend({
	        
	        type: 'circle',

	        shape: {
	            cx: 0,
	            cy: 0,
	            r: 0
	        },

	        buildPath : function (ctx, shape) {
	            // Better stroking in ShapeBundle
	            ctx.moveTo(shape.cx + shape.r, shape.cy);
	            ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2, true);
	            return;
	        }
	    });



/***/ },
/* 64 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 扇形
	 * @module zrender/graphic/shape/Sector
	 */

	// FIXME clockwise seems wrong


	    module.exports = __webpack_require__(44).extend({

	        type: 'sector',

	        shape: {

	            cx: 0,

	            cy: 0,

	            r0: 0,

	            r: 0,

	            startAngle: 0,

	            endAngle: Math.PI * 2,

	            clockwise: true
	        },

	        buildPath: function (ctx, shape) {

	            var x = shape.cx;
	            var y = shape.cy;
	            var r0 = Math.max(shape.r0 || 0, 0);
	            var r = Math.max(shape.r, 0);
	            var startAngle = shape.startAngle;
	            var endAngle = shape.endAngle;
	            var clockwise = shape.clockwise;

	            var unitX = Math.cos(startAngle);
	            var unitY = Math.sin(startAngle);

	            ctx.moveTo(unitX * r0 + x, unitY * r0 + y);

	            ctx.lineTo(unitX * r + x, unitY * r + y);

	            ctx.arc(x, y, r, startAngle, endAngle, !clockwise);

	            ctx.lineTo(
	                Math.cos(endAngle) * r0 + x,
	                Math.sin(endAngle) * r0 + y
	            );

	            if (r0 !== 0) {
	                ctx.arc(x, y, r0, endAngle, startAngle, clockwise);
	            }

	            ctx.closePath();
	        }
	    });



/***/ },
/* 65 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 圆环
	 * @module zrender/graphic/shape/Ring
	 */


	    module.exports = __webpack_require__(44).extend({

	        type: 'ring',

	        shape: {
	            cx: 0,
	            cy: 0,
	            r: 0,
	            r0: 0
	        },

	        buildPath: function (ctx, shape) {
	            var x = shape.cx;
	            var y = shape.cy;
	            var PI2 = Math.PI * 2;
	            ctx.moveTo(x + shape.r, y);
	            ctx.arc(x, y, shape.r, 0, PI2, false);
	            ctx.moveTo(x + shape.r0, y);
	            ctx.arc(x, y, shape.r0, 0, PI2, true);
	        }
	    });



/***/ },
/* 66 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 多边形
	 * @module zrender/shape/Polygon
	 */


	    var polyHelper = __webpack_require__(67);

	    module.exports = __webpack_require__(44).extend({
	        
	        type: 'polygon',

	        shape: {
	            points: null,

	            smooth: false,

	            smoothConstraint: null
	        },

	        buildPath: function (ctx, shape) {
	            polyHelper.buildPath(ctx, shape, true);
	        }
	    });


/***/ },
/* 67 */
/***/ function(module, exports, __webpack_require__) {

	

	    var smoothSpline = __webpack_require__(68);
	    var smoothBezier = __webpack_require__(69);

	    module.exports = {
	        buildPath: function (ctx, shape, closePath) {
	            var points = shape.points;
	            var smooth = shape.smooth;
	            if (points && points.length >= 2) {
	                if (smooth && smooth !== 'spline') {
	                    var controlPoints = smoothBezier(
	                        points, smooth, closePath, shape.smoothConstraint
	                    );

	                    ctx.moveTo(points[0][0], points[0][1]);
	                    var len = points.length;
	                    for (var i = 0; i < (closePath ? len : len - 1); i++) {
	                        var cp1 = controlPoints[i * 2];
	                        var cp2 = controlPoints[i * 2 + 1];
	                        var p = points[(i + 1) % len];
	                        ctx.bezierCurveTo(
	                            cp1[0], cp1[1], cp2[0], cp2[1], p[0], p[1]
	                        );
	                    }
	                }
	                else {
	                    if (smooth === 'spline') {
	                        points = smoothSpline(points, closePath);
	                    }

	                    ctx.moveTo(points[0][0], points[0][1]);
	                    for (var i = 1, l = points.length; i < l; i++) {
	                        ctx.lineTo(points[i][0], points[i][1]);
	                    }
	                }

	                closePath && ctx.closePath();
	            }
	        }
	    };


/***/ },
/* 68 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Catmull-Rom spline 插值折线
	 * @module zrender/shape/util/smoothSpline
	 * @author pissang (https://www.github.com/pissang)
	 *         Kener (@Kener-林峰, kener.linfeng@gmail.com)
	 *         errorrik (errorrik@gmail.com)
	 */

	    var vec2 = __webpack_require__(16);

	    /**
	     * @inner
	     */
	    function interpolate(p0, p1, p2, p3, t, t2, t3) {
	        var v0 = (p2 - p0) * 0.5;
	        var v1 = (p3 - p1) * 0.5;
	        return (2 * (p1 - p2) + v0 + v1) * t3
	                + (-3 * (p1 - p2) - 2 * v0 - v1) * t2
	                + v0 * t + p1;
	    }

	    /**
	     * @alias module:zrender/shape/util/smoothSpline
	     * @param {Array} points 线段顶点数组
	     * @param {boolean} isLoop
	     * @return {Array}
	     */
	    module.exports = function (points, isLoop) {
	        var len = points.length;
	        var ret = [];

	        var distance = 0;
	        for (var i = 1; i < len; i++) {
	            distance += vec2.distance(points[i - 1], points[i]);
	        }

	        var segs = distance / 2;
	        segs = segs < len ? len : segs;
	        for (var i = 0; i < segs; i++) {
	            var pos = i / (segs - 1) * (isLoop ? len : len - 1);
	            var idx = Math.floor(pos);

	            var w = pos - idx;

	            var p0;
	            var p1 = points[idx % len];
	            var p2;
	            var p3;
	            if (!isLoop) {
	                p0 = points[idx === 0 ? idx : idx - 1];
	                p2 = points[idx > len - 2 ? len - 1 : idx + 1];
	                p3 = points[idx > len - 3 ? len - 1 : idx + 2];
	            }
	            else {
	                p0 = points[(idx - 1 + len) % len];
	                p2 = points[(idx + 1) % len];
	                p3 = points[(idx + 2) % len];
	            }

	            var w2 = w * w;
	            var w3 = w * w2;

	            ret.push([
	                interpolate(p0[0], p1[0], p2[0], p3[0], w, w2, w3),
	                interpolate(p0[1], p1[1], p2[1], p3[1], w, w2, w3)
	            ]);
	        }
	        return ret;
	    };



/***/ },
/* 69 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 贝塞尔平滑曲线
	 * @module zrender/shape/util/smoothBezier
	 * @author pissang (https://www.github.com/pissang)
	 *         Kener (@Kener-林峰, kener.linfeng@gmail.com)
	 *         errorrik (errorrik@gmail.com)
	 */


	    var vec2 = __webpack_require__(16);
	    var v2Min = vec2.min;
	    var v2Max = vec2.max;
	    var v2Scale = vec2.scale;
	    var v2Distance = vec2.distance;
	    var v2Add = vec2.add;

	    /**
	     * 贝塞尔平滑曲线
	     * @alias module:zrender/shape/util/smoothBezier
	     * @param {Array} points 线段顶点数组
	     * @param {number} smooth 平滑等级, 0-1
	     * @param {boolean} isLoop
	     * @param {Array} constraint 将计算出来的控制点约束在一个包围盒内
	     *                           比如 [[0, 0], [100, 100]], 这个包围盒会与
	     *                           整个折线的包围盒做一个并集用来约束控制点。
	     * @param {Array} 计算出来的控制点数组
	     */
	    module.exports = function (points, smooth, isLoop, constraint) {
	        var cps = [];

	        var v = [];
	        var v1 = [];
	        var v2 = [];
	        var prevPoint;
	        var nextPoint;

	        var min, max;
	        if (constraint) {
	            min = [Infinity, Infinity];
	            max = [-Infinity, -Infinity];
	            for (var i = 0, len = points.length; i < len; i++) {
	                v2Min(min, min, points[i]);
	                v2Max(max, max, points[i]);
	            }
	            // 与指定的包围盒做并集
	            v2Min(min, min, constraint[0]);
	            v2Max(max, max, constraint[1]);
	        }

	        for (var i = 0, len = points.length; i < len; i++) {
	            var point = points[i];

	            if (isLoop) {
	                prevPoint = points[i ? i - 1 : len - 1];
	                nextPoint = points[(i + 1) % len];
	            }
	            else {
	                if (i === 0 || i === len - 1) {
	                    cps.push(vec2.clone(points[i]));
	                    continue;
	                }
	                else {
	                    prevPoint = points[i - 1];
	                    nextPoint = points[i + 1];
	                }
	            }

	            vec2.sub(v, nextPoint, prevPoint);

	            // use degree to scale the handle length
	            v2Scale(v, v, smooth);

	            var d0 = v2Distance(point, prevPoint);
	            var d1 = v2Distance(point, nextPoint);
	            var sum = d0 + d1;
	            if (sum !== 0) {
	                d0 /= sum;
	                d1 /= sum;
	            }

	            v2Scale(v1, v, -d0);
	            v2Scale(v2, v, d1);
	            var cp0 = v2Add([], point, v1);
	            var cp1 = v2Add([], point, v2);
	            if (constraint) {
	                v2Max(cp0, cp0, min);
	                v2Min(cp0, cp0, max);
	                v2Max(cp1, cp1, min);
	                v2Min(cp1, cp1, max);
	            }
	            cps.push(cp0);
	            cps.push(cp1);
	        }

	        if (isLoop) {
	            cps.push(cps.shift());
	        }

	        return cps;
	    };



/***/ },
/* 70 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @module zrender/graphic/shape/Polyline
	 */


	    var polyHelper = __webpack_require__(67);

	    module.exports = __webpack_require__(44).extend({
	        
	        type: 'polyline',

	        shape: {
	            points: null,

	            smooth: false,

	            smoothConstraint: null
	        },

	        style: {
	            stroke: '#000',

	            fill: null
	        },

	        buildPath: function (ctx, shape) {
	            polyHelper.buildPath(ctx, shape, false);
	        }
	    });


/***/ },
/* 71 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 矩形
	 * @module zrender/graphic/shape/Rect
	 */


	    var roundRectHelper = __webpack_require__(60);

	    module.exports = __webpack_require__(44).extend({

	        type: 'rect',

	        shape: {
	            // 左上、右上、右下、左下角的半径依次为r1、r2、r3、r4
	            // r缩写为1         相当于 [1, 1, 1, 1]
	            // r缩写为[1]       相当于 [1, 1, 1, 1]
	            // r缩写为[1, 2]    相当于 [1, 2, 1, 2]
	            // r缩写为[1, 2, 3] 相当于 [1, 2, 3, 2]
	            r: 0,

	            x: 0,
	            y: 0,
	            width: 0,
	            height: 0
	        },

	        buildPath: function (ctx, shape) {
	            var x = shape.x;
	            var y = shape.y;
	            var width = shape.width;
	            var height = shape.height;
	            if (!shape.r) {
	                ctx.rect(x, y, width, height);
	            }
	            else {
	                roundRectHelper.buildPath(ctx, shape);
	            }
	            ctx.closePath();
	            return;
	        }
	    });



/***/ },
/* 72 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 直线
	 * @module zrender/graphic/shape/Line
	 */

	    module.exports = __webpack_require__(44).extend({

	        type: 'line',

	        shape: {
	            // Start point
	            x1: 0,
	            y1: 0,
	            // End point
	            x2: 0,
	            y2: 0,

	            percent: 1
	        },

	        style: {
	            stroke: '#000',
	            fill: null
	        },

	        buildPath: function (ctx, shape) {
	            var x1 = shape.x1;
	            var y1 = shape.y1;
	            var x2 = shape.x2;
	            var y2 = shape.y2;
	            var percent = shape.percent;

	            if (percent === 0) {
	                return;
	            }

	            ctx.moveTo(x1, y1);

	            if (percent < 1) {
	                x2 = x1 * (1 - percent) + x2 * percent;
	                y2 = y1 * (1 - percent) + y2 * percent;
	            }
	            ctx.lineTo(x2, y2);
	        },

	        /**
	         * Get point at percent
	         * @param  {number} percent
	         * @return {Array.<number>}
	         */
	        pointAt: function (p) {
	            var shape = this.shape;
	            return [
	                shape.x1 * (1 - p) + shape.x2 * p,
	                shape.y1 * (1 - p) + shape.y2 * p
	            ];
	        }
	    });



/***/ },
/* 73 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * 贝塞尔曲线
	 * @module zrender/shape/BezierCurve
	 */


	    var curveTool = __webpack_require__(49);
	    var vec2 = __webpack_require__(16);
	    var quadraticSubdivide = curveTool.quadraticSubdivide;
	    var cubicSubdivide = curveTool.cubicSubdivide;
	    var quadraticAt = curveTool.quadraticAt;
	    var cubicAt = curveTool.cubicAt;
	    var quadraticDerivativeAt = curveTool.quadraticDerivativeAt;
	    var cubicDerivativeAt = curveTool.cubicDerivativeAt;

	    var out = [];

	    function someVectorAt(shape, t, isTangent) {
	        var cpx2 = shape.cpx2;
	        var cpy2 = shape.cpy2;
	        if (cpx2 === null || cpy2 === null) {
	            return [
	                (isTangent ? cubicDerivativeAt : cubicAt)(shape.x1, shape.cpx1, shape.cpx2, shape.x2, t),
	                (isTangent ? cubicDerivativeAt : cubicAt)(shape.y1, shape.cpy1, shape.cpy2, shape.y2, t)
	            ];
	        }
	        else {
	            return [
	                (isTangent ? quadraticDerivativeAt : quadraticAt)(shape.x1, shape.cpx1, shape.x2, t),
	                (isTangent ? quadraticDerivativeAt : quadraticAt)(shape.y1, shape.cpy1, shape.y2, t)
	            ];
	        }
	    }
	    module.exports = __webpack_require__(44).extend({

	        type: 'bezier-curve',

	        shape: {
	            x1: 0,
	            y1: 0,
	            x2: 0,
	            y2: 0,
	            cpx1: 0,
	            cpy1: 0,
	            // cpx2: 0,
	            // cpy2: 0

	            // Curve show percent, for animating
	            percent: 1
	        },

	        style: {
	            stroke: '#000',
	            fill: null
	        },

	        buildPath: function (ctx, shape) {
	            var x1 = shape.x1;
	            var y1 = shape.y1;
	            var x2 = shape.x2;
	            var y2 = shape.y2;
	            var cpx1 = shape.cpx1;
	            var cpy1 = shape.cpy1;
	            var cpx2 = shape.cpx2;
	            var cpy2 = shape.cpy2;
	            var percent = shape.percent;
	            if (percent === 0) {
	                return;
	            }

	            ctx.moveTo(x1, y1);

	            if (cpx2 == null || cpy2 == null) {
	                if (percent < 1) {
	                    quadraticSubdivide(
	                        x1, cpx1, x2, percent, out
	                    );
	                    cpx1 = out[1];
	                    x2 = out[2];
	                    quadraticSubdivide(
	                        y1, cpy1, y2, percent, out
	                    );
	                    cpy1 = out[1];
	                    y2 = out[2];
	                }

	                ctx.quadraticCurveTo(
	                    cpx1, cpy1,
	                    x2, y2
	                );
	            }
	            else {
	                if (percent < 1) {
	                    cubicSubdivide(
	                        x1, cpx1, cpx2, x2, percent, out
	                    );
	                    cpx1 = out[1];
	                    cpx2 = out[2];
	                    x2 = out[3];
	                    cubicSubdivide(
	                        y1, cpy1, cpy2, y2, percent, out
	                    );
	                    cpy1 = out[1];
	                    cpy2 = out[2];
	                    y2 = out[3];
	                }
	                ctx.bezierCurveTo(
	                    cpx1, cpy1,
	                    cpx2, cpy2,
	                    x2, y2
	                );
	            }
	        },

	        /**
	         * Get point at percent
	         * @param  {number} t
	         * @return {Array.<number>}
	         */
	        pointAt: function (t) {
	            return someVectorAt(this.shape, t, false);
	        },

	        /**
	         * Get tangent at percent
	         * @param  {number} t
	         * @return {Array.<number>}
	         */
	        tangentAt: function (t) {
	            var p = someVectorAt(this.shape, t, true);
	            return vec2.normalize(p, p);
	        }
	    });



/***/ },
/* 74 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 圆弧
	 * @module zrender/graphic/shape/Arc
	 */
	 

	    module.exports = __webpack_require__(44).extend({

	        type: 'arc',

	        shape: {

	            cx: 0,

	            cy: 0,

	            r: 0,

	            startAngle: 0,

	            endAngle: Math.PI * 2,

	            clockwise: true
	        },

	        style: {

	            stroke: '#000',

	            fill: null
	        },

	        buildPath: function (ctx, shape) {

	            var x = shape.cx;
	            var y = shape.cy;
	            var r = Math.max(shape.r, 0);
	            var startAngle = shape.startAngle;
	            var endAngle = shape.endAngle;
	            var clockwise = shape.clockwise;

	            var unitX = Math.cos(startAngle);
	            var unitY = Math.sin(startAngle);

	            ctx.moveTo(unitX * r + x, unitY * r + y);
	            ctx.arc(x, y, r, startAngle, endAngle, !clockwise);
	        }
	    });


/***/ },
/* 75 */
/***/ function(module, exports, __webpack_require__) {

	// CompoundPath to improve performance


	    var Path = __webpack_require__(44);
	    module.exports = Path.extend({

	        type: 'compound',

	        shape: {

	            paths: null
	        },

	        _updatePathDirty: function () {
	            var dirtyPath = this.__dirtyPath;
	            var paths = this.shape.paths;
	            for (var i = 0; i < paths.length; i++) {
	                // Mark as dirty if any subpath is dirty
	                dirtyPath = dirtyPath || paths[i].__dirtyPath;
	            }
	            this.__dirtyPath = dirtyPath;
	            this.__dirty = this.__dirty || dirtyPath;
	        },

	        beforeBrush: function () {
	            this._updatePathDirty();
	            var paths = this.shape.paths || [];
	            var scale = this.getGlobalScale();
	            // Update path scale
	            for (var i = 0; i < paths.length; i++) {
	                paths[i].path.setScale(scale[0], scale[1]);
	            }
	        },

	        buildPath: function (ctx, shape) {
	            var paths = shape.paths || [];
	            for (var i = 0; i < paths.length; i++) {
	                paths[i].buildPath(ctx, paths[i].shape);
	            }
	        },

	        afterBrush: function () {
	            var paths = this.shape.paths;
	            for (var i = 0; i < paths.length; i++) {
	                paths[i].__dirtyPath = false;
	            }
	        },

	        getBoundingRect: function () {
	            this._updatePathDirty();
	            return Path.prototype.getBoundingRect.call(this);
	        }
	    });


/***/ },
/* 76 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var zrUtil = __webpack_require__(3);

	    var Gradient = __webpack_require__(4);

	    /**
	     * x, y, x2, y2 are all percent from 0 to 1
	     * @param {number} [x=0]
	     * @param {number} [y=0]
	     * @param {number} [x2=1]
	     * @param {number} [y2=0]
	     * @param {Array.<Object>} colorStops
	     */
	    var LinearGradient = function (x, y, x2, y2, colorStops) {
	        this.x = x == null ? 0 : x;

	        this.y = y == null ? 0 : y;

	        this.x2 = x2 == null ? 1 : x2;

	        this.y2 = y2 == null ? 0 : y2;

	        Gradient.call(this, colorStops);
	    };

	    LinearGradient.prototype = {

	        constructor: LinearGradient,

	        type: 'linear'
	    };

	    zrUtil.inherits(LinearGradient, Gradient);

	    module.exports = LinearGradient;


/***/ },
/* 77 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var zrUtil = __webpack_require__(3);

	    var Gradient = __webpack_require__(4);

	    /**
	     * x, y, r are all percent from 0 to 1
	     * @param {number} [x=0.5]
	     * @param {number} [y=0.5]
	     * @param {number} [r=0.5]
	     * @param {Array.<Object>} [colorStops]
	     */
	    var RadialGradient = function (x, y, r, colorStops) {
	        this.x = x == null ? 0.5 : x;

	        this.y = y == null ? 0.5 : y;

	        this.r = r == null ? 0.5 : r;

	        Gradient.call(this, colorStops);
	    };

	    RadialGradient.prototype = {

	        constructor: RadialGradient,

	        type: 'radial'
	    };

	    zrUtil.inherits(RadialGradient, Gradient);

	    module.exports = RadialGradient;


/***/ },
/* 78 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 * ZRender, a high performance 2d drawing library.
	 *
	 * Copyright (c) 2013, Baidu Inc.
	 * All rights reserved.
	 *
	 * LICENSE
	 * https://github.com/ecomfe/zrender/blob/master/LICENSE.txt
	 */
	// Global defines

	    var guid = __webpack_require__(31);
	    var env = __webpack_require__(79);

	    var Handler = __webpack_require__(80);
	    var Storage = __webpack_require__(84);
	    var Animation = __webpack_require__(85);

	    var useVML = !env.canvasSupported;

	    var painterCtors = {
	        canvas: __webpack_require__(86)
	    };

	    var instances = {};    // ZRender实例map索引

	    var zrender = {};
	    /**
	     * @type {string}
	     */
	    zrender.version = '3.1.0';

	    /**
	     * Initializing a zrender instance
	     * @param {HTMLElement} dom
	     * @param {Object} opts
	     * @param {string} [opts.renderer='canvas'] 'canvas' or 'svg'
	     * @param {number} [opts.devicePixelRatio]
	     * @return {module:zrender/ZRender}
	     */
	    zrender.init = function(dom, opts) {
	        var zr = new ZRender(guid(), dom, opts);
	        instances[zr.id] = zr;
	        return zr;
	    };

	    /**
	     * Dispose zrender instance
	     * @param {module:zrender/ZRender} zr
	     */
	    zrender.dispose = function (zr) {
	        if (zr) {
	            zr.dispose();
	        }
	        else {
	            for (var key in instances) {
	                instances[key].dispose();
	            }
	            instances = {};
	        }

	        return zrender;
	    };

	    /**
	     * Get zrender instance by id
	     * @param {string} id zrender instance id
	     * @return {module:zrender/ZRender}
	     */
	    zrender.getInstance = function (id) {
	        return instances[id];
	    };

	    zrender.registerPainter = function (name, Ctor) {
	        painterCtors[name] = Ctor;
	    };

	    function delInstance(id) {
	        delete instances[id];
	    }

	    /**
	     * @module zrender/ZRender
	     */
	    /**
	     * @constructor
	     * @alias module:zrender/ZRender
	     * @param {string} id
	     * @param {HTMLDomElement} dom
	     * @param {Object} opts
	     * @param {string} [opts.renderer='canvas'] 'canvas' or 'svg'
	     * @param {number} [opts.devicePixelRatio]
	     */
	    var ZRender = function(id, dom, opts) {

	        opts = opts || {};

	        /**
	         * @type {HTMLDomElement}
	         */
	        this.dom = dom;

	        /**
	         * @type {string}
	         */
	        this.id = id;

	        var self = this;
	        var storage = new Storage();

	        var rendererType = opts.renderer;
	        if (useVML) {
	            if (!painterCtors.vml) {
	                throw new Error('You need to require \'zrender/vml/vml\' to support IE8');
	            }
	            rendererType = 'vml';
	        }
	        else if (!rendererType || !painterCtors[rendererType]) {
	            rendererType = 'canvas';
	        }
	        var painter = new painterCtors[rendererType](dom, storage, opts);

	        this.storage = storage;
	        this.painter = painter;
	        if (!env.node) {
	            this.handler = new Handler(painter.getViewportRoot(), storage, painter);
	        }

	        /**
	         * @type {module:zrender/animation/Animation}
	         */
	        this.animation = new Animation({
	            stage: {
	                update: function () {
	                    if (self._needsRefresh) {
	                        self.refreshImmediately();
	                    }
	                }
	            }
	        });
	        this.animation.start();

	        /**
	         * @type {boolean}
	         * @private
	         */
	        this._needsRefresh;

	        // 修改 storage.delFromMap, 每次删除元素之前删除动画
	        // FIXME 有点ugly
	        var oldDelFromMap = storage.delFromMap;
	        var oldAddToMap = storage.addToMap;

	        storage.delFromMap = function (elId) {
	            var el = storage.get(elId);

	            oldDelFromMap.call(storage, elId);

	            el && el.removeSelfFromZr(self);
	        };

	        storage.addToMap = function (el) {
	            oldAddToMap.call(storage, el);

	            el.addSelfToZr(self);
	        };
	    };

	    ZRender.prototype = {

	        constructor: ZRender,
	        /**
	         * 获取实例唯一标识
	         * @return {string}
	         */
	        getId: function () {
	            return this.id;
	        },

	        /**
	         * 添加元素
	         * @param  {string|module:zrender/Element} el
	         */
	        add: function (el) {
	            this.storage.addRoot(el);
	            this._needsRefresh = true;
	        },

	        /**
	         * 删除元素
	         * @param  {string|module:zrender/Element} el
	         */
	        remove: function (el) {
	            this.storage.delRoot(el);
	            this._needsRefresh = true;
	        },

	        /**
	         * Change configuration of layer
	         * @param {string} zLevel
	         * @param {Object} config
	         * @param {string} [config.clearColor=0] Clear color
	         * @param {string} [config.motionBlur=false] If enable motion blur
	         * @param {number} [config.lastFrameAlpha=0.7] Motion blur factor. Larger value cause longer trailer
	        */
	        configLayer: function (zLevel, config) {
	            this.painter.configLayer(zLevel, config);
	            this._needsRefresh = true;
	        },

	        /**
	         * Repaint the canvas immediately
	         */
	        refreshImmediately: function () {
	            // Clear needsRefresh ahead to avoid something wrong happens in refresh
	            // Or it will cause zrender refreshes again and again.
	            this._needsRefresh = false;
	            this.painter.refresh();
	            /**
	             * Avoid trigger zr.refresh in Element#beforeUpdate hook
	             */
	            this._needsRefresh = false;
	        },

	        /**
	         * Mark and repaint the canvas in the next frame of browser
	         */
	        refresh: function() {
	            this._needsRefresh = true;
	        },

	        /**
	         * Resize the canvas.
	         * Should be invoked when container size is changed
	         */
	        resize: function() {
	            this.painter.resize();
	            this.handler && this.handler.resize();
	        },

	        /**
	         * Stop and clear all animation immediately
	         */
	        clearAnimation: function () {
	            this.animation.clear();
	        },

	        /**
	         * Get container width
	         */
	        getWidth: function() {
	            return this.painter.getWidth();
	        },

	        /**
	         * Get container height
	         */
	        getHeight: function() {
	            return this.painter.getHeight();
	        },

	        /**
	         * Export the canvas as Base64 URL
	         * @param {string} type
	         * @param {string} [backgroundColor='#fff']
	         * @return {string} Base64 URL
	         */
	        // toDataURL: function(type, backgroundColor) {
	        //     return this.painter.getRenderedCanvas({
	        //         backgroundColor: backgroundColor
	        //     }).toDataURL(type);
	        // },

	        /**
	         * Converting a path to image.
	         * It has much better performance of drawing image rather than drawing a vector path.
	         * @param {module:zrender/graphic/Path} e
	         * @param {number} width
	         * @param {number} height
	         */
	        pathToImage: function(e, width, height) {
	            var id = guid();
	            return this.painter.pathToImage(id, e, width, height);
	        },

	        /**
	         * Set default cursor
	         * @param {string} cursorStyle 例如 crosshair
	         */
	        setDefaultCursorStyle: function (cursorStyle) {
	            this.handler.setDefaultCursorStyle(cursorStyle);
	        },

	        /**
	         * Bind event
	         *
	         * @param {string} eventName Event name
	         * @param {Function} eventHandler Handler function
	         * @param {Object} [context] Context object
	         */
	        on: function(eventName, eventHandler, context) {
	            this.handler && this.handler.on(eventName, eventHandler, context);
	        },

	        /**
	         * Unbind event
	         * @param {string} eventName Event name
	         * @param {Function} [eventHandler] Handler function
	         */
	        off: function(eventName, eventHandler) {
	            this.handler && this.handler.off(eventName, eventHandler);
	        },

	        /**
	         * Trigger event manually
	         *
	         * @param {string} eventName Event name
	         * @param {event=} event Event object
	         */
	        trigger: function (eventName, event) {
	            this.handler && this.handler.trigger(eventName, event);
	        },


	        /**
	         * Clear all objects and the canvas.
	         */
	        clear: function () {
	            this.storage.delRoot();
	            this.painter.clear();
	        },

	        /**
	         * Dispose self.
	         */
	        dispose: function () {
	            this.animation.stop();

	            this.clear();
	            this.storage.dispose();
	            this.painter.dispose();
	            this.handler && this.handler.dispose();

	            this.animation =
	            this.storage =
	            this.painter =
	            this.handler = null;

	            delInstance(this.id);
	        }
	    };

	    module.exports = zrender;



/***/ },
/* 79 */
/***/ function(module, exports) {

	/**
	 * echarts设备环境识别
	 *
	 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
	 * @author firede[firede@firede.us]
	 * @desc thanks zepto.
	 */

	    var env = {};
	    if (typeof navigator === 'undefined') {
	        // In node
	        env = {
	            browser: {},
	            os: {},
	            node: true,
	            // Assume canvas is supported
	            canvasSupported: true
	        };
	    }
	    else {
	        env = detect(navigator.userAgent);
	    }

	    module.exports = env;

	    // Zepto.js
	    // (c) 2010-2013 Thomas Fuchs
	    // Zepto.js may be freely distributed under the MIT license.

	    function detect(ua) {
	        var os = {};
	        var browser = {};
	        var webkit = ua.match(/Web[kK]it[\/]{0,1}([\d.]+)/);
	        var android = ua.match(/(Android);?[\s\/]+([\d.]+)?/);
	        var ipad = ua.match(/(iPad).*OS\s([\d_]+)/);
	        var ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/);
	        var iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/);
	        var webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/);
	        var touchpad = webos && ua.match(/TouchPad/);
	        var kindle = ua.match(/Kindle\/([\d.]+)/);
	        var silk = ua.match(/Silk\/([\d._]+)/);
	        var blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/);
	        var bb10 = ua.match(/(BB10).*Version\/([\d.]+)/);
	        var rimtabletos = ua.match(/(RIM\sTablet\sOS)\s([\d.]+)/);
	        var playbook = ua.match(/PlayBook/);
	        var chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/);
	        var firefox = ua.match(/Firefox\/([\d.]+)/);
	        var safari = webkit && ua.match(/Mobile\//) && !chrome;
	        var webview = ua.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/) && !chrome;
	        var ie = ua.match(/MSIE\s([\d.]+)/)
	            // IE 11 Trident/7.0; rv:11.0
	            || ua.match(/Trident\/.+?rv:(([\d.]+))/);
	        var edge = ua.match(/Edge\/([\d.]+)/); // IE 12 and 12+

	        // Todo: clean this up with a better OS/browser seperation:
	        // - discern (more) between multiple browsers on android
	        // - decide if kindle fire in silk mode is android or not
	        // - Firefox on Android doesn't specify the Android version
	        // - possibly devide in os, device and browser hashes

	        if (browser.webkit = !!webkit) browser.version = webkit[1];

	        if (android) os.android = true, os.version = android[2];
	        if (iphone && !ipod) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.');
	        if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.');
	        if (ipod) os.ios = os.ipod = true, os.version = ipod[3] ? ipod[3].replace(/_/g, '.') : null;
	        if (webos) os.webos = true, os.version = webos[2];
	        if (touchpad) os.touchpad = true;
	        if (blackberry) os.blackberry = true, os.version = blackberry[2];
	        if (bb10) os.bb10 = true, os.version = bb10[2];
	        if (rimtabletos) os.rimtabletos = true, os.version = rimtabletos[2];
	        if (playbook) browser.playbook = true;
	        if (kindle) os.kindle = true, os.version = kindle[1];
	        if (silk) browser.silk = true, browser.version = silk[1];
	        if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true;
	        if (chrome) browser.chrome = true, browser.version = chrome[1];
	        if (firefox) browser.firefox = true, browser.version = firefox[1];
	        if (ie) browser.ie = true, browser.version = ie[1];
	        if (safari && (ua.match(/Safari/) || !!os.ios)) browser.safari = true;
	        if (webview) browser.webview = true;
	        if (ie) browser.ie = true, browser.version = ie[1];
	        if (edge) browser.edge = true, browser.version = edge[1];

	        os.tablet = !!(ipad || playbook || (android && !ua.match(/Mobile/)) ||
	            (firefox && ua.match(/Tablet/)) || (ie && !ua.match(/Phone/) && ua.match(/Touch/)));
	        os.phone  = !!(!os.tablet && !os.ipod && (android || iphone || webos || blackberry || bb10 ||
	            (chrome && ua.match(/Android/)) || (chrome && ua.match(/CriOS\/([\d.]+)/)) ||
	            (firefox && ua.match(/Mobile/)) || (ie && ua.match(/Touch/))));

	        return {
	            browser: browser,
	            os: os,
	            node: false,
	            // 原生canvas支持，改极端点了
	            // canvasSupported : !(browser.ie && parseFloat(browser.version) < 9)
	            canvasSupported : document.createElement('canvas').getContext ? true : false,
	            // @see <http://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript>
	            // works on most browsers
	            // IE10/11 does not support touch event, and MS Edge supports them but not by
	            // default, so we dont check navigator.maxTouchPoints for them here.
	            touchEventsSupported: 'ontouchstart' in window && !browser.ie && !browser.edge,
	            // <http://caniuse.com/#search=pointer%20event>.
	            pointerEventsSupported: 'onpointerdown' in window
	                // Firefox supports pointer but not by default,
	                // only MS browsers are reliable on pointer events currently.
	                && (browser.edge || (browser.ie && browser.version >= 10))
	        };
	    }


/***/ },
/* 80 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * Handler
	 * @module zrender/Handler
	 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
	 *         errorrik (errorrik@gmail.com)
	 *         pissang (shenyi.914@gmail.com)
	 */


	    var env = __webpack_require__(79);
	    var eventTool = __webpack_require__(81);
	    var util = __webpack_require__(3);
	    var Draggable = __webpack_require__(82);
	    var GestureMgr = __webpack_require__(83);

	    var Eventful = __webpack_require__(32);

	    var mouseHandlerNames = [
	        'click', 'dblclick', 'mousewheel', 'mouseout'
	    ];
	    !usePointerEvent() && mouseHandlerNames.push(
	        'mouseup', 'mousedown', 'mousemove'
	    );

	    var touchHandlerNames = [
	        'touchstart', 'touchend', 'touchmove'
	    ];

	    var pointerHandlerNames = [
	        'pointerdown', 'pointerup', 'pointermove'
	    ];

	    var TOUCH_CLICK_DELAY = 300;

	    var addEventListener = eventTool.addEventListener;
	    var removeEventListener = eventTool.removeEventListener;
	    var normalizeEvent = eventTool.normalizeEvent;

	    function makeEventPacket(eveType, target, event) {
	        return {
	            type: eveType,
	            event: event,
	            target: target,
	            cancelBubble: false,
	            offsetX: event.zrX,
	            offsetY: event.zrY,
	            gestureEvent: event.gestureEvent,
	            pinchX: event.pinchX,
	            pinchY: event.pinchY,
	            pinchScale: event.pinchScale,
	            wheelDelta: event.zrDelta
	        };
	    }

	    var domHandlers = {
	        /**
	         * Mouse move handler
	         * @inner
	         * @param {Event} event
	         */
	        mousemove: function (event) {
	            event = normalizeEvent(this.root, event);

	            var x = event.zrX;
	            var y = event.zrY;

	            var hovered = this.findHover(x, y, null);
	            var lastHovered = this._hovered;

	            this._hovered = hovered;

	            this.root.style.cursor = hovered ? hovered.cursor : this._defaultCursorStyle;
	            // Mouse out on previous hovered element
	            if (lastHovered && hovered !== lastHovered && lastHovered.__zr) {
	                this._dispatchProxy(lastHovered, 'mouseout', event);
	            }

	            // Mouse moving on one element
	            this._dispatchProxy(hovered, 'mousemove', event);

	            // Mouse over on a new element
	            if (hovered && hovered !== lastHovered) {
	                this._dispatchProxy(hovered, 'mouseover', event);
	            }
	        },

	        /**
	         * Mouse out handler
	         * @inner
	         * @param {Event} event
	         */
	        mouseout: function (event) {
	            event = normalizeEvent(this.root, event);

	            var element = event.toElement || event.relatedTarget;
	            if (element != this.root) {
	                while (element && element.nodeType != 9) {
	                    // 忽略包含在root中的dom引起的mouseOut
	                    if (element === this.root) {
	                        return;
	                    }

	                    element = element.parentNode;
	                }
	            }

	            this._dispatchProxy(this._hovered, 'mouseout', event);

	            this.trigger('globalout', {
	                event: event
	            });
	        },

	        /**
	         * Touch开始响应函数
	         * @inner
	         * @param {Event} event
	         */
	        touchstart: function (event) {
	            // Default mouse behaviour should not be disabled here.
	            // For example, page may needs to be slided.
	            // eventTool.stop(event);
	            event = normalizeEvent(this.root, event);

	            this._lastTouchMoment = new Date();

	            processGesture(this, event, 'start');

	            // 平板补充一次findHover
	            // this._mobileFindFixed(event);
	            // Trigger mousemove and mousedown
	            domHandlers.mousemove.call(this, event);

	            domHandlers.mousedown.call(this, event);

	            setTouchTimer(this);
	        },

	        /**
	         * Touch移动响应函数
	         * @inner
	         * @param {Event} event
	         */
	        touchmove: function (event) {
	            // eventTool.stop(event);// 阻止浏览器默认事件，重要
	            event = normalizeEvent(this.root, event);

	            processGesture(this, event, 'change');

	            // Mouse move should always be triggered no matter whether
	            // there is gestrue event, because mouse move and pinch may
	            // be used at the same time.
	            domHandlers.mousemove.call(this, event);

	            setTouchTimer(this);
	        },

	        /**
	         * Touch结束响应函数
	         * @inner
	         * @param {Event} event
	         */
	        touchend: function (event) {
	            // eventTool.stop(event);// 阻止浏览器默认事件，重要
	            event = normalizeEvent(this.root, event);

	            processGesture(this, event, 'end');

	            domHandlers.mouseup.call(this, event);

	            // click event should always be triggered no matter whether
	            // there is gestrue event. System click can not be prevented.
	            if (+new Date() - this._lastTouchMoment < TOUCH_CLICK_DELAY) {
	                // this._mobileFindFixed(event);
	                domHandlers.click.call(this, event);
	            }

	            setTouchTimer(this);
	        }
	    };

	    // Common handlers
	    util.each(['click', 'mousedown', 'mouseup', 'mousewheel', 'dblclick'], function (name) {
	        domHandlers[name] = function (event) {
	            event = normalizeEvent(this.root, event);
	            // Find hover again to avoid click event is dispatched manually. Or click is triggered without mouseover
	            var hovered = this.findHover(event.zrX, event.zrY, null);

	            if (name === 'mousedown') {
	                this._downel = hovered;
	                // In case click triggered before mouseup
	                this._upel = hovered;
	            }
	            else if (name === 'mosueup') {
	                this._upel = hovered;
	            }
	            else if (name === 'click') {
	                if (this._downel !== this._upel) {
	                    return;
	                }
	            }

	            this._dispatchProxy(hovered, name, event);
	        };
	    });

	    // Pointer event handlers
	    // util.each(['pointerdown', 'pointermove', 'pointerup'], function (name) {
	    //     domHandlers[name] = function (event) {
	    //         var mouseName = name.replace('pointer', 'mouse');
	    //         domHandlers[mouseName].call(this, event);
	    //     };
	    // });

	    function processGesture(zrHandler, event, stage) {
	        var gestureMgr = zrHandler._gestureMgr;

	        stage === 'start' && gestureMgr.clear();

	        var gestureInfo = gestureMgr.recognize(
	            event,
	            zrHandler.findHover(event.zrX, event.zrY, null)
	        );

	        stage === 'end' && gestureMgr.clear();

	        if (gestureInfo) {
	            // eventTool.stop(event);
	            var type = gestureInfo.type;
	            event.gestureEvent = type;

	            zrHandler._dispatchProxy(gestureInfo.target, type, gestureInfo.event);
	        }
	    }

	    /**
	     * 为控制类实例初始化dom 事件处理函数
	     *
	     * @inner
	     * @param {module:zrender/Handler} instance 控制类实例
	     */
	    function initDomHandler(instance) {
	        var handlerNames = touchHandlerNames.concat(pointerHandlerNames);
	        for (var i = 0; i < handlerNames.length; i++) {
	            var name = handlerNames[i];
	            instance._handlers[name] = util.bind(domHandlers[name], instance);
	        }

	        for (var i = 0; i < mouseHandlerNames.length; i++) {
	            var name = mouseHandlerNames[i];
	            instance._handlers[name] = makeMouseHandler(domHandlers[name], instance);
	        }

	        function makeMouseHandler(fn, instance) {
	            return function () {
	                if (instance._touching) {
	                    return;
	                }
	                return fn.apply(instance, arguments);
	            };
	        }
	    }

	    /**
	     * @alias module:zrender/Handler
	     * @constructor
	     * @extends module:zrender/mixin/Eventful
	     * @param {HTMLElement} root Main HTML element for painting.
	     * @param {module:zrender/Storage} storage Storage instance.
	     * @param {module:zrender/Painter} painter Painter instance.
	     */
	    var Handler = function(root, storage, painter) {
	        Eventful.call(this);

	        this.root = root;
	        this.storage = storage;
	        this.painter = painter;

	        /**
	         * @private
	         * @type {boolean}
	         */
	        this._hovered;

	        /**
	         * @private
	         * @type {Date}
	         */
	        this._lastTouchMoment;

	        /**
	         * @private
	         * @type {number}
	         */
	        this._lastX;

	        /**
	         * @private
	         * @type {number}
	         */
	        this._lastY;

	        /**
	         * @private
	         * @type {string}
	         */
	        this._defaultCursorStyle = 'default';

	        /**
	         * @private
	         * @type {module:zrender/core/GestureMgr}
	         */
	        this._gestureMgr = new GestureMgr();

	        /**
	         * @private
	         * @type {Array.<Function>}
	         */
	        this._handlers = [];

	        /**
	         * @private
	         * @type {boolean}
	         */
	        this._touching = false;

	        /**
	         * @private
	         * @type {number}
	         */
	        this._touchTimer;

	        initDomHandler(this);

	        if (usePointerEvent()) {
	            mountHandlers(pointerHandlerNames, this);
	        }
	        else if (useTouchEvent()) {
	            mountHandlers(touchHandlerNames, this);

	            // Handler of 'mouseout' event is needed in touch mode, which will be mounted below.
	            // addEventListener(root, 'mouseout', this._mouseoutHandler);
	        }

	        // Considering some devices that both enable touch and mouse event (like MS Surface
	        // and lenovo X240, @see #2350), we make mouse event be always listened, otherwise
	        // mouse event can not be handle in those devices.
	        mountHandlers(mouseHandlerNames, this);

	        Draggable.call(this);

	        function mountHandlers(handlerNames, instance) {
	            util.each(handlerNames, function (name) {
	                addEventListener(root, eventNameFix(name), instance._handlers[name]);
	            }, instance);
	        }
	    };

	    Handler.prototype = {

	        constructor: Handler,

	        /**
	         * Resize
	         */
	        resize: function (event) {
	            this._hovered = null;
	        },

	        /**
	         * Dispatch event
	         * @param {string} eventName
	         * @param {event=} eventArgs
	         */
	        dispatch: function (eventName, eventArgs) {
	            var handler = this._handlers[eventName];
	            handler && handler.call(this, eventArgs);
	        },

	        /**
	         * Dispose
	         */
	        dispose: function () {
	            var root = this.root;

	            var handlerNames = mouseHandlerNames.concat(touchHandlerNames);

	            for (var i = 0; i < handlerNames.length; i++) {
	                var name = handlerNames[i];
	                removeEventListener(root, eventNameFix(name), this._handlers[name]);
	            }

	            this.root =
	            this.storage =
	            this.painter = null;
	        },

	        /**
	         * 设置默认的cursor style
	         * @param {string} cursorStyle 例如 crosshair
	         */
	        setDefaultCursorStyle: function (cursorStyle) {
	            this._defaultCursorStyle = cursorStyle;
	        },

	        /**
	         * 事件分发代理
	         *
	         * @private
	         * @param {Object} targetEl 目标图形元素
	         * @param {string} eventName 事件名称
	         * @param {Object} event 事件对象
	         */
	        _dispatchProxy: function (targetEl, eventName, event) {
	            var eventHandler = 'on' + eventName;
	            var eventPacket = makeEventPacket(eventName, targetEl, event);

	            var el = targetEl;

	            while (el) {
	                el[eventHandler]
	                    && (eventPacket.cancelBubble = el[eventHandler].call(el, eventPacket));

	                el.trigger(eventName, eventPacket);

	                el = el.parent;

	                if (eventPacket.cancelBubble) {
	                    break;
	                }
	            }

	            if (!eventPacket.cancelBubble) {
	                // 冒泡到顶级 zrender 对象
	                this.trigger(eventName, eventPacket);
	                // 分发事件到用户自定义层
	                // 用户有可能在全局 click 事件中 dispose，所以需要判断下 painter 是否存在
	                this.painter && this.painter.eachOtherLayer(function (layer) {
	                    if (typeof(layer[eventHandler]) == 'function') {
	                        layer[eventHandler].call(layer, eventPacket);
	                    }
	                    if (layer.trigger) {
	                        layer.trigger(eventName, eventPacket);
	                    }
	                });
	            }
	        },

	        /**
	         * @private
	         * @param {number} x
	         * @param {number} y
	         * @param {module:zrender/graphic/Displayable} exclude
	         * @method
	         */
	        findHover: function(x, y, exclude) {
	            var list = this.storage.getDisplayList();
	            for (var i = list.length - 1; i >= 0 ; i--) {
	                if (!list[i].silent
	                 && list[i] !== exclude
	                 // getDisplayList may include ignored item in VML mode
	                 && !list[i].ignore
	                 && isHover(list[i], x, y)) {
	                    return list[i];
	                }
	            }
	        }
	    };

	    function isHover(displayable, x, y) {
	        if (displayable[displayable.rectHover ? 'rectContain' : 'contain'](x, y)) {
	            var el = displayable;
	            while (el) {
	                // If ancestor is silent or clipped by ancestor
	                if (el.silent || (el.clipPath && !el.clipPath.contain(x, y)))  {
	                    return false;
	                }
	                el = el.parent;
	            }
	            return true;
	        }

	        return false;
	    }

	    /**
	     * Prevent mouse event from being dispatched after Touch Events action
	     * @see <https://github.com/deltakosh/handjs/blob/master/src/hand.base.js>
	     * 1. Mobile browsers dispatch mouse events 300ms after touchend.
	     * 2. Chrome for Android dispatch mousedown for long-touch about 650ms
	     * Result: Blocking Mouse Events for 700ms.
	     */
	    function setTouchTimer(instance) {
	        instance._touching = true;
	        clearTimeout(instance._touchTimer);
	        instance._touchTimer = setTimeout(function () {
	            instance._touching = false;
	        }, 700);
	    }

	    /**
	     * Althought MS Surface support screen touch, IE10/11 do not support
	     * touch event and MS Edge supported them but not by default (but chrome
	     * and firefox do). Thus we use Pointer event on MS browsers to handle touch.
	     */
	    function usePointerEvent() {
	        // TODO
	        // pointermove event dont trigger when using finger.
	        // We may figger it out latter.
	        return false;
	        // return env.pointerEventsSupported
	            // In no-touch device we dont use pointer evnets but just
	            // use mouse event for avoiding problems.
	            // && window.navigator.maxTouchPoints;
	    }

	    function useTouchEvent() {
	        return env.touchEventsSupported;
	    }

	    function eventNameFix(name) {
	        return (name === 'mousewheel' && env.browser.firefox) ? 'DOMMouseScroll' : name;
	    }

	    util.mixin(Handler, Eventful);
	    util.mixin(Handler, Draggable);

	    module.exports = Handler;


/***/ },
/* 81 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * 事件辅助类
	 * @module zrender/core/event
	 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
	 */


	    var Eventful = __webpack_require__(32);

	    var isDomLevel2 = (typeof window !== 'undefined') && !!window.addEventListener;

	    function getBoundingClientRect(el) {
	        // BlackBerry 5, iOS 3 (original iPhone) don't have getBoundingRect
	        return el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 0, top: 0};
	    }
	    /**
	     * 如果存在第三方嵌入的一些dom触发的事件，或touch事件，需要转换一下事件坐标
	     */
	    function normalizeEvent(el, e) {

	        e = e || window.event;

	        if (e.zrX != null) {
	            return e;
	        }

	        var eventType = e.type;
	        var isTouch = eventType && eventType.indexOf('touch') >= 0;

	        if (!isTouch) {
	            var box = getBoundingClientRect(el);
	            e.zrX = e.clientX - box.left;
	            e.zrY = e.clientY - box.top;
	            e.zrDelta = (e.wheelDelta) ? e.wheelDelta / 120 : -(e.detail || 0) / 3;
	        }
	        else {
	            var touch = eventType != 'touchend'
	                            ? e.targetTouches[0]
	                            : e.changedTouches[0];
	            if (touch) {
	                var rBounding = getBoundingClientRect(el);
	                // touch事件坐标是全屏的~
	                e.zrX = touch.clientX - rBounding.left;
	                e.zrY = touch.clientY - rBounding.top;
	            }
	        }

	        return e;
	    }

	    function addEventListener(el, name, handler) {
	        if (isDomLevel2) {
	            el.addEventListener(name, handler);
	        }
	        else {
	            el.attachEvent('on' + name, handler);
	        }
	    }

	    function removeEventListener(el, name, handler) {
	        if (isDomLevel2) {
	            el.removeEventListener(name, handler);
	        }
	        else {
	            el.detachEvent('on' + name, handler);
	        }
	    }

	    /**
	     * 停止冒泡和阻止默认行为
	     * @memberOf module:zrender/core/event
	     * @method
	     * @param {Event} e : event对象
	     */
	    var stop = isDomLevel2
	        ? function (e) {
	            e.preventDefault();
	            e.stopPropagation();
	            e.cancelBubble = true;
	        }
	        : function (e) {
	            e.returnValue = false;
	            e.cancelBubble = true;
	        };

	    module.exports = {
	        normalizeEvent: normalizeEvent,
	        addEventListener: addEventListener,
	        removeEventListener: removeEventListener,

	        stop: stop,
	        // 做向上兼容
	        Dispatcher: Eventful
	    };



/***/ },
/* 82 */
/***/ function(module, exports) {

	// TODO Draggable for group
	// FIXME Draggable on element which has parent rotation or scale

	    function Draggable() {

	        this.on('mousedown', this._dragStart, this);
	        this.on('mousemove', this._drag, this);
	        this.on('mouseup', this._dragEnd, this);
	        this.on('globalout', this._dragEnd, this);
	        // this._dropTarget = null;
	        // this._draggingTarget = null;

	        // this._x = 0;
	        // this._y = 0;
	    }

	    Draggable.prototype = {

	        constructor: Draggable,

	        _dragStart: function (e) {
	            var draggingTarget = e.target;
	            if (draggingTarget && draggingTarget.draggable) {
	                this._draggingTarget = draggingTarget;
	                draggingTarget.dragging = true;
	                this._x = e.offsetX;
	                this._y = e.offsetY;

	                this._dispatchProxy(draggingTarget, 'dragstart', e.event);
	            }
	        },

	        _drag: function (e) {
	            var draggingTarget = this._draggingTarget;
	            if (draggingTarget) {

	                var x = e.offsetX;
	                var y = e.offsetY;

	                var dx = x - this._x;
	                var dy = y - this._y;
	                this._x = x;
	                this._y = y;

	                draggingTarget.drift(dx, dy, e);
	                this._dispatchProxy(draggingTarget, 'drag', e.event);

	                var dropTarget = this.findHover(x, y, draggingTarget);
	                var lastDropTarget = this._dropTarget;
	                this._dropTarget = dropTarget;

	                if (draggingTarget !== dropTarget) {
	                    if (lastDropTarget && dropTarget !== lastDropTarget) {
	                        this._dispatchProxy(lastDropTarget, 'dragleave', e.event);
	                    }
	                    if (dropTarget && dropTarget !== lastDropTarget) {
	                        this._dispatchProxy(dropTarget, 'dragenter', e.event);
	                    }
	                }
	            }
	        },

	        _dragEnd: function (e) {
	            var draggingTarget = this._draggingTarget;

	            if (draggingTarget) {
	                draggingTarget.dragging = false;
	            }

	            this._dispatchProxy(draggingTarget, 'dragend', e.event);

	            if (this._dropTarget) {
	                this._dispatchProxy(this._dropTarget, 'drop', e.event);
	            }

	            this._draggingTarget = null;
	            this._dropTarget = null;
	        }

	    };

	    module.exports = Draggable;


/***/ },
/* 83 */
/***/ function(module, exports) {

	'use strict';
	/**
	 * Only implements needed gestures for mobile.
	 */


	    var GestureMgr = function () {

	        /**
	         * @private
	         * @type {Array.<Object>}
	         */
	        this._track = [];
	    };

	    GestureMgr.prototype = {

	        constructor: GestureMgr,

	        recognize: function (event, target) {
	            this._doTrack(event, target);
	            return this._recognize(event);
	        },

	        clear: function () {
	            this._track.length = 0;
	            return this;
	        },

	        _doTrack: function (event, target) {
	            var touches = event.touches;

	            if (!touches) {
	                return;
	            }

	            var trackItem = {
	                points: [],
	                touches: [],
	                target: target,
	                event: event
	            };

	            for (var i = 0, len = touches.length; i < len; i++) {
	                var touch = touches[i];
	                trackItem.points.push([touch.clientX, touch.clientY]);
	                trackItem.touches.push(touch);
	            }

	            this._track.push(trackItem);
	        },

	        _recognize: function (event) {
	            for (var eventName in recognizers) {
	                if (recognizers.hasOwnProperty(eventName)) {
	                    var gestureInfo = recognizers[eventName](this._track, event);
	                    if (gestureInfo) {
	                        return gestureInfo;
	                    }
	                }
	            }
	        }
	    };

	    function dist(pointPair) {
	        var dx = pointPair[1][0] - pointPair[0][0];
	        var dy = pointPair[1][1] - pointPair[0][1];

	        return Math.sqrt(dx * dx + dy * dy);
	    }

	    function center(pointPair) {
	        return [
	            (pointPair[0][0] + pointPair[1][0]) / 2,
	            (pointPair[0][1] + pointPair[1][1]) / 2
	        ];
	    }

	    var recognizers = {

	        pinch: function (track, event) {
	            var trackLen = track.length;

	            if (!trackLen) {
	                return;
	            }

	            var pinchEnd = (track[trackLen - 1] || {}).points;
	            var pinchPre = (track[trackLen - 2] || {}).points || pinchEnd;

	            if (pinchPre
	                && pinchPre.length > 1
	                && pinchEnd
	                && pinchEnd.length > 1
	            ) {
	                var pinchScale = dist(pinchEnd) / dist(pinchPre);
	                !isFinite(pinchScale) && (pinchScale = 1);

	                event.pinchScale = pinchScale;

	                var pinchCenter = center(pinchEnd);
	                event.pinchX = pinchCenter[0];
	                event.pinchY = pinchCenter[1];

	                return {
	                    type: 'pinch',
	                    target: track[0].target,
	                    event: event
	                };
	            }
	        }

	        // Only pinch currently.
	    };

	    module.exports = GestureMgr;



/***/ },
/* 84 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * Storage内容仓库模块
	 * @module zrender/Storage
	 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
	 * @author errorrik (errorrik@gmail.com)
	 * @author pissang (https://github.com/pissang/)
	 */


	    var util = __webpack_require__(3);

	    var Group = __webpack_require__(29);

	    function shapeCompareFunc(a, b) {
	        if (a.zlevel === b.zlevel) {
	            if (a.z === b.z) {
	                if (a.z2 === b.z2) {
	                    return a.__renderidx - b.__renderidx;
	                }
	                return a.z2 - b.z2;
	            }
	            return a.z - b.z;
	        }
	        return a.zlevel - b.zlevel;
	    }
	    /**
	     * 内容仓库 (M)
	     * @alias module:zrender/Storage
	     * @constructor
	     */
	    var Storage = function () {
	        // 所有常规形状，id索引的map
	        this._elements = {};

	        this._roots = [];

	        this._displayList = [];

	        this._displayListLen = 0;
	    };

	    Storage.prototype = {

	        constructor: Storage,

	        /**
	         * 返回所有图形的绘制队列
	         * @param {boolean} [update=false] 是否在返回前更新该数组
	         * @param {boolean} [includeIgnore=false] 是否包含 ignore 的数组, 在 update 为 true 的时候有效
	         *
	         * 详见{@link module:zrender/graphic/Displayable.prototype.updateDisplayList}
	         * @return {Array.<module:zrender/graphic/Displayable>}
	         */
	        getDisplayList: function (update, includeIgnore) {
	            includeIgnore = includeIgnore || false;
	            if (update) {
	                this.updateDisplayList(includeIgnore);
	            }
	            return this._displayList;
	        },

	        /**
	         * 更新图形的绘制队列。
	         * 每次绘制前都会调用，该方法会先深度优先遍历整个树，更新所有Group和Shape的变换并且把所有可见的Shape保存到数组中，
	         * 最后根据绘制的优先级（zlevel > z > 插入顺序）排序得到绘制队列
	         * @param {boolean} [includeIgnore=false] 是否包含 ignore 的数组
	         */
	        updateDisplayList: function (includeIgnore) {
	            this._displayListLen = 0;
	            var roots = this._roots;
	            var displayList = this._displayList;
	            for (var i = 0, len = roots.length; i < len; i++) {
	                this._updateAndAddDisplayable(roots[i], null, includeIgnore);
	            }
	            displayList.length = this._displayListLen;

	            for (var i = 0, len = displayList.length; i < len; i++) {
	                displayList[i].__renderidx = i;
	            }

	            displayList.sort(shapeCompareFunc);
	        },

	        _updateAndAddDisplayable: function (el, clipPaths, includeIgnore) {

	            if (el.ignore && !includeIgnore) {
	                return;
	            }

	            el.beforeUpdate();

	            el.update();

	            el.afterUpdate();

	            var clipPath = el.clipPath;
	            if (clipPath) {
	                // clipPath 的变换是基于 group 的变换
	                clipPath.parent = el;
	                clipPath.updateTransform();

	                // FIXME 效率影响
	                if (clipPaths) {
	                    clipPaths = clipPaths.slice();
	                    clipPaths.push(clipPath);
	                }
	                else {
	                    clipPaths = [clipPath];
	                }
	            }

	            if (el.type == 'group') {
	                var children = el._children;

	                for (var i = 0; i < children.length; i++) {
	                    var child = children[i];

	                    // Force to mark as dirty if group is dirty
	                    // FIXME __dirtyPath ?
	                    child.__dirty = el.__dirty || child.__dirty;

	                    this._updateAndAddDisplayable(child, clipPaths, includeIgnore);
	                }

	                // Mark group clean here
	                el.__dirty = false;

	            }
	            else {
	                el.__clipPaths = clipPaths;

	                this._displayList[this._displayListLen++] = el;
	            }
	        },

	        /**
	         * 添加图形(Shape)或者组(Group)到根节点
	         * @param {module:zrender/Element} el
	         */
	        addRoot: function (el) {
	            // Element has been added
	            if (this._elements[el.id]) {
	                return;
	            }

	            if (el instanceof Group) {
	                el.addChildrenToStorage(this);
	            }

	            this.addToMap(el);
	            this._roots.push(el);
	        },

	        /**
	         * 删除指定的图形(Shape)或者组(Group)
	         * @param {string|Array.<string>} [elId] 如果为空清空整个Storage
	         */
	        delRoot: function (elId) {
	            if (elId == null) {
	                // 不指定elId清空
	                for (var i = 0; i < this._roots.length; i++) {
	                    var root = this._roots[i];
	                    if (root instanceof Group) {
	                        root.delChildrenFromStorage(this);
	                    }
	                }

	                this._elements = {};
	                this._roots = [];
	                this._displayList = [];
	                this._displayListLen = 0;

	                return;
	            }

	            if (elId instanceof Array) {
	                for (var i = 0, l = elId.length; i < l; i++) {
	                    this.delRoot(elId[i]);
	                }
	                return;
	            }

	            var el;
	            if (typeof(elId) == 'string') {
	                el = this._elements[elId];
	            }
	            else {
	                el = elId;
	            }

	            var idx = util.indexOf(this._roots, el);
	            if (idx >= 0) {
	                this.delFromMap(el.id);
	                this._roots.splice(idx, 1);
	                if (el instanceof Group) {
	                    el.delChildrenFromStorage(this);
	                }
	            }
	        },

	        addToMap: function (el) {
	            if (el instanceof Group) {
	                el.__storage = this;
	            }
	            el.dirty();

	            this._elements[el.id] = el;

	            return this;
	        },

	        get: function (elId) {
	            return this._elements[elId];
	        },

	        delFromMap: function (elId) {
	            var elements = this._elements;
	            var el = elements[elId];
	            if (el) {
	                delete elements[elId];
	                if (el instanceof Group) {
	                    el.__storage = null;
	                }
	            }

	            return this;
	        },

	        /**
	         * 清空并且释放Storage
	         */
	        dispose: function () {
	            this._elements =
	            this._renderList =
	            this._roots = null;
	        }
	    };

	    module.exports = Storage;



/***/ },
/* 85 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * 动画主类, 调度和管理所有动画控制器
	 *
	 * @module zrender/animation/Animation
	 * @author pissang(https://github.com/pissang)
	 */
	// TODO Additive animation
	// http://iosoteric.com/additive-animations-animatewithduration-in-ios-8/
	// https://developer.apple.com/videos/wwdc2014/#236


	    var util = __webpack_require__(3);
	    var Dispatcher = __webpack_require__(81).Dispatcher;

	    var requestAnimationFrame = (typeof window !== 'undefined' &&
	                                    (window.requestAnimationFrame
	                                    || window.msRequestAnimationFrame
	                                    || window.mozRequestAnimationFrame
	                                    || window.webkitRequestAnimationFrame))
	                                || function (func) {
	                                    setTimeout(func, 16);
	                                };

	    var Animator = __webpack_require__(35);
	    /**
	     * @typedef {Object} IZRenderStage
	     * @property {Function} update
	     */

	    /**
	     * @alias module:zrender/animation/Animation
	     * @constructor
	     * @param {Object} [options]
	     * @param {Function} [options.onframe]
	     * @param {IZRenderStage} [options.stage]
	     * @example
	     *     var animation = new Animation();
	     *     var obj = {
	     *         x: 100,
	     *         y: 100
	     *     };
	     *     animation.animate(node.position)
	     *         .when(1000, {
	     *             x: 500,
	     *             y: 500
	     *         })
	     *         .when(2000, {
	     *             x: 100,
	     *             y: 100
	     *         })
	     *         .start('spline');
	     */
	    var Animation = function (options) {

	        options = options || {};

	        this.stage = options.stage || {};

	        this.onframe = options.onframe || function() {};

	        // private properties
	        this._clips = [];

	        this._running = false;

	        this._time = 0;

	        Dispatcher.call(this);
	    };

	    Animation.prototype = {

	        constructor: Animation,
	        /**
	         * 添加 clip
	         * @param {module:zrender/animation/Clip} clip
	         */
	        addClip: function (clip) {
	            this._clips.push(clip);
	        },
	        /**
	         * 添加 animator
	         * @param {module:zrender/animation/Animator} animator
	         */
	        addAnimator: function (animator) {
	            animator.animation = this;
	            var clips = animator.getClips();
	            for (var i = 0; i < clips.length; i++) {
	                this.addClip(clips[i]);
	            }
	        },
	        /**
	         * 删除动画片段
	         * @param {module:zrender/animation/Clip} clip
	         */
	        removeClip: function(clip) {
	            var idx = util.indexOf(this._clips, clip);
	            if (idx >= 0) {
	                this._clips.splice(idx, 1);
	            }
	        },

	        /**
	         * 删除动画片段
	         * @param {module:zrender/animation/Animator} animator
	         */
	        removeAnimator: function (animator) {
	            var clips = animator.getClips();
	            for (var i = 0; i < clips.length; i++) {
	                this.removeClip(clips[i]);
	            }
	            animator.animation = null;
	        },

	        _update: function() {

	            var time = new Date().getTime();
	            var delta = time - this._time;
	            var clips = this._clips;
	            var len = clips.length;

	            var deferredEvents = [];
	            var deferredClips = [];
	            for (var i = 0; i < len; i++) {
	                var clip = clips[i];
	                var e = clip.step(time);
	                // Throw out the events need to be called after
	                // stage.update, like destroy
	                if (e) {
	                    deferredEvents.push(e);
	                    deferredClips.push(clip);
	                }
	            }

	            // Remove the finished clip
	            for (var i = 0; i < len;) {
	                if (clips[i]._needsRemove) {
	                    clips[i] = clips[len - 1];
	                    clips.pop();
	                    len--;
	                }
	                else {
	                    i++;
	                }
	            }

	            len = deferredEvents.length;
	            for (var i = 0; i < len; i++) {
	                deferredClips[i].fire(deferredEvents[i]);
	            }

	            this._time = time;

	            this.onframe(delta);

	            this.trigger('frame', delta);

	            if (this.stage.update) {
	                this.stage.update();
	            }
	        },
	        /**
	         * 开始运行动画
	         */
	        start: function () {
	            var self = this;

	            this._running = true;

	            function step() {
	                if (self._running) {

	                    requestAnimationFrame(step);

	                    self._update();
	                }
	            }

	            this._time = new Date().getTime();
	            requestAnimationFrame(step);
	        },
	        /**
	         * 停止运行动画
	         */
	        stop: function () {
	            this._running = false;
	        },
	        /**
	         * 清除所有动画片段
	         */
	        clear: function () {
	            this._clips = [];
	        },
	        /**
	         * 对一个目标创建一个animator对象，可以指定目标中的属性使用动画
	         * @param  {Object} target
	         * @param  {Object} options
	         * @param  {boolean} [options.loop=false] 是否循环播放动画
	         * @param  {Function} [options.getter=null]
	         *         如果指定getter函数，会通过getter函数取属性值
	         * @param  {Function} [options.setter=null]
	         *         如果指定setter函数，会通过setter函数设置属性值
	         * @return {module:zrender/animation/Animation~Animator}
	         */
	        animate: function (target, options) {
	            options = options || {};
	            var animator = new Animator(
	                target,
	                options.loop,
	                options.getter,
	                options.setter
	            );

	            return animator;
	        }
	    };

	    util.mixin(Animation, Dispatcher);

	    module.exports = Animation;



/***/ },
/* 86 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * Default canvas painter
	 * @module zrender/Painter
	 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
	 *         errorrik (errorrik@gmail.com)
	 *         pissang (https://www.github.com/pissang)
	 */
	 

	    var config = __webpack_require__(40);
	    var util = __webpack_require__(3);
	    var log = __webpack_require__(39);
	    var BoundingRect = __webpack_require__(15);

	    var Layer = __webpack_require__(87);

	    function parseInt10(val) {
	        return parseInt(val, 10);
	    }

	    function isLayerValid(layer) {
	        if (!layer) {
	            return false;
	        }

	        if (layer.isBuildin) {
	            return true;
	        }

	        if (typeof(layer.resize) !== 'function'
	            || typeof(layer.refresh) !== 'function'
	        ) {
	            return false;
	        }

	        return true;
	    }

	    function preProcessLayer(layer) {
	        layer.__unusedCount++;
	    }

	    function postProcessLayer(layer) {
	        layer.__dirty = false;
	        if (layer.__unusedCount == 1) {
	            layer.clear();
	        }
	    }

	    var tmpRect = new BoundingRect(0, 0, 0, 0);
	    var viewRect = new BoundingRect(0, 0, 0, 0);
	    function isDisplayableCulled(el, width, height) {
	        tmpRect.copy(el.getBoundingRect());
	        if (el.transform) {
	            tmpRect.applyTransform(el.transform);
	        }
	        viewRect.width = width;
	        viewRect.height = height;
	        return !tmpRect.intersect(viewRect);
	    }

	    function isClipPathChanged(clipPaths, prevClipPaths) {
	        if (!clipPaths || !prevClipPaths || (clipPaths.length !== prevClipPaths.length)) {
	            return true;
	        }
	        for (var i = 0; i < clipPaths.length; i++) {
	            if (clipPaths[i] !== prevClipPaths[i]) {
	                return true;
	            }
	        }
	    }

	    function doClip(clipPaths, ctx) {
	        for (var i = 0; i < clipPaths.length; i++) {
	            var clipPath = clipPaths[i];
	            var m;
	            if (clipPath.transform) {
	                m = clipPath.transform;
	                ctx.transform(
	                    m[0], m[1],
	                    m[2], m[3],
	                    m[4], m[5]
	                );
	            }
	            var path = clipPath.path;
	            path.beginPath(ctx);
	            clipPath.buildPath(path, clipPath.shape);
	            ctx.clip();
	            // Transform back
	            if (clipPath.transform) {
	                m = clipPath.invTransform;
	                ctx.transform(
	                    m[0], m[1],
	                    m[2], m[3],
	                    m[4], m[5]
	                );
	            }
	        }
	    }

	    /**
	     * @alias module:zrender/Painter
	     * @constructor
	     * @param {HTMLElement} root 绘图容器
	     * @param {module:zrender/Storage} storage
	     * @param {Ojbect} opts
	     */
	    var Painter = function (root, storage, opts) {
	        var singleCanvas = !root.nodeName // In node ?
	            || root.nodeName.toUpperCase() === 'CANVAS';

	        opts = opts || {};

	        /**
	         * @type {number}
	         */
	        this.dpr = opts.devicePixelRatio || config.devicePixelRatio;
	        /**
	         * @type {boolean}
	         * @private
	         */
	        this._singleCanvas = singleCanvas;
	        /**
	         * 绘图容器
	         * @type {HTMLElement}
	         */
	        this.root = root;

	        var rootStyle = root.style;

	        // In node environment using node-canvas
	        if (rootStyle) {
	            rootStyle['-webkit-tap-highlight-color'] = 'transparent';
	            rootStyle['-webkit-user-select'] = 'none';
	            rootStyle['user-select'] = 'none';
	            rootStyle['-webkit-touch-callout'] = 'none';

	            root.innerHTML = '';
	        }

	        /**
	         * @type {module:zrender/Storage}
	         */
	        this.storage = storage;

	        if (!singleCanvas) {
	            var width = this._getWidth();
	            var height = this._getHeight();
	            this._width = width;
	            this._height = height;

	            var domRoot = document.createElement('div');
	            this._domRoot = domRoot;
	            var domRootStyle = domRoot.style;

	            // domRoot.onselectstart = returnFalse; // 避免页面选中的尴尬
	            domRootStyle.position = 'relative';
	            domRootStyle.overflow = 'hidden';
	            domRootStyle.width = this._width + 'px';
	            domRootStyle.height = this._height + 'px';
	            root.appendChild(domRoot);

	            /**
	             * @type {Object.<key, module:zrender/Layer>}
	             * @private
	             */
	            this._layers = {};
	            /**
	             * @type {Array.<number>}
	             * @private
	             */
	            this._zlevelList = [];
	        }
	        else {
	            // Use canvas width and height directly
	            var width = root.width;
	            var height = root.height;
	            this._width = width;
	            this._height = height;

	            // Create layer if only one given canvas
	            // Device pixel ratio is fixed to 1 because given canvas has its specified width and height
	            var mainLayer = new Layer(root, this, 1);
	            mainLayer.initContext();
	            // FIXME Use canvas width and height
	            // mainLayer.resize(width, height);
	            this._layers = {
	                0: mainLayer
	            };
	            this._zlevelList = [0];
	        }

	        this._layerConfig = {};

	        this.pathToImage = this._createPathToImage();
	    };

	    Painter.prototype = {

	        constructor: Painter,

	        /**
	         * If painter use a single canvas
	         * @return {boolean}
	         */
	        isSingleCanvas: function () {
	            return this._singleCanvas;
	        },
	        /**
	         * @return {HTMLDivElement}
	         */
	        getViewportRoot: function () {
	            return this._singleCanvas ? this._layers[0].dom : this._domRoot;
	        },

	        /**
	         * 刷新
	         * @param {boolean} [paintAll=false] 强制绘制所有displayable
	         */
	        refresh: function (paintAll) {
	            var list = this.storage.getDisplayList(true);
	            var zlevelList = this._zlevelList;

	            this._paintList(list, paintAll);

	            // Paint custum layers
	            for (var i = 0; i < zlevelList.length; i++) {
	                var z = zlevelList[i];
	                var layer = this._layers[z];
	                if (!layer.isBuildin && layer.refresh) {
	                    layer.refresh();
	                }
	            }

	            return this;
	        },

	        _paintList: function (list, paintAll) {

	            if (paintAll == null) {
	                paintAll = false;
	            }

	            this._updateLayerStatus(list);

	            var currentLayer;
	            var currentZLevel;
	            var ctx;

	            var viewWidth = this._width;
	            var viewHeight = this._height;

	            this.eachBuildinLayer(preProcessLayer);

	            // var invTransform = [];
	            var prevElClipPaths = null;

	            for (var i = 0, l = list.length; i < l; i++) {
	                var el = list[i];
	                var elZLevel = this._singleCanvas ? 0 : el.zlevel;
	                // Change draw layer
	                if (currentZLevel !== elZLevel) {
	                    // Only 0 zlevel if only has one canvas
	                    currentZLevel = elZLevel;
	                    currentLayer = this.getLayer(currentZLevel);

	                    if (!currentLayer.isBuildin) {
	                        log(
	                            'ZLevel ' + currentZLevel
	                            + ' has been used by unkown layer ' + currentLayer.id
	                        );
	                    }

	                    ctx = currentLayer.ctx;

	                    // Reset the count
	                    currentLayer.__unusedCount = 0;

	                    if (currentLayer.__dirty || paintAll) {
	                        currentLayer.clear();
	                    }
	                }

	                if (
	                    (currentLayer.__dirty || paintAll)
	                    // Ignore invisible element
	                    && !el.invisible
	                    // Ignore transparent element
	                    && el.style.opacity !== 0
	                    // Ignore scale 0 element, in some environment like node-canvas
	                    // Draw a scale 0 element can cause all following draw wrong
	                    && el.scale[0] && el.scale[1]
	                    // Ignore culled element
	                    && !(el.culling && isDisplayableCulled(el, viewWidth, viewHeight))
	                ) {
	                    var clipPaths = el.__clipPaths;

	                    // Optimize when clipping on group with several elements
	                    if (isClipPathChanged(clipPaths, prevElClipPaths)) {
	                        // If has previous clipping state, restore from it
	                        if (prevElClipPaths) {
	                            ctx.restore();
	                        }
	                        // New clipping state
	                        if (clipPaths) {
	                            ctx.save();
	                            doClip(clipPaths, ctx);
	                        }
	                        prevElClipPaths = clipPaths;
	                    }
	                    el.beforeBrush && el.beforeBrush(ctx);
	                    el.brush(ctx, false);
	                    el.afterBrush && el.afterBrush(ctx);
	                }

	                el.__dirty = false;
	            }

	            // If still has clipping state
	            if (prevElClipPaths) {
	                ctx.restore();
	            }

	            this.eachBuildinLayer(postProcessLayer);
	        },

	        /**
	         * 获取 zlevel 所在层，如果不存在则会创建一个新的层
	         * @param {number} zlevel
	         * @return {module:zrender/Layer}
	         */
	        getLayer: function (zlevel) {
	            if (this._singleCanvas) {
	                return this._layers[0];
	            }

	            var layer = this._layers[zlevel];
	            if (!layer) {
	                // Create a new layer
	                layer = new Layer('zr_' + zlevel, this, this.dpr);
	                layer.isBuildin = true;

	                if (this._layerConfig[zlevel]) {
	                    util.merge(layer, this._layerConfig[zlevel], true);
	                }

	                this.insertLayer(zlevel, layer);

	                // Context is created after dom inserted to document
	                // Or excanvas will get 0px clientWidth and clientHeight
	                layer.initContext();
	            }

	            return layer;
	        },

	        insertLayer: function (zlevel, layer) {

	            var layersMap = this._layers;
	            var zlevelList = this._zlevelList;
	            var len = zlevelList.length;
	            var prevLayer = null;
	            var i = -1;
	            var domRoot = this._domRoot;

	            if (layersMap[zlevel]) {
	                log('ZLevel ' + zlevel + ' has been used already');
	                return;
	            }
	            // Check if is a valid layer
	            if (!isLayerValid(layer)) {
	                log('Layer of zlevel ' + zlevel + ' is not valid');
	                return;
	            }

	            if (len > 0 && zlevel > zlevelList[0]) {
	                for (i = 0; i < len - 1; i++) {
	                    if (
	                        zlevelList[i] < zlevel
	                        && zlevelList[i + 1] > zlevel
	                    ) {
	                        break;
	                    }
	                }
	                prevLayer = layersMap[zlevelList[i]];
	            }
	            zlevelList.splice(i + 1, 0, zlevel);

	            if (prevLayer) {
	                var prevDom = prevLayer.dom;
	                if (prevDom.nextSibling) {
	                    domRoot.insertBefore(
	                        layer.dom,
	                        prevDom.nextSibling
	                    );
	                }
	                else {
	                    domRoot.appendChild(layer.dom);
	                }
	            }
	            else {
	                if (domRoot.firstChild) {
	                    domRoot.insertBefore(layer.dom, domRoot.firstChild);
	                }
	                else {
	                    domRoot.appendChild(layer.dom);
	                }
	            }

	            layersMap[zlevel] = layer;
	        },

	        // Iterate each layer
	        eachLayer: function (cb, context) {
	            var zlevelList = this._zlevelList;
	            var z;
	            var i;
	            for (i = 0; i < zlevelList.length; i++) {
	                z = zlevelList[i];
	                cb.call(context, this._layers[z], z);
	            }
	        },

	        // Iterate each buildin layer
	        eachBuildinLayer: function (cb, context) {
	            var zlevelList = this._zlevelList;
	            var layer;
	            var z;
	            var i;
	            for (i = 0; i < zlevelList.length; i++) {
	                z = zlevelList[i];
	                layer = this._layers[z];
	                if (layer.isBuildin) {
	                    cb.call(context, layer, z);
	                }
	            }
	        },

	        // Iterate each other layer except buildin layer
	        eachOtherLayer: function (cb, context) {
	            var zlevelList = this._zlevelList;
	            var layer;
	            var z;
	            var i;
	            for (i = 0; i < zlevelList.length; i++) {
	                z = zlevelList[i];
	                layer = this._layers[z];
	                if (! layer.isBuildin) {
	                    cb.call(context, layer, z);
	                }
	            }
	        },

	        /**
	         * 获取所有已创建的层
	         * @param {Array.<module:zrender/Layer>} [prevLayer]
	         */
	        getLayers: function () {
	            return this._layers;
	        },

	        _updateLayerStatus: function (list) {

	            var layers = this._layers;

	            var elCounts = {};

	            this.eachBuildinLayer(function (layer, z) {
	                elCounts[z] = layer.elCount;
	                layer.elCount = 0;
	            });

	            for (var i = 0, l = list.length; i < l; i++) {
	                var el = list[i];
	                var zlevel = this._singleCanvas ? 0 : el.zlevel;
	                var layer = layers[zlevel];
	                if (layer) {
	                    layer.elCount++;
	                    // 已经被标记为需要刷新
	                    if (layer.__dirty) {
	                        continue;
	                    }
	                    layer.__dirty = el.__dirty;
	                }
	            }

	            // 层中的元素数量有发生变化
	            this.eachBuildinLayer(function (layer, z) {
	                if (elCounts[z] !== layer.elCount) {
	                    layer.__dirty = true;
	                }
	            });
	        },

	        /**
	         * 清除hover层外所有内容
	         */
	        clear: function () {
	            this.eachBuildinLayer(this._clearLayer);
	            return this;
	        },

	        _clearLayer: function (layer) {
	            layer.clear();
	        },

	        /**
	         * 修改指定zlevel的绘制参数
	         *
	         * @param {string} zlevel
	         * @param {Object} config 配置对象
	         * @param {string} [config.clearColor=0] 每次清空画布的颜色
	         * @param {string} [config.motionBlur=false] 是否开启动态模糊
	         * @param {number} [config.lastFrameAlpha=0.7]
	         *                 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
	         */
	        configLayer: function (zlevel, config) {
	            if (config) {
	                var layerConfig = this._layerConfig;
	                if (!layerConfig[zlevel]) {
	                    layerConfig[zlevel] = config;
	                }
	                else {
	                    util.merge(layerConfig[zlevel], config, true);
	                }

	                var layer = this._layers[zlevel];

	                if (layer) {
	                    util.merge(layer, layerConfig[zlevel], true);
	                }
	            }
	        },

	        /**
	         * 删除指定层
	         * @param {number} zlevel 层所在的zlevel
	         */
	        delLayer: function (zlevel) {
	            var layers = this._layers;
	            var zlevelList = this._zlevelList;
	            var layer = layers[zlevel];
	            if (!layer) {
	                return;
	            }
	            layer.dom.parentNode.removeChild(layer.dom);
	            delete layers[zlevel];

	            zlevelList.splice(util.indexOf(zlevelList, zlevel), 1);
	        },

	        /**
	         * 区域大小变化后重绘
	         */
	        resize: function (width, height) {
	            var domRoot = this._domRoot;
	            // FIXME Why ?
	            domRoot.style.display = 'none';

	            width = width || this._getWidth();
	            height = height || this._getHeight();

	            domRoot.style.display = '';

	            // 优化没有实际改变的resize
	            if (this._width != width || height != this._height) {
	                domRoot.style.width = width + 'px';
	                domRoot.style.height = height + 'px';

	                for (var id in this._layers) {
	                    this._layers[id].resize(width, height);
	                }

	                this.refresh(true);
	            }

	            this._width = width;
	            this._height = height;

	            return this;
	        },

	        /**
	         * 清除单独的一个层
	         * @param {number} zlevel
	         */
	        clearLayer: function (zlevel) {
	            var layer = this._layers[zlevel];
	            if (layer) {
	                layer.clear();
	            }
	        },

	        /**
	         * 释放
	         */
	        dispose: function () {
	            this.root.innerHTML = '';

	            this.root =
	            this.storage =

	            this._domRoot =
	            this._layers = null;
	        },

	        /**
	         * Get canvas which has all thing rendered
	         * @param {Object} opts
	         * @param {string} [opts.backgroundColor]
	         */
	        getRenderedCanvas: function (opts) {
	            opts = opts || {};
	            if (this._singleCanvas) {
	                return this._layers[0].dom;
	            }

	            var imageLayer = new Layer('image', this, opts.pixelRatio || this.dpr);
	            imageLayer.initContext();

	            var ctx = imageLayer.ctx;
	            imageLayer.clearColor = opts.backgroundColor;
	            imageLayer.clear();

	            var displayList = this.storage.getDisplayList(true);

	            for (var i = 0; i < displayList.length; i++) {
	                var el = displayList[i];
	                if (!el.invisible) {
	                    el.beforeBrush && el.beforeBrush(ctx);
	                    // TODO Check image cross origin
	                    el.brush(ctx, false);
	                    el.afterBrush && el.afterBrush(ctx);
	                }
	            }

	            return imageLayer.dom;
	        },
	        /**
	         * 获取绘图区域宽度
	         */
	        getWidth: function () {
	            return this._width;
	        },

	        /**
	         * 获取绘图区域高度
	         */
	        getHeight: function () {
	            return this._height;
	        },

	        _getWidth: function () {
	            var root = this.root;
	            var stl = document.defaultView.getComputedStyle(root);

	            // FIXME Better way to get the width and height when element has not been append to the document
	            return ((root.clientWidth || parseInt10(stl.width) || parseInt10(root.style.width))
	                    - (parseInt10(stl.paddingLeft) || 0)
	                    - (parseInt10(stl.paddingRight) || 0)) | 0;
	        },

	        _getHeight: function () {
	            var root = this.root;
	            var stl = document.defaultView.getComputedStyle(root);

	            return ((root.clientHeight || parseInt10(stl.height) || parseInt10(root.style.height))
	                    - (parseInt10(stl.paddingTop) || 0)
	                    - (parseInt10(stl.paddingBottom) || 0)) | 0;
	        },

	        _pathToImage: function (id, path, width, height, dpr) {
	            var canvas = document.createElement('canvas');
	            var ctx = canvas.getContext('2d');

	            canvas.width = width * dpr;
	            canvas.height = height * dpr;

	            ctx.clearRect(0, 0, width * dpr, height * dpr);

	            var pathTransform = {
	                position: path.position,
	                rotation: path.rotation,
	                scale: path.scale
	            };
	            path.position = [0, 0, 0];
	            path.rotation = 0;
	            path.scale = [1, 1];
	            if (path) {
	                path.brush(ctx);
	            }

	            var ImageShape = __webpack_require__(59);
	            var imgShape = new ImageShape({
	                id: id,
	                style: {
	                    x: 0,
	                    y: 0,
	                    image: canvas
	                }
	            });

	            if (pathTransform.position != null) {
	                imgShape.position = path.position = pathTransform.position;
	            }

	            if (pathTransform.rotation != null) {
	                imgShape.rotation = path.rotation = pathTransform.rotation;
	            }

	            if (pathTransform.scale != null) {
	                imgShape.scale = path.scale = pathTransform.scale;
	            }

	            return imgShape;
	        },

	        _createPathToImage: function () {
	            var me = this;

	            return function (id, e, width, height) {
	                return me._pathToImage(
	                    id, e, width, height, me.dpr
	                );
	            };
	        }
	    };

	    module.exports = Painter;



/***/ },
/* 87 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @module zrender/Layer
	 * @author pissang(https://www.github.com/pissang)
	 */


	    var util = __webpack_require__(3);
	    var config = __webpack_require__(40);

	    function returnFalse() {
	        return false;
	    }

	    /**
	     * 创建dom
	     *
	     * @inner
	     * @param {string} id dom id 待用
	     * @param {string} type dom type，such as canvas, div etc.
	     * @param {Painter} painter painter instance
	     * @param {number} number
	     */
	    function createDom(id, type, painter, dpr) {
	        var newDom = document.createElement(type);
	        var width = painter.getWidth();
	        var height = painter.getHeight();

	        var newDomStyle = newDom.style;
	        // 没append呢，请原谅我这样写，清晰~
	        newDomStyle.position = 'absolute';
	        newDomStyle.left = 0;
	        newDomStyle.top = 0;
	        newDomStyle.width = width + 'px';
	        newDomStyle.height = height + 'px';
	        newDom.width = width * dpr;
	        newDom.height = height * dpr;

	        // id不作为索引用，避免可能造成的重名，定义为私有属性
	        newDom.setAttribute('data-zr-dom-id', id);
	        return newDom;
	    }

	    /**
	     * @alias module:zrender/Layer
	     * @constructor
	     * @extends module:zrender/mixin/Transformable
	     * @param {string} id
	     * @param {module:zrender/Painter} painter
	     * @param {number} [dpr]
	     */
	    var Layer = function(id, painter, dpr) {
	        var dom;
	        dpr = dpr || config.devicePixelRatio;
	        if (typeof id === 'string') {
	            dom = createDom(id, 'canvas', painter, dpr);
	        }
	        // Not using isDom because in node it will return false
	        else if (util.isObject(id)) {
	            dom = id;
	            id = dom.id;
	        }
	        this.id = id;
	        this.dom = dom;

	        var domStyle = dom.style;
	        if (domStyle) { // Not in node
	            dom.onselectstart = returnFalse; // 避免页面选中的尴尬
	            domStyle['-webkit-user-select'] = 'none';
	            domStyle['user-select'] = 'none';
	            domStyle['-webkit-touch-callout'] = 'none';
	            domStyle['-webkit-tap-highlight-color'] = 'rgba(0,0,0,0)';
	        }

	        this.domBack = null;
	        this.ctxBack = null;

	        this.painter = painter;

	        this.config = null;

	        // Configs
	        /**
	         * 每次清空画布的颜色
	         * @type {string}
	         * @default 0
	         */
	        this.clearColor = 0;
	        /**
	         * 是否开启动态模糊
	         * @type {boolean}
	         * @default false
	         */
	        this.motionBlur = false;
	        /**
	         * 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
	         * @type {number}
	         * @default 0.7
	         */
	        this.lastFrameAlpha = 0.7;

	        /**
	         * Layer dpr
	         * @type {number}
	         */
	        this.dpr = dpr;
	    };

	    Layer.prototype = {

	        constructor: Layer,

	        elCount: 0,

	        __dirty: true,

	        initContext: function () {
	            this.ctx = this.dom.getContext('2d');

	            var dpr = this.dpr;
	            if (dpr != 1) {
	                this.ctx.scale(dpr, dpr);
	            }
	        },

	        createBackBuffer: function () {
	            var dpr = this.dpr;

	            this.domBack = createDom('back-' + this.id, 'canvas', this.painter, dpr);
	            this.ctxBack = this.domBack.getContext('2d');

	            if (dpr != 1) {
	                this.ctxBack.scale(dpr, dpr);
	            }
	        },

	        /**
	         * @param  {number} width
	         * @param  {number} height
	         */
	        resize: function (width, height) {
	            var dpr = this.dpr;

	            var dom = this.dom;
	            var domStyle = dom.style;
	            var domBack = this.domBack;

	            domStyle.width = width + 'px';
	            domStyle.height = height + 'px';

	            dom.width = width * dpr;
	            dom.height = height * dpr;

	            if (dpr != 1) {
	                this.ctx.scale(dpr, dpr);
	            }

	            if (domBack) {
	                domBack.width = width * dpr;
	                domBack.height = height * dpr;

	                if (dpr != 1) {
	                    this.ctxBack.scale(dpr, dpr);
	                }
	            }
	        },

	        /**
	         * 清空该层画布
	         * @param {boolean} clearAll Clear all with out motion blur
	         */
	        clear: function (clearAll) {
	            var dom = this.dom;
	            var ctx = this.ctx;
	            var width = dom.width;
	            var height = dom.height;

	            var haveClearColor = this.clearColor;
	            var haveMotionBLur = this.motionBlur && !clearAll;
	            var lastFrameAlpha = this.lastFrameAlpha;

	            var dpr = this.dpr;

	            if (haveMotionBLur) {
	                if (!this.domBack) {
	                    this.createBackBuffer();
	                }

	                this.ctxBack.globalCompositeOperation = 'copy';
	                this.ctxBack.drawImage(
	                    dom, 0, 0,
	                    width / dpr,
	                    height / dpr
	                );
	            }

	            ctx.clearRect(0, 0, width / dpr, height / dpr);
	            if (haveClearColor) {
	                ctx.save();
	                ctx.fillStyle = this.clearColor;
	                ctx.fillRect(0, 0, width / dpr, height / dpr);
	                ctx.restore();
	            }

	            if (haveMotionBLur) {
	                var domBack = this.domBack;
	                ctx.save();
	                ctx.globalAlpha = lastFrameAlpha;
	                ctx.drawImage(domBack, 0, 0, width / dpr, height / dpr);
	                ctx.restore();
	            }
	        }
	    };

	    module.exports = Layer;


/***/ },
/* 88 */
/***/ function(module, exports, __webpack_require__) {

	

	    var graphic = __webpack_require__(42);
	    var zrUtil = __webpack_require__(3);
	    var PI = Math.PI;
	    /**
	     * @param {module:echarts/ExtensionAPI} api
	     * @param {Object} [opts]
	     * @param {string} [opts.text]
	     * @param {string} [opts.color]
	     * @param {string} [opts.textColor]
	     * @return {module:zrender/Element}
	     */
	    module.exports = function (api, opts) {
	        opts = opts || {};
	        zrUtil.defaults(opts, {
	            text: 'loading',
	            color: '#c23531',
	            textColor: '#000',
	            maskColor: 'rgba(255, 255, 255, 0.8)',
	            zlevel: 0
	        });
	        var mask = new graphic.Rect({
	            style: {
	                fill: opts.maskColor
	            },
	            zlevel: opts.zlevel,
	            z: 10000
	        });
	        var arc = new graphic.Arc({
	            shape: {
	                startAngle: -PI / 2,
	                endAngle: -PI / 2 + 0.1,
	                r: 10
	            },
	            style: {
	                stroke: opts.color,
	                lineCap: 'round',
	                lineWidth: 5
	            },
	            zlevel: opts.zlevel,
	            z: 10001
	        });
	        var labelRect = new graphic.Rect({
	            style: {
	                fill: 'none',
	                text: opts.text,
	                textPosition: 'right',
	                textDistance: 10,
	                textFill: opts.textColor
	            },
	            zlevel: opts.zlevel,
	            z: 10001
	        });

	        arc.animateShape(true)
	            .when(1000, {
	                endAngle: PI * 3 / 2
	            })
	            .start('circularInOut');
	        arc.animateShape(true)
	            .when(1000, {
	                startAngle: PI * 3 / 2
	            })
	            .delay(300)
	            .start('circularInOut');

	        var group = new graphic.Group();
	        group.add(arc);
	        group.add(labelRect);
	        group.add(mask);
	        // Inject resize
	        group.resize = function () {
	            var cx = api.getWidth() / 2;
	            var cy = api.getHeight() / 2;
	            arc.setShape({
	                cx: cx,
	                cy: cy
	            });
	            var r = arc.shape.r;
	            labelRect.setShape({
	                x: cx - r,
	                y: cy - r,
	                width: r * 2,
	                height: r * 2
	            });

	            mask.setShape({
	                x: 0,
	                y: 0,
	                width: api.getWidth(),
	                height: api.getHeight()
	            });
	        };
	        group.resize();
	        return group;
	    };


/***/ },
/* 89 */
/***/ function(module, exports, __webpack_require__) {

	
	    var Gradient = __webpack_require__(4);
	    module.exports = function (seriesType, styleType, ecModel) {
	        function encodeColor(seriesModel) {
	            var colorAccessPath = [styleType, 'normal', 'color'];
	            var colorList = ecModel.get('color');
	            var data = seriesModel.getData();
	            var color = seriesModel.get(colorAccessPath) // Set in itemStyle
	                || colorList[seriesModel.seriesIndex % colorList.length];  // Default color

	            // FIXME Set color function or use the platte color
	            data.setVisual('color', color);

	            // Only visible series has each data be visual encoded
	            if (!ecModel.isSeriesFiltered(seriesModel)) {
	                if (typeof color === 'function' && !(color instanceof Gradient)) {
	                    data.each(function (idx) {
	                        data.setItemVisual(
	                            idx, 'color', color(seriesModel.getDataParams(idx))
	                        );
	                    });
	                }

	                data.each(function (idx) {
	                    var itemModel = data.getItemModel(idx);
	                    var color = itemModel.get(colorAccessPath, true);
	                    if (color != null) {
	                        data.setItemVisual(idx, 'color', color);
	                    }
	                });
	            }
	        }
	        seriesType ? ecModel.eachSeriesByType(seriesType, encodeColor)
	            : ecModel.eachSeries(encodeColor);
	    };


/***/ },
/* 90 */
/***/ function(module, exports, __webpack_require__) {

	// Compatitable with 2.0


	    var zrUtil = __webpack_require__(3);
	    var compatStyle = __webpack_require__(91);

	    function get(opt, path) {
	        path = path.split(',');
	        var obj = opt;
	        for (var i = 0; i < path.length; i++) {
	            obj = obj && obj[path[i]];
	            if (obj == null) {
	                break;
	            }
	        }
	        return obj;
	    }

	    function set(opt, path, val, overwrite) {
	        path = path.split(',');
	        var obj = opt;
	        var key;
	        for (var i = 0; i < path.length - 1; i++) {
	            key = path[i];
	            if (obj[key] == null) {
	                obj[key] = {};
	            }
	            obj = obj[key];
	        }
	        if (overwrite || obj[path[i]] == null) {
	            obj[path[i]] = val;
	        }
	    }

	    function compatLayoutProperties(option) {
	        each(LAYOUT_PROPERTIES, function (prop) {
	            if (prop[0] in option && !(prop[1] in option)) {
	                option[prop[1]] = option[prop[0]];
	            }
	        });
	    }

	    var LAYOUT_PROPERTIES = [
	        ['x', 'left'], ['y', 'top'], ['x2', 'right'], ['y2', 'bottom']
	    ];

	    var COMPATITABLE_COMPONENTS = [
	        'grid', 'geo', 'parallel', 'legend', 'toolbox', 'title', 'visualMap', 'dataZoom', 'timeline'
	    ];

	    var COMPATITABLE_SERIES = [
	        'bar', 'boxplot', 'candlestick', 'chord', 'effectScatter',
	        'funnel', 'gauge', 'lines', 'graph', 'heatmap', 'line', 'map', 'parallel',
	        'pie', 'radar', 'sankey', 'scatter', 'treemap'
	    ];

	    var each = zrUtil.each;

	    module.exports = function (option) {
	        each(option.series, function (seriesOpt) {
	            if (!zrUtil.isObject(seriesOpt)) {
	                return;
	            }

	            var seriesType = seriesOpt.type;

	            compatStyle(seriesOpt);

	            if (seriesType === 'pie' || seriesType === 'gauge') {
	                if (seriesOpt.clockWise != null) {
	                    seriesOpt.clockwise = seriesOpt.clockWise;
	                }
	            }
	            if (seriesType === 'gauge') {
	                var pointerColor = get(seriesOpt, 'pointer.color');
	                pointerColor != null
	                    && set(seriesOpt, 'itemStyle.normal.color', pointerColor);
	            }

	            for (var i = 0; i < COMPATITABLE_SERIES.length; i++) {
	                if (COMPATITABLE_SERIES[i] === seriesOpt.type) {
	                    compatLayoutProperties(seriesOpt);
	                    break;
	                }
	            }
	        });

	        // dataRange has changed to visualMap
	        if (option.dataRange) {
	            option.visualMap = option.dataRange;
	        }

	        each(COMPATITABLE_COMPONENTS, function (componentName) {
	            var options = option[componentName];
	            if (options) {
	                if (!zrUtil.isArray(options)) {
	                    options = [options];
	                }
	                each(options, function (option) {
	                    compatLayoutProperties(option);
	                });
	            }
	        });
	    };


/***/ },
/* 91 */
/***/ function(module, exports, __webpack_require__) {

	

	    var zrUtil = __webpack_require__(3);

	    var POSSIBLE_STYLES = [
	        'areaStyle', 'lineStyle', 'nodeStyle', 'linkStyle',
	        'chordStyle', 'label', 'labelLine'
	    ];

	    function compatItemStyle(opt) {
	        var itemStyleOpt = opt && opt.itemStyle;
	        if (itemStyleOpt) {
	            zrUtil.each(POSSIBLE_STYLES, function (styleName) {
	                var normalItemStyleOpt = itemStyleOpt.normal;
	                var emphasisItemStyleOpt = itemStyleOpt.emphasis;
	                if (normalItemStyleOpt && normalItemStyleOpt[styleName]) {
	                    opt[styleName] = opt[styleName] || {};
	                    if (!opt[styleName].normal) {
	                        opt[styleName].normal = normalItemStyleOpt[styleName];
	                    }
	                    else {
	                        zrUtil.merge(opt[styleName].normal, normalItemStyleOpt[styleName]);
	                    }
	                    normalItemStyleOpt[styleName] = null;
	                }
	                if (emphasisItemStyleOpt && emphasisItemStyleOpt[styleName]) {
	                    opt[styleName] = opt[styleName] || {};
	                    if (!opt[styleName].emphasis) {
	                        opt[styleName].emphasis = emphasisItemStyleOpt[styleName];
	                    }
	                    else {
	                        zrUtil.merge(opt[styleName].emphasis, emphasisItemStyleOpt[styleName]);
	                    }
	                    emphasisItemStyleOpt[styleName] = null;
	                }
	            });
	        }
	    }

	    module.exports = function (seriesOpt) {
	        if (!seriesOpt) {
	            return;
	        }
	        compatItemStyle(seriesOpt);
	        compatItemStyle(seriesOpt.markPoint);
	        compatItemStyle(seriesOpt.markLine);
	        var data = seriesOpt.data;
	        if (data) {
	            for (var i = 0; i < data.length; i++) {
	                compatItemStyle(data[i]);
	            }
	            // mark point data
	            var markPoint = seriesOpt.markPoint;
	            if (markPoint && markPoint.data) {
	                var mpData = markPoint.data;
	                for (var i = 0; i < mpData.length; i++) {
	                    compatItemStyle(mpData[i]);
	                }
	            }
	            // mark line data
	            var markLine = seriesOpt.markLine;
	            if (markLine && markLine.data) {
	                var mlData = markLine.data;
	                for (var i = 0; i < mlData.length; i++) {
	                    if (zrUtil.isArray(mlData[i])) {
	                        compatItemStyle(mlData[i][0]);
	                        compatItemStyle(mlData[i][1]);
	                    }
	                    else {
	                        compatItemStyle(mlData[i]);
	                    }
	                }
	            }
	        }
	    };


/***/ },
/* 92 */
/***/ function(module, exports, __webpack_require__) {

	

	    var zrUtil = __webpack_require__(3);
	    var echarts = __webpack_require__(1);

	    __webpack_require__(93);
	    __webpack_require__(98);

	    echarts.registerVisualCoding('chart', zrUtil.curry(
	        __webpack_require__(104), 'line', 'circle', 'line'
	    ));
	    echarts.registerLayout(zrUtil.curry(
	        __webpack_require__(105), 'line'
	    ));

	    // Down sample after filter
	    echarts.registerProcessor('statistic', zrUtil.curry(
	        __webpack_require__(106), 'line'
	    ));

	    // In case developer forget to include grid component
	    __webpack_require__(107);


/***/ },
/* 93 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var createListFromArray = __webpack_require__(94);
	    var SeriesModel = __webpack_require__(27);

	    module.exports = SeriesModel.extend({

	        type: 'series.line',

	        dependencies: ['grid', 'polar'],

	        getInitialData: function (option, ecModel) {
	            return createListFromArray(option.data, this, ecModel);
	        },

	        defaultOption: {
	            zlevel: 0,                  // 一级层叠
	            z: 2,                       // 二级层叠
	            coordinateSystem: 'cartesian2d',
	            legendHoverLink: true,

	            hoverAnimation: true,
	            // stack: null
	            xAxisIndex: 0,
	            yAxisIndex: 0,

	            polarIndex: 0,

	            // If clip the overflow value
	            clipOverflow: true,

	            label: {
	                normal: {
	                    position: 'top'
	                }
	            },
	            // itemStyle: {
	            //     normal: {},
	            //     emphasis: {}
	            // },
	            lineStyle: {
	                normal: {
	                    width: 2,
	                    type: 'solid'
	                }
	            },
	            // areaStyle: {},

	            smooth: false,
	            smoothMonotone: null,
	            // 拐点图形类型
	            symbol: 'emptyCircle',
	            // 拐点图形大小
	            symbolSize: 4,
	            // 拐点图形旋转控制
	            symbolRotate: null,

	            // 是否显示 symbol, 只有在 tooltip hover 的时候显示
	            showSymbol: true,
	            // 标志图形默认只有主轴显示（随主轴标签间隔隐藏策略）
	            showAllSymbol: false,

	            // 是否连接断点
	            connectNulls: false,

	            // 数据过滤，'average', 'max', 'min', 'sum'
	            sampling: 'none',

	            animationEasing: 'linear'
	        }
	    });


/***/ },
/* 94 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var List = __webpack_require__(95);
	    var completeDimensions = __webpack_require__(97);
	    var zrUtil = __webpack_require__(3);
	    var modelUtil = __webpack_require__(5);
	    var CoordinateSystem = __webpack_require__(25);
	    var getDataItemValue = modelUtil.getDataItemValue;
	    var converDataValue = modelUtil.converDataValue;

	    function firstDataNotNull(data) {
	        var i = 0;
	        while (i < data.length && data[i] == null) {
	            i++;
	        }
	        return data[i];
	    }
	    function ifNeedCompleteOrdinalData(data) {
	        var sampleItem = firstDataNotNull(data);
	        return sampleItem != null
	            && !zrUtil.isArray(getDataItemValue(sampleItem));
	    }

	    /**
	     * Helper function to create a list from option data
	     */
	    function createListFromArray(data, seriesModel, ecModel) {
	        // If data is undefined
	        data = data || [];

	        if (!zrUtil.isArray(data)) {
	            throw new Error('Invalid data.');
	        }

	        var coordSysName = seriesModel.get('coordinateSystem');
	        var creator = creators[coordSysName];
	        var registeredCoordSys = CoordinateSystem.get(coordSysName);
	        // FIXME
	        var result = creator && creator(data, seriesModel, ecModel);
	        var dimensions = result && result.dimensions;
	        if (!dimensions) {
	            // Get dimensions from registered coordinate system
	            dimensions = (registeredCoordSys && registeredCoordSys.dimensions) || ['x', 'y'];
	            dimensions = completeDimensions(dimensions, data, dimensions.concat(['value']));
	        }
	        var categoryAxisModel = result && result.categoryAxisModel;
	        var categories;

	        var categoryDimIndex = dimensions[0].type === 'ordinal'
	            ? 0 : (dimensions[1].type === 'ordinal' ? 1 : -1);

	        var list = new List(dimensions, seriesModel);

	        var nameList = createNameList(result, data);

	        var dimValueGetter = (categoryAxisModel && ifNeedCompleteOrdinalData(data))
	            ? function (itemOpt, dimName, dataIndex, dimIndex) {
	                // Use dataIndex as ordinal value in categoryAxis
	                return dimIndex === categoryDimIndex
	                    ? dataIndex
	                    : converDataValue(getDataItemValue(itemOpt), dimensions[dimIndex]);
	            }
	            : function (itemOpt, dimName, dataIndex, dimIndex) {
	                var value = getDataItemValue(itemOpt);
	                var val = converDataValue(value && value[dimIndex], dimensions[dimIndex]);
	                if (categoryDimIndex === dimIndex) {
	                    // If given value is a category string
	                    if (typeof val === 'string') {
	                        // Lazy get categories
	                        categories = categories || categoryAxisModel.getCategories();
	                        val = zrUtil.indexOf(categories, val);
	                        if (val < 0 && !isNaN(val)) {
	                            // In case some one write '1', '2' istead of 1, 2
	                            val = +val;
	                        }
	                    }
	                }
	                return val;
	            };

	        list.initData(data, nameList, dimValueGetter);

	        return list;
	    }

	    function isStackable(axisType) {
	        return axisType !== 'category' && axisType !== 'time';
	    }

	    function getDimTypeByAxis(axisType) {
	        return axisType === 'category'
	            ? 'ordinal'
	            : axisType === 'time'
	            ? 'time'
	            : 'float';
	    }

	    /**
	     * Creaters for each coord system.
	     * @return {Object} {dimensions, categoryAxisModel};
	     */
	    var creators = {

	        cartesian2d: function (data, seriesModel, ecModel) {
	            var xAxisModel = ecModel.getComponent('xAxis', seriesModel.get('xAxisIndex'));
	            var yAxisModel = ecModel.getComponent('yAxis', seriesModel.get('yAxisIndex'));
	            if (!xAxisModel || !yAxisModel) {
	                throw new Error('Axis option not found');
	            }

	            var xAxisType = xAxisModel.get('type');
	            var yAxisType = yAxisModel.get('type');

	            var dimensions = [
	                {
	                    name: 'x',
	                    type: getDimTypeByAxis(xAxisType),
	                    stackable: isStackable(xAxisType)
	                },
	                {
	                    name: 'y',
	                    // If two category axes
	                    type: getDimTypeByAxis(yAxisType),
	                    stackable: isStackable(yAxisType)
	                }
	            ];

	            var isXAxisCateogry = xAxisType === 'category';

	            completeDimensions(dimensions, data, ['x', 'y', 'z']);

	            return {
	                dimensions: dimensions,
	                categoryIndex: isXAxisCateogry ? 0 : 1,
	                categoryAxisModel: isXAxisCateogry
	                    ? xAxisModel
	                    : (yAxisType === 'category' ? yAxisModel : null)
	            };
	        },

	        polar: function (data, seriesModel, ecModel) {
	            var polarIndex = seriesModel.get('polarIndex') || 0;

	            var axisFinder = function (axisModel) {
	                return axisModel.get('polarIndex') === polarIndex;
	            };

	            var angleAxisModel = ecModel.findComponents({
	                mainType: 'angleAxis', filter: axisFinder
	            })[0];
	            var radiusAxisModel = ecModel.findComponents({
	                mainType: 'radiusAxis', filter: axisFinder
	            })[0];

	            if (!angleAxisModel || !radiusAxisModel) {
	                throw new Error('Axis option not found');
	            }

	            var radiusAxisType = radiusAxisModel.get('type');
	            var angleAxisType = angleAxisModel.get('type');

	            var dimensions = [
	                {
	                    name: 'radius',
	                    type: getDimTypeByAxis(radiusAxisType),
	                    stackable: isStackable(radiusAxisType)
	                },
	                {
	                    name: 'angle',
	                    type: getDimTypeByAxis(angleAxisType),
	                    stackable: isStackable(angleAxisType)
	                }
	            ];
	            var isAngleAxisCateogry = angleAxisType === 'category';

	            completeDimensions(dimensions, data, ['radius', 'angle', 'value']);

	            return {
	                dimensions: dimensions,
	                categoryIndex: isAngleAxisCateogry ? 1 : 0,
	                categoryAxisModel: isAngleAxisCateogry
	                    ? angleAxisModel
	                    : (radiusAxisType === 'category' ? radiusAxisModel : null)
	            };
	        },

	        geo: function (data, seriesModel, ecModel) {
	            // TODO Region
	            // 多个散点图系列在同一个地区的时候
	            return {
	                dimensions: completeDimensions([
	                    {name: 'lng'},
	                    {name: 'lat'}
	                ], data, ['lng', 'lat', 'value'])
	            };
	        }
	    };

	    function createNameList(result, data) {
	        var nameList = [];

	        if (result && result.categoryAxisModel) {
	            // FIXME Two category axis
	            var categories = result.categoryAxisModel.getCategories();
	            if (categories) {
	                var dataLen = data.length;
	                // Ordered data is given explicitly like
	                // [[3, 0.2], [1, 0.3], [2, 0.15]]
	                // or given scatter data,
	                // pick the category
	                if (zrUtil.isArray(data[0]) && data[0].length > 1) {
	                    nameList = [];
	                    for (var i = 0; i < dataLen; i++) {
	                        nameList[i] = categories[data[i][result.categoryIndex || 0]];
	                    }
	                }
	                else {
	                    nameList = categories.slice(0);
	                }
	            }
	        }

	        return nameList;
	    }

	    module.exports = createListFromArray;



/***/ },
/* 95 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/**
	 * List for data storage
	 * @module echarts/data/List
	 */


	    var UNDEFINED = 'undefined';
	    var globalObj = typeof window === 'undefined' ? global : window;
	    var Float64Array = typeof globalObj.Float64Array === UNDEFINED
	        ? Array : globalObj.Float64Array;
	    var Int32Array = typeof globalObj.Int32Array === UNDEFINED
	        ? Array : globalObj.Int32Array;

	    var dataCtors = {
	        'float': Float64Array,
	        'int': Int32Array,
	        // Ordinal data type can be string or int
	        'ordinal': Array,
	        'number': Array,
	        'time': Array
	    };

	    var Model = __webpack_require__(8);
	    var DataDiffer = __webpack_require__(96);

	    var zrUtil = __webpack_require__(3);
	    var modelUtil = __webpack_require__(5);
	    var isObject = zrUtil.isObject;

	    var IMMUTABLE_PROPERTIES = [
	        'stackedOn', '_nameList', '_idList', '_rawData'
	    ];

	    var transferImmuProperties = function (a, b) {
	        zrUtil.each(IMMUTABLE_PROPERTIES.concat(b.__wrappedMethods || []), function (propName) {
	            if (b.hasOwnProperty(propName)) {
	                a[propName] = b[propName];
	            }
	        });

	        a.__wrappedMethods = b.__wrappedMethods;
	    };

	    /**
	     * @constructor
	     * @alias module:echarts/data/List
	     *
	     * @param {Array.<string>} dimensions
	     *        Dimensions should be concrete names like x, y, z, lng, lat, angle, radius
	     * @param {module:echarts/model/Model} hostModel
	     */
	    var List = function (dimensions, hostModel) {

	        dimensions = dimensions || ['x', 'y'];

	        var dimensionInfos = {};
	        var dimensionNames = [];
	        for (var i = 0; i < dimensions.length; i++) {
	            var dimensionName;
	            var dimensionInfo = {};
	            if (typeof dimensions[i] === 'string') {
	                dimensionName = dimensions[i];
	                dimensionInfo = {
	                    name: dimensionName,
	                    stackable: false,
	                    // Type can be 'float', 'int', 'number'
	                    // Default is number, Precision of float may not enough
	                    type: 'number'
	                };
	            }
	            else {
	                dimensionInfo = dimensions[i];
	                dimensionName = dimensionInfo.name;
	                dimensionInfo.type = dimensionInfo.type || 'number';
	            }
	            dimensionNames.push(dimensionName);
	            dimensionInfos[dimensionName] = dimensionInfo;
	        }
	        /**
	         * @readOnly
	         * @type {Array.<string>}
	         */
	        this.dimensions = dimensionNames;

	        /**
	         * Infomation of each data dimension, like data type.
	         * @type {Object}
	         */
	        this._dimensionInfos = dimensionInfos;

	        /**
	         * @type {module:echarts/model/Model}
	         */
	        this.hostModel = hostModel;

	        /**
	         * @type {module:echarts/model/Model}
	         */
	        this.dataType;

	        /**
	         * Indices stores the indices of data subset after filtered.
	         * This data subset will be used in chart.
	         * @type {Array.<number>}
	         * @readOnly
	         */
	        this.indices = [];

	        /**
	         * Data storage
	         * @type {Object.<key, TypedArray|Array>}
	         * @private
	         */
	        this._storage = {};

	        /**
	         * @type {Array.<string>}
	         */
	        this._nameList = [];
	        /**
	         * @type {Array.<string>}
	         */
	        this._idList = [];
	        /**
	         * Models of data option is stored sparse for optimizing memory cost
	         * @type {Array.<module:echarts/model/Model>}
	         * @private
	         */
	        this._optionModels = [];

	        /**
	         * @param {module:echarts/data/List}
	         */
	        this.stackedOn = null;

	        /**
	         * Global visual properties after visual coding
	         * @type {Object}
	         * @private
	         */
	        this._visual = {};

	        /**
	         * Globel layout properties.
	         * @type {Object}
	         * @private
	         */
	        this._layout = {};

	        /**
	         * Item visual properties after visual coding
	         * @type {Array.<Object>}
	         * @private
	         */
	        this._itemVisuals = [];

	        /**
	         * Item layout properties after layout
	         * @type {Array.<Object>}
	         * @private
	         */
	        this._itemLayouts = [];

	        /**
	         * Graphic elemnents
	         * @type {Array.<module:zrender/Element>}
	         * @private
	         */
	        this._graphicEls = [];

	        /**
	         * @type {Array.<Array|Object>}
	         * @private
	         */
	        this._rawData;

	        /**
	         * @type {Object}
	         * @private
	         */
	        this._extent;
	    };

	    var listProto = List.prototype;

	    listProto.type = 'list';

	    /**
	     * Get dimension name
	     * @param {string|number} dim
	     *        Dimension can be concrete names like x, y, z, lng, lat, angle, radius
	     *        Or a ordinal number. For example getDimensionInfo(0) will return 'x' or 'lng' or 'radius'
	     * @return {string} Concrete dim name.
	     */
	    listProto.getDimension = function (dim) {
	        if (!isNaN(dim)) {
	            dim = this.dimensions[dim] || dim;
	        }
	        return dim;
	    };
	    /**
	     * Get type and stackable info of particular dimension
	     * @param {string|number} dim
	     *        Dimension can be concrete names like x, y, z, lng, lat, angle, radius
	     *        Or a ordinal number. For example getDimensionInfo(0) will return 'x' or 'lng' or 'radius'
	     */
	    listProto.getDimensionInfo = function (dim) {
	        return zrUtil.clone(this._dimensionInfos[this.getDimension(dim)]);
	    };

	    /**
	     * Initialize from data
	     * @param {Array.<Object|number|Array>} data
	     * @param {Array.<string>} [nameList]
	     * @param {Function} [dimValueGetter] (dataItem, dimName, dataIndex, dimIndex) => number
	     */
	    listProto.initData = function (data, nameList, dimValueGetter) {
	        data = data || [];

	        if (!zrUtil.isArray(data)) {
	            throw new Error('Invalid data.');
	        }

	        this._rawData = data;

	        // Clear
	        var storage = this._storage = {};
	        var indices = this.indices = [];

	        var dimensions = this.dimensions;
	        var size = data.length;
	        var dimensionInfoMap = this._dimensionInfos;

	        var idList = [];
	        var nameRepeatCount = {};

	        nameList = nameList || [];

	        // Init storage
	        for (var i = 0; i < dimensions.length; i++) {
	            var dimInfo = dimensionInfoMap[dimensions[i]];
	            var DataCtor = dataCtors[dimInfo.type];
	            storage[dimensions[i]] = new DataCtor(size);
	        }

	        // Default dim value getter
	        dimValueGetter = dimValueGetter || function (dataItem, dimName, dataIndex, dimIndex) {
	            var value = modelUtil.getDataItemValue(dataItem);
	            return modelUtil.converDataValue(
	                zrUtil.isArray(value)
	                    ? value[dimIndex]
	                    // If value is a single number or something else not array.
	                    : value,
	                dimensionInfoMap[dimName]
	            );
	        };

	        for (var idx = 0; idx < data.length; idx++) {
	            var dataItem = data[idx];
	            // Each data item is value
	            // [1, 2]
	            // 2
	            // Bar chart, line chart which uses category axis
	            // only gives the 'y' value. 'x' value is the indices of cateogry
	            // Use a tempValue to normalize the value to be a (x, y) value

	            // Store the data by dimensions
	            for (var k = 0; k < dimensions.length; k++) {
	                var dim = dimensions[k];
	                var dimStorage = storage[dim];
	                // PENDING NULL is empty or zero
	                dimStorage[idx] = dimValueGetter(dataItem, dim, idx, k);
	            }

	            indices.push(idx);
	        }

	        // Use the name in option and create id
	        for (var i = 0; i < data.length; i++) {
	            var id = '';
	            if (!nameList[i]) {
	                nameList[i] = data[i].name;
	                // Try using the id in option
	                id = data[i].id;
	            }
	            var name = nameList[i] || '';
	            if (!id && name) {
	                // Use name as id and add counter to avoid same name
	                nameRepeatCount[name] = nameRepeatCount[name] || 0;
	                id = name;
	                if (nameRepeatCount[name] > 0) {
	                    id += '__ec__' + nameRepeatCount[name];
	                }
	                nameRepeatCount[name]++;
	            }
	            id && (idList[i] = id);
	        }

	        this._nameList = nameList;
	        this._idList = idList;
	    };

	    /**
	     * @return {number}
	     */
	    listProto.count = function () {
	        return this.indices.length;
	    };

	    /**
	     * Get value. Return NaN if idx is out of range.
	     * @param {string} dim Dim must be concrete name.
	     * @param {number} idx
	     * @param {boolean} stack
	     * @return {number}
	     */
	    listProto.get = function (dim, idx, stack) {
	        var storage = this._storage;
	        var dataIndex = this.indices[idx];

	        // If value not exists
	        if (dataIndex == null) {
	            return NaN;
	        }

	        var value = storage[dim] && storage[dim][dataIndex];
	        // FIXME ordinal data type is not stackable
	        if (stack) {
	            var dimensionInfo = this._dimensionInfos[dim];
	            if (dimensionInfo && dimensionInfo.stackable) {
	                var stackedOn = this.stackedOn;
	                while (stackedOn) {
	                    // Get no stacked data of stacked on
	                    var stackedValue = stackedOn.get(dim, idx);
	                    // Considering positive stack, negative stack and empty data
	                    if ((value >= 0 && stackedValue > 0)  // Positive stack
	                        || (value <= 0 && stackedValue < 0) // Negative stack
	                    ) {
	                        value += stackedValue;
	                    }
	                    stackedOn = stackedOn.stackedOn;
	                }
	            }
	        }
	        return value;
	    };

	    /**
	     * Get value for multi dimensions.
	     * @param {Array.<string>} [dimensions] If ignored, using all dimensions.
	     * @param {number} idx
	     * @param {boolean} stack
	     * @return {number}
	     */
	    listProto.getValues = function (dimensions, idx, stack) {
	        var values = [];

	        if (!zrUtil.isArray(dimensions)) {
	            stack = idx;
	            idx = dimensions;
	            dimensions = this.dimensions;
	        }

	        for (var i = 0, len = dimensions.length; i < len; i++) {
	            values.push(this.get(dimensions[i], idx, stack));
	        }

	        return values;
	    };

	    /**
	     * If value is NaN. Inlcuding '-'
	     * @param {string} dim
	     * @param {number} idx
	     * @return {number}
	     */
	    listProto.hasValue = function (idx) {
	        var dimensions = this.dimensions;
	        var dimensionInfos = this._dimensionInfos;
	        for (var i = 0, len = dimensions.length; i < len; i++) {
	            if (
	                // Ordinal type can be string or number
	                dimensionInfos[dimensions[i]].type !== 'ordinal'
	                && isNaN(this.get(dimensions[i], idx))
	            ) {
	                return false;
	            }
	        }
	        return true;
	    };

	    /**
	     * Get extent of data in one dimension
	     * @param {string} dim
	     * @param {boolean} stack
	     */
	    listProto.getDataExtent = function (dim, stack) {
	        var dimData = this._storage[dim];
	        var dimInfo = this.getDimensionInfo(dim);
	        stack = (dimInfo && dimInfo.stackable) && stack;
	        var dimExtent = (this._extent || (this._extent = {}))[dim + (!!stack)];
	        var value;
	        if (dimExtent) {
	            return dimExtent;
	        }
	        // var dimInfo = this._dimensionInfos[dim];
	        if (dimData) {
	            var min = Infinity;
	            var max = -Infinity;
	            // var isOrdinal = dimInfo.type === 'ordinal';
	            for (var i = 0, len = this.count(); i < len; i++) {
	                value = this.get(dim, i, stack);
	                // FIXME
	                // if (isOrdinal && typeof value === 'string') {
	                //     value = zrUtil.indexOf(dimData, value);
	                // }
	                value < min && (min = value);
	                value > max && (max = value);
	            }
	            return (this._extent[dim + stack] = [min, max]);
	        }
	        else {
	            return [Infinity, -Infinity];
	        }
	    };

	    /**
	     * Get sum of data in one dimension
	     * @param {string} dim
	     * @param {boolean} stack
	     */
	    listProto.getSum = function (dim, stack) {
	        var dimData = this._storage[dim];
	        var sum = 0;
	        if (dimData) {
	            for (var i = 0, len = this.count(); i < len; i++) {
	                var value = this.get(dim, i, stack);
	                if (!isNaN(value)) {
	                    sum += value;
	                }
	            }
	        }
	        return sum;
	    };

	    /**
	     * Retreive the index with given value
	     * @param {number} idx
	     * @param {number} value
	     * @return {number}
	     */
	    // FIXME Precision of float value
	    listProto.indexOf = function (dim, value) {
	        var storage = this._storage;
	        var dimData = storage[dim];
	        var indices = this.indices;

	        if (dimData) {
	            for (var i = 0, len = indices.length; i < len; i++) {
	                var rawIndex = indices[i];
	                if (dimData[rawIndex] === value) {
	                    return i;
	                }
	            }
	        }
	        return -1;
	    };

	    /**
	     * Retreive the index with given name
	     * @param {number} idx
	     * @param {number} name
	     * @return {number}
	     */
	    listProto.indexOfName = function (name) {
	        var indices = this.indices;
	        var nameList = this._nameList;

	        for (var i = 0, len = indices.length; i < len; i++) {
	            var rawIndex = indices[i];
	            if (nameList[rawIndex] === name) {
	                return i;
	            }
	        }

	        return -1;
	    };

	    /**
	     * Retreive the index of nearest value
	     * @param {string} dim
	     * @param {number} value
	     * @param {boolean} stack If given value is after stacked
	     * @return {number}
	     */
	    listProto.indexOfNearest = function (dim, value, stack) {
	        var storage = this._storage;
	        var dimData = storage[dim];

	        if (dimData) {
	            var minDist = Number.MAX_VALUE;
	            var nearestIdx = -1;
	            for (var i = 0, len = this.count(); i < len; i++) {
	                var diff = value - this.get(dim, i, stack);
	                var dist = Math.abs(diff);
	                if (dist < minDist
	                    // For the case of two data are same on xAxis, which has sequence data.
	                    // Show the nearest index
	                    // https://github.com/ecomfe/echarts/issues/2869
	                    || (dist === minDist && diff > 0)
	                ) {
	                    minDist = dist;
	                    nearestIdx = i;
	                }
	            }
	            return nearestIdx;
	        }
	        return -1;
	    };

	    /**
	     * Get raw data index
	     * @param {number} idx
	     * @return {number}
	     */
	    listProto.getRawIndex = function (idx) {
	        var rawIdx = this.indices[idx];
	        return rawIdx == null ? -1 : rawIdx;
	    };

	    /**
	     * Get raw data item
	     * @param {number} idx
	     * @return {number}
	     */
	    listProto.getRawDataItem = function (idx) {
	        return this._rawData[this.getRawIndex(idx)];
	    };

	    /**
	     * @param {number} idx
	     * @param {boolean} [notDefaultIdx=false]
	     * @return {string}
	     */
	    listProto.getName = function (idx) {
	        return this._nameList[this.indices[idx]] || '';
	    };

	    /**
	     * @param {number} idx
	     * @param {boolean} [notDefaultIdx=false]
	     * @return {string}
	     */
	    listProto.getId = function (idx) {
	        return this._idList[this.indices[idx]] || (this.getRawIndex(idx) + '');
	    };


	    function normalizeDimensions(dimensions) {
	        if (!zrUtil.isArray(dimensions)) {
	            dimensions = [dimensions];
	        }
	        return dimensions;
	    }

	    /**
	     * Data iteration
	     * @param {string|Array.<string>}
	     * @param {Function} cb
	     * @param {boolean} [stack=false]
	     * @param {*} [context=this]
	     *
	     * @example
	     *  list.each('x', function (x, idx) {});
	     *  list.each(['x', 'y'], function (x, y, idx) {});
	     *  list.each(function (idx) {})
	     */
	    listProto.each = function (dimensions, cb, stack, context) {
	        if (typeof dimensions === 'function') {
	            context = stack;
	            stack = cb;
	            cb = dimensions;
	            dimensions = [];
	        }

	        dimensions = zrUtil.map(
	            normalizeDimensions(dimensions), this.getDimension, this
	        );

	        var value = [];
	        var dimSize = dimensions.length;
	        var indices = this.indices;

	        context = context || this;

	        for (var i = 0; i < indices.length; i++) {
	            if (dimSize === 0) {
	                cb.call(context, i);
	            }
	            // Simple optimization
	            else if (dimSize === 1) {
	                cb.call(context, this.get(dimensions[0], i, stack), i);
	            }
	            else {
	                for (var k = 0; k < dimSize; k++) {
	                    value[k] = this.get(dimensions[k], i, stack);
	                }
	                // Index
	                value[k] = i;
	                cb.apply(context, value);
	            }
	        }
	    };

	    /**
	     * Data filter
	     * @param {string|Array.<string>}
	     * @param {Function} cb
	     * @param {boolean} [stack=false]
	     * @param {*} [context=this]
	     */
	    listProto.filterSelf = function (dimensions, cb, stack, context) {
	        if (typeof dimensions === 'function') {
	            context = stack;
	            stack = cb;
	            cb = dimensions;
	            dimensions = [];
	        }

	        dimensions = zrUtil.map(
	            normalizeDimensions(dimensions), this.getDimension, this
	        );

	        var newIndices = [];
	        var value = [];
	        var dimSize = dimensions.length;
	        var indices = this.indices;

	        context = context || this;

	        for (var i = 0; i < indices.length; i++) {
	            var keep;
	            // Simple optimization
	            if (dimSize === 1) {
	                keep = cb.call(
	                    context, this.get(dimensions[0], i, stack), i
	                );
	            }
	            else {
	                for (var k = 0; k < dimSize; k++) {
	                    value[k] = this.get(dimensions[k], i, stack);
	                }
	                value[k] = i;
	                keep = cb.apply(context, value);
	            }
	            if (keep) {
	                newIndices.push(indices[i]);
	            }
	        }

	        this.indices = newIndices;

	        // Reset data extent
	        this._extent = {};

	        return this;
	    };

	    /**
	     * Data mapping to a plain array
	     * @param {string|Array.<string>} [dimensions]
	     * @param {Function} cb
	     * @param {boolean} [stack=false]
	     * @param {*} [context=this]
	     * @return {Array}
	     */
	    listProto.mapArray = function (dimensions, cb, stack, context) {
	        if (typeof dimensions === 'function') {
	            context = stack;
	            stack = cb;
	            cb = dimensions;
	            dimensions = [];
	        }

	        var result = [];
	        this.each(dimensions, function () {
	            result.push(cb && cb.apply(this, arguments));
	        }, stack, context);
	        return result;
	    };

	    function cloneListForMapAndSample(original, excludeDimensions) {
	        var allDimensions = original.dimensions;
	        var list = new List(
	            zrUtil.map(allDimensions, original.getDimensionInfo, original),
	            original.hostModel
	        );
	        // FIXME If needs stackedOn, value may already been stacked
	        transferImmuProperties(list, original);

	        var storage = list._storage = {};
	        var originalStorage = original._storage;
	        // Init storage
	        for (var i = 0; i < allDimensions.length; i++) {
	            var dim = allDimensions[i];
	            var dimStore = originalStorage[dim];
	            if (zrUtil.indexOf(excludeDimensions, dim) >= 0) {
	                storage[dim] = new dimStore.constructor(
	                    originalStorage[dim].length
	                );
	            }
	            else {
	                // Direct reference for other dimensions
	                storage[dim] = originalStorage[dim];
	            }
	        }
	        return list;
	    }

	    /**
	     * Data mapping to a new List with given dimensions
	     * @param {string|Array.<string>} dimensions
	     * @param {Function} cb
	     * @param {boolean} [stack=false]
	     * @param {*} [context=this]
	     * @return {Array}
	     */
	    listProto.map = function (dimensions, cb, stack, context) {
	        dimensions = zrUtil.map(
	            normalizeDimensions(dimensions), this.getDimension, this
	        );

	        var list = cloneListForMapAndSample(this, dimensions);
	        // Following properties are all immutable.
	        // So we can reference to the same value
	        var indices = list.indices = this.indices;

	        var storage = list._storage;

	        var tmpRetValue = [];
	        this.each(dimensions, function () {
	            var idx = arguments[arguments.length - 1];
	            var retValue = cb && cb.apply(this, arguments);
	            if (retValue != null) {
	                // a number
	                if (typeof retValue === 'number') {
	                    tmpRetValue[0] = retValue;
	                    retValue = tmpRetValue;
	                }
	                for (var i = 0; i < retValue.length; i++) {
	                    var dim = dimensions[i];
	                    var dimStore = storage[dim];
	                    var rawIdx = indices[idx];
	                    if (dimStore) {
	                        dimStore[rawIdx] = retValue[i];
	                    }
	                }
	            }
	        }, stack, context);

	        return list;
	    };

	    /**
	     * Large data down sampling on given dimension
	     * @param {string} dimension
	     * @param {number} rate
	     * @param {Function} sampleValue
	     * @param {Function} sampleIndex Sample index for name and id
	     */
	    listProto.downSample = function (dimension, rate, sampleValue, sampleIndex) {
	        var list = cloneListForMapAndSample(this, [dimension]);
	        var storage = this._storage;
	        var targetStorage = list._storage;

	        var originalIndices = this.indices;
	        var indices = list.indices = [];

	        var frameValues = [];
	        var frameIndices = [];
	        var frameSize = Math.floor(1 / rate);

	        var dimStore = targetStorage[dimension];
	        var len = this.count();
	        // Copy data from original data
	        for (var i = 0; i < storage[dimension].length; i++) {
	            targetStorage[dimension][i] = storage[dimension][i];
	        }
	        for (var i = 0; i < len; i += frameSize) {
	            // Last frame
	            if (frameSize > len - i) {
	                frameSize = len - i;
	                frameValues.length = frameSize;
	            }
	            for (var k = 0; k < frameSize; k++) {
	                var idx = originalIndices[i + k];
	                frameValues[k] = dimStore[idx];
	                frameIndices[k] = idx;
	            }
	            var value = sampleValue(frameValues);
	            var idx = frameIndices[sampleIndex(frameValues, value) || 0];
	            // Only write value on the filtered data
	            dimStore[idx] = value;
	            indices.push(idx);
	        }

	        return list;
	    };

	    /**
	     * Get model of one data item.
	     *
	     * @param {number} idx
	     */
	    // FIXME Model proxy ?
	    listProto.getItemModel = function (idx) {
	        var hostModel = this.hostModel;
	        idx = this.indices[idx];
	        return new Model(this._rawData[idx], hostModel, hostModel && hostModel.ecModel);
	    };

	    /**
	     * Create a data differ
	     * @param {module:echarts/data/List} otherList
	     * @return {module:echarts/data/DataDiffer}
	     */
	    listProto.diff = function (otherList) {
	        var idList = this._idList;
	        var otherIdList = otherList && otherList._idList;
	        return new DataDiffer(
	            otherList ? otherList.indices : [], this.indices, function (idx) {
	                return otherIdList[idx] || (idx + '');
	            }, function (idx) {
	                return idList[idx] || (idx + '');
	            }
	        );
	    };
	    /**
	     * Get visual property.
	     * @param {string} key
	     */
	    listProto.getVisual = function (key) {
	        var visual = this._visual;
	        return visual && visual[key];
	    };

	    /**
	     * Set visual property
	     * @param {string|Object} key
	     * @param {*} [value]
	     *
	     * @example
	     *  setVisual('color', color);
	     *  setVisual({
	     *      'color': color
	     *  });
	     */
	    listProto.setVisual = function (key, val) {
	        if (isObject(key)) {
	            for (var name in key) {
	                if (key.hasOwnProperty(name)) {
	                    this.setVisual(name, key[name]);
	                }
	            }
	            return;
	        }
	        this._visual = this._visual || {};
	        this._visual[key] = val;
	    };

	    /**
	     * Set layout property.
	     * @param {string} key
	     * @param {*} [val]
	     */
	    listProto.setLayout = function (key, val) {
	        if (isObject(key)) {
	            for (var name in key) {
	                if (key.hasOwnProperty(name)) {
	                    this.setLayout(name, key[name]);
	                }
	            }
	            return;
	        }
	        this._layout[key] = val;
	    };

	    /**
	     * Get layout property.
	     * @param  {string} key.
	     * @return {*}
	     */
	    listProto.getLayout = function (key) {
	        return this._layout[key];
	    };

	    /**
	     * Get layout of single data item
	     * @param {number} idx
	     */
	    listProto.getItemLayout = function (idx) {
	        return this._itemLayouts[idx];
	    };

	    /**
	     * Set layout of single data item
	     * @param {number} idx
	     * @param {Object} layout
	     * @param {boolean=} [merge=false]
	     */
	    listProto.setItemLayout = function (idx, layout, merge) {
	        this._itemLayouts[idx] = merge
	            ? zrUtil.extend(this._itemLayouts[idx] || {}, layout)
	            : layout;
	    };

	    /**
	     * Clear all layout of single data item
	     */
	    listProto.clearItemLayouts = function () {
	        this._itemLayouts.length = 0;
	    };

	    /**
	     * Get visual property of single data item
	     * @param {number} idx
	     * @param {string} key
	     * @param {boolean} ignoreParent
	     */
	    listProto.getItemVisual = function (idx, key, ignoreParent) {
	        var itemVisual = this._itemVisuals[idx];
	        var val = itemVisual && itemVisual[key];
	        if (val == null && !ignoreParent) {
	            // Use global visual property
	            return this.getVisual(key);
	        }
	        return val;
	    };

	    /**
	     * Set visual property of single data item
	     *
	     * @param {number} idx
	     * @param {string|Object} key
	     * @param {*} [value]
	     *
	     * @example
	     *  setItemVisual(0, 'color', color);
	     *  setItemVisual(0, {
	     *      'color': color
	     *  });
	     */
	    listProto.setItemVisual = function (idx, key, value) {
	        var itemVisual = this._itemVisuals[idx] || {};
	        this._itemVisuals[idx] = itemVisual;

	        if (isObject(key)) {
	            for (var name in key) {
	                if (key.hasOwnProperty(name)) {
	                    itemVisual[name] = key[name];
	                }
	            }
	            return;
	        }
	        itemVisual[key] = value;
	    };

	    var setItemDataAndSeriesIndex = function (child) {
	        child.seriesIndex = this.seriesIndex;
	        child.dataIndex = this.dataIndex;
	        child.dataType = this.dataType;
	    };
	    /**
	     * Set graphic element relative to data. It can be set as null
	     * @param {number} idx
	     * @param {module:zrender/Element} [el]
	     */
	    listProto.setItemGraphicEl = function (idx, el) {
	        var hostModel = this.hostModel;

	        if (el) {
	            // Add data index and series index for indexing the data by element
	            // Useful in tooltip
	            el.dataIndex = idx;
	            el.dataType = this.dataType;
	            el.seriesIndex = hostModel && hostModel.seriesIndex;
	            if (el.type === 'group') {
	                el.traverse(setItemDataAndSeriesIndex, el);
	            }
	        }

	        this._graphicEls[idx] = el;
	    };

	    /**
	     * @param {number} idx
	     * @return {module:zrender/Element}
	     */
	    listProto.getItemGraphicEl = function (idx) {
	        return this._graphicEls[idx];
	    };

	    /**
	     * @param {Function} cb
	     * @param {*} context
	     */
	    listProto.eachItemGraphicEl = function (cb, context) {
	        zrUtil.each(this._graphicEls, function (el, idx) {
	            if (el) {
	                cb && cb.call(context, el, idx);
	            }
	        });
	    };

	    /**
	     * Shallow clone a new list except visual and layout properties, and graph elements.
	     * New list only change the indices.
	     */
	    listProto.cloneShallow = function () {
	        var dimensionInfoList = zrUtil.map(this.dimensions, this.getDimensionInfo, this);
	        var list = new List(dimensionInfoList, this.hostModel);

	        // FIXME
	        list._storage = this._storage;

	        transferImmuProperties(list, this);

	        list.indices = this.indices.slice();

	        return list;
	    };

	    /**
	     * Wrap some method to add more feature
	     * @param {string} methodName
	     * @param {Function} injectFunction
	     */
	    listProto.wrapMethod = function (methodName, injectFunction) {
	        var originalMethod = this[methodName];
	        if (typeof originalMethod !== 'function') {
	            return;
	        }
	        this.__wrappedMethods = this.__wrappedMethods || [];
	        this.__wrappedMethods.push(methodName);
	        this[methodName] = function () {
	            var res = originalMethod.apply(this, arguments);
	            return injectFunction.apply(this, [res].concat(zrUtil.slice(arguments)));
	        };
	    };

	    // Methods that create a new list based on this list should be listed here.
	    // Notice that those method should `RETURN` the new list.
	    listProto.TRANSFERABLE_METHODS = ['cloneShallow', 'downSample', 'map'];
	    // Methods that change indices of this list should be listed here.
	    listProto.CHANGABLE_METHODS = ['filterSelf'];

	    module.exports = List;

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 96 */
/***/ function(module, exports) {

	'use strict';


	    function defaultKeyGetter(item) {
	        return item;
	    }

	    function DataDiffer(oldArr, newArr, oldKeyGetter, newKeyGetter) {
	        this._old = oldArr;
	        this._new = newArr;

	        this._oldKeyGetter = oldKeyGetter || defaultKeyGetter;
	        this._newKeyGetter = newKeyGetter || defaultKeyGetter;
	    }

	    DataDiffer.prototype = {

	        constructor: DataDiffer,

	        /**
	         * Callback function when add a data
	         */
	        add: function (func) {
	            this._add = func;
	            return this;
	        },

	        /**
	         * Callback function when update a data
	         */
	        update: function (func) {
	            this._update = func;
	            return this;
	        },

	        /**
	         * Callback function when remove a data
	         */
	        remove: function (func) {
	            this._remove = func;
	            return this;
	        },

	        execute: function () {
	            var oldArr = this._old;
	            var newArr = this._new;
	            var oldKeyGetter = this._oldKeyGetter;
	            var newKeyGetter = this._newKeyGetter;

	            var oldDataIndexMap = {};
	            var newDataIndexMap = {};
	            var i;

	            initIndexMap(oldArr, oldDataIndexMap, oldKeyGetter);
	            initIndexMap(newArr, newDataIndexMap, newKeyGetter);

	            // Travel by inverted order to make sure order consistency
	            // when duplicate keys exists (consider newDataIndex.pop() below).
	            // For performance consideration, these code below do not look neat.
	            for (i = 0; i < oldArr.length; i++) {
	                var key = oldKeyGetter(oldArr[i]);
	                var idx = newDataIndexMap[key];

	                // idx can never be empty array here. see 'set null' logic below.
	                if (idx != null) {
	                    // Consider there is duplicate key (for example, use dataItem.name as key).
	                    // We should make sure every item in newArr and oldArr can be visited.
	                    var len = idx.length;
	                    if (len) {
	                        len === 1 && (newDataIndexMap[key] = null);
	                        idx = idx.unshift();
	                    }
	                    else {
	                        newDataIndexMap[key] = null;
	                    }
	                    this._update && this._update(idx, i);
	                }
	                else {
	                    this._remove && this._remove(i);
	                }
	            }

	            for (var key in newDataIndexMap) {
	                if (newDataIndexMap.hasOwnProperty(key)) {
	                    var idx = newDataIndexMap[key];
	                    if (idx == null) {
	                        continue;
	                    }
	                    // idx can never be empty array here. see 'set null' logic above.
	                    if (!idx.length) {
	                        this._add && this._add(idx);
	                    }
	                    else {
	                        for (var i = 0, len = idx.length; i < len; i++) {
	                            this._add && this._add(idx[i]);
	                        }
	                    }
	                }
	            }
	        }
	    };

	    function initIndexMap(arr, map, keyGetter) {
	        for (var i = 0; i < arr.length; i++) {
	            var key = keyGetter(arr[i]);
	            var existence = map[key];
	            if (existence == null) {
	                map[key] = i;
	            }
	            else {
	                if (!existence.length) {
	                    map[key] = existence = [existence];
	                }
	                existence.push(i);
	            }
	        }
	    }

	    module.exports = DataDiffer;


/***/ },
/* 97 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Complete dimensions by data (guess dimension).
	 */


	    var zrUtil = __webpack_require__(3);

	    /**
	     * Complete the dimensions array guessed from the data structure.
	     * @param  {Array.<string>} dimensions      Necessary dimensions, like ['x', 'y']
	     * @param  {Array} data                     Data list. [[1, 2, 3], [2, 3, 4]]
	     * @param  {Array.<string>} defaultNames    Default names to fill not necessary dimensions, like ['value']
	     * @param  {string} extraPrefix             Prefix of name when filling the left dimensions.
	     * @return {Array.<string>}
	     */
	    function completeDimensions(dimensions, data, defaultNames, extraPrefix) {
	        if (!data) {
	            return dimensions;
	        }

	        var value0 = retrieveValue(data[0]);
	        var dimSize = zrUtil.isArray(value0) && value0.length || 1;

	        defaultNames = defaultNames || [];
	        extraPrefix = extraPrefix || 'extra';
	        for (var i = 0; i < dimSize; i++) {
	            if (!dimensions[i]) {
	                var name = defaultNames[i] || (extraPrefix + (i - defaultNames.length));
	                dimensions[i] = guessOrdinal(data, i)
	                    ? {type: 'ordinal', name: name}
	                    : name;
	            }
	        }

	        return dimensions;
	    }

	    // The rule should not be complex, otherwise user might not
	    // be able to known where the data is wrong.
	    function guessOrdinal(data, dimIndex) {
	        for (var i = 0, len = data.length; i < len; i++) {
	            var value = retrieveValue(data[i]);

	            if (!zrUtil.isArray(value)) {
	                return false;
	            }

	            var value = value[dimIndex];
	            if (value != null && isFinite(value)) {
	                return false;
	            }
	            else if (zrUtil.isString(value) && value !== '-') {
	                return true;
	            }
	        }
	        return false;
	    }

	    function retrieveValue(o) {
	        return zrUtil.isArray(o) ? o : zrUtil.isObject(o) ? o.value: o;
	    }

	    module.exports = completeDimensions;



/***/ },
/* 98 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var zrUtil = __webpack_require__(3);
	    var SymbolDraw = __webpack_require__(99);
	    var Symbol = __webpack_require__(100);
	    var lineAnimationDiff = __webpack_require__(102);
	    var graphic = __webpack_require__(42);

	    var polyHelper = __webpack_require__(103);

	    var ChartView = __webpack_require__(41);

	    function isPointsSame(points1, points2) {
	        if (points1.length !== points2.length) {
	            return;
	        }
	        for (var i = 0; i < points1.length; i++) {
	            var p1 = points1[i];
	            var p2 = points2[i];
	            if (p1[0] !== p2[0] || p1[1] !== p2[1]) {
	                return;
	            }
	        }
	        return true;
	    }

	    function getSmooth(smooth) {
	        return typeof (smooth) === 'number' ? smooth : (smooth ? 0.3 : 0);
	    }

	    function getAxisExtentWithGap(axis) {
	        var extent = axis.getGlobalExtent();
	        if (axis.onBand) {
	            // Remove extra 1px to avoid line miter in clipped edge
	            var halfBandWidth = axis.getBandWidth() / 2 - 1;
	            var dir = extent[1] > extent[0] ? 1 : -1;
	            extent[0] += dir * halfBandWidth;
	            extent[1] -= dir * halfBandWidth;
	        }
	        return extent;
	    }

	    function sign(val) {
	        return val >= 0 ? 1 : -1;
	    }
	    /**
	     * @param {module:echarts/coord/cartesian/Cartesian2D|module:echarts/coord/polar/Polar} coordSys
	     * @param {module:echarts/data/List} data
	     * @param {Array.<Array.<number>>} points
	     * @private
	     */
	    function getStackedOnPoints(coordSys, data) {
	        var baseAxis = coordSys.getBaseAxis();
	        var valueAxis = coordSys.getOtherAxis(baseAxis);
	        var valueStart = baseAxis.onZero
	            ? 0 : valueAxis.scale.getExtent()[0];

	        var valueDim = valueAxis.dim;

	        var baseDataOffset = valueDim === 'x' || valueDim === 'radius' ? 1 : 0;

	        return data.mapArray([valueDim], function (val, idx) {
	            var stackedOnSameSign;
	            var stackedOn = data.stackedOn;
	            // Find first stacked value with same sign
	            while (stackedOn &&
	                sign(stackedOn.get(valueDim, idx)) === sign(val)
	            ) {
	                stackedOnSameSign = stackedOn;
	                break;
	            }
	            var stackedData = [];
	            stackedData[baseDataOffset] = data.get(baseAxis.dim, idx);
	            stackedData[1 - baseDataOffset] = stackedOnSameSign
	                ? stackedOnSameSign.get(valueDim, idx, true) : valueStart;

	            return coordSys.dataToPoint(stackedData);
	        }, true);
	    }

	    function queryDataIndex(data, payload) {
	        if (payload.dataIndex != null) {
	            return payload.dataIndex;
	        }
	        else if (payload.name != null) {
	            return data.indexOfName(payload.name);
	        }
	    }

	    function createGridClipShape(cartesian, hasAnimation, seriesModel) {
	        var xExtent = getAxisExtentWithGap(cartesian.getAxis('x'));
	        var yExtent = getAxisExtentWithGap(cartesian.getAxis('y'));
	        var isHorizontal = cartesian.getBaseAxis().isHorizontal();

	        var x = Math.min(xExtent[0], xExtent[1]);
	        var y = Math.min(yExtent[0], yExtent[1]);
	        var width = Math.max(xExtent[0], xExtent[1]) - x;
	        var height = Math.max(yExtent[0], yExtent[1]) - y;
	        var lineWidth = seriesModel.get('lineStyle.normal.width') || 2;
	        // Expand clip shape to avoid clipping when line value exceeds axis
	        var expandSize = seriesModel.get('clipOverflow') ? lineWidth / 2 : Math.max(width, height);
	        if (isHorizontal) {
	            y -= expandSize;
	            height += expandSize * 2;
	        }
	        else {
	            x -= expandSize;
	            width += expandSize * 2;
	        }

	        var clipPath = new graphic.Rect({
	            shape: {
	                x: x,
	                y: y,
	                width: width,
	                height: height
	            }
	        });

	        if (hasAnimation) {
	            clipPath.shape[isHorizontal ? 'width' : 'height'] = 0;
	            graphic.initProps(clipPath, {
	                shape: {
	                    width: width,
	                    height: height
	                }
	            }, seriesModel);
	        }

	        return clipPath;
	    }

	    function createPolarClipShape(polar, hasAnimation, seriesModel) {
	        var angleAxis = polar.getAngleAxis();
	        var radiusAxis = polar.getRadiusAxis();

	        var radiusExtent = radiusAxis.getExtent();
	        var angleExtent = angleAxis.getExtent();

	        var RADIAN = Math.PI / 180;

	        var clipPath = new graphic.Sector({
	            shape: {
	                cx: polar.cx,
	                cy: polar.cy,
	                r0: radiusExtent[0],
	                r: radiusExtent[1],
	                startAngle: -angleExtent[0] * RADIAN,
	                endAngle: -angleExtent[1] * RADIAN,
	                clockwise: angleAxis.inverse
	            }
	        });

	        if (hasAnimation) {
	            clipPath.shape.endAngle = -angleExtent[0] * RADIAN;
	            graphic.initProps(clipPath, {
	                shape: {
	                    endAngle: -angleExtent[1] * RADIAN
	                }
	            }, seriesModel);
	        }

	        return clipPath;
	    }

	    function createClipShape(coordSys, hasAnimation, seriesModel) {
	        return coordSys.type === 'polar'
	            ? createPolarClipShape(coordSys, hasAnimation, seriesModel)
	            : createGridClipShape(coordSys, hasAnimation, seriesModel);
	    }

	    module.exports = ChartView.extend({

	        type: 'line',

	        init: function () {
	            var lineGroup = new graphic.Group();

	            var symbolDraw = new SymbolDraw();
	            this.group.add(symbolDraw.group);

	            this._symbolDraw = symbolDraw;
	            this._lineGroup = lineGroup;
	        },

	        render: function (seriesModel, ecModel, api) {
	            var coordSys = seriesModel.coordinateSystem;
	            var group = this.group;
	            var data = seriesModel.getData();
	            var lineStyleModel = seriesModel.getModel('lineStyle.normal');
	            var areaStyleModel = seriesModel.getModel('areaStyle.normal');

	            var points = data.mapArray(data.getItemLayout, true);

	            var isCoordSysPolar = coordSys.type === 'polar';
	            var prevCoordSys = this._coordSys;

	            var symbolDraw = this._symbolDraw;
	            var polyline = this._polyline;
	            var polygon = this._polygon;

	            var lineGroup = this._lineGroup;

	            var hasAnimation = seriesModel.get('animation');

	            var isAreaChart = !areaStyleModel.isEmpty();
	            var stackedOnPoints = getStackedOnPoints(coordSys, data);

	            var showSymbol = seriesModel.get('showSymbol');

	            var isSymbolIgnore = showSymbol && !isCoordSysPolar && !seriesModel.get('showAllSymbol')
	                && this._getSymbolIgnoreFunc(data, coordSys);

	            // Remove temporary symbols
	            var oldData = this._data;
	            oldData && oldData.eachItemGraphicEl(function (el, idx) {
	                if (el.__temp) {
	                    group.remove(el);
	                    oldData.setItemGraphicEl(idx, null);
	                }
	            });

	            // Remove previous created symbols if showSymbol changed to false
	            if (!showSymbol) {
	                symbolDraw.remove();
	            }

	            group.add(lineGroup);

	            // Initialization animation or coordinate system changed
	            if (
	                !(polyline && prevCoordSys.type === coordSys.type)
	            ) {
	                showSymbol && symbolDraw.updateData(data, isSymbolIgnore);

	                polyline = this._newPolyline(points, coordSys, hasAnimation);
	                if (isAreaChart) {
	                    polygon = this._newPolygon(
	                        points, stackedOnPoints,
	                        coordSys, hasAnimation
	                    );
	                }
	                lineGroup.setClipPath(createClipShape(coordSys, true, seriesModel));
	            }
	            else {
	                if (isAreaChart && !polygon) {
	                    // If areaStyle is added
	                    polygon = this._newPolygon(
	                        points, stackedOnPoints,
	                        coordSys, hasAnimation
	                    );
	                }
	                else if (polygon && !isAreaChart) {
	                    // If areaStyle is removed
	                    lineGroup.remove(polygon);
	                    polygon = this._polygon = null;
	                }

	                // Update clipPath
	                lineGroup.setClipPath(createClipShape(coordSys, false, seriesModel));

	                // Always update, or it is wrong in the case turning on legend
	                // because points are not changed
	                showSymbol && symbolDraw.updateData(data, isSymbolIgnore);

	                // Stop symbol animation and sync with line points
	                // FIXME performance?
	                data.eachItemGraphicEl(function (el) {
	                    el.stopAnimation(true);
	                });

	                // In the case data zoom triggerred refreshing frequently
	                // Data may not change if line has a category axis. So it should animate nothing
	                if (!isPointsSame(this._stackedOnPoints, stackedOnPoints)
	                    || !isPointsSame(this._points, points)
	                ) {
	                    if (hasAnimation) {
	                        this._updateAnimation(
	                            data, stackedOnPoints, coordSys, api
	                        );
	                    }
	                    else {
	                        polyline.setShape({
	                            points: points
	                        });
	                        polygon && polygon.setShape({
	                            points: points,
	                            stackedOnPoints: stackedOnPoints
	                        });
	                    }
	                }
	            }

	            polyline.useStyle(zrUtil.defaults(
	                // Use color in lineStyle first
	                lineStyleModel.getLineStyle(),
	                {
	                    fill: 'none',
	                    stroke: data.getVisual('color'),
	                    lineJoin: 'bevel'
	                }
	            ));

	            var smooth = seriesModel.get('smooth');
	            smooth = getSmooth(seriesModel.get('smooth'));
	            polyline.setShape({
	                smooth: smooth,
	                smoothMonotone: seriesModel.get('smoothMonotone'),
	                connectNulls: seriesModel.get('connectNulls')
	            });

	            if (polygon) {
	                var stackedOn = data.stackedOn;
	                var stackedOnSmooth = 0;

	                polygon.useStyle(zrUtil.defaults(
	                    areaStyleModel.getAreaStyle(),
	                    {
	                        fill: data.getVisual('color'),
	                        opacity: 0.7,
	                        lineJoin: 'bevel'
	                    }
	                ));

	                if (stackedOn) {
	                    var stackedOnSeries = stackedOn.hostModel;
	                    stackedOnSmooth = getSmooth(stackedOnSeries.get('smooth'));
	                }

	                polygon.setShape({
	                    smooth: smooth,
	                    stackedOnSmooth: stackedOnSmooth,
	                    smoothMonotone: seriesModel.get('smoothMonotone'),
	                    connectNulls: seriesModel.get('connectNulls')
	                });
	            }

	            this._data = data;
	            // Save the coordinate system for transition animation when data changed
	            this._coordSys = coordSys;
	            this._stackedOnPoints = stackedOnPoints;
	            this._points = points;
	        },

	        highlight: function (seriesModel, ecModel, api, payload) {
	            var data = seriesModel.getData();
	            var dataIndex = queryDataIndex(data, payload);

	            if (dataIndex != null && dataIndex >= 0) {
	                var symbol = data.getItemGraphicEl(dataIndex);
	                if (!symbol) {
	                    // Create a temporary symbol if it is not exists
	                    var pt = data.getItemLayout(dataIndex);
	                    symbol = new Symbol(data, dataIndex, api);
	                    symbol.position = pt;
	                    symbol.setZ(
	                        seriesModel.get('zlevel'),
	                        seriesModel.get('z')
	                    );
	                    symbol.ignore = isNaN(pt[0]) || isNaN(pt[1]);
	                    symbol.__temp = true;
	                    data.setItemGraphicEl(dataIndex, symbol);

	                    // Stop scale animation
	                    symbol.stopSymbolAnimation(true);

	                    this.group.add(symbol);
	                }
	                symbol.highlight();
	            }
	            else {
	                // Highlight whole series
	                ChartView.prototype.highlight.call(
	                    this, seriesModel, ecModel, api, payload
	                );
	            }
	        },

	        downplay: function (seriesModel, ecModel, api, payload) {
	            var data = seriesModel.getData();
	            var dataIndex = queryDataIndex(data, payload);
	            if (dataIndex != null && dataIndex >= 0) {
	                var symbol = data.getItemGraphicEl(dataIndex);
	                if (symbol) {
	                    if (symbol.__temp) {
	                        data.setItemGraphicEl(dataIndex, null);
	                        this.group.remove(symbol);
	                    }
	                    else {
	                        symbol.downplay();
	                    }
	                }
	            }
	            else {
	                // Downplay whole series
	                ChartView.prototype.downplay.call(
	                    this, seriesModel, ecModel, api, payload
	                );
	            }
	        },

	        /**
	         * @param {module:zrender/container/Group} group
	         * @param {Array.<Array.<number>>} points
	         * @private
	         */
	        _newPolyline: function (points) {
	            var polyline = this._polyline;
	            // Remove previous created polyline
	            if (polyline) {
	                this._lineGroup.remove(polyline);
	            }

	            polyline = new polyHelper.Polyline({
	                shape: {
	                    points: points
	                },
	                silent: true,
	                z2: 10
	            });

	            this._lineGroup.add(polyline);

	            this._polyline = polyline;

	            return polyline;
	        },

	        /**
	         * @param {module:zrender/container/Group} group
	         * @param {Array.<Array.<number>>} stackedOnPoints
	         * @param {Array.<Array.<number>>} points
	         * @private
	         */
	        _newPolygon: function (points, stackedOnPoints) {
	            var polygon = this._polygon;
	            // Remove previous created polygon
	            if (polygon) {
	                this._lineGroup.remove(polygon);
	            }

	            polygon = new polyHelper.Polygon({
	                shape: {
	                    points: points,
	                    stackedOnPoints: stackedOnPoints
	                },
	                silent: true
	            });

	            this._lineGroup.add(polygon);

	            this._polygon = polygon;
	            return polygon;
	        },
	        /**
	         * @private
	         */
	        _getSymbolIgnoreFunc: function (data, coordSys) {
	            var categoryAxis = coordSys.getAxesByScale('ordinal')[0];
	            // `getLabelInterval` is provided by echarts/component/axis
	            if (categoryAxis && categoryAxis.isLabelIgnored) {
	                return zrUtil.bind(categoryAxis.isLabelIgnored, categoryAxis);
	            }
	        },

	        /**
	         * @private
	         */
	        // FIXME Two value axis
	        _updateAnimation: function (data, stackedOnPoints, coordSys, api) {
	            var polyline = this._polyline;
	            var polygon = this._polygon;
	            var seriesModel = data.hostModel;

	            var diff = lineAnimationDiff(
	                this._data, data,
	                this._stackedOnPoints, stackedOnPoints,
	                this._coordSys, coordSys
	            );
	            polyline.shape.points = diff.current;

	            graphic.updateProps(polyline, {
	                shape: {
	                    points: diff.next
	                }
	            }, seriesModel);

	            if (polygon) {
	                polygon.setShape({
	                    points: diff.current,
	                    stackedOnPoints: diff.stackedOnCurrent
	                });
	                graphic.updateProps(polygon, {
	                    shape: {
	                        points: diff.next,
	                        stackedOnPoints: diff.stackedOnNext
	                    }
	                }, seriesModel);
	            }

	            var updatedDataInfo = [];
	            var diffStatus = diff.status;

	            for (var i = 0; i < diffStatus.length; i++) {
	                var cmd = diffStatus[i].cmd;
	                if (cmd === '=') {
	                    var el = data.getItemGraphicEl(diffStatus[i].idx1);
	                    if (el) {
	                        updatedDataInfo.push({
	                            el: el,
	                            ptIdx: i    // Index of points
	                        });
	                    }
	                }
	            }

	            if (polyline.animators && polyline.animators.length) {
	                polyline.animators[0].during(function () {
	                    for (var i = 0; i < updatedDataInfo.length; i++) {
	                        var el = updatedDataInfo[i].el;
	                        el.attr('position', polyline.shape.points[updatedDataInfo[i].ptIdx]);
	                    }
	                });
	            }
	        },

	        remove: function (ecModel) {
	            var group = this.group;
	            var oldData = this._data;
	            this._lineGroup.removeAll();
	            this._symbolDraw.remove(true);
	            // Remove temporary created elements when highlighting
	            oldData && oldData.eachItemGraphicEl(function (el, idx) {
	                if (el.__temp) {
	                    group.remove(el);
	                    oldData.setItemGraphicEl(idx, null);
	                }
	            });

	            this._polyline =
	            this._polygon =
	            this._coordSys =
	            this._points =
	            this._stackedOnPoints =
	            this._data = null;
	        }
	    });


/***/ },
/* 99 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @module echarts/chart/helper/SymbolDraw
	 */


	    var graphic = __webpack_require__(42);
	    var Symbol = __webpack_require__(100);

	    /**
	     * @constructor
	     * @alias module:echarts/chart/helper/SymbolDraw
	     * @param {module:zrender/graphic/Group} [symbolCtor]
	     */
	    function SymbolDraw(symbolCtor) {
	        this.group = new graphic.Group();

	        this._symbolCtor = symbolCtor || Symbol;
	    }

	    var symbolDrawProto = SymbolDraw.prototype;

	    function symbolNeedsDraw(data, idx, isIgnore) {
	        var point = data.getItemLayout(idx);
	        return point && !isNaN(point[0]) && !isNaN(point[1]) && !(isIgnore && isIgnore(idx))
	                    && data.getItemVisual(idx, 'symbol') !== 'none';
	    }
	    /**
	     * Update symbols draw by new data
	     * @param {module:echarts/data/List} data
	     * @param {Array.<boolean>} [isIgnore]
	     */
	    symbolDrawProto.updateData = function (data, isIgnore) {
	        var group = this.group;
	        var seriesModel = data.hostModel;
	        var oldData = this._data;

	        var SymbolCtor = this._symbolCtor;

	        data.diff(oldData)
	            .add(function (newIdx) {
	                var point = data.getItemLayout(newIdx);
	                if (symbolNeedsDraw(data, newIdx, isIgnore)) {
	                    var symbolEl = new SymbolCtor(data, newIdx);
	                    symbolEl.attr('position', point);
	                    data.setItemGraphicEl(newIdx, symbolEl);
	                    group.add(symbolEl);
	                }
	            })
	            .update(function (newIdx, oldIdx) {
	                var symbolEl = oldData.getItemGraphicEl(oldIdx);
	                var point = data.getItemLayout(newIdx);
	                if (!symbolNeedsDraw(data, newIdx, isIgnore)) {
	                    group.remove(symbolEl);
	                    return;
	                }
	                if (!symbolEl) {
	                    symbolEl = new SymbolCtor(data, newIdx);
	                    symbolEl.attr('position', point);
	                }
	                else {
	                    symbolEl.updateData(data, newIdx);
	                    graphic.updateProps(symbolEl, {
	                        position: point
	                    }, seriesModel);
	                }

	                // Add back
	                group.add(symbolEl);

	                data.setItemGraphicEl(newIdx, symbolEl);
	            })
	            .remove(function (oldIdx) {
	                var el = oldData.getItemGraphicEl(oldIdx);
	                el && el.fadeOut(function () {
	                    group.remove(el);
	                });
	            })
	            .execute();

	        this._data = data;
	    };

	    symbolDrawProto.updateLayout = function () {
	        var data = this._data;
	        if (data) {
	            // Not use animation
	            data.eachItemGraphicEl(function (el, idx) {
	                el.attr('position', data.getItemLayout(idx));
	            });
	        }
	    };

	    symbolDrawProto.remove = function (enableAnimation) {
	        var group = this.group;
	        var data = this._data;
	        if (data) {
	            if (enableAnimation) {
	                data.eachItemGraphicEl(function (el) {
	                    el.fadeOut(function () {
	                        group.remove(el);
	                    });
	                });
	            }
	            else {
	                group.removeAll();
	            }
	        }
	    };

	    module.exports = SymbolDraw;


/***/ },
/* 100 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @module echarts/chart/helper/Symbol
	 */


	    var zrUtil = __webpack_require__(3);
	    var symbolUtil = __webpack_require__(101);
	    var graphic = __webpack_require__(42);
	    var numberUtil = __webpack_require__(7);

	    function normalizeSymbolSize(symbolSize) {
	        if (!zrUtil.isArray(symbolSize)) {
	            symbolSize = [+symbolSize, +symbolSize];
	        }
	        return symbolSize;
	    }

	    /**
	     * @constructor
	     * @alias {module:echarts/chart/helper/Symbol}
	     * @param {module:echarts/data/List} data
	     * @param {number} idx
	     * @extends {module:zrender/graphic/Group}
	     */
	    function Symbol(data, idx) {
	        graphic.Group.call(this);

	        this.updateData(data, idx);
	    }

	    var symbolProto = Symbol.prototype;

	    function driftSymbol(dx, dy) {
	        this.parent.drift(dx, dy);
	    }

	    symbolProto._createSymbol = function (symbolType, data, idx) {
	        // Remove paths created before
	        this.removeAll();

	        var seriesModel = data.hostModel;
	        var color = data.getItemVisual(idx, 'color');

	        var symbolPath = symbolUtil.createSymbol(
	            symbolType, -0.5, -0.5, 1, 1, color
	        );

	        symbolPath.attr({
	            z2: 100,
	            culling: true,
	            scale: [0, 0]
	        });
	        // Rewrite drift method
	        symbolPath.drift = driftSymbol;

	        var size = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));

	        graphic.initProps(symbolPath, {
	            scale: size
	        }, seriesModel, idx);

	        this._symbolType = symbolType;

	        this.add(symbolPath);
	    };

	    /**
	     * Stop animation
	     * @param {boolean} toLastFrame
	     */
	    symbolProto.stopSymbolAnimation = function (toLastFrame) {
	        this.childAt(0).stopAnimation(toLastFrame);
	    };

	    /**
	     * Get scale(aka, current symbol size).
	     * Including the change caused by animation
	     */
	    symbolProto.getScale = function () {
	        return this.childAt(0).scale;
	    };

	    /**
	     * Highlight symbol
	     */
	    symbolProto.highlight = function () {
	        this.childAt(0).trigger('emphasis');
	    };

	    /**
	     * Downplay symbol
	     */
	    symbolProto.downplay = function () {
	        this.childAt(0).trigger('normal');
	    };

	    /**
	     * @param {number} zlevel
	     * @param {number} z
	     */
	    symbolProto.setZ = function (zlevel, z) {
	        var symbolPath = this.childAt(0);
	        symbolPath.zlevel = zlevel;
	        symbolPath.z = z;
	    };

	    symbolProto.setDraggable = function (draggable) {
	        var symbolPath = this.childAt(0);
	        symbolPath.draggable = draggable;
	        symbolPath.cursor = draggable ? 'move' : 'pointer';
	    };

	    /**
	     * Update symbol properties
	     * @param  {module:echarts/data/List} data
	     * @param  {number} idx
	     */
	    symbolProto.updateData = function (data, idx) {
	        var symbolType = data.getItemVisual(idx, 'symbol') || 'circle';
	        var seriesModel = data.hostModel;
	        var symbolSize = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));
	        if (symbolType !== this._symbolType) {
	            this._createSymbol(symbolType, data, idx);
	        }
	        else {
	            var symbolPath = this.childAt(0);
	            graphic.updateProps(symbolPath, {
	                scale: symbolSize
	            }, seriesModel, idx);
	        }
	        this._updateCommon(data, idx, symbolSize);

	        this._seriesModel = seriesModel;
	    };

	    // Update common properties
	    var normalStyleAccessPath = ['itemStyle', 'normal'];
	    var emphasisStyleAccessPath = ['itemStyle', 'emphasis'];
	    var normalLabelAccessPath = ['label', 'normal'];
	    var emphasisLabelAccessPath = ['label', 'emphasis'];

	    symbolProto._updateCommon = function (data, idx, symbolSize) {
	        var symbolPath = this.childAt(0);
	        var seriesModel = data.hostModel;
	        var itemModel = data.getItemModel(idx);
	        var normalItemStyleModel = itemModel.getModel(normalStyleAccessPath);
	        var color = data.getItemVisual(idx, 'color');

	        // Reset style
	        if (symbolPath.type !== 'image') {
	            symbolPath.useStyle({
	                strokeNoScale: true
	            });
	        }
	        var elStyle = symbolPath.style;

	        var hoverStyle = itemModel.getModel(emphasisStyleAccessPath).getItemStyle();

	        symbolPath.rotation = (itemModel.getShallow('symbolRotate') || 0) * Math.PI / 180 || 0;

	        var symbolOffset = itemModel.getShallow('symbolOffset');
	        if (symbolOffset) {
	            var pos = symbolPath.position;
	            pos[0] = numberUtil.parsePercent(symbolOffset[0], symbolSize[0]);
	            pos[1] = numberUtil.parsePercent(symbolOffset[1], symbolSize[1]);
	        }

	        symbolPath.setColor(color);

	        zrUtil.extend(
	            elStyle,
	            // Color must be excluded.
	            // Because symbol provide setColor individually to set fill and stroke
	            normalItemStyleModel.getItemStyle(['color'])
	        );

	        var opacity = data.getItemVisual(idx, 'opacity');
	        if (opacity != null) {
	            elStyle.opacity = opacity;
	        }

	        var labelModel = itemModel.getModel(normalLabelAccessPath);
	        var hoverLabelModel = itemModel.getModel(emphasisLabelAccessPath);

	        // Get last value dim
	        var dimensions = data.dimensions.slice();
	        var valueDim;
	        var dataType;
	        while (dimensions.length && (
	            valueDim = dimensions.pop(),
	            dataType = data.getDimensionInfo(valueDim).type,
	            dataType === 'ordinal' || dataType === 'time'
	        )) {} // jshint ignore:line

	        if (valueDim != null && labelModel.get('show')) {
	            graphic.setText(elStyle, labelModel, color);
	            elStyle.text = zrUtil.retrieve(
	                seriesModel.getFormattedLabel(idx, 'normal'),
	                data.get(valueDim, idx)
	            );
	        }
	        else {
	            elStyle.text = '';
	        }

	        if (valueDim != null && hoverLabelModel.getShallow('show')) {
	            graphic.setText(hoverStyle, hoverLabelModel, color);
	            hoverStyle.text = zrUtil.retrieve(
	                seriesModel.getFormattedLabel(idx, 'emphasis'),
	                data.get(valueDim, idx)
	            );
	        }
	        else {
	            hoverStyle.text = '';
	        }

	        var size = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));

	        symbolPath.off('mouseover')
	            .off('mouseout')
	            .off('emphasis')
	            .off('normal');

	        graphic.setHoverStyle(symbolPath, hoverStyle);

	        if (itemModel.getShallow('hoverAnimation')) {
	            var onEmphasis = function() {
	                var ratio = size[1] / size[0];
	                this.animateTo({
	                    scale: [
	                        Math.max(size[0] * 1.1, size[0] + 3),
	                        Math.max(size[1] * 1.1, size[1] + 3 * ratio)
	                    ]
	                }, 400, 'elasticOut');
	            };
	            var onNormal = function() {
	                this.animateTo({
	                    scale: size
	                }, 400, 'elasticOut');
	            };
	            symbolPath.on('mouseover', onEmphasis)
	                .on('mouseout', onNormal)
	                .on('emphasis', onEmphasis)
	                .on('normal', onNormal);
	        }
	    };

	    symbolProto.fadeOut = function (cb) {
	        var symbolPath = this.childAt(0);
	        // Avoid trigger hoverAnimation when fading
	        symbolPath.off('mouseover')
	            .off('mouseout')
	            .off('emphasis')
	            .off('normal');
	        // Not show text when animating
	        symbolPath.style.text = '';
	        graphic.updateProps(symbolPath, {
	            scale: [0, 0]
	        }, this._seriesModel, this.dataIndex, cb);
	    };

	    zrUtil.inherits(Symbol, graphic.Group);

	    module.exports = Symbol;


/***/ },
/* 101 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	// Symbol factory


	    var graphic = __webpack_require__(42);
	    var BoundingRect = __webpack_require__(15);

	    /**
	     * Triangle shape
	     * @inner
	     */
	    var Triangle = graphic.extendShape({
	        type: 'triangle',
	        shape: {
	            cx: 0,
	            cy: 0,
	            width: 0,
	            height: 0
	        },
	        buildPath: function (path, shape) {
	            var cx = shape.cx;
	            var cy = shape.cy;
	            var width = shape.width / 2;
	            var height = shape.height / 2;
	            path.moveTo(cx, cy - height);
	            path.lineTo(cx + width, cy + height);
	            path.lineTo(cx - width, cy + height);
	            path.closePath();
	        }
	    });
	    /**
	     * Diamond shape
	     * @inner
	     */
	    var Diamond = graphic.extendShape({
	        type: 'diamond',
	        shape: {
	            cx: 0,
	            cy: 0,
	            width: 0,
	            height: 0
	        },
	        buildPath: function (path, shape) {
	            var cx = shape.cx;
	            var cy = shape.cy;
	            var width = shape.width / 2;
	            var height = shape.height / 2;
	            path.moveTo(cx, cy - height);
	            path.lineTo(cx + width, cy);
	            path.lineTo(cx, cy + height);
	            path.lineTo(cx - width, cy);
	            path.closePath();
	        }
	    });

	    /**
	     * Pin shape
	     * @inner
	     */
	    var Pin = graphic.extendShape({
	        type: 'pin',
	        shape: {
	            // x, y on the cusp
	            x: 0,
	            y: 0,
	            width: 0,
	            height: 0
	        },

	        buildPath: function (path, shape) {
	            var x = shape.x;
	            var y = shape.y;
	            var w = shape.width / 5 * 3;
	            // Height must be larger than width
	            var h = Math.max(w, shape.height);
	            var r = w / 2;

	            // Dist on y with tangent point and circle center
	            var dy = r * r / (h - r);
	            var cy = y - h + r + dy;
	            var angle = Math.asin(dy / r);
	            // Dist on x with tangent point and circle center
	            var dx = Math.cos(angle) * r;

	            var tanX = Math.sin(angle);
	            var tanY = Math.cos(angle);

	            path.arc(
	                x, cy, r,
	                Math.PI - angle,
	                Math.PI * 2 + angle
	            );

	            var cpLen = r * 0.6;
	            var cpLen2 = r * 0.7;
	            path.bezierCurveTo(
	                x + dx - tanX * cpLen, cy + dy + tanY * cpLen,
	                x, y - cpLen2,
	                x, y
	            );
	            path.bezierCurveTo(
	                x, y - cpLen2,
	                x - dx + tanX * cpLen, cy + dy + tanY * cpLen,
	                x - dx, cy + dy
	            );
	            path.closePath();
	        }
	    });

	    /**
	     * Arrow shape
	     * @inner
	     */
	    var Arrow = graphic.extendShape({

	        type: 'arrow',

	        shape: {
	            x: 0,
	            y: 0,
	            width: 0,
	            height: 0
	        },

	        buildPath: function (ctx, shape) {
	            var height = shape.height;
	            var width = shape.width;
	            var x = shape.x;
	            var y = shape.y;
	            var dx = width / 3 * 2;
	            ctx.moveTo(x, y);
	            ctx.lineTo(x + dx, y + height);
	            ctx.lineTo(x, y + height / 4 * 3);
	            ctx.lineTo(x - dx, y + height);
	            ctx.lineTo(x, y);
	            ctx.closePath();
	        }
	    });

	    /**
	     * Map of path contructors
	     * @type {Object.<string, module:zrender/graphic/Path>}
	     */
	    var symbolCtors = {
	        line: graphic.Line,

	        rect: graphic.Rect,

	        roundRect: graphic.Rect,

	        square: graphic.Rect,

	        circle: graphic.Circle,

	        diamond: Diamond,

	        pin: Pin,

	        arrow: Arrow,

	        triangle: Triangle
	    };

	    var symbolShapeMakers = {

	        line: function (x, y, w, h, shape) {
	            // FIXME
	            shape.x1 = x;
	            shape.y1 = y + h / 2;
	            shape.x2 = x + w;
	            shape.y2 = y + h / 2;
	        },

	        rect: function (x, y, w, h, shape) {
	            shape.x = x;
	            shape.y = y;
	            shape.width = w;
	            shape.height = h;
	        },

	        roundRect: function (x, y, w, h, shape) {
	            shape.x = x;
	            shape.y = y;
	            shape.width = w;
	            shape.height = h;
	            shape.r = Math.min(w, h) / 4;
	        },

	        square: function (x, y, w, h, shape) {
	            var size = Math.min(w, h);
	            shape.x = x;
	            shape.y = y;
	            shape.width = size;
	            shape.height = size;
	        },

	        circle: function (x, y, w, h, shape) {
	            // Put circle in the center of square
	            shape.cx = x + w / 2;
	            shape.cy = y + h / 2;
	            shape.r = Math.min(w, h) / 2;
	        },

	        diamond: function (x, y, w, h, shape) {
	            shape.cx = x + w / 2;
	            shape.cy = y + h / 2;
	            shape.width = w;
	            shape.height = h;
	        },

	        pin: function (x, y, w, h, shape) {
	            shape.x = x + w / 2;
	            shape.y = y + h / 2;
	            shape.width = w;
	            shape.height = h;
	        },

	        arrow: function (x, y, w, h, shape) {
	            shape.x = x + w / 2;
	            shape.y = y + h / 2;
	            shape.width = w;
	            shape.height = h;
	        },

	        triangle: function (x, y, w, h, shape) {
	            shape.cx = x + w / 2;
	            shape.cy = y + h / 2;
	            shape.width = w;
	            shape.height = h;
	        }
	    };

	    var symbolBuildProxies = {};
	    for (var name in symbolCtors) {
	        symbolBuildProxies[name] = new symbolCtors[name]();
	    }

	    var Symbol = graphic.extendShape({

	        type: 'symbol',

	        shape: {
	            symbolType: '',
	            x: 0,
	            y: 0,
	            width: 0,
	            height: 0
	        },

	        beforeBrush: function () {
	            var style = this.style;
	            var shape = this.shape;
	            // FIXME
	            if (shape.symbolType === 'pin' && style.textPosition === 'inside') {
	                style.textPosition = ['50%', '40%'];
	                style.textAlign = 'center';
	                style.textVerticalAlign = 'middle';
	            }
	        },

	        buildPath: function (ctx, shape) {
	            var symbolType = shape.symbolType;
	            var proxySymbol = symbolBuildProxies[symbolType];
	            if (shape.symbolType !== 'none') {
	                if (!proxySymbol) {
	                    // Default rect
	                    symbolType = 'rect';
	                    proxySymbol = symbolBuildProxies[symbolType];
	                }
	                symbolShapeMakers[symbolType](
	                    shape.x, shape.y, shape.width, shape.height, proxySymbol.shape
	                );
	                proxySymbol.buildPath(ctx, proxySymbol.shape);
	            }
	        }
	    });

	    // Provide setColor helper method to avoid determine if set the fill or stroke outside
	    var symbolPathSetColor = function (color) {
	        if (this.type !== 'image') {
	            var symbolStyle = this.style;
	            var symbolShape = this.shape;
	            if (symbolShape && symbolShape.symbolType === 'line') {
	                symbolStyle.stroke = color;
	            }
	            else if (this.__isEmptyBrush) {
	                symbolStyle.stroke = color;
	                symbolStyle.fill = '#fff';
	            }
	            else {
	                // FIXME 判断图形默认是填充还是描边，使用 onlyStroke ?
	                symbolStyle.fill && (symbolStyle.fill = color);
	                symbolStyle.stroke && (symbolStyle.stroke = color);
	            }
	            this.dirty();
	        }
	    };

	    var symbolUtil = {
	        /**
	         * Create a symbol element with given symbol configuration: shape, x, y, width, height, color
	         * @param {string} symbolType
	         * @param {number} x
	         * @param {number} y
	         * @param {number} w
	         * @param {number} h
	         * @param {string} color
	         */
	        createSymbol: function (symbolType, x, y, w, h, color) {
	            var isEmpty = symbolType.indexOf('empty') === 0;
	            if (isEmpty) {
	                symbolType = symbolType.substr(5, 1).toLowerCase() + symbolType.substr(6);
	            }
	            var symbolPath;

	            if (symbolType.indexOf('image://') === 0) {
	                symbolPath = new graphic.Image({
	                    style: {
	                        image: symbolType.slice(8),
	                        x: x,
	                        y: y,
	                        width: w,
	                        height: h
	                    }
	                });
	            }
	            else if (symbolType.indexOf('path://') === 0) {
	                symbolPath = graphic.makePath(symbolType.slice(7), {}, new BoundingRect(x, y, w, h));
	            }
	            else {
	                symbolPath = new Symbol({
	                    shape: {
	                        symbolType: symbolType,
	                        x: x,
	                        y: y,
	                        width: w,
	                        height: h
	                    }
	                });
	            }

	            symbolPath.__isEmptyBrush = isEmpty;

	            symbolPath.setColor = symbolPathSetColor;

	            symbolPath.setColor(color);

	            return symbolPath;
	        }
	    };

	    module.exports = symbolUtil;


/***/ },
/* 102 */
/***/ function(module, exports) {

	

	    // var arrayDiff = require('zrender/lib/core/arrayDiff');
	    // 'zrender/core/arrayDiff' has been used before, but it did
	    // not do well in performance when roam with fixed dataZoom window.

	    function sign(val) {
	        return val >= 0 ? 1 : -1;
	    }

	    function getStackedOnPoint(coordSys, data, idx) {
	        var baseAxis = coordSys.getBaseAxis();
	        var valueAxis = coordSys.getOtherAxis(baseAxis);
	        var valueStart = baseAxis.onZero
	            ? 0 : valueAxis.scale.getExtent()[0];

	        var valueDim = valueAxis.dim;
	        var baseDataOffset = valueDim === 'x' || valueDim === 'radius' ? 1 : 0;

	        var stackedOnSameSign;
	        var stackedOn = data.stackedOn;
	        var val = data.get(valueDim, idx);
	        // Find first stacked value with same sign
	        while (stackedOn &&
	            sign(stackedOn.get(valueDim, idx)) === sign(val)
	        ) {
	            stackedOnSameSign = stackedOn;
	            break;
	        }
	        var stackedData = [];
	        stackedData[baseDataOffset] = data.get(baseAxis.dim, idx);
	        stackedData[1 - baseDataOffset] = stackedOnSameSign
	            ? stackedOnSameSign.get(valueDim, idx, true) : valueStart;

	        return coordSys.dataToPoint(stackedData);
	    }

	    // function convertToIntId(newIdList, oldIdList) {
	    //     // Generate int id instead of string id.
	    //     // Compare string maybe slow in score function of arrDiff

	    //     // Assume id in idList are all unique
	    //     var idIndicesMap = {};
	    //     var idx = 0;
	    //     for (var i = 0; i < newIdList.length; i++) {
	    //         idIndicesMap[newIdList[i]] = idx;
	    //         newIdList[i] = idx++;
	    //     }
	    //     for (var i = 0; i < oldIdList.length; i++) {
	    //         var oldId = oldIdList[i];
	    //         // Same with newIdList
	    //         if (idIndicesMap[oldId]) {
	    //             oldIdList[i] = idIndicesMap[oldId];
	    //         }
	    //         else {
	    //             oldIdList[i] = idx++;
	    //         }
	    //     }
	    // }

	    function diffData(oldData, newData) {
	        var diffResult = [];

	        newData.diff(oldData)
	            .add(function (idx) {
	                diffResult.push({cmd: '+', idx: idx});
	            })
	            .update(function (newIdx, oldIdx) {
	                diffResult.push({cmd: '=', idx: oldIdx, idx1: newIdx});
	            })
	            .remove(function (idx) {
	                diffResult.push({cmd: '-', idx: idx});
	            })
	            .execute();

	        return diffResult;
	    }

	    module.exports = function (
	        oldData, newData,
	        oldStackedOnPoints, newStackedOnPoints,
	        oldCoordSys, newCoordSys
	    ) {
	        var diff = diffData(oldData, newData);

	        // var newIdList = newData.mapArray(newData.getId);
	        // var oldIdList = oldData.mapArray(oldData.getId);

	        // convertToIntId(newIdList, oldIdList);

	        // // FIXME One data ?
	        // diff = arrayDiff(oldIdList, newIdList);

	        var currPoints = [];
	        var nextPoints = [];
	        // Points for stacking base line
	        var currStackedPoints = [];
	        var nextStackedPoints = [];

	        var status = [];
	        var sortedIndices = [];
	        var rawIndices = [];
	        var dims = newCoordSys.dimensions;
	        for (var i = 0; i < diff.length; i++) {
	            var diffItem = diff[i];
	            var pointAdded = true;

	            // FIXME, animation is not so perfect when dataZoom window moves fast
	            // Which is in case remvoing or add more than one data in the tail or head
	            switch (diffItem.cmd) {
	                case '=':
	                    var currentPt = oldData.getItemLayout(diffItem.idx);
	                    var nextPt = newData.getItemLayout(diffItem.idx1);
	                    // If previous data is NaN, use next point directly
	                    if (isNaN(currentPt[0]) || isNaN(currentPt[1])) {
	                        currentPt = nextPt.slice();
	                    }
	                    currPoints.push(currentPt);
	                    nextPoints.push(nextPt);

	                    currStackedPoints.push(oldStackedOnPoints[diffItem.idx]);
	                    nextStackedPoints.push(newStackedOnPoints[diffItem.idx1]);

	                    rawIndices.push(newData.getRawIndex(diffItem.idx1));
	                    break;
	                case '+':
	                    var idx = diffItem.idx;
	                    currPoints.push(
	                        oldCoordSys.dataToPoint([
	                            newData.get(dims[0], idx, true), newData.get(dims[1], idx, true)
	                        ])
	                    );

	                    nextPoints.push(newData.getItemLayout(idx).slice());

	                    currStackedPoints.push(
	                        getStackedOnPoint(oldCoordSys, newData, idx)
	                    );
	                    nextStackedPoints.push(newStackedOnPoints[idx]);

	                    rawIndices.push(newData.getRawIndex(idx));
	                    break;
	                case '-':
	                    var idx = diffItem.idx;
	                    var rawIndex = oldData.getRawIndex(idx);
	                    // Data is replaced. In the case of dynamic data queue
	                    // FIXME FIXME FIXME
	                    if (rawIndex !== idx) {
	                        currPoints.push(oldData.getItemLayout(idx));
	                        nextPoints.push(newCoordSys.dataToPoint([
	                            oldData.get(dims[0], idx, true), oldData.get(dims[1], idx, true)
	                        ]));

	                        currStackedPoints.push(oldStackedOnPoints[idx]);
	                        nextStackedPoints.push(
	                            getStackedOnPoint(
	                                newCoordSys, oldData, idx
	                            )
	                        );

	                        rawIndices.push(rawIndex);
	                    }
	                    else {
	                        pointAdded = false;
	                    }
	            }

	            // Original indices
	            if (pointAdded) {
	                status.push(diffItem);
	                sortedIndices.push(sortedIndices.length);
	            }
	        }

	        // Diff result may be crossed if all items are changed
	        // Sort by data index
	        sortedIndices.sort(function (a, b) {
	            return rawIndices[a] - rawIndices[b];
	        });

	        var sortedCurrPoints = [];
	        var sortedNextPoints = [];

	        var sortedCurrStackedPoints = [];
	        var sortedNextStackedPoints = [];

	        var sortedStatus = [];
	        for (var i = 0; i < sortedIndices.length; i++) {
	            var idx = sortedIndices[i];
	            sortedCurrPoints[i] = currPoints[idx];
	            sortedNextPoints[i] = nextPoints[idx];

	            sortedCurrStackedPoints[i] = currStackedPoints[idx];
	            sortedNextStackedPoints[i] = nextStackedPoints[idx];

	            sortedStatus[i] = status[idx];
	        }

	        return {
	            current: sortedCurrPoints,
	            next: sortedNextPoints,

	            stackedOnCurrent: sortedCurrStackedPoints,
	            stackedOnNext: sortedNextStackedPoints,

	            status: sortedStatus
	        };
	    };


/***/ },
/* 103 */
/***/ function(module, exports, __webpack_require__) {

	// Poly path support NaN point


	    var Path = __webpack_require__(44);
	    var vec2 = __webpack_require__(16);

	    var vec2Min = vec2.min;
	    var vec2Max = vec2.max;

	    var scaleAndAdd = vec2.scaleAndAdd;
	    var v2Copy = vec2.copy;

	    // Temporary variable
	    var v = [];
	    var cp0 = [];
	    var cp1 = [];

	    function isPointNull(p) {
	        return isNaN(p[0]) || isNaN(p[1]);
	    }

	    function drawSegment(
	        ctx, points, start, segLen, allLen,
	        dir, smoothMin, smoothMax, smooth, smoothMonotone, connectNulls
	    ) {
	        var prevIdx = 0;
	        var idx = start;
	        for (var k = 0; k < segLen; k++) {
	            var p = points[idx];
	            if (idx >= allLen || idx < 0) {
	                break;
	            }
	            if (isPointNull(p)) {
	                if (connectNulls) {
	                    idx += dir;
	                    continue;
	                }
	                break;
	            }

	            if (idx === start) {
	                ctx[dir > 0 ? 'moveTo' : 'lineTo'](p[0], p[1]);
	                v2Copy(cp0, p);
	            }
	            else {
	                if (smooth > 0) {
	                    var nextIdx = idx + dir;
	                    var nextP = points[nextIdx];
	                    if (connectNulls) {
	                        // Find next point not null
	                        while (nextP && isPointNull(points[nextIdx])) {
	                            nextIdx += dir;
	                            nextP = points[nextIdx];
	                        }
	                    }

	                    var ratioNextSeg = 0.5;
	                    var prevP = points[prevIdx];
	                    var nextP = points[nextIdx];
	                    // Last point
	                    if (!nextP || isPointNull(nextP)) {
	                        v2Copy(cp1, p);
	                    }
	                    else {
	                        // If next data is null in not connect case
	                        if (isPointNull(nextP) && !connectNulls) {
	                            nextP = p;
	                        }

	                        vec2.sub(v, nextP, prevP);

	                        var lenPrevSeg;
	                        var lenNextSeg;
	                        if (smoothMonotone === 'x' || smoothMonotone === 'y') {
	                            var dim = smoothMonotone === 'x' ? 0 : 1;
	                            lenPrevSeg = Math.abs(p[dim] - prevP[dim]);
	                            lenNextSeg = Math.abs(p[dim] - nextP[dim]);
	                        }
	                        else {
	                            lenPrevSeg = vec2.dist(p, prevP);
	                            lenNextSeg = vec2.dist(p, nextP);
	                        }

	                        // Use ratio of seg length
	                        ratioNextSeg = lenNextSeg / (lenNextSeg + lenPrevSeg);

	                        scaleAndAdd(cp1, p, v, -smooth * (1 - ratioNextSeg));
	                    }
	                    // Smooth constraint
	                    vec2Min(cp0, cp0, smoothMax);
	                    vec2Max(cp0, cp0, smoothMin);
	                    vec2Min(cp1, cp1, smoothMax);
	                    vec2Max(cp1, cp1, smoothMin);

	                    ctx.bezierCurveTo(
	                        cp0[0], cp0[1],
	                        cp1[0], cp1[1],
	                        p[0], p[1]
	                    );
	                    // cp0 of next segment
	                    scaleAndAdd(cp0, p, v, smooth * ratioNextSeg);
	                }
	                else {
	                    ctx.lineTo(p[0], p[1]);
	                }
	            }

	            prevIdx = idx;
	            idx += dir;
	        }

	        return k;
	    }

	    function getBoundingBox(points, smoothConstraint) {
	        var ptMin = [Infinity, Infinity];
	        var ptMax = [-Infinity, -Infinity];
	        if (smoothConstraint) {
	            for (var i = 0; i < points.length; i++) {
	                var pt = points[i];
	                if (pt[0] < ptMin[0]) { ptMin[0] = pt[0]; }
	                if (pt[1] < ptMin[1]) { ptMin[1] = pt[1]; }
	                if (pt[0] > ptMax[0]) { ptMax[0] = pt[0]; }
	                if (pt[1] > ptMax[1]) { ptMax[1] = pt[1]; }
	            }
	        }
	        return {
	            min: smoothConstraint ? ptMin : ptMax,
	            max: smoothConstraint ? ptMax : ptMin
	        };
	    }

	    module.exports = {

	        Polyline: Path.extend({

	            type: 'ec-polyline',

	            shape: {
	                points: [],

	                smooth: 0,

	                smoothConstraint: true,

	                smoothMonotone: null,

	                connectNulls: false
	            },

	            style: {
	                fill: null,

	                stroke: '#000'
	            },

	            buildPath: function (ctx, shape) {
	                var points = shape.points;

	                var i = 0;
	                var len = points.length;

	                var result = getBoundingBox(points, shape.smoothConstraint);

	                if (shape.connectNulls) {
	                    // Must remove first and last null values avoid draw error in polygon
	                    for (; len > 0; len--) {
	                        if (!isPointNull(points[len - 1])) {
	                            break;
	                        }
	                    }
	                    for (; i < len; i++) {
	                        if (!isPointNull(points[i])) {
	                            break;
	                        }
	                    }
	                }
	                while (i < len) {
	                    i += drawSegment(
	                        ctx, points, i, len, len,
	                        1, result.min, result.max, shape.smooth,
	                        shape.smoothMonotone, shape.connectNulls
	                    ) + 1;
	                }
	            }
	        }),

	        Polygon: Path.extend({

	            type: 'ec-polygon',

	            shape: {
	                points: [],

	                // Offset between stacked base points and points
	                stackedOnPoints: [],

	                smooth: 0,

	                stackedOnSmooth: 0,

	                smoothConstraint: true,

	                smoothMonotone: null,

	                connectNulls: false
	            },

	            buildPath: function (ctx, shape) {
	                var points = shape.points;
	                var stackedOnPoints = shape.stackedOnPoints;

	                var i = 0;
	                var len = points.length;
	                var smoothMonotone = shape.smoothMonotone;
	                var bbox = getBoundingBox(points, shape.smoothConstraint);
	                var stackedOnBBox = getBoundingBox(stackedOnPoints, shape.smoothConstraint);

	                if (shape.connectNulls) {
	                    // Must remove first and last null values avoid draw error in polygon
	                    for (; len > 0; len--) {
	                        if (!isPointNull(points[len - 1])) {
	                            break;
	                        }
	                    }
	                    for (; i < len; i++) {
	                        if (!isPointNull(points[i])) {
	                            break;
	                        }
	                    }
	                }
	                while (i < len) {
	                    var k = drawSegment(
	                        ctx, points, i, len, len,
	                        1, bbox.min, bbox.max, shape.smooth,
	                        smoothMonotone, shape.connectNulls
	                    );
	                    drawSegment(
	                        ctx, stackedOnPoints, i + k - 1, k, len,
	                        -1, stackedOnBBox.min, stackedOnBBox.max, shape.stackedOnSmooth,
	                        smoothMonotone, shape.connectNulls
	                    );
	                    i += k + 1;

	                    ctx.closePath();
	                }
	            }
	        })
	    };


/***/ },
/* 104 */
/***/ function(module, exports) {

	

	    module.exports = function (seriesType, defaultSymbolType, legendSymbol, ecModel, api) {

	        // Encoding visual for all series include which is filtered for legend drawing
	        ecModel.eachRawSeriesByType(seriesType, function (seriesModel) {
	            var data = seriesModel.getData();

	            var symbolType = seriesModel.get('symbol') || defaultSymbolType;
	            var symbolSize = seriesModel.get('symbolSize');

	            data.setVisual({
	                legendSymbol: legendSymbol || symbolType,
	                symbol: symbolType,
	                symbolSize: symbolSize
	            });

	            // Only visible series has each data be visual encoded
	            if (!ecModel.isSeriesFiltered(seriesModel)) {
	                if (typeof symbolSize === 'function') {
	                    data.each(function (idx) {
	                        var rawValue = seriesModel.getRawValue(idx);
	                        // FIXME
	                        var params = seriesModel.getDataParams(idx);
	                        data.setItemVisual(idx, 'symbolSize', symbolSize(rawValue, params));
	                    });
	                }
	                data.each(function (idx) {
	                    var itemModel = data.getItemModel(idx);
	                    var itemSymbolType = itemModel.get('symbol', true);
	                    var itemSymbolSize = itemModel.get('symbolSize', true);
	                    // If has item symbol
	                    if (itemSymbolType != null) {
	                        data.setItemVisual(idx, 'symbol', itemSymbolType);
	                    }
	                    if (itemSymbolSize != null) {
	                        // PENDING Transform symbolSize ?
	                        data.setItemVisual(idx, 'symbolSize', itemSymbolSize);
	                    }
	                });
	            }
	        });
	    };


/***/ },
/* 105 */
/***/ function(module, exports) {

	

	    module.exports = function (seriesType, ecModel, api) {
	        ecModel.eachSeriesByType(seriesType, function (seriesModel) {
	            var data = seriesModel.getData();
	            var coordSys = seriesModel.coordinateSystem;

	            if (coordSys) {
	                var dims = coordSys.dimensions;
	                data.each(dims, function (x, y, idx) {
	                    var point;
	                    if (!isNaN(x) && !isNaN(y)) {
	                        point = coordSys.dataToPoint([x, y]);
	                    }
	                    else {
	                        // Also {Array.<number>}, not undefined to avoid if...else... statement
	                        point = [NaN, NaN];
	                    }

	                    data.setItemLayout(idx, point);
	                }, true);
	            }
	        });
	    };


/***/ },
/* 106 */
/***/ function(module, exports) {

	
	    var samplers = {
	        average: function (frame) {
	            var sum = 0;
	            var count = 0;
	            for (var i = 0; i < frame.length; i++) {
	                if (!isNaN(frame[i])) {
	                    sum += frame[i];
	                    count++;
	                }
	            }
	            // Return NaN if count is 0
	            return count === 0 ? NaN : sum / count;
	        },
	        sum: function (frame) {
	            var sum = 0;
	            for (var i = 0; i < frame.length; i++) {
	                // Ignore NaN
	                sum += frame[i] || 0;
	            }
	            return sum;
	        },
	        max: function (frame) {
	            var max = -Infinity;
	            for (var i = 0; i < frame.length; i++) {
	                frame[i] > max && (max = frame[i]);
	            }
	            return max;
	        },
	        min: function (frame) {
	            var min = Infinity;
	            for (var i = 0; i < frame.length; i++) {
	                frame[i] < min && (min = frame[i]);
	            }
	            return min;
	        },
	        // TODO
	        // Median
	        nearest: function (frame) {
	            return frame[0];
	        }
	    };

	    var indexSampler = function (frame, value) {
	        return Math.round(frame.length / 2);
	    };
	    module.exports = function (seriesType, ecModel, api) {
	        ecModel.eachSeriesByType(seriesType, function (seriesModel) {
	            var data = seriesModel.getData();
	            var sampling = seriesModel.get('sampling');
	            var coordSys = seriesModel.coordinateSystem;
	            // Only cartesian2d support down sampling
	            if (coordSys.type === 'cartesian2d' && sampling) {
	                var baseAxis = coordSys.getBaseAxis();
	                var valueAxis = coordSys.getOtherAxis(baseAxis);
	                var extent = baseAxis.getExtent();
	                // Coordinste system has been resized
	                var size = extent[1] - extent[0];
	                var rate = Math.round(data.count() / size);
	                if (rate > 1) {
	                    var sampler;
	                    if (typeof sampling === 'string') {
	                        sampler = samplers[sampling];
	                    }
	                    else if (typeof sampling === 'function') {
	                        sampler = sampling;
	                    }
	                    if (sampler) {
	                        data = data.downSample(
	                            valueAxis.dim, 1 / rate, sampler, indexSampler
	                        );
	                        seriesModel.setData(data);
	                    }
	                }
	            }
	        }, this);
	    };


/***/ },
/* 107 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var graphic = __webpack_require__(42);
	    var zrUtil = __webpack_require__(3);

	    __webpack_require__(108);

	    __webpack_require__(125);

	    // Grid view
	    __webpack_require__(1).extendComponentView({

	        type: 'grid',

	        render: function (gridModel, ecModel) {
	            this.group.removeAll();
	            if (gridModel.get('show')) {
	                this.group.add(new graphic.Rect({
	                    shape:gridModel.coordinateSystem.getRect(),
	                    style: zrUtil.defaults({
	                        fill: gridModel.get('backgroundColor')
	                    }, gridModel.getItemStyle()),
	                    silent: true
	                }));
	            }
	        }
	    });


/***/ },
/* 108 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Grid is a region which contains at most 4 cartesian systems
	 *
	 * TODO Default cartesian
	 */
	var factory = exports;

	    var layout = __webpack_require__(21);
	    var axisHelper = __webpack_require__(109);

	    var zrUtil = __webpack_require__(3);
	    var Cartesian2D = __webpack_require__(115);
	    var Axis2D = __webpack_require__(117);

	    var each = zrUtil.each;

	    var ifAxisCrossZero = axisHelper.ifAxisCrossZero;
	    var niceScaleExtent = axisHelper.niceScaleExtent;

	    // 依赖 GridModel, AxisModel 做预处理
	    __webpack_require__(120);

	    /**
	     * Check if the axis is used in the specified grid
	     * @inner
	     */
	    function isAxisUsedInTheGrid(axisModel, gridModel, ecModel) {
	        return ecModel.getComponent('grid', axisModel.get('gridIndex')) === gridModel;
	    }

	    function getLabelUnionRect(axis) {
	        var axisModel = axis.model;
	        var labels = axisModel.getFormattedLabels();
	        var rect;
	        var step = 1;
	        var labelCount = labels.length;
	        if (labelCount > 40) {
	            // Simple optimization for large amount of labels
	            step = Math.ceil(labelCount / 40);
	        }
	        for (var i = 0; i < labelCount; i += step) {
	            if (!axis.isLabelIgnored(i)) {
	                var singleRect = axisModel.getTextRect(labels[i]);
	                // FIXME consider label rotate
	                rect ? rect.union(singleRect) : (rect = singleRect);
	            }
	        }
	        return rect;
	    }

	    function Grid(gridModel, ecModel, api) {
	        /**
	         * @type {Object.<string, module:echarts/coord/cartesian/Cartesian2D>}
	         * @private
	         */
	        this._coordsMap = {};

	        /**
	         * @type {Array.<module:echarts/coord/cartesian/Cartesian>}
	         * @private
	         */
	        this._coordsList = [];

	        /**
	         * @type {Object.<string, module:echarts/coord/cartesian/Axis2D>}
	         * @private
	         */
	        this._axesMap = {};

	        /**
	         * @type {Array.<module:echarts/coord/cartesian/Axis2D>}
	         * @private
	         */
	        this._axesList = [];

	        this._initCartesian(gridModel, ecModel, api);

	        this._model = gridModel;
	    }

	    var gridProto = Grid.prototype;

	    gridProto.type = 'grid';

	    gridProto.getRect = function () {
	        return this._rect;
	    };

	    gridProto.update = function (ecModel, api) {

	        var axesMap = this._axesMap;

	        this._updateScale(ecModel, this._model);

	        function ifAxisCanNotOnZero(otherAxisDim) {
	            var axes = axesMap[otherAxisDim];
	            for (var idx in axes) {
	                var axis = axes[idx];
	                if (axis && (axis.type === 'category' || !ifAxisCrossZero(axis))) {
	                    return true;
	                }
	            }
	            return false;
	        }

	        each(axesMap.x, function (xAxis) {
	            niceScaleExtent(xAxis, xAxis.model);
	        });
	        each(axesMap.y, function (yAxis) {
	            niceScaleExtent(yAxis, yAxis.model);
	        });
	        // Fix configuration
	        each(axesMap.x, function (xAxis) {
	            // onZero can not be enabled in these two situations
	            // 1. When any other axis is a category axis
	            // 2. When any other axis not across 0 point
	            if (ifAxisCanNotOnZero('y')) {
	                xAxis.onZero = false;
	            }
	        });
	        each(axesMap.y, function (yAxis) {
	            if (ifAxisCanNotOnZero('x')) {
	                yAxis.onZero = false;
	            }
	        });

	        // Resize again if containLabel is enabled
	        // FIXME It may cause getting wrong grid size in data processing stage
	        this.resize(this._model, api);
	    };

	    /**
	     * Resize the grid
	     * @param {module:echarts/coord/cartesian/GridModel} gridModel
	     * @param {module:echarts/ExtensionAPI} api
	     */
	    gridProto.resize = function (gridModel, api) {

	        var gridRect = layout.getLayoutRect(
	            gridModel.getBoxLayoutParams(), {
	                width: api.getWidth(),
	                height: api.getHeight()
	            });

	        this._rect = gridRect;

	        var axesList = this._axesList;

	        adjustAxes();

	        // Minus label size
	        if (gridModel.get('containLabel')) {
	            each(axesList, function (axis) {
	                if (!axis.model.get('axisLabel.inside')) {
	                    var labelUnionRect = getLabelUnionRect(axis);
	                    if (labelUnionRect) {
	                        var dim = axis.isHorizontal() ? 'height' : 'width';
	                        var margin = axis.model.get('axisLabel.margin');
	                        gridRect[dim] -= labelUnionRect[dim] + margin;
	                        if (axis.position === 'top') {
	                            gridRect.y += labelUnionRect.height + margin;
	                        }
	                        else if (axis.position === 'left')  {
	                            gridRect.x += labelUnionRect.width + margin;
	                        }
	                    }
	                }
	            });

	            adjustAxes();
	        }

	        function adjustAxes() {
	            each(axesList, function (axis) {
	                var isHorizontal = axis.isHorizontal();
	                var extent = isHorizontal ? [0, gridRect.width] : [0, gridRect.height];
	                var idx = axis.inverse ? 1 : 0;
	                axis.setExtent(extent[idx], extent[1 - idx]);
	                updateAxisTransfrom(axis, isHorizontal ? gridRect.x : gridRect.y);
	            });
	        }
	    };

	    /**
	     * @param {string} axisType
	     * @param {ndumber} [axisIndex]
	     */
	    gridProto.getAxis = function (axisType, axisIndex) {
	        var axesMapOnDim = this._axesMap[axisType];
	        if (axesMapOnDim != null) {
	            if (axisIndex == null) {
	                // Find first axis
	                for (var name in axesMapOnDim) {
	                    return axesMapOnDim[name];
	                }
	            }
	            return axesMapOnDim[axisIndex];
	        }
	    };

	    gridProto.getCartesian = function (xAxisIndex, yAxisIndex) {
	        var key = 'x' + xAxisIndex + 'y' + yAxisIndex;
	        return this._coordsMap[key];
	    };

	    /**
	     * Initialize cartesian coordinate systems
	     * @private
	     */
	    gridProto._initCartesian = function (gridModel, ecModel, api) {
	        var axisPositionUsed = {
	            left: false,
	            right: false,
	            top: false,
	            bottom: false
	        };

	        var axesMap = {
	            x: {},
	            y: {}
	        };
	        var axesCount = {
	            x: 0,
	            y: 0
	        };

	        /// Create axis
	        ecModel.eachComponent('xAxis', createAxisCreator('x'), this);
	        ecModel.eachComponent('yAxis', createAxisCreator('y'), this);

	        if (!axesCount.x || !axesCount.y) {
	            // Roll back when there no either x or y axis
	            this._axesMap = {};
	            this._axesList = [];
	            return;
	        }

	        this._axesMap = axesMap;

	        /// Create cartesian2d
	        each(axesMap.x, function (xAxis, xAxisIndex) {
	            each(axesMap.y, function (yAxis, yAxisIndex) {
	                var key = 'x' + xAxisIndex + 'y' + yAxisIndex;
	                var cartesian = new Cartesian2D(key);

	                cartesian.grid = this;

	                this._coordsMap[key] = cartesian;
	                this._coordsList.push(cartesian);

	                cartesian.addAxis(xAxis);
	                cartesian.addAxis(yAxis);
	            }, this);
	        }, this);

	        function createAxisCreator(axisType) {
	            return function (axisModel, idx) {
	                if (!isAxisUsedInTheGrid(axisModel, gridModel, ecModel)) {
	                    return;
	                }

	                var axisPosition = axisModel.get('position');
	                if (axisType === 'x') {
	                    // Fix position
	                    if (axisPosition !== 'top' && axisPosition !== 'bottom') {
	                        // Default bottom of X
	                        axisPosition = 'bottom';
	                    }
	                    if (axisPositionUsed[axisPosition]) {
	                        axisPosition = axisPosition === 'top' ? 'bottom' : 'top';
	                    }
	                }
	                else {
	                    // Fix position
	                    if (axisPosition !== 'left' && axisPosition !== 'right') {
	                        // Default left of Y
	                        axisPosition = 'left';
	                    }
	                    if (axisPositionUsed[axisPosition]) {
	                        axisPosition = axisPosition === 'left' ? 'right' : 'left';
	                    }
	                }
	                axisPositionUsed[axisPosition] = true;

	                var axis = new Axis2D(
	                    axisType, axisHelper.createScaleByModel(axisModel),
	                    [0, 0],
	                    axisModel.get('type'),
	                    axisPosition
	                );

	                var isCategory = axis.type === 'category';
	                axis.onBand = isCategory && axisModel.get('boundaryGap');
	                axis.inverse = axisModel.get('inverse');

	                axis.onZero = axisModel.get('axisLine.onZero');

	                // Inject axis into axisModel
	                axisModel.axis = axis;

	                // Inject axisModel into axis
	                axis.model = axisModel;

	                // Index of axis, can be used as key
	                axis.index = idx;

	                this._axesList.push(axis);

	                axesMap[axisType][idx] = axis;
	                axesCount[axisType]++;
	            };
	        }
	    };

	    /**
	     * Update cartesian properties from series
	     * @param  {module:echarts/model/Option} option
	     * @private
	     */
	    gridProto._updateScale = function (ecModel, gridModel) {
	        // Reset scale
	        zrUtil.each(this._axesList, function (axis) {
	            axis.scale.setExtent(Infinity, -Infinity);
	        });
	        ecModel.eachSeries(function (seriesModel) {
	            if (seriesModel.get('coordinateSystem') === 'cartesian2d') {
	                var xAxisIndex = seriesModel.get('xAxisIndex');
	                var yAxisIndex = seriesModel.get('yAxisIndex');

	                var xAxisModel = ecModel.getComponent('xAxis', xAxisIndex);
	                var yAxisModel = ecModel.getComponent('yAxis', yAxisIndex);

	                if (!isAxisUsedInTheGrid(xAxisModel, gridModel, ecModel)
	                    || !isAxisUsedInTheGrid(yAxisModel, gridModel, ecModel)
	                 ) {
	                    return;
	                }

	                var cartesian = this.getCartesian(xAxisIndex, yAxisIndex);
	                var data = seriesModel.getData();
	                var xAxis = cartesian.getAxis('x');
	                var yAxis = cartesian.getAxis('y');

	                if (data.type === 'list') {
	                    unionExtent(data, xAxis, seriesModel);
	                    unionExtent(data, yAxis, seriesModel);
	                }
	            }
	        }, this);

	        function unionExtent(data, axis, seriesModel) {
	            each(seriesModel.coordDimToDataDim(axis.dim), function (dim) {
	                axis.scale.unionExtent(data.getDataExtent(
	                    dim, axis.scale.type !== 'ordinal'
	                ));
	            });
	        }
	    };

	    /**
	     * @inner
	     */
	    function updateAxisTransfrom(axis, coordBase) {
	        var axisExtent = axis.getExtent();
	        var axisExtentSum = axisExtent[0] + axisExtent[1];

	        // Fast transform
	        axis.toGlobalCoord = axis.dim === 'x'
	            ? function (coord) {
	                return coord + coordBase;
	            }
	            : function (coord) {
	                return axisExtentSum - coord + coordBase;
	            };
	        axis.toLocalCoord = axis.dim === 'x'
	            ? function (coord) {
	                return coord - coordBase;
	            }
	            : function (coord) {
	                return axisExtentSum - coord + coordBase;
	            };
	    }

	    Grid.create = function (ecModel, api) {
	        var grids = [];
	        ecModel.eachComponent('grid', function (gridModel, idx) {
	            var grid = new Grid(gridModel, ecModel, api);
	            grid.name = 'grid_' + idx;
	            grid.resize(gridModel, api);

	            gridModel.coordinateSystem = grid;

	            grids.push(grid);
	        });

	        // Inject the coordinateSystems into seriesModel
	        ecModel.eachSeries(function (seriesModel) {
	            if (seriesModel.get('coordinateSystem') !== 'cartesian2d') {
	                return;
	            }
	            var xAxisIndex = seriesModel.get('xAxisIndex');
	            // TODO Validate
	            var xAxisModel = ecModel.getComponent('xAxis', xAxisIndex);
	            var grid = grids[xAxisModel.get('gridIndex')];
	            seriesModel.coordinateSystem = grid.getCartesian(
	                xAxisIndex, seriesModel.get('yAxisIndex')
	            );
	        });

	        return grids;
	    };

	    // For deciding which dimensions to use when creating list data
	    Grid.dimensions = Cartesian2D.prototype.dimensions;

	    __webpack_require__(25).register('cartesian2d', Grid);

	    module.exports = Grid;


/***/ },
/* 109 */
/***/ function(module, exports, __webpack_require__) {

	

	    var OrdinalScale = __webpack_require__(110);
	    var IntervalScale = __webpack_require__(112);
	    __webpack_require__(113);
	    __webpack_require__(114);
	    var Scale = __webpack_require__(111);

	    var numberUtil = __webpack_require__(7);
	    var zrUtil = __webpack_require__(3);
	    var textContain = __webpack_require__(14);
	    var axisHelper = {};

	    /**
	     * Get axis scale extent before niced.
	     */
	    axisHelper.getScaleExtent = function (axis, model) {
	        var scale = axis.scale;
	        var originalExtent = scale.getExtent();
	        var span = originalExtent[1] - originalExtent[0];
	        if (scale.type === 'ordinal') {
	            // If series has no data, scale extent may be wrong
	            if (!isFinite(span)) {
	                return [0, 0];
	            }
	            else {
	                return originalExtent;
	            }
	        }
	        var min = model.getMin ? model.getMin() : model.get('min');
	        var max = model.getMax ? model.getMax() : model.get('max');
	        var crossZero = model.getNeedCrossZero
	            ? model.getNeedCrossZero() : !model.get('scale');
	        var boundaryGap = model.get('boundaryGap');
	        if (!zrUtil.isArray(boundaryGap)) {
	            boundaryGap = [boundaryGap || 0, boundaryGap || 0];
	        }
	        boundaryGap[0] = numberUtil.parsePercent(boundaryGap[0], 1);
	        boundaryGap[1] = numberUtil.parsePercent(boundaryGap[1], 1);
	        var fixMin = true;
	        var fixMax = true;
	        // Add boundary gap
	        if (min == null) {
	            min = originalExtent[0] - boundaryGap[0] * span;
	            fixMin = false;
	        }
	        if (max == null) {
	            max = originalExtent[1] + boundaryGap[1] * span;
	            fixMax = false;
	        }
	        if (min === 'dataMin') {
	            min = originalExtent[0];
	        }
	        if (max === 'dataMax') {
	            max = originalExtent[1];
	        }
	        // Evaluate if axis needs cross zero
	        if (crossZero) {
	            // Axis is over zero and min is not set
	            if (min > 0 && max > 0 && !fixMin) {
	                min = 0;
	            }
	            // Axis is under zero and max is not set
	            if (min < 0 && max < 0 && !fixMax) {
	                max = 0;
	            }
	        }
	        return [min, max];
	    };

	    axisHelper.niceScaleExtent = function (axis, model) {
	        var scale = axis.scale;
	        var extent = axisHelper.getScaleExtent(axis, model);
	        var fixMin = (model.getMin ? model.getMin() : model.get('min')) != null;
	        var fixMax = (model.getMax ? model.getMax() : model.get('max')) != null;
	        var splitNumber = model.get('splitNumber');
	        scale.setExtent(extent[0], extent[1]);
	        scale.niceExtent(splitNumber, fixMin, fixMax);

	        // Use minInterval to constraint the calculated interval.
	        // If calculated interval is less than minInterval. increase the interval quantity until
	        // it is larger than minInterval.
	        // For example:
	        //  minInterval is 1, calculated interval is 0.2, so increase it to be 1. In this way we can get
	        //  an integer axis.
	        var minInterval = model.get('minInterval');
	        if (isFinite(minInterval) && !fixMin && !fixMax && scale.type === 'interval') {
	            var interval = scale.getInterval();
	            var intervalScale = Math.max(Math.abs(interval), minInterval) / interval;
	            // while (interval < minInterval) {
	            //     var quantity = numberUtil.quantity(interval);
	            //     interval = quantity * 10;
	            //     scaleQuantity *= 10;
	            // }
	            extent = scale.getExtent();
	            scale.setExtent(intervalScale * extent[0], extent[1] * intervalScale);
	            scale.niceExtent(splitNumber);
	        }

	        // If some one specified the min, max. And the default calculated interval
	        // is not good enough. He can specify the interval. It is often appeared
	        // in angle axis with angle 0 - 360. Interval calculated in interval scale is hard
	        // to be 60.
	        // FIXME
	        var interval = model.get('interval');
	        if (interval != null) {
	            scale.setInterval && scale.setInterval(interval);
	        }
	    };

	    /**
	     * @param {module:echarts/model/Model} model
	     * @param {string} [axisType] Default retrieve from model.type
	     * @return {module:echarts/scale/*}
	     */
	    axisHelper.createScaleByModel = function(model, axisType) {
	        axisType = axisType || model.get('type');
	        if (axisType) {
	            switch (axisType) {
	                // Buildin scale
	                case 'category':
	                    return new OrdinalScale(
	                        model.getCategories(), [Infinity, -Infinity]
	                    );
	                case 'value':
	                    return new IntervalScale();
	                // Extended scale, like time and log
	                default:
	                    return (Scale.getClass(axisType) || IntervalScale).create(model);
	            }
	        }
	    };

	    /**
	     * Check if the axis corss 0
	     */
	    axisHelper.ifAxisCrossZero = function (axis) {
	        var dataExtent = axis.scale.getExtent();
	        var min = dataExtent[0];
	        var max = dataExtent[1];
	        return !((min > 0 && max > 0) || (min < 0 && max < 0));
	    };

	    /**
	     * @param {Array.<number>} tickCoords In axis self coordinate.
	     * @param {Array.<string>} labels
	     * @param {string} font
	     * @param {boolean} isAxisHorizontal
	     * @return {number}
	     */
	    axisHelper.getAxisLabelInterval = function (tickCoords, labels, font, isAxisHorizontal) {
	        // FIXME
	        // 不同角的axis和label，不只是horizontal和vertical.

	        var textSpaceTakenRect;
	        var autoLabelInterval = 0;
	        var accumulatedLabelInterval = 0;

	        var step = 1;
	        if (labels.length > 40) {
	            // Simple optimization for large amount of labels
	            step = Math.round(labels.length / 40);
	        }
	        for (var i = 0; i < tickCoords.length; i += step) {
	            var tickCoord = tickCoords[i];
	            var rect = textContain.getBoundingRect(
	                labels[i], font, 'center', 'top'
	            );
	            rect[isAxisHorizontal ? 'x' : 'y'] += tickCoord;
	            rect[isAxisHorizontal ? 'width' : 'height'] *= 1.5;
	            if (!textSpaceTakenRect) {
	                textSpaceTakenRect = rect.clone();
	            }
	            // There is no space for current label;
	            else if (textSpaceTakenRect.intersect(rect)) {
	                accumulatedLabelInterval++;
	                autoLabelInterval = Math.max(autoLabelInterval, accumulatedLabelInterval);
	            }
	            else {
	                textSpaceTakenRect.union(rect);
	                // Reset
	                accumulatedLabelInterval = 0;
	            }
	        }
	        if (autoLabelInterval === 0 && step > 1) {
	            return step;
	        }
	        return autoLabelInterval * step;
	    };

	    /**
	     * @param {Object} axis
	     * @param {Function} labelFormatter
	     * @return {Array.<string>}
	     */
	    axisHelper.getFormattedLabels = function (axis, labelFormatter) {
	        var scale = axis.scale;
	        var labels = scale.getTicksLabels();
	        var ticks = scale.getTicks();
	        if (typeof labelFormatter === 'string') {
	            labelFormatter = (function (tpl) {
	                return function (val) {
	                    return tpl.replace('{value}', val);
	                };
	            })(labelFormatter);
	            return zrUtil.map(labels, labelFormatter);
	        }
	        else if (typeof labelFormatter === 'function') {
	            return zrUtil.map(ticks, function (tick, idx) {
	                return labelFormatter(
	                    axis.type === 'category' ? scale.getLabel(tick) : tick,
	                    idx
	                );
	            }, this);
	        }
	        else {
	            return labels;
	        }
	    };

	    module.exports = axisHelper;


/***/ },
/* 110 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Linear continuous scale
	 * @module echarts/coord/scale/Ordinal
	 *
	 * http://en.wikipedia.org/wiki/Level_of_measurement
	 */

	// FIXME only one data


	    var zrUtil = __webpack_require__(3);
	    var Scale = __webpack_require__(111);

	    var scaleProto = Scale.prototype;

	    var OrdinalScale = Scale.extend({

	        type: 'ordinal',

	        init: function (data, extent) {
	            this._data = data;
	            this._extent = extent || [0, data.length - 1];
	        },

	        parse: function (val) {
	            return typeof val === 'string'
	                ? zrUtil.indexOf(this._data, val)
	                // val might be float.
	                : Math.round(val);
	        },

	        contain: function (rank) {
	            rank = this.parse(rank);
	            return scaleProto.contain.call(this, rank)
	                && this._data[rank] != null;
	        },

	        /**
	         * Normalize given rank or name to linear [0, 1]
	         * @param {number|string} [val]
	         * @return {number}
	         */
	        normalize: function (val) {
	            return scaleProto.normalize.call(this, this.parse(val));
	        },

	        scale: function (val) {
	            return Math.round(scaleProto.scale.call(this, val));
	        },

	        /**
	         * @return {Array}
	         */
	        getTicks: function () {
	            var ticks = [];
	            var extent = this._extent;
	            var rank = extent[0];

	            while (rank <= extent[1]) {
	                ticks.push(rank);
	                rank++;
	            }

	            return ticks;
	        },

	        /**
	         * Get item on rank n
	         * @param {number} n
	         * @return {string}
	         */
	        getLabel: function (n) {
	            return this._data[n];
	        },

	        /**
	         * @return {number}
	         */
	        count: function () {
	            return this._extent[1] - this._extent[0] + 1;
	        },

	        niceTicks: zrUtil.noop,
	        niceExtent: zrUtil.noop
	    });

	    /**
	     * @return {module:echarts/scale/Time}
	     */
	    OrdinalScale.create = function () {
	        return new OrdinalScale();
	    };

	    module.exports = OrdinalScale;


/***/ },
/* 111 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * // Scale class management
	 * @module echarts/scale/Scale
	 */


	    var clazzUtil = __webpack_require__(9);

	    function Scale() {
	        /**
	         * Extent
	         * @type {Array.<number>}
	         * @protected
	         */
	        this._extent = [Infinity, -Infinity];

	        /**
	         * Step is calculated in adjustExtent
	         * @type {Array.<number>}
	         * @protected
	         */
	        this._interval = 0;

	        this.init && this.init.apply(this, arguments);
	    }

	    var scaleProto = Scale.prototype;

	    /**
	     * Parse input val to valid inner number.
	     * @param {*} val
	     * @return {number}
	     */
	    scaleProto.parse = function (val) {
	        // Notice: This would be a trap here, If the implementation
	        // of this method depends on extent, and this method is used
	        // before extent set (like in dataZoom), it would be wrong.
	        // Nevertheless, parse does not depend on extent generally.
	        return val;
	    };

	    scaleProto.contain = function (val) {
	        var extent = this._extent;
	        return val >= extent[0] && val <= extent[1];
	    };

	    /**
	     * Normalize value to linear [0, 1], return 0.5 if extent span is 0
	     * @param {number} val
	     * @return {number}
	     */
	    scaleProto.normalize = function (val) {
	        var extent = this._extent;
	        if (extent[1] === extent[0]) {
	            return 0.5;
	        }
	        return (val - extent[0]) / (extent[1] - extent[0]);
	    };

	    /**
	     * Scale normalized value
	     * @param {number} val
	     * @return {number}
	     */
	    scaleProto.scale = function (val) {
	        var extent = this._extent;
	        return val * (extent[1] - extent[0]) + extent[0];
	    };

	    /**
	     * Set extent from data
	     * @param {Array.<number>} other
	     */
	    scaleProto.unionExtent = function (other) {
	        var extent = this._extent;
	        other[0] < extent[0] && (extent[0] = other[0]);
	        other[1] > extent[1] && (extent[1] = other[1]);
	        // not setExtent because in log axis it may transformed to power
	        // this.setExtent(extent[0], extent[1]);
	    };

	    /**
	     * Get extent
	     * @return {Array.<number>}
	     */
	    scaleProto.getExtent = function () {
	        return this._extent.slice();
	    };

	    /**
	     * Set extent
	     * @param {number} start
	     * @param {number} end
	     */
	    scaleProto.setExtent = function (start, end) {
	        var thisExtent = this._extent;
	        if (!isNaN(start)) {
	            thisExtent[0] = start;
	        }
	        if (!isNaN(end)) {
	            thisExtent[1] = end;
	        }
	    };

	    /**
	     * @return {Array.<string>}
	     */
	    scaleProto.getTicksLabels = function () {
	        var labels = [];
	        var ticks = this.getTicks();
	        for (var i = 0; i < ticks.length; i++) {
	            labels.push(this.getLabel(ticks[i]));
	        }
	        return labels;
	    };

	    clazzUtil.enableClassExtend(Scale);
	    clazzUtil.enableClassManagement(Scale, {
	        registerWhenExtend: true
	    });

	    module.exports = Scale;


/***/ },
/* 112 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Interval scale
	 * @module echarts/scale/Interval
	 */



	    var numberUtil = __webpack_require__(7);
	    var formatUtil = __webpack_require__(6);
	    var Scale = __webpack_require__(111);

	    var mathFloor = Math.floor;
	    var mathCeil = Math.ceil;
	    /**
	     * @alias module:echarts/coord/scale/Interval
	     * @constructor
	     */
	    var IntervalScale = Scale.extend({

	        type: 'interval',

	        _interval: 0,

	        setExtent: function (start, end) {
	            var thisExtent = this._extent;
	            //start,end may be a Number like '25',so...
	            if (!isNaN(start)) {
	                thisExtent[0] = parseFloat(start);
	            }
	            if (!isNaN(end)) {
	                thisExtent[1] = parseFloat(end);
	            }
	        },

	        unionExtent: function (other) {
	            var extent = this._extent;
	            other[0] < extent[0] && (extent[0] = other[0]);
	            other[1] > extent[1] && (extent[1] = other[1]);

	            // unionExtent may called by it's sub classes
	            IntervalScale.prototype.setExtent.call(this, extent[0], extent[1]);
	        },
	        /**
	         * Get interval
	         */
	        getInterval: function () {
	            if (!this._interval) {
	                this.niceTicks();
	            }
	            return this._interval;
	        },

	        /**
	         * Set interval
	         */
	        setInterval: function (interval) {
	            this._interval = interval;
	            // Dropped auto calculated niceExtent and use user setted extent
	            // We assume user wan't to set both interval, min, max to get a better result
	            this._niceExtent = this._extent.slice();
	        },

	        /**
	         * @return {Array.<number>}
	         */
	        getTicks: function () {
	            if (!this._interval) {
	                this.niceTicks();
	            }
	            var interval = this._interval;
	            var extent = this._extent;
	            var ticks = [];

	            // Consider this case: using dataZoom toolbox, zoom and zoom.
	            var safeLimit = 10000;

	            if (interval) {
	                var niceExtent = this._niceExtent;
	                if (extent[0] < niceExtent[0]) {
	                    ticks.push(extent[0]);
	                }
	                var tick = niceExtent[0];
	                while (tick <= niceExtent[1]) {
	                    ticks.push(tick);
	                    // Avoid rounding error
	                    tick = numberUtil.round(tick + interval);
	                    if (ticks.length > safeLimit) {
	                        return [];
	                    }
	                }
	                if (extent[1] > niceExtent[1]) {
	                    ticks.push(extent[1]);
	                }
	            }

	            return ticks;
	        },

	        /**
	         * @return {Array.<string>}
	         */
	        getTicksLabels: function () {
	            var labels = [];
	            var ticks = this.getTicks();
	            for (var i = 0; i < ticks.length; i++) {
	                labels.push(this.getLabel(ticks[i]));
	            }
	            return labels;
	        },

	        /**
	         * @param {number} n
	         * @return {number}
	         */
	        getLabel: function (data) {
	            return formatUtil.addCommas(data);
	        },

	        /**
	         * Update interval and extent of intervals for nice ticks
	         *
	         * @param {number} [splitNumber = 5] Desired number of ticks
	         */
	        niceTicks: function (splitNumber) {
	            splitNumber = splitNumber || 5;
	            var extent = this._extent;
	            var span = extent[1] - extent[0];
	            if (!isFinite(span)) {
	                return;
	            }
	            // User may set axis min 0 and data are all negative
	            // FIXME If it needs to reverse ?
	            if (span < 0) {
	                span = -span;
	                extent.reverse();
	            }

	            // From "Nice Numbers for Graph Labels" of Graphic Gems
	            // var niceSpan = numberUtil.nice(span, false);
	            var step = numberUtil.nice(span / splitNumber, true);

	            // Niced extent inside original extent
	            var niceExtent = [
	                numberUtil.round(mathCeil(extent[0] / step) * step),
	                numberUtil.round(mathFloor(extent[1] / step) * step)
	            ];

	            this._interval = step;
	            this._niceExtent = niceExtent;
	        },

	        /**
	         * Nice extent.
	         * @param {number} [splitNumber = 5] Given approx tick number
	         * @param {boolean} [fixMin=false]
	         * @param {boolean} [fixMax=false]
	         */
	        niceExtent: function (splitNumber, fixMin, fixMax) {
	            var extent = this._extent;
	            // If extent start and end are same, expand them
	            if (extent[0] === extent[1]) {
	                if (extent[0] !== 0) {
	                    // Expand extent
	                    var expandSize = extent[0] / 2;
	                    extent[0] -= expandSize;
	                    extent[1] += expandSize;
	                }
	                else {
	                    extent[1] = 1;
	                }
	            }
	            var span = extent[1] - extent[0];
	            // If there are no data and extent are [Infinity, -Infinity]
	            if (!isFinite(span)) {
	                extent[0] = 0;
	                extent[1] = 1;
	            }

	            this.niceTicks(splitNumber);

	            // var extent = this._extent;
	            var interval = this._interval;

	            if (!fixMin) {
	                extent[0] = numberUtil.round(mathFloor(extent[0] / interval) * interval);
	            }
	            if (!fixMax) {
	                extent[1] = numberUtil.round(mathCeil(extent[1] / interval) * interval);
	            }
	        }
	    });

	    /**
	     * @return {module:echarts/scale/Time}
	     */
	    IntervalScale.create = function () {
	        return new IntervalScale();
	    };

	    module.exports = IntervalScale;



/***/ },
/* 113 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Interval scale
	 * @module echarts/coord/scale/Time
	 */



	    var zrUtil = __webpack_require__(3);
	    var numberUtil = __webpack_require__(7);
	    var formatUtil = __webpack_require__(6);

	    var IntervalScale = __webpack_require__(112);

	    var intervalScaleProto = IntervalScale.prototype;

	    var mathCeil = Math.ceil;
	    var mathFloor = Math.floor;
	    var ONE_SECOND = 1000;
	    var ONE_MINUTE = ONE_SECOND * 60;
	    var ONE_HOUR = ONE_MINUTE * 60;
	    var ONE_DAY = ONE_HOUR * 24;

	    // FIXME 公用？
	    var bisect = function (a, x, lo, hi) {
	        while (lo < hi) {
	            var mid = lo + hi >>> 1;
	            if (a[mid][2] < x) {
	                lo = mid + 1;
	            }
	            else {
	                hi  = mid;
	            }
	        }
	        return lo;
	    };

	    /**
	     * @alias module:echarts/coord/scale/Time
	     * @constructor
	     */
	    var TimeScale = IntervalScale.extend({
	        type: 'time',

	        // Overwrite
	        getLabel: function (val) {
	            var stepLvl = this._stepLvl;

	            var date = new Date(val);

	            return formatUtil.formatTime(stepLvl[0], date);
	        },

	        // Overwrite
	        niceExtent: function (approxTickNum, fixMin, fixMax) {
	            var extent = this._extent;
	            // If extent start and end are same, expand them
	            if (extent[0] === extent[1]) {
	                // Expand extent
	                extent[0] -= ONE_DAY;
	                extent[1] += ONE_DAY;
	            }
	            // If there are no data and extent are [Infinity, -Infinity]
	            if (extent[1] === -Infinity && extent[0] === Infinity) {
	                var d = new Date();
	                extent[1] = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	                extent[0] = extent[1] - ONE_DAY;
	            }

	            this.niceTicks(approxTickNum);

	            // var extent = this._extent;
	            var interval = this._interval;

	            if (!fixMin) {
	                extent[0] = numberUtil.round(mathFloor(extent[0] / interval) * interval);
	            }
	            if (!fixMax) {
	                extent[1] = numberUtil.round(mathCeil(extent[1] / interval) * interval);
	            }
	        },

	        // Overwrite
	        niceTicks: function (approxTickNum) {
	            approxTickNum = approxTickNum || 10;

	            var extent = this._extent;
	            var span = extent[1] - extent[0];
	            var approxInterval = span / approxTickNum;
	            var scaleLevelsLen = scaleLevels.length;
	            var idx = bisect(scaleLevels, approxInterval, 0, scaleLevelsLen);

	            var level = scaleLevels[Math.min(idx, scaleLevelsLen - 1)];
	            var interval = level[2];
	            // Same with interval scale if span is much larger than 1 year
	            if (level[0] === 'year') {
	                var yearSpan = span / interval;

	                // From "Nice Numbers for Graph Labels" of Graphic Gems
	                // var niceYearSpan = numberUtil.nice(yearSpan, false);
	                var yearStep = numberUtil.nice(yearSpan / approxTickNum, true);

	                interval *= yearStep;
	            }

	            var niceExtent = [
	                mathCeil(extent[0] / interval) * interval,
	                mathFloor(extent[1] / interval) * interval
	            ];

	            this._stepLvl = level;
	            // Interval will be used in getTicks
	            this._interval = interval;
	            this._niceExtent = niceExtent;
	        },

	        parse: function (val) {
	            // val might be float.
	            return +numberUtil.parseDate(val);
	        }
	    });

	    zrUtil.each(['contain', 'normalize'], function (methodName) {
	        TimeScale.prototype[methodName] = function (val) {
	            return intervalScaleProto[methodName].call(this, this.parse(val));
	        };
	    });

	    // Steps from d3
	    var scaleLevels = [
	        // Format       step    interval
	        ['hh:mm:ss',    1,      ONE_SECOND],           // 1s
	        ['hh:mm:ss',    5,      ONE_SECOND * 5],       // 5s
	        ['hh:mm:ss',    10,     ONE_SECOND * 10],      // 10s
	        ['hh:mm:ss',    15,     ONE_SECOND * 15],      // 15s
	        ['hh:mm:ss',    30,     ONE_SECOND * 30],      // 30s
	        ['hh:mm\nMM-dd',1,      ONE_MINUTE],          // 1m
	        ['hh:mm\nMM-dd',5,      ONE_MINUTE * 5],      // 5m
	        ['hh:mm\nMM-dd',10,     ONE_MINUTE * 10],     // 10m
	        ['hh:mm\nMM-dd',15,     ONE_MINUTE * 15],     // 15m
	        ['hh:mm\nMM-dd',30,     ONE_MINUTE * 30],     // 30m
	        ['hh:mm\nMM-dd',1,      ONE_HOUR],        // 1h
	        ['hh:mm\nMM-dd',2,      ONE_HOUR * 2],    // 2h
	        ['hh:mm\nMM-dd',6,      ONE_HOUR * 6],    // 6h
	        ['hh:mm\nMM-dd',12,     ONE_HOUR * 12],   // 12h
	        ['MM-dd\nyyyy', 1,      ONE_DAY],   // 1d
	        ['week',        7,      ONE_DAY * 7],        // 7d
	        ['month',       1,      ONE_DAY * 31],       // 1M
	        ['quarter',     3,      ONE_DAY * 380 / 4],  // 3M
	        ['half-year',   6,      ONE_DAY * 380 / 2],  // 6M
	        ['year',        1,      ONE_DAY * 380]       // 1Y
	    ];

	    /**
	     * @return {module:echarts/scale/Time}
	     */
	    TimeScale.create = function () {
	        return new TimeScale();
	    };

	    module.exports = TimeScale;


/***/ },
/* 114 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Log scale
	 * @module echarts/scale/Log
	 */


	    var zrUtil = __webpack_require__(3);
	    var Scale = __webpack_require__(111);
	    var numberUtil = __webpack_require__(7);

	    // Use some method of IntervalScale
	    var IntervalScale = __webpack_require__(112);

	    var scaleProto = Scale.prototype;
	    var intervalScaleProto = IntervalScale.prototype;

	    var mathFloor = Math.floor;
	    var mathCeil = Math.ceil;
	    var mathPow = Math.pow;

	    var LOG_BASE = 10;
	    var mathLog = Math.log;

	    var LogScale = Scale.extend({

	        type: 'log',

	        /**
	         * @return {Array.<number>}
	         */
	        getTicks: function () {
	            return zrUtil.map(intervalScaleProto.getTicks.call(this), function (val) {
	                return numberUtil.round(mathPow(LOG_BASE, val));
	            });
	        },

	        /**
	         * @param {number} val
	         * @return {string}
	         */
	        getLabel: intervalScaleProto.getLabel,

	        /**
	         * @param  {number} val
	         * @return {number}
	         */
	        scale: function (val) {
	            val = scaleProto.scale.call(this, val);
	            return mathPow(LOG_BASE, val);
	        },

	        /**
	         * @param {number} start
	         * @param {number} end
	         */
	        setExtent: function (start, end) {
	            start = mathLog(start) / mathLog(LOG_BASE);
	            end = mathLog(end) / mathLog(LOG_BASE);
	            intervalScaleProto.setExtent.call(this, start, end);
	        },

	        /**
	         * @return {number} end
	         */
	        getExtent: function () {
	            var extent = scaleProto.getExtent.call(this);
	            extent[0] = mathPow(LOG_BASE, extent[0]);
	            extent[1] = mathPow(LOG_BASE, extent[1]);
	            return extent;
	        },

	        /**
	         * @param  {Array.<number>} extent
	         */
	        unionExtent: function (extent) {
	            extent[0] = mathLog(extent[0]) / mathLog(LOG_BASE);
	            extent[1] = mathLog(extent[1]) / mathLog(LOG_BASE);
	            scaleProto.unionExtent.call(this, extent);
	        },

	        /**
	         * Update interval and extent of intervals for nice ticks
	         * @param  {number} [approxTickNum = 10] Given approx tick number
	         */
	        niceTicks: function (approxTickNum) {
	            approxTickNum = approxTickNum || 10;
	            var extent = this._extent;
	            var span = extent[1] - extent[0];
	            if (span === Infinity || span <= 0) {
	                return;
	            }

	            var interval = mathPow(10, mathFloor(mathLog(span / approxTickNum) / Math.LN10));
	            var err = approxTickNum / span * interval;

	            // Filter ticks to get closer to the desired count.
	            if (err <= 0.5) {
	                interval *= 10;
	            }
	            var niceExtent = [
	                numberUtil.round(mathCeil(extent[0] / interval) * interval),
	                numberUtil.round(mathFloor(extent[1] / interval) * interval)
	            ];

	            this._interval = interval;
	            this._niceExtent = niceExtent;
	        },

	        /**
	         * Nice extent.
	         * @param {number} [approxTickNum = 10] Given approx tick number
	         * @param {boolean} [fixMin=false]
	         * @param {boolean} [fixMax=false]
	         */
	        niceExtent: intervalScaleProto.niceExtent
	    });

	    zrUtil.each(['contain', 'normalize'], function (methodName) {
	        LogScale.prototype[methodName] = function (val) {
	            val = mathLog(val) / mathLog(LOG_BASE);
	            return scaleProto[methodName].call(this, val);
	        };
	    });

	    LogScale.create = function () {
	        return new LogScale();
	    };

	    module.exports = LogScale;


/***/ },
/* 115 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var zrUtil = __webpack_require__(3);
	    var Cartesian = __webpack_require__(116);

	    function Cartesian2D(name) {

	        Cartesian.call(this, name);
	    }

	    Cartesian2D.prototype = {

	        constructor: Cartesian2D,

	        type: 'cartesian2d',

	        /**
	         * @type {Array.<string>}
	         * @readOnly
	         */
	        dimensions: ['x', 'y'],

	        /**
	         * Base axis will be used on stacking.
	         *
	         * @return {module:echarts/coord/cartesian/Axis2D}
	         */
	        getBaseAxis: function () {
	            return this.getAxesByScale('ordinal')[0]
	                || this.getAxesByScale('time')[0]
	                || this.getAxis('x');
	        },

	        /**
	         * If contain point
	         * @param {Array.<number>} point
	         * @return {boolean}
	         */
	        containPoint: function (point) {
	            var axisX = this.getAxis('x');
	            var axisY = this.getAxis('y');
	            return axisX.contain(axisX.toLocalCoord(point[0]))
	                && axisY.contain(axisY.toLocalCoord(point[1]));
	        },

	        /**
	         * If contain data
	         * @param {Array.<number>} data
	         * @return {boolean}
	         */
	        containData: function (data) {
	            return this.getAxis('x').containData(data[0])
	                && this.getAxis('y').containData(data[1]);
	        },

	        /**
	         * Convert series data to an array of points
	         * @param {module:echarts/data/List} data
	         * @param {boolean} stack
	         * @return {Array}
	         *  Return array of points. For example:
	         *  `[[10, 10], [20, 20], [30, 30]]`
	         */
	        dataToPoints: function (data, stack) {
	            return data.mapArray(['x', 'y'], function (x, y) {
	                return this.dataToPoint([x, y]);
	            }, stack, this);
	        },

	        /**
	         * @param {Array.<number>} data
	         * @param {boolean} [clamp=false]
	         * @return {Array.<number>}
	         */
	        dataToPoint: function (data, clamp) {
	            var xAxis = this.getAxis('x');
	            var yAxis = this.getAxis('y');
	            return [
	                xAxis.toGlobalCoord(xAxis.dataToCoord(data[0], clamp)),
	                yAxis.toGlobalCoord(yAxis.dataToCoord(data[1], clamp))
	            ];
	        },

	        /**
	         * @param {Array.<number>} point
	         * @param {boolean} [clamp=false]
	         * @return {Array.<number>}
	         */
	        pointToData: function (point, clamp) {
	            var xAxis = this.getAxis('x');
	            var yAxis = this.getAxis('y');
	            return [
	                xAxis.coordToData(xAxis.toLocalCoord(point[0]), clamp),
	                yAxis.coordToData(yAxis.toLocalCoord(point[1]), clamp)
	            ];
	        },

	        /**
	         * Get other axis
	         * @param {module:echarts/coord/cartesian/Axis2D} axis
	         */
	        getOtherAxis: function (axis) {
	            return this.getAxis(axis.dim === 'x' ? 'y' : 'x');
	        }
	    };

	    zrUtil.inherits(Cartesian2D, Cartesian);

	    module.exports = Cartesian2D;


/***/ },
/* 116 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * Cartesian coordinate system
	 * @module  echarts/coord/Cartesian
	 *
	 */


	    var zrUtil = __webpack_require__(3);

	    function dimAxisMapper(dim) {
	        return this._axes[dim];
	    }

	    /**
	     * @alias module:echarts/coord/Cartesian
	     * @constructor
	     */
	    var Cartesian = function (name) {
	        this._axes = {};

	        this._dimList = [];

	        /**
	         * @type {string}
	         */
	        this.name = name || '';
	    };

	    Cartesian.prototype = {

	        constructor: Cartesian,

	        type: 'cartesian',

	        /**
	         * Get axis
	         * @param  {number|string} dim
	         * @return {module:echarts/coord/Cartesian~Axis}
	         */
	        getAxis: function (dim) {
	            return this._axes[dim];
	        },

	        /**
	         * Get axes list
	         * @return {Array.<module:echarts/coord/Cartesian~Axis>}
	         */
	        getAxes: function () {
	            return zrUtil.map(this._dimList, dimAxisMapper, this);
	        },

	        /**
	         * Get axes list by given scale type
	         */
	        getAxesByScale: function (scaleType) {
	            scaleType = scaleType.toLowerCase();
	            return zrUtil.filter(
	                this.getAxes(),
	                function (axis) {
	                    return axis.scale.type === scaleType;
	                }
	            );
	        },

	        /**
	         * Add axis
	         * @param {module:echarts/coord/Cartesian.Axis}
	         */
	        addAxis: function (axis) {
	            var dim = axis.dim;

	            this._axes[dim] = axis;

	            this._dimList.push(dim);
	        },

	        /**
	         * Convert data to coord in nd space
	         * @param {Array.<number>|Object.<string, number>} val
	         * @return {Array.<number>|Object.<string, number>}
	         */
	        dataToCoord: function (val) {
	            return this._dataCoordConvert(val, 'dataToCoord');
	        },

	        /**
	         * Convert coord in nd space to data
	         * @param  {Array.<number>|Object.<string, number>} val
	         * @return {Array.<number>|Object.<string, number>}
	         */
	        coordToData: function (val) {
	            return this._dataCoordConvert(val, 'coordToData');
	        },

	        _dataCoordConvert: function (input, method) {
	            var dimList = this._dimList;

	            var output = input instanceof Array ? [] : {};

	            for (var i = 0; i < dimList.length; i++) {
	                var dim = dimList[i];
	                var axis = this._axes[dim];

	                output[dim] = axis[method](input[dim]);
	            }

	            return output;
	        }
	    };

	    module.exports = Cartesian;


/***/ },
/* 117 */
/***/ function(module, exports, __webpack_require__) {

	

	    var zrUtil = __webpack_require__(3);
	    var Axis = __webpack_require__(118);
	    var axisLabelInterval = __webpack_require__(119);

	    /**
	     * Extend axis 2d
	     * @constructor module:echarts/coord/cartesian/Axis2D
	     * @extends {module:echarts/coord/cartesian/Axis}
	     * @param {string} dim
	     * @param {*} scale
	     * @param {Array.<number>} coordExtent
	     * @param {string} axisType
	     * @param {string} position
	     */
	    var Axis2D = function (dim, scale, coordExtent, axisType, position) {
	        Axis.call(this, dim, scale, coordExtent);
	        /**
	         * Axis type
	         *  - 'category'
	         *  - 'value'
	         *  - 'time'
	         *  - 'log'
	         * @type {string}
	         */
	        this.type = axisType || 'value';

	        /**
	         * Axis position
	         *  - 'top'
	         *  - 'bottom'
	         *  - 'left'
	         *  - 'right'
	         */
	        this.position = position || 'bottom';
	    };

	    Axis2D.prototype = {

	        constructor: Axis2D,

	        /**
	         * Index of axis, can be used as key
	         */
	        index: 0,
	        /**
	         * If axis is on the zero position of the other axis
	         * @type {boolean}
	         */
	        onZero: false,

	        /**
	         * Axis model
	         * @param {module:echarts/coord/cartesian/AxisModel}
	         */
	        model: null,

	        isHorizontal: function () {
	            var position = this.position;
	            return position === 'top' || position === 'bottom';
	        },

	        getGlobalExtent: function () {
	            var ret = this.getExtent();
	            ret[0] = this.toGlobalCoord(ret[0]);
	            ret[1] = this.toGlobalCoord(ret[1]);
	            return ret;
	        },

	        /**
	         * @return {number}
	         */
	        getLabelInterval: function () {
	            var labelInterval = this._labelInterval;
	            if (!labelInterval) {
	                labelInterval = this._labelInterval = axisLabelInterval(this);
	            }
	            return labelInterval;
	        },

	        /**
	         * If label is ignored.
	         * Automatically used when axis is category and label can not be all shown
	         * @param  {number}  idx
	         * @return {boolean}
	         */
	        isLabelIgnored: function (idx) {
	            if (this.type === 'category') {
	                var labelInterval = this.getLabelInterval();
	                return ((typeof labelInterval === 'function')
	                    && !labelInterval(idx, this.scale.getLabel(idx)))
	                    || idx % (labelInterval + 1);
	            }
	        },

	        /**
	         * Transform global coord to local coord,
	         * i.e. var localCoord = axis.toLocalCoord(80);
	         * designate by module:echarts/coord/cartesian/Grid.
	         * @type {Function}
	         */
	        toLocalCoord: null,

	        /**
	         * Transform global coord to local coord,
	         * i.e. var globalCoord = axis.toLocalCoord(40);
	         * designate by module:echarts/coord/cartesian/Grid.
	         * @type {Function}
	         */
	        toGlobalCoord: null

	    };
	    zrUtil.inherits(Axis2D, Axis);

	    module.exports = Axis2D;


/***/ },
/* 118 */
/***/ function(module, exports, __webpack_require__) {

	

	    var numberUtil = __webpack_require__(7);
	    var linearMap = numberUtil.linearMap;
	    var zrUtil = __webpack_require__(3);

	    function fixExtentWithBands(extent, nTick) {
	        var size = extent[1] - extent[0];
	        var len = nTick;
	        var margin = size / len / 2;
	        extent[0] += margin;
	        extent[1] -= margin;
	    }

	    var normalizedExtent = [0, 1];
	    /**
	     * @name module:echarts/coord/CartesianAxis
	     * @constructor
	     */
	    var Axis = function (dim, scale, extent) {

	        /**
	         * Axis dimension. Such as 'x', 'y', 'z', 'angle', 'radius'
	         * @type {string}
	         */
	        this.dim = dim;

	        /**
	         * Axis scale
	         * @type {module:echarts/coord/scale/*}
	         */
	        this.scale = scale;

	        /**
	         * @type {Array.<number>}
	         * @private
	         */
	        this._extent = extent || [0, 0];

	        /**
	         * @type {boolean}
	         */
	        this.inverse = false;

	        /**
	         * Usually true when axis has a ordinal scale
	         * @type {boolean}
	         */
	        this.onBand = false;
	    };

	    Axis.prototype = {

	        constructor: Axis,

	        /**
	         * If axis extent contain given coord
	         * @param {number} coord
	         * @return {boolean}
	         */
	        contain: function (coord) {
	            var extent = this._extent;
	            var min = Math.min(extent[0], extent[1]);
	            var max = Math.max(extent[0], extent[1]);
	            return coord >= min && coord <= max;
	        },

	        /**
	         * If axis extent contain given data
	         * @param {number} data
	         * @return {boolean}
	         */
	        containData: function (data) {
	            return this.contain(this.dataToCoord(data));
	        },

	        /**
	         * Get coord extent.
	         * @return {Array.<number>}
	         */
	        getExtent: function () {
	            var ret = this._extent.slice();
	            return ret;
	        },

	        /**
	         * Get precision used for formatting
	         * @param {Array.<number>} [dataExtent]
	         * @return {number}
	         */
	        getPixelPrecision: function (dataExtent) {
	            return numberUtil.getPixelPrecision(
	                dataExtent || this.scale.getExtent(),
	                this._extent
	            );
	        },

	        /**
	         * Set coord extent
	         * @param {number} start
	         * @param {number} end
	         */
	        setExtent: function (start, end) {
	            var extent = this._extent;
	            extent[0] = start;
	            extent[1] = end;
	        },

	        /**
	         * Convert data to coord. Data is the rank if it has a ordinal scale
	         * @param {number} data
	         * @param  {boolean} clamp
	         * @return {number}
	         */
	        dataToCoord: function (data, clamp) {
	            var extent = this._extent;
	            var scale = this.scale;
	            data = scale.normalize(data);

	            if (this.onBand && scale.type === 'ordinal') {
	                extent = extent.slice();
	                fixExtentWithBands(extent, scale.count());
	            }

	            return linearMap(data, normalizedExtent, extent, clamp);
	        },

	        /**
	         * Convert coord to data. Data is the rank if it has a ordinal scale
	         * @param {number} coord
	         * @param  {boolean} clamp
	         * @return {number}
	         */
	        coordToData: function (coord, clamp) {
	            var extent = this._extent;
	            var scale = this.scale;

	            if (this.onBand && scale.type === 'ordinal') {
	                extent = extent.slice();
	                fixExtentWithBands(extent, scale.count());
	            }

	            var t = linearMap(coord, extent, normalizedExtent, clamp);

	            return this.scale.scale(t);
	        },
	        /**
	         * @return {Array.<number>}
	         */
	        getTicksCoords: function () {
	            if (this.onBand) {
	                var bands = this.getBands();
	                var coords = [];
	                for (var i = 0; i < bands.length; i++) {
	                    coords.push(bands[i][0]);
	                }
	                if (bands[i - 1]) {
	                    coords.push(bands[i - 1][1]);
	                }
	                return coords;
	            }
	            else {
	                return zrUtil.map(this.scale.getTicks(), this.dataToCoord, this);
	            }
	        },

	        /**
	         * Coords of labels are on the ticks or on the middle of bands
	         * @return {Array.<number>}
	         */
	        getLabelsCoords: function () {
	            if (this.onBand) {
	                var bands = this.getBands();
	                var coords = [];
	                var band;
	                for (var i = 0; i < bands.length; i++) {
	                    band = bands[i];
	                    coords.push((band[0] + band[1]) / 2);
	                }
	                return coords;
	            }
	            else {
	                return zrUtil.map(this.scale.getTicks(), this.dataToCoord, this);
	            }
	        },

	        /**
	         * Get bands.
	         *
	         * If axis has labels [1, 2, 3, 4]. Bands on the axis are
	         * |---1---|---2---|---3---|---4---|.
	         *
	         * @return {Array}
	         */
	         // FIXME Situation when labels is on ticks
	        getBands: function () {
	            var extent = this.getExtent();
	            var bands = [];
	            var len = this.scale.count();
	            var start = extent[0];
	            var end = extent[1];
	            var span = end - start;

	            for (var i = 0; i < len; i++) {
	                bands.push([
	                    span * i / len + start,
	                    span * (i + 1) / len + start
	                ]);
	            }
	            return bands;
	        },

	        /**
	         * Get width of band
	         * @return {number}
	         */
	        getBandWidth: function () {
	            var axisExtent = this._extent;
	            var dataExtent = this.scale.getExtent();

	            var len = dataExtent[1] - dataExtent[0] + (this.onBand ? 1 : 0);
	            // Fix #2728, avoid NaN when only one data.
	            len === 0 && (len = 1);

	            var size = Math.abs(axisExtent[1] - axisExtent[0]);

	            return Math.abs(size) / len;
	        }
	    };

	    module.exports = Axis;


/***/ },
/* 119 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/**
	 * Helper function for axisLabelInterval calculation
	 */



	    var zrUtil = __webpack_require__(3);
	    var axisHelper = __webpack_require__(109);

	    module.exports = function (axis) {
	        var axisModel = axis.model;
	        var labelModel = axisModel.getModel('axisLabel');
	        var labelInterval = labelModel.get('interval');
	        if (!(axis.type === 'category' && labelInterval === 'auto')) {
	            return labelInterval === 'auto' ? 0 : labelInterval;
	        }

	        return axisHelper.getAxisLabelInterval(
	            zrUtil.map(axis.scale.getTicks(), axis.dataToCoord, axis),
	            axisModel.getFormattedLabels(),
	            labelModel.getModel('textStyle').getFont(),
	            axis.isHorizontal()
	        );
	    };


/***/ },
/* 120 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	// Grid 是在有直角坐标系的时候必须要存在的
	// 所以这里也要被 Cartesian2D 依赖


	    __webpack_require__(121);
	    var ComponentModel = __webpack_require__(19);

	    module.exports = ComponentModel.extend({

	        type: 'grid',

	        dependencies: ['xAxis', 'yAxis'],

	        layoutMode: 'box',

	        /**
	         * @type {module:echarts/coord/cartesian/Grid}
	         */
	        coordinateSystem: null,

	        defaultOption: {
	            show: false,
	            zlevel: 0,
	            z: 0,
	            left: '10%',
	            top: 60,
	            right: '10%',
	            bottom: 60,
	            // If grid size contain label
	            containLabel: false,
	            // width: {totalWidth} - left - right,
	            // height: {totalHeight} - top - bottom,
	            backgroundColor: 'rgba(0,0,0,0)',
	            borderWidth: 1,
	            borderColor: '#ccc'
	        }
	    });


/***/ },
/* 121 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var ComponentModel = __webpack_require__(19);
	    var zrUtil = __webpack_require__(3);
	    var axisModelCreator = __webpack_require__(122);

	    var AxisModel = ComponentModel.extend({

	        type: 'cartesian2dAxis',

	        /**
	         * @type {module:echarts/coord/cartesian/Axis2D}
	         */
	        axis: null,

	        /**
	         * @override
	         */
	        init: function () {
	            AxisModel.superApply(this, 'init', arguments);
	            this._resetRange();
	        },

	        /**
	         * @override
	         */
	        mergeOption: function () {
	            AxisModel.superApply(this, 'mergeOption', arguments);
	            this._resetRange();
	        },

	        /**
	         * @override
	         */
	        restoreData: function () {
	            AxisModel.superApply(this, 'restoreData', arguments);
	            this._resetRange();
	        },

	        /**
	         * @public
	         * @param {number} rangeStart
	         * @param {number} rangeEnd
	         */
	        setRange: function (rangeStart, rangeEnd) {
	            this.option.rangeStart = rangeStart;
	            this.option.rangeEnd = rangeEnd;
	        },

	        /**
	         * @public
	         * @return {Array.<number|string|Date>}
	         */
	        getMin: function () {
	            var option = this.option;
	            return option.rangeStart != null ? option.rangeStart : option.min;
	        },

	        /**
	         * @public
	         * @return {Array.<number|string|Date>}
	         */
	        getMax: function () {
	            var option = this.option;
	            return option.rangeEnd != null ? option.rangeEnd : option.max;
	        },

	        /**
	         * @public
	         * @return {boolean}
	         */
	        getNeedCrossZero: function () {
	            var option = this.option;
	            return (option.rangeStart != null || option.rangeEnd != null)
	                ? false : !option.scale;
	        },

	        /**
	         * @private
	         */
	        _resetRange: function () {
	            // rangeStart and rangeEnd is readonly.
	            this.option.rangeStart = this.option.rangeEnd = null;
	        }

	    });

	    function getAxisType(axisDim, option) {
	        // Default axis with data is category axis
	        return option.type || (option.data ? 'category' : 'value');
	    }

	    zrUtil.merge(AxisModel.prototype, __webpack_require__(124));

	    var extraOption = {
	        gridIndex: 0
	    };

	    axisModelCreator('x', AxisModel, getAxisType, extraOption);
	    axisModelCreator('y', AxisModel, getAxisType, extraOption);

	    module.exports = AxisModel;


/***/ },
/* 122 */
/***/ function(module, exports, __webpack_require__) {

	

	    var axisDefault = __webpack_require__(123);
	    var zrUtil = __webpack_require__(3);
	    var ComponentModel = __webpack_require__(19);
	    var layout = __webpack_require__(21);

	    // FIXME axisType is fixed ?
	    var AXIS_TYPES = ['value', 'category', 'time', 'log'];

	    /**
	     * Generate sub axis model class
	     * @param {string} axisName 'x' 'y' 'radius' 'angle' 'parallel'
	     * @param {module:echarts/model/Component} BaseAxisModelClass
	     * @param {Function} axisTypeDefaulter
	     * @param {Object} [extraDefaultOption]
	     */
	    module.exports = function (axisName, BaseAxisModelClass, axisTypeDefaulter, extraDefaultOption) {

	        zrUtil.each(AXIS_TYPES, function (axisType) {

	            BaseAxisModelClass.extend({

	                type: axisName + 'Axis.' + axisType,

	                mergeDefaultAndTheme: function (option, ecModel) {
	                    var layoutMode = this.layoutMode;
	                    var inputPositionParams = layoutMode
	                        ? layout.getLayoutParams(option) : {};

	                    var themeModel = ecModel.getTheme();
	                    zrUtil.merge(option, themeModel.get(axisType + 'Axis'));
	                    zrUtil.merge(option, this.getDefaultOption());

	                    option.type = axisTypeDefaulter(axisName, option);

	                    if (layoutMode) {
	                        layout.mergeLayoutParam(option, inputPositionParams, layoutMode);
	                    }
	                },

	                defaultOption: zrUtil.mergeAll(
	                    [
	                        {},
	                        axisDefault[axisType + 'Axis'],
	                        extraDefaultOption
	                    ],
	                    true
	                )
	            });
	        });

	        ComponentModel.registerSubTypeDefaulter(
	            axisName + 'Axis',
	            zrUtil.curry(axisTypeDefaulter, axisName)
	        );
	    };


/***/ },
/* 123 */
/***/ function(module, exports, __webpack_require__) {

	

	    var zrUtil = __webpack_require__(3);

	    var defaultOption = {
	        show: true,
	        zlevel: 0,                  // 一级层叠
	        z: 0,                       // 二级层叠
	        // 反向坐标轴
	        inverse: false,
	        // 坐标轴名字，默认为空
	        name: '',
	        // 坐标轴名字位置，支持'start' | 'middle' | 'end'
	        nameLocation: 'end',
	        // 坐标轴文字样式，默认取全局样式
	        nameTextStyle: {},
	        // 文字与轴线距离
	        nameGap: 15,
	        // 是否能触发鼠标事件
	        silent: true,
	        // 坐标轴线
	        axisLine: {
	            // 默认显示，属性show控制显示与否
	            show: true,
	            onZero: true,
	            // 属性lineStyle控制线条样式
	            lineStyle: {
	                color: '#333',
	                width: 1,
	                type: 'solid'
	            }
	        },
	        // 坐标轴小标记
	        axisTick: {
	            // 属性show控制显示与否，默认显示
	            show: true,
	            // 控制小标记是否在grid里
	            inside: false,
	            // 属性length控制线长
	            length: 5,
	            // 属性lineStyle控制线条样式
	            lineStyle: {
	                color: '#333',
	                width: 1
	            }
	        },
	        // 坐标轴文本标签，详见axis.axisLabel
	        axisLabel: {
	            show: true,
	            // 控制文本标签是否在grid里
	            inside: false,
	            rotate: 0,
	            margin: 8,
	            // formatter: null,
	            // 其余属性默认使用全局文本样式，详见TEXTSTYLE
	            textStyle: {
	                color: '#333',
	                fontSize: 12
	            }
	        },
	        // 分隔线
	        splitLine: {
	            // 默认显示，属性show控制显示与否
	            show: true,
	            // 属性lineStyle（详见lineStyle）控制线条样式
	            lineStyle: {
	                color: ['#ccc'],
	                width: 1,
	                type: 'solid'
	            }
	        },
	        // 分隔区域
	        splitArea: {
	            // 默认不显示，属性show控制显示与否
	            show: false,
	            // 属性areaStyle（详见areaStyle）控制区域样式
	            areaStyle: {
	                color: ['rgba(250,250,250,0.3)','rgba(200,200,200,0.3)']
	            }
	        }
	    };

	    var categoryAxis = zrUtil.merge({
	        // 类目起始和结束两端空白策略
	        boundaryGap: true,
	        // 坐标轴小标记
	        axisTick: {
	            interval: 'auto'
	        },
	        // 坐标轴文本标签，详见axis.axisLabel
	        axisLabel: {
	            interval: 'auto'
	        }
	    }, defaultOption);

	    var valueAxis = zrUtil.defaults({
	        // 数值起始和结束两端空白策略
	        boundaryGap: [0, 0],
	        // 最小值, 设置成 'dataMin' 则从数据中计算最小值
	        // min: null,
	        // 最大值，设置成 'dataMax' 则从数据中计算最大值
	        // max: null,
	        // Readonly prop, specifies start value of the range when using data zoom.
	        // rangeStart: null
	        // Readonly prop, specifies end value of the range when using data zoom.
	        // rangeEnd: null
	        // 脱离0值比例，放大聚焦到最终_min，_max区间
	        // scale: false,
	        // 分割段数，默认为5
	        splitNumber: 5
	        // Minimum interval
	        // minInterval: null
	    }, defaultOption);

	    // FIXME
	    var timeAxis = zrUtil.defaults({
	        scale: true,
	        min: 'dataMin',
	        max: 'dataMax'
	    }, valueAxis);
	    var logAxis = zrUtil.defaults({}, valueAxis);
	    logAxis.scale = true;

	    module.exports = {
	        categoryAxis: categoryAxis,
	        valueAxis: valueAxis,
	        timeAxis: timeAxis,
	        logAxis: logAxis
	    };


/***/ },
/* 124 */
/***/ function(module, exports, __webpack_require__) {

	

	    var zrUtil = __webpack_require__(3);
	    var axisHelper = __webpack_require__(109);

	    function getName(obj) {
	        if (zrUtil.isObject(obj) && obj.value != null) {
	            return obj.value;
	        }
	        else {
	            return obj;
	        }
	    }
	    /**
	     * Get categories
	     */
	    function getCategories() {
	        return this.get('type') === 'category'
	            && zrUtil.map(this.get('data'), getName);
	    }

	    /**
	     * Format labels
	     * @return {Array.<string>}
	     */
	    function getFormattedLabels() {
	        return axisHelper.getFormattedLabels(
	            this.axis,
	            this.get('axisLabel.formatter')
	        );
	    }

	    module.exports = {

	        getFormattedLabels: getFormattedLabels,

	        getCategories: getCategories
	    };


/***/ },
/* 125 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	// TODO boundaryGap


	    __webpack_require__(121);

	    __webpack_require__(126);


/***/ },
/* 126 */
/***/ function(module, exports, __webpack_require__) {

	

	    var zrUtil = __webpack_require__(3);
	    var graphic = __webpack_require__(42);
	    var AxisBuilder = __webpack_require__(127);
	    var ifIgnoreOnTick = AxisBuilder.ifIgnoreOnTick;
	    var getInterval = AxisBuilder.getInterval;

	    var axisBuilderAttrs = [
	        'axisLine', 'axisLabel', 'axisTick', 'axisName'
	    ];
	    var selfBuilderAttrs = [
	        'splitLine', 'splitArea'
	    ];

	    var AxisView = __webpack_require__(1).extendComponentView({

	        type: 'axis',

	        render: function (axisModel, ecModel) {

	            this.group.removeAll();

	            if (!axisModel.get('show')) {
	                return;
	            }

	            var gridModel = ecModel.getComponent('grid', axisModel.get('gridIndex'));

	            var layout = layoutAxis(gridModel, axisModel);

	            var axisBuilder = new AxisBuilder(axisModel, layout);

	            zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);

	            this.group.add(axisBuilder.getGroup());

	            zrUtil.each(selfBuilderAttrs, function (name) {
	                if (axisModel.get(name +'.show')) {
	                    this['_' + name](axisModel, gridModel, layout.labelInterval);
	                }
	            }, this);
	        },

	        /**
	         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
	         * @param {module:echarts/coord/cartesian/GridModel} gridModel
	         * @param {number|Function} labelInterval
	         * @private
	         */
	        _splitLine: function (axisModel, gridModel, labelInterval) {
	            var axis = axisModel.axis;

	            var splitLineModel = axisModel.getModel('splitLine');
	            var lineStyleModel = splitLineModel.getModel('lineStyle');
	            var lineWidth = lineStyleModel.get('width');
	            var lineColors = lineStyleModel.get('color');

	            var lineInterval = getInterval(splitLineModel, labelInterval);

	            lineColors = zrUtil.isArray(lineColors) ? lineColors : [lineColors];

	            var gridRect = gridModel.coordinateSystem.getRect();
	            var isHorizontal = axis.isHorizontal();

	            var splitLines = [];
	            var lineCount = 0;

	            var ticksCoords = axis.getTicksCoords();

	            var p1 = [];
	            var p2 = [];
	            for (var i = 0; i < ticksCoords.length; i++) {
	                if (ifIgnoreOnTick(axis, i, lineInterval)) {
	                    continue;
	                }

	                var tickCoord = axis.toGlobalCoord(ticksCoords[i]);

	                if (isHorizontal) {
	                    p1[0] = tickCoord;
	                    p1[1] = gridRect.y;
	                    p2[0] = tickCoord;
	                    p2[1] = gridRect.y + gridRect.height;
	                }
	                else {
	                    p1[0] = gridRect.x;
	                    p1[1] = tickCoord;
	                    p2[0] = gridRect.x + gridRect.width;
	                    p2[1] = tickCoord;
	                }

	                var colorIndex = (lineCount++) % lineColors.length;
	                splitLines[colorIndex] = splitLines[colorIndex] || [];
	                splitLines[colorIndex].push(new graphic.Line(graphic.subPixelOptimizeLine({
	                    shape: {
	                        x1: p1[0],
	                        y1: p1[1],
	                        x2: p2[0],
	                        y2: p2[1]
	                    },
	                    style: {
	                        lineWidth: lineWidth
	                    },
	                    silent: true
	                })));
	            }

	            // Simple optimization
	            // Batching the lines if color are the same
	            var lineStyle = lineStyleModel.getLineStyle();
	            for (var i = 0; i < splitLines.length; i++) {
	                this.group.add(graphic.mergePath(splitLines[i], {
	                    style: zrUtil.defaults({
	                        stroke: lineColors[i % lineColors.length]
	                    }, lineStyle),
	                    silent: true
	                }));
	            }
	        },

	        /**
	         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
	         * @param {module:echarts/coord/cartesian/GridModel} gridModel
	         * @param {number|Function} labelInterval
	         * @private
	         */
	        _splitArea: function (axisModel, gridModel, labelInterval) {
	            var axis = axisModel.axis;

	            var splitAreaModel = axisModel.getModel('splitArea');
	            var areaStyleModel = splitAreaModel.getModel('areaStyle');
	            var areaColors = areaStyleModel.get('color');

	            var gridRect = gridModel.coordinateSystem.getRect();
	            var ticksCoords = axis.getTicksCoords();

	            var prevX = axis.toGlobalCoord(ticksCoords[0]);
	            var prevY = axis.toGlobalCoord(ticksCoords[0]);

	            var splitAreaRects = [];
	            var count = 0;

	            var areaInterval = getInterval(splitAreaModel, labelInterval);

	            areaColors = zrUtil.isArray(areaColors) ? areaColors : [areaColors];

	            for (var i = 1; i < ticksCoords.length; i++) {
	                if (ifIgnoreOnTick(axis, i, areaInterval)) {
	                    continue;
	                }

	                var tickCoord = axis.toGlobalCoord(ticksCoords[i]);

	                var x;
	                var y;
	                var width;
	                var height;
	                if (axis.isHorizontal()) {
	                    x = prevX;
	                    y = gridRect.y;
	                    width = tickCoord - x;
	                    height = gridRect.height;
	                }
	                else {
	                    x = gridRect.x;
	                    y = prevY;
	                    width = gridRect.width;
	                    height = tickCoord - y;
	                }

	                var colorIndex = (count++) % areaColors.length;
	                splitAreaRects[colorIndex] = splitAreaRects[colorIndex] || [];
	                splitAreaRects[colorIndex].push(new graphic.Rect({
	                    shape: {
	                        x: x,
	                        y: y,
	                        width: width,
	                        height: height
	                    },
	                    silent: true
	                }));

	                prevX = x + width;
	                prevY = y + height;
	            }

	            // Simple optimization
	            // Batching the rects if color are the same
	            var areaStyle = areaStyleModel.getAreaStyle();
	            for (var i = 0; i < splitAreaRects.length; i++) {
	                this.group.add(graphic.mergePath(splitAreaRects[i], {
	                    style: zrUtil.defaults({
	                        fill: areaColors[i % areaColors.length]
	                    }, areaStyle),
	                    silent: true
	                }));
	            }
	        }
	    });

	    AxisView.extend({
	        type: 'xAxis'
	    });
	    AxisView.extend({
	        type: 'yAxis'
	    });

	    /**
	     * @inner
	     */
	    function layoutAxis(gridModel, axisModel) {
	        var grid = gridModel.coordinateSystem;
	        var axis = axisModel.axis;
	        var layout = {};

	        var rawAxisPosition = axis.position;
	        var axisPosition = axis.onZero ? 'onZero' : rawAxisPosition;
	        var axisDim = axis.dim;

	        // [left, right, top, bottom]
	        var rect = grid.getRect();
	        var rectBound = [rect.x, rect.x + rect.width, rect.y, rect.y + rect.height];

	        var posMap = {
	            x: {top: rectBound[2], bottom: rectBound[3]},
	            y: {left: rectBound[0], right: rectBound[1]}
	        };
	        posMap.x.onZero = Math.max(Math.min(getZero('y'), posMap.x.bottom), posMap.x.top);
	        posMap.y.onZero = Math.max(Math.min(getZero('x'), posMap.y.right), posMap.y.left);

	        function getZero(dim, val) {
	            var theAxis = grid.getAxis(dim);
	            return theAxis.toGlobalCoord(theAxis.dataToCoord(0));
	        }

	        // Axis position
	        layout.position = [
	            axisDim === 'y' ? posMap.y[axisPosition] : rectBound[0],
	            axisDim === 'x' ? posMap.x[axisPosition] : rectBound[3]
	        ];

	        // Axis rotation
	        var r = {x: 0, y: 1};
	        layout.rotation = Math.PI / 2 * r[axisDim];

	        // Tick and label direction, x y is axisDim
	        var dirMap = {top: -1, bottom: 1, left: -1, right: 1};

	        layout.labelDirection = layout.tickDirection = layout.nameDirection = dirMap[rawAxisPosition];
	        if (axis.onZero) {
	            layout.labelOffset = posMap[axisDim][rawAxisPosition] - posMap[axisDim].onZero;
	        }

	        if (axisModel.getModel('axisTick').get('inside')) {
	            layout.tickDirection = -layout.tickDirection;
	        }
	        if (axisModel.getModel('axisLabel').get('inside')) {
	            layout.labelDirection = -layout.labelDirection;
	        }

	        // Special label rotation
	        var labelRotation = axisModel.getModel('axisLabel').get('rotate');
	        layout.labelRotation = axisPosition === 'top' ? -labelRotation : labelRotation;

	        // label interval when auto mode.
	        layout.labelInterval = axis.getLabelInterval();

	        // Over splitLine and splitArea
	        layout.z2 = 1;

	        return layout;
	    }


/***/ },
/* 127 */
/***/ function(module, exports, __webpack_require__) {

	

	    var zrUtil = __webpack_require__(3);
	    var graphic = __webpack_require__(42);
	    var Model = __webpack_require__(8);
	    var numberUtil = __webpack_require__(7);
	    var remRadian = numberUtil.remRadian;
	    var isRadianAroundZero = numberUtil.isRadianAroundZero;

	    var PI = Math.PI;

	    function makeAxisEventDataBase(axisModel) {
	        var eventData = {
	            componentType: axisModel.mainType
	        };
	        eventData[axisModel.mainType + 'Index'] = axisModel.componentIndex;
	        return eventData;
	    }

	    /**
	     * A final axis is translated and rotated from a "standard axis".
	     * So opt.position and opt.rotation is required.
	     *
	     * A standard axis is and axis from [0, 0] to [0, axisExtent[1]],
	     * for example: (0, 0) ------------> (0, 50)
	     *
	     * nameDirection or tickDirection or labelDirection is 1 means tick
	     * or label is below the standard axis, whereas is -1 means above
	     * the standard axis. labelOffset means offset between label and axis,
	     * which is useful when 'onZero', where axisLabel is in the grid and
	     * label in outside grid.
	     *
	     * Tips: like always,
	     * positive rotation represents anticlockwise, and negative rotation
	     * represents clockwise.
	     * The direction of position coordinate is the same as the direction
	     * of screen coordinate.
	     *
	     * Do not need to consider axis 'inverse', which is auto processed by
	     * axis extent.
	     *
	     * @param {module:zrender/container/Group} group
	     * @param {Object} axisModel
	     * @param {Object} opt Standard axis parameters.
	     * @param {Array.<number>} opt.position [x, y]
	     * @param {number} opt.rotation by radian
	     * @param {number} [opt.nameDirection=1] 1 or -1 Used when nameLocation is 'middle'.
	     * @param {number} [opt.tickDirection=1] 1 or -1
	     * @param {number} [opt.labelDirection=1] 1 or -1
	     * @param {number} [opt.labelOffset=0] Usefull when onZero.
	     * @param {string} [opt.axisName] default get from axisModel.
	     * @param {number} [opt.labelRotation] by degree, default get from axisModel.
	     * @param {number} [opt.labelInterval] Default label interval when label
	     *                                     interval from model is null or 'auto'.
	     * @param {number} [opt.strokeContainThreshold] Default label interval when label
	     * @param {number} [opt.axisLineSilent=true] If axis line is silent
	     */
	    var AxisBuilder = function (axisModel, opt) {

	        /**
	         * @readOnly
	         */
	        this.opt = opt;

	        /**
	         * @readOnly
	         */
	        this.axisModel = axisModel;

	        // Default value
	        zrUtil.defaults(
	            opt,
	            {
	                labelOffset: 0,
	                nameDirection: 1,
	                tickDirection: 1,
	                labelDirection: 1,
	                silent: true
	            }
	        );

	        /**
	         * @readOnly
	         */
	        this.group = new graphic.Group({
	            position: opt.position.slice(),
	            rotation: opt.rotation
	        });
	    };

	    AxisBuilder.prototype = {

	        constructor: AxisBuilder,

	        hasBuilder: function (name) {
	            return !!builders[name];
	        },

	        add: function (name) {
	            builders[name].call(this);
	        },

	        getGroup: function () {
	            return this.group;
	        }

	    };

	    var builders = {

	        /**
	         * @private
	         */
	        axisLine: function () {
	            var opt = this.opt;
	            var axisModel = this.axisModel;

	            if (!axisModel.get('axisLine.show')) {
	                return;
	            }

	            var extent = this.axisModel.axis.getExtent();

	            this.group.add(new graphic.Line({
	                shape: {
	                    x1: extent[0],
	                    y1: 0,
	                    x2: extent[1],
	                    y2: 0
	                },
	                style: zrUtil.extend(
	                    {lineCap: 'round'},
	                    axisModel.getModel('axisLine.lineStyle').getLineStyle()
	                ),
	                strokeContainThreshold: opt.strokeContainThreshold,
	                silent: !!opt.axisLineSilent,
	                z2: 1
	            }));
	        },

	        /**
	         * @private
	         */
	        axisTick: function () {
	            var axisModel = this.axisModel;

	            if (!axisModel.get('axisTick.show')) {
	                return;
	            }

	            var axis = axisModel.axis;
	            var tickModel = axisModel.getModel('axisTick');
	            var opt = this.opt;

	            var lineStyleModel = tickModel.getModel('lineStyle');
	            var tickLen = tickModel.get('length');
	            var tickInterval = getInterval(tickModel, opt.labelInterval);
	            var ticksCoords = axis.getTicksCoords();
	            var tickLines = [];

	            for (var i = 0; i < ticksCoords.length; i++) {
	                // Only ordinal scale support tick interval
	                if (ifIgnoreOnTick(axis, i, tickInterval)) {
	                     continue;
	                }

	                var tickCoord = ticksCoords[i];

	                // Tick line
	                tickLines.push(new graphic.Line(graphic.subPixelOptimizeLine({
	                    shape: {
	                        x1: tickCoord,
	                        y1: 0,
	                        x2: tickCoord,
	                        y2: opt.tickDirection * tickLen
	                    },
	                    style: {
	                        lineWidth: lineStyleModel.get('width')
	                    },
	                    silent: true
	                })));
	            }

	            this.group.add(graphic.mergePath(tickLines, {
	                style: lineStyleModel.getLineStyle(),
	                z2: 2,
	                silent: true
	            }));
	        },

	        /**
	         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
	         * @param {module:echarts/coord/cartesian/GridModel} gridModel
	         * @private
	         */
	        axisLabel: function () {
	            var axisModel = this.axisModel;

	            if (!axisModel.get('axisLabel.show')) {
	                return;
	            }

	            var opt = this.opt;
	            var axis = axisModel.axis;
	            var labelModel = axisModel.getModel('axisLabel');
	            var textStyleModel = labelModel.getModel('textStyle');
	            var labelMargin = labelModel.get('margin');
	            var ticks = axis.scale.getTicks();
	            var labels = axisModel.getFormattedLabels();

	            // Special label rotate.
	            var labelRotation = opt.labelRotation;
	            if (labelRotation == null) {
	                labelRotation = labelModel.get('rotate') || 0;
	            }
	            // To radian.
	            labelRotation = labelRotation * PI / 180;

	            var labelLayout = innerTextLayout(opt, labelRotation, opt.labelDirection);
	            var categoryData = axisModel.get('data');

	            var textEls = [];
	            var isSilent = axisModel.get('silent');
	            for (var i = 0; i < ticks.length; i++) {
	                if (ifIgnoreOnTick(axis, i, opt.labelInterval)) {
	                     continue;
	                }

	                var itemTextStyleModel = textStyleModel;
	                if (categoryData && categoryData[i] && categoryData[i].textStyle) {
	                    itemTextStyleModel = new Model(
	                        categoryData[i].textStyle, textStyleModel, axisModel.ecModel
	                    );
	                }
	                var textColor = itemTextStyleModel.getTextColor();

	                var tickCoord = axis.dataToCoord(ticks[i]);
	                var pos = [
	                    tickCoord,
	                    opt.labelOffset + opt.labelDirection * labelMargin
	                ];
	                var labelBeforeFormat = axis.scale.getLabel(ticks[i]);

	                var textEl = new graphic.Text({
	                    style: {
	                        text: labels[i],
	                        textAlign: itemTextStyleModel.get('align', true) || labelLayout.textAlign,
	                        textVerticalAlign: itemTextStyleModel.get('baseline', true) || labelLayout.verticalAlign,
	                        textFont: itemTextStyleModel.getFont(),
	                        fill: typeof textColor === 'function' ? textColor(labelBeforeFormat) : textColor
	                    },
	                    position: pos,
	                    rotation: labelLayout.rotation,
	                    silent: isSilent,
	                    z2: 10
	                });
	                // Pack data for mouse event
	                textEl.eventData = makeAxisEventDataBase(axisModel);
	                textEl.eventData.targetType = 'axisLabel';
	                textEl.eventData.value = labelBeforeFormat;

	                textEls.push(textEl);
	                this.group.add(textEl);
	            }

	            function isTwoLabelOverlapped(current, next) {
	                var firstRect = current && current.getBoundingRect().clone();
	                var nextRect = next && next.getBoundingRect().clone();
	                if (firstRect && nextRect) {
	                    firstRect.applyTransform(current.getLocalTransform());
	                    nextRect.applyTransform(next.getLocalTransform());
	                    return firstRect.intersect(nextRect);
	                }
	            }
	            if (axis.type !== 'category') {
	                // If min or max are user set, we need to check
	                // If the tick on min(max) are overlap on their neighbour tick
	                // If they are overlapped, we need to hide the min(max) tick label
	                if (axisModel.getMin ? axisModel.getMin() : axisModel.get('min')) {
	                    var firstLabel = textEls[0];
	                    var nextLabel = textEls[1];
	                    if (isTwoLabelOverlapped(firstLabel, nextLabel)) {
	                        firstLabel.ignore = true;
	                    }
	                }
	                if (axisModel.getMax ? axisModel.getMax() : axisModel.get('max')) {
	                    var lastLabel = textEls[textEls.length - 1];
	                    var prevLabel = textEls[textEls.length - 2];
	                    if (isTwoLabelOverlapped(prevLabel, lastLabel)) {
	                        lastLabel.ignore = true;
	                    }
	                }
	            }
	        },

	        /**
	         * @private
	         */
	        axisName: function () {
	            var opt = this.opt;
	            var axisModel = this.axisModel;

	            var name = this.opt.axisName;
	            // If name is '', do not get name from axisMode.
	            if (name == null) {
	                name = axisModel.get('name');
	            }

	            if (!name) {
	                return;
	            }

	            var nameLocation = axisModel.get('nameLocation');
	            var nameDirection = opt.nameDirection;
	            var textStyleModel = axisModel.getModel('nameTextStyle');
	            var gap = axisModel.get('nameGap') || 0;

	            var extent = this.axisModel.axis.getExtent();
	            var gapSignal = extent[0] > extent[1] ? -1 : 1;
	            var pos = [
	                nameLocation === 'start'
	                    ? extent[0] - gapSignal * gap
	                    : nameLocation === 'end'
	                    ? extent[1] + gapSignal * gap
	                    : (extent[0] + extent[1]) / 2, // 'middle'
	                // Reuse labelOffset.
	                nameLocation === 'middle' ? opt.labelOffset + nameDirection * gap : 0
	            ];

	            var labelLayout;

	            if (nameLocation === 'middle') {
	                labelLayout = innerTextLayout(opt, opt.rotation, nameDirection);
	            }
	            else {
	                labelLayout = endTextLayout(opt, nameLocation, extent);
	            }

	            var textEl = new graphic.Text({
	                style: {
	                    text: name,
	                    textFont: textStyleModel.getFont(),
	                    fill: textStyleModel.getTextColor()
	                        || axisModel.get('axisLine.lineStyle.color'),
	                    textAlign: labelLayout.textAlign,
	                    textVerticalAlign: labelLayout.verticalAlign
	                },
	                position: pos,
	                rotation: labelLayout.rotation,
	                silent: axisModel.get('silent'),
	                z2: 1
	            });

	            textEl.eventData = makeAxisEventDataBase(axisModel);
	            textEl.eventData.targetType = 'axisName';
	            textEl.eventData.name = name;

	            this.group.add(textEl);
	        }

	    };

	    /**
	     * @inner
	     */
	    function innerTextLayout(opt, textRotation, direction) {
	        var rotationDiff = remRadian(textRotation - opt.rotation);
	        var textAlign;
	        var verticalAlign;

	        if (isRadianAroundZero(rotationDiff)) { // Label is parallel with axis line.
	            verticalAlign = direction > 0 ? 'top' : 'bottom';
	            textAlign = 'center';
	        }
	        else if (isRadianAroundZero(rotationDiff - PI)) { // Label is inverse parallel with axis line.
	            verticalAlign = direction > 0 ? 'bottom' : 'top';
	            textAlign = 'center';
	        }
	        else {
	            verticalAlign = 'middle';

	            if (rotationDiff > 0 && rotationDiff < PI) {
	                textAlign = direction > 0 ? 'right' : 'left';
	            }
	            else {
	                textAlign = direction > 0 ? 'left' : 'right';
	            }
	        }

	        return {
	            rotation: rotationDiff,
	            textAlign: textAlign,
	            verticalAlign: verticalAlign
	        };
	    }

	    /**
	     * @inner
	     */
	    function endTextLayout(opt, textPosition, extent) {
	        var rotationDiff = remRadian(-opt.rotation);
	        var textAlign;
	        var verticalAlign;
	        var inverse = extent[0] > extent[1];
	        var onLeft = (textPosition === 'start' && !inverse)
	            || (textPosition !== 'start' && inverse);

	        if (isRadianAroundZero(rotationDiff - PI / 2)) {
	            verticalAlign = onLeft ? 'bottom' : 'top';
	            textAlign = 'center';
	        }
	        else if (isRadianAroundZero(rotationDiff - PI * 1.5)) {
	            verticalAlign = onLeft ? 'top' : 'bottom';
	            textAlign = 'center';
	        }
	        else {
	            verticalAlign = 'middle';
	            if (rotationDiff < PI * 1.5 && rotationDiff > PI / 2) {
	                textAlign = onLeft ? 'left' : 'right';
	            }
	            else {
	                textAlign = onLeft ? 'right' : 'left';
	            }
	        }

	        return {
	            rotation: rotationDiff,
	            textAlign: textAlign,
	            verticalAlign: verticalAlign
	        };
	    }

	    /**
	     * @static
	     */
	    var ifIgnoreOnTick = AxisBuilder.ifIgnoreOnTick = function (axis, i, interval) {
	        var rawTick;
	        var scale = axis.scale;
	        return scale.type === 'ordinal'
	            && (
	                typeof interval === 'function'
	                    ? (
	                        rawTick = scale.getTicks()[i],
	                        !interval(rawTick, scale.getLabel(rawTick))
	                    )
	                    : i % (interval + 1)
	            );
	    };

	    /**
	     * @static
	     */
	    var getInterval = AxisBuilder.getInterval = function (model, labelInterval) {
	        var interval = model.get('interval');
	        if (interval == null || interval == 'auto') {
	            interval = labelInterval;
	        }
	        return interval;
	    };

	    module.exports = AxisBuilder;



/***/ },
/* 128 */
/***/ function(module, exports, __webpack_require__) {

	

	    var zrUtil = __webpack_require__(3);

	    __webpack_require__(108);

	    __webpack_require__(129);
	    __webpack_require__(130);

	    var barLayoutGrid = __webpack_require__(132);
	    var echarts = __webpack_require__(1);

	    echarts.registerLayout(zrUtil.curry(barLayoutGrid, 'bar'));
	    // Visual coding for legend
	    echarts.registerVisualCoding('chart', function (ecModel) {
	        ecModel.eachSeriesByType('bar', function (seriesModel) {
	            var data = seriesModel.getData();
	            data.setVisual('legendSymbol', 'roundRect');
	        });
	    });

	    // In case developer forget to include grid component
	    __webpack_require__(107);


/***/ },
/* 129 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var SeriesModel = __webpack_require__(27);
	    var createListFromArray = __webpack_require__(94);

	    module.exports = SeriesModel.extend({

	        type: 'series.bar',

	        dependencies: ['grid', 'polar'],

	        getInitialData: function (option, ecModel) {
	            return createListFromArray(option.data, this, ecModel);
	        },

	        getMarkerPosition: function (value) {
	            var coordSys = this.coordinateSystem;
	            if (coordSys) {
	                var pt = coordSys.dataToPoint(value);
	                var data = this.getData();
	                var offset = data.getLayout('offset');
	                var size = data.getLayout('size');
	                var offsetIndex = coordSys.getBaseAxis().isHorizontal() ? 0 : 1;
	                pt[offsetIndex] += offset + size / 2;
	                return pt;
	            }
	            return [NaN, NaN];
	        },

	        defaultOption: {
	            zlevel: 0,                  // 一级层叠
	            z: 2,                       // 二级层叠
	            coordinateSystem: 'cartesian2d',
	            legendHoverLink: true,
	            // stack: null

	            // Cartesian coordinate system
	            xAxisIndex: 0,
	            yAxisIndex: 0,

	            // 最小高度改为0
	            barMinHeight: 0,

	            // barMaxWidth: null,
	            // 默认自适应
	            // barWidth: null,
	            // 柱间距离，默认为柱形宽度的30%，可设固定值
	            // barGap: '30%',
	            // 类目间柱形距离，默认为类目间距的20%，可设固定值
	            // barCategoryGap: '20%',
	            // label: {
	            //     normal: {
	            //         show: false
	            //     }
	            // },
	            itemStyle: {
	                normal: {
	                    // color: '各异',
	                    // 柱条边线
	                    barBorderColor: '#fff',
	                    // 柱条边线线宽，单位px，默认为1
	                    barBorderWidth: 0
	                },
	                emphasis: {
	                    // color: '各异',
	                    // 柱条边线
	                    barBorderColor: '#fff',
	                    // 柱条边线线宽，单位px，默认为1
	                    barBorderWidth: 0
	                }
	            }
	        }
	    });


/***/ },
/* 130 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var zrUtil = __webpack_require__(3);
	    var graphic = __webpack_require__(42);

	    zrUtil.extend(__webpack_require__(8).prototype, __webpack_require__(131));

	    function fixLayoutWithLineWidth(layout, lineWidth) {
	        var signX = layout.width > 0 ? 1 : -1;
	        var signY = layout.height > 0 ? 1 : -1;
	        // In case width or height are too small.
	        lineWidth = Math.min(lineWidth, Math.abs(layout.width), Math.abs(layout.height));
	        layout.x += signX * lineWidth / 2;
	        layout.y += signY * lineWidth / 2;
	        layout.width -= signX * lineWidth;
	        layout.height -= signY * lineWidth;
	    }

	    module.exports = __webpack_require__(1).extendChartView({

	        type: 'bar',

	        render: function (seriesModel, ecModel, api) {
	            var coordinateSystemType = seriesModel.get('coordinateSystem');

	            if (coordinateSystemType === 'cartesian2d') {
	                this._renderOnCartesian(seriesModel, ecModel, api);
	            }

	            return this.group;
	        },

	        _renderOnCartesian: function (seriesModel, ecModel, api) {
	            var group = this.group;
	            var data = seriesModel.getData();
	            var oldData = this._data;

	            var cartesian = seriesModel.coordinateSystem;
	            var baseAxis = cartesian.getBaseAxis();
	            var isHorizontal = baseAxis.isHorizontal();

	            var enableAnimation = seriesModel.get('animation');

	            var barBorderWidthQuery = ['itemStyle', 'normal', 'barBorderWidth'];

	            function createRect(dataIndex, isUpdate) {
	                var layout = data.getItemLayout(dataIndex);
	                var lineWidth = data.getItemModel(dataIndex).get(barBorderWidthQuery) || 0;
	                fixLayoutWithLineWidth(layout, lineWidth);

	                var rect = new graphic.Rect({
	                    shape: zrUtil.extend({}, layout)
	                });
	                // Animation
	                if (enableAnimation) {
	                    var rectShape = rect.shape;
	                    var animateProperty = isHorizontal ? 'height' : 'width';
	                    var animateTarget = {};
	                    rectShape[animateProperty] = 0;
	                    animateTarget[animateProperty] = layout[animateProperty];
	                    graphic[isUpdate? 'updateProps' : 'initProps'](rect, {
	                        shape: animateTarget
	                    }, seriesModel, dataIndex);
	                }
	                return rect;
	            }
	            data.diff(oldData)
	                .add(function (dataIndex) {
	                    // 空数据
	                    if (!data.hasValue(dataIndex)) {
	                        return;
	                    }

	                    var rect = createRect(dataIndex);

	                    data.setItemGraphicEl(dataIndex, rect);

	                    group.add(rect);

	                })
	                .update(function (newIndex, oldIndex) {
	                    var rect = oldData.getItemGraphicEl(oldIndex);
	                    // 空数据
	                    if (!data.hasValue(newIndex)) {
	                        group.remove(rect);
	                        return;
	                    }
	                    if (!rect) {
	                        rect = createRect(newIndex, true);
	                    }

	                    var layout = data.getItemLayout(newIndex);
	                    var lineWidth = data.getItemModel(newIndex).get(barBorderWidthQuery) || 0;
	                    fixLayoutWithLineWidth(layout, lineWidth);

	                    graphic.updateProps(rect, {
	                        shape: layout
	                    }, seriesModel, newIndex);

	                    data.setItemGraphicEl(newIndex, rect);

	                    // Add back
	                    group.add(rect);
	                })
	                .remove(function (idx) {
	                    var rect = oldData.getItemGraphicEl(idx);
	                    if (rect) {
	                        // Not show text when animating
	                        rect.style.text = '';
	                        graphic.updateProps(rect, {
	                            shape: {
	                                width: 0
	                            }
	                        }, seriesModel, idx, function () {
	                            group.remove(rect);
	                        });
	                    }
	                })
	                .execute();

	            this._updateStyle(seriesModel, data, isHorizontal);

	            this._data = data;
	        },

	        _updateStyle: function (seriesModel, data, isHorizontal) {
	            function setLabel(style, model, color, labelText, labelPositionOutside) {
	                graphic.setText(style, model, color);
	                style.text = labelText;
	                if (style.textPosition === 'outside') {
	                    style.textPosition = labelPositionOutside;
	                }
	            }

	            data.eachItemGraphicEl(function (rect, idx) {
	                var itemModel = data.getItemModel(idx);
	                var color = data.getItemVisual(idx, 'color');
	                var opacity = data.getItemVisual(idx, 'opacity');
	                var layout = data.getItemLayout(idx);
	                var itemStyleModel = itemModel.getModel('itemStyle.normal');

	                var hoverStyle = itemModel.getModel('itemStyle.emphasis').getBarItemStyle();

	                rect.setShape('r', itemStyleModel.get('barBorderRadius') || 0);

	                rect.useStyle(zrUtil.defaults(
	                    {
	                        fill: color,
	                        opacity: opacity
	                    },
	                    itemStyleModel.getBarItemStyle()
	                ));

	                var labelPositionOutside = isHorizontal
	                    ? (layout.height > 0 ? 'bottom' : 'top')
	                    : (layout.width > 0 ? 'left' : 'right');

	                var labelModel = itemModel.getModel('label.normal');
	                var hoverLabelModel = itemModel.getModel('label.emphasis');
	                var rectStyle = rect.style;
	                if (labelModel.get('show')) {
	                    setLabel(
	                        rectStyle, labelModel, color,
	                        zrUtil.retrieve(
	                            seriesModel.getFormattedLabel(idx, 'normal'),
	                            seriesModel.getRawValue(idx)
	                        ),
	                        labelPositionOutside
	                    );
	                }
	                else {
	                    rectStyle.text = '';
	                }
	                if (hoverLabelModel.get('show')) {
	                    setLabel(
	                        hoverStyle, hoverLabelModel, color,
	                        zrUtil.retrieve(
	                            seriesModel.getFormattedLabel(idx, 'emphasis'),
	                            seriesModel.getRawValue(idx)
	                        ),
	                        labelPositionOutside
	                    );
	                }
	                else {
	                    hoverStyle.text = '';
	                }
	                graphic.setHoverStyle(rect, hoverStyle);
	            });
	        },

	        remove: function (ecModel, api) {
	            var group = this.group;
	            if (ecModel.get('animation')) {
	                if (this._data) {
	                    this._data.eachItemGraphicEl(function (el) {
	                        // Not show text when animating
	                        el.style.text = '';
	                        graphic.updateProps(el, {
	                            shape: {
	                                width: 0
	                            }
	                        }, ecModel, el.dataIndex, function () {
	                            group.remove(el);
	                        });
	                    });
	                }
	            }
	            else {
	                group.removeAll();
	            }
	        }
	    });


/***/ },
/* 131 */
/***/ function(module, exports, __webpack_require__) {

	
	    module.exports = {
	        getBarItemStyle: __webpack_require__(11)(
	            [
	                ['fill', 'color'],
	                ['stroke', 'borderColor'],
	                ['lineWidth', 'borderWidth'],
	                // Compatitable with 2
	                ['stroke', 'barBorderColor'],
	                ['lineWidth', 'barBorderWidth'],
	                ['opacity'],
	                ['shadowBlur'],
	                ['shadowOffsetX'],
	                ['shadowOffsetY'],
	                ['shadowColor']
	            ]
	        )
	    };


/***/ },
/* 132 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var zrUtil = __webpack_require__(3);
	    var numberUtil = __webpack_require__(7);
	    var parsePercent = numberUtil.parsePercent;

	    function getSeriesStackId(seriesModel) {
	        return seriesModel.get('stack') || '__ec_stack_' + seriesModel.seriesIndex;
	    }

	    function calBarWidthAndOffset(barSeries, api) {
	        // Columns info on each category axis. Key is cartesian name
	        var columnsMap = {};

	        zrUtil.each(barSeries, function (seriesModel, idx) {
	            var cartesian = seriesModel.coordinateSystem;

	            var baseAxis = cartesian.getBaseAxis();

	            var columnsOnAxis = columnsMap[baseAxis.index] || {
	                remainedWidth: baseAxis.getBandWidth(),
	                autoWidthCount: 0,
	                categoryGap: '20%',
	                gap: '30%',
	                axis: baseAxis,
	                stacks: {}
	            };
	            var stacks = columnsOnAxis.stacks;
	            columnsMap[baseAxis.index] = columnsOnAxis;

	            var stackId = getSeriesStackId(seriesModel);

	            if (!stacks[stackId]) {
	                columnsOnAxis.autoWidthCount++;
	            }
	            stacks[stackId] = stacks[stackId] || {
	                width: 0,
	                maxWidth: 0
	            };

	            var barWidth = seriesModel.get('barWidth');
	            var barMaxWidth = seriesModel.get('barMaxWidth');
	            var barGap = seriesModel.get('barGap');
	            var barCategoryGap = seriesModel.get('barCategoryGap');
	            // TODO
	            if (barWidth && ! stacks[stackId].width) {
	                barWidth = Math.min(columnsOnAxis.remainedWidth, barWidth);
	                stacks[stackId].width = barWidth;
	                columnsOnAxis.remainedWidth -= barWidth;
	            }

	            barMaxWidth && (stacks[stackId].maxWidth = barMaxWidth);
	            (barGap != null) && (columnsOnAxis.gap = barGap);
	            (barCategoryGap != null) && (columnsOnAxis.categoryGap = barCategoryGap);
	        });

	        var result = {};

	        zrUtil.each(columnsMap, function (columnsOnAxis, coordSysName) {

	            result[coordSysName] = {};

	            var stacks = columnsOnAxis.stacks;
	            var baseAxis = columnsOnAxis.axis;
	            var bandWidth = baseAxis.getBandWidth();
	            var categoryGap = parsePercent(columnsOnAxis.categoryGap, bandWidth);
	            var barGapPercent = parsePercent(columnsOnAxis.gap, 1);

	            var remainedWidth = columnsOnAxis.remainedWidth;
	            var autoWidthCount = columnsOnAxis.autoWidthCount;
	            var autoWidth = (remainedWidth - categoryGap)
	                / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);
	            autoWidth = Math.max(autoWidth, 0);

	            // Find if any auto calculated bar exceeded maxBarWidth
	            zrUtil.each(stacks, function (column, stack) {
	                var maxWidth = column.maxWidth;
	                if (!column.width && maxWidth && maxWidth < autoWidth) {
	                    maxWidth = Math.min(maxWidth, remainedWidth);
	                    remainedWidth -= maxWidth;
	                    column.width = maxWidth;
	                    autoWidthCount--;
	                }
	            });

	            // Recalculate width again
	            autoWidth = (remainedWidth - categoryGap)
	                / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);
	            autoWidth = Math.max(autoWidth, 0);

	            var widthSum = 0;
	            var lastColumn;
	            zrUtil.each(stacks, function (column, idx) {
	                if (!column.width) {
	                    column.width = autoWidth;
	                }
	                lastColumn = column;
	                widthSum += column.width * (1 + barGapPercent);
	            });
	            if (lastColumn) {
	                widthSum -= lastColumn.width * barGapPercent;
	            }

	            var offset = -widthSum / 2;
	            zrUtil.each(stacks, function (column, stackId) {
	                result[coordSysName][stackId] = result[coordSysName][stackId] || {
	                    offset: offset,
	                    width: column.width
	                };

	                offset += column.width * (1 + barGapPercent);
	            });
	        });

	        return result;
	    }

	    /**
	     * @param {string} seriesType
	     * @param {module:echarts/model/Global} ecModel
	     * @param {module:echarts/ExtensionAPI} api
	     */
	    function barLayoutGrid(seriesType, ecModel, api) {

	        var barWidthAndOffset = calBarWidthAndOffset(
	            zrUtil.filter(
	                ecModel.getSeriesByType(seriesType),
	                function (seriesModel) {
	                    return !ecModel.isSeriesFiltered(seriesModel)
	                        && seriesModel.coordinateSystem
	                        && seriesModel.coordinateSystem.type === 'cartesian2d';
	                }
	            )
	        );

	        var lastStackCoords = {};

	        ecModel.eachSeriesByType(seriesType, function (seriesModel) {

	            var data = seriesModel.getData();
	            var cartesian = seriesModel.coordinateSystem;
	            var baseAxis = cartesian.getBaseAxis();

	            var stackId = getSeriesStackId(seriesModel);
	            var columnLayoutInfo = barWidthAndOffset[baseAxis.index][stackId];
	            var columnOffset = columnLayoutInfo.offset;
	            var columnWidth = columnLayoutInfo.width;
	            var valueAxis = cartesian.getOtherAxis(baseAxis);

	            var barMinHeight = seriesModel.get('barMinHeight') || 0;

	            var valueAxisStart = baseAxis.onZero
	                ? valueAxis.toGlobalCoord(valueAxis.dataToCoord(0))
	                : valueAxis.getGlobalExtent()[0];

	            var coords = cartesian.dataToPoints(data, true);
	            lastStackCoords[stackId] = lastStackCoords[stackId] || [];

	            data.setLayout({
	                offset: columnOffset,
	                size: columnWidth
	            });
	            data.each(valueAxis.dim, function (value, idx) {
	                // 空数据
	                if (isNaN(value)) {
	                    return;
	                }
	                if (!lastStackCoords[stackId][idx]) {
	                    lastStackCoords[stackId][idx] = {
	                        // Positive stack
	                        p: valueAxisStart,
	                        // Negative stack
	                        n: valueAxisStart
	                    };
	                }
	                var sign = value >= 0 ? 'p' : 'n';
	                var coord = coords[idx];
	                var lastCoord = lastStackCoords[stackId][idx][sign];
	                var x, y, width, height;
	                if (valueAxis.isHorizontal()) {
	                    x = lastCoord;
	                    y = coord[1] + columnOffset;
	                    width = coord[0] - lastCoord;
	                    height = columnWidth;

	                    if (Math.abs(width) < barMinHeight) {
	                        width = (width < 0 ? -1 : 1) * barMinHeight;
	                    }
	                    lastStackCoords[stackId][idx][sign] += width;
	                }
	                else {
	                    x = coord[0] + columnOffset;
	                    y = lastCoord;
	                    width = columnWidth;
	                    height = coord[1] - lastCoord;
	                    if (Math.abs(height) < barMinHeight) {
	                        // Include zero to has a positive bar
	                        height = (height <= 0 ? -1 : 1) * barMinHeight;
	                    }
	                    lastStackCoords[stackId][idx][sign] += height;
	                }

	                data.setItemLayout(idx, {
	                    x: x,
	                    y: y,
	                    width: width,
	                    height: height
	                });
	            }, true);

	        }, this);
	    }

	    module.exports = barLayoutGrid;


/***/ },
/* 133 */
/***/ function(module, exports, __webpack_require__) {

	

	    var zrUtil = __webpack_require__(3);
	    var echarts = __webpack_require__(1);

	    __webpack_require__(134);
	    __webpack_require__(136);

	    __webpack_require__(137)('pie', [{
	        type: 'pieToggleSelect',
	        event: 'pieselectchanged',
	        method: 'toggleSelected'
	    }, {
	        type: 'pieSelect',
	        event: 'pieselected',
	        method: 'select'
	    }, {
	        type: 'pieUnSelect',
	        event: 'pieunselected',
	        method: 'unSelect'
	    }]);

	    echarts.registerVisualCoding(
	        'chart',  zrUtil.curry(__webpack_require__(138), 'pie')
	    );

	    echarts.registerLayout(zrUtil.curry(
	        __webpack_require__(139), 'pie'
	    ));

	    echarts.registerProcessor(
	        'filter', zrUtil.curry(__webpack_require__(141), 'pie')
	    );


/***/ },
/* 134 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';


	    var List = __webpack_require__(95);
	    var zrUtil = __webpack_require__(3);
	    var modelUtil = __webpack_require__(5);
	    var completeDimensions = __webpack_require__(97);

	    var dataSelectableMixin = __webpack_require__(135);

	    var PieSeries = __webpack_require__(1).extendSeriesModel({

	        type: 'series.pie',

	        // Overwrite
	        init: function (option) {
	            PieSeries.superApply(this, 'init', arguments);

	            // Enable legend selection for each data item
	            // Use a function instead of direct access because data reference may changed
	            this.legendDataProvider = function () {
	                return this._dataBeforeProcessed;
	            };

	            this.updateSelectedMap(option.data);

	            this._defaultLabelLine(option);
	        },

	        // Overwrite
	        mergeOption: function (newOption) {
	            PieSeries.superCall(this, 'mergeOption', newOption);
	            this.updateSelectedMap(this.option.data);
	        },

	        getInitialData: function (option, ecModel) {
	            var dimensions = completeDimensions(['value'], option.data);
	            var list = new List(dimensions, this);
	            list.initData(option.data);
	            return list;
	        },

	        // Overwrite
	        getDataParams: function (dataIndex) {
	            var data = this._data;
	            var params = PieSeries.superCall(this, 'getDataParams', dataIndex);
	            var sum = data.getSum('value');
	            // FIXME toFixed?
	            //
	            // Percent is 0 if sum is 0
	            params.percent = !sum ? 0 : +(data.get('value', dataIndex) / sum * 100).toFixed(2);

	            params.$vars.push('percent');
	            return params;
	        },

	        _defaultLabelLine: function (option) {
	            // Extend labelLine emphasis
	            modelUtil.defaultEmphasis(option.labelLine, ['show']);

	            var labelLineNormalOpt = option.labelLine.normal;
	            var labelLineEmphasisOpt = option.labelLine.emphasis;
	            // Not show label line if `label.normal.show = false`
	            labelLineNormalOpt.show = labelLineNormalOpt.show
	                && option.label.normal.show;
	            labelLineEmphasisOpt.show = labelLineEmphasisOpt.show
	                && option.label.emphasis.show;
	        },

	        defaultOption: {
	            zlevel: 0,
	            z: 2,
	            legendHoverLink: true,

	            hoverAnimation: true,
	            // 默认全局居中
	            center: ['50%', '50%'],
	            radius: [0, '75%'],
	            // 默认顺时针
	            clockwise: true,
	            startAngle: 90,
	            // 最小角度改为0
	            minAngle: 0,
	            // 选中是扇区偏移量
	            selectedOffset: 10,

	            // If use strategy to avoid label overlapping
	            avoidLabelOverlap: true,
	            // 选择模式，默认关闭，可选single，multiple
	            // selectedMode: false,
	            // 南丁格尔玫瑰图模式，'radius'（半径） | 'area'（面积）
	            // roseType: null,

	            label: {
	                normal: {
	                    // If rotate around circle
	                    rotate: false,
	                    show: true,
	                    // 'outer', 'inside', 'center'
	                    position: 'outer'
	                    // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
	                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
	                    // distance: 当position为inner时有效，为label位置到圆心的距离与圆半径(环状图为内外半径和)的比例系数
	                },
	                emphasis: {}
	            },
	            // Enabled when label.normal.position is 'outer'
	            labelLine: {
	                normal: {
	                    show: true,
	                    // 引导线两段中的第一段长度
	                    length: 15,
	                    // 引导线两段中的第二段长度
	                    length2: 15,
	                    smooth: false,
	                    lineStyle: {
	                        // color: 各异,
	                        width: 1,
	                        type: 'solid'
	                    }
	                }
	            },
	            itemStyle: {
	                normal: {
	                    // color: 各异,
	                    borderColor: 'rgba(0,0,0,0)',
	                    borderWidth: 1
	                },
	                emphasis: {
	                    // color: 各异,
	                    borderColor: 'rgba(0,0,0,0)',
	                    borderWidth: 1
	                }
	            },

	            animationEasing: 'cubicOut',

	            data: []
	        }
	    });

	    zrUtil.mixin(PieSeries, dataSelectableMixin);

	    module.exports = PieSeries;


/***/ },
/* 135 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Data selectable mixin for chart series.
	 * To eanble data select, option of series must have `selectedMode`.
	 * And each data item will use `selected` to toggle itself selected status
	 *
	 * @module echarts/chart/helper/DataSelectable
	 */


	    var zrUtil = __webpack_require__(3);

	    module.exports = {

	        updateSelectedMap: function (targetList) {
	            this._selectTargetMap = zrUtil.reduce(targetList || [], function (targetMap, target) {
	                targetMap[target.name] = target;
	                return targetMap;
	            }, {});
	        },
	        /**
	         * @param {string} name
	         */
	        // PENGING If selectedMode is null ?
	        select: function (name) {
	            var targetMap = this._selectTargetMap;
	            var target = targetMap[name];
	            var selectedMode = this.get('selectedMode');
	            if (selectedMode === 'single') {
	                zrUtil.each(targetMap, function (target) {
	                    target.selected = false;
	                });
	            }
	            target && (target.selected = true);
	        },

	        /**
	         * @param {string} name
	         */
	        unSelect: function (name) {
	            var target = this._selectTargetMap[name];
	            // var selectedMode = this.get('selectedMode');
	            // selectedMode !== 'single' && target && (target.selected = false);
	            target && (target.selected = false);
	        },

	        /**
	         * @param {string} name
	         */
	        toggleSelected: function (name) {
	            var target = this._selectTargetMap[name];
	            if (target != null) {
	                this[target.selected ? 'unSelect' : 'select'](name);
	                return target.selected;
	            }
	        },

	        /**
	         * @param {string} name
	         */
	        isSelected: function (name) {
	            var target = this._selectTargetMap[name];
	            return target && target.selected;
	        }
	    };


/***/ },
/* 136 */
/***/ function(module, exports, __webpack_require__) {

	

	    var graphic = __webpack_require__(42);
	    var zrUtil = __webpack_require__(3);

	    /**
	     * @param {module:echarts/model/Series} seriesModel
	     * @param {boolean} hasAnimation
	     * @inner
	     */
	    function updateDataSelected(uid, seriesModel, hasAnimation, api) {
	        var data = seriesModel.getData();
	        var dataIndex = this.dataIndex;
	        var name = data.getName(dataIndex);
	        var selectedOffset = seriesModel.get('selectedOffset');

	        api.dispatchAction({
	            type: 'pieToggleSelect',
	            from: uid,
	            name: name,
	            seriesId: seriesModel.id
	        });

	        data.each(function (idx) {
	            toggleItemSelected(
	                data.getItemGraphicEl(idx),
	                data.getItemLayout(idx),
	                seriesModel.isSelected(data.getName(idx)),
	                selectedOffset,
	                hasAnimation
	            );
	        });
	    }

	    /**
	     * @param {module:zrender/graphic/Sector} el
	     * @param {Object} layout
	     * @param {boolean} isSelected
	     * @param {number} selectedOffset
	     * @param {boolean} hasAnimation
	     * @inner
	     */
	    function toggleItemSelected(el, layout, isSelected, selectedOffset, hasAnimation) {
	        var midAngle = (layout.startAngle + layout.endAngle) / 2;

	        var dx = Math.cos(midAngle);
	        var dy = Math.sin(midAngle);

	        var offset = isSelected ? selectedOffset : 0;
	        var position = [dx * offset, dy * offset];

	        hasAnimation
	            // animateTo will stop revious animation like update transition
	            ? el.animate()
	                .when(200, {
	                    position: position
	                })
	                .start('bounceOut')
	            : el.attr('position', position);
	    }

	    /**
	     * Piece of pie including Sector, Label, LabelLine
	     * @constructor
	     * @extends {module:zrender/graphic/Group}
	     */
	    function PiePiece(data, idx) {

	        graphic.Group.call(this);

	        var sector = new graphic.Sector({
	            z2: 2
	        });
	        var polyline = new graphic.Polyline();
	        var text = new graphic.Text();
	        this.add(sector);
	        this.add(polyline);
	        this.add(text);

	        this.updateData(data, idx, true);

	        // Hover to change label and labelLine
	        function onEmphasis() {
	            polyline.ignore = polyline.hoverIgnore;
	            text.ignore = text.hoverIgnore;
	        }
	        function onNormal() {
	            polyline.ignore = polyline.normalIgnore;
	            text.ignore = text.normalIgnore;
	        }
	        this.on('emphasis', onEmphasis)
	            .on('normal', onNormal)
	            .on('mouseover', onEmphasis)
	            .on('mouseout', onNormal);
	    }

	    var piePieceProto = PiePiece.prototype;

	    function getLabelStyle(data, idx, state, labelModel, labelPosition) {
	        var textStyleModel = labelModel.getModel('textStyle');
	        var isLabelInside = labelPosition === 'inside' || labelPosition === 'inner';
	        return {
	            fill: textStyleModel.getTextColor()
	                || (isLabelInside ? '#fff' : data.getItemVisual(idx, 'color')),
	            opacity: data.getItemVisual(idx, 'opacity'),
	            textFont: textStyleModel.getFont(),
	            text: zrUtil.retrieve(
	                data.hostModel.getFormattedLabel(idx, state), data.getName(idx)
	            )
	        };
	    }

	    piePieceProto.updateData = function (data, idx, firstCreate) {

	        var sector = this.childAt(0);

	        var seriesModel = data.hostModel;
	        var itemModel = data.getItemModel(idx);
	        var layout = data.getItemLayout(idx);
	        var sectorShape = zrUtil.extend({}, layout);
	        sectorShape.label = null;
	        if (firstCreate) {
	            sector.setShape(sectorShape);
	            sector.shape.endAngle = layout.startAngle;
	            graphic.updateProps(sector, {
	                shape: {
	                    endAngle: layout.endAngle
	                }
	            }, seriesModel, idx);
	        }
	        else {
	            graphic.updateProps(sector, {
	                shape: sectorShape
	            }, seriesModel, idx);
	        }

	        // Update common style
	        var itemStyleModel = itemModel.getModel('itemStyle');
	        var visualColor = data.getItemVisual(idx, 'color');

	        sector.useStyle(
	            zrUtil.defaults(
	                {
	                    fill: visualColor
	                },
	                itemStyleModel.getModel('normal').getItemStyle()
	            )
	        );
	        sector.hoverStyle = itemStyleModel.getModel('emphasis').getItemStyle();

	        // Toggle selected
	        toggleItemSelected(
	            this,
	            data.getItemLayout(idx),
	            itemModel.get('selected'),
	            seriesModel.get('selectedOffset'),
	            seriesModel.get('animation')
	        );

	        function onEmphasis() {
	            // Sector may has animation of updating data. Force to move to the last frame
	            // Or it may stopped on the wrong shape
	            sector.stopAnimation(true);
	            sector.animateTo({
	                shape: {
	                    r: layout.r + 10
	                }
	            }, 300, 'elasticOut');
	        }
	        function onNormal() {
	            sector.stopAnimation(true);
	            sector.animateTo({
	                shape: {
	                    r: layout.r
	                }
	            }, 300, 'elasticOut');
	        }
	        sector.off('mouseover').off('mouseout').off('emphasis').off('normal');
	        if (itemModel.get('hoverAnimation')) {
	            sector
	                .on('mouseover', onEmphasis)
	                .on('mouseout', onNormal)
	                .on('emphasis', onEmphasis)
	                .on('normal', onNormal);
	        }

	        this._updateLabel(data, idx);

	        graphic.setHoverStyle(this);
	    };

	    piePieceProto._updateLabel = function (data, idx) {

	        var labelLine = this.childAt(1);
	        var labelText = this.childAt(2);

	        var seriesModel = data.hostModel;
	        var itemModel = data.getItemModel(idx);
	        var layout = data.getItemLayout(idx);
	        var labelLayout = layout.label;
	        var visualColor = data.getItemVisual(idx, 'color');

	        graphic.updateProps(labelLine, {
	            shape: {
	                points: labelLayout.linePoints || [
	                    [labelLayout.x, labelLayout.y], [labelLayout.x, labelLayout.y], [labelLayout.x, labelLayout.y]
	                ]
	            }
	        }, seriesModel, idx);

	        graphic.updateProps(labelText, {
	            style: {
	                x: labelLayout.x,
	                y: labelLayout.y
	            }
	        }, seriesModel, idx);
	        labelText.attr({
	            style: {
	                textVerticalAlign: labelLayout.verticalAlign,
	                textAlign: labelLayout.textAlign,
	                textFont: labelLayout.font
	            },
	            rotation: labelLayout.rotation,
	            origin: [labelLayout.x, labelLayout.y],
	            z2: 10
	        });

	        var labelModel = itemModel.getModel('label.normal');
	        var labelHoverModel = itemModel.getModel('label.emphasis');
	        var labelLineModel = itemModel.getModel('labelLine.normal');
	        var labelLineHoverModel = itemModel.getModel('labelLine.emphasis');
	        var labelPosition = labelModel.get('position') || labelHoverModel.get('position');

	        labelText.setStyle(getLabelStyle(data, idx, 'normal', labelModel, labelPosition));

	        labelText.ignore = labelText.normalIgnore = !labelModel.get('show');
	        labelText.hoverIgnore = !labelHoverModel.get('show');

	        labelLine.ignore = labelLine.normalIgnore = !labelLineModel.get('show');
	        labelLine.hoverIgnore = !labelLineHoverModel.get('show');

	        // Default use item visual color
	        labelLine.setStyle({
	            stroke: visualColor,
	            opacity: data.getItemVisual(idx, 'opacity')
	        });
	        labelLine.setStyle(labelLineModel.getModel('lineStyle').getLineStyle());

	        labelText.hoverStyle = getLabelStyle(data, idx, 'emphasis', labelHoverModel, labelPosition);
	        labelLine.hoverStyle = labelLineHoverModel.getModel('lineStyle').getLineStyle();

	        var smooth = labelLineModel.get('smooth');
	        if (smooth && smooth === true) {
	            smooth = 0.4;
	        }
	        labelLine.setShape({
	            smooth: smooth
	        });
	    };

	    zrUtil.inherits(PiePiece, graphic.Group);


	    // Pie view
	    var Pie = __webpack_require__(41).extend({

	        type: 'pie',

	        init: function () {
	            var sectorGroup = new graphic.Group();
	            this._sectorGroup = sectorGroup;
	        },

	        render: function (seriesModel, ecModel, api, payload) {
	            if (payload && (payload.from === this.uid)) {
	                return;
	            }

	            var data = seriesModel.getData();
	            var oldData = this._data;
	            var group = this.group;

	            var hasAnimation = ecModel.get('animation');
	            var isFirstRender = !oldData;

	            var onSectorClick = zrUtil.curry(
	                updateDataSelected, this.uid, seriesModel, hasAnimation, api
	            );

	            var selectedMode = seriesModel.get('selectedMode');

	            data.diff(oldData)
	                .add(function (idx) {
	                    var piePiece = new PiePiece(data, idx);
	                    if (isFirstRender) {
	                        piePiece.eachChild(function (child) {
	                            child.stopAnimation(true);
	                        });
	                    }

	                    selectedMode && piePiece.on('click', onSectorClick);

	                    data.setItemGraphicEl(idx, piePiece);

	                    group.add(piePiece);
	                })
	                .update(function (newIdx, oldIdx) {
	                    var piePiece = oldData.getItemGraphicEl(oldIdx);

	                    piePiece.updateData(data, newIdx);

	                    piePiece.off('click');
	                    selectedMode && piePiece.on('click', onSectorClick);
	                    group.add(piePiece);
	                    data.setItemGraphicEl(newIdx, piePiece);
	                })
	                .remove(function (idx) {
	                    var piePiece = oldData.getItemGraphicEl(idx);
	                    group.remove(piePiece);
	                })
	                .execute();

	            if (hasAnimation && isFirstRender && data.count() > 0) {
	                var shape = data.getItemLayout(0);
	                var r = Math.max(api.getWidth(), api.getHeight()) / 2;

	                var removeClipPath = zrUtil.bind(group.removeClipPath, group);
	                group.setClipPath(this._createClipPath(
	                    shape.cx, shape.cy, r, shape.startAngle, shape.clockwise, removeClipPath, seriesModel
	                ));
	            }

	            this._data = data;
	        },

	        _createClipPath: function (
	            cx, cy, r, startAngle, clockwise, cb, seriesModel
	        ) {
	            var clipPath = new graphic.Sector({
	                shape: {
	                    cx: cx,
	                    cy: cy,
	                    r0: 0,
	                    r: r,
	                    startAngle: startAngle,
	                    endAngle: startAngle,
	                    clockwise: clockwise
	                }
	            });

	            graphic.initProps(clipPath, {
	                shape: {
	                    endAngle: startAngle + (clockwise ? 1 : -1) * Math.PI * 2
	                }
	            }, seriesModel, cb);

	            return clipPath;
	        }
	    });

	    module.exports = Pie;


/***/ },
/* 137 */
/***/ function(module, exports, __webpack_require__) {

	
	    var echarts = __webpack_require__(1);
	    var zrUtil = __webpack_require__(3);
	    module.exports = function (seriesType, actionInfos) {
	        zrUtil.each(actionInfos, function (actionInfo) {
	            actionInfo.update = 'updateView';
	            /**
	             * @payload
	             * @property {string} seriesName
	             * @property {string} name
	             */
	            echarts.registerAction(actionInfo, function (payload, ecModel) {
	                var selected = {};
	                ecModel.eachComponent(
	                    {mainType: 'series', subType: seriesType, query: payload},
	                    function (seriesModel) {
	                        if (seriesModel[actionInfo.method]) {
	                            seriesModel[actionInfo.method](payload.name);
	                        }
	                        var data = seriesModel.getData();
	                        // Create selected map
	                        data.each(function (idx) {
	                            var name = data.getName(idx);
	                            selected[name] = seriesModel.isSelected(name) || false;
	                        });
	                    }
	                );
	                return {
	                    name: payload.name,
	                    selected: selected
	                };
	            });
	        });
	    };


/***/ },
/* 138 */
/***/ function(module, exports) {

	// Pick color from palette for each data item


	    module.exports = function (seriesType, ecModel) {
	        var globalColorList = ecModel.get('color');
	        var offset = 0;
	        ecModel.eachRawSeriesByType(seriesType, function (seriesModel) {
	            var colorList = seriesModel.get('color', true);
	            var dataAll = seriesModel.getRawData();
	            if (!ecModel.isSeriesFiltered(seriesModel)) {
	                var data = seriesModel.getData();
	                data.each(function (idx) {
	                    var itemModel = data.getItemModel(idx);
	                    var rawIdx = data.getRawIndex(idx);
	                    // If series.itemStyle.normal.color is a function. itemVisual may be encoded
	                    var singleDataColor = data.getItemVisual(idx, 'color', true);
	                    if (!singleDataColor) {
	                        var paletteColor = colorList ? colorList[rawIdx % colorList.length]
	                            : globalColorList[(rawIdx + offset) % globalColorList.length];
	                        var color = itemModel.get('itemStyle.normal.color') || paletteColor;
	                        // Legend may use the visual info in data before processed
	                        dataAll.setItemVisual(rawIdx, 'color', color);
	                        data.setItemVisual(idx, 'color', color);
	                    }
	                    else {
	                        // Set data all color for legend
	                        dataAll.setItemVisual(rawIdx, 'color', singleDataColor);
	                    }
	                });
	            }
	            offset += dataAll.count();
	        });
	    };


/***/ },
/* 139 */
/***/ function(module, exports, __webpack_require__) {

	// TODO minAngle



	    var numberUtil = __webpack_require__(7);
	    var parsePercent = numberUtil.parsePercent;
	    var labelLayout = __webpack_require__(140);
	    var zrUtil = __webpack_require__(3);

	    var PI2 = Math.PI * 2;
	    var RADIAN = Math.PI / 180;

	    module.exports = function (seriesType, ecModel, api) {
	        ecModel.eachSeriesByType(seriesType, function (seriesModel) {
	            var center = seriesModel.get('center');
	            var radius = seriesModel.get('radius');

	            if (!zrUtil.isArray(radius)) {
	                radius = [0, radius];
	            }
	            if (!zrUtil.isArray(center)) {
	                center = [center, center];
	            }

	            var width = api.getWidth();
	            var height = api.getHeight();
	            var size = Math.min(width, height);
	            var cx = parsePercent(center[0], width);
	            var cy = parsePercent(center[1], height);
	            var r0 = parsePercent(radius[0], size / 2);
	            var r = parsePercent(radius[1], size / 2);

	            var data = seriesModel.getData();

	            var startAngle = -seriesModel.get('startAngle') * RADIAN;

	            var minAngle = seriesModel.get('minAngle') * RADIAN;

	            var sum = data.getSum('value');
	            // Sum may be 0
	            var unitRadian = Math.PI / (sum || data.count()) * 2;

	            var clockwise = seriesModel.get('clockwise');

	            var roseType = seriesModel.get('roseType');

	            // [0...max]
	            var extent = data.getDataExtent('value');
	            extent[0] = 0;

	            // In the case some sector angle is smaller than minAngle
	            var restAngle = PI2;
	            var valueSumLargerThanMinAngle = 0;

	            var currentAngle = startAngle;

	            var dir = clockwise ? 1 : -1;
	            data.each('value', function (value, idx) {
	                var angle;
	                // FIXME 兼容 2.0 但是 roseType 是 area 的时候才是这样？
	                if (roseType !== 'area') {
	                    angle = sum === 0 ? unitRadian : (value * unitRadian);
	                }
	                else {
	                    angle = PI2 / (data.count() || 1);
	                }

	                if (angle < minAngle) {
	                    angle = minAngle;
	                    restAngle -= minAngle;
	                }
	                else {
	                    valueSumLargerThanMinAngle += value;
	                }

	                var endAngle = currentAngle + dir * angle;
	                data.setItemLayout(idx, {
	                    angle: angle,
	                    startAngle: currentAngle,
	                    endAngle: endAngle,
	                    clockwise: clockwise,
	                    cx: cx,
	                    cy: cy,
	                    r0: r0,
	                    r: roseType
	                        ? numberUtil.linearMap(value, extent, [r0, r])
	                        : r
	                });

	                currentAngle = endAngle;
	            }, true);

	            // Some sector is constrained by minAngle
	            // Rest sectors needs recalculate angle
	            if (restAngle < PI2) {
	                // Average the angle if rest angle is not enough after all angles is
	                // Constrained by minAngle
	                if (restAngle <= 1e-3) {
	                    var angle = PI2 / data.count();
	                    data.each(function (idx) {
	                        var layout = data.getItemLayout(idx);
	                        layout.startAngle = startAngle + dir * idx * angle;
	                        layout.endAngle = startAngle + dir * (idx + 1) * angle;
	                    });
	                }
	                else {
	                    unitRadian = restAngle / valueSumLargerThanMinAngle;
	                    currentAngle = startAngle;
	                    data.each('value', function (value, idx) {
	                        var layout = data.getItemLayout(idx);
	                        var angle = layout.angle === minAngle
	                            ? minAngle : value * unitRadian;
	                        layout.startAngle = currentAngle;
	                        layout.endAngle = currentAngle + dir * angle;
	                        currentAngle += angle;
	                    });
	                }
	            }

	            labelLayout(seriesModel, r, width, height);
	        });
	    };


/***/ },
/* 140 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	// FIXME emphasis label position is not same with normal label position


	    var textContain = __webpack_require__(14);

	    function adjustSingleSide(list, cx, cy, r, dir, viewWidth, viewHeight) {
	        list.sort(function (a, b) {
	            return a.y - b.y;
	        });

	        // 压
	        function shiftDown(start, end, delta, dir) {
	            for (var j = start; j < end; j++) {
	                list[j].y += delta;
	                if (j > start
	                    && j + 1 < end
	                    && list[j + 1].y > list[j].y + list[j].height
	                ) {
	                    shiftUp(j, delta / 2);
	                    return;
	                }
	            }

	            shiftUp(end - 1, delta / 2);
	        }

	        // 弹
	        function shiftUp(end, delta) {
	            for (var j = end; j >= 0; j--) {
	                list[j].y -= delta;
	                if (j > 0
	                    && list[j].y > list[j - 1].y + list[j - 1].height
	                ) {
	                    break;
	                }
	            }
	        }

	        function changeX(list, isDownList, cx, cy, r, dir) {
	            var lastDeltaX = dir > 0
	                ? isDownList                // 右侧
	                    ? Number.MAX_VALUE      // 下
	                    : 0                     // 上
	                : isDownList                // 左侧
	                    ? Number.MAX_VALUE      // 下
	                    : 0;                    // 上

	            for (var i = 0, l = list.length; i < l; i++) {
	                // Not change x for center label
	                if (list[i].position === 'center') {
	                    continue;
	                }
	                var deltaY = Math.abs(list[i].y - cy);
	                var length = list[i].len;
	                var length2 = list[i].len2;
	                var deltaX = (deltaY < r + length)
	                    ? Math.sqrt(
	                          (r + length + length2) * (r + length + length2)
	                          - deltaY * deltaY
	                      )
	                    : Math.abs(list[i].x - cx);
	                if (isDownList && deltaX >= lastDeltaX) {
	                    // 右下，左下
	                    deltaX = lastDeltaX - 10;
	                }
	                if (!isDownList && deltaX <= lastDeltaX) {
	                    // 右上，左上
	                    deltaX = lastDeltaX + 10;
	                }

	                list[i].x = cx + deltaX * dir;
	                lastDeltaX = deltaX;
	            }
	        }

	        var lastY = 0;
	        var delta;
	        var len = list.length;
	        var upList = [];
	        var downList = [];
	        for (var i = 0; i < len; i++) {
	            delta = list[i].y - lastY;
	            if (delta < 0) {
	                shiftDown(i, len, -delta, dir);
	            }
	            lastY = list[i].y + list[i].height;
	        }
	        if (viewHeight - lastY < 0) {
	            shiftUp(len - 1, lastY - viewHeight);
	        }
	        for (var i = 0; i < len; i++) {
	            if (list[i].y >= cy) {
	                downList.push(list[i]);
	            }
	            else {
	                upList.push(list[i]);
	            }
	        }
	        changeX(upList, false, cx, cy, r, dir);
	        changeX(downList, true, cx, cy, r, dir);
	    }

	    function avoidOverlap(labelLayoutList, cx, cy, r, viewWidth, viewHeight) {
	        var leftList = [];
	        var rightList = [];
	        for (var i = 0; i < labelLayoutList.length; i++) {
	            if (labelLayoutList[i].x < cx) {
	                leftList.push(labelLayoutList[i]);
	            }
	            else {
	                rightList.push(labelLayoutList[i]);
	            }
	        }

	        adjustSingleSide(rightList, cx, cy, r, 1, viewWidth, viewHeight);
	        adjustSingleSide(leftList, cx, cy, r, -1, viewWidth, viewHeight);

	        for (var i = 0; i < labelLayoutList.length; i++) {
	            var linePoints = labelLayoutList[i].linePoints;
	            if (linePoints) {
	                var dist = linePoints[1][0] - linePoints[2][0];
	                if (labelLayoutList[i].x < cx) {
	                    linePoints[2][0] = labelLayoutList[i].x + 3;
	                }
	                else {
	                    linePoints[2][0] = labelLayoutList[i].x - 3;
	                }
	                linePoints[1][1] = linePoints[2][1] = labelLayoutList[i].y;
	                linePoints[1][0] = linePoints[2][0] + dist;
	            }
	        }
	    }

	    module.exports = function (seriesModel, r, viewWidth, viewHeight) {
	        var data = seriesModel.getData();
	        var labelLayoutList = [];
	        var cx;
	        var cy;
	        var hasLabelRotate = false;

	        data.each(function (idx) {
	            var layout = data.getItemLayout(idx);

	            var itemModel = data.getItemModel(idx);
	            var labelModel = itemModel.getModel('label.normal');
	            // Use position in normal or emphasis
	            var labelPosition = labelModel.get('position') || itemModel.get('label.emphasis.position');

	            var labelLineModel = itemModel.getModel('labelLine.normal');
	            var labelLineLen = labelLineModel.get('length');
	            var labelLineLen2 = labelLineModel.get('length2');

	            var midAngle = (layout.startAngle + layout.endAngle) / 2;
	            var dx = Math.cos(midAngle);
	            var dy = Math.sin(midAngle);

	            var textX;
	            var textY;
	            var linePoints;
	            var textAlign;

	            cx = layout.cx;
	            cy = layout.cy;

	            var isLabelInside = labelPosition === 'inside' || labelPosition === 'inner';
	            if (labelPosition === 'center') {
	                textX = layout.cx;
	                textY = layout.cy;
	                textAlign = 'center';
	            }
	            else {
	                var x1 = (isLabelInside ? (layout.r + layout.r0) / 2 * dx : layout.r * dx) + cx;
	                var y1 = (isLabelInside ? (layout.r + layout.r0) / 2 * dy : layout.r * dy) + cy;

	                textX = x1 + dx * 3;
	                textY = y1 + dy * 3;

	                if (!isLabelInside) {
	                    // For roseType
	                    var x2 = x1 + dx * (labelLineLen + r - layout.r);
	                    var y2 = y1 + dy * (labelLineLen + r - layout.r);
	                    var x3 = x2 + ((dx < 0 ? -1 : 1) * labelLineLen2);
	                    var y3 = y2;

	                    textX = x3 + (dx < 0 ? -5 : 5);
	                    textY = y3;
	                    linePoints = [[x1, y1], [x2, y2], [x3, y3]];
	                }

	                textAlign = isLabelInside ? 'center' : (dx > 0 ? 'left' : 'right');
	            }
	            var font = labelModel.getModel('textStyle').getFont();

	            var labelRotate = labelModel.get('rotate')
	                ? (dx < 0 ? -midAngle + Math.PI : -midAngle) : 0;
	            var text = seriesModel.getFormattedLabel(idx, 'normal')
	                        || data.getName(idx);
	            var textRect = textContain.getBoundingRect(
	                text, font, textAlign, 'top'
	            );
	            hasLabelRotate = !!labelRotate;
	            layout.label = {
	                x: textX,
	                y: textY,
	                position: labelPosition,
	                height: textRect.height,
	                len: labelLineLen,
	                len2: labelLineLen2,
	                linePoints: linePoints,
	                textAlign: textAlign,
	                verticalAlign: 'middle',
	                font: font,
	                rotation: labelRotate
	            };

	            // Not layout the inside label
	            if (!isLabelInside) {
	                labelLayoutList.push(layout.label);
	            }
	        });
	        if (!hasLabelRotate && seriesModel.get('avoidLabelOverlap')) {
	            avoidOverlap(labelLayoutList, cx, cy, r, viewWidth, viewHeight);
	        }
	    };


/***/ },
/* 141 */
/***/ function(module, exports) {

	
	    module.exports = function (seriesType, ecModel) {
	        var legendModels = ecModel.findComponents({
	            mainType: 'legend'
	        });
	        if (!legendModels || !legendModels.length) {
	            return;
	        }
	        ecModel.eachSeriesByType(seriesType, function (series) {
	            var data = series.getData();
	            data.filterSelf(function (idx) {
	                var name = data.getName(idx);
	                // If in any legend component the status is not selected.
	                for (var i = 0; i < legendModels.length; i++) {
	                    if (!legendModels[i].isSelected(name)) {
	                        return false;
	                    }
	                }
	                return true;
	            }, this);
	        }, this);
	    };


/***/ }
/******/ ])
});
;