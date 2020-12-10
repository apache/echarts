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

import {prepareDataCoordInfo, getStackedOnPoint} from './helper';
import List from '../../data/List';
import type Cartesian2D from '../../coord/cartesian/Cartesian2D';
import type Polar from '../../coord/polar/Polar';
import { LineSeriesOption } from './LineSeries';
import { createFloat32Array } from '../../util/vendor';

interface DiffItem {
    cmd: '+' | '=' | '-'
    idx: number
    idx1?: number
}

function diffData(oldData: List, newData: List) {
    const diffResult: DiffItem[] = [];

    newData.diff(oldData)
        .add(function (idx) {
            diffResult.push({cmd: '+', idx: idx});
        })
        .update(function (newIdx, oldIdx) {
            diffResult.push({cmd: '=', idx: oldIdx, idx1: newIdx});
        })
        .remove(function (idx) {
            diffResult.push({cmd: '-', idx: idx});
        })
        .execute();

    return diffResult;
}

export default function lineAnimationDiff(
    oldData: List, newData: List,
    oldStackedOnPoints: ArrayLike<number>, newStackedOnPoints: ArrayLike<number>,
    oldCoordSys: Cartesian2D | Polar, newCoordSys: Cartesian2D | Polar,
    oldValueOrigin: LineSeriesOption['areaStyle']['origin'],
    newValueOrigin: LineSeriesOption['areaStyle']['origin']
) {
    const diff = diffData(oldData, newData);

    // let newIdList = newData.mapArray(newData.getId);
    // let oldIdList = oldData.mapArray(oldData.getId);

    // convertToIntId(newIdList, oldIdList);

    // // FIXME One data ?
    // diff = arrayDiff(oldIdList, newIdList);

    const currPoints: number[] = [];
    const nextPoints: number[] = [];
    // Points for stacking base line
    const currStackedPoints: number[] = [];
    const nextStackedPoints: number[] = [];

    const status = [];
    const sortedIndices: number[] = [];
    const rawIndices: number[] = [];

    const newDataOldCoordInfo = prepareDataCoordInfo(oldCoordSys, newData, oldValueOrigin);
    const oldDataNewCoordInfo = prepareDataCoordInfo(newCoordSys, oldData, newValueOrigin);

    const oldPoints = oldData.getLayout('points') as number[] || [];
    const newPoints = newData.getLayout('points') as number[] || [];

    for (let i = 0; i < diff.length; i++) {
        const diffItem = diff[i];
        let pointAdded = true;

        let oldIdx2: number;
        let newIdx2: number;

        // FIXME, animation is not so perfect when dataZoom window moves fast
        // Which is in case remvoing or add more than one data in the tail or head
        switch (diffItem.cmd) {
            case '=':
                oldIdx2 = diffItem.idx * 2;
                newIdx2 = diffItem.idx1 * 2;
                let currentX = oldPoints[oldIdx2];
                let currentY = oldPoints[oldIdx2 + 1];
                const nextX = newPoints[newIdx2];
                const nextY = newPoints[newIdx2 + 1];

                // If previous data is NaN, use next point directly
                if (isNaN(currentX) || isNaN(currentY)) {
                    currentX = nextX;
                    currentY = nextY;
                }
                currPoints.push(currentX, currentY);
                nextPoints.push(nextX, nextY);

                currStackedPoints.push(oldStackedOnPoints[oldIdx2], oldStackedOnPoints[oldIdx2 + 1]);
                nextStackedPoints.push(newStackedOnPoints[newIdx2], newStackedOnPoints[newIdx2 + 1]);

                rawIndices.push(newData.getRawIndex(diffItem.idx1));
                break;
            case '+':
                const newIdx = diffItem.idx;
                const newDataDimsForPoint = newDataOldCoordInfo.dataDimsForPoint;
                const oldPt = oldCoordSys.dataToPoint([
                    newData.get(newDataDimsForPoint[0], newIdx),
                    newData.get(newDataDimsForPoint[1], newIdx)
                ]);
                newIdx2 = newIdx * 2;
                currPoints.push(oldPt[0], oldPt[1]);

                nextPoints.push(newPoints[newIdx2], newPoints[newIdx2 + 1]);

                const stackedOnPoint = getStackedOnPoint(newDataOldCoordInfo, oldCoordSys, newData, newIdx);

                currStackedPoints.push(stackedOnPoint[0], stackedOnPoint[1]);
                nextStackedPoints.push(newStackedOnPoints[newIdx2], newStackedOnPoints[newIdx2 + 1]);

                rawIndices.push(newData.getRawIndex(newIdx));
                break;
            case '-':
                const oldIdx = diffItem.idx;
                const rawIndex = oldData.getRawIndex(oldIdx);
                const oldDataDimsForPoint = oldDataNewCoordInfo.dataDimsForPoint;
                oldIdx2 = oldIdx * 2;
                // Data is replaced. In the case of dynamic data queue
                // FIXME FIXME FIXME
                if (rawIndex !== oldIdx) {
                    const newPt = newCoordSys.dataToPoint([
                        oldData.get(oldDataDimsForPoint[0], oldIdx),
                        oldData.get(oldDataDimsForPoint[1], oldIdx)
                    ]);
                    const newStackedOnPt = getStackedOnPoint(oldDataNewCoordInfo, newCoordSys, oldData, oldIdx);

                    currPoints.push(oldPoints[oldIdx2], oldPoints[oldIdx2 + 1]);
                    nextPoints.push(newPt[0], newPt[1]);

                    currStackedPoints.push(oldStackedOnPoints[oldIdx2], oldStackedOnPoints[oldIdx2 + 1]);
                    nextStackedPoints.push(newStackedOnPt[0], newStackedOnPt[1]);

                    rawIndices.push(rawIndex);
                }
                else {
                    pointAdded = false;
                }
        }

        // Original indices
        if (pointAdded) {
            status.push(diffItem);
            sortedIndices.push(sortedIndices.length);
        }
    }

    // Diff result may be crossed if all items are changed
    // Sort by data index
    sortedIndices.sort(function (a, b) {
        return rawIndices[a] - rawIndices[b];
    });

    const len = currPoints.length;
    const sortedCurrPoints = createFloat32Array(len);
    const sortedNextPoints = createFloat32Array(len);

    const sortedCurrStackedPoints = createFloat32Array(len);
    const sortedNextStackedPoints = createFloat32Array(len);

    const sortedStatus = [];
    for (let i = 0; i < sortedIndices.length; i++) {
        const idx = sortedIndices[i];
        const i2 = i * 2;
        const idx2 = idx * 2;
        sortedCurrPoints[i2] = currPoints[idx2];
        sortedCurrPoints[i2 + 1] = currPoints[idx2 + 1];
        sortedNextPoints[i2] = nextPoints[idx2];
        sortedNextPoints[i2 + 1] = nextPoints[idx2 + 1];

        sortedCurrStackedPoints[i2] = currStackedPoints[idx2];
        sortedCurrStackedPoints[i2 + 1] = currStackedPoints[idx2 + 1];
        sortedNextStackedPoints[i2] = nextStackedPoints[idx2];
        sortedNextStackedPoints[i2 + 1] = nextStackedPoints[idx2 + 1];

        sortedStatus[i] = status[idx];
    }

    return {
        current: sortedCurrPoints,
        next: sortedNextPoints,

        stackedOnCurrent: sortedCurrStackedPoints,
        stackedOnNext: sortedNextStackedPoints,

        status: sortedStatus
    };
}