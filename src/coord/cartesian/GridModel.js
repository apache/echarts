// Grid 是在有直角坐标系的时候必须要存在的
// 所以这里也要被 Cartesian2D 依赖
define(function(require) {

    'use strict';

    require('./AxisModel');
    var ComponentModel = require('../../model/Component');

    return ComponentModel.extend({

        type: 'grid',

        dependencies: ['xAxis', 'yAxis'],

        mergeDefaultAndTheme: function (option, ecModel) {
            // Not specify layout with x2, width, y2, height
            // FIXME 通用？
            if (option.x2 == null || option.width == null || option.x != null) {
                option.x = option.x != null ? option.x : '10%';
                option.x2 = option.x2 != null ? option.x2 : '10%';
            }
            if (option.y2 == null || option.height == null || option.y != null) {
                option.y = option.y != null ? option.y : 60;
                option.y2 = option.y2 != null ? option.y2 : 60;
            }
            ComponentModel.prototype.mergeDefaultAndTheme.call(
                this, option, ecModel
            );
        },

        /**
         * @type {module:echarts/coord/cartesian/Grid}
         */
        coordinateSystem: null,

        defaultOption: {
            show: false,
            zlevel: 0,                  // 一级层叠
            z: 0,                       // 二级层叠
            // x: '10%',
            // y: 60,
            // x2: '10%',
            // y2: 60,
            // If grid size contain label
            containLabel: false,
            // width: {totalWidth} - x - x2,
            // height: {totalHeight} - y - y2,
            backgroundColor: 'rgba(0,0,0,0)',
            borderWidth: 1,
            borderColor: '#ccc'
        }
    });
});