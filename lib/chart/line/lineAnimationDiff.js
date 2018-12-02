
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

var _helper = require("./helper");

var prepareDataCoordInfo = _helper.prepareDataCoordInfo;
var getStackedOnPoint = _helper.getStackedOnPoint;

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
// var arrayDiff = require('zrender/src/core/arrayDiff');
// 'zrender/src/core/arrayDiff' has been used before, but it did
// not do well in performance when roam with fixed dataZoom window.
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
  newData.diff(oldData).add(function (idx) {
    diffResult.push({
      cmd: '+',
      idx: idx
    });
  }).update(function (newIdx, oldIdx) {
    diffResult.push({
      cmd: '=',
      idx: oldIdx,
      idx1: newIdx
    });
  }).remove(function (idx) {
    diffResult.push({
      cmd: '-',
      idx: idx
    });
  }).execute();
  return diffResult;
}

function _default(oldData, newData, oldStackedOnPoints, newStackedOnPoints, oldCoordSys, newCoordSys, oldValueOrigin, newValueOrigin) {
  var diff = diffData(oldData, newData); // var newIdList = newData.mapArray(newData.getId);
  // var oldIdList = oldData.mapArray(oldData.getId);
  // convertToIntId(newIdList, oldIdList);
  // // FIXME One data ?
  // diff = arrayDiff(oldIdList, newIdList);

  var currPoints = [];
  var nextPoints = []; // Points for stacking base line

  var currStackedPoints = [];
  var nextStackedPoints = [];
  var status = [];
  var sortedIndices = [];
  var rawIndices = [];
  var newDataOldCoordInfo = prepareDataCoordInfo(oldCoordSys, newData, oldValueOrigin);
  var oldDataNewCoordInfo = prepareDataCoordInfo(newCoordSys, oldData, newValueOrigin);

  for (var i = 0; i < diff.length; i++) {
    var diffItem = diff[i];
    var pointAdded = true; // FIXME, animation is not so perfect when dataZoom window moves fast
    // Which is in case remvoing or add more than one data in the tail or head

    switch (diffItem.cmd) {
      case '=':
        var currentPt = oldData.getItemLayout(diffItem.idx);
        var nextPt = newData.getItemLayout(diffItem.idx1); // If previous data is NaN, use next point directly

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
        currPoints.push(oldCoordSys.dataToPoint([newData.get(newDataOldCoordInfo.dataDimsForPoint[0], idx), newData.get(newDataOldCoordInfo.dataDimsForPoint[1], idx)]));
        nextPoints.push(newData.getItemLayout(idx).slice());
        currStackedPoints.push(getStackedOnPoint(newDataOldCoordInfo, oldCoordSys, newData, idx));
        nextStackedPoints.push(newStackedOnPoints[idx]);
        rawIndices.push(newData.getRawIndex(idx));
        break;

      case '-':
        var idx = diffItem.idx;
        var rawIndex = oldData.getRawIndex(idx); // Data is replaced. In the case of dynamic data queue
        // FIXME FIXME FIXME

        if (rawIndex !== idx) {
          currPoints.push(oldData.getItemLayout(idx));
          nextPoints.push(newCoordSys.dataToPoint([oldData.get(oldDataNewCoordInfo.dataDimsForPoint[0], idx), oldData.get(oldDataNewCoordInfo.dataDimsForPoint[1], idx)]));
          currStackedPoints.push(oldStackedOnPoints[idx]);
          nextStackedPoints.push(getStackedOnPoint(oldDataNewCoordInfo, newCoordSys, oldData, idx));
          rawIndices.push(rawIndex);
        } else {
          pointAdded = false;
        }

    } // Original indices


    if (pointAdded) {
      status.push(diffItem);
      sortedIndices.push(sortedIndices.length);
    }
  } // Diff result may be crossed if all items are changed
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

module.exports = _default;