// TODO Parse shadow style
// TODO Only shallow path support
define(function (require) {
    var zrUtil = require('zrender/core/util');

    return function (properties) {
        // Normalize
        for (var i = 0; i < properties.length; i++) {
            if (!properties[i][1]) {
               properties[i][1] = properties[i][0];
            }
        }
        return function (excludes, includes) {
            var style = {};
            for (var i = 0; i < properties.length; i++) {
                var propName = properties[i][1];
                if ((excludes && zrUtil.indexOf(excludes, propName) >= 0)
                    || (includes && zrUtil.indexOf(includes, propName) < 0)
                ) {
                    continue;
                }
                var val = this.getShallow(propName);
                if (val != null) {
                    style[properties[i][0]] = val;
                }
            }
            return style;
        };
    };
});