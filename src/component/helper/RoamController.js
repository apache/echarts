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
                var scale = target.scale;
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
        var x = e.offsetX;
        var y = e.offsetY;
        var rect = this.rect;
        if (rect && rect.contain(x, y)) {

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

        zr.on('mousedown', mousedown, this);
        zr.on('mousemove', mousemove, this);
        zr.on('mouseup', mouseup, this);
        zr.on('mousewheel', mousewheel, this);

        Eventful.call(this);
    }

    zrUtil.mixin(RoamController, Eventful);

    return RoamController;
});