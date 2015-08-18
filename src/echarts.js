define(function (require) {

    var GlobalModel = require('./model/Global');
    var zrUtil = require('zrender/core/util');
    var Chart = require('./chart/ChartView');
    var Component = require('./component/ComponentView');
    var ExtensionAPI = require('./api/ExtensionAPI');
    var CoordinateSystemManager = require('./CoordinateSystem');

    var zrender = require('zrender');

    /**
     * @module echarts~ECharts
     */
    var ECharts = function (dom, theme) {

        this._zr = zrender.init(dom);

        this._theme = theme;

        this._chartsList = [];
        this._chartsMap = {};

        this._componentsList = [];
        this._componentsMap = {};

        this._extensionAPI = new ExtensionAPI(this);

        this._coordinateSystem = new CoordinateSystemManager();

        this._layouts = zrUtil.map(layoutClasses, function (Layout) {
            return new Layout();
        });
    };

    ECharts.prototype = {

        getZr: function () {
            return this._zr;
        },

        setOption: function (option, merge) {
            option = zrUtil.clone(option, true);

            var ecModel = new GlobalModel(option, null, this._theme);

            this._model = ecModel;

            this._prepareComponents(ecModel);

            this._prepareCharts(ecModel);

            this.updateImmediately();
        },

        getCoordinateSystem: function (type, idx) {
            return this._coordinateSystem.get(type, idx);
        },

        getWidth: function () {
            return this._zr.getWidth();
        },

        getHeight: function () {
            return this._zr.getHeight();
        },

        update: function () {
        },

        updateImmediately: function () {
            var ecModel = this._model;

            ecModel.restore();

            this._processData(ecModel);

            this._coordinateSystem.update(ecModel, this._extensionAPI);

            this._doLayout(ecModel);

            this._doRender(ecModel);
        },

        resize: function () {
            var ecModel = this._model;

            this._coordinateSystem.resize(ecModel, this._extensionAPI);

            this._doLayout(ecModel);

            this._doRender(ecModel);
        },

        _doLayout: function (model) {
            zrUtil.each(this._layouts, function (layout) {
                layout.run(model);
            });
        },

        _prepareCharts: function (ecModel) {
            var chartUsedMap = {};
            zrUtil.each(ecModel.get('series'), function (series, idx) {
                var id = series.type + '_' + (series.name || idx);
                chartUsedMap[id] = true;

                var chart = this._chartsMap[id];
                if (! chart) {
                    chart = Chart.create(series);
                    if (chart) {
                        chart.init(this._extensionAPI);
                        this._chartsMap[id] = chart;
                        this._chartsList.push(chart);
                    }
                    else {
                        // Error
                    }
                }

                chart.__id__ = id;
            }, this);

            for (var i = 0; i < this._chartsList.length;) {
                var chart = this._chartsList[i];
                if (! chartUsedMap[chart.__id__]) {
                    chart.dispose();
                    this._chartsList.splice(i, 1);
                    delete this._chartsMap[chart.__id__];
                }
                else {
                    i++;
                }
            };
        },

        _prepareComponents: function (ecModel) {
            Component.eachAvailableComponent(function (componentType) {
                var componentsMap = this._componentsMap;
                var componentsList = this._componentsList;

                var componentOption = ecModel.get(componentType);
                var component = componentsMap[componentType];
                if (componentOption) {
                    if (! component) {
                        // Create and add component
                        component = Component.create(componentType, componentOption);
                        component.init(this._extensionAPI);
                        componentsMap[componentType] = component;
                        componentsList.push(component);
                    }
                }
                else {
                    if (component) {
                        // Remove and dispose component
                        component.dispose();
                        delete componentsMap[componentType];
                        componentsList.splice(zrUtil.indexOf(componentsList, component));
                    }
                }
            }, this);
        },

        _processData: function (ecModel) {
            zrUtil.each(processorList, function (processor) {
                processor(ecModel);
            });
        },

        _doRender: function (optionModel, stateModel) {
            var api = this._extensionAPI;
            // Render all components
            zrUtil.each(this._components, function (component) {
                component.render(optionModel, stateModel, api);
            }, this);
            // Render all charts
            optionModel.eachSeries(function (seriesModel, idx) {
                var id = seriesModel.get('type') + '_' + (seriesModel.get('name') || idx);
                var chart = this._chartsMap[id];
                var group = chart.render(seriesModel, optionModel, api);
                this.zr.addElement(group);
            }, this);
            // TODO
            // Remove group of unused chart
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


    var processorList = [];

    var layoutClasses = [];

    /**
     * @module echarts
     */
    var echarts = {

        init: function (dom, theme) {
            return new ECharts(dom, theme);
        },

        registerProcessor: function (processor) {
            if (zrUtil.indexOf(processorList, processor) < 0) {
                processorList.push(processor);
            }
        },

        registerCoordinateSystem: function (type, CoordinateSystem) {
            CoordinateSystemManager.register(type, CoordinateSystem);
        },

        registerLayout: function (layout) {
            if (zrUtil.indexOf(layoutClasses, layout) < 0) {
                layoutClasses.push(layout);
            }
        },

        registerVisualCoding: function () {

        }
    };

    return echarts;
});