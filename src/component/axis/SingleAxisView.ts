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
import AxisBuilder from './AxisBuilder';
import * as graphic from '../../util/graphic';
import * as singleAxisHelper from '../../coord/single/singleAxisHelper';
import AxisView from './AxisView';
import {rectCoordAxisBuildSplitArea, rectCoordAxisHandleRemove} from './axisSplitHelper';
import SingleAxisModel from '../../coord/single/AxisModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { Payload } from '../../util/types';
import ComponentView from '../../view/Component';

const axisBuilderAttrs = [
    'axisLine', 'axisTickLabel', 'axisName'
] as const;

const selfBuilderAttrs = ['splitArea', 'splitLine'] as const;

class SingleAxisView extends AxisView {

    static readonly type = 'singleAxis';
    readonly type = SingleAxisView.type;

    private _axisGroup: graphic.Group;

    axisPointerClass = 'SingleAxisPointer';

    render(axisModel: SingleAxisModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload) {

        const group = this.group;

        group.removeAll();

        const oldAxisGroup = this._axisGroup;
        this._axisGroup = new graphic.Group();

        const layout = singleAxisHelper.layout(axisModel);

        const axisBuilder = new AxisBuilder(axisModel, layout);

        zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);

        group.add(this._axisGroup);
        group.add(axisBuilder.getGroup());

        zrUtil.each(selfBuilderAttrs, function (name) {
            if (axisModel.get([name, 'show'])) {
                axisElementBuilders[name](this, this.group, this._axisGroup, axisModel);
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
    (axisView: SingleAxisView, group: graphic.Group, axisGroup: graphic.Group, axisModel: SingleAxisModel): void
}

const axisElementBuilders: Record<typeof selfBuilderAttrs[number], AxisElementBuilder> = {

    splitLine(axisView, group, axisGroup, axisModel) {
        const axis = axisModel.axis;

        if (axis.scale.isBlank()) {
            return;
        }

        const splitLineModel = axisModel.getModel('splitLine');
        const lineStyleModel = splitLineModel.getModel('lineStyle');
        let lineColors = lineStyleModel.get('color');

        lineColors = lineColors instanceof Array ? lineColors : [lineColors];

        const gridRect = axisModel.coordinateSystem.getRect();
        const isHorizontal = axis.isHorizontal();

        const splitLines: graphic.Line[][] = [];
        let lineCount = 0;

        const ticksCoords = axis.getTicksCoords({
            tickModel: splitLineModel
        });

        const p1 = [];
        const p2 = [];

        for (let i = 0; i < ticksCoords.length; ++i) {
            const tickCoord = axis.toGlobalCoord(ticksCoords[i].coord);
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
            const colorIndex = (lineCount++) % lineColors.length;
            splitLines[colorIndex] = splitLines[colorIndex] || [];
            splitLines[colorIndex].push(new graphic.Line({
                subPixelOptimize: true,
                shape: {
                    x1: p1[0],
                    y1: p1[1],
                    x2: p2[0],
                    y2: p2[1]
                },
                silent: true
            }));
        }

        const lineStyle = lineStyleModel.getLineStyle(['color']);
        for (let i = 0; i < splitLines.length; ++i) {
            group.add(graphic.mergePath(splitLines[i], {
                style: zrUtil.defaults({
                    stroke: lineColors[i % lineColors.length]
                }, lineStyle),
                silent: true
            }));
        }
    },

    splitArea(axisView, group, axisGroup, axisModel) {
        rectCoordAxisBuildSplitArea(axisView, axisGroup, axisModel, axisModel);
    }
};

export default SingleAxisView;
