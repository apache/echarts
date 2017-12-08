
/*!
 * ECharts, a javascript interactive chart library.
 *
 * Copyright (c) 2015, Baidu Inc.
 * All rights reserved.
 *
 * LICENSE
 * https://github.com/ecomfe/echarts/blob/master/LICENSE.txt
 */

import {__DEV__} from './config';
import * as zrender from 'zrender/src/zrender';
import * as zrUtil from 'zrender/src/core/util';
import * as colorTool from 'zrender/src/tool/color';
import env from 'zrender/src/core/env';
import timsort from 'zrender/src/core/timsort';
import Eventful from 'zrender/src/mixin/Eventful';
import GlobalModel from './model/Global';
import ExtensionAPI from './ExtensionAPI';
import CoordinateSystemManager from './CoordinateSystem';
import OptionManager from './model/OptionManager';
import backwardCompat from './preprocessor/backwardCompat';
import ComponentModel from './model/Component';
import SeriesModel from './model/Series';
import ComponentView from './view/Component';
import ChartView from './view/Chart';
import * as graphic from './util/graphic';
import * as modelUtil from './util/model';
import {throttle} from './util/throttle';
import seriesColor from './visual/seriesColor';
import loadingDefault from './loading/default';
import Scheduler from './stream/Scheduler';

var each = zrUtil.each;
var parseClassType = ComponentModel.parseClassType;

export var version = '3.8.5';

export var dependencies = {
    zrender: '3.7.4'
};

// ??? frame remain time in UI thread: 20ms? 16ms?
var TEST_FRAME_REMAIN_TIME = 1;

var PRIORITY_PROCESSOR_FILTER = 1000;
var PRIORITY_PROCESSOR_STATISTIC = 5000;

var PRIORITY_VISUAL_LAYOUT = 1000;
var PRIORITY_VISUAL_GLOBAL = 2000;
var PRIORITY_VISUAL_CHART = 3000;
var PRIORITY_VISUAL_COMPONENT = 4000;
// FIXME
// necessary?
var PRIORITY_VISUAL_BRUSH = 5000;

export var PRIORITY = {
    PROCESSOR: {
        FILTER: PRIORITY_PROCESSOR_FILTER,
        STATISTIC: PRIORITY_PROCESSOR_STATISTIC
    },
    VISUAL: {
        LAYOUT: PRIORITY_VISUAL_LAYOUT,
        GLOBAL: PRIORITY_VISUAL_GLOBAL,
        CHART: PRIORITY_VISUAL_CHART,
        COMPONENT: PRIORITY_VISUAL_COMPONENT,
        BRUSH: PRIORITY_VISUAL_BRUSH
    }
};

// Main process have three entries: `setOption`, `dispatchAction` and `resize`,
// where they must not be invoked nestedly, except the only case: invoke
// dispatchAction with updateMethod "none" in main process.
// This flag is used to carry out this rule.
// All events will be triggered out side main process (i.e. when !this[IN_MAIN_PROCESS]).
var IN_MAIN_PROCESS = '__flagInMainProcess';
var HAS_GRADIENT_OR_PATTERN_BG = '__hasGradientOrPatternBg';
var OPTION_UPDATED = '__optionUpdated';
var ACTION_REG = /^[a-zA-Z0-9_]+$/;

// ??? defined in scheduler?
var STAGE_DATA_INIT = 'dataInit';
var STAGE_DATA_CLONE = 'dataClone';
var STAGE_PROCESSOR = 'processor';
var STAGE_VISUAL = 'visual';
var STAGE_RENDER = 'render';


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
function ECharts(dom, theme, opts) {
    opts = opts || {};

    // Get theme by name
    if (typeof theme === 'string') {
        theme = themeStorage[theme];
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
     * @type {HTMLElement}
     * @private
     */
    this._dom = dom;

    var defaultRenderer = 'canvas';
    if (__DEV__) {
        defaultRenderer = (
            typeof window === 'undefined' ? global : window
        ).__ECHARTS__DEFAULT__RENDERER__ || defaultRenderer;
    }

    /**
     * @type {module:zrender/ZRender}
     * @private
     */
    var zr = this._zr = zrender.init(dom, {
        renderer: opts.renderer || defaultRenderer,
        devicePixelRatio: opts.devicePixelRatio,
        width: opts.width,
        height: opts.height
    });

    /**
     * Expect 60 pfs.
     * @type {Function}
     * @private
     */
    this._throttledZrFlush = throttle(zrUtil.bind(zr.flush, zr), 17);

    var theme = zrUtil.clone(theme);
    theme && backwardCompat(theme, true);
    /**
     * @type {Object}
     * @private
     */
    this._theme = theme;

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
     * @type {module:echarts/CoordinateSystem}
     * @private
     */
    this._coordSysMgr = new CoordinateSystemManager();

    /**
     * @type {module:echarts/ExtensionAPI}
     * @private
     */
    this._api = createExtensionAPI(this);

    /**
     * @type {module:echarts/stream/Scheduler}
     */
    this._scheduler = new Scheduler();

    Eventful.call(this);

    /**
     * @type {module:echarts~MessageCenter}
     * @private
     */
    this._messageCenter = new MessageCenter();

    // this._scheduler = new Scheduler();

    // Init mouse events
    this._initEvents();

    // In case some people write `window.onresize = chart.resize`
    this.resize = zrUtil.bind(this.resize, this);

    // Can't dispatch action during rendering procedure
    this._pendingActions = [];
    // Sort on demand
    function prioritySortFunc(a, b) {
        return a.prio - b.prio;
    }
    timsort(visualFuncs, prioritySortFunc);
    timsort(dataProcessorFuncs, prioritySortFunc);

    zr.animation.on('frame', this._onframe, this);

    // ECharts instance can be used as value.
    zrUtil.setAsPrimitive(this);
}

var echartsProto = ECharts.prototype;

echartsProto._onframe = function () {
    if (this._disposed) {
        return;
    }

    // Lazy update
    if (this[OPTION_UPDATED]) {
        var silent = this[OPTION_UPDATED].silent;

        this[IN_MAIN_PROCESS] = true;

        // ??? conflict?
        updateMethods.prepareAndUpdate.call(this);

        this[IN_MAIN_PROCESS] = false;

        this[OPTION_UPDATED] = false;

        flushPendingActions.call(this, silent);

        triggerUpdatedEvent.call(this, silent);
    }

    // Stream progress.
    var remainTime = TEST_FRAME_REMAIN_TIME;
    var scheduler = this._scheduler;

    if (scheduler.unfinished) {
        scheduler.unfinished = false;
        do {
            var startTime = +new Date();

            scheduler.progressStage(STAGE_DATA_INIT);
            scheduler.progressStage(STAGE_DATA_CLONE);
            scheduler.progressStage(STAGE_PROCESSOR);

            // ???
            // coordSys update

            // console.log('------------- ec frame visual -------------', remainTime);
            scheduler.progressStage(STAGE_VISUAL);

            progressRender(this, this._model);

            remainTime -= (+new Date() - startTime);
        }
        while (remainTime > 0 && scheduler.unfinished);
    }
};


/**
 * @return {HTMLElement}
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
 * Usage:
 * chart.setOption(option, notMerge, lazyUpdate);
 * chart.setOption(option, {
 *     notMerge: ...,
 *     lazyUpdate: ...,
 *     silent: ...
 * });
 *
 * @param {Object} option
 * @param {Object|boolean} [opts] opts or notMerge.
 * @param {boolean} [opts.notMerge=false]
 * @param {boolean} [opts.lazyUpdate=false] Useful when setOption frequently.
 */
echartsProto.setOption = function (option, notMerge, lazyUpdate) {
    if (__DEV__) {
        zrUtil.assert(!this[IN_MAIN_PROCESS], '`setOption` should not be called during main process.');
    }

    var silent;
    if (zrUtil.isObject(notMerge)) {
        lazyUpdate = notMerge.lazyUpdate;
        silent = notMerge.silent;
        notMerge = notMerge.notMerge;
    }

    this[IN_MAIN_PROCESS] = true;

    if (!this._model || notMerge) {
        var optionManager = new OptionManager(this._api);
        var theme = this._theme;
        var ecModel = this._model = new GlobalModel(null, null, theme, optionManager);
        ecModel.scheduler = this._scheduler;
        ecModel.init(null, null, theme, optionManager);
    }

    this._model.setOption(option, optionPreprocessorFuncs);

    if (lazyUpdate) {
        this[OPTION_UPDATED] = {silent: silent};
        this[IN_MAIN_PROCESS] = false;
    }
    else {
        updateMethods.prepareAndUpdate.call(this);
        // Ensure zr refresh sychronously, and then pixel in canvas can be
        // fetched after `setOption`.
        this._zr.flush();

        this[OPTION_UPDATED] = false;
        this[IN_MAIN_PROCESS] = false;

        flushPendingActions.call(this, silent);
        triggerUpdatedEvent.call(this, silent);
    }
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
    return this._model && this._model.getOption();
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
 * @return {number}
 */
echartsProto.getDevicePixelRatio = function () {
    return this._zr.painter.dpr || window.devicePixelRatio || 1;
};

/**
 * Get canvas which has all thing rendered
 * @param {Object} opts
 * @param {string} [opts.backgroundColor]
 * @return {string}
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
 * Get svg data url
 * @return {string}
 */
echartsProto.getSvgDataUrl = function () {
    if (!env.svgSupported) {
        return;
    }

    var zr = this._zr;
    var list = zr.storage.getDisplayList();
    // Stop animations
    zrUtil.each(list, function (el) {
        el.stopAnimation(true);
    });

    return zr.painter.pathToSvg();
};

/**
 * @return {string}
 * @param {Object} opts
 * @param {string} [opts.type='png']
 * @param {string} [opts.pixelRatio=1]
 * @param {string} [opts.backgroundColor]
 * @param {string} [opts.excludeComponents]
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

    var url = this._zr.painter.getType() === 'svg'
        ? this.getSvgDataUrl()
        : this.getRenderedCanvas(opts).toDataURL(
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

        zrUtil.each(instances, function (chart, id) {
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
        });

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

/**
 * Convert from logical coordinate system to pixel coordinate system.
 * See CoordinateSystem#convertToPixel.
 * @param {string|Object} finder
 *        If string, e.g., 'geo', means {geoIndex: 0}.
 *        If Object, could contain some of these properties below:
 *        {
 *            seriesIndex / seriesId / seriesName,
 *            geoIndex / geoId, geoName,
 *            bmapIndex / bmapId / bmapName,
 *            xAxisIndex / xAxisId / xAxisName,
 *            yAxisIndex / yAxisId / yAxisName,
 *            gridIndex / gridId / gridName,
 *            ... (can be extended)
 *        }
 * @param {Array|number} value
 * @return {Array|number} result
 */
echartsProto.convertToPixel = zrUtil.curry(doConvertPixel, 'convertToPixel');

/**
 * Convert from pixel coordinate system to logical coordinate system.
 * See CoordinateSystem#convertFromPixel.
 * @param {string|Object} finder
 *        If string, e.g., 'geo', means {geoIndex: 0}.
 *        If Object, could contain some of these properties below:
 *        {
 *            seriesIndex / seriesId / seriesName,
 *            geoIndex / geoId / geoName,
 *            bmapIndex / bmapId / bmapName,
 *            xAxisIndex / xAxisId / xAxisName,
 *            yAxisIndex / yAxisId / yAxisName
 *            gridIndex / gridId / gridName,
 *            ... (can be extended)
 *        }
 * @param {Array|number} value
 * @return {Array|number} result
 */
echartsProto.convertFromPixel = zrUtil.curry(doConvertPixel, 'convertFromPixel');

function doConvertPixel(methodName, finder, value) {
    var ecModel = this._model;
    var coordSysList = this._coordSysMgr.getCoordinateSystems();
    var result;

    finder = modelUtil.parseFinder(ecModel, finder);

    for (var i = 0; i < coordSysList.length; i++) {
        var coordSys = coordSysList[i];
        if (coordSys[methodName]
            && (result = coordSys[methodName](ecModel, finder, value)) != null
        ) {
            return result;
        }
    }

    if (__DEV__) {
        console.warn(
            'No coordinate system that supports ' + methodName + ' found by the given finder.'
        );
    }
}

/**
 * Is the specified coordinate systems or components contain the given pixel point.
 * @param {string|Object} finder
 *        If string, e.g., 'geo', means {geoIndex: 0}.
 *        If Object, could contain some of these properties below:
 *        {
 *            seriesIndex / seriesId / seriesName,
 *            geoIndex / geoId / geoName,
 *            bmapIndex / bmapId / bmapName,
 *            xAxisIndex / xAxisId / xAxisName,
 *            yAxisIndex / yAxisId / yAxisName,
 *            gridIndex / gridId / gridName,
 *            ... (can be extended)
 *        }
 * @param {Array|number} value
 * @return {boolean} result
 */
echartsProto.containPixel = function (finder, value) {
    var ecModel = this._model;
    var result;

    finder = modelUtil.parseFinder(ecModel, finder);

    zrUtil.each(finder, function (models, key) {
        key.indexOf('Models') >= 0 && zrUtil.each(models, function (model) {
            var coordSys = model.coordinateSystem;
            if (coordSys && coordSys.containPoint) {
                result |= !!coordSys.containPoint(value);
            }
            else if (key === 'seriesModels') {
                var view = this._chartsMap[model.__viewId];
                if (view && view.containPoint) {
                    result |= view.containPoint(value, model);
                }
                else {
                    if (__DEV__) {
                        console.warn(key + ': ' + (view
                            ? 'The found component do not support containPoint.'
                            : 'No view mapping to the found component.'
                        ));
                    }
                }
            }
            else {
                if (__DEV__) {
                    console.warn(key + ': containPoint is not supported');
                }
            }
        }, this);
    }, this);

    return !!result;
};

/**
 * Get visual from series or data.
 * @param {string|Object} finder
 *        If string, e.g., 'series', means {seriesIndex: 0}.
 *        If Object, could contain some of these properties below:
 *        {
 *            seriesIndex / seriesId / seriesName,
 *            dataIndex / dataIndexInside
 *        }
 *        If dataIndex is not specified, series visual will be fetched,
 *        but not data item visual.
 *        If all of seriesIndex, seriesId, seriesName are not specified,
 *        visual will be fetched from first series.
 * @param {string} visualType 'color', 'symbol', 'symbolSize'
 */
echartsProto.getVisual = function (finder, visualType) {
    var ecModel = this._model;

    finder = modelUtil.parseFinder(ecModel, finder, {defaultMainType: 'series'});

    var seriesModel = finder.seriesModel;

    if (__DEV__) {
        if (!seriesModel) {
            console.warn('There is no specified seires model');
        }
    }

    var data = seriesModel.getData();

    var dataIndexInside = finder.hasOwnProperty('dataIndexInside')
        ? finder.dataIndexInside
        : finder.hasOwnProperty('dataIndex')
        ? data.indexOfRawIndex(finder.dataIndex)
        : null;

    return dataIndexInside != null
        ? data.getItemVisual(dataIndexInside, visualType)
        : data.getVisual(visualType);
};

/**
 * Get view of corresponding component model
 * @param  {module:echarts/model/Component} componentModel
 * @return {module:echarts/view/Component}
 */
echartsProto.getViewOfComponentModel = function (componentModel) {
    return this._componentsMap[componentModel.__viewId];
};

/**
 * Get view of corresponding series model
 * @param  {module:echarts/model/Series} seriesModel
 * @return {module:echarts/view/Chart}
 */
echartsProto.getViewOfSeriesModel = function (seriesModel) {
    return this._chartsMap[seriesModel.__viewId];
};

var updateMethods = {

    /**
     * @param {Object} payload
     * @private
     */
    update: function (payload) {
        // console.profile && console.profile('update');

        var ecModel = this._model;
        var api = this._api;
        var zr = this._zr;
        var coordSysMgr = this._coordSysMgr;
        var scheduler = this._scheduler;

        // update before setOption
        if (!ecModel) {
            return;
        }

        scheduler.clearTemps();

        // Fixme First time update ?
        ecModel.restoreData();

        // TODO
        // Save total ecModel here for undo/redo (after restoring data and before processing data).
        // Undo (restoration of total ecModel) can be carried out in 'action' or outside API call.

        // Create new coordinate system each update
        // In LineView may save the old coordinate system and use it to get the orignal point
        coordSysMgr.create(ecModel, api);
        // ??? coord data travel

        // ??? if some processor do not use task, it should also process in progress,
        // otherwise, consider data extent, both dependent.

        startProcessors(this, ecModel, api);

        stackSeriesData.call(this, ecModel);

        // ??? coord data travel
        coordSysMgr.update(ecModel, api);

        startVisualEncoding(this, ecModel, api, payload);

        startRender(this, ecModel, api, payload);

        scheduler.flushTemps('updateBase');

        // Set background
        var backgroundColor = ecModel.get('backgroundColor') || 'transparent';

        var painter = zr.painter;
        // TODO all use clearColor ?
        if (painter.isSingleCanvas && painter.isSingleCanvas()) {
            zr.configLayer(0, {
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
            if (backgroundColor.colorStops || backgroundColor.image) {
                // Gradient background
                // FIXME Fixed layer？
                zr.configLayer(0, {
                    clearColor: backgroundColor
                });
                this[HAS_GRADIENT_OR_PATTERN_BG] = true;

                this._dom.style.background = 'transparent';
            }
            else {
                if (this[HAS_GRADIENT_OR_PATTERN_BG]) {
                    zr.configLayer(0, {
                        clearColor: null
                    });
                }
                this[HAS_GRADIENT_OR_PATTERN_BG] = false;

                this._dom.style.background = backgroundColor;
            }
        }

        each(postUpdateFuncs, function (func) {
            func(ecModel, api);
        });

        // console.profile && console.profileEnd('update');
    },

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

        this._scheduler.clearTemps();

        ecModel.eachSeries(function (seriesModel) {
            seriesModel.getData().clearAllVisual();
        });

        // Keep pipe to the exist pipeline because it depends on the render task of the full pipeline.
        startVisualEncoding(this, ecModel, this._api, payload, null);

        invokeUpdateMethod.call(this, 'updateView', ecModel, payload);

        this._scheduler.flushTemps('updateViewBase');
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

        this._scheduler.clearTemps();

        ecModel.eachSeries(function (seriesModel) {
            seriesModel.getData().clearAllVisual();
        });

        // Keep pipe to the exist pipeline because it depends on the render task of the full pipeline.
        startVisualEncoding(this, ecModel, this._api, payload, false);

        invokeUpdateMethod.call(this, 'updateVisual', ecModel, payload);

        this._scheduler.flushTemps('updateVisualBase');
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

        this._scheduler.clearTemps();

        // Keep pipe to the exist pipeline because it depends on the render task of the full pipeline.
        startVisualEncoding(this, ecModel, this._api, payload, true);

        invokeUpdateMethod.call(this, 'updateLayout', ecModel, payload);

        this._scheduler.flushTemps('updateLayoutBase');
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
 * @private
 */
function updateDirectly(ecIns, method, payload, mainType, subType) {
    var ecModel = ecIns._model;

    // broadcast
    if (!mainType) {
        each(ecIns._componentsViews.concat(ecIns._chartsViews), callView);
        return;
    }

    var query = {};
    query[mainType + 'Id'] = payload[mainType + 'Id'];
    query[mainType + 'Index'] = payload[mainType + 'Index'];
    query[mainType + 'Name'] = payload[mainType + 'Name'];

    var condition = {mainType: mainType, query: query};
    subType && (condition.subType = subType); // subType may be '' by parseClassType;

    // If dispatchAction before setOption, do nothing.
    ecModel && ecModel.eachComponent(condition, function (model, index) {
        callView(ecIns[
            mainType === 'series' ? '_chartsMap' : '_componentsMap'
        ][model.__viewId]);
    }, ecIns);

    function callView(view) {
        view && view.__alive && view[method] && view[method](
            view.__model, ecModel, ecIns._api, payload
        );
    }
}

/**
 * Resize the chart
 * @param {Object} opts
 * @param {number} [opts.width] Can be 'auto' (the same as null/undefined)
 * @param {number} [opts.height] Can be 'auto' (the same as null/undefined)
 * @param {boolean} [opts.silent=false]
 */
echartsProto.resize = function (opts) {
    if (__DEV__) {
        zrUtil.assert(!this[IN_MAIN_PROCESS], '`resize` should not be called during main process.');
    }

    this._zr.resize(opts);

    var optionChanged = this._model && this._model.resetOption('media');
    var updateMethod = optionChanged ? 'prepareAndUpdate' : 'update';

    refresh(updateMethod, opts && opts.silent);
};

function refresh(updateMethod, silent) {
    this[IN_MAIN_PROCESS] = true;

    updateMethods[updateMethod].call(this);

    // Resize loading effect
    this._loadingFX && this._loadingFX.resize();

    this[IN_MAIN_PROCESS] = false;

    flushPendingActions.call(this, silent);

    triggerUpdatedEvent.call(this, silent);
}

/**
 * Show loading effect
 * @param  {string} [name='default']
 * @param  {Object} [cfg]
 */
echartsProto.showLoading = function (name, cfg) {
    if (zrUtil.isObject(name)) {
        cfg = name;
        name = '';
    }
    name = name || 'default';

    this.hideLoading();
    if (!loadingEffects[name]) {
        if (__DEV__) {
            console.warn('Loading effects ' + name + ' not exists.');
        }
        return;
    }
    var el = loadingEffects[name](this._api, cfg);
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
 * @param {Object|boolean} [opt] If pass boolean, means opt.silent
 * @param {boolean} [opt.silent=false] Whether trigger events.
 * @param {boolean} [opt.flush=undefined]
 *                  true: Flush immediately, and then pixel in canvas can be fetched
 *                      immediately. Caution: it might affect performance.
 *                  false: Not not flush.
 *                  undefined: Auto decide whether perform flush.
 */
echartsProto.dispatchAction = function (payload, opt) {
    if (!zrUtil.isObject(opt)) {
        opt = {silent: !!opt};
    }

    if (!actions[payload.type]) {
        return;
    }

    // Avoid dispatch action before setOption. Especially in `connect`.
    if (!this._model) {
        return;
    }

    // May dispatchAction in rendering procedure
    if (this[IN_MAIN_PROCESS]) {
        this._pendingActions.push(payload);
        return;
    }

    doDispatchAction.call(this, payload, opt.silent);

    if (opt.flush) {
        this._zr.flush(true);
    }
    else if (opt.flush !== false && env.browser.weChat) {
        // In WeChat embeded browser, `requestAnimationFrame` and `setInterval`
        // hang when sliding page (on touch event), which cause that zr does not
        // refresh util user interaction finished, which is not expected.
        // But `dispatchAction` may be called too frequently when pan on touch
        // screen, which impacts performance if do not throttle them.
        this._throttledZrFlush();
    }

    flushPendingActions.call(this, opt.silent);

    triggerUpdatedEvent.call(this, opt.silent);
};

function doDispatchAction(payload, silent) {
    var payloadType = payload.type;
    var escapeConnect = payload.escapeConnect;
    var actionWrap = actions[payloadType];
    var actionInfo = actionWrap.actionInfo;

    var cptType = (actionInfo.update || 'update').split(':');
    var updateMethod = cptType.pop();
    cptType = cptType[0] != null && parseClassType(cptType[0]);

    this[IN_MAIN_PROCESS] = true;

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
    var isHighDown = payloadType === 'highlight' || payloadType === 'downplay';

    each(payloads, function (batchItem) {
        // Action can specify the event by return it.
        eventObj = actionWrap.action(batchItem, this._model, this._api);
        // Emit event outside
        eventObj = eventObj || zrUtil.extend({}, batchItem);
        // Convert type to eventType
        eventObj.type = actionInfo.event || eventObj.type;
        eventObjBatch.push(eventObj);

        // light update does not perform data process, layout and visual.
        if (isHighDown) {
            // method, payload, mainType, subType
            updateDirectly(this, updateMethod, batchItem, 'series');
        }
        else if (cptType) {
            updateDirectly(this, updateMethod, batchItem, cptType.main, cptType.sub);
        }
    }, this);

    if (updateMethod !== 'none' && !isHighDown && !cptType) {
        // Still dirty
        if (this[OPTION_UPDATED]) {
            // FIXME Pass payload ?
            updateMethods.prepareAndUpdate.call(this, payload);
            this[OPTION_UPDATED] = false;
        }
        else {
            updateMethods[updateMethod].call(this, payload);
        }
    }

    // Follow the rule of action batch
    if (batched) {
        eventObj = {
            type: actionInfo.event || payloadType,
            escapeConnect: escapeConnect,
            batch: eventObjBatch
        };
    }
    else {
        eventObj = eventObjBatch[0];
    }

    this[IN_MAIN_PROCESS] = false;

    !silent && this._messageCenter.trigger(eventObj.type, eventObj);
}

function flushPendingActions(silent) {
    var pendingActions = this._pendingActions;
    while (pendingActions.length) {
        var payload = pendingActions.shift();
        doDispatchAction.call(this, payload, silent);
    }
}

function triggerUpdatedEvent(silent) {
    !silent && this.trigger('updated');
}

// ???
echartsProto.addData = function (params) {
    var seriesIndex = params.seriesIndex;
    var ecModel = this.getModel();
    var seriesModel = ecModel.getSeriesByIndex(seriesIndex);

    if (__DEV__) {
        zrUtil.assert(params.data && seriesModel);
    }

    var provider = seriesModel.getRawData().getProvider();
    // .provisionTask.changeInput(params.data);
    provider.addData(params.data);

    this._scheduler.unfinished = true;

    // ??? Should handle this.
    // if (!seriesModel.getStreamSetting()) {
        // refresh('prepareAndUpdate');
    // }
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

    // ??? duplicate code with `startRender`?

    // Upate all charts
    ecModel.eachSeries(function (seriesModel, idx) {
        var chart = this._chartsMap[seriesModel.__viewId];
        chart[methodName](seriesModel, ecModel, api, payload);

        updateZ(seriesModel, chart);

        // ??? updateProgressiveAndBlend(seriesModel, chart);
    }, this);

    // If use hover layer
    // ??? updateHoverLayerStatus(this._zr, ecModel);

    // Post render
    each(postUpdateFuncs, function (func) {
        func(ecModel, api);
    });
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
        var viewId = '_ec_' + model.id + '_' + model.type;
        var view = viewMap[viewId];
        if (!view) {
            var classType = parseClassType(model.type);
            var Clazz = isComponent
                ? ComponentView.getClass(classType.main, classType.sub)
                : ChartView.getClass(classType.sub);

            if (__DEV__) {
                zrUtil.assert(Clazz, classType.sub + ' does not exist.');
            }

            view = new Clazz();
            view.init(ecModel, this._api);
            viewMap[viewId] = view;
            viewList.push(view);
            zr.add(view.group);
        }

        model.__viewId = view.__id = viewId;
        view.__alive = true;
        view.__model = model;
        view.group.__ecComponentInfo = {
            mainType: model.mainType,
            index: model.componentIndex
        };
    }, this);

    for (var i = 0; i < viewList.length;) {
        var view = viewList[i];
        if (!view.__alive) {
            zr.remove(view.group);
            view.dispose(ecModel, this._api);
            viewList.splice(i, 1);
            delete viewMap[view.__id];
            view.__id = view.group.__ecComponentInfo = null;
        }
        else {
            i++;
        }
    }
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
            // Avoid conflict with Object.prototype
            if (stackedDataMap.hasOwnProperty(stack) && previousStack) {
                data.stackedOn = previousStack;
            }
            stackedDataMap[stack] = data;
        }
    });
}

/**
 * @param {module:echarts/model/Global} ecModel
 * @private
 */
function startProcessors(ecIns, ecModel, api) {
    each(dataProcessorFuncs, function (processor, index) {
        processor.func(ecModel, api);
    });
}

/**
 * Encode visual infomation from data after data processing
 *
 * @param {module:echarts/model/Global} ecModel
 * @param {object} layout
 * @param {boolean} [layoutFilter] `true`: only layout,
 *                                 `false`: only not layout,
 *                                 `null`/`undefined`: all.
 * @param {string} taskBaseTag
 * @private
 */
function startVisualEncoding(ecIns, ecModel, api, payload, layoutFilter) {
    if (layoutFilter !== true) {
        ecModel.clearColorPalette();
        ecModel.eachSeries(function (seriesModel) {
            seriesModel.clearColorPalette();
        });
    }

    each(visualFuncs, function (visual, index) {
        var isLayout = visual.isLayout;
        if (layoutFilter == null
            || (layoutFilter === false && !isLayout)
            || (layoutFilter === true && isLayout)
        ) {
            visual.func(ecModel, api, payload);
        }
    });
}

/**
 * Render each chart and component
 * @private
 */
function startRender(ecIns, ecModel, api, payload) {
    // Render all components
    each(ecIns._componentsViews, function (componentView) {
        var componentModel = componentView.__model;
        componentView.render(componentModel, ecModel, api, payload);

        updateZ(componentModel, componentView);
    });

    each(ecIns._chartsViews, function (chart) {
        chart.__alive = false;
    });

    // ??? The key should be `__viewId` but not index. consider view change !!!
    // Render all charts
    ecModel.eachSeries(function (seriesModel) {
        var chartView = ecIns._chartsMap[seriesModel.__viewId];
        chartView.__alive = true;

        chartView.render(seriesModel, ecModel, api, payload);

        chartView.group.silent = !!seriesModel.get('silent');

        updateZ(seriesModel, chartView);

        // ??? updateProgressiveAndBlend(seriesModel, chartView);

    });

    // If use hover layer
    // ??? updateHoverLayerStatus(this._zr, ecModel);

    // Remove groups of unrendered charts
    each(ecIns._chartsViews, function (chart) {
        if (!chart.__alive) {
            chart.remove(ecModel, api);
        }
    });
}

function progressRender(ecIns, ecModel) {

    ecIns._scheduler.progressStage(STAGE_RENDER);

    // ???
    ecModel.eachSeries(function (seriesModel, idx) {
        var chartView = ecIns._chartsMap[seriesModel.__viewId];

        chartView.group.silent = !!seriesModel.get('silent');

        updateZ(seriesModel, chartView);

        // ??? updateProgressiveAndBlend(seriesModel, chartView);
    });
}

var MOUSE_EVENT_NAMES = [
    'click', 'dblclick', 'mouseover', 'mouseout', 'mousemove',
    'mousedown', 'mouseup', 'globalout', 'contextmenu'
];

/**
 * @private
 */
echartsProto._initEvents = function () {
    each(MOUSE_EVENT_NAMES, function (eveName) {
        this._zr.on(eveName, function (e) {
            var ecModel = this.getModel();
            var el = e.target;
            var params;

            // no e.target when 'globalout'.
            if (eveName === 'globalout') {
                params = {};
            }
            else if (el && el.dataIndex != null) {
                var dataModel = el.dataModel || ecModel.getSeriesByIndex(el.seriesIndex);
                params = dataModel && dataModel.getDataParams(el.dataIndex, el.dataType) || {};
            }
            // If element has custom eventData of components
            else if (el && el.eventData) {
                params = zrUtil.extend({}, el.eventData);
            }

            if (params) {
                params.event = e;
                params.type = eveName;
                this.trigger(eveName, params);
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
    this.setOption({ series: [] }, true);
};

/**
 * Dispose instance
 */
echartsProto.dispose = function () {
    if (this._disposed) {
        if (__DEV__) {
            console.warn('Instance ' + this.id + ' has been disposed');
        }
        return;
    }
    this._disposed = true;

    modelUtil.setAttribute(this.getDom(), DOM_ATTRIBUTE_KEY, '');

    var api = this._api;
    var ecModel = this._model;

    each(this._componentsViews, function (component) {
        component.dispose(ecModel, api);
    });
    each(this._chartsViews, function (chart) {
        chart.dispose(ecModel, api);
    });

    // Dispose after all views disposed
    this._zr.dispose();

    delete instances[this.id];
};

zrUtil.mixin(ECharts, Eventful);

function updateHoverLayerStatus(zr, ecModel) {
    var storage = zr.storage;
    var elCount = 0;
    storage.traverse(function (el) {
        if (!el.isGroup) {
            elCount++;
        }
    });
    if (elCount > ecModel.get('hoverLayerThreshold') && !env.node) {
        storage.traverse(function (el) {
            if (!el.isGroup) {
                el.useHoverLayer = true;
            }
        });
    }
}

/**
 * Update chart progressive and blend.
 * @param {module:echarts/model/Series|module:echarts/model/Component} model
 * @param {module:echarts/view/Component|module:echarts/view/Chart} view
 */
function updateProgressiveAndBlend(seriesModel, chartView) {
    // Progressive configuration
    var elCount = 0;
    chartView.group.traverse(function (el) {
        if (el.type !== 'group' && !el.ignore) {
            elCount++;
        }
    });
    var frameDrawNum = +seriesModel.get('progressive');
    var needProgressive = elCount > seriesModel.get('progressiveThreshold') && frameDrawNum && !env.node;
    if (needProgressive) {
        chartView.group.traverse(function (el) {
            // FIXME marker and other components
            if (!el.isGroup) {
                el.progressive = needProgressive ?
                    Math.floor(elCount++ / frameDrawNum) : -1;
                if (needProgressive) {
                    el.stopAnimation(true);
                }
            }
        });
    }

    // Blend configration
    // ???
    var blendMode = seriesModel.get('blendMode') || null;
    if (__DEV__) {
        if (!env.canvasSupported && blendMode && blendMode !== 'source-over') {
            console.warn('Only canvas support blendMode');
        }
    }
    chartView.group.traverse(function (el) {
        // FIXME marker and other components
        if (!el.isGroup) {
            el.setStyle('blend', blendMode);
        }
    });
}

/**
 * @param {module:echarts/model/Series|module:echarts/model/Component} model
 * @param {module:echarts/view/Component|module:echarts/view/Chart} view
 */
function updateZ(model, view) {
    var z = model.get('z');
    var zlevel = model.get('zlevel');
    // Set z and zlevel
    view.group.traverse(function (el) {
        if (el.type !== 'group') {
            z != null && (el.z = z);
            zlevel != null && (el.zlevel = zlevel);
        }
    });
}

function createExtensionAPI(ecInstance) {
    var coordSysMgr = ecInstance._coordSysMgr;
    return zrUtil.extend(new ExtensionAPI(ecInstance), {
        // Inject methods
        getCoordinateSystems: zrUtil.bind(
            coordSysMgr.getCoordinateSystems, coordSysMgr
        ),
        getComponentByElement: function (el) {
            while (el) {
                var modelInfo = el.__ecComponentInfo;
                if (modelInfo != null) {
                    return ecInstance._model.getComponent(modelInfo.mainType, modelInfo.index);
                }
                el = el.parent;
            }
        }
    });
}

/**
 * @type {Object} key: actionType.
 * @inner
 */
var actions = {};

/**
 * Map eventType to actionType
 * @type {Object}
 */
var eventActionMap = {};

/**
 * Data processor functions of each stage
 * @type {Array.<Object.<string, Function>>}
 * @inner
 */
var dataProcessorFuncs = [];

/**
 * @type {Array.<Function>}
 * @inner
 */
var optionPreprocessorFuncs = [];

/**
 * @type {Array.<Function>}
 * @inner
 */
var postUpdateFuncs = [];

/**
 * Visual encoding functions of each stage
 * @type {Array.<Object.<string, Function>>}
 */
var visualFuncs = [];

/**
 * Theme storage
 * @type {Object.<key, Object>}
 */
var themeStorage = {};
/**
 * Loading effects
 */
var loadingEffects = {};

var instances = {};
var connectedGroups = {};

var idBase = new Date() - 0;
var groupIdBase = new Date() - 0;
var DOM_ATTRIBUTE_KEY = '_echarts_instance_';

var mapDataStores = {};

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
                if (event && event.escapeConnect) {
                    return;
                }

                var action = chart.makeActionFromEvent(event);
                var otherCharts = [];

                zrUtil.each(instances, function (otherChart) {
                    if (otherChart !== chart && otherChart.group === chart.group) {
                        otherCharts.push(otherChart);
                    }
                });

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
 * @param {HTMLElement} dom
 * @param {Object} [theme]
 * @param {Object} opts
 * @param {number} [opts.devicePixelRatio] Use window.devicePixelRatio by default
 * @param {string} [opts.renderer] Currently only 'canvas' is supported.
 * @param {number} [opts.width] Use clientWidth of the input `dom` by default.
 *                              Can be 'auto' (the same as null/undefined)
 * @param {number} [opts.height] Use clientHeight of the input `dom` by default.
 *                               Can be 'auto' (the same as null/undefined)
 */
export function init(dom, theme, opts) {
    if (__DEV__) {
        // Check version
        if ((zrender.version.replace('.', '') - 0) < (dependencies.zrender.replace('.', '') - 0)) {
            throw new Error(
                'zrender/src ' + zrender.version
                + ' is too old for ECharts ' + version
                + '. Current version need ZRender '
                + dependencies.zrender + '+'
            );
        }

        if (!dom) {
            throw new Error('Initialize failed: invalid dom.');
        }
    }

    var existInstance = getInstanceByDom(dom);
    if (existInstance) {
        if (__DEV__) {
            console.warn('There is a chart instance already initialized on the dom.');
        }
        return existInstance;
    }

    if (__DEV__) {
        if (zrUtil.isDom(dom)
            && dom.nodeName.toUpperCase() !== 'CANVAS'
            && (
                (!dom.clientWidth && (!opts || opts.width == null))
                || (!dom.clientHeight && (!opts || opts.height == null))
            )
        ) {
            console.warn('Can\'t get dom width or height');
        }
    }

    var chart = new ECharts(dom, theme, opts);
    chart.id = 'ec_' + idBase++;
    instances[chart.id] = chart;

    modelUtil.setAttribute(dom, DOM_ATTRIBUTE_KEY, chart.id);

    enableConnect(chart);

    return chart;
}

/**
 * @return {string|Array.<module:echarts~ECharts>} groupId
 */
export function connect(groupId) {
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
}

/**
 * @DEPRECATED
 * @return {string} groupId
 */
export function disConnect(groupId) {
    connectedGroups[groupId] = false;
}

/**
 * @return {string} groupId
 */
export var disconnect = disConnect;

/**
 * Dispose a chart instance
 * @param  {module:echarts~ECharts|HTMLDomElement|string} chart
 */
export function dispose(chart) {
    if (typeof chart === 'string') {
        chart = instances[chart];
    }
    else if (!(chart instanceof ECharts)){
        // Try to treat as dom
        chart = getInstanceByDom(chart);
    }
    if ((chart instanceof ECharts) && !chart.isDisposed()) {
        chart.dispose();
    }
}

/**
 * @param  {HTMLElement} dom
 * @return {echarts~ECharts}
 */
export function getInstanceByDom(dom) {
    return instances[modelUtil.getAttribute(dom, DOM_ATTRIBUTE_KEY)];
}

/**
 * @param {string} key
 * @return {echarts~ECharts}
 */
export function getInstanceById(key) {
    return instances[key];
}

/**
 * Register theme
 */
export function registerTheme(name, theme) {
    themeStorage[name] = theme;
}

/**
 * Register option preprocessor
 * @param {Function} preprocessorFunc
 */
export function registerPreprocessor(preprocessorFunc) {
    optionPreprocessorFuncs.push(preprocessorFunc);
}

/**
 * @param {number} [priority=1000]
 * @param {Object|Function} processor
 */
export function registerProcessor(priority, processor) {
    normalizeRegister(dataProcessorFuncs, priority, processor, PRIORITY_PROCESSOR_FILTER);
}

/**
 * Register postUpdater
 * @param {Function} postUpdateFunc
 */
export function registerPostUpdate(postUpdateFunc) {
    postUpdateFuncs.push(postUpdateFunc);
}

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
export function registerAction(actionInfo, eventName, action) {
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

    // Validate action type and event name.
    zrUtil.assert(ACTION_REG.test(actionType) && ACTION_REG.test(eventName));

    if (!actions[actionType]) {
        actions[actionType] = {action: action, actionInfo: actionInfo};
    }
    eventActionMap[eventName] = actionType;
}

/**
 * @param {string} type
 * @param {*} CoordinateSystem
 */
export function registerCoordinateSystem(type, CoordinateSystem) {
    CoordinateSystemManager.register(type, CoordinateSystem);
}

/**
 * Get dimensions of specified coordinate system.
 * @param {string} type
 * @return {Array.<string|Object>}
 */
export function getCoordinateSystemDimensions(type) {
    var coordSysCreator = CoordinateSystemManager.get(type);
    if (coordSysCreator) {
        return coordSysCreator.getDimensionsInfo
                ? coordSysCreator.getDimensionsInfo()
                : coordSysCreator.dimensions.slice();
    }
}

/**
 * Layout is a special stage of visual encoding
 * Most visual encoding like color are common for different chart
 * But each chart has it's own layout algorithm
 *
 * @param {number} [priority=1000]
 * @param {Function} layoutTask
 */
export function registerLayout(priority, layoutTask) {
    var wrap = normalizeRegister(visualFuncs, priority, layoutTask, PRIORITY_VISUAL_LAYOUT);
    wrap.isLayout = true;
}

/**
 * @param {number} [priority=3000]
 * @param {module:echarts/stream/Task} visualTask
 */
export function registerVisual(priority, visualTask) {
    normalizeRegister(visualFuncs, priority, visualTask, PRIORITY_VISUAL_CHART);
}

function normalizeRegister(targetList, priority, fn, defaultPriority) {
    if (zrUtil.isFunction(priority)) {
        fn = priority;
        priority = defaultPriority;
    }

    if (__DEV__) {
        if (isNaN(priority) || priority == null) {
            throw new Error('Illegal priority');
        }
        // Check duplicate
        zrUtil.each(targetList, function (wrap) {
            zrUtil.assert(wrap.func !== fn);
        });
    }

    var wrap = {
        prio: priority,
        func: fn
    };

    targetList.push(wrap);

    return wrap;
}

/**
 * @param {string} name
 */
export function registerLoading(name, loadingFx) {
    loadingEffects[name] = loadingFx;
}

/**
 * @param {Object} opts
 * @param {string} [superClass]
 */
export function extendComponentModel(opts/*, superClass*/) {
    // var Clazz = ComponentModel;
    // if (superClass) {
    //     var classType = parseClassType(superClass);
    //     Clazz = ComponentModel.getClass(classType.main, classType.sub, true);
    // }
    return ComponentModel.extend(opts);
}

/**
 * @param {Object} opts
 * @param {string} [superClass]
 */
export function extendComponentView(opts/*, superClass*/) {
    // var Clazz = ComponentView;
    // if (superClass) {
    //     var classType = parseClassType(superClass);
    //     Clazz = ComponentView.getClass(classType.main, classType.sub, true);
    // }
    return ComponentView.extend(opts);
}

/**
 * @param {Object} opts
 * @param {string} [superClass]
 */
export function extendSeriesModel(opts/*, superClass*/) {
    // var Clazz = SeriesModel;
    // if (superClass) {
    //     superClass = 'series.' + superClass.replace('series.', '');
    //     var classType = parseClassType(superClass);
    //     Clazz = ComponentModel.getClass(classType.main, classType.sub, true);
    // }
    return SeriesModel.extend(opts);
}

/**
 * @param {Object} opts
 * @param {string} [superClass]
 */
export function extendChartView(opts/*, superClass*/) {
    // var Clazz = ChartView;
    // if (superClass) {
    //     superClass = superClass.replace('series.', '');
    //     var classType = parseClassType(superClass);
    //     Clazz = ChartView.getClass(classType.main, true);
    // }
    return ChartView.extend(opts);
}

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
export function setCanvasCreator(creator) {
    zrUtil.$override('createCanvas', creator);
}

/**
 * @param {string} mapName
 * @param {Object|string} geoJson
 * @param {Object} [specialAreas]
 *
 * @example
 *     $.get('USA.json', function (geoJson) {
 *         echarts.registerMap('USA', geoJson);
 *         // Or
 *         echarts.registerMap('USA', {
 *             geoJson: geoJson,
 *             specialAreas: {}
 *         })
 *     });
 */
export function registerMap(mapName, geoJson, specialAreas) {
    if (geoJson.geoJson && !geoJson.features) {
        specialAreas = geoJson.specialAreas;
        geoJson = geoJson.geoJson;
    }
    if (typeof geoJson === 'string') {
        geoJson = (typeof JSON !== 'undefined' && JSON.parse)
            ? JSON.parse(geoJson) : (new Function('return (' + geoJson + ');'))();
    }
    mapDataStores[mapName] = {
        geoJson: geoJson,
        specialAreas: specialAreas
    };
}

/**
 * @param {string} mapName
 * @return {Object}
 */
export function getMap(mapName) {
    return mapDataStores[mapName];
}

registerVisual(PRIORITY_VISUAL_GLOBAL, seriesColor);
registerPreprocessor(backwardCompat);
registerLoading('default', loadingDefault);

// Default actions

registerAction({
    type: 'highlight',
    event: 'highlight',
    update: 'highlight'
}, zrUtil.noop);

registerAction({
    type: 'downplay',
    event: 'downplay',
    update: 'downplay'
}, zrUtil.noop);


// For backward compatibility, where the namespace `dataTool` will
// be mounted on `echarts` is the extension `dataTool` is imported.
export var dataTool = {};
