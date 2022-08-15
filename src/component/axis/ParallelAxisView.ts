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
import BrushController, {
    BrushCoverConfig, BrushControllerEvents, BrushDimensionMinMax
} from '../helper/BrushController';
import * as brushHelper from '../helper/brushHelper';
import * as graphic from '../../util/graphic';
import ComponentView from '../../view/Component';
import ExtensionAPI from '../../core/ExtensionAPI';
import GlobalModel from '../../model/Global';
import ParallelAxisModel, { ParallelAreaSelectStyleProps } from '../../coord/parallel/AxisModel';
import { Payload } from '../../util/types';
import ParallelModel from '../../coord/parallel/ParallelModel';
import { ParallelAxisLayoutInfo } from '../../coord/parallel/Parallel';


const elementList = ['axisLine', 'axisTickLabel', 'axisName'];

class ParallelAxisView extends ComponentView {

    static type = 'parallelAxis';
    readonly type = ParallelAxisView.type;

    private _brushController: BrushController;
    private _axisGroup: graphic.Group;

    axisModel: ParallelAxisModel;
    api: ExtensionAPI;


    init(ecModel: GlobalModel, api: ExtensionAPI): void {
        super.init.apply(this, arguments as any);

        (this._brushController = new BrushController(api.getZr()))
            .on('brush', zrUtil.bind(this._onBrush, this));
    }

    render(
        axisModel: ParallelAxisModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ): void {
        if (fromAxisAreaSelect(axisModel, ecModel, payload)) {
            return;
        }

        this.axisModel = axisModel;
        this.api = api;

        this.group.removeAll();

        const oldAxisGroup = this._axisGroup;
        this._axisGroup = new graphic.Group();
        this.group.add(this._axisGroup);

        if (!axisModel.get('show')) {
            return;
        }

        const coordSysModel = getCoordSysModel(axisModel, ecModel);
        const coordSys = coordSysModel.coordinateSystem;

        const areaSelectStyle = axisModel.getAreaSelectStyle();
        const areaWidth = areaSelectStyle.width;

        const dim = axisModel.axis.dim;
        const axisLayout = coordSys.getAxisLayout(dim);

        const builderOpt = zrUtil.extend(
            {strokeContainThreshold: areaWidth},
            axisLayout
        );

        const axisBuilder = new AxisBuilder(axisModel, builderOpt);

        zrUtil.each(elementList, axisBuilder.add, axisBuilder);

        this._axisGroup.add(axisBuilder.getGroup());

        this._refreshBrushController(
            builderOpt, areaSelectStyle, axisModel, coordSysModel, areaWidth, api
        );

        graphic.groupTransition(oldAxisGroup, this._axisGroup, axisModel);
    }

    // /**
    //  * @override
    //  */
    // updateVisual(axisModel, ecModel, api, payload) {
    //     this._brushController && this._brushController
    //         .updateCovers(getCoverInfoList(axisModel));
    // }

    _refreshBrushController(
        builderOpt: Pick<ParallelAxisLayoutInfo, 'position' | 'rotation'>,
        areaSelectStyle: ParallelAreaSelectStyleProps,
        axisModel: ParallelAxisModel,
        coordSysModel: ParallelModel,
        areaWidth: ParallelAreaSelectStyleProps['width'],
        api: ExtensionAPI
    ): void {
        // After filtering, axis may change, select area needs to be update.
        const extent = axisModel.axis.getExtent();
        const extentLen = extent[1] - extent[0];
        const extra = Math.min(30, Math.abs(extentLen) * 0.1); // Arbitrary value.

        // width/height might be negative, which will be
        // normalized in BoundingRect.
        const rect = graphic.BoundingRect.create({
            x: extent[0],
            y: -areaWidth / 2,
            width: extentLen,
            height: areaWidth
        });
        rect.x -= extra;
        rect.width += 2 * extra;

        this._brushController
            .mount({
                enableGlobalPan: true,
                rotation: builderOpt.rotation,
                x: builderOpt.position[0],
                y: builderOpt.position[1]
            })
            .setPanels([{
                panelId: 'pl',
                clipPath: brushHelper.makeRectPanelClipPath(rect),
                isTargetByCursor: brushHelper.makeRectIsTargetByCursor(rect, api, coordSysModel),
                getLinearBrushOtherExtent: brushHelper.makeLinearBrushOtherExtent(rect, 0)
            }])
            .enableBrush({
                brushType: 'lineX',
                brushStyle: areaSelectStyle,
                removeOnClick: true
            })
            .updateCovers(getCoverInfoList(axisModel));
    }

    _onBrush(eventParam: BrushControllerEvents['brush']): void {
        const coverInfoList = eventParam.areas;
        // Do not cache these object, because the mey be changed.
        const axisModel = this.axisModel;
        const axis = axisModel.axis;
        const intervals = zrUtil.map(coverInfoList, function (coverInfo) {
            return [
                axis.coordToData((coverInfo.range as BrushDimensionMinMax)[0], true),
                axis.coordToData((coverInfo.range as BrushDimensionMinMax)[1], true)
            ];
        });

        // If realtime is true, action is not dispatched on drag end, because
        // the drag end emits the same params with the last drag move event,
        // and may have some delay when using touch pad.
        if (!axisModel.option.realtime === eventParam.isEnd || eventParam.removeOnClick) { // jshint ignore:line
            this.api.dispatchAction({
                type: 'axisAreaSelect',
                parallelAxisId: axisModel.id,
                intervals: intervals
            });
        }
    }

    dispose(): void {
        this._brushController.dispose();
    }
}

function fromAxisAreaSelect(
    axisModel: ParallelAxisModel, ecModel: GlobalModel, payload: Payload
): boolean {
    return payload
        && payload.type === 'axisAreaSelect'
        && ecModel.findComponents(
            {mainType: 'parallelAxis', query: payload}
        )[0] === axisModel;
}

function getCoverInfoList(axisModel: ParallelAxisModel): BrushCoverConfig[] {
    const axis = axisModel.axis;
    return zrUtil.map(axisModel.activeIntervals, function (interval) {
        return {
            brushType: 'lineX',
            panelId: 'pl',
            range: [
                axis.dataToCoord(interval[0], true),
                axis.dataToCoord(interval[1], true)
            ]
        };
    });
}

function getCoordSysModel(axisModel: ParallelAxisModel, ecModel: GlobalModel): ParallelModel {
    return ecModel.getComponent(
        'parallel', axisModel.get('parallelIndex')
    ) as ParallelModel;
}

export default ParallelAxisView;
