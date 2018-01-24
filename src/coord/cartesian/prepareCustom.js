import * as zrUtil from 'zrender/src/core/util';

function dataToCoordSize(dataSize, dataItem) {
    // dataItem is necessary in log axis.
    dataItem = dataItem || [0, 0];
    return zrUtil.map(['x', 'y'], function (dim, dimIdx) {
        var axis = this.getAxis(dim);
        var val = dataItem[dimIdx];
        var halfSize = dataSize[dimIdx] / 2;
        return axis.type === 'category'
            ? axis.getBandWidth()
            : Math.abs(axis.dataToCoord(val - halfSize) - axis.dataToCoord(val + halfSize));
    }, this);
}

export default function (coordSys) {
    var rect = coordSys.grid.getRect();
    return {
        coordSys: {
            // The name exposed to user is always 'cartesian2d' but not 'grid'.
            type: 'cartesian2d',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        },
        api: {
            coord: function (data) {
                // do not provide "out" param
                return coordSys.dataToPoint(data);
            },
            size: zrUtil.bind(dataToCoordSize, coordSys)
        }
    };
}
