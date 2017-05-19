define(function(require) {

    var zrUtil = require('zrender/core/util');

    function dataToCoordSize(dataSize, dataItem) {
        dataItem = dataItem || [0, 0];
        return zrUtil.map([0, 1], function (dimIdx) {
            var val = dataItem[dimIdx];
            var halfSize = dataSize[dimIdx] / 2;
            var p1 = [];
            var p2 = [];
            p1[dimIdx] = val - halfSize;
            p2[dimIdx] = val + halfSize;
            p1[1 - dimIdx] = p2[1 - dimIdx] = dataItem[1 - dimIdx];
            return Math.abs(this.dataToPoint(p1)[dimIdx] - this.dataToPoint(p2)[dimIdx]);
        }, this);
    }

    function prepareCustom(coordSys) {
        var rect = coordSys.getBoundingRect();
        return {
            coordSys: {
                type: 'geo',
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            },
            api: {
                coord: zrUtil.bind(coordSys.dataToPoint, coordSys),
                size: zrUtil.bind(dataToCoordSize, coordSys)
            }
        };
    }

    return prepareCustom;
});