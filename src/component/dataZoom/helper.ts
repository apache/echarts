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

import { Payload } from '../../util/types';
import GlobalModel from '../../model/Global';
import DataZoomModel from './DataZoomModel';
import { indexOf, createHashMap, assert, HashMap } from 'zrender/src/core/util';
import SeriesModel from '../../model/Series';
import { CoordinateSystemHostModel } from '../../coord/CoordinateSystem';
import { AxisBaseModel } from '../../coord/AxisBaseModel';


export interface DataZoomPayloadBatchItem {
    dataZoomId: string;
    start?: number;
    end?: number;
    startValue?: number;
    endValue?: number;
}

export interface DataZoomReferCoordSysInfo {
    model: CoordinateSystemHostModel;
    // Notice: if two dataZooms refer the same coordinamte system model,
    // (1) The axis they refered may different
    // (2) The sequence the axisModels matters, may different in
    // different dataZooms.
    axisModels: AxisBaseModel[];
}

export const DATA_ZOOM_AXIS_DIMENSIONS = [
    'x', 'y', 'radius', 'angle', 'single'
] as const;
export type DataZoomAxisDimension =
    'x' | 'y' | 'radius' | 'angle' | 'single';
type DataZoomAxisMainType =
    'xAxis' | 'yAxis' | 'radiusAxis' | 'angleAxis' | 'singleAxis';
type DataZoomAxisIndexPropName =
    'xAxisIndex' | 'yAxisIndex' | 'radiusAxisIndex' | 'angleAxisIndex' | 'singleAxisIndex';
type DataZoomAxisIdPropName =
    'xAxisId' | 'yAxisId' | 'radiusAxisId' | 'angleAxisId' | 'singleAxisId';
export type DataZoomCoordSysMainType = 'polar' | 'grid' | 'singleAxis';

// Supported coords.
// FIXME: polar has been broken (but rarely used).
const SERIES_COORDS = ['cartesian2d', 'polar', 'singleAxis'] as const;

export function isCoordSupported(seriesModel: SeriesModel): boolean {
    const coordType = seriesModel.get('coordinateSystem');
    return indexOf(SERIES_COORDS, coordType) >= 0;
}

export function getAxisMainType(axisDim: DataZoomAxisDimension): DataZoomAxisMainType {
    if (__DEV__) {
        assert(axisDim);
    }
    return axisDim + 'Axis' as DataZoomAxisMainType;
}

export function getAxisIndexPropName(axisDim: DataZoomAxisDimension): DataZoomAxisIndexPropName {
    if (__DEV__) {
        assert(axisDim);
    }
    return axisDim + 'AxisIndex' as DataZoomAxisIndexPropName;
}

export function getAxisIdPropName(axisDim: DataZoomAxisDimension): DataZoomAxisIdPropName {
    if (__DEV__) {
        assert(axisDim);
    }
    return axisDim + 'AxisId' as DataZoomAxisIdPropName;
}

/**
 * If two dataZoomModels has the same axis controlled, we say that they are 'linked'.
 * This function finds all linked dataZoomModels start from the given payload.
 */
export function findEffectedDataZooms(ecModel: GlobalModel, payload: Payload): DataZoomModel[] {

    // Key: `DataZoomAxisDimension`
    const axisRecords = createHashMap<boolean[], DataZoomAxisDimension>();
    const effectedModels: DataZoomModel[] = [];
    // Key: uid of dataZoomModel
    const effectedModelMap = createHashMap<boolean>();

    // Find the dataZooms specified by payload.
    ecModel.eachComponent(
        { mainType: 'dataZoom', query: payload },
        function (dataZoomModel: DataZoomModel) {
            if (!effectedModelMap.get(dataZoomModel.uid)) {
                addToEffected(dataZoomModel);
            }
        }
    );

    // Start from the given dataZoomModels, travel the graph to find
    // all of the linked dataZoom models.
    let foundNewLink;
    do {
        foundNewLink = false;
        ecModel.eachComponent('dataZoom', processSingle);
    }
    while (foundNewLink);

    function processSingle(dataZoomModel: DataZoomModel): void {
        if (!effectedModelMap.get(dataZoomModel.uid) && isLinked(dataZoomModel)) {
            addToEffected(dataZoomModel);
            foundNewLink = true;
        }
    }

    function addToEffected(dataZoom: DataZoomModel): void {
        effectedModelMap.set(dataZoom.uid, true);
        effectedModels.push(dataZoom);
        markAxisControlled(dataZoom);
    }

    function isLinked(dataZoomModel: DataZoomModel): boolean {
        let isLink = false;
        dataZoomModel.eachTargetAxis(function (axisDim, axisIndex) {
            const axisIdxArr = axisRecords.get(axisDim);
            if (axisIdxArr && axisIdxArr[axisIndex]) {
                isLink = true;
            }
        });
        return isLink;
    }

    function markAxisControlled(dataZoomModel: DataZoomModel) {
        dataZoomModel.eachTargetAxis(function (axisDim, axisIndex) {
            (
                axisRecords.get(axisDim) || axisRecords.set(axisDim, [])
            )[axisIndex] = true;
        });
    }

    return effectedModels;
}

/**
 * Find the first target coordinate system.
 * Available after model built.
 *
 * @return Like {
 *                  grid: [
 *                      {model: coord0, axisModels: [axis1, axis3], coordIndex: 1},
 *                      {model: coord1, axisModels: [axis0, axis2], coordIndex: 0},
 *                      ...
 *                  ],  // cartesians must not be null/undefined.
 *                  polar: [
 *                      {model: coord0, axisModels: [axis4], coordIndex: 0},
 *                      ...
 *                  ],  // polars must not be null/undefined.
 *                  singleAxis: [
 *                      {model: coord0, axisModels: [], coordIndex: 0}
 *                  ]
 *              }
 */
export function collectReferCoordSysModelInfo(dataZoomModel: DataZoomModel): {
    infoList: DataZoomReferCoordSysInfo[];
    // Key: coordSysModel.uid
    infoMap: HashMap<DataZoomReferCoordSysInfo, string>;
} {
    const ecModel = dataZoomModel.ecModel;
    const coordSysInfoWrap = {
        infoList: [] as DataZoomReferCoordSysInfo[],
        infoMap: createHashMap<DataZoomReferCoordSysInfo, string>()
    };

    dataZoomModel.eachTargetAxis(function (axisDim, axisIndex) {
        const axisModel = ecModel.getComponent(getAxisMainType(axisDim), axisIndex) as AxisBaseModel;
        if (!axisModel) {
            return;
        }
        const coordSysModel = axisModel.getCoordSysModel();
        if (!coordSysModel) {
            return;
        }

        const coordSysUid = coordSysModel.uid;
        let coordSysInfo = coordSysInfoWrap.infoMap.get(coordSysUid);
        if (!coordSysInfo) {
            coordSysInfo = { model: coordSysModel, axisModels: [] };
            coordSysInfoWrap.infoList.push(coordSysInfo);
            coordSysInfoWrap.infoMap.set(coordSysUid, coordSysInfo);
        }

        coordSysInfo.axisModels.push(axisModel);
    });

    return coordSysInfoWrap;
}
