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

import BaseAxisPointer, {AxisPointerElementOptions} from './BaseAxisPointer';
import * as viewHelper from './viewHelper';
import * as cartesianAxisHelper from '../../coord/cartesian/cartesianAxisHelper';
import AxisView from '../axis/AxisView';
import CartesianAxisModel from '../../coord/cartesian/AxisModel';
import ExtensionAPI from '../../ExtensionAPI';
import { ScaleDataValue, VerticalAlign, HorizontalAlign, CommonAxisPointerOption } from '../../util/types';
import Grid from '../../coord/cartesian/Grid';
import Axis2D from '../../coord/cartesian/Axis2D';
import { PathProps } from 'zrender/src/graphic/Path';
import { VectorArray } from 'zrender/src/core/vector';
import Model from '../../model/Model';

// Not use top level axisPointer model
type AxisPointerModel = Model<CommonAxisPointerOption>;

class CartesianAxisPointer extends BaseAxisPointer {

    /**
     * @override
     */
    makeElOption(
        elOption: AxisPointerElementOptions,
        value: ScaleDataValue,
        axisModel: CartesianAxisModel,
        axisPointerModel: AxisPointerModel,
        api: ExtensionAPI
    ) {
        var axis = axisModel.axis;
        var grid = axis.grid;
        var axisPointerType = axisPointerModel.get('type');
        var otherExtent = getCartesian(grid, axis).getOtherAxis(axis).getGlobalExtent();
        var pixelValue = axis.toGlobalCoord(axis.dataToCoord(value, true));

        if (axisPointerType && axisPointerType !== 'none') {
            var elStyle = viewHelper.buildElStyle(axisPointerModel);
            var pointerOption = pointerShapeBuilder[axisPointerType](
                axis, pixelValue, otherExtent
            );
            pointerOption.style = elStyle;
            elOption.graphicKey = pointerOption.type;
            elOption.pointer = pointerOption;
        }

        var layoutInfo = cartesianAxisHelper.layout(grid.model, axisModel);
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
        axisModel: CartesianAxisModel,
        axisPointerModel: AxisPointerModel
    ) {
        var layoutInfo = cartesianAxisHelper.layout(axisModel.axis.grid.model, axisModel, {
            labelInside: false
        });
        // @ts-ignore
        layoutInfo.labelMargin = axisPointerModel.get(['handle', 'margin']);
        return {
            // @ts-ignore
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
        axisModel: CartesianAxisModel,
        axisPointerModel: AxisPointerModel
    ) {
        var axis = axisModel.axis;
        var grid = axis.grid;
        var axisExtent = axis.getGlobalExtent(true);
        var otherExtent = getCartesian(grid, axis).getOtherAxis(axis).getGlobalExtent();
        var dimIndex = axis.dim === 'x' ? 0 : 1;

        var currPosition = transform.position;
        currPosition[dimIndex] += delta[dimIndex];
        currPosition[dimIndex] = Math.min(axisExtent[1], currPosition[dimIndex]);
        currPosition[dimIndex] = Math.max(axisExtent[0], currPosition[dimIndex]);

        var cursorOtherValue = (otherExtent[1] + otherExtent[0]) / 2;
        var cursorPoint = [cursorOtherValue, cursorOtherValue];
        cursorPoint[dimIndex] = currPosition[dimIndex];

        // Make tooltip do not overlap axisPointer and in the middle of the grid.
        var tooltipOptions: {
            verticalAlign?: VerticalAlign
            align?: HorizontalAlign
        }[] = [
            {verticalAlign: 'middle'},
            {align: 'center'}
        ];

        return {
            position: currPosition,
            rotation: transform.rotation,
            cursorPoint: cursorPoint,
            tooltipOption: tooltipOptions[dimIndex]
        };
    }
}

function getCartesian(grid: Grid, axis: Axis2D) {
    var opt = {} as {
        xAxisIndex?: number
        yAxisIndex?: number
    };
    opt[axis.dim + 'AxisIndex' as 'xAxisIndex' | 'yAxisIndex'] = axis.index;
    return grid.getCartesian(opt);
}

var pointerShapeBuilder = {

    line: function (axis: Axis2D, pixelValue: number, otherExtent: number[]): PathProps & { type: 'Line'} {
        var targetShape = viewHelper.makeLineShape(
            [pixelValue, otherExtent[0]],
            [pixelValue, otherExtent[1]],
            getAxisDimIndex(axis)
        );
        return {
            type: 'Line',
            subPixelOptimize: true,
            shape: targetShape
        };
    },

    shadow: function (axis: Axis2D, pixelValue: number, otherExtent: number[]): PathProps & { type: 'Rect'} {
        var bandWidth = Math.max(1, axis.getBandWidth());
        var span = otherExtent[1] - otherExtent[0];
        return {
            type: 'Rect',
            shape: viewHelper.makeRectShape(
                [pixelValue - bandWidth / 2, otherExtent[0]],
                [bandWidth, span],
                getAxisDimIndex(axis)
            )
        };
    }
};

function getAxisDimIndex(axis: Axis2D) {
    return axis.dim === 'x' ? 0 : 1;
}

// @ts-ignore
AxisView.registerAxisPointerClass('CartesianAxisPointer', CartesianAxisPointer);

export default CartesianAxisPointer;