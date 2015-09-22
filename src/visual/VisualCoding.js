/**
 * @file Visual coding.
 */
define(function (require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');
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
    }

    VisualCoding.prototype = {

        get: function (attr) {
            return this.option[attr];
        },

        constructor: VisualCoding,

        setDataVisual: zrUtil.noop,

        isValueActive: zrUtil.noop,

        mapValueToVisual: zrUtil.noop,

        getValueExtent: zrUtil.noop,
    };

    var visualHandlers = {

        color: {
            setDataVisual: function (data) {
                // FIXME
                // 目前只考虑了List
                data.each(['value'], function (value, index) {
                    var color = this.isValueActive(value)
                        ? this.mapValueToVisual(value)
                        : this.option.inactiveVisual // FIXME

                    data.setItemVisual(index, color);
                })
            },

            mapValueToVisual: function (value) {
                var thisOption = this.option;
                var visualData = thisOption.data;
                var valueExtent = this.getValueExtent();

                return linearMap()
            }
        }
    };

    return VisualCoding;

});
