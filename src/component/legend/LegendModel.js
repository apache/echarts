define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var Model = require('../../model/Model');

    return require('../../echarts').extendComponentModel({

        type: 'legend',

        dependencies: ['series'],

        init: function (option, parentModel, ecModel) {
            this.mergeDefaultAndTheme(option, ecModel);

            option.selected = option.selected || {};

            this._data = zrUtil.map(option.data, function (dataItem) {
                if (typeof dataItem === 'string') {
                    dataItem = {
                        name: dataItem
                    };
                }
                return new Model(dataItem, this);
            }, this);

            /**
             * @type {Array.<string>}
             * @private
             */
            this._seriesNames = zrUtil.map(ecModel.getSeriesAll(), function (series) {
                return series.name;
            });

        },

        /**
         * @return {Array.<module:echarts/model/Model>}
         */
        getData: function () {
            return this._data;
        },

        /**
         * @param {string} name
         */
        select: function (name) {
            this.option.selected[name] = true;
        },

        /**
         * @param {string} name
         */
        unSelect: function (name) {
            this.option.selected[name] = false;
        },

        /**
         * @param {string} name
         */
        toggleSelected: function (name) {
            var selected = this.option.selected;
            if (! (name in selected)) {
                selected[name] = true;
            }
            selected[name] = !selected[name];
        },

        /**
         * @param {string} name
         */
        isSelected: function (name) {
            var selected = this.option.selected;
            return !((name in selected) && !selected[name])
                && this._seriesNames.indexOf(name) >= 0
        },

        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 4,                       // 二级层叠
            show: true,
            orient: 'horizontal',      // 布局方式，默认为水平布局，可选为：
                                    // 'horizontal' ¦ 'vertical'
            x: 'center',               // 水平安放位置，默认为全图居中，可选为：
                                    // 'center' ¦ 'left' ¦ 'right'
                                    // ¦ {number}（x坐标，单位px）
            y: 'top',                  // 垂直安放位置，默认为全图顶端，可选为：
                                    // 'top' ¦ 'bottom' ¦ 'center'
                                    // ¦ {number}（y坐标，单位px）
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: '#ccc',       // 图例边框颜色
            borderWidth: 0,            // 图例边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 图例内边距，单位px，默认各方向内边距为5，
                                    // 接受数组分别设定上右下左边距，同css
            itemGap: 10,               // 各个item之间的间隔，单位px，默认为10，
                                    // 横向布局时为水平间隔，纵向布局时为纵向间隔
            itemWidth: 20,             // 图例图形宽度
            itemHeight: 14,            // 图例图形高度
            textStyle: {
                color: '#333'          // 图例文字颜色
            },
            selectedMode: true         // 选择模式，默认开启图例开关
            // selected: null,         // 配置默认选中状态，可配合LEGEND.SELECTED事件做动态数据载入
            // data: [],               // 图例内容（详见legend.data，数组中每一项代表一个item
        }
    });
});