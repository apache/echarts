/**
 * echarts组件基类
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
                case ecConfig.CHART_TYPE_MAP :
                case ecConfig.CHART_TYPE_K :
                case ecConfig.CHART_TYPE_CHORD:
                    return 2;

                case ecConfig.COMPONENT_TYPE_LEGEND :
                case ecConfig.COMPONENT_TYPE_DATARANGE:
                case ecConfig.COMPONENT_TYPE_DATAZOOM :
                    return 4;

                case ecConfig.CHART_TYPE_ISLAND :
                    return 5;

                case ecConfig.COMPONENT_TYPE_TOOLBOX :
                case ecConfig.COMPONENT_TYPE_TITLE :
                    return 6;

                case ecConfig.COMPONENT_TYPE_TOOLTIP :
                    return 7;

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
         * 添加文本 
         */
        function addLabel(tarShape, serie, data, name, orient) {
            // 多级控制
            var nLabel = zrUtil.merge(
                    zrUtil.clone(
                        self.deepQuery([serie], 'itemStyle.normal.label')
                    ), 
                    self.deepQuery([data], 'itemStyle.normal.label'),
                    { 'overwrite': true, 'recursive': true }
                );
            var eLabel = zrUtil.merge(
                    zrUtil.clone(
                        self.deepQuery([serie], 'itemStyle.emphasis.label')
                    ), 
                    self.deepQuery([data], 'itemStyle.emphasis.label'),
                    { 'overwrite': true, 'recursive': true }
                );

            var nTextStyle = nLabel.textStyle || {};
            var eTextStyle = eLabel.textStyle || {};
            
            if (nLabel.show) {
                tarShape.style.text = _getLabelText(
                    serie, data, name, 'normal'
                );
                tarShape.style.textPosition = 
                    typeof nLabel.position == 'undefined'
                        ? (orient == 'horizontal' ? 'right' : 'top')
                        : nLabel.position;
                tarShape.style.textColor = nTextStyle.color;
                tarShape.style.textFont = self.getFont(nTextStyle);
            }
            if (eLabel.show) {
                tarShape.highlightStyle.text = _getLabelText(
                    serie, data, name, 'emphasis'
                );
                tarShape.highlightStyle.textPosition = 
                    typeof eLabel.position == 'undefined'
                        ? (orient == 'horizontal' ? 'right' : 'top')
                        : eLabel.position;
                tarShape.highlightStyle.textColor = eTextStyle.color;
                tarShape.highlightStyle.textFont = self.getFont(eTextStyle);
            }
            
            return tarShape;
        }
        
        /**
         * 根据lable.format计算label text
         */
        function _getLabelText(serie, data, name, status) {
            var formatter = self.deepQuery(
                [data, serie],
                'itemStyle.' + status + '.label.formatter'
            );
            
            var value = typeof data != 'undefined'
                        ? (typeof data.value != 'undefined'
                          ? data.value
                          : data)
                        : '-';
            
            if (formatter) {
                if (typeof formatter == 'function') {
                    return formatter(
                        serie.name,
                        name,
                        value
                    );
                }
                else if (typeof formatter == 'string') {
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}');
                    formatter = formatter.replace('{a0}', serie.name)
                                         .replace('{b0}', name)
                                         .replace('{c0}', value);
    
                    return formatter;
                }
            }
            else {
                return value;
            }
        }
        
        /**
         * 百分比计算
         */
        function parsePercent(value, maxValue) {
            if (typeof(value) === 'string') {
                if (_trim(value).match(/%$/)) {
                    return parseFloat(value) / 100 * maxValue;
                } else {
                    return parseFloat(value);
                }
            } else {
                return value;
            }
        }
        
        /**
         * 获取中心坐标
         */ 
        function parseCenter(center) {
            return [
                parsePercent(center[0], self.zr.getWidth()),
                parsePercent(center[1], self.zr.getHeight()),
            ];
        }

        function _trim(str) {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        }

        // 记录自适应原始定义，resize用
        function backupAdaptiveParams(series, attrs, isAll) {
            for (var i = 0, l = series.length; i < l; i++) {
                if (isAll || series[i].type == self.type) {
                    for (var j = 0, k = attrs.length; j < k; j++) {
                        series[i]['__' + attrs[i]] = zrUtil.clone(
                            series[i][attrs[i]]
                        );
                    }
                }
            }
        }
        
        // 还原自适应原始定义，resize用
        function restoreAdaptiveParams(series, attrs, isAll) {
            for (var i = 0, l = series.length; i < l; i++) {
                if (isAll || series[i].type == self.type) {
                    for (var j = 0, k = attrs.length; j < k; j++) {
                        series[i][attrs[i]] = zrUtil.clone(
                            series[i]['__' + attrs[i]]
                        );
                    }
                }
            }
        }
        
        function resize() {
            self.refresh && self.refresh();
        }

        /**
         * 清除图形数据，实例仍可用
         */
        function clear() {
            if (self.zr) {
                self.zr.delShape(self.shapeList);
                self.zr.clearAnimation 
                    && self.zr.clearAnimation();
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
        self.addLabel = addLabel;
        self.parsePercent = parsePercent;
        self.parseCenter = parseCenter;
        self.clear = clear;
        self.dispose = dispose;
        self.backupAdaptiveParams = backupAdaptiveParams;
        self.restoreAdaptiveParams =  restoreAdaptiveParams;
        self.resize = resize;
    }

    return Base;
});
