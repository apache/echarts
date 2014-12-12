/**
 * zrender
 *
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *
 * shape类：仪表盘指针
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'gauge-pointer',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过'zrender/tool/guid'方法生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           xStart        : {number},  // 必须，起点横坐标
           yStart        : {number},  // 必须，起点纵坐标
           xEnd          : {number},  // 必须，终点横坐标
           yEnd          : {number},  // 必须，终点纵坐标
           strokeColor   : {color},   // 默认为'#000'，线条颜色（轮廓），支持rgba
           lineWidth     : {number},  // 线条宽度
       },

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
 */
define(function (require) {
    var Base = require('zrender/shape/Base');
    var zrUtil = require('zrender/tool/util');

    function GaugePointer(options) {
        Base.call(this, options);
    }

    GaugePointer.prototype =  {
        type: 'gauge-pointer',
        /**
         * 创建矩形路径
         * @param {Context2D} ctx Canvas 2D上下文
         * @param {Object} style 样式
         */
        buildPath : function (ctx, style) {
            var r = style.r;
            var width = style.width;
            var angle = style.angle;
            var x = style.x - Math.cos(angle) * width * (width >= r / 3 ? 1 : 2);
            var y = style.y + Math.sin(angle) * width * (width >= r / 3 ? 1 : 2);

            angle = style.angle - Math.PI / 2;
            ctx.moveTo(x, y);
            ctx.lineTo(
                style.x + Math.cos(angle) * width,
                style.y - Math.sin(angle) * width
            );
            ctx.lineTo(
                style.x + Math.cos(style.angle) * r,
                style.y - Math.sin(style.angle) * r
            );
            ctx.lineTo(
                style.x - Math.cos(angle) * width,
                style.y + Math.sin(angle) * width
            );
            ctx.lineTo(x, y);
            return;
        },

        /**
         * 返回矩形区域，用于局部刷新和文字定位
         * @param {Object} style
         */
        getRect : function(style) {
            if (style.__rect) {
                return style.__rect;
            }

            var width = style.width * 2;
            var xStart = style.x;
            var yStart = style.y;
            var xEnd = xStart + Math.cos(style.angle) * style.r;
            var yEnd = yStart - Math.sin(style.angle) * style.r;

            style.__rect = {
                x : Math.min(xStart, xEnd) - width,
                y : Math.min(yStart, yEnd) - width,
                width : Math.abs(xStart - xEnd) + width,
                height : Math.abs(yStart - yEnd) + width
            };
            return style.__rect;
        },

        isCover : require('./normalIsCover')
    };

    zrUtil.inherits(GaugePointer, Base);

    return GaugePointer;
});
