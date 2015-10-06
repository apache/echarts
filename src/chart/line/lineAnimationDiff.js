define(function (require) {

    var arrayDiff = require('zrender/core/arrayDiff');

    function nameCompare(a, b) {
        return a.name === b.name;
    }

    function sign(val) {
        return val >= 0 ? 1 : -1;
    }

    function getStackedOnPoint(coordSys, data, idx) {
        var baseAxis = coordSys.getBaseAxis();
        var valueAxis = coordSys.getOtherAxis(baseAxis);
        var valueAxisStart = baseAxis.onZero
            ? valueAxis.dataToCoord(0) : valueAxis.getExtent()[0];

        var valueDim = valueAxis.dim;
        var baseCoordOffset = valueDim === 'x' || valueDim === 'radius' ? 1 : 0;

        var stackedOnSameSign;
        var stackedOn = data.stackedOn;
        var val = data.get(valueDim, idx);
        if (val > 0) {
            // Find first stacked value with same sign
            while (stackedOn &&
                sign(stackedOn.get(valueDim, idx)) === sign(val)
            ) {
                stackedOnSameSign = stackedOn;
                break;
            }
        }
        var pt = [];
        pt[baseCoordOffset] = data.getItemLayout(idx)[baseCoordOffset];
        pt[1 - baseCoordOffset] = stackedOnSameSign
            ? stackedOnSameSign.getItemLayout(idx)[1 - baseCoordOffset]
            : valueAxisStart;
        return pt;
    }

    return function (
        oldData, newData,
        oldStackedOnPoints, newStackedOnPoints,
        oldCoordSys, newCoordSys
    ) {

        var newNameList = newData.map(newData.getName);
        var oldNameList = oldData.map(oldData.getName);

        var currPoints = [];
        var nextPoints = [];
        // Points for stacking base line
        var currStackedPoints = [];
        var nextStackedPoints = [];

        var status = [];
        var sortedIndices = [];
        var rawIndices = [];

        // FIXME One data ?
        var diff = arrayDiff(oldNameList, newNameList);

        for (var i = 0; i < diff.length; i++) {
            var diffItem = diff[i];
            var pointAdded = true;

            // FIXME, animation is not so perfect when dataZoom window moves fast
            // Which is in case remvoing or add more than one data in the tail or head
            switch (diffItem.cmd) {
                case '=':
                    currPoints.push(oldData.getItemLayout(diffItem.idx));
                    nextPoints.push(newData.getItemLayout(diffItem.idx1));

                    currStackedPoints.push(oldStackedOnPoints[diffItem.idx]);
                    nextStackedPoints.push(newStackedOnPoints[diffItem.idx1]);

                    rawIndices.push(newData.getRawIndex(diffItem.idx));
                    break;
                case '+':
                    var idx = diffItem.idx;
                    currPoints.push(
                        oldCoordSys.dataToPoint([
                            newData.get('x', idx), newData.get('y', idx)
                        ])
                    );
                    nextPoints.push(newData.getItemLayout(idx));

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
                            oldData.get('x', idx), oldData.get('y', idx)
                        ]));

                        currStackedPoints.push(oldStackedOnPoints[idx]);
                        nextStackedPoints.push(
                            getStackedOnPoint(
                                newCoordSys, newData, idx
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
});