define(function (require) {

    var zrUtil = require('zrender/core/util');

    function categoryDefaultFormatter(val) {
        return val;
    }

    // function getName(obj) {
    //     if (typeof obj === 'string') {
    //         return obj;
    //     }
    //     return obj.name;
    // }
    /**
     * Get categories
     */
    // function getCategories() {
    //     return this.get('type') === 'category'
    //         && zrUtil.map()
    // }

    /**
     * Format labels
     * @return {Array.<string>}
     */
    function getFormattedLabels () {
        var labelFormatter = this.get('axisLabel.formatter');
        var labels = this.axis.scale.getTicksLabels();
        if (!labelFormatter) {
            return labels;
        }
        else if (typeof labelFormatter === 'string') {
            labelFormatter = (function (tpl) {
                return function (val) {
                    return tpl.replace('{value}', val);
                };
            })(labelFormatter);
        }

        return zrUtil.map(labels, labelFormatter);
    }

    return {
        getFormattedLabels: getFormattedLabels
    };
});