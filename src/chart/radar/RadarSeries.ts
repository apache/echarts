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

import SeriesModel from '../../model/Series';
import createListSimply from '../helper/createListSimply';
import * as zrUtil from 'zrender/src/core/util';
import {encodeHTML} from '../../util/format';
import LegendVisualProvider from '../../visual/LegendVisualProvider';
import {
    SeriesOption,
    LineStyleOption,
    LabelOption,
    SymbolOptionMixin,
    ItemStyleOption,
    AreaStyleOption,
    OptionDataValue
} from '../../util/types';
import GlobalModel from '../../model/Global';
import List from '../../data/List';
import Radar from '../../coord/radar/Radar';

type RadarSeriesDataValue = OptionDataValue[];

export interface RadarSeriesDataItemOption extends SymbolOptionMixin {
    lineStyle?: LineStyleOption
    areaStyle?: AreaStyleOption
    label?: LabelOption
    itemStyle?: ItemStyleOption

    emphasis?: {
        lineStyle?: LineStyleOption
        areaStyle?: AreaStyleOption
        label?: LabelOption
        itemStyle?: ItemStyleOption
    }

    value?: RadarSeriesDataValue
}

export interface RadarSeriesOption extends SeriesOption, SymbolOptionMixin {
    type?: 'radar'
    coordinateSystem: 'radar'

    radarIndex?: number
    radarId?: string

    lineStyle?: LineStyleOption
    areaStyle?: AreaStyleOption
    label?: LabelOption
    itemStyle?: ItemStyleOption

    emphasis?: {
        lineStyle?: LineStyleOption
        areaStyle?: AreaStyleOption
        label?: LabelOption
        itemStyle?: ItemStyleOption
    }
}

class RadarSeriesModel extends SeriesModel<RadarSeriesOption> {

    static readonly type = 'series.radar'
    readonly type = RadarSeriesModel.type

    static dependencies = ['radar']

    coordinateSystem: Radar

    // Overwrite
    init(option: RadarSeriesOption) {
        super.init.apply(this, arguments as any);

        // Enable legend selection for each data item
        // Use a function instead of direct access because data reference may changed
        this.legendVisualProvider = new LegendVisualProvider(
            zrUtil.bind(this.getData, this), zrUtil.bind(this.getRawData, this)
        );

    }

    getInitialData(option: RadarSeriesOption, ecModel: GlobalModel): List {
        return createListSimply(this, {
            generateCoord: 'indicator_',
            generateCoordCount: Infinity
        });
    }

    formatTooltip(dataIndex: number) {
        var data = this.getData();
        var coordSys = this.coordinateSystem;
        var indicatorAxes = coordSys.getIndicatorAxes();
        var name = this.getData().getName(dataIndex);
        return encodeHTML(name === '' ? this.name : name) + '<br/>'
            + zrUtil.map(indicatorAxes, function (axis, idx) {
                var val = data.get(data.mapDimension(axis.dim), dataIndex);
                return encodeHTML(axis.name + ' : ' + val);
            }).join('<br />');
    }

    /**
     * @implement
     */
    getTooltipPosition(dataIndex: number) {
        if (dataIndex != null) {
            var data = this.getData();
            var coordSys = this.coordinateSystem;
            var values = data.getValues(
                zrUtil.map(coordSys.dimensions, function (dim) {
                    return data.mapDimension(dim);
                }), dataIndex
            );

            for (var i = 0, len = values.length; i < len; i++) {
                if (!isNaN(values[i] as number)) {
                    var indicatorAxes = coordSys.getIndicatorAxes();
                    return coordSys.coordToPoint(indicatorAxes[i].dataToCoord(values[i]), i);
                }
            }
        }
    }

    static defaultOption: RadarSeriesOption = {
        zlevel: 0,
        z: 2,
        coordinateSystem: 'radar',
        legendHoverLink: true,
        radarIndex: 0,
        lineStyle: {
            width: 2,
            type: 'solid'
        },
        label: {
            position: 'top'
        },
        // areaStyle: {
        // },
        // itemStyle: {}
        symbol: 'emptyCircle',
        symbolSize: 4
        // symbolRotate: null
    }
}

SeriesModel.registerClass(RadarSeriesModel);

export default RadarSeriesModel;