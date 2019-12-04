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
import createListSimply from '../helper/createListSimply';
import * as zrUtil from 'zrender/src/core/util';
import * as modelUtil from '../../util/model';
import {getPercentWithPrecision} from '../../util/number';
import dataSelectableMixin from '../../component/helper/selectableMixin';
import {retrieveRawAttr} from '../../data/helper/dataProvider';
import {makeSeriesEncodeForNameBased} from '../../data/helper/sourceHelper';
import LegendVisualProvider from '../../visual/LegendVisualProvider';


var PieSeries = echarts.extendSeriesModel({

    type: 'series.pie',

    // Overwrite
    init: function (option) {
        PieSeries.superApply(this, 'init', arguments);

        // Enable legend selection for each data item
        // Use a function instead of direct access because data reference may changed
        this.legendVisualProvider = new LegendVisualProvider(
            zrUtil.bind(this.getData, this), zrUtil.bind(this.getRawData, this)
        );

        this.updateSelectedMap(this._createSelectableList());

        this._defaultLabelLine(option);
    },

    // Overwrite
    mergeOption: function (newOption) {
        PieSeries.superCall(this, 'mergeOption', newOption);

        this.updateSelectedMap(this._createSelectableList());
    },

    getInitialData: function (option, ecModel) {
        return createListSimply(this, {
            coordDimensions: ['value'],
            encodeDefaulter: zrUtil.curry(makeSeriesEncodeForNameBased, this)
        });
    },

    _createSelectableList: function () {
        var data = this.getRawData();
        var valueDim = data.mapDimension('value');
        var targetList = [];
        for (var i = 0, len = data.count(); i < len; i++) {
            targetList.push({
                name: data.getName(i),
                value: data.get(valueDim, i),
                selected: retrieveRawAttr(data, i, 'selected')
            });
        }
        return targetList;
    },

    // Overwrite
    getDataParams: function (dataIndex) {
        var data = this.getData();
        var params = PieSeries.superCall(this, 'getDataParams', dataIndex);
        // FIXME toFixed?

        var valueList = [];
        data.each(data.mapDimension('value'), function (value) {
            valueList.push(value);
        });

        params.percent = getPercentWithPrecision(
            valueList,
            dataIndex,
            data.hostModel.get('percentPrecision')
        );

        params.$vars.push('percent');
        return params;
    },

    _defaultLabelLine: function (option) {
        // Extend labelLine emphasis
        modelUtil.defaultEmphasis(option, 'labelLine', ['show']);

        var labelLineNormalOpt = option.labelLine;
        var labelLineEmphasisOpt = option.emphasis.labelLine;
        // Not show label line if `label.normal.show = false`
        labelLineNormalOpt.show = labelLineNormalOpt.show
            && option.label.show;
        labelLineEmphasisOpt.show = labelLineEmphasisOpt.show
            && option.emphasis.label.show;
    },

    defaultOption: {
        zlevel: 0,
        z: 2,
        legendHoverLink: true,

        hoverAnimation: true,
        // 默认全局居中
        center: ['50%', '50%'],
        radius: [0, '75%'],
        // 默认顺时针
        clockwise: true,
        startAngle: 90,
        // 最小角度改为0
        minAngle: 0,

        // If the angle of a sector less than `minShowLabelAngle`,
        // the label will not be displayed.
        minShowLabelAngle: 0,

        // 选中时扇区偏移量
        selectedOffset: 10,
        // 高亮扇区偏移量
        hoverOffset: 10,

        // If use strategy to avoid label overlapping
        avoidLabelOverlap: true,
        // 选择模式，默认关闭，可选single，multiple
        // selectedMode: false,
        // 南丁格尔玫瑰图模式，'radius'（半径） | 'area'（面积）
        // roseType: null,

        percentPrecision: 2,

        // If still show when all data zero.
        stillShowZeroSum: true,

        // cursor: null,

        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: null,
        height: null,

        label: {
            // If rotate around circle
            rotate: false,
            show: true,
            // 'outer', 'inside', 'center'
            position: 'outer',
            // 'none', 'labelLine', 'edge'. Works only when position is 'outer'
            alignTo: 'none',
            // Closest distance between label and chart edge.
            // Works only position is 'outer' and alignTo is 'edge'.
            margin: '25%',
            // Works only position is 'outer' and alignTo is not 'edge'.
            bleedMargin: 10,
            // Distance between text and label line.
            distanceToLabelLine: 5
            // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
            // 默认使用全局文本样式，详见TEXTSTYLE
            // distance: 当position为inner时有效，为label位置到圆心的距离与圆半径(环状图为内外半径和)的比例系数
        },
        // Enabled when label.normal.position is 'outer'
        labelLine: {
            show: true,
            // 引导线两段中的第一段长度
            length: 15,
            // 引导线两段中的第二段长度
            length2: 15,
            smooth: false,
            lineStyle: {
                // color: 各异,
                width: 1,
                type: 'solid'
            }
        },
        itemStyle: {
            borderWidth: 1
        },

        // Animation type. Valid values: expansion, scale
        animationType: 'expansion',

        // Animation type when update. Valid values: transition, expansion
        animationTypeUpdate: 'transition',

        animationEasing: 'cubicOut'
    }
});

zrUtil.mixin(PieSeries, dataSelectableMixin);

export default PieSeries;