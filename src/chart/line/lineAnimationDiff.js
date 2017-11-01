
// var arrayDiff = require('zrender/src/core/arrayDiff');
// 'zrender/src/core/arrayDiff' has been used before, but it did
// not do well in performance when roam with fixed dataZoom window.

function sign(val) {
    return val >= 0 ? 1 : -1;
}

function getStackedOnPoint(coordSys, data, idx) {
    var baseAxis = coordSys.getBaseAxis();
    var valueAxis = coordSys.getOtherAxis(baseAxis);
    var valueStart = baseAxis.onZero
        ? 0 : valueAxis.scale.getExtent()[0];

    var valueDim = valueAxis.dim;
    var baseDataOffset = valueDim === 'x' || valueDim === 'radius' ? 1 : 0;

    var stackedOnSameSign;
    var stackedOn = data.stackedOn;
    var val = data.get(valueDim, idx);
    // Find first stacked value with same sign
    while (stackedOn &&
        sign(stackedOn.get(valueDim, idx)) === sign(val)
    ) {
        stackedOnSameSign = stackedOn;
        break;
    }
    var stackedData = [];
    stackedData[baseDataOffset] = data.get(baseAxis.dim, idx);
    stackedData[1 - baseDataOffset] = stackedOnSameSign
        ? stackedOnSameSign.get(valueDim, idx, true) : valueStart;

    return coordSys.dataToPoint(stackedData);
}

// function convertToIntId(newIdList, oldIdList) {
//     // Generate int id instead of string id.
//     // Compare string maybe slow in score function of arrDiff

//     // Assume id in idList are all unique
//     var idIndicesMap = {};
//     var idx = 0;
//     for (var i = 0; i < newIdList.length; i++) {
//         idIndicesMap[newIdList[i]] = idx;
//         newIdList[i] = idx++;
//     }
//     for (var i = 0; i < oldIdList.length; i++) {
//         var oldId = oldIdList[i];
//         // Same with newIdList
//         if (idIndicesMap[oldId]) {
//             oldIdList[i] = idIndicesMap[oldId];
//         }
//         else {
//             oldIdList[i] = idx++;
//         }
//     }
// }

function diffData(oldData, newData) {
    var diffResult = [];

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
    oldData, newData,
    oldStackedOnPoints, newStackedOnPoints,
    oldCoordSys, newCoordSys
) {
    var diff = diffData(oldData, newData);

    // var newIdList = newData.mapArray(newData.getId);
    // var oldIdList = oldData.mapArray(oldData.getId);

    // convertToIntId(newIdList, oldIdList);

    // // FIXME One data ?
    // diff = arrayDiff(oldIdList, newIdList);

    var currPoints = [];
    var nextPoints = [];
    // Points for stacking base line
    var currStackedPoints = [];
    var nextStackedPoints = [];

    var status = [];
    var sortedIndices = [];
    var rawIndices = [];
    var dims = newCoordSys.dimensions;
    for (var i = 0; i < diff.length; i++) {
        var diffItem = diff[i];
        var pointAdded = true;

        // FIXME, animation is not so perfect when dataZoom window moves fast
        // Which is in case remvoing or add more than one data in the tail or head
        switch (diffItem.cmd) {
            case '=':
                var currentPt = oldData.getItemLayout(diffItem.idx);
                var nextPt = newData.getItemLayout(diffItem.idx1);
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
                var idx = diffItem.idx;
                currPoints.push(
                    oldCoordSys.dataToPoint([
                        newData.get(dims[0], idx, true), newData.get(dims[1], idx, true)
                    ])
                );

                nextPoints.push(newData.getItemLayout(idx).slice());

                currStackedPoints.push(
                    getStackedOnPoint(oldCoordSys, newData, idx)
                );
                nextStackedPoints.push(newStackedOnPoints[idx]);

                rawIndices.push(newData.getRawIndex(idx));
                break;
            case '-':
                var idx = diffItem.idx;
                var rawIndex = oldData.getRawIndex(idx);
                // Data is replaced. In the case of dynamic data queue
                // FIXME FIXME FIXME
                if (rawIndex !== idx) {
                    currPoints.push(oldData.getItemLayout(idx));
                    nextPoints.push(newCoordSys.dataToPoint([
                        oldData.get(dims[0], idx, true), oldData.get(dims[1], idx, true)
                    ]));

                    currStackedPoints.push(oldStackedOnPoints[idx]);
                    nextStackedPoints.push(
                        getStackedOnPoint(
                            newCoordSys, oldData, idx
                        )
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

    var sortedCurrPoints = [];
    var sortedNextPoints = [];

    var sortedCurrStackedPoints = [];
    var sortedNextStackedPoints = [];

    var sortedStatus = [];
    for (var i = 0; i < sortedIndices.length; i++) {
        var idx = sortedIndices[i];
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