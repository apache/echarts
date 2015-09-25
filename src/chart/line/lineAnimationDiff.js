define(function (require) {

    var arrayDiff = require('zrender/core/arrayDiff');

    function nameCompare(a, b) {
        return a.name === b.name;
    }

    return function (oldData, newData, oldCoordSys, newCoordSys) {

        var oldPoints = [];
        var newPoints = [];
        var status = [];
        var sortedIndices = [];
        var rawIndices = [];

        // FIXME One data ?
        var diff = arrayDiff(oldData, newData, nameCompare);

        for (var i = 0; i < diff.length; i++) {
            var diffItem = diff[i];
            var pointAdded = true;

            // FIXME, animation is not so perfect when dataZoom window moves fast
            // Which is in case remvoing or add more than one data in the tail or head
            switch (diffItem.cmd) {
                case '=':
                    oldPoints.push(oldData[diffItem.idx].point);
                    newPoints.push(newData[diffItem.idx1].point);
                    rawIndices.push(newData[diffItem.idx1].rawIdx);
                    break;
                case '+':
                    var newDataItem = newData[diffItem.idx];
                    oldPoints.push(oldCoordSys.dataToPoint([newDataItem.x, newDataItem.y]));
                    newPoints.push(newDataItem.point);
                    rawIndices.push(newDataItem.rawIdx);
                    break;
                case '-':
                    var oldDataItem = oldData[diffItem.idx];
                    // Data is replaced. In the case of dynamic data queue
                    // FIXME FIXME FIXME
                    if (oldDataItem.rawIdx !== diffItem.idx) {
                        oldPoints.push(oldDataItem.point);
                        newPoints.push(newCoordSys.dataToPoint([oldDataItem.x, oldDataItem.y]));
                        rawIndices.push(oldDataItem.rawIdx);
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

        var sortedOldPoints = [];
        var sortedNewPoints = [];
        var sortedStatus = [];
        for (var i = 0; i < sortedIndices.length; i++) {
            var oldIndex = sortedIndices[i];
            sortedOldPoints[i] = oldPoints[oldIndex];
            sortedNewPoints[i] = newPoints[oldIndex];
            sortedStatus[i] = status[oldIndex];
        }

        return {
            current: sortedOldPoints,
            next: sortedNewPoints,
            status: sortedStatus
        };
    }
});