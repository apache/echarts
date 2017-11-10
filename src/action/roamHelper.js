/**
 * @param {module:echarts/coord/View} view
 * @param {Object} payload
 * @param {Object} [zoomLimit]
 */
export function updateCenterAndZoom(
    view, payload, zoomLimit
) {
    var previousZoom = view.getZoom();
    var center = view.getCenter();
    var zoom = payload.zoom;

    var point = view.dataToPoint(center);

    if (payload.dx != null && payload.dy != null) {
        point[0] -= payload.dx;
        point[1] -= payload.dy;

        var center = view.pointToData(point);
        view.setCenter(center);
    }
    if (zoom != null) {
        if (zoomLimit) {
            var zoomMin = zoomLimit.min || 0;
            var zoomMax = zoomLimit.max || Infinity;
            zoom = Math.max(
                Math.min(previousZoom * zoom, zoomMax),
                zoomMin
            ) / previousZoom;
        }

        // Zoom on given point(originX, originY)
        view.scale[0] *= zoom;
        view.scale[1] *= zoom;
        var position = view.position;
        var fixX = (payload.originX - position[0]) * (zoom - 1);
        var fixY = (payload.originY - position[1]) * (zoom - 1);

        position[0] -= fixX;
        position[1] -= fixY;

        view.updateTransform();
        // Get the new center
        var center = view.pointToData(point);
        view.setCenter(center);
        view.setZoom(zoom * previousZoom);
    }

    return {
        center: view.getCenter(),
        zoom: view.getZoom()
    };
}
