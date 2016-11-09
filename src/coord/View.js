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
         * @type {Object}
         */
        this.zoomLimit;

        Transformable.call(this);

        this._roamTransform = new TransformDummy();

        this._viewTransform = new TransformDummy();

        this._center;
        this._zoom;
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
         * Set center of view
         * @param {Array.<number>} [centerCoord]
         */
        setCenter: function (centerCoord) {
            if (!centerCoord) {
                return;
            }
            this._center = centerCoord;

            this._updateCenterAndZoom();
        },

        /**
         * @param {number} zoom
         */
        setZoom: function (zoom) {
            zoom = zoom || 1;

            var zoomLimit = this.zoomLimit;
            if (zoomLimit) {
                if (zoomLimit.max != null) {
                    zoom = Math.min(zoomLimit.max, zoom);
                }
                if (zoomLimit.min != null) {
                    zoom = Math.max(zoomLimit.min, zoom);
                }
            }
            this._zoom = zoom;

            this._updateCenterAndZoom();
        },

        /**
         * Get default center without roam
         */
        getDefaultCenter: function () {
            // Rect before any transform
            var rawRect = this.getBoundingRect();
            var cx = rawRect.x + rawRect.width / 2;
            var cy = rawRect.y + rawRect.height / 2;

            return [cx, cy];
        },

        getCenter: function () {
            return this._center || this.getDefaultCenter();
        },

        getZoom: function () {
            return this._zoom || 1;
        },

        /**
         * @return {Array.<number}
         */
        getRoamTransform: function () {
            return this._roamTransform;
        },

        _updateCenterAndZoom: function () {
            // Must update after view transform updated
            var viewTransformMatrix = this._viewTransform.getLocalTransform();
            var roamTransform = this._roamTransform;
            var defaultCenter = this.getDefaultCenter();
            var center = this.getCenter();
            var zoom = this.getZoom();

            center = vector.applyTransform([], center, viewTransformMatrix);
            defaultCenter = vector.applyTransform([], defaultCenter, viewTransformMatrix);

            roamTransform.origin = center;
            roamTransform.position = [
                defaultCenter[0] - center[0],
                defaultCenter[1] - center[1]
            ];
            roamTransform.scale = [zoom, zoom];

            this._updateTransform();
        },

        /**
         * Update transform from roam and mapLocation
         * @private
         */
        _updateTransform: function () {
            var roamTransform = this._roamTransform;
            var viewTransform = this._viewTransform;

            viewTransform.parent = roamTransform;
            roamTransform.updateTransform();
            viewTransform.updateTransform();

            viewTransform.transform
                && matrix.copy(this.transform || (this.transform = []), viewTransform.transform);

            if (this.transform) {
                this.invTransform = this.invTransform || [];
                matrix.invert(this.invTransform, this.transform);
            }
            else {
                this.invTransform = null;
            }
            this.decomposeTransform();
        },

        /**
         * @return {module:zrender/core/BoundingRect}
         */
        getViewRect: function () {
            return this._viewRect;
        },

        /**
         * Get view rect after roam transform
         * @return {module:zrender/core/BoundingRect}
         */
        getViewRectAfterRoam: function () {
            var rect = this.getBoundingRect().clone();
            rect.applyTransform(this.transform);
            return rect;
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
        },

        /**
         * @implements
         * see {module:echarts/CoodinateSystem}
         */
        convertToPixel: zrUtil.curry(doConvert, 'dataToPoint'),

        /**
         * @implements
         * see {module:echarts/CoodinateSystem}
         */
        convertFromPixel: zrUtil.curry(doConvert, 'pointToData'),

        /**
         * @implements
         * see {module:echarts/CoodinateSystem}
         */
        containPoint: function (point) {
            return this.getViewRectAfterRoam().contain(point[0], point[1]);
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

    function doConvert(methodName, ecModel, finder, value) {
        var seriesModel = finder.seriesModel;
        var coordSys = seriesModel ? seriesModel.coordinateSystem : null; // e.g., graph.
        return coordSys === this ? coordSys[methodName](value) : null;
    }

    return View;
});