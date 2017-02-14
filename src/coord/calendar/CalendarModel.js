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
            z: 2,
            left: 80,
            top: 60,
            right: 80,
            bottom: 60,

            // 月分割线样式
            lineStyle: {
                color: '#000',
                width: 2,
                type: 'solid'
            },

            // rect样式  暂时不用emphasis
            itemStyle: {
                normal: {
                    color: '#fff',
                    borderColor: '#ccc'
                }
            },

            // 星期坐标样式
            dayLabel: {
                show: true,
                padding: 0, // 向左偏移
                data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                textStyle: {
                    color: '#000'
                }
            },

            // 月坐标样式
            mouthLabel: {
                show: true,
                data: [
                    'Jan', 'Feb', 'Mar',
                    'Apr', 'May', 'June',
                    'Jul', 'Aug', 'Sep',
                    'Oct', 'Nov', 'Dec'
                ],
                position: 'top', // top bottom
                padding: 0, // 偏移的一方 top 上 bottom下偏移
                textStyle: {
                    color: '#000',
                    fontSize: 14

                }
            },

            // 年样式
            yearLabel: {
                show: true,
                position: 'left', // center left
                padding: 0, // 偏移的一方  center 上 left 左偏移
                textStyle: {
                    color: '#000',
                    fontFamily: '"Microsoft YaHei", sans-serif',
                    fontWeight: 'bolder',
                    fontSize: 16
                }
            },

            // 不同粒度可选
            granulatity: 'date'

        }
    });

    return CalendarModel;

});
