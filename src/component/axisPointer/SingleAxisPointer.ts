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
import * as viewHelper from './viewHelper';
import * as singleAxisHelper from '../../coord/single/singleAxisHelper';
import SingleAxis from '../../coord/single/SingleAxis';
import Single from '../../coord/single/Single';
import { PathProps } from 'zrender/src/graphic/Path';
import { ScaleDataValue, VerticalAlign, CommonAxisPointerOption } from '../../util/types';
import ExtensionAPI from '../../core/ExtensionAPI';
import SingleAxisModel from '../../coord/single/AxisModel';
import Model from '../../model/Model';

const XY = ['x', 'y'] as const;
const WH = ['width', 'height'] as const;

// Not use top level axisPointer model
type AxisPointerModel = Model<CommonAxisPointerOption>;

class SingleAxisPointer extends BaseAxisPointer {

    /**
     * @override
     */
    makeElOption(
        elOption: AxisPointerElementOptions,
        value: ScaleDataValue,
        axisModel: SingleAxisModel,
        axisPointerModel: AxisPointerModel,
        api: ExtensionAPI
    ) {
        const axis = axisModel.axis;
        const coordSys = axis.coordinateSystem;
        const otherExtent = getGlobalExtent(coordSys, 1 - getPointDimIndex(axis));
        const pixelValue = coordSys.dataToPoint(value)[0];

        const axisPointerType = axisPointerModel.get('type');
        if (axisPointerType && axisPointerType !== 'none') {
            const elStyle = viewHelper.buildElStyle(axisPointerModel);
            const pointerOption = pointerShapeBuilder[axisPointerType](
                axis, pixelValue, otherExtent
            );
            pointerOption.style = elStyle;

            elOption.graphicKey = pointerOption.type;
            elOption.pointer = pointerOption;
        }

        const layoutInfo = singleAxisHelper.layout(axisModel);
        viewHelper.buildCartesianSingleLabelElOption(
            // @ts-ignore
            value, elOption, layoutInfo, axisModel, axisPointerModel, api
        );
    }

    /**
     * @override
     */
    getHandleTransform(
        value: ScaleDataValue,
        axisModel: SingleAxisModel,
        axisPointerModel: AxisPointerModel
    ) {
        const layoutInfo = singleAxisHelper.layout(axisModel, {labelInside: false});
        // @ts-ignore
        layoutInfo.labelMargin = axisPointerModel.get(['handle', 'margin']);
        const position = viewHelper.getTransformedPosition(axisModel.axis, value, layoutInfo);
        return {
            x: position[0],
            y: position[1],
            rotation: layoutInfo.rotation + (layoutInfo.labelDirection < 0 ? Math.PI : 0)
        };
    }

    /**
     * @override
     */
    updateHandleTransform(
        transform: {
            x: number,
            y: number,
            rotation: number
        },
        delta: number[],
        axisModel: SingleAxisModel,
        axisPointerModel: AxisPointerModel
    ) {
        const axis = axisModel.axis;
        const coordSys = axis.coordinateSystem;
        const dimIndex = getPointDimIndex(axis);
        const axisExtent = getGlobalExtent(coordSys, dimIndex);
        const currPosition = [transform.x, transform.y];
        currPosition[dimIndex] += delta[dimIndex];
        currPosition[dimIndex] = Math.min(axisExtent[1], currPosition[dimIndex]);
        currPosition[dimIndex] = Math.max(axisExtent[0], currPosition[dimIndex]);
        const otherExtent = getGlobalExtent(coordSys, 1 - dimIndex);
        const cursorOtherValue = (otherExtent[1] + otherExtent[0]) / 2;
        const cursorPoint = [cursorOtherValue, cursorOtherValue];
        cursorPoint[dimIndex] = currPosition[dimIndex];

        return {
            x: currPosition[0],
            y: currPosition[1],
            rotation: transform.rotation,
            cursorPoint: cursorPoint,
            tooltipOption: {
                verticalAlign: 'middle' as VerticalAlign
            }
        };
    }
}

const pointerShapeBuilder = {

    line: function (axis: SingleAxis, pixelValue: number, otherExtent: number[]): PathProps & {
        type: 'Line'
    } {
        const targetShape = viewHelper.makeLineShape(
            [pixelValue, otherExtent[0]],
            [pixelValue, otherExtent[1]],
            getPointDimIndex(axis)
        );
        return {
            type: 'Line',
            subPixelOptimize: true,
            shape: targetShape
        };
    },

    shadow: function (axis: SingleAxis, pixelValue: number, otherExtent: number[]): PathProps & {
        type: 'Rect'
    } {
        const bandWidth = axis.getBandWidth();
        const span = otherExtent[1] - otherExtent[0];
        return {
            type: 'Rect',
            shape: viewHelper.makeRectShape(
                [pixelValue - bandWidth / 2, otherExtent[0]],
                [bandWidth, span],
                getPointDimIndex(axis)
            )
        };
    }
};

function getPointDimIndex(axis: SingleAxis): number {
    return axis.isHorizontal() ? 0 : 1;
}

function getGlobalExtent(coordSys: Single, dimIndex: number) {
    const rect = coordSys.getRect();
    return [rect[XY[dimIndex]], rect[XY[dimIndex]] + rect[WH[dimIndex]]];
}

export default SingleAxisPointer;
