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

import DataZoomView, {CoordInfo} from './DataZoomView';
import sliderMove from '../helper/sliderMove';
import * as roams from './roams';
import InsideZoomModel from './InsideZoomModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import ComponentView from '../../view/Component';
import { each, map, bind } from 'zrender/src/core/util';
import RoamController, {RoamEventParams} from '../helper/RoamController';
import { AxisBaseModel } from '../../coord/AxisBaseModel';
import Polar from '../../coord/polar/Polar';
import SingleAxis from '../../coord/single/SingleAxis';


type SupportedCoordSysName = 'polar' | 'grid' | 'singleAxis';

class InsideZoomView extends DataZoomView {
    static type = 'dataZoom.inside';
    type = 'dataZoom.inside';

    /**
     * 'throttle' is used in this.dispatchAction, so we save range
     * to avoid missing some 'pan' info.
     */
    range: [number, number];

    /**
     * @override
     */
    render(dataZoomModel: InsideZoomModel, ecModel: GlobalModel, api: ExtensionAPI, payload: any) {
        super.render.apply(this, arguments as any);

        // Hence the `throttle` util ensures to preserve command order,
        // here simply updating range all the time will not cause missing
        // any of the the roam change.
        this.range = dataZoomModel.getPercentRange();

        // Reset controllers.
        each(this.getTargetCoordInfo(), function (coordInfoList, coordSysName: SupportedCoordSysName) {

            let allCoordIds = map(coordInfoList, function (coordInfo) {
                return roams.generateCoordId(coordInfo.model);
            });

            each(coordInfoList, function (coordInfo) {
                let coordModel = coordInfo.model;

                roams.register(
                    api,
                    {
                        coordId: roams.generateCoordId(coordModel),
                        allCoordIds: allCoordIds,
                        containsPoint(e, x, y) {
                            return coordModel.coordinateSystem.containPoint([x, y]);
                        },
                        dataZoomId: dataZoomModel.id,
                        dataZoomModel: dataZoomModel,
                        getRange: {
                            pan: bind(roamHandlers.pan, this, coordInfo, coordSysName),
                            zoom: bind(roamHandlers.zoom, this, coordInfo, coordSysName),
                            scrollMove: bind(roamHandlers.scrollMove, this, coordInfo, coordSysName)
                        }
                    }
                );
            }, this);

        }, this);
    }

    /**
     * @override
     */
    dispose() {
        roams.unregister(this.api, this.dataZoomModel.id);
        super.dispose.apply(this, arguments as any);
        this.range = null;
    }
}

interface RoamHandler<T extends RoamEventParams['zoom'] | RoamEventParams['scrollMove'] | RoamEventParams['pan']> {
    (
        coordInfo: CoordInfo,
        coordSysName: SupportedCoordSysName,
        controller: RoamController,
        e: T
    ): [number, number]
}

const roamHandlers: {
    pan: RoamHandler<RoamEventParams['pan']>
    zoom: RoamHandler<RoamEventParams['zoom']>
    scrollMove: RoamHandler<RoamEventParams['scrollMove']>
} & ThisType<InsideZoomView> = {

    zoom(coordInfo, coordSysName, controller, e: RoamEventParams['zoom']) {
        let lastRange = this.range;
        let range = lastRange.slice() as [number, number];

        // Calculate transform by the first axis.
        let axisModel = coordInfo.axisModels[0];
        if (!axisModel) {
            return;
        }

        let directionInfo = getDirectionInfo[coordSysName](
            null, [e.originX, e.originY], axisModel, controller, coordInfo
        );
        let percentPoint = (
            directionInfo.signal > 0
                ? (directionInfo.pixelStart + directionInfo.pixelLength - directionInfo.pixel)
                : (directionInfo.pixel - directionInfo.pixelStart)
            ) / directionInfo.pixelLength * (range[1] - range[0]) + range[0];

        let scale = Math.max(1 / e.scale, 0);
        range[0] = (range[0] - percentPoint) * scale + percentPoint;
        range[1] = (range[1] - percentPoint) * scale + percentPoint;

        // Restrict range.
        let minMaxSpan = this.dataZoomModel.findRepresentativeAxisProxy().getMinMaxSpan();

        sliderMove(0, range, [0, 100], 0, minMaxSpan.minSpan, minMaxSpan.maxSpan);

        this.range = range;

        if (lastRange[0] !== range[0] || lastRange[1] !== range[1]) {
            return range;
        }
    },

    pan: makeMover(function (range, axisModel, coordInfo, coordSysName, controller, e: RoamEventParams['pan']) {
        let directionInfo = getDirectionInfo[coordSysName](
            [e.oldX, e.oldY], [e.newX, e.newY], axisModel, controller, coordInfo
        );

        return directionInfo.signal
            * (range[1] - range[0])
            * directionInfo.pixel / directionInfo.pixelLength;
    }),

    scrollMove: makeMover(
        function (range, axisModel, coordInfo, coordSysName, controller, e: RoamEventParams['scrollMove']
    ) {
        let directionInfo = getDirectionInfo[coordSysName](
            [0, 0], [e.scrollDelta, e.scrollDelta], axisModel, controller, coordInfo
        );
        return directionInfo.signal * (range[1] - range[0]) * e.scrollDelta;
    })
};

function makeMover(
    getPercentDelta: (
        range: [number, number],
        axisModel: AxisBaseModel,
        coordInfo: CoordInfo,
        coordSysName: SupportedCoordSysName,
        controller: RoamController,
        e: RoamEventParams['scrollMove']| RoamEventParams['pan']
    ) => number
) {
    return function (
        this: InsideZoomView,
        coordInfo: CoordInfo,
        coordSysName: SupportedCoordSysName,
        controller: RoamController,
        e: RoamEventParams['scrollMove']| RoamEventParams['pan']
    ): [number, number] {
        let lastRange = this.range;
        let range = lastRange.slice() as [number, number];

        // Calculate transform by the first axis.
        let axisModel = coordInfo.axisModels[0];
        if (!axisModel) {
            return;
        }

        let percentDelta = getPercentDelta(
            range, axisModel, coordInfo, coordSysName, controller, e
        );

        sliderMove(percentDelta, range, [0, 100], 'all');

        this.range = range;

        if (lastRange[0] !== range[0] || lastRange[1] !== range[1]) {
            return range;
        }
    };
}

interface DirectionInfo {
    pixel: number
    pixelLength: number
    pixelStart: number
    signal: -1 | 1
}
interface GetDirectionInfo {
    (
        oldPoint: number[],
        newPoint: number[],
        axisModel: AxisBaseModel,
        controller: RoamController,
        coordInfo: CoordInfo
    ): DirectionInfo
}

const getDirectionInfo: Record<'grid' | 'polar' | 'singleAxis', GetDirectionInfo> = {

    grid(oldPoint, newPoint, axisModel, controller, coordInfo) {
        let axis = axisModel.axis;
        let ret = {} as DirectionInfo;
        let rect = coordInfo.model.coordinateSystem.getRect();
        oldPoint = oldPoint || [0, 0];

        if (axis.dim === 'x') {
            ret.pixel = newPoint[0] - oldPoint[0];
            ret.pixelLength = rect.width;
            ret.pixelStart = rect.x;
            ret.signal = axis.inverse ? 1 : -1;
        }
        else { // axis.dim === 'y'
            ret.pixel = newPoint[1] - oldPoint[1];
            ret.pixelLength = rect.height;
            ret.pixelStart = rect.y;
            ret.signal = axis.inverse ? -1 : 1;
        }

        return ret;
    },

    polar(oldPoint, newPoint, axisModel, controller, coordInfo) {
        let axis = axisModel.axis;
        let ret = {} as DirectionInfo;
        let polar = coordInfo.model.coordinateSystem as Polar;
        let radiusExtent = polar.getRadiusAxis().getExtent();
        let angleExtent = polar.getAngleAxis().getExtent();

        oldPoint = oldPoint ? polar.pointToCoord(oldPoint) : [0, 0];
        newPoint = polar.pointToCoord(newPoint);

        if (axisModel.mainType === 'radiusAxis') {
            ret.pixel = newPoint[0] - oldPoint[0];
            // ret.pixelLength = Math.abs(radiusExtent[1] - radiusExtent[0]);
            // ret.pixelStart = Math.min(radiusExtent[0], radiusExtent[1]);
            ret.pixelLength = radiusExtent[1] - radiusExtent[0];
            ret.pixelStart = radiusExtent[0];
            ret.signal = axis.inverse ? 1 : -1;
        }
        else { // 'angleAxis'
            ret.pixel = newPoint[1] - oldPoint[1];
            // ret.pixelLength = Math.abs(angleExtent[1] - angleExtent[0]);
            // ret.pixelStart = Math.min(angleExtent[0], angleExtent[1]);
            ret.pixelLength = angleExtent[1] - angleExtent[0];
            ret.pixelStart = angleExtent[0];
            ret.signal = axis.inverse ? -1 : 1;
        }

        return ret;
    },

    singleAxis(oldPoint, newPoint, axisModel, controller, coordInfo) {
        let axis = axisModel.axis as SingleAxis;
        let rect = coordInfo.model.coordinateSystem.getRect();
        let ret = {} as DirectionInfo;

        oldPoint = oldPoint || [0, 0];

        if (axis.orient === 'horizontal') {
            ret.pixel = newPoint[0] - oldPoint[0];
            ret.pixelLength = rect.width;
            ret.pixelStart = rect.x;
            ret.signal = axis.inverse ? 1 : -1;
        }
        else { // 'vertical'
            ret.pixel = newPoint[1] - oldPoint[1];
            ret.pixelLength = rect.height;
            ret.pixelStart = rect.y;
            ret.signal = axis.inverse ? -1 : 1;
        }

        return ret;
    }
};

ComponentView.registerClass(InsideZoomView);

export default InsideZoomView;
