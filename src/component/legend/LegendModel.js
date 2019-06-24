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

var langTitle = lang.legendSelector.title;

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
        var defaultSelectorOption = {
            all: {
                type: 'all',
                icon: 'M421.65 752.94h-60.24v60.24c0 18.07 12.05 30.12 30.12 30.12h421.65c18.07 0 30.12-12.05 30.12-30.12V391.53c0-18.07-12.05-30.12-30.12-30.12h-60.24v361.42c0 18.07-12.05 30.12-30.12 30.12H421.65z m271.06-572.23H210.82c-18.07 0-30.12 12.05-30.12 30.12v481.88c0 18.07 12.05 30.12 30.12 30.12h481.89c18.07 0 30.12-12.05 30.12-30.12V210.82c-0.01-18.07-12.05-30.11-30.12-30.11zM30.12 421.65c18.07 0 30.12-12.05 30.12-30.12V60.24h331.29c18.07 0 30.12-12.05 30.12-30.12S409.6 0 391.53 0H30.12C12.05 0 0 12.05 0 30.12v361.41c0 18.07 12.05 30.12 30.12 30.12z m361.41 542.11H60.24V632.47c0-18.07-12.05-30.12-30.12-30.12S0 614.4 0 632.47v361.41c0 18.07 12.05 30.12 30.12 30.12h361.41c18.07 0 30.12-12.05 30.12-30.12s-12.05-30.12-30.12-30.12z m602.35-361.41c-18.07 0-30.12 12.05-30.12 30.12v331.29H632.47c-18.07 0-30.12 12.05-30.12 30.12S614.4 1024 632.47 1024h361.41c18.07 0 30.12-12.05 30.12-30.12V632.47c0-18.07-12.05-30.12-30.12-30.12z m0-602.35H512c-18.07 0-30.12 12.05-30.12 30.12S493.93 60.24 512 60.24h451.76v331.29c0 18.07 12.05 30.12 30.12 30.12S1024 409.6 1024 391.53V30.12C1024 12.05 1011.95 0 993.88 0z',
                title: zrUtil.clone(langTitle.all)
            },
            inverse: {
                type: 'inverse',
                icon: 'M843.29 331.28v481.9c0 16.65-13.47 30.12-30.12 30.12H331.3c-16.65 0-30.12-13.47-30.12-30.12v-60.23h421.63c16.65 0 30.12-13.47 30.12-30.12V301.17h60.23c16.65 0 30.13 13.47 30.13 30.11zM722.82 692.72v-481.9c0-16.65-13.47-30.12-30.12-30.12H210.83c-16.65 0-30.12 13.47-30.12 30.12v481.9c0 16.65 13.47 30.12 30.12 30.12H692.7c16.65-0.01 30.12-13.48 30.12-30.12zM240.95 240.93h421.63V662.6H240.95V240.93zM60.25 391.52V60.23h331.28c16.65 0 30.12-13.47 30.12-30.12S408.18 0 391.53 0H30.13C13.48 0 0.01 13.47 0.01 30.12v361.4c0 16.65 13.47 30.12 30.12 30.12s30.12-13.48 30.12-30.12z m361.4 602.36c0-16.65-13.47-30.12-30.12-30.12H60.25V632.48c0-16.65-13.47-30.12-30.12-30.12S0.01 615.84 0.01 632.48v361.4c0 16.65 13.47 30.12 30.12 30.12h361.4c16.65 0 30.12-13.47 30.12-30.12z m602.34 0v-361.4c0-16.65-13.47-30.12-30.12-30.12s-30.12 13.47-30.12 30.12v331.28H632.47c-16.65 0-30.12 13.47-30.12 30.12s13.47 30.12 30.12 30.12h361.4c16.65 0 30.12-13.47 30.12-30.12z m0-602.36V30.12c0-16.65-13.47-30.12-30.12-30.12h-361.4c-16.65 0-30.12 13.47-30.12 30.12s13.47 30.12 30.12 30.12h331.28v331.28c0 16.65 13.47 30.12 30.12 30.12 16.65-0.01 30.12-13.48 30.12-30.12z',
                title: zrUtil.clone(langTitle.inverse)
            }
        };

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
        // 图例图形宽度
        itemWidth: 25,
        // 图例图形高度
        itemHeight: 14,

        // 图例关闭时候的颜色
        inactiveColor: '#ccc',

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
        // selector: [{type: 'all or inverse', icon: 'xxx', title: xxx}]
        // or
        // selector: true
        // or
        // selector: ['all', 'inverse']
        selector: false,

        selectorIconStyle: {
            color: null,
            borderColor: '#666666',
            borderWidth: 1
            // shadowBlur: null,
            // shadowColor: null,
            // shadowOffsetX: 0,
            // shadowOffsetY: 0,
            // opacity: 1
        },

        selectorIconSize: 14,

        selectorTextStyle: {
            show: false,
            position: 'auto',
            color: '#666666'
        },

        emphasis: {
            selectorIconStyle: {
                borderColor: '#4EADDE',
                color: '#4EADDE'
            },
            selectorTextStyle: {
                backgroundColor: 'rgba(50,50,50,0.7)',

                padding: 3,
                show: true,
                position: 'auto',
                color: '#fff'
            }
        },

        // Value can be 'start' or 'end'
        selectorPosition: 'auto',

        selectorItemGap: 7,

        selectorLegendContentGap: 10,

        selectorBorderGap: 1,

        // Tooltip 相关配置
        tooltip: {
            show: false
        }
    }
});

export default LegendModel;