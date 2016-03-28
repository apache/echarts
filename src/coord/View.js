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

    var v2ApplyTransform = vector.applyTransform;

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
         * @type {Array.<number>}
         */
        this.zoomLimit;

        Transformable.call(this);

        this._roamTransform = new TransformDummy();

        this._viewTransform = new TransformDummy();
    }

    View.prototype = {

        constructor: View,

        type: 'view',

        /**
         * @param {Array.<string>}
         * @readOnly
         */
        dimensions: ['x', 'y'],

        /**
         * Set bounding rect
         * @param {number} x
         * @param {number} y
         * @param {number} width
         * @param {number} height
         */

        // PENDING to getRect
        setBoundingRect: function (x, y, width, height) {
            this._rect = new BoundingRect(x, y, width, height);
            return this._rect;
        },

        /**
         * @return {module:zrender/core/BoundingRect}
         */
        // PENDING to getRect
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
            var viewTransform = this._viewTransform;

            viewTransform.transform = rect.calculateTransform(
                new BoundingRect(x, y, width, height)
            );

            viewTransform.decomposeTransform();

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
            var zoomLimit = this.zoomLimit;
            if (zoomLimit) {
                zoom = Math.max(
                    Math.min(zoom, zoomLimit.max), zoomLimit.min
                );
            }

            this._roamTransform.scale = [zoom, zoom];

            this._updateTransform();
        },

        /**
         * @return {Array.<number}
         */
        getRoamTransform: function () {
            return this._roamTransform.transform;
        },

        /**
         * Update transform from roam and mapLocation
         * @private
         */
        _updateTransform: function () {
            var roamTransform = this._roamTransform;
            var viewTransform = this._viewTransform;
            // var scale = this.scale;

            viewTransform.parent = roamTransform;
            roamTransform.updateTransform();
            viewTransform.updateTransform();

            viewTransform.transform
                && matrix.copy(this.transform || (this.transform = []), viewTransform.transform);

            this.decomposeTransform();
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
                ? v2ApplyTransform([], data, transform)
                : [data[0], data[1]];
        },

        /**
         * Convert a (x, y) point to (lon, lat) data
         * @param {Array.<number>} point
         * @return {Array.<number>}
         */
        pointToData: function (point) {
            var invTransform = this.invTransform;
            return invTransform
                ? v2ApplyTransform([], point, invTransform)
                : [point[0], point[1]];
        }

        /**
         * @return {number}
         */
        // getScalarScale: function () {
        //     // Use determinant square root of transform to mutiply scalar
        //     var m = this.transform;
        //     var det = Math.sqrt(Math.abs(m[0] * m[3] - m[2] * m[1]));
        //     return det;
        // }
    };

    zrUtil.mixin(View, Transformable);

    return View;
});