/**
 * Complete dimensions by data (guess dimension).
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');

    function completeDimensions(dimensions, data, defaultNames) {
        if (!data) {
            return dimensions;
        }

        var value0 = retrieveValue(data[0]);
        var dimSize = zrUtil.isArray(value0) && value0.length || 1;

        defaultNames = defaultNames || [];
        for (var i = 0; i < dimSize; i++) {
            if (!dimensions[i]) {
                var name = defaultNames[i] || ('extra' + (i - defaultNames.length));
                dimensions[i] = guessOrdinal(data, i)
                    ? {type: 'ordinal', name: name}
                    : name;
            }
        }

        return dimensions;
    }

    // The rule should not be complex, otherwise user might not
    // be able to known where the data is wrong.
    function guessOrdinal(data, dimIndex) {
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
    }

    function retrieveValue(o) {
        return zrUtil.isArray(o) ? o : zrUtil.isObject(o) ? o.value: o;
    }

    return completeDimensions;

});