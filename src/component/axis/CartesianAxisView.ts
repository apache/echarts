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
import * as graphic from '../../util/graphic';
import AxisBuilder from './AxisBuilder';
import AxisView from './AxisView';
import * as cartesianAxisHelper from '../../coord/cartesian/cartesianAxisHelper';
import {rectCoordAxisBuildSplitArea, rectCoordAxisHandleRemove} from './axisSplitHelper';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import CartesianAxisModel from '../../coord/cartesian/AxisModel';
import GridModel from '../../coord/cartesian/GridModel';
import ComponentView from '../../view/Component';
import { Payload } from '../../util/types';

const axisBuilderAttrs = [
    'axisLine', 'axisTickLabel', 'axisName'
] as const;
const selfBuilderAttrs = [
    'splitArea', 'splitLine', 'minorSplitLine'
] as const;

class CartesianAxisView extends AxisView {

    static type = 'cartesianAxis'
    type = CartesianAxisView.type

    axisPointerClass = 'CartesianAxisPointer'

    private _axisGroup: graphic.Group

    /**
     * @override
     */
    render(axisModel: CartesianAxisModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload) {

        this.group.removeAll();

        var oldAxisGroup = this._axisGroup;
        this._axisGroup = new graphic.Group();

        this.group.add(this._axisGroup);

        if (!axisModel.get('show')) {
            return;
        }

        var gridModel = axisModel.getCoordSysModel();

        var layout = cartesianAxisHelper.layout(gridModel, axisModel);

        var axisBuilder = new AxisBuilder(axisModel, layout);

        zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);

        this._axisGroup.add(axisBuilder.getGroup());

        zrUtil.each(selfBuilderAttrs, function (name) {
            if (axisModel.get([name, 'show'])) {
                axisElementBuilders[name](this, this._axisGroup, axisModel, gridModel);
            }
        }, this);

        graphic.groupTransition(oldAxisGroup, this._axisGroup, axisModel);

        super.render(axisModel, ecModel, api, payload);
    }

    remove() {
        rectCoordAxisHandleRemove(this);
    }
}

interface AxisElementBuilder {
    (axisView: CartesianAxisView, axisGroup: graphic.Group, axisModel: CartesianAxisModel, gridModel: GridModel): void
}

const axisElementBuilders: Record<typeof selfBuilderAttrs[number], AxisElementBuilder> = {

    splitLine(axisView, axisGroup, axisModel, gridModel) {
        var axis = axisModel.axis;

        if (axis.scale.isBlank()) {
            return;
        }

        var splitLineModel = axisModel.getModel('splitLine');
        var lineStyleModel = splitLineModel.getModel('lineStyle');
        var lineColors = lineStyleModel.get('color');

        lineColors = zrUtil.isArray(lineColors) ? lineColors : [lineColors];

        var gridRect = gridModel.coordinateSystem.getRect();
        var isHorizontal = axis.isHorizontal();

        var lineCount = 0;

        var ticksCoords = axis.getTicksCoords({
            tickModel: splitLineModel
        });

        var p1 = [];
        var p2 = [];

        var lineStyle = lineStyleModel.getLineStyle();
        for (var i = 0; i < ticksCoords.length; i++) {
            var tickCoord = axis.toGlobalCoord(ticksCoords[i].coord);

            if (isHorizontal) {
                p1[0] = tickCoord;
                p1[1] = gridRect.y;
                p2[0] = tickCoord;
                p2[1] = gridRect.y + gridRect.height;
            }
            else {
                p1[0] = gridRect.x;
                p1[1] = tickCoord;
                p2[0] = gridRect.x + gridRect.width;
                p2[1] = tickCoord;
            }

            var colorIndex = (lineCount++) % lineColors.length;
            var tickValue = ticksCoords[i].tickValue;
            axisGroup.add(new graphic.Line({
                anid: tickValue != null ? 'line_' + ticksCoords[i].tickValue : null,
                subPixelOptimize: true,
                shape: {
                    x1: p1[0],
                    y1: p1[1],
                    x2: p2[0],
                    y2: p2[1]
                },
                style: zrUtil.defaults({
                    stroke: lineColors[colorIndex]
                }, lineStyle),
                silent: true
            }));
        }
    },

    minorSplitLine(axisView, axisGroup, axisModel, gridModel) {
        var axis = axisModel.axis;

        var minorSplitLineModel = axisModel.getModel('minorSplitLine');
        var lineStyleModel = minorSplitLineModel.getModel('lineStyle');

        var gridRect = gridModel.coordinateSystem.getRect();
        var isHorizontal = axis.isHorizontal();

        var minorTicksCoords = axis.getMinorTicksCoords();
        if (!minorTicksCoords.length) {
            return;
        }
        var p1 = [];
        var p2 = [];

        var lineStyle = lineStyleModel.getLineStyle();


        for (var i = 0; i < minorTicksCoords.length; i++) {
            for (var k = 0; k < minorTicksCoords[i].length; k++) {
                var tickCoord = axis.toGlobalCoord(minorTicksCoords[i][k].coord);

                if (isHorizontal) {
                    p1[0] = tickCoord;
                    p1[1] = gridRect.y;
                    p2[0] = tickCoord;
                    p2[1] = gridRect.y + gridRect.height;
                }
                else {
                    p1[0] = gridRect.x;
                    p1[1] = tickCoord;
                    p2[0] = gridRect.x + gridRect.width;
                    p2[1] = tickCoord;
                }

                axisGroup.add(new graphic.Line({
                    anid: 'minor_line_' + minorTicksCoords[i][k].tickValue,
                    subPixelOptimize: true,
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    },
                    style: lineStyle,
                    silent: true
                }));
            }
        }
    },

    splitArea(axisView, axisGroup, axisModel, gridModel) {
        rectCoordAxisBuildSplitArea(axisView, axisGroup, axisModel, gridModel);
    }
};

class CartesianXAxisView extends CartesianAxisView {
    static type = 'xAxis'
    type = CartesianXAxisView.type
}
class CartesianYAxisView extends CartesianAxisView {
    static type = 'yAxis'
    type = CartesianXAxisView.type
}

ComponentView.registerClass(CartesianXAxisView);
ComponentView.registerClass(CartesianYAxisView);

export default CartesianAxisView;