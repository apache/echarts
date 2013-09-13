/**
 * echarts坐标处理方法
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @author Neil (杨骥, linzhifeng@baidu.com)
 */

define(
    function(require) {

        var zrMath = require('zrender/tool/math');

        /**
         * 极坐标转直角坐标
         *
         * @param {number} 半径
         * @param {number} 角度
         *
         * @return {Array.<number>} 直角坐标[x,y]
         */
        function polar2cartesian(r, theta) {
            return [r * zrMath.sin(theta), r*zrMath.cos(theta)];
        }

        /**
         * 直角坐标转极坐标
         *
         * @param {number} 横坐标
         * @param {number} 纵坐标
         *
         * @return {Array.<number>} 极坐标[r,theta]
         */
        function cartesian2polar(x, y) {
            return [Math.sqrt(x * x + y * y), Math.atan(y / x)];
        }

        return {
            polar2cartesian : polar2cartesian,
            cartesian2polar : cartesian2polar
        };
    }
);