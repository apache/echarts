/**
 * Complete dimensions by data (guess dimension).
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');

    /**
     * Complete the dimensions array guessed from the data structure.
     * @param  {Array.<string>} dimensions Necessary dimensions, like ['x', 'y']
     * @param  {Array} data Data list. [[1, 2, 3], [2, 3, 4]]
     * @param  {Object} [opt]
     * @param  {Array.<string>} [opt.defaultNames] Default names to fill not necessary dimensions, like ['value']
     * @param  {string} [opt.extraPrefix] Prefix of name when filling the left dimensions.
     * @param  {number} [opt.dimCount] If not specified, guess by the first data item.
     * @return {Array.<string>}
     */
    function completeDimensions(dimensions, data, opt) {
        if (!data) {
            return dimensions;
        }

        opt = opt || {};

        var dimCount = opt.dimCount;
        if (dimCount == null) {
            var value0 = retrieveValue(data[0]);
            dimCount = zrUtil.isArray(value0) && value0.length || 1;
        }

        var defaultNames = opt.defaultNames || [];
        var extraPrefix = opt.extraPrefix || 'extra';
        for (var i = 0; i < dimCount; i++) {
            if (!dimensions[i]) {
                var name = defaultNames[i] || (extraPrefix + (i - defaultNames.length));
                dimensions[i] = guessOrdinal(data, i)
                    ? {type: 'ordinal', name: name}
                    : name;
            }
        }

        return dimensions;
    }

    // The rule should not be complex, otherwise user might not
    // be able to known where the data is wrong.
    var guessOrdinal = completeDimensions.guessOrdinal = function (data, dimIndex) {
        for (var i = 0, len = data.length; i < len; i++) {
            var value = retrieveValue(data[i]);

            if (!zrUtil.isArray(value)) {
                return false;
            }

            var value = value[dimIndex];
            if (value != null && isFinite(value)) {
                return false;
            }
            else if (zrUtil.isString(value) && value !== '-') {
                return true;
            }
        }
        return false;
    };

    function retrieveValue(o) {
        return zrUtil.isArray(o) ? o : zrUtil.isObject(o) ? o.value: o;
    }

    return completeDimensions;

});