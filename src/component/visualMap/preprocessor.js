/**
 * @file VisualMap preprocessor
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var each = zrUtil.each;

    return function (option) {
        var visualMap = option && option.visualMap;

        if (!zrUtil.isArray(visualMap)) {
            visualMap = visualMap ? [visualMap] : [];
        }

        each(visualMap, function (opt) {
            if (!opt) {
                return;
            }

            var splitList = opt.splitList;
            if (splitList && zrUtil.isArray(splitList)) {
                each(splitList, function (splitListItem) {
                    if (zrUtil.isObject(splitListItem)) {
                        if (has(splitListItem, 'start') && !has(splitListItem, 'min')) {
                            splitListItem.min = splitListItem.start;
                        }
                        if (has(splitListItem, 'end') && !has(splitListItem, 'max')) {
                            splitListItem.max = splitListItem.end;
                        }
                    }
                });
            }
        });
    };

    function has(obj, name) {
        return obj && obj.hasOwnProperty && obj.hasOwnProperty(name);
    }

});