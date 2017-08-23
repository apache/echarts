// Compatitable with 2.0
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var compatStyle = require('./helper/compatStyle');

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

    return function (option, isTheme) {
        compatStyle(option, isTheme);

        var series = option.series;
        each(zrUtil.isArray(series) ? series : [series], function (seriesOpt) {
            if (!zrUtil.isObject(seriesOpt)) {
                return;
            }

            var seriesType = seriesOpt.type;

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
});