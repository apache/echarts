/**
 * @file Visual coding.
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var zrColor = require('zrender/tool/color');
    var linearMap = require('../util/number').linearMap;

    var VisualCoding = function (option, ecModel, extendMethods) {
        this.option = option;
        this.ecModel = ecModel;

        /**
         * @readOnly
         */
        this.type = option.type;

        zrUtil.extend(this, visualHandlers[this.type]);
        zrUtil.extend(this, extendMethods);
    };

    VisualCoding.prototype = {

        get: function (attr) {
            return this.option[attr];
        },

        constructor: VisualCoding,

        setDataVisual: zrUtil.noop,

        isValueActive: zrUtil.noop,

        mapValueToVisual: zrUtil.noop,

        getValueExtent: zrUtil.noop
    };

    var visualHandlers = {

        color: {
            setDataVisual: function (data, dimension) {
                // FIXME
                // 目前只考虑了List
                data.each([dimension], function (value, index) {
                    var color = this.isValueActive(value)
                        ? this.mapValueToVisual(value)
                        : this.option.inactiveVisual; // FIXME

                    data.setItemVisual(index, color);
                }, false, this);
            },

            mapValueToVisual: function (value) {
                var thisOption = this.option;
                var normalizedValue = linearMap(value, this.getValueExtent(), [0, 1], true);

                return zrColor.mapToColor(normalizedValue, thisOption.data)
                    || thisOption.inactiveVisual;
            }
        }
    };

    return VisualCoding;

});
