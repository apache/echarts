define(function(require) {

    var zrUtil = require('zrender/core/util');

    function dataToCoordSize(dataSize, dataItem) {
        // dataItem is necessary in log axis.
        return zrUtil.map(['Radius', 'Angle'], function (dim, dimIdx) {
            var axis = this['get' + dim + 'Axis']();
            var val = dataItem[dimIdx];
            var halfSize = dataSize[dimIdx] / 2;
            var method = 'dataTo' + dim;

            var result = axis.type === 'category'
                ? axis.getBandWidth()
                : Math.abs(axis[method](val - halfSize) - axis[method](val + halfSize));

            if (dim === 'Angle') {
                result = result * Math.PI / 180;
            }

            return result;

        }, this);
    }

    function prepareCustom(coordSys) {
        var radiusAxis = coordSys.getRadiusAxis();
        var angleAxis = coordSys.getAngleAxis();
        var radius = radiusAxis.getExtent();
        radius[0] > radius[1] && radius.reverse();

        return {
            coordSys: {
                type: 'polar',
                cx: coordSys.cx,
                cy: coordSys.cy,
                r: radius[1],
                r0: radius[0]
            },
            api: {
                coord: zrUtil.bind(function (data) {
                    var radius = radiusAxis.dataToRadius(data[0]);
                    var angle = angleAxis.dataToAngle(data[1]);
                    var coord = coordSys.coordToPoint([radius, angle]);
                    coord.push(radius, angle * Math.PI / 180);
                    return coord;
                }),
                size: zrUtil.bind(dataToCoordSize, coordSys)
            }
        };
    }

    return prepareCustom;
});