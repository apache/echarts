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

import * as zrUtil from 'zrender/src/core/util';
import axisDefault from '../axisDefault';
import Model from '../../model/Model';
import {AxisModelCommonMixin} from '../axisModelCommonMixin';
import ComponentModel from '../../model/Component';
import {
    ComponentOption,
    CircleLayoutOptionMixin,
    LabelOption,
    ColorString
} from '../../util/types';
import { AxisBaseOption } from '../axisCommonTypes';
import { AxisBaseModel } from '../AxisBaseModel';
import Radar from './Radar';
import {CoordinateSystemHostModel} from '../../coord/CoordinateSystem';

const valueAxisDefault = axisDefault.value;

function defaultsShow(opt: object, show: boolean) {
    return zrUtil.defaults({
        show: show
    }, opt);
}

export interface RadarIndicatorOption {
    text?: string
    min?: number
    max?: number
    color?: ColorString

    axisType?: 'value' | 'log'
}

export interface RadarOption extends ComponentOption, CircleLayoutOptionMixin {
    mainType?: 'radar'

    startAngle?: number

    shape?: 'polygon' | 'circle'

    // TODO. axisType seems to have issue.
    // axisType?: 'value' | 'log'

    axisLine?: AxisBaseOption['axisLine']
    axisTick?: AxisBaseOption['axisTick']
    axisLabel?: AxisBaseOption['axisLabel']
    splitLine?: AxisBaseOption['splitLine']
    splitArea?: AxisBaseOption['splitArea']

    // TODO Use axisName?
    axisName?: {
        show?: boolean
        formatter?: string | ((name?: string, indicatorOpt?: InnerIndicatorAxisOption) => string)
    } & LabelOption
    axisNameGap?: number

    triggerEvent?: boolean

    scale?: boolean
    splitNumber?: number

    boundaryGap?: AxisBaseOption['boundaryGap']

    indicator?: RadarIndicatorOption[]
}

export interface InnerIndicatorAxisOption extends AxisBaseOption {
    // TODO Use type?
    // axisType?: 'value' | 'log'
}

class RadarModel extends ComponentModel<RadarOption> implements CoordinateSystemHostModel {
    static readonly type = 'radar';
    readonly type = RadarModel.type;

    coordinateSystem: Radar;

    private _indicatorModels: AxisBaseModel<InnerIndicatorAxisOption>[];

    optionUpdated() {
        const boundaryGap = this.get('boundaryGap');
        const splitNumber = this.get('splitNumber');
        const scale = this.get('scale');
        const axisLine = this.get('axisLine');
        const axisTick = this.get('axisTick');
        // let axisType = this.get('axisType');
        const axisLabel = this.get('axisLabel');
        const nameTextStyle = this.get('axisName');
        const showName = this.get(['axisName', 'show']);
        const nameFormatter = this.get(['axisName', 'formatter']);
        const nameGap = this.get('axisNameGap');
        const triggerEvent = this.get('triggerEvent');

        const indicatorModels = zrUtil.map(this.get('indicator') || [], function (indicatorOpt) {
            // PENDING
            if (indicatorOpt.max != null && indicatorOpt.max > 0 && !indicatorOpt.min) {
                indicatorOpt.min = 0;
            }
            else if (indicatorOpt.min != null && indicatorOpt.min < 0 && !indicatorOpt.max) {
                indicatorOpt.max = 0;
            }
            let iNameTextStyle = nameTextStyle;
            if (indicatorOpt.color != null) {
                iNameTextStyle = zrUtil.defaults({
                    color: indicatorOpt.color
                }, nameTextStyle);
            }
            // Use same configuration
            const innerIndicatorOpt: InnerIndicatorAxisOption = zrUtil.merge(zrUtil.clone(indicatorOpt), {
                boundaryGap: boundaryGap,
                splitNumber: splitNumber,
                scale: scale,
                axisLine: axisLine,
                axisTick: axisTick,
                // axisType: axisType,
                axisLabel: axisLabel,
                // Compatible with 2 and use text
                name: indicatorOpt.text,
                nameLocation: 'end',
                nameGap: nameGap,
                // min: 0,
                nameTextStyle: iNameTextStyle,
                triggerEvent: triggerEvent
            } as InnerIndicatorAxisOption, false);
            if (!showName) {
                innerIndicatorOpt.name = '';
            }
            if (typeof nameFormatter === 'string') {
                const indName = innerIndicatorOpt.name;
                innerIndicatorOpt.name = nameFormatter.replace('{value}', indName != null ? indName : '');
            }
            else if (typeof nameFormatter === 'function') {
                innerIndicatorOpt.name = nameFormatter(
                    innerIndicatorOpt.name, innerIndicatorOpt
                );
            }

            const model = new Model(innerIndicatorOpt, null, this.ecModel) as AxisBaseModel<InnerIndicatorAxisOption>;
            zrUtil.mixin(model, AxisModelCommonMixin.prototype);
            // For triggerEvent.
            model.mainType = 'radar';
            model.componentIndex = this.componentIndex;

            return model;
        }, this);

        this._indicatorModels = indicatorModels;
    }

    getIndicatorModels() {
        return this._indicatorModels;
    }

    static defaultOption: RadarOption = {

        zlevel: 0,

        z: 0,

        center: ['50%', '50%'],

        radius: '75%',

        startAngle: 90,

        axisName: {
            show: true
            // formatter: null
            // textStyle: {}
        },

        boundaryGap: [0, 0],

        splitNumber: 5,

        axisNameGap: 15,

        scale: false,

        // Polygon or circle
        shape: 'polygon',

        axisLine: zrUtil.merge(
            {
                lineStyle: {
                    color: '#bbb'
                }
            },
            valueAxisDefault.axisLine
        ),
        axisLabel: defaultsShow(valueAxisDefault.axisLabel, false),
        axisTick: defaultsShow(valueAxisDefault.axisTick, false),
        // axisType: 'value',
        splitLine: defaultsShow(valueAxisDefault.splitLine, true),
        splitArea: defaultsShow(valueAxisDefault.splitArea, true),

        // {text, min, max}
        indicator: []
    };
}

export default RadarModel;
