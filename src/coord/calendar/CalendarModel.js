/**
 * @file CalendarModel.js
 * @author dxh
 */

define(function (require) {

    'use strict';
    var ComponentModel = require('../../model/Component');

    var CalendarModel = ComponentModel.extend({

        type: 'calendar',

        /**
         * @type {module:echarts/coord/calendar/Calendar}
         */
        coordinateSystem: null,

        layoutMode: 'box',

        defaultOption: {
            zlevel: 0,
            z: 0,
            left: 80,
            top: 60,
            right: 80,
            bottom: 60,
            // 不同粒度可选
            granulatity: 'date'

        }
    });

    return CalendarModel;

});
