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
import createSeriesData from '../helper/createSeriesData';
import {
    SeriesOption,
    SeriesOnCartesianOptionMixin,
    SeriesOnPolarOptionMixin,
    ScaleDataValue,
    DefaultStatesMixin,
    StatesMixinBase
} from '../../util/types';
import GlobalModel from '../../model/Global';
import Cartesian2D from '../../coord/cartesian/Cartesian2D';
import SeriesData from '../../data/SeriesData';
import {dimPermutations} from '../../component/marker/MarkAreaView';
import { each } from 'zrender/src/core/util';
import type Axis2D from '../../coord/cartesian/Axis2D';


export interface BaseBarSeriesOption<StateOption, ExtraStateOption extends StatesMixinBase = DefaultStatesMixin>
    extends SeriesOption<StateOption, ExtraStateOption>,
    SeriesOnCartesianOptionMixin,
    SeriesOnPolarOptionMixin {

    /**
     * Min height of bar
     */
    barMinHeight?: number
    /**
     * Min angle of bar. Available on polar coordinate system.
     */
    barMinAngle?: number

    /**
     * Max width of bar. Defaults to 1 on cartesian coordinate system. Otherwise it's null.
     */
    barMaxWidth?: number

    barMinWidth?: number

    /**
     * Bar width. Will be calculated automatically.
     * Can be pixel width or percent string.
     */
    barWidth?: number | string

    /**
     * Gap between each bar inside category. Default to be 30%. Can be an aboslute pixel value
     */
    barGap?: string | number

    /**
     * Gap between each category. Default to be 20%. can be an absolute pixel value.
     */
    barCategoryGap?: string | number

    large?: boolean
    largeThreshold?: number
}

class BaseBarSeriesModel<Opts extends BaseBarSeriesOption<unknown> = BaseBarSeriesOption<unknown>>
    extends SeriesModel<Opts> {

    static type = 'series.__base_bar__';
    type = BaseBarSeriesModel.type;

    getInitialData(option: Opts, ecModel: GlobalModel): SeriesData {
        return createSeriesData(null, this, {useEncodeDefaulter: true});
    }

    getMarkerPosition(
        value: ScaleDataValue[],
        dims?: typeof dimPermutations[number],
        startingAtTick?: boolean
    ) {
        const coordSys = this.coordinateSystem;
        if (coordSys && coordSys.clampData) {
            // PENDING if clamp ?
            const clampData = coordSys.clampData(value);
            const pt = coordSys.dataToPoint(clampData);
            if (startingAtTick) {
                each(coordSys.getAxes(), function (axis: Axis2D, idx: number) {
                    // If axis type is category, use tick coords instead
                    if (axis.type === 'category' && dims != null) {
                        const tickCoords = axis.getTicksCoords();

                        let targetTickId = clampData[idx];
                        // The index of rightmost tick of markArea is 1 larger than x1/y1 index
                        const isEnd = dims[idx] === 'x1' || dims[idx] === 'y1';
                        if (isEnd) {
                            targetTickId += 1;
                        }

                        // The only contains one tick, tickCoords is
                        // like [{coord: 0, tickValue: 0}, {coord: 0}]
                        // to the length should always be larger than 1
                        if (tickCoords.length < 2) {
                            return;
                        }
                        else if (tickCoords.length === 2) {
                            // The left value and right value of the axis are
                            // the same. coord is 0 in both items. Use the max
                            // value of the axis as the coord
                            pt[idx] = axis.toGlobalCoord(
                                axis.getExtent()[isEnd ? 1 : 0]
                            );
                            return;
                        }

                        let leftCoord;
                        let coord;
                        let stepTickValue = 1;
                        for (let i = 0; i < tickCoords.length; i++) {
                            const tickCoord = tickCoords[i].coord;
                            // The last item of tickCoords doesn't contain
                            // tickValue
                            const tickValue = i === tickCoords.length - 1
                                ? tickCoords[i - 1].tickValue + stepTickValue
                                : tickCoords[i].tickValue;
                            if (tickValue === targetTickId) {
                                coord = tickCoord;
                                break;
                            }
                            else if (tickValue < targetTickId) {
                                leftCoord = tickCoord;
                            }
                            else if (leftCoord != null && tickValue > targetTickId) {
                                coord = (tickCoord + leftCoord) / 2;
                                break;
                            }
                            if (i === 1) {
                                // Here we assume the step of category axes is
                                // the same
                                stepTickValue = tickValue - tickCoords[0].tickValue;
                            }
                        }
                        if (coord == null) {
                            if (!leftCoord) {
                                // targetTickId is smaller than all tick ids in the
                                // visible area, use the leftmost tick coord
                                coord = tickCoords[0].coord;
                            }
                            else if (leftCoord) {
                                // targetTickId is larger than all tick ids in the
                                // visible area, use the rightmost tick coord
                                coord = tickCoords[tickCoords.length - 1].coord;
                            }
                        }
                        pt[idx] = axis.toGlobalCoord(coord);
                    }
                });
            }
            else {
                const data = this.getData();
                const offset = data.getLayout('offset');
                const size = data.getLayout('size');
                const offsetIndex = (coordSys as Cartesian2D).getBaseAxis().isHorizontal() ? 0 : 1;
                pt[offsetIndex] += offset + size / 2;
            }
            return pt;
        }
        return [NaN, NaN];
    }

    static defaultOption: BaseBarSeriesOption<unknown, unknown> = {
        // zlevel: 0,
        z: 2,
        coordinateSystem: 'cartesian2d',
        legendHoverLink: true,
        // stack: null

        // Cartesian coordinate system
        // xAxisIndex: 0,
        // yAxisIndex: 0,

        barMinHeight: 0,
        barMinAngle: 0,
        // cursor: null,

        large: false,
        largeThreshold: 400,
        progressive: 3e3,
        progressiveChunkMode: 'mod'
    };
}

SeriesModel.registerClass(BaseBarSeriesModel);

export default BaseBarSeriesModel;
