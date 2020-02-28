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
import AxisView from '../axis/AxisView';
import SingleAxis from '../../coord/single/SingleAxis';
import Single from '../../coord/single/Single';
import { PathProps } from 'zrender/src/graphic/Path';
import { ScaleDataValue, VerticalAlign, CommonAxisPointerOption } from '../../util/types';
import ExtensionAPI from '../../ExtensionAPI';
import SingleAxisModel from '../../coord/single/AxisModel';
import { VectorArray } from 'zrender/src/core/vector';
import Model from '../../model/Model';

const XY = ['x', 'y'] as const;
const WH = ['width', 'height'] as const;

// Not use top level axisPointer model
type AxisPointerModel = Model<CommonAxisPointerOption>

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
        var axis = axisModel.axis;
        var coordSys = axis.coordinateSystem;
        var otherExtent = getGlobalExtent(coordSys, 1 - getPointDimIndex(axis));
        var pixelValue = coordSys.dataToPoint(value)[0];

        var axisPointerType = axisPointerModel.get('type');
        if (axisPointerType && axisPointerType !== 'none') {
            var elStyle = viewHelper.buildElStyle(axisPointerModel);
            var pointerOption = pointerShapeBuilder[axisPointerType](
                axis, pixelValue, otherExtent
            );
            pointerOption.style = elStyle;

            elOption.graphicKey = pointerOption.type;
            elOption.pointer = pointerOption;
        }

        var layoutInfo = singleAxisHelper.layout(axisModel);
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
        var layoutInfo = singleAxisHelper.layout(axisModel, {labelInside: false});
        // @ts-ignore
        layoutInfo.labelMargin = axisPointerModel.get(['handle', 'margin']);
        return {
            position: viewHelper.getTransformedPosition(axisModel.axis, value, layoutInfo),
            rotation: layoutInfo.rotation + (layoutInfo.labelDirection < 0 ? Math.PI : 0)
        };
    }

    /**
     * @override
     */
    updateHandleTransform(
        transform: {
            position: VectorArray,
            rotation: number
        },
        delta: number[],
        axisModel: SingleAxisModel,
        axisPointerModel: AxisPointerModel
    ) {
        var axis = axisModel.axis;
        var coordSys = axis.coordinateSystem;
        var dimIndex = getPointDimIndex(axis);
        var axisExtent = getGlobalExtent(coordSys, dimIndex);
        var currPosition = transform.position;
        currPosition[dimIndex] += delta[dimIndex];
        currPosition[dimIndex] = Math.min(axisExtent[1], currPosition[dimIndex]);
        currPosition[dimIndex] = Math.max(axisExtent[0], currPosition[dimIndex]);
        var otherExtent = getGlobalExtent(coordSys, 1 - dimIndex);
        var cursorOtherValue = (otherExtent[1] + otherExtent[0]) / 2;
        var cursorPoint = [cursorOtherValue, cursorOtherValue];
        cursorPoint[dimIndex] = currPosition[dimIndex];

        return {
            position: currPosition,
            rotation: transform.rotation,
            cursorPoint: cursorPoint,
            tooltipOption: {
                verticalAlign: 'middle' as VerticalAlign
            }
        };
    }
}

var pointerShapeBuilder = {

    line: function (axis: SingleAxis, pixelValue: number, otherExtent: number[]): PathProps & {
        type: 'Line'
    } {
        var targetShape = viewHelper.makeLineShape(
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
        var bandWidth = axis.getBandWidth();
        var span = otherExtent[1] - otherExtent[0];
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
    var rect = coordSys.getRect();
    return [rect[XY[dimIndex]], rect[XY[dimIndex]] + rect[WH[dimIndex]]];
}

// @ts-ignore
AxisView.registerAxisPointerClass('SingleAxisPointer', SingleAxisPointer);

export default SingleAxisPointer;