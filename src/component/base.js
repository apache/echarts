/**
 * echarts组件基类
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function(require) {
    function Base(zr){
        var ecConfig = require('../config');
        var zrUtil = require('zrender/tool/util');
        var self = this;

        self.zr =zr;

        self.shapeList = [];

        /**
         * 获取zlevel基数配置
         * @param {Object} contentType
         */
        function getZlevelBase(contentType) {
            contentType = contentType || self.type + '';

            switch (contentType) {
                case ecConfig.COMPONENT_TYPE_GRID :
                case ecConfig.COMPONENT_TYPE_AXIS_CATEGORY :
                case ecConfig.COMPONENT_TYPE_AXIS_VALUE :
                    return 0;

                case ecConfig.CHART_TYPE_LINE :
                case ecConfig.CHART_TYPE_BAR :
                case ecConfig.CHART_TYPE_SCATTER :
                case ecConfig.CHART_TYPE_PIE :
                case ecConfig.CHART_TYPE_RADAR :
                    return 2;

                case ecConfig.COMPONENT_TYPE_LEGEND :
                case ecConfig.COMPONENT_TYPE_DATAZOOM :
                    return 4;

                case ecConfig.CHART_TYPE_ISLAND :
                    return 5;

                case ecConfig.COMPONENT_TYPE_TOOLTIP :
                case ecConfig.COMPONENT_TYPE_TOOLBOX :
                    return 6;

                default :
                    return 0;
            }
        }

        /**
         * 参数修正&默认值赋值
         * @param {Object} opt 参数
         *
         * @return {Object} 修正后的参数
         */
        function reformOption(opt) {
            return zrUtil.merge(
                       opt || {},
                       ecConfig[self.type] || {},
                       {
                           'overwrite': false,
                           'recursive': true
                       }
                   );
        }

        /**
         * css类属性数组补全，如padding，margin等~
         */
        function reformCssArray(p) {
            if (p instanceof Array) {
                switch (p.length + '') {
                    case '4':
                        return p;
                    case '3':
                        return [p[0], p[1], p[2], p[1]];
                    case '2':
                        return [p[0], p[1], p[0], p[1]];
                    case '1':
                        return [p[0], p[0], p[0], p[0]];
                    case '0':
                        return [0, 0, 0, 0];
                }
            }
            else {
                return [p, p, p, p];
            }
        }


        /**
         * 获取多级控制嵌套属性的基础方法
         * 返回ctrList中优先级最高（最靠前）的非undefined属性，ctrList中均无定义则返回undefined
         */
        var deepQuery = (function() {
            /**
             * 获取嵌套选项的基础方法
             * 返回optionTarget中位于optionLocation上的值，如果没有定义，则返回undefined
             */
            function _query(optionTarget, optionLocation) {
                if (typeof optionTarget == 'undefined') {
                    return undefined;
                }
                if (!optionLocation) {
                    return optionTarget;
                }
                optionLocation = optionLocation.split('.');

                var length = optionLocation.length;
                var curIdx = 0;
                while (curIdx < length) {
                    optionTarget = optionTarget[optionLocation[curIdx]];
                    if (typeof optionTarget == 'undefined') {
                        return undefined;
                    }
                    curIdx++;
                }
                return optionTarget;
            }

            return function(ctrList, optionLocation) {
                var finalOption;
                for (var i = 0, l = ctrList.length; i < l; i++) {
                    finalOption = _query(ctrList[i], optionLocation);
                    if (typeof finalOption != 'undefined') {
                        return finalOption;
                    }
                }
                return undefined;
            };
        })();

        /**
         * 获取自定义和默认配置合并后的字体设置
         */
        function getFont(textStyle) {
            var finalTextStyle = zrUtil.merge(
                zrUtil.clone(textStyle) || {},
                ecConfig.textStyle,
                { 'overwrite': false}
            );
            return finalTextStyle.fontStyle + ' '
                   + finalTextStyle.fontWeight + ' '
                   + finalTextStyle.fontSize + 'px '
                   + finalTextStyle.fontFamily;
        }

        /**
         * 清除图形数据，实例仍可用
         */
        function clear() {
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.zr.delShape(self.shapeList[i].id);
            }
            self.shapeList = [];
        }

        /**
         * 释放后实例不可用
         */
        function dispose() {
            self.clear();
            self.shapeList = null;
            self = null;
        }

        /**
         * 基类方法
         */
        self.getZlevelBase = getZlevelBase;
        self.reformOption = reformOption;
        self.reformCssArray = reformCssArray;
        self.deepQuery = deepQuery;
        self.getFont = getFont;
        self.clear = clear;
        self.dispose = dispose;
    }

    return Base;
});
