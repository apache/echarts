define(function (require) {

    var arrayDiff = require('zrender/core/arrayDiff');

    function nameCompare(a, b) {
        return a.name === b.name;
    }

    function getStackedOnPoint(coordSys, dataItem) {
        if ('x' in dataItem) {
            return coordSys.dataToPoint([dataItem.x, dataItem.y]);
        }
        else {
            var valueAxis = coordSys.getOtherAxis(coordSys.getBaseAxis());
            var valueStart = valueAxis.getExtent()[0];
            var dim = valueAxis.dim;
            dim === 'radius' && (dim = 'x');
            dim === 'angle' && (dim = 'y');
            var baseCoordOffset = dim === 'x' ? 1 : 0;
            var pt = [];
            pt[baseCoordOffset] = valueAxis.dataToCoord(dataItem[dim]);
            pt[1 - baseCoordOffset] = valueStart;
            return pt;
        }
    }

    return function (oldData, newData, oldStackedData, newStackedData, oldCoordSys, newCoordSys) {

        var oldPoints = [];
        var newPoints = [];
        // Points for stacking base line
        var oldStackedPoints = [];
        var newStackedPoints = [];

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

                    oldStackedPoints.push(oldStackedData[diffItem.idx].point);
                    newStackedPoints.push(newStackedData[diffItem.idx1].point);

                    rawIndices.push(newData[diffItem.idx1].rawIdx);
                    break;
                case '+':
                    var newDataItem = newData[diffItem.idx];
                    var newStackedDataItem = newStackedData[diffItem.idx];

                    oldPoints.push(
                        oldCoordSys.dataToPoint([newDataItem.x, newDataItem.y])
                    );
                    newPoints.push(newDataItem.point);

                    oldStackedPoints.push(
                        getStackedOnPoint(oldCoordSys, newStackedDataItem)
                    );
                    newStackedPoints.push(newStackedPoints)

                    rawIndices.push(newDataItem.rawIdx);
                    break;
                case '-':
                    var oldDataItem = oldData[diffItem.idx];
                    var oldStackedDataItem = oldStackedData[diffItem.idx];

                    // Data is replaced. In the case of dynamic data queue
                    // FIXME FIXME FIXME
                    if (oldDataItem.rawIdx !== diffItem.idx) {
                        oldPoints.push(oldDataItem.point);
                        newPoints.push(newCoordSys.dataToPoint([oldDataItem.x, oldDataItem.y]));

                        oldStackedPoints.push(oldStackedDataItem.point);
                        newStackedPoints.push(
                            getStackedOnPoint(newCoordSys, oldStackedDataItem)
                        );

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

        var sortedOldStackedPoints = [];
        var sortedNewStackedPoints = [];

        var sortedStatus = [];
        for (var i = 0; i < sortedIndices.length; i++) {
            var idx = sortedIndices[i];
            sortedOldPoints[i] = oldPoints[idx];
            sortedNewPoints[i] = newPoints[idx];

            sortedOldStackedPoints[i] = oldStackedPoints[idx];
            sortedNewStackedPoints[i] = newStackedPoints[idx];

            sortedStatus[i] = status[idx];
        }

        return {
            current: sortedOldPoints,
            next: sortedNewPoints,

            stackedOnCurrent: sortedOldStackedPoints,
            stackedOnNext: sortedNewStackedPoints,

            status: sortedStatus
        };
    }
});