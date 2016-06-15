/**
 * Box selection tool.
 *
 * @module echarts/component/helper/BrushController
 */

define(function (require) {

    var Eventful = require('zrender/mixin/Eventful');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var interactionMutex = require('./interactionMutex');
    var DataDiffer = require('../../data/DataDiffer');

    var bind = zrUtil.bind;
    var each = zrUtil.each;
    var map = zrUtil.map;
    var mathMin = Math.min;
    var mathMax = Math.max;
    var mathPow = Math.pow;

    var COVER_Z = 10000;
    var UNSELECT_THRESHOLD = 2;
    var MIN_RESIZE_LINE_WIDTH = 6;
    var MUTEX_RESOURCE_KEY = 'globalPan';

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
    var DEFAULT_BRUSH_OPT = {
        brushStyle: {
            lineWidth: 2,
            stroke: 'rgba(0,0,0,0.3)',
            fill: 'rgba(0,0,0,0.15)'
        },
        transformable: true,
        brushMode: 'single'
    };

    var baseUID = 0;

    /**
     * @alias module:echarts/component/helper/BrushController
     * @constructor
     * @mixin {module:zrender/mixin/Eventful}
     *
     * @param {module:zrender/zrender~ZRender} zr
     */
    function BrushController(zr) {

        Eventful.call(this);

        /**
         * @type {string}
         * @readOnly
         */
        this.brushType;

        /**
         * @type {module:zrender/zrender~ZRender}
         * @readOnly
         */
        this.zr = zr;

        /**
         * @type {Object}
         * @readOnly
         */
        this.brushOption;

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
         * @private
         */
        this._dragging;

        /**
         * @type {Array}
         * @private
         */
        this._covers = [];

        /**
         * @type {moudule:zrender/container/Group}
         * @private
         */
        this._creatingCover;

        /**
         * @type {boolean}
         * @private
         */
        this._mounted = false;

        /**
         * @type {string}
         */
        this._uid = 'brushController_' + baseUID++;

        /**
         * @type {Object}
         * @private
         */
        this._handlers = {};
        each(mouseHandlers, function (handler, eventName) {
            this._handlers[eventName] = bind(handler, this);
        }, this);
    }

    BrushController.prototype = {

        constructor: BrushController,

        /**
         * If set to null/undefined/false, select disabled.
         * @param {Object} brushOption
         * @param {string|boolean} brushOption.brushType 'line', 'rect', 'polygon' or false
         *                          If pass false/null/undefined, disable brush.
         * @param {number} [brushOption.brushMode='single'] 'single' or 'multiple'
         * @param {boolean} [brushOption.transformable=true]
         * @param {boolean} [brushOption.onRelease]
         * @param {Object} [brushOption.brushStyle]
         * @param {number} [brushOption.brushStyle.width]
         * @param {number} [brushOption.brushStyle.lineWidth]
         * @param {string} [brushOption.brushStyle.stroke]
         * @param {string} [brushOption.brushStyle.fill]
         */
        enableBrush: function (brushOption) {
            if (!this._mounted) {
                return;
            }

            this.brushType && doDisableBrush.call(this);
            brushOption.brushType && doEnableBrush.call(this, brushOption);

            return this;
        },

        /**
         * @param {module:zrender/mixin/Transformable} container
         * @param {module:zrender/core/BoundingRect|boolean} [rect] If not specified,
         *        use container.getBoundingRect(). If false, do not use containerRect,
         *        which means global select.
         */
        mount: function (container, rect) {
            this._mounted = true; // should be at first.

            // Remove from old container.
            removeGroup.call(this);

            // boundingRect will change when dragging, so we have
            // to keep initial boundingRect.
            this._containerRect = rect !== false
            ? (rect || container.getBoundingRect()) : null;

            // Add to new container.
            container.add(this.group);

            return this;
        },

        /**
         * @param
         */
        eachCover: function (cb, context) {
            each(this._covers, cb, context);
        },

        /**
         * Update covers.
         * @param {Array.<Object>} coverInfoList Like:
         *        [
         *            {id: 'xx', type: 'line', range: [23, 44]},
         *            {id: 'yy', type: 'rect', range: [[23, 44], [23, 54]]},
         *            ...
         *        ]
         *        `type` is required in each cover info.
         *        `id` is not mandatory.
         *        If coverInfoList is null/undefined, all covers removed.
         */
        updateCovers: function (coverInfoList) {
            if (!this._mounted) {
                return;
            }

            coverInfoList = zrUtil.clone(coverInfoList || []);
            var tmpIdPrefix = '\0-brush-index-';
            var oldCovers = this._covers;
            var newCovers = this._covers = [];
            var controller = this;

            (new DataDiffer(oldCovers, coverInfoList, oldGetKey, newGetKey))
                .add(add)
                .update(update)
                .remove(remove)
                .execute();

            return this;

            function oldGetKey(cover, index) {
                var brushInfo = cover.__brushInfo;
                return brushInfo.id != null ? brushInfo.id : tmpIdPrefix + index;
            }

            function newGetKey(coverInfo, index) {
                return coverInfo.id != null ? coverInfo.id : tmpIdPrefix + index;
            }

            function add(newIndex) {
                newCovers[newIndex] = createCover.call(controller, coverInfoList[newIndex]);
                updateCover.call(controller, newCovers[newIndex]);
            }

            function update(newIndex, oldIndex) {
                var cover = newCovers[newIndex] = oldCovers[oldIndex];
                var newCoverInfo = coverInfoList[newIndex];

                if (newCoverInfo.type !== cover.__brushInfo.type) {
                    controller.group.remove(cover);
                    cover = createCover.call(controller, newCoverInfo);
                }

                cover.__brushInfo = newCoverInfo;
                updateCover.call(controller, newCovers[newIndex]);
            }

            function remove(oldIndex) {
                controller.group.remove(oldCovers[oldIndex]);
            }
        },

        unmount: function () {
            this.enableBrush(false);
            removeGroup.call(this);

            this._covers = [];
            this._mounted = false; // should be at last.

            return this;
        },

        dispose: function () {
            this.unmount();
            this.off();
        }
    };

    zrUtil.mixin(BrushController, Eventful);


    function doEnableBrush(brushOption) {
        var zr = this.zr;

        if (isGlobalBrush(this)) {
            // FIXME
            // 多个 selectcontroller，区域不一样时，这是否合理？
            var onRelease = zrUtil.bind(function (userOnRelease) {
                this.enableBrush(false);
                userOnRelease && userOnRelease();
            }, this, brushOption.onRelease);

            interactionMutex.take(zr, MUTEX_RESOURCE_KEY, this._uid, onRelease);
            zr.setDefaultCursorStyle('crosshair');
        }

        each(this._handlers, function (handler, eventName) {
            zr.on(eventName, handler);
        });

        this.brushType = brushOption.brushType;
        this.brushOption = zrUtil.merge(zrUtil.clone(DEFAULT_BRUSH_OPT), brushOption, true);
    }

    function doDisableBrush() {
        var zr = this.zr;

        interactionMutex.release(zr, MUTEX_RESOURCE_KEY, this._uid);
        zr.setDefaultCursorStyle('default');

        each(this._handlers, function (handler, eventName) {
            zr.off(eventName, handler);
        });

        this.brushType = this.brushOption = null;
    }

    function createCover(brushInfo) {
        var brushType = brushInfo ? brushInfo.brushType : this.brushType;
        var cover = coverRenderers[brushType].createCover.call(this);
        updateZ(cover);
        cover.__brushInfo = brushInfo || {type: brushType};
        // this.brushOption may be erased, but still needed when drift.
        cover.__brushOption = this.brushOption;
        this.group.add(cover);
        return cover;
    }

    function updateZ(group) {
        group.traverse(function (el) {
            el.z = COVER_Z;
        });
    }

    function updateCover(cover) {
        coverRenderers[cover.__brushInfo.type].updateCover.call(this, cover);
    }

    function isInContainer(x, y) {
        var localPos = this.group.transformCoordToLocal(x, y);
        return !this._containerRect
            || this._containerRect.contain(localPos[0], localPos[1]);
    }

    function clearCovers() {
        each(this._covers, function (cover) {
            this.group.remove(cover);
        }, this);
        this._covers.length = 0;
    }

    function trigger(isEnd) {
        var coverInfoList = map(this._covers, function (cover) {
            return zrUtil.clone(cover.__brushInfo);
        });
        this.trigger('brush', coverInfoList, !!isEnd);
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

    function removeGroup() {
        // container may 'removeAll' outside.
        var group = this.group;
        var container = group.parent;
        if (container) {
            container.remove(group);
        }
    }

    function isGlobalBrush(controller) {
        return !controller._containerRect;
    }

    function getLocalTrack() {
        return map(this._track, function (point) {
            return this.group.transformCoordToLocal(point[0], point[1]);
        }, this);
    }

    function getLocalTrackEnds() {
        var localTrack = getLocalTrack.call(this);
        var tail = localTrack.length - 1;
        tail < 0 && (tail = 0);
        return [localTrack[0], localTrack[tail]];
    }

    function createBaseRect(cover) {
        var opt = this.brushOption;
        var rect = new graphic.Rect({
            name: 'rect',
            style: opt.brushStyle,
            silent: !opt.transformable
        });
        cover.add(rect);

        if (opt.transformable) {
            rect.draggable = true;
            rect.cursor = 'move';
            rect.drift = bind(driftRect, this, cover, 'nswe');
            rect.ondragend = bind(trigger, this, true);
        }
    }

    function updateRectShape(cover, name, x, y, w, h) {
        cover.childOfName(name).setShape({x: x, y: y, width: w, height: h});
    }

    function formatRectRange(x, y, x2, y2) {
        var min = [mathMin(x, x2), mathMin(y, y2)];
        var max = [mathMax(x, x2), mathMax(y, y2)];

        return [
            [min[0], max[0]], // x range
            [min[1], max[1]] // y range
        ];
    }

    function driftRect(cover, name, dx, dy) {
        var brushInfo = cover.__brushInfo;
        var rectRange = brushInfo.range;
        var delta = [dx, dy];

        each(name.split(''), function (namePart) {
            var ind = DIRECTION_MAP[namePart];
            rectRange[ind[0]][ind[1]] += delta[ind[0]];
        });

        brushInfo.range = formatRectRange(
            rectRange[0][0], rectRange[1][0], rectRange[0][1], rectRange[1][1]
        );

        updateCover.call(this, cover);
        trigger.call(this, false);
    }

    function driftPolygon(cover, dx, dy) {
        var range = cover.__brushInfo.range;

        each(range, function (point) {
            point[0] += dx;
            point[1] += dy;
        });

        updateCover.call(this, cover);
        trigger.call(this, false);
    }

    function preventDefault(e) {
        var rawE = e.event;
        rawE.preventDefault && rawE.preventDefault();
    }

    function updateCoverByMouse(e, isEnd) {
        var x = e.offsetX;
        var y = e.offsetY;
        var creatingCover = this._creatingCover;

        if (isInContainer.call(this, x, y)) {
            this._track.push([x, y]);

            if (shouldShowCover.call(this)) {

                if (!creatingCover) {
                    this.brushOption.brushMode === 'single' && clearCovers.call(this);
                    creatingCover = this._creatingCover = createCover.call(this);
                    this._covers.push(creatingCover);
                }

                var coverRenderer = coverRenderers[this.brushType];
                creatingCover.__brushInfo.range =
                    coverRenderer.getCreatingRange.call(this, isEnd);

                if (isEnd && coverRenderer.endCreating) {
                    coverRenderer.endCreating.call(this, creatingCover);
                    updateZ(creatingCover);
                }

                updateCover.call(this, creatingCover);

                trigger.call(this, isEnd);
            }
        }

        if (isEnd && creatingCover) {
            this._creatingCover = null;
        }
    }

    var mouseHandlers = {

        mousedown: function (e) {
            if (!e.target || !e.target.draggable) {

                preventDefault(e);

                var x = e.offsetX;
                var y = e.offsetY;

                if (isInContainer.call(this, x, y)) {
                    this._dragging = true;
                    this._track = [[x, y]];
                }
            }
        },

        mousemove: function (e) {
            if (this._dragging) {

                preventDefault(e);

                updateCoverByMouse.call(this, e, false);
            }
        },

        mouseup: function (e) {
            if (this._dragging) {

                preventDefault(e);

                updateCoverByMouse.call(this, e, true);

                this._dragging = false;
                this._track = [];
            }
        }
    };

    /**
     * key: brushType
     * @type {Object}
     */
    var coverRenderers = {

        line: {

            createCover: function () {
                var cover = new graphic.Group();
                createBaseRect.call(this, cover);
                return cover;
            },

            getCreatingRange: function () {
                var ends = getLocalTrackEnds.call(this);
                var min = mathMin(ends[0][0], ends[1][0]);
                var max = mathMax(ends[0][0], ends[1][0]);

                return [min, max];
            },

            updateCover: function (cover) {
                var range = cover.__brushInfo.range;
                var width = cover.__brushOption.brushStyle.width;
                cover.childOfName('rect').setShape({
                    x: range[0],
                    y: -width / 2,
                    width: range[1] - range[0],
                    height: width
                });
            }
        },

        rect: {

            createCover: function () {
                var opt = this.brushOption;
                var cover = new graphic.Group();

                createBaseRect.call(this, cover);

                opt.transformable && each(
                    ['w', 'e', 'n', 's', 'se', 'sw', 'ne', 'nw'],
                    function (name) {
                        cover.add(new graphic.Rect({
                            name: name,
                            cursor: CURSOR_MAP[name] + '-resize',
                            style: {opacity: 0},
                            draggable: true,
                            drift: bind(driftRect, this, cover, name),
                            ondragend: bind(trigger, this, true)
                        }));
                    },
                    this
                );

                return cover;
            },

            getCreatingRange: function () {
                var ends = getLocalTrackEnds.call(this);
                return formatRectRange(ends[1][0], ends[1][1], ends[0][0], ends[0][1]);
            },

            updateCover: function (cover) {
                var range = cover.__brushInfo.range;
                var opt = cover.__brushOption;
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

                updateRectShape(cover, 'rect', x, y, width, height);

                if (opt.transformable) {
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

        polygon: {

            createCover: function () {
                var cover = new graphic.Group();
                var opt = this.brushOption;

                // Do not use graphic.Polygon because graphic.Polyline do not close the
                // border of the shape when drawing, which is a better experience for user.
                var polygon = new graphic.Polyline({
                    style: opt.brushStyle,
                    silent: !opt.transformable
                });
                cover.add(polygon);

                // if (opt.transformable) {
                    // polygon.draggable = true;
                    // polygon.cursor = 'move';
                    // polygon.drift = bind(driftPolygon, this, cover);
                    // polygon.ondragend = bind(trigger, this, true);
                // }

                return cover;
            },

            // getCreatingRange: function (isEnd) {
            //     var track = this._track.slice();
            //     isEnd && track.length && track.push(track[0].slice());
            //     return track;
            // },

            getCreatingRange: function (isEnd) {
                return this._track.slice();
            },

            endCreating: function (cover) {
                cover.remove(cover.childAt(0));
                var opt = this.brushOption;
                // Close the shape
                var polygon = new graphic.Polygon({
                    style: opt.brushStyle,
                    silent: !opt.transformable
                });
                cover.add(polygon);

                if (opt.transformable) {
                    polygon.draggable = true;
                    polygon.cursor = 'move';
                    polygon.drift = bind(driftPolygon, this, cover);
                    polygon.ondragend = bind(trigger, this, true);
                }
            },

            updateCover: function (cover) {
                cover.childAt(0).setShape({points: cover.__brushInfo.range});
            }
        }
    };

    return BrushController;
});