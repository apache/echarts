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

export default function (
    oldData: List, newData: List,
    oldStackedOnPoints: number[][], newStackedOnPoints: number[][],
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

    const currPoints: number[][] = [];
    const nextPoints: number[][] = [];
    // Points for stacking base line
    const currStackedPoints: number[][] = [];
    const nextStackedPoints: number[][] = [];

    const status = [];
    const sortedIndices: number[] = [];
    const rawIndices: number[] = [];

    const newDataOldCoordInfo = prepareDataCoordInfo(oldCoordSys, newData, oldValueOrigin);
    const oldDataNewCoordInfo = prepareDataCoordInfo(newCoordSys, oldData, newValueOrigin);

    for (let i = 0; i < diff.length; i++) {
        const diffItem = diff[i];
        let pointAdded = true;

        // FIXME, animation is not so perfect when dataZoom window moves fast
        // Which is in case remvoing or add more than one data in the tail or head
        switch (diffItem.cmd) {
            case '=':
                let currentPt = oldData.getItemLayout(diffItem.idx) as number[];
                const nextPt = newData.getItemLayout(diffItem.idx1) as number[];
                // If previous data is NaN, use next point directly
                if (isNaN(currentPt[0]) || isNaN(currentPt[1])) {
                    currentPt = nextPt.slice();
                }
                currPoints.push(currentPt);
                nextPoints.push(nextPt);

                currStackedPoints.push(oldStackedOnPoints[diffItem.idx]);
                nextStackedPoints.push(newStackedOnPoints[diffItem.idx1]);

                rawIndices.push(newData.getRawIndex(diffItem.idx1));
                break;
            case '+':
                const idxAdd = diffItem.idx;
                currPoints.push(
                    oldCoordSys.dataToPoint([
                        newData.get(newDataOldCoordInfo.dataDimsForPoint[0], idxAdd),
                        newData.get(newDataOldCoordInfo.dataDimsForPoint[1], idxAdd)
                    ])
                );

                nextPoints.push((newData.getItemLayout(idxAdd) as number[]).slice());

                currStackedPoints.push(
                    getStackedOnPoint(newDataOldCoordInfo, oldCoordSys, newData, idxAdd)
                );
                nextStackedPoints.push(newStackedOnPoints[idxAdd]);

                rawIndices.push(newData.getRawIndex(idxAdd));
                break;
            case '-':
                const idxMinus = diffItem.idx;
                const rawIndex = oldData.getRawIndex(idxMinus);
                // Data is replaced. In the case of dynamic data queue
                // FIXME FIXME FIXME
                if (rawIndex !== idxMinus) {
                    currPoints.push(oldData.getItemLayout(idxMinus) as number[]);
                    nextPoints.push(newCoordSys.dataToPoint([
                        oldData.get(oldDataNewCoordInfo.dataDimsForPoint[0], idxMinus),
                        oldData.get(oldDataNewCoordInfo.dataDimsForPoint[1], idxMinus)
                    ]));

                    currStackedPoints.push(oldStackedOnPoints[idxMinus]);
                    nextStackedPoints.push(
                        getStackedOnPoint(oldDataNewCoordInfo, newCoordSys, oldData, idxMinus)
                    );

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

    const sortedCurrPoints = [];
    const sortedNextPoints = [];

    const sortedCurrStackedPoints = [];
    const sortedNextStackedPoints = [];

    const sortedStatus = [];
    for (let i = 0; i < sortedIndices.length; i++) {
        const idx = sortedIndices[i];
        sortedCurrPoints[i] = currPoints[idx];
        sortedNextPoints[i] = nextPoints[idx];

        sortedCurrStackedPoints[i] = currStackedPoints[idx];
        sortedNextStackedPoints[i] = nextStackedPoints[idx];

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