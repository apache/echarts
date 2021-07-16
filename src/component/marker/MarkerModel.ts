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
import env from 'zrender/src/core/env';
import { DataFormatMixin } from '../../model/mixin/dataFormat';
import ComponentModel from '../../model/Component';
import SeriesModel from '../../model/Series';
import {
    DisplayStateHostOption,
    ComponentOption,
    AnimationOptionMixin,
    Dictionary,
    CommonTooltipOption,
    ScaleDataValue
} from '../../util/types';
import Model from '../../model/Model';
import GlobalModel from '../../model/Global';
import SeriesData from '../../data/SeriesData';
import { makeInner, defaultEmphasis } from '../../util/model';
import { createTooltipMarkup } from '../tooltip/tooltipMarkup';

function fillLabel(opt: DisplayStateHostOption) {
    defaultEmphasis(opt, 'label', ['show']);
}

export type MarkerStatisticType = 'average' | 'min' | 'max' | 'median';

/**
 * Option to specify where to put the marker.
 */
export interface MarkerPositionOption {
    // Priority: x/y > coord(xAxis, yAxis) > type

    // Absolute position, px or percent string
    x?: number | string
    y?: number | string

    /**
     * Coord on any coordinate system
     */
    coord?: (ScaleDataValue | MarkerStatisticType)[]

    // On cartesian coordinate system
    xAxis?: ScaleDataValue
    yAxis?: ScaleDataValue

    // On polar coordinate system
    radiusAxis?: ScaleDataValue
    angleAxis?: ScaleDataValue

    // Use statistic method
    type?: MarkerStatisticType
    /**
     * When using statistic method with type.
     * valueIndex and valueDim can be specify which dim the statistic is used on.
     */
    valueIndex?: number
    valueDim?: string


    /**
     * Value to be displayed as label. Totally optional
     */
    value?: string | number
}

export interface MarkerOption extends ComponentOption, AnimationOptionMixin {

    silent?: boolean

    data?: unknown[]

    tooltip?: CommonTooltipOption<unknown> & {
        trigger?: 'item' | 'axis' | boolean | 'none'
    }
}

// { [componentType]: MarkerModel }
const inner = makeInner<Dictionary<MarkerModel>, SeriesModel>();

abstract class MarkerModel<Opts extends MarkerOption = MarkerOption> extends ComponentModel<Opts> {

    static type = 'marker';
    type = MarkerModel.type;

    /**
     * If marker model is created by self from series
     */
    createdBySelf = false;

    static readonly dependencies = ['series', 'grid', 'polar', 'geo'];

    __hostSeries: SeriesModel;

    private _data: SeriesData;

    /**
     * @overrite
     */
    init(option: Opts, parentModel: Model, ecModel: GlobalModel) {

        if (__DEV__) {
            if (this.type === 'marker') {
                throw new Error('Marker component is abstract component. Use markLine, markPoint, markArea instead.');
            }
        }
        this.mergeDefaultAndTheme(option, ecModel);
        this._mergeOption(option, ecModel, false, true);
    }

    isAnimationEnabled(): boolean {
        if (env.node) {
            return false;
        }

        const hostSeries = this.__hostSeries;
        return this.getShallow('animation') && hostSeries && hostSeries.isAnimationEnabled();
    }

    /**
     * @overrite
     */
    mergeOption(newOpt: Opts, ecModel: GlobalModel) {
        this._mergeOption(newOpt, ecModel, false, false);
    }

    _mergeOption(newOpt: Opts, ecModel: GlobalModel, createdBySelf?: boolean, isInit?: boolean) {
        const componentType = this.mainType;
        if (!createdBySelf) {
            ecModel.eachSeries(function (seriesModel) {

                // mainType can be markPoint, markLine, markArea
                const markerOpt = seriesModel.get(
                    this.mainType as any, true
                ) as Opts;

                let markerModel = inner(seriesModel)[componentType];
                if (!markerOpt || !markerOpt.data) {
                    inner(seriesModel)[componentType] = null;
                    return;
                }
                if (!markerModel) {
                    if (isInit) {
                        // Default label emphasis `position` and `show`
                        fillLabel(markerOpt);
                    }
                    zrUtil.each(markerOpt.data, function (item) {
                        // FIXME Overwrite fillLabel method ?
                        if (item instanceof Array) {
                            fillLabel(item[0]);
                            fillLabel(item[1]);
                        }
                        else {
                            fillLabel(item);
                        }
                    });

                    markerModel = this.createMarkerModelFromSeries(
                        markerOpt, this, ecModel
                    );
                    // markerModel = new ImplementedMarkerModel(
                    //     markerOpt, this, ecModel
                    // );

                    zrUtil.extend(markerModel, {
                        mainType: this.mainType,
                        // Use the same series index and name
                        seriesIndex: seriesModel.seriesIndex,
                        name: seriesModel.name,
                        createdBySelf: true
                    });

                    markerModel.__hostSeries = seriesModel;
                }
                else {
                    markerModel._mergeOption(markerOpt, ecModel, true);
                }
                inner(seriesModel)[componentType] = markerModel;
            }, this);
        }
    }

    formatTooltip(
        dataIndex: number,
        multipleSeries: boolean,
        dataType: string
    ) {
        const data = this.getData();
        const value = this.getRawValue(dataIndex);
        const itemName = data.getName(dataIndex);

        return createTooltipMarkup('section', {
            header: this.name,
            blocks: [createTooltipMarkup('nameValue', {
                name: itemName,
                value: value,
                noName: !itemName,
                noValue: value == null
            })]
        });
    }

    getData(): SeriesData<this> {
        return this._data as SeriesData<this>;
    }

    setData(data: SeriesData) {
        this._data = data;
    }

    /**
     * Create slave marker model from series.
     */
    abstract createMarkerModelFromSeries(
        markerOpt: Opts,
        masterMarkerModel: MarkerModel,
        ecModel: GlobalModel
    ): MarkerModel;

    static getMarkerModelFromSeries(
        seriesModel: SeriesModel,
        // Support three types of markers. Strict check.
        componentType: 'markLine' | 'markPoint' | 'markArea'
    ) {
        return inner(seriesModel)[componentType];
    }
}

interface MarkerModel<Opts extends MarkerOption = MarkerOption> extends DataFormatMixin {}
zrUtil.mixin(MarkerModel, DataFormatMixin.prototype);

export default MarkerModel;