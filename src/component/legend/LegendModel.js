/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import Model from '../../model/Model';
import {isNameSpecified} from '../../util/model';
import lang from '../../lang';

var langSelector = lang.legend.selector;

var defaultSelectorOption = {
    all: {
        type: 'all',
        title: zrUtil.clone(langSelector.all)
    },
    inverse: {
        type: 'inverse',
        title: zrUtil.clone(langSelector.inverse)
    }
};

var LegendModel = echarts.extendComponentModel({

    type: 'legend.plain',

    dependencies: ['series'],

    layoutMode: {
        type: 'box',
        // legend.width/height are maxWidth/maxHeight actually,
        // whereas realy width/height is calculated by its content.
        // (Setting {left: 10, right: 10} does not make sense).
        // So consider the case:
        // `setOption({legend: {left: 10});`
        // then `setOption({legend: {right: 10});`
        // The previous `left` should be cleared by setting `ignoreSize`.
        ignoreSize: true
    },

    init: function (option, parentModel, ecModel) {
        this.mergeDefaultAndTheme(option, ecModel);

        option.selected = option.selected || {};
        this._updateSelector(option);
    },

    mergeOption: function (option) {
        LegendModel.superCall(this, 'mergeOption', option);
        this._updateSelector(option);
    },

    _updateSelector: function (option) {
        var selector = option.selector;
        if (selector === true) {
            selector = option.selector = ['all', 'inverse'];
        }
        if (zrUtil.isArray(selector)) {
            zrUtil.each(selector, function (item, index) {
                zrUtil.isString(item) && (item = {type: item});
                selector[index] = zrUtil.merge(item, defaultSelectorOption[item.type]);
            });
        }
    },

    optionUpdated: function () {
        this._updateData(this.ecModel);

        var legendData = this._data;

        // If selectedMode is single, try to select one
        if (legendData[0] && this.get('selectedMode') === 'single') {
            var hasSelected = false;
            // If has any selected in option.selected
            for (var i = 0; i < legendData.length; i++) {
                var name = legendData[i].get('name');
                if (this.isSelected(name)) {
                    // Force to unselect others
                    this.select(name);
                    hasSelected = true;
                    break;
                }
            }
            // Try select the first if selectedMode is single
            !hasSelected && this.select(legendData[0].get('name'));
        }
    },

    _updateData: function (ecModel) {
        var potentialData = [];
        var availableNames = [];

        ecModel.eachRawSeries(function (seriesModel) {
            var seriesName = seriesModel.name;
            availableNames.push(seriesName);
            var isPotential;

            if (seriesModel.legendDataProvider) {
                var data = seriesModel.legendDataProvider();
                var names = data.mapArray(data.getName);

                if (!ecModel.isSeriesFiltered(seriesModel)) {
                    availableNames = availableNames.concat(names);
                }

                if (names.length) {
                    potentialData = potentialData.concat(names);
                }
                else {
                    isPotential = true;
                }
            }
            else {
                isPotential = true;
            }

            if (isPotential && isNameSpecified(seriesModel)) {
                potentialData.push(seriesModel.name);
            }
        });

        /**
         * @type {Array.<string>}
         * @private
         */
        this._availableNames = availableNames;

        // If legend.data not specified in option, use availableNames as data,
        // which is convinient for user preparing option.
        var rawData = this.get('data') || potentialData;

        var legendData = zrUtil.map(rawData, function (dataItem) {
            // Can be string or number
            if (typeof dataItem === 'string' || typeof dataItem === 'number') {
                dataItem = {
                    name: dataItem
                };
            }
            return new Model(dataItem, this, this.ecModel);
        }, this);

        /**
         * @type {Array.<module:echarts/model/Model>}
         * @private
         */
        this._data = legendData;
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
        if (!selected.hasOwnProperty(name)) {
            selected[name] = true;
        }
        this[selected[name] ? 'unSelect' : 'select'](name);
    },

    allSelect: function () {
        var data = this._data;
        var selected = this.option.selected;
        zrUtil.each(data, function (dataItem) {
            selected[dataItem.get('name', true)] = true;
        });
    },

    inverseSelect: function () {
        var data = this._data;
        var selected = this.option.selected;
        zrUtil.each(data, function (dataItem) {
            var name = dataItem.get('name', true);
            // Initially, default value is true
            if (!selected.hasOwnProperty(name)) {
                selected[name] = true;
            }
            selected[name] = !selected[name];
        });
    },

    /**
     * @param {string} name
     */
    isSelected: function (name) {
        var selected = this.option.selected;
        return !(selected.hasOwnProperty(name) && !selected[name])
            && zrUtil.indexOf(this._availableNames, name) >= 0;
    },

    getOrient: function () {
        return this.get('orient') === 'vertical'
            ? {index: 1, name: 'vertical'}
            : {index: 0, name: 'horizontal'};
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

        top: 0,
        // bottom: null,

        // 水平对齐
        // 'auto' | 'left' | 'right'
        // 默认为 'auto', 根据 x 的位置判断是左对齐还是右对齐
        align: 'auto',

        backgroundColor: 'rgba(0,0,0,0)',
        // 图例边框颜色
        borderColor: '#ccc',
        borderRadius: 0,
        // 图例边框线宽，单位px，默认为0（无边框）
        borderWidth: 0,
        // 图例内边距，单位px，默认各方向内边距为5，
        // 接受数组分别设定上右下左边距，同css
        padding: 5,
        // 各个item之间的间隔，单位px，默认为10，
        // 横向布局时为水平间隔，纵向布局时为纵向间隔
        itemGap: 10,
        // the width of legend symbol
        itemWidth: 25,
        // the height of legend symbol
        itemHeight: 14,

        // the color of unselected legend symbol
        inactiveColor: '#ccc',

        // the borderColor of unselected legend symbol
        inactiveBorderColor: '#ccc',

        itemStyle: {
            // the default borderWidth of legend symbol
            borderWidth: 0
        },

        textStyle: {
            // 图例文字颜色
            color: '#333'
        },
        // formatter: '',
        // 选择模式，默认开启图例开关
        selectedMode: true,
        // 配置默认选中状态，可配合LEGEND.SELECTED事件做动态数据载入
        // selected: null,
        // 图例内容（详见legend.data，数组中每一项代表一个item
        // data: [],

        // Usage:
        // selector: [{type: 'all or inverse', title: xxx}]
        // or
        // selector: true
        // or
        // selector: ['all', 'inverse']
        selector: false,

        selectorLabel: {
            show: true,
            borderRadius: 10,
            padding: [3, 5, 3, 5],
            fontSize: 12,
            fontFamily: ' sans-serif',
            color: '#666',
            borderWidth: 1,
            borderColor: '#666'
        },

        emphasis: {
            selectorLabel: {
                show: true,
                color: '#eee',
                backgroundColor: '#666'
            }
        },

        // Value can be 'start' or 'end'
        selectorPosition: 'auto',

        selectorItemGap: 7,

        selectorButtonGap: 10,

        // Tooltip 相关配置
        tooltip: {
            show: false
        }
    }
});

export default LegendModel;