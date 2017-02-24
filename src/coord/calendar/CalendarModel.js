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

            cellSize: 20,

            // horizontal vertical
            orient: 'horizontal',

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
                    borderWidth: 1,
                    borderColor: '#ccc'
                }
            },

            // week text style
            dayLabel: {
                show: true,

                // a week first day
                firstDay: 0,

                // start end
                position: 'start',
                margin: 0,
                nameMap: 'en',
                textStyle: {
                    color: '#000'
                }
            },

            // month text style
            monthLabel: {
                show: true,

                // start end
                position: 'start',
                margin: 5,

                // center or left
                align: 'center',

                // cn en []
                nameMap: 'en',
                formatter: null,
                textStyle: {
                    color: '#000'
                }
            },

            // year text style
            yearLabel: {
                show: true,

                // top bottom left right
                position: null,
                margin: 30,
                formatter: null,
                textStyle: {
                    color: '#ccc',
                    fontFamily: 'sans-serif',
                    fontWeight: 'bolder',
                    fontSize: 20
                }
            }
        }
    });

    return CalendarModel;

});
