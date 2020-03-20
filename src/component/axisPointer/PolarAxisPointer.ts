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

import BaseAxisPointer, { AxisPointerElementOptions } from './BaseAxisPointer';
import * as graphic from '../../util/graphic';
import * as viewHelper from './viewHelper';
import * as matrix from 'zrender/src/core/matrix';
import AxisBuilder from '../axis/AxisBuilder';
import AxisView from '../axis/AxisView';
import {OptionDataValue,
    ScaleDataValue,
    CommonAxisPointerOption,
    ZRTextAlign,
    ZRTextVerticalAlign
} from '../../util/types';
import { PolarAxisModel } from '../../coord/polar/AxisModel';
import ExtensionAPI from '../../ExtensionAPI';
import Polar from '../../coord/polar/Polar';
import AngleAxis from '../../coord/polar/AngleAxis';
import RadiusAxis from '../../coord/polar/RadiusAxis';
import { PathProps } from 'zrender/src/graphic/Path';
import Model from '../../model/Model';

// Not use top level axisPointer model
type AxisPointerModel = Model<CommonAxisPointerOption>;

class PolarAxisPointer extends BaseAxisPointer {

    /**
     * @override
     */
    makeElOption(
        elOption: AxisPointerElementOptions,
        value: OptionDataValue,
        axisModel: PolarAxisModel,
        axisPointerModel: Model<CommonAxisPointerOption>,
        api: ExtensionAPI
    ) {
        let axis = axisModel.axis;

        if (axis.dim === 'angle') {
            this.animationThreshold = Math.PI / 18;
        }

        let polar = axis.polar;
        let otherAxis = polar.getOtherAxis(axis);
        let otherExtent = otherAxis.getExtent();

        let coordValue;
        coordValue = axis.dataToCoord(value);

        let axisPointerType = axisPointerModel.get('type');
        if (axisPointerType && axisPointerType !== 'none') {
            let elStyle = viewHelper.buildElStyle(axisPointerModel);
            let pointerOption = pointerShapeBuilder[axisPointerType](
                axis, polar, coordValue, otherExtent
            );
            pointerOption.style = elStyle;
            elOption.graphicKey = pointerOption.type;
            elOption.pointer = pointerOption;
        }

        let labelMargin = axisPointerModel.get(['label', 'margin']);
        let labelPos = getLabelPosition(value, axisModel, axisPointerModel, polar, labelMargin);
        viewHelper.buildLabelElOption(elOption, axisModel, axisPointerModel, api, labelPos);
    }

    // Do not support handle, utill any user requires it.

};

function getLabelPosition(
    value: ScaleDataValue,
    axisModel: PolarAxisModel,
    axisPointerModel: AxisPointerModel,
    polar: Polar,
    labelMargin: number
) {
    let axis = axisModel.axis;
    let coord = axis.dataToCoord(value);
    let axisAngle = polar.getAngleAxis().getExtent()[0];
    axisAngle = axisAngle / 180 * Math.PI;
    let radiusExtent = polar.getRadiusAxis().getExtent();
    let position;
    let align: ZRTextAlign;
    let verticalAlign: ZRTextVerticalAlign;

    if (axis.dim === 'radius') {
        let transform = matrix.create();
        matrix.rotate(transform, transform, axisAngle);
        matrix.translate(transform, transform, [polar.cx, polar.cy]);
        position = graphic.applyTransform([coord, -labelMargin], transform);

        let labelRotation = axisModel.getModel('axisLabel').get('rotate') || 0;
        // @ts-ignore
        let labelLayout = AxisBuilder.innerTextLayout(
            axisAngle, labelRotation * Math.PI / 180, -1
        );
        align = labelLayout.textAlign;
        verticalAlign = labelLayout.textVerticalAlign;
    }
    else { // angle axis
        let r = radiusExtent[1];
        position = polar.coordToPoint([r + labelMargin, coord]);
        let cx = polar.cx;
        let cy = polar.cy;
        align = Math.abs(position[0] - cx) / r < 0.3
            ? 'center' : (position[0] > cx ? 'left' : 'right');
        verticalAlign = Math.abs(position[1] - cy) / r < 0.3
            ? 'middle' : (position[1] > cy ? 'top' : 'bottom');
    }

    return {
        position: position,
        align: align,
        verticalAlign: verticalAlign
    };
}


const pointerShapeBuilder = {

    line: function (
        axis: AngleAxis | RadiusAxis,
        polar: Polar,
        coordValue: number,
        otherExtent: number[]
    ): PathProps & { type: 'Line' | 'Circle' } {
        return axis.dim === 'angle'
            ? {
                type: 'Line',
                shape: viewHelper.makeLineShape(
                    polar.coordToPoint([otherExtent[0], coordValue]),
                    polar.coordToPoint([otherExtent[1], coordValue])
                )
            }
            : {
                type: 'Circle',
                shape: {
                    cx: polar.cx,
                    cy: polar.cy,
                    r: coordValue
                }
            };
    },

    shadow: function (
        axis: AngleAxis | RadiusAxis,
        polar: Polar,
        coordValue: number,
        otherExtent: number[]
    ): PathProps & { type: 'Sector' } {
        let bandWidth = Math.max(1, axis.getBandWidth());
        let radian = Math.PI / 180;

        return axis.dim === 'angle'
            ? {
                type: 'Sector',
                shape: viewHelper.makeSectorShape(
                    polar.cx, polar.cy,
                    otherExtent[0], otherExtent[1],
                    // In ECharts y is negative if angle is positive
                    (-coordValue - bandWidth / 2) * radian,
                    (-coordValue + bandWidth / 2) * radian
                )
            }
            : {
                type: 'Sector',
                shape: viewHelper.makeSectorShape(
                    polar.cx, polar.cy,
                    coordValue - bandWidth / 2,
                    coordValue + bandWidth / 2,
                    0, Math.PI * 2
                )
            };
    }
};

// @ts-ignore
AxisView.registerAxisPointerClass('PolarAxisPointer', PolarAxisPointer);

export default PolarAxisPointer;