define(function (require) {

    var config = require('./config');
    var OptionModel = require('./model/Option');
    var Model = require('./model/Model');
    var zrUtil = require('zrender/core/util');
    var Chart = require('./chart/Chart');
    var Component = require('./component/Component');

    var zrender = require('zrender');

    var startupProcessorClasses = [];

    /**
     * @module echarts~ECharts
     */
    var ECharts = function (dom, theme) {

        this.zr = zrender.init(dom);

        theme = zrUtil.clone(theme || {});
        zrUtil.merge(theme, config);

        this._theme = theme;

        this._chartsList = [];
        this._chartsMap = {};

        this._componentsList = [];
        this._componentsMap = {};

        this._originalOption = null;
    };

    ECharts.prototype = {

        setOption: function (rawOption, merge) {
            rawOption = zrUtil.clone(rawOption);
            zrUtil.merge(rawOption, this._theme);

            var option = new OptionModel(rawOption);

            // Add series index
            option.eachSeries(function (series, seriesIndex) {
                series.seriesIndex = seriesIndex;
            });

            // Pending
            // optionModel as parent ?
            var globalState = new Model({}, option);

            // Create processors
            this._processors = zrUtil.map(startupProcessorClasses, function (Processor) {
                var processor = new Processor();
                processor.init(option, globalState);
            });

            this._originalOption = option;

            this.updateImmediate();
        },

        addProcessor: function (processor, oneForEachType) {
            var processors = this._processors;
            if (zrUtil.indexOf(processors, processor) >= 0) {
                return;
            };
            if (oneForEachType) {
                if (zrUtil.filter(processors, function (exist) {
                    return exist.type === processor.type;
                }).length) {
                    return;
                }
            }

            processors.push(processor);
        },

        update: function () {

        },

        updateImmediate: function () {
            // TODO Performance
            var option = this._originalOption.clone();

            this._processOption(option);

            this._prepareComponents(option);

            this._prepareCharts(option);

            this._dispatchOption(option);
        },

        _prepareCharts: function (option) {
            var chartUsedMap = {};
            zrUtil.each(option.get('series'), function (series, idx) {
                var id = series.type + '_' + (series.name || idx);
                chartUsedMap[id] = true;

                var chart = this._chartsMap[id];
                if (! chart) {
                    chart = Chart.create(series);
                    if (chart) {
                        chart.init();
                        this._chartsMap[series.type] = chart;
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

        _prepareComponents: function (option) {
            Component.eachAvailableComponent(function (componentType) {
                var componentsMap = this._componentsMap;
                var componentsList = this._componentsList;

                var componentOption = option.get(componentType);
                var component = componentsMap[componentType];
                if (componentOption) {
                    if (! component) {
                        // Create and add component
                        component = Component.create(componentType, componentOption);
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

        _processOption: function (option) {
            zrUtil.each(this._processors, function (processor) {
               processor.process(option);
            });
        },

        _dispatchOption: function (option) {
            // Render all components
            zrUtil.each(this._components, function (component) {
                component.render(option);
            });
            // Render all charts
            zrUtil.each(this._charts, function (chart) {
                chart.render(option);
            });
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


    /**
     * @module echarts
     */
    var echarts = {

        init: function (dom, theme) {
            return new ECharts(dom, theme);
        },

        registerStartupProcessor: function (processorFactory) {}
    };


    echarts.registerProcessor(require('./processor/SeriesFilter'));

    return echarts;
});