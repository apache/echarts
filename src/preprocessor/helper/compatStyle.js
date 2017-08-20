define(function (require) {

    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');

    var each = zrUtil.each;
    var isObject = zrUtil.isObject;

    var POSSIBLE_STYLES = [
        'areaStyle', 'lineStyle', 'nodeStyle', 'linkStyle',
        'chordStyle', 'label', 'labelLine'
    ];

    function compatItemStyle(opt) {
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

    function compatTextStyle(opt, propName) {
        var labelOptSingle = isObject(opt) && opt[propName];
        var textStyle = isObject(labelOptSingle) && labelOptSingle.textStyle;
        if (textStyle) {
            for (var i = 0, len = modelUtil.TEXT_STYLE_OPTIONS.length; i < len; i++) {
                var propName = modelUtil.TEXT_STYLE_OPTIONS[i];
                if (textStyle.hasOwnProperty(propName)) {
                    labelOptSingle[propName] = textStyle[propName];
                }
            }
        }
    }

    function compatLabelTextStyle(labelOpt) {
        if (isObject(labelOpt)) {
            compatTextStyle(labelOpt, 'normal');
            compatTextStyle(labelOpt, 'emphasis');
        }
    }

    function processSeries(seriesOpt) {
        if (!isObject(seriesOpt)) {
            return;
        }

        compatItemStyle(seriesOpt);
        compatLabelTextStyle(seriesOpt.label);
        // treemap
        compatLabelTextStyle(seriesOpt.upperLabel);
        // graph
        compatLabelTextStyle(seriesOpt.edgeLabel);

        var markPoint = seriesOpt.markPoint;
        compatItemStyle(markPoint);
        compatLabelTextStyle(markPoint && markPoint.label);

        var markLine = seriesOpt.markLine;
        compatItemStyle(seriesOpt.markLine);
        compatLabelTextStyle(markLine && markLine.label);

        var markArea = seriesOpt.markArea;
        compatLabelTextStyle(markArea && markArea.label);

        // For gauge
        compatTextStyle(seriesOpt, 'axisLabel');
        compatTextStyle(seriesOpt, 'title');
        compatTextStyle(seriesOpt, 'detail');

        var data = seriesOpt.data;
        if (data) {
            for (var i = 0; i < data.length; i++) {
                compatItemStyle(data[i]);
                compatLabelTextStyle(data[i] && data[i].label);
            }
            // mark point data
            var markPoint = seriesOpt.markPoint;
            if (markPoint && markPoint.data) {
                var mpData = markPoint.data;
                for (var i = 0; i < mpData.length; i++) {
                    compatItemStyle(mpData[i]);
                    compatLabelTextStyle(mpData[i] && mpData[i].label);
                }
            }
            // mark line data
            var markLine = seriesOpt.markLine;
            if (markLine && markLine.data) {
                var mlData = markLine.data;
                for (var i = 0; i < mlData.length; i++) {
                    if (zrUtil.isArray(mlData[i])) {
                        compatItemStyle(mlData[i][0]);
                        compatLabelTextStyle(mlData[i][0] && mlData[i][0].label);
                        compatItemStyle(mlData[i][1]);
                        compatLabelTextStyle(mlData[i][1] && mlData[i][1].label);
                    }
                    else {
                        compatItemStyle(mlData[i]);
                        compatLabelTextStyle(mlData[i] && mlData[i].label);
                    }
                }
            }
        }
    }

    function toArr(o) {
        return zrUtil.isArray(o) ? o : o ? [o] : [];
    }

    function toObj(o) {
        return (zrUtil.isArray(o) ? o[0] : o) || {};
    }

    return function (option) {
        each(toArr(option.series), function (seriesOpt) {
            isObject(seriesOpt) && processSeries(seriesOpt);
        });

        each(
            ['xAxis', 'yAxis', 'radiusAxis', 'angleAxis', 'singleAxis', 'parallelAxis', 'radar'],
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
            compatTextStyle(calendarOpt, 'dayLabel');
            compatTextStyle(calendarOpt, 'monthLabel');
            compatTextStyle(calendarOpt, 'yearLabel');
        });

        // radar.name.textStyle
        each(toArr(option.radar), function (radarOpt) {
            compatTextStyle(radarOpt, 'name');
        });

        each(toArr(option.geo), function (geoOpt) {
            isObject(geoOpt) && compatLabelTextStyle(geoOpt.label);
        });

        compatLabelTextStyle(toObj(option.timeline).label);
        compatTextStyle(toObj(option.axisPointer), 'label');
        compatTextStyle(toObj(option.tooltip).axisPointer, 'label');
    };
});