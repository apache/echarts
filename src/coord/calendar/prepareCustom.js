define(function(require) {

    var zrUtil = require('zrender/core/util');

    function prepareCustom(coordSys) {
        var rect = coordSys.getRect();
        return {
            coordSys: {
                type: 'geo',
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                cellWidth: coordSys.getCellWidth(),
                cellHeight: coordSys.getCellHeight()
            },
            api: {
                coord: zrUtil.bind(coordSys.dataToPoint, coordSys)
            }
        };
    }

    return prepareCustom;
});