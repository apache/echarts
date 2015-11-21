define(function (require) {
    var zrUtil = require('zrender/core/util');

    // Extend the emphasis option which has in normal but
    // Not in the emphasis, like position, show
    function fillLabel(labelOpt) {
        if (labelOpt) {
            var normalOpt = labelOpt.normal;
            if (normalOpt) {
                zrUtil.merge(labelOpt.emphasis || (labelOpt.emphasis = {}), normalOpt);
            }
        }
    }
    return function (option) {
        zrUtil.each(option.series, function (seriesOpt) {
            fillLabel(seriesOpt.label);
            // Label line for pie and funnel
            fillLabel(seriesOpt.labelLine);
            zrUtil.each(seriesOpt.data, function (dataOpt) {
                fillLabel(dataOpt.label);
                fillLabel(dataOpt.labelLine);
            });
        });
    };
});