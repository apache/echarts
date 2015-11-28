/**
 * Box selection tool.
 *
 * @module echarts/component/helper/SelectController
 */

define(function (require) {

    var Eventful = require('zrender/mixin/Eventful');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var bind = zrUtil.bind;
    var each = zrUtil.each;
    var mathMin = Math.min;
    var mathMax = Math.max;
    var mathPow = Math.pow;

    var UNSELECT_THRESHOLD = 2;
    var EVENTS = ['mousedown', 'mousemove', 'mouseup'];

    /**
     * @alias module:echarts/component/helper/SelectController
     * @constructor
     * @mixin {module:zrender/mixin/Eventful}
     *
     * @param {string} type 'line', 'rect'
     * @param {module:zrender/zrender~ZRender} zr
     * @param {Object} [opt]
     * @param {number} [opt.width]
     * @param {number} [opt.lineWidth]
     * @param {string} [opt.stroke]
     * @param {string} [opt.fill]
     */
    function SelectController(type, zr, opt) {

        Eventful.call(this);

        /**
         * @type {string}
         * @readOnly
         */
        this.type = type;

        /**
         * @type {module:zrender/zrender~ZRender}
         */
        this.zr = zr;

        /**
         * @type {Object}
         * @readOnly
         */
        this.opt = zrUtil.clone(opt, true);

        /**
         * @type {module:zrender/container/Group}
         * @readOnly
         */
        this.group = new graphic.Group();

        /**
         * @type {module:zrender/core/BoundingRect}
         */
        this._containerRect = null;

        /**
         * @type {Array.<nubmer>}
         * @private
         */
        this._track = [];

        /**
         * @type {boolean}
         */
        this._dragging;

        /**
         * @type {module:zrender/Element}
         * @private
         */
        this._cover;

        /**
         * @type {boolean}
         * @private
         */
        this._disabled = true;

        /**
         * @type {Object}
         * @private
         */
        this._handlers = {
            mousedown: bind(mousedown, this),
            mousemove: bind(mousemove, this),
            mouseup: bind(mouseup, this)
        };

        each(EVENTS, function (eventName) {
            this.zr.on(eventName, this._handlers[eventName]);
        }, this);
    }

    SelectController.prototype = {

        constructor: SelectController,

        /**
         * @param {module:zrender/mixin/Transformable} container
         */
        enable: function (container) {

            this._disabled = false;

            // Remove from old container.
            removeGroup.call(this);

            // boundingRect will change when dragging, so we have
            // to keep initial boundingRect.
            this._containerRect = container.getBoundingRect();

            // Add to new container.
            container.add(this.group);
        },

        /**
         * Update cover location.
         * @param {Array.<number>|Object} ranges
         */
        update: function (ranges) {
            // TODO
            // Only support one interval yet.
            if (ranges) {
                renderCover.call(this, zrUtil.clone(ranges, true));
            }
        },

        disable: function () {
            this._disabled = true;

            removeGroup.call(this);
        },

        dispose: function () {
            this.disable();

            each(EVENTS, function (eventName) {
                this.zr.off(eventName, this._handlers[eventName]);
            }, this);
        }
    };


    zrUtil.mixin(SelectController, Eventful);


    function isInContainer(x, y) {
        var localPos = this.group.transformCoordToLocal(x, y);
        return this._containerRect.contain(localPos[0], localPos[1]);
    }

    function preventDefault(e) {
        var rawE = e.event;
        rawE.preventDefault && rawE.preventDefault();
    }

    function mousedown(e) {
        if (this._disabled || (e.target && e.target.draggable)) {
            return;
        }

        preventDefault(e);

        var x = e.offsetX;
        var y = e.offsetY;

        if (isInContainer.call(this, x, y)) {
            this._dragging = true;
            this._track = [[x, y]];
        }
    }

    function mousemove(e) {
        if (!this._dragging || this._disabled) {
            return;
        }

        preventDefault(e);

        updateViewByCursor.call(this, e);
    }

    function mouseup(e) {
        if (!this._dragging || this._disabled) {
            return;
        }

        preventDefault(e);

        updateViewByCursor.call(this, e);

        this._dragging = false;
        this._track = [];
    }

    function updateViewByCursor(e) {
        var x = e.offsetX;
        var y = e.offsetY;

        if (isInContainer.call(this, x, y)) {
            this._track.push([x, y]);

            // Create or update cover.
            var ranges = shouldShowCover.call(this)
                ? coverRenderers[this.type].getRanges.call(this)
                // Remove cover.
                : [];

            renderCover.call(this, ranges);

            this.trigger('selected', zrUtil.clone(ranges, true));
        }
    }

    function shouldShowCover(p1, p2) {
        var track = this._track;

        if (!track.length) {
            return false;
        }

        var p2 = track[track.length - 1];
        var p1 = track[0];
        var dx = p2[0] - p1[0];
        var dy = p2[1] - p1[1];
        var dist = mathPow(dx * dx + dy * dy, 0.5);

        return dist > UNSELECT_THRESHOLD;
    }

    function renderCover(ranges) {
        var coverRenderer = coverRenderers[this.type];

        if (ranges.length) {
            if (!this._cover) {
                this._cover = coverRenderer.create.call(this);
                this.group.add(this._cover);
            }
            coverRenderer.update.call(this, ranges);
        }
        else {
            this.group.remove(this._cover);
            this._cover = null;
        }
    }

    function removeGroup() {
        // container may 'removeAll' outside.
        var group = this.group;
        var container = group.parent;
        if (container) {
            container.remove(group);
        }
    }

    function createRectCover() {
        var opt = this.opt;
        return new graphic.Rect({
            // FIXME
            // customize style.
            style: {
                stroke: opt.stroke,
                fill: opt.fill,
                lineWidth: opt.lineWidth,
                opacity: opt.opacity
            }
        });
    }

    function getLocalTrack() {
        return zrUtil.map(this._track, function (point) {
            return this.group.transformCoordToLocal(point[0], point[1]);
        }, this);
    }

    function getLocalTrackEnds() {
        var localTrack = getLocalTrack.call(this);
        var tail = localTrack.length - 1;
        tail < 0 && (tail = 0);
        return [localTrack[0], localTrack[tail]];
    }

    /**
     * key: this.type
     * @type {Object}
     */
    var coverRenderers = {

        line: {

            create: createRectCover,

            getRanges: function () {
                var ends = getLocalTrackEnds.call(this);
                var min = mathMin(ends[0][0], ends[1][0]);
                var max = mathMax(ends[0][0], ends[1][0]);

                return [[min, max]];
            },

            update: function (ranges) {
                var range = ranges[0];
                var width = this.opt.width;
                this._cover.setShape({
                    x: range[0],
                    y: -width / 2,
                    width: range[1] - range[0],
                    height: width
                });
            }
        },

        rect: {

            create: createRectCover,

            getRanges: function () {
                var ends = getLocalTrackEnds.call(this);

                var min = [
                    mathMin(ends[1][0], ends[0][0]),
                    mathMin(ends[1][1], ends[0][1])
                ];
                var max = [
                    mathMax(ends[1][0], ends[0][0]),
                    mathMax(ends[1][1], ends[0][1])
                ];

                return [{
                    x: min[0],
                    y: min[1],
                    width: max[0] - min[0],
                    height: max[1] - min[1]
                }];
            },

            update: function (ranges) {
                this._cover.setShape(ranges[0]);
            }
        }
    };

    return SelectController;
});