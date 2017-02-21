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

        layoutMode: {
            type: 'box',
            ignoreSize: true
        },

        defaultOption: {
            zlevel: 0,
            z: 2,
            left: 80,
            top: 60,
            // right: 80,
            // bottom: 60,

            cellSize: 20,
            orient: 'horizontal', // horizontal vertical

            // month separate line style
            splitLine: {
                show: true,
                lineStyle: {
                    color: '#000',
                    width: 1,
                    type: 'solid'
                }
            },

            // rect style  temporarily unused emphasis
            itemStyle: {
                normal: {
                    color: '#fff',
                    borderColor: '#ccc'
                }
            },

            // week text style
            dayLabel: {
                show: true,
                padding: 0,
                firstDay: 0,
                position: 'top', // top = left bottom = right
                nameMap: 'en',
                textStyle: {
                    color: '#000'
                }
            },

            // month text style
            monthLabel: {
                show: true,
                nameMap: 'en',
                position: 'top', // top = left bottom = right
                posAlign: 'center', // center or left
                padding: 5,
                formatter: null,
                textStyle: {
                    color: '#000',
                    fontSize: 14
                }
            },

            // year text style
            yearLabel: {
                show: true,
                position: 'top', // top bottom left right
                padding: 0,
                formatter: null,
                textStyle: {
                    color: '#ccc',
                    fontFamily: '"Microsoft YaHei", sans-serif',
                    fontWeight: 'bolder',
                    fontSize: 20
                }
            }
        }
    });

    return CalendarModel;

});
