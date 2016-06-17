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
    var UNSELECT_THRESHOLD = 6;
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
        brushMode: 'single',
        removeOnClick: false
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

        if (__DEV__) {
            zrUtil.assert(zr);
        }

        Eventful.call(this);

        /**
         * @type {module:zrender/zrender~ZRender}
         * @private
         */
        this._zr = zr;

        /**
         * @type {module:zrender/container/Group}
         * @readOnly
         */
        this.group = new graphic.Group();

        /**
         * Only for drawing (after enabledBrush).
         * @private
         * @type {string}
         */
        this._brushType;

        /**
         * Only for drawing (after enabledBrush).
         * @private
         * @type {Object}
         */
        this._brushOption;

        /**
         * @private
         * @type {module:zrender/core/BoundingRect}
         */
        this._containerRect = null;

        /**
         * @private
         * @type {Array.<nubmer>}
         */
        this._track = [];

        /**
         * @private
         * @type {boolean}
         */
        this._dragging;

        /**
         * @private
         * @type {Array}
         */
        this._covers = [];

        /**
         * @private
         * @type {moudule:zrender/container/Group}
         */
        this._creatingCover;

        /**
         * @private
         * @type {boolean}
         */
        this._mounted = false;

        /**
         * @private
         * @type {string}
         */
        this._uid = 'brushController_' + baseUID++;

        /**
         * @private
         * @type {Object}
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
         * @param {boolean} [brushOption.removeOnClick=false]
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

            this._brushType && doDisableBrush.call(this);
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
         * @param {Array.<Object>} brushOptionList Like:
         *        [
         *            {id: 'xx', brushType: 'line', range: [23, 44], brushStyle, transformable},
         *            {id: 'yy', brushType: 'rect', range: [[23, 44], [23, 54]]},
         *            ...
         *        ]
         *        `brushType` is required in each cover info.
         *        `id` is not mandatory.
         *        `brushStyle`, `transformable` is not mandatory, use DEFAULT_BRUSH_OPT by default.
         *        If brushOptionList is null/undefined, all covers removed.
         */
        updateCovers: function (brushOptionList) {
            if (!this._mounted) {
                return;
            }

            brushOptionList = zrUtil.map(brushOptionList, function (brushOption) {
                return zrUtil.merge(zrUtil.clone(DEFAULT_BRUSH_OPT), brushOption, true);
            });

            var tmpIdPrefix = '\0-brush-index-';
            var oldCovers = this._covers;
            var newCovers = this._covers = [];
            var controller = this;

            (new DataDiffer(oldCovers, brushOptionList, oldGetKey, newGetKey))
                .add(add)
                .update(update)
                .remove(remove)
                .execute();

            return this;

            function oldGetKey(cover, index) {
                var brushOption = cover.__brushOption;
                return brushOption.id != null ? brushOption.id : tmpIdPrefix + index;
            }

            function newGetKey(brushOption, index) {
                return brushOption.id != null ? brushOption.id : tmpIdPrefix + index;
            }

            function add(newIndex) {
                newCovers[newIndex] = createCover.call(controller, brushOptionList[newIndex]);
                endCreating.call(controller, newCovers[newIndex]);
                updateCoverAfterCreation.call(controller, newCovers[newIndex]);
            }

            function update(newIndex, oldIndex) {
                var cover = newCovers[newIndex] = oldCovers[oldIndex];
                var newBrushOption = brushOptionList[newIndex];

                if (newBrushOption.brushType !== cover.__brushOption.brushType) {
                    controller.group.remove(cover);
                    cover = createCover.call(controller, newBrushOption);
                    endCreating.call(controller, cover);
                }

                cover.__brushOption = newBrushOption;
                updateCoverAfterCreation.call(controller, newCovers[newIndex]);
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
        var zr = this._zr;

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

        this._brushType = brushOption.brushType;
        this._brushOption = zrUtil.merge(zrUtil.clone(DEFAULT_BRUSH_OPT), brushOption, true);
    }

    function doDisableBrush() {
        var zr = this._zr;

        interactionMutex.release(zr, MUTEX_RESOURCE_KEY, this._uid);
        zr.setDefaultCursorStyle('default');

        each(this._handlers, function (handler, eventName) {
            zr.off(eventName, handler);
        });

        this._brushType = this._brushOption = null;
    }

    function createCover(brushOption) {
        var cover = coverRenderers[brushOption.brushType].createCover.call(this, brushOption);
        updateZ(cover);
        cover.__brushOption = brushOption;
        this.group.add(cover);
        return cover;
    }

    function endCreating(creatingCover) {
        var coverRenderer = coverRenderers[creatingCover.__brushOption.brushType];
        if (coverRenderer.endCreating) {
            coverRenderer.endCreating.call(this, creatingCover);
            updateZ(creatingCover);
        }
    }

    function updateZ(group) {
        group.traverse(function (el) {
            el.z = COVER_Z;
        });
    }

    function updateCoverAfterCreation(cover) {
        var brushOption = cover.__brushOption;
        var coverRenderer = coverRenderers[brushOption.brushType];
        coverRenderer.updateCoverShape.call(this, cover);
        coverRenderer.updateCommon.call(this, cover);
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
        var brushRanges = map(this._covers, function (cover) {
            var brushOption = cover.__brushOption;
            return {
                brushType: brushOption.brushType,
                range: zrUtil.clone(brushOption.range)
            };
        });
        this.trigger('brush', brushRanges, !!isEnd);
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

    function createBaseRect(cover, brushOption) {
        cover.add(new graphic.Rect({
            name: 'rect',
            style: brushOption.brushStyle,
            silent: true,
            draggable: true,
            cursor: 'move',
            drift: bind(driftRect, this, cover, 'nswe'),
            ondragend: bind(trigger, this, true)
        }));
    }

    function updateCommon(cover) {
        var brushOption = cover.__brushOption;
        cover.childAt(0).useStyle(brushOption.brushStyle);
        var transformable = brushOption.transformable;
        cover.childAt(0).attr({
            silent: !transformable,
            cursor: transformable ? 'move' : 'default'
        });
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
        var brushOption = cover.__brushOption;
        var rectRange = brushOption.range;
        var delta = [dx, dy];

        each(name.split(''), function (namePart) {
            var ind = DIRECTION_MAP[namePart];
            rectRange[ind[0]][ind[1]] += delta[ind[0]];
        });

        brushOption.range = formatRectRange(
            rectRange[0][0], rectRange[1][0], rectRange[0][1], rectRange[1][1]
        );

        updateCoverAfterCreation.call(this, cover);
        trigger.call(this, false);
    }

    function driftPolygon(cover, dx, dy) {
        var range = cover.__brushOption.range;

        each(range, function (point) {
            point[0] += dx;
            point[1] += dy;
        });

        updateCoverAfterCreation.call(this, cover);
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
        var thisBrushOption = this._brushOption;

        if (isInContainer.call(this, x, y)) {
            this._track.push([x, y]);

            if (shouldShowCover.call(this)) {

                if (!creatingCover) {
                    thisBrushOption.brushMode === 'single' && clearCovers.call(this);
                    creatingCover = this._creatingCover =
                        createCover.call(this, zrUtil.clone(thisBrushOption));
                    this._covers.push(creatingCover);
                }

                var coverRenderer = coverRenderers[this._brushType];
                var coverBrushOption = creatingCover.__brushOption;

                coverBrushOption.range =
                    coverRenderer.getCreatingRange.call(this, isEnd);

                if (isEnd) {
                    endCreating.call(this, creatingCover);
                    coverRenderer.updateCommon.call(this, creatingCover);
                }

                coverRenderer.updateCoverShape.call(this, creatingCover);

                trigger.call(this, isEnd);
            }
            else if (
                isEnd
                && !creatingCover
                && thisBrushOption.brushMode === 'single'
                && thisBrushOption.removeOnClick
            ) {
                // Help user to remove covers easily, only by a tiny drag, in 'single' mode.
                // But a single click do not clear covers, because user may have casual
                // clicks (for example, click on other component and do not expect covers
                // disappear).
                clearCovers.call(this);
                trigger.call(this, isEnd);
            }

        }
    }

    var mouseHandlers = {

        mousedown: function (e) {
            if (!e.target || !e.target.draggable) {

                preventDefault(e);

                var x = e.offsetX;
                var y = e.offsetY;

                this._creatingCover = null;

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
            createCover: function (brushOption) {
                var cover = new graphic.Group();

                createBaseRect.call(this, cover, brushOption);

                return cover;
            },
            getCreatingRange: function () {
                var ends = getLocalTrackEnds.call(this);
                var min = mathMin(ends[0][0], ends[1][0]);
                var max = mathMax(ends[0][0], ends[1][0]);

                return [min, max];
            },
            updateCoverShape: function (cover) {
                var info = cover.__brushOption;
                var range = info.range;
                var width = info.brushStyle.width;
                cover.childOfName('rect').setShape({
                    x: range[0],
                    y: -width / 2,
                    width: range[1] - range[0],
                    height: width
                });
            },
            updateCommon: updateCommon
        },

        rect: {
            createCover: function (brushOption) {
                var cover = new graphic.Group();

                createBaseRect.call(this, cover, brushOption);

                each(
                    ['w', 'e', 'n', 's', 'se', 'sw', 'ne', 'nw'],
                    function (name) {
                        cover.add(new graphic.Rect({
                            name: name,
                            __cursor: CURSOR_MAP[name] + '-resize',
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
            updateCoverShape: function (cover) {
                var info = cover.__brushOption;
                var range = info.range;
                var lineWidth = info.brushStyle.lineWidth || 0;
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

                if (info.transformable) {
                    updateRectShape(cover, 'w', xa, ya, handleSize, heighta);
                    updateRectShape(cover, 'e', x2a, ya, handleSize, heighta);
                    updateRectShape(cover, 'n', xa, ya, widtha, handleSize);
                    updateRectShape(cover, 's', xa, y2a, widtha, handleSize);

                    updateRectShape(cover, 'nw', xa, ya, handleSize, handleSize);
                    updateRectShape(cover, 'ne', x2a, ya, handleSize, handleSize);
                    updateRectShape(cover, 'sw', xa, y2a, handleSize, handleSize);
                    updateRectShape(cover, 'se', x2a, y2a, handleSize, handleSize);
                }
            },
            updateCommon: function (cover) {
                updateCommon.call(this, cover);
                var transformable = cover.__brushOption.transformable;
                each(
                    ['w', 'e', 'n', 's', 'se', 'sw', 'ne', 'nw'],
                    function (name) {
                        var el = cover.childOfName(name);
                        el.attr({
                            silent: !transformable,
                            cursor: transformable ? el.__cursor : 'default'
                        });
                    },
                    this
                );
            }
        },

        polygon: {
            createCover: function (brushOption) {
                var cover = new graphic.Group();

                // Do not use graphic.Polygon because graphic.Polyline do not close the
                // border of the shape when drawing, which is a better experience for user.
                cover.add(new graphic.Polyline({
                    style: brushOption.brushStyle,
                    silent: true
                }));

                return cover;
            },
            getCreatingRange: function (isEnd) {
                return this._track.slice();
            },
            endCreating: function (cover) {
                cover.remove(cover.childAt(0));
                // Use graphic.Polygon close the shape.
                cover.add(new graphic.Polygon({
                    draggable: true,
                    drift: bind(driftPolygon, this, cover),
                    ondragend: bind(trigger, this, true)
                }));
            },
            updateCoverShape: function (cover) {
                cover.childAt(0).setShape({points: cover.__brushOption.range});
            },
            updateCommon: updateCommon
        }
    };

    return BrushController;
});