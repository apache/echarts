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

// TODO Axis scale

import {__DEV__} from '../../config';
import * as zrUtil from 'zrender/src/core/util';
import Polar from './Polar';
import {parsePercent} from '../../util/number';
import {
    createScaleByModel,
    niceScaleExtent
} from '../../coord/axisHelper';
import CoordinateSystem from '../../CoordinateSystem';
import {getStackedDimension} from '../../data/helper/dataStackHelper';

import PolarModel from './PolarModel';
import ExtensionAPI from '../../ExtensionAPI';
import GlobalModel from '../../model/Global';
import OrdinalScale from '../../scale/Ordinal';
import RadiusAxis from './RadiusAxis';
import AngleAxis from './AngleAxis';
import { PolarAxisModel, AngleAxisModel, RadiusAxisModel } from './AxisModel';
import SeriesModel from '../../model/Series';
import { SeriesOption } from '../../util/types';

/**
 * Resize method bound to the polar
 */
function resizePolar(polar: Polar, polarModel: PolarModel, api: ExtensionAPI) {
    let center = polarModel.get('center');
    let width = api.getWidth();
    let height = api.getHeight();

    polar.cx = parsePercent(center[0], width);
    polar.cy = parsePercent(center[1], height);

    let radiusAxis = polar.getRadiusAxis();
    let size = Math.min(width, height) / 2;

    let radius = polarModel.get('radius');
    if (radius == null) {
        radius = [0, '100%'];
    }
    else if (!zrUtil.isArray(radius)) {
        // r0 = 0
        radius = [0, radius];
    }
    const parsedRadius = [
        parsePercent(radius[0], size),
        parsePercent(radius[1], size)
    ];

    radiusAxis.inverse
        ? radiusAxis.setExtent(parsedRadius[1], parsedRadius[0])
        : radiusAxis.setExtent(parsedRadius[0], parsedRadius[1]);
}

/**
 * Update polar
 */
function updatePolarScale(this: Polar, ecModel: GlobalModel, api: ExtensionAPI) {
    let polar = this;
    let angleAxis = polar.getAngleAxis();
    let radiusAxis = polar.getRadiusAxis();
    // Reset scale
    angleAxis.scale.setExtent(Infinity, -Infinity);
    radiusAxis.scale.setExtent(Infinity, -Infinity);

    ecModel.eachSeries(function (seriesModel) {
        if (seriesModel.coordinateSystem === polar) {
            let data = seriesModel.getData();
            zrUtil.each(data.mapDimension('radius', true), function (dim) {
                radiusAxis.scale.unionExtentFromData(
                    data, getStackedDimension(data, dim)
                );
            });
            zrUtil.each(data.mapDimension('angle', true), function (dim) {
                angleAxis.scale.unionExtentFromData(
                    data, getStackedDimension(data, dim)
                );
            });
        }
    });

    niceScaleExtent(angleAxis.scale, angleAxis.model);
    niceScaleExtent(radiusAxis.scale, radiusAxis.model);

    // Fix extent of category angle axis
    if (angleAxis.type === 'category' && !angleAxis.onBand) {
        let extent = angleAxis.getExtent();
        let diff = 360 / (angleAxis.scale as OrdinalScale).count();
        angleAxis.inverse ? (extent[1] += diff) : (extent[1] -= diff);
        angleAxis.setExtent(extent[0], extent[1]);
    }
}

function isAngleAxisModel(axisModel: AngleAxisModel | PolarAxisModel): axisModel is AngleAxisModel {
    return axisModel.mainType === 'angleAxis';
}
/**
 * Set common axis properties
 */
function setAxis(axis: RadiusAxis | AngleAxis, axisModel: PolarAxisModel) {
    axis.type = axisModel.get('type');
    axis.scale = createScaleByModel(axisModel);
    axis.onBand = axisModel.get('boundaryGap') && axis.type === 'category';
    axis.inverse = axisModel.get('inverse');

    if (isAngleAxisModel(axisModel)) {
        axis.inverse = axis.inverse !== axisModel.get('clockwise');
        let startAngle = axisModel.get('startAngle');
        axis.setExtent(startAngle, startAngle + (axis.inverse ? -360 : 360));
    }

    // Inject axis instance
    axisModel.axis = axis;
    axis.model = axisModel as AngleAxisModel | RadiusAxisModel;
}


const polarCreator = {

    dimensions: Polar.prototype.dimensions,

    create: function (ecModel: GlobalModel, api: ExtensionAPI) {
        let polarList: Polar[] = [];
        ecModel.eachComponent('polar', function (polarModel: PolarModel, idx: number) {
            let polar = new Polar(idx + '');
            // Inject resize and update method
            polar.update = updatePolarScale;

            let radiusAxis = polar.getRadiusAxis();
            let angleAxis = polar.getAngleAxis();

            let radiusAxisModel = polarModel.findAxisModel('radiusAxis');
            let angleAxisModel = polarModel.findAxisModel('angleAxis');

            setAxis(radiusAxis, radiusAxisModel);
            setAxis(angleAxis, angleAxisModel);

            resizePolar(polar, polarModel, api);

            polarList.push(polar);

            polarModel.coordinateSystem = polar;
            polar.model = polarModel;
        });
        // Inject coordinateSystem to series
        ecModel.eachSeries(function (seriesModel: SeriesModel<SeriesOption & {
            polarIndex?: number
            polarId?: string
        }>) {
            if (seriesModel.get('coordinateSystem') === 'polar') {
                let polarModel = ecModel.queryComponents({
                    mainType: 'polar',
                    index: seriesModel.get('polarIndex'),
                    id: seriesModel.get('polarId')
                })[0] as PolarModel;

                if (__DEV__) {
                    if (!polarModel) {
                        throw new Error(
                            'Polar "' + zrUtil.retrieve<number | string>(
                                seriesModel.get('polarIndex'),
                                seriesModel.get('polarId'),
                                0
                            ) + '" not found'
                        );
                    }
                }
                seriesModel.coordinateSystem = polarModel.coordinateSystem;
            }
        });

        return polarList;
    }
};

CoordinateSystem.register('polar', polarCreator);