/**
 * TODO setTheme
 *      axis position 统一处理
 *      规范 Symbol 配置和绘制, customPath
 *
 *      每次 update 只刷新 model 变化的那些 component（需要做依赖收集）
 */
define(function (require) {

    var GlobalModel = require('./model/Global');
    var ExtensionAPI = require('./ExtensionAPI');
    var CoordinateSystemManager = require('./CoordinateSystem');

    var ComponentModel = require('./model/Component');
    var SeriesModel = require('./model/Series');

    var ComponentView = require('./view/Component');
    var ChartView = require('./view/Chart');

    var scaleClasses = require('./scale/scale');

    var zrender = require('zrender');
    var zrUtil = require('zrender/core/util');

    var each = zrUtil.each;

    var VISUAL_CODING_STAGES = ['echarts', 'chart', 'component'];

    // TODO Transform first or filter first
    var PROCESSOR_STAGES = ['transform', 'filter', 'statistic'];

    /**
     * @module echarts~ECharts
     */
    var ECharts = function (dom, theme, opts) {
        opts = opts || {};

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
            renderer: opts.renderer || 'canvas'
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
        this._chartsList = [];

        /**
         * @type {Object.<string, module:echarts/view/Chart>}
         * @private
         */
        this._chartsMap = {};

        /**
         * @type {Array.<module:echarts/view/Component>}
         * @private
         */
        this._componentsList = [];

        /**
         * @type {Object.<string, module:echarts/view/Component>}
         * @private
         */
        this._componentsMap = {};

        /**
         * @type {module:echarts/ExtensionAPI}
         * @private
         */
        this._extensionAPI = new ExtensionAPI(this);

        /**
         * @type {module:echarts/CoordinateSystem}
         * @private
         */
        this._coordinateSystem = new CoordinateSystemManager();

        /**
         * Layout instances
         * @type {Array}
         * @private
         */
        this._layouts = zrUtil.map(layoutClasses, function (Layout) {
            return new Layout();
        });
    };

    ECharts.prototype = {

        getDom: function () {
            return this._dom;
        },

        getZr: function () {
            return this._zr;
        },

        setOption: function (option, notMerge, refreshImmediately) {
            // PENDING
            option = zrUtil.clone(option, true);

            each(optionPreprocessorFuncs, function (preProcess) {
                preProcess(option);
            })

            var ecModel = this._model;
            if (!ecModel || notMerge) {
                ecModel = new GlobalModel(option, null, this._theme);
                this._model = ecModel;
            }
            else {
                ecModel.restoreData();
                ecModel.mergeOption(option);
            }

            this._prepareComponents(ecModel);

            this._prepareCharts(ecModel);

            this.update();

            refreshImmediately && this._zr.refreshImmediately();
        },

        setTheme: function (theme) {

        },

        /**
         * @return {module:echarts/model/Global}
         */
        getModel: function () {
            return this._model;
        },

        /**
         * @return {number}
         */
        getWidth: function () {
            return this._zr.getWidth();
        },

        /**
         * @return {number}
         */
        getHeight: function () {
            return this._zr.getHeight();
        },

        /**
         * @param {Object} payload
         */
        update: function (payload) {
            console.time('update');

            var ecModel = this._model;

            ecModel.restoreData();

            // TODO
            // Save total ecModel here for undo/redo (after restoring data and before processing data).
            // Undo (restoration of total ecModel) can be carried out in 'action' or outside API call.

            this._processData(ecModel);

            this._stackSeriesData(ecModel);

            this._coordinateSystem.update(ecModel, this._extensionAPI);

            this._doLayout(ecModel, payload);

            this._doVisualCoding(ecModel, payload);

            this._doRender(ecModel, payload);

            // Set background
            this._dom.style.backgroundColor = ecModel.get('backgroundColor');

            console.timeEnd('update');
        },

        // PENDING
        /**
         * @param {Object} payload
         */
        updateView: function (payload) {
            var ecModel = this._model;

            this._doLayout(ecModel, payload);

            this._doVisualCoding(ecModel, payload);

            this._invokeUpdateMethod('updateView', ecModel, payload);
        },

        /**
         * @param {Object} payload
         */
        updateVisual: function (payload) {
            var ecModel = this._model;

            this._doVisualCoding(ecModel, payload);

            this._invokeUpdateMethod('updateVisual', ecModel, payload);
        },

        /**
         * @param {Object} payload
         */
        updateLayout: function (payload) {
            var ecModel = this._model;

            this._doLayout(ecModel, payload);

            this._invokeUpdateMethod('updateLayout', ecModel, payload);
        },

        resize: function () {
            // var ecModel = this._model;

            // this._coordinateSystem.resize(ecModel, this._extensionAPI);

            // this._doVisualCoding(ecModel);

            // this._doLayout(ecModel);

            // this._doRender(ecModel);

            this.update();
        },

        /**
         * @pubilc
         * @param {Object} payload
         * @param {string} [payload.type] Action type
         * @param {number} [payload.from] From uid
         */
        dispatch: function (payload) {
            var actionWrap = actions[payload.type];
            if (actionWrap) {
                actionWrap.action(payload, this._model);
                this[actionWrap.actionInfo.update || 'update'](payload);
            }
        },

        /**
         * @param {string} methodName
         * @private
         */
        _invokeUpdateMethod: function (methodName, ecModel, payload) {
            var api = this._extensionAPI;

            // Update all components
            each(this._componentsList, function (component) {
                var componentModel = component.__model;
                component[methodName](componentModel, ecModel, api, payload);
            }, this);

            // Upate all charts
            ecModel.eachSeries(function (seriesModel, idx) {
                var id = seriesModel.uid;
                var chart = this._chartsMap[id];
                chart[methodName](seriesModel, ecModel, api, payload);
            }, this);

        },

        _prepareCharts: function (ecModel) {

            var chartsList = this._chartsList;
            var chartsMap = this._chartsMap;
            var zr = this._zr;

            for (var i = 0; i < chartsList.length; i++) {
                chartsList[i].__keepAlive = false;
            }

            ecModel.eachSeries(function (seriesModel, idx) {
                var id = seriesModel.uid;

                var chart = chartsMap[id];
                if (!chart) {
                    var Clazz = ChartView.getClass(
                        ComponentModel.parseComponentType(seriesModel.type).sub
                    );
                    if (Clazz) {
                        chart = new Clazz();
                        chart.init(ecModel, this._extensionAPI);
                        chartsMap[id] = chart;
                        chartsList.push(chart);
                        zr.add(chart.group);
                    }
                    else {
                        // Error
                    }
                }

                chart.__keepAlive = true;
                chart.__id = id;
            }, this);

            for (var i = 0; i < chartsList.length;) {
                var chart = chartsList[i];
                if (!chart.__keepAlive) {
                    zr.remove(chart.group);
                    chart.dispose(this._extensionAPI);
                    chartsList.splice(i, 1);
                    delete chartsMap[chart.__id];
                }
                else {
                    i++;
                }
            }
        },

        _prepareComponents: function (ecModel) {

            var componentsMap = this._componentsMap;
            var componentsList = this._componentsList;

            for (var i = 0; i < componentsList.length; i++) {
                componentsList[i].__keepAlive = true;
            }

            ecModel.eachComponent(function (componentType, componentModel) {
                if (componentType === 'series') {
                    return;
                }

                var id = componentModel.uid;
                var component = componentsMap[id];
                if (!component) {
                    // Create and add component
                    var Clazz = ComponentView.getClass(
                        componentType, componentModel.option.type
                    );

                    if (Clazz) {
                        component = new Clazz();
                        component.init(ecModel, this._extensionAPI);
                        componentsMap[id] = component;
                        componentsList.push(component);

                        this._zr.add(component.group);
                    }
                }
                component.__id = id;
                component.__keepAlive = true;
                // Used in rendering
                component.__model = componentModel;
            }, this);

            for (var i = 0; i < componentsList.length;) {
                var component = componentsList[i];
                if (!component.__keepAlive) {
                    this._zr.remove(component.group);
                    component.dispose(this._extensionAPI);
                    componentsList.splice(i, 1);
                    delete componentsMap[component.__id];
                }
                else {
                    i++;
                }
            }
        },

        /**
         * Processor data in each series
         *
         * @param {module:echarts/model/Global} ecModel
         * @private
         */
        _processData: function (ecModel) {
            each(PROCESSOR_STAGES, function (stage) {
                each(dataProcessorFuncs[stage] || [], function (process) {
                    process(ecModel);
                });
            });
        },

        /**
         * @private
         */
        _stackSeriesData: function (ecModel) {
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
        },

        /**
         * Layout before each chart render there series after visual coding and data processing
         *
         * @param {module:echarts/model/Global} ecModel
         * @private
         */
        _doLayout: function (ecModel, payload) {
            var api = this._extensionAPI;
            each(this._layouts, function (layout) {
                layout.update(ecModel, api, payload);
            });
            each(layoutFuncs, function (layout) {
                layout(ecModel, api, payload);
            });
        },

        /**
         * Code visual infomation from data after data processing
         *
         * @param {module:echarts/model/Global} ecModel
         * @private
         */
        _doVisualCoding: function (ecModel, payload) {
            each(VISUAL_CODING_STAGES, function (stage) {
                each(visualCodingFuncs[stage] || [], function (visualCoding) {
                    visualCoding(ecModel, payload);
                });
            });
        },

        /**
         * Render each chart and component
         * @private
         */
        _doRender: function (ecModel, payload) {
            var api = this._extensionAPI;
            // Render all components
            each(this._componentsList, function (component) {
                var componentModel = component.__model;
                component.render(componentModel, ecModel, api, payload);

                var z = componentModel.get('z');
                var zlevel = componentModel.get('zlevel');
                // Set z and zlevel
                component.group.traverse(function (el) {
                    z != null && (el.z = z);
                    zlevel != null && (el.zlevel = zlevel);
                });
            }, this);

            each(this._chartsList, function (chart) {
                chart.__keepAlive = false;
            }, this);

            // Render all charts
            ecModel.eachSeries(function (seriesModel, idx) {
                var id = seriesModel.uid;
                var chart = this._chartsMap[id];
                chart.__keepAlive = true;
                chart.render(seriesModel, ecModel, api, payload);

                var z = seriesModel.get('z');
                var zlevel = seriesModel.get('zlevel');
                // Set z and zlevel
                chart.group.traverse(function (el) {
                    z != null && (el.z = z);
                    zlevel != null && (el.zlevel = zlevel);
                });
            }, this);

            // Remove groups of charts
            each(this._chartsList, function (chart) {
                if (!chart.__keepAlive) {
                    chart.remove(ecModel, api);
                }
            }, this);
        },

        dispose: function () {
            each(this._components, function (component) {
                component.dispose();
            });
            each(this._charts, function (chart) {
                chart.dispose();
            });

            this.zr.dispose();
        }
    };


    /**
     * @type {Array.<Function>}
     * @inner
     */
    var actions = [];

    /**
     * @type {Array.<Function>}
     * @inner
     */
    var layoutClasses = [];

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
     * @module echarts
     */
    var echarts = {

        /**
         * @param {HTMLDomElement} dom
         * @param {Object} [theme]
         * @param {Object} opts
         */
        init: function (dom, theme, opts) {
            return new ECharts(dom, theme, opts);
        },

        /**
         * Register option preprocessor
         * @param {Function} preprocessorFunc
         */
        registerPreprocessor: function (preprocessorFunc) {
            optionPreprocessorFuncs.push(preprocessorFunc);
        },

        /**
         * @param {string} stage
         * @param {Function} processorFunc
         */
        registerProcessor: function (stage, processorFunc) {
            if (zrUtil.indexOf(PROCESSOR_STAGES, stage) < 0) {
                throw new Error('stage should be one of ' + PROCESSOR_STAGES);
            }
            var funcs = dataProcessorFuncs[stage] || (dataProcessorFuncs[stage] = []);
            funcs.push(processorFunc);
        },

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
         * @param {string=} actionInfo.event
         * @param {string=} actionInfo.update
         * @param {Function=} action
         */
        registerAction: function (actionInfo, action) {
            var actionType = zrUtil.isObject(actionInfo)
                ? actionInfo.type
                : ([actionInfo, actionInfo = {}][0]);

            if (!actions[actionType]) {
                actions[actionType] = {action: action, actionInfo: actionInfo};
            }

            // TODO
            // event
        },

        /**
         * @param {string} type
         * @param {*} CoordinateSystem
         */
        registerCoordinateSystem: function (type, CoordinateSystem) {
            CoordinateSystemManager.register(type, CoordinateSystem);
        },

        /**
         * @param {*} layout
         */
        registerLayout: function (layout, isFactory) {
            // PENDING All functions ?
            if (isFactory) {
                if (zrUtil.indexOf(layoutClasses, layout) < 0) {
                    layoutClasses.push(layout);
                }
            }
            else {
                if (zrUtil.indexOf(layoutFuncs, layout) < 0) {
                    layoutFuncs.push(layout);
                }
            }
        },

        /**
         * @param {string} stage
         * @param {Function} visualCodingFunc
         */
        registerVisualCoding: function (stage, visualCodingFunc) {
            if (zrUtil.indexOf(VISUAL_CODING_STAGES, stage) < 0) {
                throw new Error('stage should be one of ' + VISUAL_CODING_STAGES);
            }
            var funcs = visualCodingFuncs[stage] || (visualCodingFuncs[stage] = []);
            funcs.push(visualCodingFunc);
        },

        /**
         * @param
         */
        registerScale: function (scale) {
            scaleClasses.register(scale);
        },

        /**
         * @param {Object} opts
         */
        extendChartView: function (opts) {
            return ChartView.extend(opts);
        },

        /**
         * @param {Object} opts
         */
        extendComponentModel: function (opts) {
            return ComponentModel.extend(opts);
        },

        /**
         * @param {Object} opts
         */
        extendSeriesModel: function (opts) {
            return SeriesModel.extend(opts);
        },

        /**
         * @param {Object} opts
         */
        extendComponentView: function (opts) {
            return ComponentView.extend(opts);
        }
    };

    echarts.registerVisualCoding('echarts', require('./visual/defaultColor'));

    echarts.registerPreprocessor(require('./preprocessor/backwardCompat'));

    return echarts;
});