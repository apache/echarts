// Compatitable with 2.0
define(function (require) {

    var zrUtil = require('zrender/core/util');

    var POSSIBLE_STYLES = [
        'areaStyle', 'lineStyle', 'nodeStyle', 'linkStyle',
        'chordStyle', 'label'
    ];

    var each = zrUtil.each;

    function compatItemStyle(opt) {
        var itemStyleOpt = opt.itemStyle;
        if (itemStyleOpt) {
            each(POSSIBLE_STYLES, function (styleName) {
                var normalItemStyleOpt = itemStyleOpt.normal;
                var emphasisItemStyleOpt = itemStyleOpt.emphasis;
                opt[styleName] = opt[styleName] || {
                };
                if (normalItemStyleOpt && normalItemStyleOpt[styleName]) {
                    if (!opt[styleName].normal) {
                        opt[styleName].normal = normalItemStyleOpt[styleName];
                    }
                    else {
                        zrUtil.merge(opt[styleName].normal, normalItemStyleOpt[styleName]);
                    }
                    normalItemStyleOpt[styleName] = null;
                }
                if (emphasisItemStyleOpt && emphasisItemStyleOpt[styleName]) {
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

    return function (option) {
        zrUtil.each(option.series, function (seriesOpt) {
            compatItemStyle(seriesOpt);
            var data = seriesOpt.data;
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    compatItemStyle(data[i]);
                }
            }
            if (seriesOpt.type === 'map') {
                seriesOpt.map = seriesOpt.mapType || seriesOpt.map;
            }
        });
    }
});