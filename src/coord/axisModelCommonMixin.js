define(function (require) {

    var zrUtil = require('zrender/core/util');

    function getName(obj) {
        if (zrUtil.isObject(obj) && obj.value != null) {
            return obj.value;
        }
        else {
            return obj;
        }
    }
    /**
     * Get categories
     */
    function getCategories() {
        return this.get('type') === 'category'
            && zrUtil.map(this.get('data'), getName);
    }

    /**
     * Format labels
     * @return {Array.<string>}
     */
    function getFormattedLabels () {
        var labelFormatter = this.get('axisLabel.formatter');
        var axis = this.axis;
        var scale = axis.scale;
        var labels = scale.getTicksLabels();
        var ticks = scale.getTicks();
        if (typeof labelFormatter === 'string') {
            labelFormatter = (function (tpl) {
                return function (val) {
                    return tpl.replace('{value}', val);
                };
            })(labelFormatter);
            return zrUtil.map(labels, labelFormatter);
        }
        else if (typeof labelFormatter === 'function') {
            return zrUtil.map(ticks, function (tick) {
                return labelFormatter(
                    axis.type === 'category' ? scale.getLabel(tick) : tick
                );
            }, this);
        }
        else {
            return labels;
        }
    }

    return {

        getFormattedLabels: getFormattedLabels,

        getCategories: getCategories
    };
});