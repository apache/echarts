/**
 * echarts组件基类
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var ecConfig = require('../config');
    var ecQuery = require('../util/ecQuery');
    var number = require('../util/number');
    var zrUtil = require('zrender/tool/util');
    
    function Base(ecTheme, messageCenter, zr, option, myChart){
        this.ecTheme = ecTheme;
        this.messageCenter = messageCenter;
        this.zr =zr;
        this.option = option;
        this.series = option.series;
        this.myChart = myChart;
        this.component = myChart.component;
        
        this._zlevelBase = this.getZlevelBase();
        this.shapeList = [];
        this.effectList = [];
        
        var self = this;
        self.hoverConnect = function (param) {
            var target = (param.target || {}).hoverConnect;
            if (target) {
                var zlevel = 10;
                var shape;
                if (!(target instanceof Array)) {
                    shape = self.getShapeById(target);
                    if (shape) {
                        self.zr.addHoverShape(shape);
                        zlevel = Math.min(zlevel, shape.zlevel);
                    }
                }
                else {
                    for (var i = 0, l = target.length; i < l; i++) {
                        shape = self.getShapeById(target[i]);
                        self.zr.addHoverShape(shape);
                        zlevel = Math.min(zlevel, shape.zlevel);
                    }
                }
                if (zlevel < param.target.zlevel) {
                    self.zr.addHoverShape(param.target);
                }
            }
        };
    }

    /**
     * 基类方法
     */
    Base.prototype = {
        canvasSupported : require('zrender/tool/env').canvasSupported,
        /**
         * 获取zlevel基数配置
         * @param {Object} contentType
         */
        getZlevelBase : function (contentType) {
            contentType = contentType || this.type + '';

            switch (contentType) {
                case ecConfig.COMPONENT_TYPE_GRID :
                case ecConfig.COMPONENT_TYPE_AXIS_CATEGORY :
                case ecConfig.COMPONENT_TYPE_AXIS_VALUE :
                case ecConfig.COMPONENT_TYPE_POLAR :
                    return 0;

                case ecConfig.CHART_TYPE_LINE :
                case ecConfig.CHART_TYPE_BAR :
                case ecConfig.CHART_TYPE_SCATTER :
                case ecConfig.CHART_TYPE_PIE :
                case ecConfig.CHART_TYPE_RADAR :
                case ecConfig.CHART_TYPE_MAP :
                case ecConfig.CHART_TYPE_K :
                case ecConfig.CHART_TYPE_CHORD:
                case ecConfig.CHART_TYPE_GUAGE:
                case ecConfig.CHART_TYPE_FUNNEL:
                    return 2;

                case ecConfig.COMPONENT_TYPE_LEGEND :
                case ecConfig.COMPONENT_TYPE_DATARANGE:
                case ecConfig.COMPONENT_TYPE_DATAZOOM :
                case ecConfig.COMPONENT_TYPE_TIMELINE :
                    return 4;

                case ecConfig.CHART_TYPE_ISLAND :
                    return 5;

                case ecConfig.COMPONENT_TYPE_TOOLBOX :
                case ecConfig.COMPONENT_TYPE_TITLE :
                    return 6;

                // ecConfig.EFFECT_ZLEVEL = 7;
                
                case ecConfig.COMPONENT_TYPE_TOOLTIP :
                    return 8;

                default :
                    return 0;
            }
        },

        /**
         * 参数修正&默认值赋值
         * @param {Object} opt 参数
         *
         * @return {Object} 修正后的参数
         */
        reformOption : function (opt) {
            return zrUtil.merge(
                       opt || {},
                       zrUtil.clone(this.ecTheme[this.type] || {})
                   );
        },
        
        /**
         * css类属性数组补全，如padding，margin等~
         */
        reformCssArray : function (p) {
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
        },

        getShapeById : function(id) {
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                if (this.shapeList[i].id == id) {
                    return this.shapeList[i];
                }
            }
            return null;
        },
        
        /**
         * 获取自定义和默认配置合并后的字体设置
         */
        getFont : function (textStyle) {
            var finalTextStyle = zrUtil.merge(
                zrUtil.clone(textStyle) || {},
                this.ecTheme.textStyle
            );
            return finalTextStyle.fontStyle + ' '
                   + finalTextStyle.fontWeight + ' '
                   + finalTextStyle.fontSize + 'px '
                   + finalTextStyle.fontFamily;
        },
        
        getItemStyleColor : function (itemColor, seriesIndex, dataIndex, data) {
            return typeof itemColor == 'function'
                   ? itemColor(seriesIndex, dataIndex, data) : itemColor;
            
        },        
        
        // 亚像素优化
        subPixelOptimize : function (position, lineWidth) {
            if (lineWidth % 2 == 1) {
                //position += position == Math.ceil(position) ? 0.5 : 0;
                position = Math.floor(position) + 0.5;
            }
            else {
                position = Math.round(position);
            }
            return position;
        },
        
        
        resize : function () {
            this.refresh && this.refresh();
            this.animationEffect && this.animationEffect();
        },

        /**
         * 清除图形数据，实例仍可用
         */
        clear :function () {
            this.clearEffectShape && this.clearEffectShape();
            this.zr && this.zr.delShape(this.shapeList);
            this.shapeList = [];
        },

        /**
         * 释放后实例不可用
         */
        dispose : function () {
            this.clear();
            this.shapeList = null;
            this.effectList = null;
        },
        
        query : ecQuery.query,
        deepQuery : ecQuery.deepQuery,
        deepMerge : ecQuery.deepMerge,
        
        parsePercent : number.parsePercent,
        parseCenter : number.parseCenter,
        parseRadius : number.parseRadius,
        numAddCommas : number.addCommas
    };
    
    return Base;
});
