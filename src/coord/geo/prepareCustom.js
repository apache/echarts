import * as zrUtil from 'zrender/src/core/util';

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

export default function (coordSys) {
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
            coord: function (data) {
                // do not provide "out" and noRoam param,
                // Compatible with this usage:
                // echarts.util.map(item.points, api.coord)
                return coordSys.dataToPoint(data);
            },
            size: zrUtil.bind(dataToCoordSize, coordSys)
        }
    };
}
