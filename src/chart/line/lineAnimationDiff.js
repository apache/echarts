define(function (require) {

    var arrayDiff = require('zrender/core/arrayDiff');

    function nameCompare(a, b) {
        return a.name === b.name;
    }

    return function (oldData, newData) {

        var oldPoints = [];
        var newPoints = [];

        // FIXME One data ?
        var diff = arrayDiff(oldData, newData, nameCompare);

        var prevDiffNotRemove;
        var diffCount = diff.length;

        for (var i = 0; i < diffCount; i++) {
            var diffItem = diff[i];

            switch (diffItem.cmd) {
                case '=':
                    oldPoints.push(oldData[diffItem.idx].point);
                    newPoints.push(newData[diffItem.idx1].point);
                    prevDiffNotRemove = diffItem;
                    break;
                case '+':
                    // Like growing from sibling data animation
                    // var siblingData = newData[diffItem.idx + 1] || newData[diffItem.idx - 1];

                    // Keep static
                    oldPoints.push(newData[diffItem.idx].point);
                    newPoints.push(newData[diffItem.idx].point);
                    prevDiffNotRemove = diffItem;
                    break;
                case '-':
                    // Like merging into sibling data animation
                    var siblingDiffNotRemove = prevDiffNotRemove;
                    if (! siblingDiffNotRemove) {
                        // If first element is removing, Find next diff which is not removing
                        for (var k = i + 1; k < diffCount; k++) {
                            if (diff[k].cmd !== '-') {
                                siblingDiffNotRemove = diff[k];
                                break;
                            }
                        }
                    }
                    var siblingDataNotRemove = newData[
                        siblingDiffNotRemove.cmd === '+'
                        ? siblingDiffNotRemove.idx : siblingDiffNotRemove.idx1
                    ];

                    oldPoints.push(oldData[diffItem.idx].point);
                    newPoints.push(siblingDataNotRemove.point);
            }
        }

        return {
            current: oldPoints,
            next: newPoints
        };
    }
});