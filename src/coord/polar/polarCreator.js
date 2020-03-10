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

import './PolarModel';

/**
 * Resize method bound to the polar
 * @param {module:echarts/coord/polar/PolarModel} polarModel
 * @param {module:echarts/ExtensionAPI} api
 */
function resizePolar(polar, polarModel, api) {
    var center = polarModel.get('center');
    var width = api.getWidth();
    var height = api.getHeight();

    polar.cx = parsePercent(center[0], width);
    polar.cy = parsePercent(center[1], height);

    var radiusAxis = polar.getRadiusAxis();
    var size = Math.min(width, height) / 2;

    var radius = polarModel.get('radius');
    if (radius == null) {
        radius = [0, '100%'];
    }
    else if (!zrUtil.isArray(radius)) {
        // r0 = 0
        radius = [0, radius];
    }
    radius = [
        parsePercent(radius[0], size),
        parsePercent(radius[1], size)
    ];

    radiusAxis.inverse
        ? radiusAxis.setExtent(radius[1], radius[0])
        : radiusAxis.setExtent(radius[0], radius[1]);
}

/**
 * Update polar
 */
function updatePolarScale(ecModel, api) {
    var polar = this;
    var angleAxis = polar.getAngleAxis();
    var radiusAxis = polar.getRadiusAxis();
    // Reset scale
    angleAxis.scale.setExtent(Infinity, -Infinity);
    radiusAxis.scale.setExtent(Infinity, -Infinity);

    ecModel.eachSeries(function (seriesModel) {
        if (seriesModel.coordinateSystem === polar) {
            var data = seriesModel.getData();
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
        var extent = angleAxis.getExtent();
        var diff = 360 / angleAxis.scale.count();
        angleAxis.inverse ? (extent[1] += diff) : (extent[1] -= diff);
        angleAxis.setExtent(extent[0], extent[1]);
    }
}

/**
 * Set common axis properties
 * @param {module:echarts/coord/polar/AngleAxis|module:echarts/coord/polar/RadiusAxis}
 * @param {module:echarts/coord/polar/AxisModel}
 * @inner
 */
function setAxis(axis, axisModel) {
    axis.type = axisModel.get('type');
    axis.scale = createScaleByModel(axisModel);
    axis.onBand = axisModel.get('boundaryGap') && axis.type === 'category';
    axis.inverse = axisModel.get('inverse');

    if (axisModel.mainType === 'angleAxis') {
        axis.inverse ^= axisModel.get('clockwise');
        var startAngle = axisModel.get('startAngle');
        axis.setExtent(startAngle, startAngle + (axis.inverse ? -360 : 360));
    }

    // Inject axis instance
    axisModel.axis = axis;
    axis.model = axisModel;
}


var polarCreator = {

    dimensions: Polar.prototype.dimensions,

    create: function (ecModel, api) {
        var polarList = [];
        ecModel.eachComponent('polar', function (polarModel, idx) {
            var polar = new Polar(idx);
            // Inject resize and update method
            polar.update = updatePolarScale;

            var radiusAxis = polar.getRadiusAxis();
            var angleAxis = polar.getAngleAxis();

            var radiusAxisModel = polarModel.findAxisModel('radiusAxis');
            var angleAxisModel = polarModel.findAxisModel('angleAxis');

            setAxis(radiusAxis, radiusAxisModel);
            setAxis(angleAxis, angleAxisModel);

            resizePolar(polar, polarModel, api);

            polarList.push(polar);

            polarModel.coordinateSystem = polar;
            polar.model = polarModel;
        });
        // Inject coordinateSystem to series
        ecModel.eachSeries(function (seriesModel) {
            if (seriesModel.get('coordinateSystem') === 'polar') {
                var polarModel = ecModel.queryComponents({
                    mainType: 'polar',
                    index: seriesModel.get('polarIndex'),
                    id: seriesModel.get('polarId')
                })[0];

                if (__DEV__) {
                    if (!polarModel) {
                        throw new Error(
                            'Polar "' + zrUtil.retrieve(
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