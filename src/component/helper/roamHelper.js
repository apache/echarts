
/**
 * For geo and graph.
 *
 * @param {Object} controllerHost
 * @param {module:zrender/Element} controllerHost.target
 */
export function updateViewOnPan(controllerHost, dx, dy) {
    var target = controllerHost.target;
    var pos = target.position;
    pos[0] += dx;
    pos[1] += dy;
    target.dirty();
}

/**
 * For geo and graph.
 *
 * @param {Object} controllerHost
 * @param {module:zrender/Element} controllerHost.target
 * @param {number} controllerHost.zoom
 * @param {number} controllerHost.zoomLimit like: {min: 1, max: 2}
 */
export function updateViewOnZoom(controllerHost, zoomDelta, zoomX, zoomY) {
    var target = controllerHost.target;
    var zoomLimit = controllerHost.zoomLimit;
    var pos = target.position;
    var scale = target.scale;

    var newZoom = controllerHost.zoom = controllerHost.zoom || 1;
    newZoom *= zoomDelta;
    if (zoomLimit) {
        var zoomMin = zoomLimit.min || 0;
        var zoomMax = zoomLimit.max || Infinity;
        newZoom = Math.max(
            Math.min(zoomMax, newZoom),
            zoomMin
        );
    }
    var zoomScale = newZoom / controllerHost.zoom;
    controllerHost.zoom = newZoom;
    // Keep the mouse center when scaling
    pos[0] -= (zoomX - pos[0]) * (zoomScale - 1);
    pos[1] -= (zoomY - pos[1]) * (zoomScale - 1);
    scale[0] *= zoomScale;
    scale[1] *= zoomScale;

    target.dirty();
}
