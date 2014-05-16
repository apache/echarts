/**
 * echarts组件类： 坐标轴
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * 直角坐标系中坐标轴数组，数组中每一项代表一条横轴（纵轴）坐标轴。
 * 标准（1.0）中规定最多同时存在2条横轴和2条纵轴
 *    单条横轴时可指定安放于grid的底部（默认）或顶部，2条同时存在时则默认第一条安放于底部，第二天安放于顶部
 *    单条纵轴时可指定安放于grid的左侧（默认）或右侧，2条同时存在时则默认第一条安放于左侧，第二天安放于右侧。
 * 坐标轴有两种类型，类目型和数值型（区别详见axis）：
 *    横轴通常为类目型，但条形图时则横轴为数值型，散点图时则横纵均为数值型
 *    纵轴通常为数值型，但条形图时则纵轴为类目型。
 *
 */
define(function (require) {
    var Base = require('./base');
    
    var ecConfig = require('../config');
    var zrUtil = require('zrender/tool/util');
    
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表选项
     *     @param {string=} option.xAxis.type 坐标轴类型，横轴默认为类目型'category'
     *     @param {string=} option.yAxis.type 坐标轴类型，纵轴默认为类目型'value'
     * @param {Object} component 组件
     * @param {string} axisType 横走or纵轴
     */
    function Axis(ecTheme, messageCenter, zr, option, myChart, axisType) {
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);
        
        this.axisType = axisType;
        this._axisList = [];
        
        this.clear();

        var axisOption;
        if (this.axisType == 'xAxis') {
            this.option.xAxis = this.reformOption(option.xAxis);
            axisOption = this.option.xAxis;
        }
        else {
            this.option.yAxis = this.reformOption(option.yAxis);
            axisOption = this.option.yAxis;
        }

        var CategoryAxis = require('./categoryAxis');
        var ValueAxis = require('./valueAxis');
        for (var i = 0, l = axisOption.length; i < l; i++) {
            this._axisList.push(
                axisOption[i].type == 'category'
                ? new CategoryAxis(
                      this.ecTheme, 
                      this.messageCenter,
                      this.zr,
                      axisOption[i], 
                      myChart
                  )
                : new ValueAxis(
                      this.ecTheme, 
                      this.messageCenter,
                      this.zr,
                      axisOption[i],
                      myChart,
                      this.series
                  )
            );
        }
    }
    
    Axis.prototype = {
        type : ecConfig.COMPONENT_TYPE_AXIS,
        /**
         * 参数修正&默认值赋值，重载基类方法
         * @param {Object} opt 参数
         */
        reformOption : function (opt) {
            // 不写或传了个空数值默认为数值轴
            if (!opt || (opt instanceof Array && opt.length === 0)) {
                opt = [{type : ecConfig.COMPONENT_TYPE_AXIS_VALUE}];
            }
            else if (!(opt instanceof Array)){
                opt = [opt];
            }

            // 最多两条，其他参数忽略
            if (opt.length > 2) {
                opt = [opt[0],opt[1]];
            }

            if (this.axisType == 'xAxis') {
                // 横轴位置默认配置
                if (!opt[0].position            // 没配置或配置错
                    || (opt[0].position != 'bottom'
                        && opt[0].position != 'top')
                ) {
                    opt[0].position = 'bottom';
                }
                if (opt.length > 1) {
                    opt[1].position = opt[0].position == 'bottom'
                                      ? 'top' : 'bottom';
                }

                for (var i = 0, l = opt.length; i < l; i++) {
                    // 坐标轴类型，横轴默认为类目型'category'
                    opt[i].type = opt[i].type || 'category';
                    // 标识轴类型&索引
                    opt[i].xAxisIndex = i;
                    opt[i].yAxisIndex = -1;
                }
            }
            else {
                // 纵轴位置默认配置
                if (!opt[0].position            // 没配置或配置错
                    || (opt[0].position != 'left'
                        && opt[0].position != 'right')
                ) {
                    opt[0].position = 'left';
                }

                if (opt.length > 1) {
                    opt[1].position = opt[0].position == 'left'
                                      ? 'right' : 'left';
                }

                for (var i = 0, l = opt.length; i < l; i++) {
                    // 坐标轴类型，纵轴默认为数值型'value'
                    opt[i].type = opt[i].type || 'value';
                    // 标识轴类型&索引
                    opt[i].xAxisIndex = -1;
                    opt[i].yAxisIndex = i;
                }
            }

            return opt;
        },

        /**
         * 刷新
         */
        refresh : function (newOption) {
            var axisOption;
            if (newOption) {
                if (this.axisType == 'xAxis') {
                    this.option.xAxis = this.reformOption(newOption.xAxis);
                    axisOption = this.option.xAxis;
                }
                else {
                    this.option.yAxis = this.reformOption(newOption.yAxis);
                    axisOption = this.option.yAxis;
                }
                this.series = newOption.series;
            }
            
            for (var i = 0, l = this._axisList.length; i < l; i++) {
                this._axisList[i].refresh && this._axisList[i].refresh(
                    axisOption ? axisOption[i] : false,
                    this.series
                );
            }
        },

        /**
         * 根据值换算位置
         * @param {number} idx 坐标轴索引0~1
         */
        getAxis : function (idx) {
            return this._axisList[idx];
        },

        /**
         * 清除坐标轴子对象，实例仍可用，重载基类方法
         */
        clear : function () {
            for (var i = 0, l = this._axisList.length; i < l; i++) {
                this._axisList[i].dispose && this._axisList[i].dispose();
            }
            this._axisList = [];
        }
    }
    
    zrUtil.inherits(Axis, Base);
    
    require('../component').define('axis', Axis);
     
    return Axis;
});