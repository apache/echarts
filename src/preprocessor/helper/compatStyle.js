import * as zrUtil from 'zrender/src/core/util';
import * as modelUtil from '../../util/model';

var each = zrUtil.each;
var isObject = zrUtil.isObject;

var POSSIBLE_STYLES = [
    'areaStyle', 'lineStyle', 'nodeStyle', 'linkStyle',
    'chordStyle', 'label', 'labelLine'
];

function compatEC2ItemStyle(opt) {
    var itemStyleOpt = opt && opt.itemStyle;
    if (!itemStyleOpt) {
        return;
    }
    for (var i = 0, len = POSSIBLE_STYLES.length; i < len; i++) {
        var styleName = POSSIBLE_STYLES[i];
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
    }
}

function convertNormalEmphasis(opt, optType, useExtend) {
    if (opt && opt[optType] && (opt[optType].normal || opt[optType].emphasis)) {
        var normalOpt = opt[optType].normal;
        var emphasisOpt = opt[optType].emphasis;

        if (normalOpt) {
            // Timeline controlStyle has other properties besides normal and emphasis
            if (useExtend) {
                opt[optType].normal = opt[optType].emphasis = null;
                zrUtil.defaults(opt[optType], normalOpt);
            }
            else {
                opt[optType] = normalOpt;
            }
        }
        if (emphasisOpt) {
            opt.emphasis = opt.emphasis || {};
            opt.emphasis[optType] = emphasisOpt;
        }
    }
}
function removeEC3NormalStatus(opt) {
    convertNormalEmphasis(opt, 'itemStyle');
    convertNormalEmphasis(opt, 'lineStyle');
    convertNormalEmphasis(opt, 'areaStyle');
    convertNormalEmphasis(opt, 'label');
    convertNormalEmphasis(opt, 'labelLine');
    // treemap
    convertNormalEmphasis(opt, 'upperLabel');
    // graph
    convertNormalEmphasis(opt, 'edgeLabel');
}

function compatTextStyle(labelOpt) {
    var textStyle = isObject(labelOpt) && labelOpt.textStyle;
    if (textStyle) {
        for (var i = 0, len = modelUtil.TEXT_STYLE_OPTIONS.length; i < len; i++) {
            var propName = modelUtil.TEXT_STYLE_OPTIONS[i];
            if (textStyle.hasOwnProperty(propName)) {
                labelOpt[propName] = textStyle[propName];
            }
        }
    }
}

function compatEC3CommonStyles(opt) {
    if (opt) {
        removeEC3NormalStatus(opt);
        compatTextStyle(opt.label);
        opt.emphasis && compatTextStyle(opt.emphasis.label);
    }
}

function processSeries(seriesOpt) {
    if (!isObject(seriesOpt)) {
        return;
    }

    compatEC2ItemStyle(seriesOpt);
    removeEC3NormalStatus(seriesOpt);

    compatTextStyle(seriesOpt.label);
    // treemap
    compatTextStyle(seriesOpt.upperLabel);
    // graph
    compatTextStyle(seriesOpt.edgeLabel);
    if (seriesOpt.emphasis) {
        compatTextStyle(seriesOpt.emphasis.label);
        // treemap
        compatTextStyle(seriesOpt.emphasis.upperLabel);
        // graph
        compatTextStyle(seriesOpt.emphasis.edgeLabel);
    }

    var markPoint = seriesOpt.markPoint;
    if (markPoint) {
        compatEC2ItemStyle(markPoint);
        compatEC3CommonStyles(markPoint);
    }

    var markLine = seriesOpt.markLine;
    if (markLine) {
        compatEC2ItemStyle(markLine);
        compatEC3CommonStyles(markLine);
    }

    var markArea = seriesOpt.markArea;
    if (markArea) {
        compatEC3CommonStyles(markArea);
    }

    var data = seriesOpt.data;

    // Break with ec3: if `setOption` again, there may be no `type` in option,
    // then the backward compat based on option type will not be performed.

    if (seriesOpt.type === 'graph') {
        data = data || seriesOpt.nodes;
        var edgeData = seriesOpt.links || seriesOpt.edges;
        if (edgeData && !zrUtil.isTypedArray(edgeData)) {
            for (var i = 0; i < edgeData.length; i++) {
                compatEC3CommonStyles(edgeData[i]);
            }
        }
        zrUtil.each(seriesOpt.categories, function (opt) {
            removeEC3NormalStatus(opt);
        });
    }

    if (data && !zrUtil.isTypedArray(data)) {
        for (var i = 0; i < data.length; i++) {
            compatEC3CommonStyles(data[i]);
        }
    }

    // mark point data
    var markPoint = seriesOpt.markPoint;
    if (markPoint && markPoint.data) {
        var mpData = markPoint.data;
        for (var i = 0; i < mpData.length; i++) {
            compatEC3CommonStyles(mpData[i]);
        }
    }
    // mark line data
    var markLine = seriesOpt.markLine;
    if (markLine && markLine.data) {
        var mlData = markLine.data;
        for (var i = 0; i < mlData.length; i++) {
            if (zrUtil.isArray(mlData[i])) {
                compatEC3CommonStyles(mlData[i][0]);
                compatEC3CommonStyles(mlData[i][1]);
            }
            else {
                compatEC3CommonStyles(mlData[i]);
            }
        }
    }

    // Series
    if (seriesOpt.type === 'gauge') {
        compatTextStyle(seriesOpt, 'axisLabel');
        compatTextStyle(seriesOpt, 'title');
        compatTextStyle(seriesOpt, 'detail');
    }
    else if (seriesOpt.type === 'treemap') {
        convertNormalEmphasis(seriesOpt.breadcrumb, 'itemStyle');
        zrUtil.each(seriesOpt.levels, function (opt) {
            removeEC3NormalStatus(opt);
        });
    }
    // sunburst starts from ec4, so it does not need to compat levels.
}

function toArr(o) {
    return zrUtil.isArray(o) ? o : o ? [o] : [];
}

function toObj(o) {
    return (zrUtil.isArray(o) ? o[0] : o) || {};
}

export default function (option, isTheme) {
    each(toArr(option.series), function (seriesOpt) {
        isObject(seriesOpt) && processSeries(seriesOpt);
    });

    var axes = ['xAxis', 'yAxis', 'radiusAxis', 'angleAxis', 'singleAxis', 'parallelAxis', 'radar'];
    isTheme && axes.push('valueAxis', 'categoryAxis', 'logAxis', 'timeAxis');

    each(
        axes,
        function (axisName) {
            each(toArr(option[axisName]), function (axisOpt) {
                if (axisOpt) {
                    compatTextStyle(axisOpt, 'axisLabel');
                    compatTextStyle(axisOpt.axisPointer, 'label');
                }
            });
        }
    );

    each(toArr(option.parallel), function (parallelOpt) {
        var parallelAxisDefault = parallelOpt && parallelOpt.parallelAxisDefault;
        compatTextStyle(parallelAxisDefault, 'axisLabel');
        compatTextStyle(parallelAxisDefault && parallelAxisDefault.axisPointer, 'label');
    });

    each(toArr(option.calendar), function (calendarOpt) {
        convertNormalEmphasis(calendarOpt, 'itemStyle');
        compatTextStyle(calendarOpt, 'dayLabel');
        compatTextStyle(calendarOpt, 'monthLabel');
        compatTextStyle(calendarOpt, 'yearLabel');
    });

    // radar.name.textStyle
    each(toArr(option.radar), function (radarOpt) {
        compatTextStyle(radarOpt, 'name');
    });

    each(toArr(option.geo), function (geoOpt) {
        if (isObject(geoOpt)) {
            compatEC3CommonStyles(geoOpt);
            each(toArr(geoOpt.regions), function (regionObj) {
                compatEC3CommonStyles(regionObj);
            });
        }
    });

    each(toArr(option.timeline), function (timelineOpt) {
        compatEC3CommonStyles(timelineOpt);
        convertNormalEmphasis(timelineOpt, 'label');
        convertNormalEmphasis(timelineOpt, 'itemStyle');
        convertNormalEmphasis(timelineOpt, 'controlStyle', true);
        convertNormalEmphasis(timelineOpt, 'checkpointStyle');

        var data = timelineOpt.data;
        zrUtil.isArray(data) && zrUtil.each(data, function (item) {
            if (zrUtil.isObject(item)) {
                convertNormalEmphasis(item, 'label');
                convertNormalEmphasis(item, 'itemStyle');
            }
        });
    });

    each(toArr(option.toolbox), function (toolboxOpt) {
        convertNormalEmphasis(toolboxOpt, 'iconStyle');
        each(toolboxOpt.feature, function (featureOpt) {
            convertNormalEmphasis(featureOpt, 'iconStyle');
        });
    });

    compatTextStyle(toObj(option.axisPointer), 'label');
    compatTextStyle(toObj(option.tooltip).axisPointer, 'label');
}