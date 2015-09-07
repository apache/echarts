/**
 * TODO processor的优先级
 *      setTheme
 *      stack
 *      axis position 统一处理
 */
define(function (require) {

    var GlobalModel = require('./model/Global');
    var ExtensionAPI = require('./ExtensionAPI');
    var CoordinateSystemManager = require('./CoordinateSystem');

    var ComponentModel = require('./model/Component');
    var SeriesModel = require('./model/Series');

    var ComponentView = require('./view/Component');
    var ChartView = require('./view/Chart');

    var zrender = require('zrender');
    var zrUtil = require('zrender/core/util');

    /**
     * @inner
     */
    function getSeriesId(series, seriesIndex) {
        return series.type + '_' + (series.name ||  seriesIndex);
    }
    /**
     * @module echarts~ECharts
     */
    var ECharts = function (dom, theme, opts) {
        opts = opts || {};

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

        /**
         * @type {boolean}
         * @private
         */
        this._needsUpdate = false;

        this._zr.animation.on('frame', function () {
            if (this._needsUpdate) {
                this.updateImmediately();
            }
        }, this);
    };

    ECharts.prototype = {

        getZr: function () {
            return this._zr;
        },

        setOption: function (option, notMerge) {
            option = zrUtil.clone(option, true);

            var ecModel = this._model;
            if (! ecModel || notMerge) {
                ecModel = new GlobalModel(option, null, this._theme);
                this._model = ecModel;
            }
            else {
                ecModel.mergeOption(option);
            }

            this._prepareComponents(ecModel);

            this._prepareCharts(ecModel);

            this.updateImmediately();
        },

        setTheme: function (theme) {

        },

        getCoordinateSystem: function (type, idx) {
            return this._coordinateSystem.get(type, idx);
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

        update: function () {
            this._needsUpdate = true;
        },

        updateImmediately: function () {
            // console.time('update');

            var ecModel = this._model;

            ecModel.restoreData();

            this._processData(ecModel);

            this._coordinateSystem.update(ecModel, this._extensionAPI);

            this._doVisualCoding(ecModel);

            this._doLayout(ecModel);

            this._doRender(ecModel);

            this._needsUpdate = false;

            // console.timeEnd('update');
        },

        resize: function () {
            // var ecModel = this._model;

            // this._coordinateSystem.resize(ecModel, this._extensionAPI);

            // this._doVisualCoding(ecModel);

            // this._doLayout(ecModel);

            // this._doRender(ecModel);

            this.updateImmediately();
        },

        _prepareCharts: function (ecModel) {

            var chartsList = this._chartsList;
            var chartsMap = this._chartsMap;
            var zr = this._zr;

            for (var i = 0; i < chartsList.length; i++) {
                chartsList[i].__keepAlive = false;
            }

            ecModel.eachSeries(function (seriesModel, idx) {
                var id = getSeriesId(seriesModel.option, idx);

                var chart = chartsMap[id];
                if (! chart) {
                    chart = ChartView.create(
                        ComponentModel.parseComponentType(seriesModel.type).sub
                    );
                    if (chart) {
                        chart.init(this._extensionAPI);
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
                if (! chart.__keepAlive) {
                    zr.remove(chart.group);
                    chart.dispose();
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

            ComponentView.eachAvailableComponent(function (componentType) {

                ecModel.eachComponent(componentType, function (componentModel, idx) {
                    var id = componentType + '_' + idx;
                    var component = componentsMap[id];
                    if (! component) {
                        // Create and add component
                        component = ComponentView.create(componentType, componentModel);
                        component.init(this._extensionAPI);
                        componentsMap[id] = component;
                        componentsList.push(component);

                        this._zr.add(component.group);
                    }
                    component.__id = id;
                    component.__keepAlive = true;
                    // Used in rendering
                    component.__model = componentModel;
                }, this);
            }, this);

            for (var i = 0; i < componentsList.length;) {
                var component = componentsList[i];
                if (! component.__keepAlive) {
                    this._zr.remove(component.group);
                    component.dispose();
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
            zrUtil.each(dataProcessorFuncs, function (processor) {
                processor(ecModel);
            });
        },

        /**
         * Layout before each chart render there series after visual coding and data processing
         *
         * @param {module:echarts/model/Global} ecModel
         * @private
         */
        _doLayout: function (ecModel) {
            zrUtil.each(this._layouts, function (layout) {
                layout.update(ecModel);
            });
            zrUtil.each(layoutFuncs, function (layout) {
                layout(ecModel);
            });
        },

        /**
         * Code visual infomation from data after data processing
         *
         * @param {module:echarts/model/Global} ecModel
         * @private
         */
        _doVisualCoding: function (ecModel) {
            zrUtil.each(visualCodingFuncs, function (visualCoding) {
                visualCoding(ecModel);
            });
        },

        /**
         * Render each chart and component
         */
        _doRender: function (ecModel) {
            var api = this._extensionAPI;
            // Render all components
            zrUtil.each(this._componentsList, function (component) {
                component.render(component.__model, ecModel, api);
            }, this);
            // Remove groups of charts
            zrUtil.each(this._chartsList, function (chart) {
                chart.__keepAlive = false;
            }, this);
            // Render all charts
            ecModel.eachSeries(function (seriesModel, idx) {
                var id = getSeriesId(seriesModel.option, idx);
                var chart = this._chartsMap[id];
                chart.__keepAlive = true;
                chart.render(seriesModel, ecModel, api);
            }, this);
            // Remove groups of charts
            zrUtil.each(this._chartsList, function (chart) {
                if (!chart.__keepAlive) {
                    chart.remove();
                }
            }, this);
        },

        dispose: function () {
            zrUtil.each(this._components, function (component) {
                component.dispose();
            });
            zrUtil.each(this._charts, function (chart) {
                chart.dispose();
            });

            this.zr.dispose();
        }
    };


    var dataProcessorFuncs = [];

    var layoutClasses = [];

    var layoutFuncs = [];

    var visualCodingFuncs = [];

    /**
     * @module echarts
     */
    var echarts = {

        init: function (dom, theme, opts) {
            return new ECharts(dom, theme, opts);
        },

        /**
         * @param {Function}
         */
        registerProcessor: function (processorFunc) {
            if (zrUtil.indexOf(dataProcessorFuncs, processorFunc) < 0) {
                dataProcessorFuncs.push(processorFunc);
            }
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

        registerVisualCoding: function (visualCodingFunc) {
            visualCodingFuncs.push(visualCodingFunc);
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
        extendComponentView: function (opts) {
            return ComponentView.extend(opts);
        }
    };

    echarts.registerVisualCoding(require('./visual/defaultColor'));

    return echarts;
});