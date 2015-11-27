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

    var UNSELECT_THRESHOLD = 3;
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
         * @type {Array.<number>}
         * @private
         */
        this._cursorCurrent;

        /**
         * @type {Array.<nubmer>}
         * @private
         */
        this._cursorBegin;

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
         * Selected param for event trigger.
         * @private
         */
        this._selected;

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

            // Add to new container.
            container.add(this.group);

            // Ensure transform matrix built.
            container.updateTransformFromRoot();
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


    function getContainer(me) {
        return me.group.parent;
    }

    function isInContainer(x, y, container) {
        var localPos = container.transformCoordToLocal(x, y);
        return container.getBoundingRect().contain(localPos[0], localPos[1]);
    }

    function mousedown(e) {
        if (this._disabled || (e.target && e.target.draggable)) {
            return;
        }

        var rawE = e.event;
        rawE.preventDefault && rawE.preventDefault();

        var x = e.offsetX;
        var y = e.offsetY;
        var container = getContainer(this);

        // Ensure transform matrix built.
        container.updateTransformFromRoot();

        if (isInContainer(x, y, container)) {
            this._dragging = true;
            this._cursorCurrent = [x, y];
            this._cursorBegin = [x, y];
        }
    }

    function mousemove(e) {
        if (!this._dragging || this._disabled) {
            return;
        }

        var rawE = e.event;
        rawE.preventDefault && rawE.preventDefault();

        this._cursorCurrent = [e.offsetX, e.offsetY];
        renderCover.call(this);
    }

    function mouseup(e) {
        if (!this._dragging || this._disabled) {
            return;
        }

        this._cursorCurrent = [e.offsetX, e.offsetY];
        renderCover.call(this);

        this._dragging = false;
    }

    function shouldCreateCover() {
        var p1 = this._cursorCurrent;
        var p2 = this._cursorBegin;
        var dx = p2[0] - p1[0];
        var dy = p2[1] - p1[1];
        var dist = mathPow(dx * dx + dy * dy, 0.5);

        return dist > UNSELECT_THRESHOLD;
    }

    function renderCover() {
        // Create or update cover.
        if (shouldCreateCover.call(this)) {
            var type = this.type;

            if (!this._cover) {
                this._cover = coverRenderers[type].create.call(this);
                this.group.add(this._cover);
            }

            coverRenderers[type].update.call(this);
        }
        // Remove cover.
        else {
            this.group.remove(this._cover);
            this._cover = null;
            this._selected = null;
        }

        this.trigger('selected', this._selected);
    }

    function removeGroup() {
        // container may 'removeAll' outside.
        var container = getContainer(this);
        if (container) {
            container.remove(this.group);
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
                lineWidth: opt.lineWidth
            }
        });
    }

    /**
     * key: this.type
     * @type {Object}
     */
    var coverRenderers = {

        line: {

            create: createRectCover,

            update: function () {
                var opt = this.opt;
                var group = this.group;

                var cursorCurrent = this._cursorCurrent;
                var cursorBegin = this._cursorBegin;
                var localCurr = group.transformCoordToLocal(
                    cursorCurrent[0], cursorCurrent[1]
                );
                var localBegin = group.transformCoordToLocal(
                    cursorBegin[0], cursorBegin[1]
                );

                var min = mathMin(localCurr[0], localBegin[0]);
                var max = mathMax(localCurr[0], localBegin[0]);
                var width = opt.width;

                this._cover.setShape({
                    x: min,
                    y: -width / 2,
                    width: max - min,
                    height: width
                });

                this._selected = [min, max];
            }
        },

        rect: {

            create: createRectCover,

            update: function () {
                var cursorCurrent = this._cursorCurrent;
                var cursorBegin = this._cursorBegin;
                var min = [
                    mathMin(cursorCurrent[0], cursorBegin[0]),
                    mathMin(cursorCurrent[1], cursorBegin[1])
                ];
                var max = [
                    mathMax(cursorCurrent[0], cursorBegin[0]),
                    mathMax(cursorCurrent[1], cursorBegin[1])
                ];

                var rect = {
                    x: min[0],
                    y: min[1],
                    width: max[0] - min[0],
                    height: max[1] - min[1]
                };

                this._cover.setShape(rect);
                this._selected = rect;
            }
        }
    };

    return SelectController;
});