define(function (require) {

    var arrayDiff = require('zrender/core/arrayDiff');

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

    return function (
        oldData, newData,
        oldStackedOnPoints, newStackedOnPoints,
        oldCoordSys, newCoordSys
    ) {

        var newIdList = newData.mapArray(newData.getId);
        var oldIdList = oldData.mapArray(oldData.getId);

        var currPoints = [];
        var nextPoints = [];
        // Points for stacking base line
        var currStackedPoints = [];
        var nextStackedPoints = [];

        var status = [];
        var sortedIndices = [];
        var rawIndices = [];

        // FIXME One data ?
        var diff = arrayDiff(oldIdList, newIdList);

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
    };
});