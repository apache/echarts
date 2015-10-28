/**
 * Simple view coordinate system
 * Mapping given x, y to transformd view x, y
 */
define(function (require) {

    var vector = require('zrender/core/vector');
    var matrix = require('zrender/core/matrix');

    var Transformable = require('zrender/mixin/Transformable');
    var zrUtil = require('zrender/core/util');

    var BoundingRect = require('zrender/core/BoundingRect');

    var v2Copy = vector.copy;

    // Dummy transform node
    function TransformDummy() {
        Transformable.call(this);
    }
    zrUtil.mixin(TransformDummy, Transformable);

    function View(name) {
        /**
         * @type {string}
         */
        this.name = name;

        /**
         * @param {Array.<string>}
         * @readOnly
         */
        this.dimensions = ['x', 'y'];

        Transformable.call(this);

        this._roamTransform = new TransformDummy();

        this._viewTransform = new TransformDummy();
    };

    View.prototype = {

        constructor: View,

        type: 'view',

        /**
         * Set bounding rect
         * @param {number} x
         * @param {number} y
         * @param {number} width
         * @param {number} height
         */
        setBoundingRect: function (x, y, width, height) {
            this._rect = new BoundingRect(x, y, width, height);
            return this._rect;
        },

        /**
         * @return {module:zrender/core/BoundingRect}
         */
        getBoundingRect: function () {
            return this._rect;
        },

        /**
         * @param {number} x
         * @param {number} y
         * @param {number} width
         * @param {number} height
         */
        setViewRect: function (x, y, width, height) {
            this.transformTo(x, y, width, height);
            this._viewRect = new BoundingRect(x, y, width, height);
        },

        /**
         * Transformed to particular position and size
         * @param {number} x
         * @param {number} y
         * @param {number} width
         * @param {number} height
         */
        transformTo: function (x, y, width, height) {
            var rect = this.getBoundingRect();

            rect = rect.clone();
            // Longitute is inverted
            rect.y = -rect.y - rect.height;

            this.transform = rect.calculateTransform(
                new BoundingRect(x, y, width, height)
            );

            this.decomposeTransform();

            var scale = this.scale;
            var viewTransform = this._viewTransform;

            scale[1] = -scale[1];

            v2Copy(viewTransform.position, this.position);
            v2Copy(viewTransform.scale, scale);

            this._updateTransform();
        },

        /**
         * @param {number} x
         * @param {number} y
         */
        setPan: function (x, y) {

            this._roamTransform.position = [x, y];

            this._updateTransform();
        },

        /**
         * @param {number} zoom
         */
        setZoom: function (zoom) {
            this._roamTransform.scale = [zoom, zoom];

            this._updateTransform();
        },

        /**
         * Update transform from roam and mapLocation
         * @private
         */
        _updateTransform: function () {
            var roamTransform = this._roamTransform;
            var viewTransform = this._viewTransform;
            var scale = this.scale;

            viewTransform.parent = roamTransform;
            roamTransform.updateTransform();
            viewTransform.updateTransform();

            viewTransform.transform
                && matrix.copy(this.transform, viewTransform.transform);

            this.decomposeTransform();

            scale[1] = -scale[1];

            // Update transform position

            this.updateTransform();
        },

        /**
         * @return {module:zrender/core/BoundingRect}
         */
        getViewRect: function () {
            return this._viewRect;
        },

        /**
         * Convert a single (lon, lat) data item to (x, y) point.
         * @param {Array.<number>} data
         * @return {Array.<number>}
         */
        dataToPoint: function (data) {
            var transform = this.transform;
            return transform
                ? vector.applyTransform([], data, this.transform)
                : data.slice();
        },

        /**
         * Convert a (x, y) point to (lon, lat) data
         * @param {Array.<number>} point
         * @return {Array.<number>}
         */
        pointToData: function (point) {
            var invTransform = this.invTransform;
            return invTransform
                ? vector.applyTransform([], point, invTransform)
                : point.slice();
        }
    };

    zrUtil.mixin(View, Transformable);

    return View;
});