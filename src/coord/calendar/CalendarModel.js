define(function (require) {

    'use strict';

    var ComponentModel = require('../../model/Component');
    var zrUtil = require('zrender/core/util');
    var layout = require('../../util/layout');

    var CalendarModel = ComponentModel.extend({

        type: 'calendar',

        /**
         * @type {module:echarts/coord/calendar/Calendar}
         */
        coordinateSystem: null,

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
        },

        /**
         * @override
         */
        init: function (option, parentModel, ecModel, extraOpt) {
            var inputPositionParams = layout.getLayoutParams(option);

            CalendarModel.superApply(this, 'init', arguments);

            var cellSize = normalizeCellSize(option);

            mergeLayoutParam(option, inputPositionParams, cellSize);
        },

        /**
         * @override
         */
        mergeOption: function (option, extraOpt) {
            CalendarModel.superApply(this, 'mergeOption', arguments);

            var cellSize = normalizeCellSize(this.option);

            mergeLayoutParam(this.option, option, cellSize);
        }
    });

    function normalizeCellSize(option) {
        var size = option.cellSize;

        if (!zrUtil.isArray(size)) {
            option.cellSize = [size, size];
        }
        else if (size.length === 1) {
            size[1] = size[0];
        }

        return option.cellSize;
    }

    function mergeLayoutParam(target, raw, cellSize) {
        var whNames = ['width', 'height'];
        var ignoreSize = zrUtil.map([0, 1], function (idx) {
            if (raw[whNames[idx]] != null) {
                cellSize[idx] = 'auto';
            }
            return cellSize[idx] != null && cellSize[idx] !== 'auto';
        });
        layout.mergeLayoutParam(target, raw, {
            type: 'box', ignoreSize: ignoreSize
        });
    }

    return CalendarModel;

});
