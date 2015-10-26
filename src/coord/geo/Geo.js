define(function (require) {

    var parseGeoJson = require('./parseGeoJson');
    var vector = require('zrender/core/vector');
    var matrix = require('zrender/core/matrix');

    var Transformable = require('zrender/mixin/Transformable');
    var zrUtil = require('zrender/core/util');

    var BoundingRect = require('zrender/core/BoundingRect');

    var v2Copy = vector.copy;

    // Geo fix functions
    var geoFixFuncs = [
        require('./fix/nanhai'),
        require('./fix/textCoord'),
        require('./fix/geoCoord')
    ];

    // Dummy transform node
    function TransformDummy() {
        Transformable.call(this);
    }
    zrUtil.mixin(TransformDummy, Transformable);

    function Geo(name, map, geoJson) {

        /**
         * @type {string}
         */
        this.name = name;

        /**
         * Map type
         * @type {string}
         */
        this.map = map;

        /**
         * @param {Array.<string>}
         * @readOnly
         */
        this.dimensions = ['lon', 'lat'];

        this._nameCoordMap = {};

        this.loadGeoJson(geoJson);

        Transformable.call(this);

        /**
         * @param Array.<number>
         */
        this.mapPosition = [0, 0];

        /**
         * @param Array.<number>
         */
        this.mapScale = [1, 1];


        this._roamTransform = new TransformDummy();

        this._mapTransform = new TransformDummy();
    };

    Geo.prototype = {

        constructor: Geo,

        type: 'geo',

        /**
         * @param {Object} geoJson
         */
        loadGeoJson: function (geoJson) {
            // https://jsperf.com/try-catch-performance-overhead
            try {
                this.regions = geoJson ? parseGeoJson(geoJson) : [];
            }
            catch (e) {
                throw 'Invalid geoJson format\n' + e;
            }
            var regions = this.regions;
            var regionsMap = {};
            for (var i = 0; i < regions.length; i++) {
                regionsMap[regions[i].name] = regions[i];
            }

            this._regionsMap = regionsMap;

            this._rect = null;

            zrUtil.each(geoFixFuncs, function (fixFunc) {
                fixFunc(this);
            }, this);
        },

        /**
         * @param {string} name
         * @return {module:echarts/coord/geo/Region}
         */
        getRegion: function (name) {
            return this._regionsMap[name];
        },

        /**
         * Add geoCoord for indexing by name
         * @param {string} name
         * @param {Array.<number>} geoCoord
         */
        addGeoCoord: function (name, geoCoord) {
            this._nameCoordMap[name] = geoCoord;
        },

        /**
         * Get geoCoord by name
         * @param {string} name
         * @return {Array.<number>}
         */
        getGeoCoord: function (name) {
            return this._nameCoordMap[name];
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
            var mapTransform = this._mapTransform

            scale[1] = -scale[1];

            v2Copy(mapTransform.position, this.position);
            v2Copy(mapTransform.scale, scale);

            this._updateTransform();
        },

        /**
         * @param {number} x
         * @param {number} y
         * @param {number} width
         * @param {number} height
         */
        setViewBox: function (x, y, width, height) {
            this._viewBox = new BoundingRect(x, y, width, height);
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
            var mapTransform = this._mapTransform;
            var scale = this.scale;

            mapTransform.parent = roamTransform;
            roamTransform.updateTransform();
            mapTransform.updateTransform();

            mapTransform.transform && matrix.copy(this.transform, mapTransform.transform);

            this.decomposeTransform();

            scale[1] = -scale[1];

            // Update transform position

            this.updateTransform();
        },

        /**
         * @return {module:zrender/core/BoundingRect}
         */
        getBoundingRect: function () {
            if (this._rect) {
                return this._rect;
            }
            var rect;

            var regions = this.regions;
            for (var i = 0; i < regions.length; i++) {
                var regionRect = regions[i].getBoundingRect();
                rect = rect || regionRect.clone();
                rect.union(regionRect);
            }
            // FIXME Always return new ?
            return this._rect = rect || new BoundingRect(0, 0, 0, 0);
        },

        /**
         * @return {module:zrender/core/BoundingRect}
         */
        getViewBox: function () {
            return this._viewBox;
        },

        /**
         * If contain point
         * @param {Array.<number>} point
         * @return {boolean}
         */
        containPoint: function (point) {
        },

        /**
         * If contain data
         * @param {Array.<number>} data
         * @return {boolean}
         */
        containData: function (data) {
        },

        /**
         * Convert series data to a list of points
         * @param {module:echarts/data/List} data
         * @param {boolean} stack
         * @return {Array}
         *  Return list of points. For example:
         *  `[[10, 10], [20, 20], [30, 30]]`
         */
        dataToPoints: function (data) {
            var item = [];
            return data.mapArray(['lon', 'lat'], function (lon, lat) {
                item[0] = lon;
                item[1] = lat;
                return this.dataToPoint(item);
            }, this);
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

    zrUtil.mixin(Geo, Transformable);

    return Geo;
});