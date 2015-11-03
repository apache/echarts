define(function (require) {

    var vector = require('zrender/core/vector');

    var parseGeoJson = require('./parseGeoJson');

    var zrUtil = require('zrender/core/util');

    var BoundingRect = require('zrender/core/BoundingRect');

    var View = require('../View');

    var v2Copy = vector.copy;

    // Geo fix functions
    var geoFixFuncs = [
        require('./fix/nanhai'),
        require('./fix/textCoord'),
        require('./fix/geoCoord')
    ];

    function Geo(name, map, geoJson) {

        View.call(this, name);

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
    }

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

        // Overwrite
        transformTo: function (x, y, width, height) {
            var rect = this.getBoundingRect();

            rect = rect.clone();
            // Longitute is inverted
            rect.y = -rect.y - rect.height;

            var viewTransform = this._viewTransform;

            viewTransform.transform = rect.calculateTransform(
                new BoundingRect(x, y, width, height)
            );

            viewTransform.decomposeTransform();

            var scale = viewTransform.scale;
            scale[1] = -scale[1];

            viewTransform.updateTransform();

            this._updateTransform();
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

        // Overwrite
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
            return (this._rect = rect || new BoundingRect(0, 0, 0, 0));
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
        }
    };

    zrUtil.mixin(Geo, View);

    return Geo;
});