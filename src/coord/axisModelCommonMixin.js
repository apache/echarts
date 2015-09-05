define(function (require) {

    var numberUtil = require('../util/number');
    var zrUtil = require('zrender/core/util');

    function categoryDefaultFormatter(val) {
        return val;
    }

    /**
     * Format labels
     * @param {Array.<string>} labels
     * @return {Array.<string>}
     */
    function formatLabels (labels) {
        var labelFormatter = this.get('axisLabel.formatter');

        if (! labelFormatter) {
            switch (this.get('type')) {
                case 'category':
                    labelFormatter = categoryDefaultFormatter;
                    break;
                case 'time':
                    break;
                case 'log':
                    // TODO
                    break;
                default:
                    labelFormatter = function (val) {
                        return numberUtil.addCommas(numberUtil.round(val));
                    };
            }
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
        formatLabels: formatLabels
    };
});