/**
 * @file Visual mapping.
 */

import * as zrUtil from 'zrender/src/core/util';

var visualDefault = {

    /**
     * @public
     */
    get: function (visualType, key, isCategory) {
        var value = zrUtil.clone(
            (defaultOption[visualType] || {})[key]
        );

        return isCategory
            ? (zrUtil.isArray(value) ? value[value.length - 1] : value)
            : value;
    }

};

var defaultOption = {

    color: {
        active: ['#006edd', '#e0ffff'],
        inactive: ['rgba(0,0,0,0)']
    },

    colorHue: {
        active: [0, 360],
        inactive: [0, 0]
    },

    colorSaturation: {
        active: [0.3, 1],
        inactive: [0, 0]
    },

    colorLightness: {
        active: [0.9, 0.5],
        inactive: [0, 0]
    },

    colorAlpha: {
        active: [0.3, 1],
        inactive: [0, 0]
    },

    opacity: {
        active: [0.3, 1],
        inactive: [0, 0]
    },

    symbol: {
        active: ['circle', 'roundRect', 'diamond'],
        inactive: ['none']
    },

    symbolSize: {
        active: [10, 50],
        inactive: [0, 0]
    }
};

export default visualDefault;
