define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var Model = require('../../model/Model');

    var LegendModel = require('../../echarts').extendComponentModel({

        type: 'legend',

        dependencies: ['series'],

        layoutMode: {
            type: 'box',
            ignoreSize: true
        },

        init: function (option, parentModel, ecModel) {
            this.mergeDefaultAndTheme(option, ecModel);

            option.selected = option.selected || {};

            this._updateData(ecModel);

            var legendData = this._data;
            // If has any selected in option.selected
            var selectedMap = this.option.selected;
            // If selectedMode is single, try to select one
            if (legendData[0] && this.get('selectedMode') === 'single') {
                var hasSelected = false;
                for (var name in selectedMap) {
                    if (selectedMap[name]) {
                        this.select(name);
                        hasSelected = true;
                    }
                }
                // Try select the first if selectedMode is single
                !hasSelected && this.select(legendData[0].get('name'));
            }
        },

        mergeOption: function (option) {
            LegendModel.superCall(this, 'mergeOption', option);

            this._updateData(this.ecModel);
        },

        _updateData: function (ecModel) {
            var legendData = zrUtil.map(this.get('data') || [], function (dataItem) {
                if (typeof dataItem === 'string') {
                    dataItem = {
                        name: dataItem
                    };
                }
                return new Model(dataItem, this, this.ecModel);
            }, this);
            this._data = legendData;

            var availableNames = zrUtil.map(ecModel.getSeries(), function (series) {
                return series.name;
            });
            ecModel.eachSeries(function (seriesModel) {
                if (seriesModel.legendDataProvider) {
                    var data = seriesModel.legendDataProvider();
                    availableNames = availableNames.concat(data.mapArray(data.getName));
                }
            });
            /**
             * @type {Array.<string>}
             * @private
             */
            this._availableNames = availableNames;
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
            var selected = this.option.selected;
            var selectedMode = this.get('selectedMode');
            if (selectedMode === 'single') {
                var data = this._data;
                zrUtil.each(data, function (dataItem) {
                    selected[dataItem.get('name')] = false;
                });
            }
            selected[name] = true;
        },

        /**
         * @param {string} name
         */
        unSelect: function (name) {
            if (this.get('selectedMode') !== 'single') {
                this.option.selected[name] = false;
            }
        },

        /**
         * @param {string} name
         */
        toggleSelected: function (name) {
            var selected = this.option.selected;
            // Default is true
            if (!(name in selected)) {
                selected[name] = true;
            }
            this[selected[name] ? 'unSelect' : 'select'](name);
        },

        /**
         * @param {string} name
         */
        isSelected: function (name) {
            var selected = this.option.selected;
            return !((name in selected) && !selected[name])
                && zrUtil.indexOf(this._availableNames, name) >= 0;
        },

        defaultOption: {
            // 一级层叠
            zlevel: 0,
            // 二级层叠
            z: 4,
            show: true,

            // 布局方式，默认为水平布局，可选为：
            // 'horizontal' | 'vertical'
            orient: 'horizontal',

            left: 'center',
            // right: 'center',

            top: 'top',
            // bottom: 'top',

            // 水平对齐
            // 'auto' | 'left' | 'right'
            // 默认为 'auto', 根据 x 的位置判断是左对齐还是右对齐
            align: 'auto',

            backgroundColor: 'rgba(0,0,0,0)',
            // 图例边框颜色
            borderColor: '#ccc',
            // 图例边框线宽，单位px，默认为0（无边框）
            borderWidth: 0,
            // 图例内边距，单位px，默认各方向内边距为5，
            // 接受数组分别设定上右下左边距，同css
            padding: 5,
            // 各个item之间的间隔，单位px，默认为10，
            // 横向布局时为水平间隔，纵向布局时为纵向间隔
            itemGap: 10,
            // 图例图形宽度
            itemWidth: 25,
            // 图例图形高度
            itemHeight: 14,
            textStyle: {
                // 图例文字颜色
                color: '#333'
            },
            // formatter: '',
            // 选择模式，默认开启图例开关
            selectedMode: true
            // 配置默认选中状态，可配合LEGEND.SELECTED事件做动态数据载入
            // selected: null,
            // 图例内容（详见legend.data，数组中每一项代表一个item
            // data: [],
        }
    });

    return LegendModel;
});