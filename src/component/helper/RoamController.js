define(function (require) {

    var Eventful = require('zrender/mixin/Eventful');
    var zrUtil = require('zrender/core/util');

    function mousedown(e) {
        var x = e.offsetX;
        var y = e.offsetY;
        var rect = this.rect;
        if (rect && rect.contain(x, y)) {
            this._x = x;
            this._y = y;
            this._dragging = true;
        }
    }

    function mousemove(e) {
        if (this._dragging) {
            var x = e.offsetX;
            var y = e.offsetY;

            var dx = x - this._x;
            var dy = y - this._y;

            this._x = x;
            this._y = y;

            var target = this.target;

            if (target) {
                var pos = target.position;
                pos[0] += dx;
                pos[1] += dy;
                target.dirty();
            }

            this.trigger('pan', dx, dy);
        }
    }

    function mouseup(e) {
        this._dragging =false;
    }

    function mousewheel(e) {
        var mouseX = e.offsetX;
        var mouseY = e.offsetY;
        var rect = this.rect;
        var wheelDelta = e.wheelDelta > 0 ? 1.1 : 1 / 1.1;
        // console.log(wheelDelta, e.wheelDelta);
        if (rect && rect.contain(mouseX, mouseY)) {

            var target = this.target;

            if (target) {
                var pos = target.position;
                var scale = target.scale;

                var newZoom = this._zoom = this._zoom || 1;
                newZoom *= wheelDelta;
                // newZoom = Math.max(
                //     Math.min(target.maxZoom, newZoom),
                //     target.minZoom
                // );
                var zoomScale = newZoom / this._zoom;
                this._zoom = newZoom;
                // Keep the mouse center when scaling
                pos[0] -= (mouseX - pos[0]) * (zoomScale - 1);
                pos[1] -= (mouseY - pos[1]) * (zoomScale - 1);
                scale[0] *= zoomScale;
                scale[1] *= zoomScale;

                target.dirty();
            }

            this.trigger('zoom', wheelDelta, mouseX, mouseY);
        }
    }

    /**
     * @param {module:zrender/zrender~ZRender} zr
     * @param {module:zrender/Element} target
     * @param {module:zrender/core/BoundingRect} rect
     */
    function RoamController(zr, target, rect) {

        /**
         * @type {module:zrender/Element}
         */
        this.target = target;

        /**
         * @type {module:zrender/core/BoundingRect}
         */
        this.rect = rect;

        // Avoid two roamController bind the same handler
        var bind = zrUtil.bind;
        var mousedownHandler = bind(mousedown, this);
        var mousemoveHandler = bind(mousemove, this);
        var mouseupHandler = bind(mouseup, this);
        var mousewheelHandler = bind(mousewheel, this);

        zr.on('mousedown', mousedownHandler);
        zr.on('mousemove', mousemoveHandler);
        zr.on('mouseup', mouseupHandler);
        zr.on('mousewheel', mousewheelHandler);

        Eventful.call(this);

        this.dispose = function () {
            zr.off('mousedown', mousedownHandler);
            zr.off('mousemove', mousemoveHandler);
            zr.off('mouseup', mouseupHandler);
            zr.off('mousewheel', mousewheelHandler);
        }
    }

    zrUtil.mixin(RoamController, Eventful);

    return RoamController;
});