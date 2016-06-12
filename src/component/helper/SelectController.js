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

    var COVER_Z = 10000;
    var UNSELECT_THRESHOLD = 2;
    var EVENTS = ['mousedown', 'mousemove', 'mouseup'];
    var MIN_RESIZE_LINE_WIDTH = 6;

    var DIRECTION_MAP = {
        w: [0, 0],
        e: [0, 1],
        n: [1, 0],
        s: [1, 1]
    };
    var CURSOR_MAP = {
        w: 'ew',
        e: 'ew',
        n: 'ns',
        s: 'ns',
        ne: 'nesw',
        sw: 'nesw',
        nw: 'nwse',
        se: 'nwse'
    };

    /**
     * @alias module:echarts/component/helper/SelectController
     * @constructor
     * @mixin {module:zrender/mixin/Eventful}
     *
     * @param {string} type 'line', 'rect', 'pencil'
     * @param {module:zrender/zrender~ZRender} zr
     * @param {Object} [opt]
     * @param {number} [opt.width]
     * @param {number} [opt.lineWidth]
     * @param {string} [opt.stroke]
     * @param {string} [opt.fill]
     * @param {boolean} [opt.transformEnabled]
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
        this.opt = zrUtil.clone(opt);

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
         * @type {Array.<Array>}
         * @private
         */
        this._ranges;

        var coverRenderer = coverRenderers[type];
        if (coverRenderer.isInRange) {
            this.isInRange = coverRenderer.isInRange;
        }

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
         * @param {module:zrender/core/BoundingRect|boolean} [rect] If not specified,
         *                                                  use container.getBoundingRect().
         *                                                  If false, do not use containerRect.
         */
        enable: function (container, rect) {

            this._disabled = false;

            // Remove from old container.
            removeGroup.call(this);

            // boundingRect will change when dragging, so we have
            // to keep initial boundingRect.
            this._containerRect = rect !== false
            ? (rect || container.getBoundingRect()) : null;

            // Add to new container.
            container.add(this.group);
        },

        /**
         * Update cover location.
         * @param {Array.<number>|Object} ranges If null/undefined, remove cover.
         */
        update: function (ranges) {
            // TODO
            // Only support one interval yet.
            this._ranges = ranges && zrUtil.clone(ranges);
            renderCover.call(this);
        },

        disable: function () {
            this._disabled = true;
            this._ranges = null;

            removeGroup.call(this);
        },

        dispose: function () {
            this.disable();

            each(EVENTS, function (eventName) {
                this.zr.off(eventName, this._handlers[eventName]);
            }, this);
        },

        /**
         * @param {Array.<number>} point
         * @return {boolean}
         */
        isInRange: function (point) {
            return false;
        }
    };


    zrUtil.mixin(SelectController, Eventful);

    function updateZ(group) {
        group.traverse(function (el) {
            el.z = COVER_Z;
        });
    }

    function isInContainer(x, y) {
        var localPos = this.group.transformCoordToLocal(x, y);
        return !this._containerRect
            || this._containerRect.contain(localPos[0], localPos[1]);
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

        updateViewByCursor.call(this, e, false);
    }

    function mouseup(e) {
        if (!this._dragging || this._disabled) {
            return;
        }

        preventDefault(e);

        updateViewByCursor.call(this, e, true);

        this._dragging = false;
        this._track = [];
    }

    function updateViewByCursor(e, isEnd) {
        var x = e.offsetX;
        var y = e.offsetY;

        if (isInContainer.call(this, x, y)) {
            this._track.push([x, y]);

            this._ranges = shouldShowCover.call(this)
                // Create or update cover.
                ? coverRenderers[this.type].getRanges.call(this)
                // Remove cover.
                : [];

            renderAndTrigger.call(this, isEnd);
        }
    }

    function renderAndTrigger(isEnd, ranges) {
        renderCover.call(this);
        this.trigger('selected', this._ranges, isEnd);
    }

    function shouldShowCover() {
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

    function renderCover() {
        var coverRenderer = coverRenderers[this.type];
        var ranges = this._ranges;

        if (ranges && ranges.length) {
            if (!this._cover) {
                this._cover = coverRenderer.createCover.call(this);
                this.group.add(this._cover);
            }
            coverRenderer.updateCover.call(this, ranges);
        }
        else {
            this.group.remove(this._cover);
            this._cover = null;
        }

        updateZ(this.group);
    }

    function removeGroup() {
        // container may 'removeAll' outside.
        var group = this.group;
        var container = group.parent;
        if (container) {
            container.remove(group);
        }
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

    function createBaseRect(coverGroup) {
        var opt = this.opt;
        var rect = new graphic.Rect({
            name: 'rect',
            style: {
                stroke: opt.stroke,
                fill: opt.fill,
                lineWidth: opt.lineWidth,
                opacity: opt.opacity
            },
            silent: !opt.transformEnabled
        });
        coverGroup.add(rect);

        if (opt.transformEnabled) {
            rect.draggable = true;
            rect.cursor = 'move';
            rect.drift = bind(driftRect, this, 'nswe');
            rect.ondragend = bind(renderAndTrigger, this, true);
        }
    }

    function updateRectShape(coverGroup, name, x, y, w, h) {
        coverGroup.childOfName(name).setShape({x: x, y: y, width: w, height: h});
    }

    function formatRectRange(x, y, x2, y2) {
        var min = [mathMin(x, x2), mathMin(y, y2)];
        var max = [mathMax(x, x2), mathMax(y, y2)];

        return [
            [min[0], max[0]], // x range
            [min[1], max[1]] // y range
        ];
    }

    function driftRect(name, dx, dy) {
        var rectRange = this._ranges[0];
        var delta = [dx, dy];

        each(name.split(''), function (namePart) {
            var ind = DIRECTION_MAP[namePart];
            rectRange[ind[0]][ind[1]] += delta[ind[0]];
        });

        this._ranges = [formatRectRange(
            rectRange[0][0], rectRange[1][0], rectRange[0][1], rectRange[1][1]
        )];

        renderAndTrigger.call(this, false);
    }

    function driftPencil(dx, dy) {
        var range = this._ranges[0];

        each(range, function (point) {
            point[0] += dx;
            point[1] += dy;
        });

        renderAndTrigger.call(this, false);
    }

    function isInShapeRange(point) {
        // FIXME
        // multi covers
        var cover = this._cover;
        return (cover && this._ranges[0])
            ? cover.childAt(0).contain(point[0], point[1]) : false;
    }


    /**
     * key: this.type
     * @type {Object}
     */
    var coverRenderers = {

        line: {

            createCover: function () {
                var coverGroup = new graphic.Group();

                createBaseRect.call(this, coverGroup);

                return coverGroup;
            },

            getRanges: function () {
                var ends = getLocalTrackEnds.call(this);
                var min = mathMin(ends[0][0], ends[1][0]);
                var max = mathMax(ends[0][0], ends[1][0]);

                return [[min, max]];
            },

            updateCover: function (ranges) {
                var range = ranges[0];
                var width = this.opt.width;
                this._cover.childOfName('rect').setShape({
                    x: range[0],
                    y: -width / 2,
                    width: range[1] - range[0],
                    height: width
                });
            }
        },

        rect: {

            createCover: function () {
                var opt = this.opt;
                var coverGroup = new graphic.Group();

                createBaseRect.call(this, coverGroup);

                opt.transformEnabled && each(
                    ['w', 'e', 'n', 's', 'se', 'sw', 'ne', 'nw'],
                    function (name) {
                        coverGroup.add(new graphic.Rect({
                            name: name,
                            cursor: CURSOR_MAP[name] + '-resize',
                            style: {opacity: 0},
                            draggable: true,
                            drift: bind(driftRect, this, name),
                            ondragend: bind(renderAndTrigger, this, true)
                        }));
                    },
                    this
                );

                return coverGroup;
            },

            getRanges: function () {
                var ends = getLocalTrackEnds.call(this);
                return [formatRectRange(ends[1][0], ends[1][1], ends[0][0], ends[0][1])];
            },

            isInRange: isInShapeRange,

            updateCover: function (ranges) {
                var range = ranges[0];
                var opt = this.opt;
                var lineWidth = opt.lineWidth || 0;
                var handleSize = mathMax(lineWidth, MIN_RESIZE_LINE_WIDTH);
                var x = range[0][0];
                var y = range[1][0];
                var xa = x - lineWidth / 2;
                var ya = y - lineWidth / 2;
                var x2 = range[0][1];
                var y2 = range[1][1];
                var x2a = x2 - handleSize + lineWidth / 2;
                var y2a = y2 - handleSize + lineWidth / 2;
                var width = x2 - x;
                var height = y2 - y;
                var widtha = width + lineWidth;
                var heighta = height + lineWidth;
                var cover = this._cover;

                updateRectShape(cover, 'rect', x, y, width, height);

                if (opt.transformEnabled) {
                    updateRectShape(cover, 'w', xa, ya, handleSize, heighta);
                    updateRectShape(cover, 'e', x2a, ya, handleSize, heighta);
                    updateRectShape(cover, 'n', xa, ya, widtha, handleSize);
                    updateRectShape(cover, 's', xa, y2a, widtha, handleSize);

                    updateRectShape(cover, 'nw', xa, ya, handleSize, handleSize);
                    updateRectShape(cover, 'ne', x2a, ya, handleSize, handleSize);
                    updateRectShape(cover, 'sw', xa, y2a, handleSize, handleSize);
                    updateRectShape(cover, 'se', x2a, y2a, handleSize, handleSize);
                }
            }
        },

        pencil: {

            createCover: function () {
                var cover = new graphic.Group();
                var opt = this.opt;

                var polygon = new graphic.Polygon({
                    style: {
                        stroke: opt.stroke,
                        fill: opt.fill,
                        lineWidth: opt.lineWidth,
                        opacity: opt.opacity
                    },
                    silent: !opt.transformEnabled
                });
                cover.add(polygon);

                if (opt.transformEnabled) {
                    polygon.draggable = true;
                    polygon.cursor = 'move';
                    polygon.drift = bind(driftPencil, this);
                    polygon.ondragend = bind(renderAndTrigger, this, true);
                }

                return cover;
            },

            getRanges: function () {
                return [this._track.slice()];
            },

            isInRange: isInShapeRange,

            updateCover: function (ranges) {
                this._cover.childAt(0).setShape({points: this._ranges[0]});
            }
        }
    };

    return SelectController;
});