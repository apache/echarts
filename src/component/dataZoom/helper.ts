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

import { Payload, DimensionName } from '../../util/types';
import GlobalModel from '../../model/Global';
import DataZoomModel from './DataZoomModel';
import { indexOf, createHashMap, assert } from 'zrender/src/core/util';
import { __DEV__ } from '../../config';


export interface DataZoomPayloadBatchItem {
    dataZoomId: string
    start?: number
    end?: number
    startValue?: number
    endValue?: number
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

// Supported coords.
// FIXME: polar has been broken (but rarely used).
const COORDS = ['cartesian2d', 'polar', 'singleAxis'] as const;

export function isCoordSupported(coordType: string) {
    return indexOf(COORDS, coordType) >= 0;
}

export function getAxisMainType(axisDim: DimensionName): DataZoomAxisMainType {
    if (__DEV__) {
        assert(axisDim);
    }
    return axisDim + 'Axis' as DataZoomAxisMainType;
}

export function getAxisIndexPropName(axisDim: DimensionName): DataZoomAxisIndexPropName {
    if (__DEV__) {
        assert(axisDim);
    }
    return axisDim + 'AxisIndex' as DataZoomAxisIndexPropName;
}

export function getAxisIdPropName(axisDim: DimensionName): DataZoomAxisIdPropName {
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
