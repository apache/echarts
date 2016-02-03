define(function (require) {

    var parseGeoJson = require('./parseGeoJson');

    var zrUtil = require('zrender/core/util');

    var BoundingRect = require('zrender/core/BoundingRect');

    var View = require('../View');


    // Geo fix functions
    var geoFixFuncs = [
        require('./fix/nanhai'),
        require('./fix/textCoord'),
        require('./fix/geoCoord')
    ];

    /**
     * [Geo description]
     * @param {string} name Geo name
     * @param {string} map Map type
     * @param {Object} geoJson
     * @param {Object} [specialAreas]
     *        Specify the positioned areas by left, top, width, height
     * @param {Object.<string, string>} [nameMap]
     *        Specify name alias
     */
    function Geo(name, map, geoJson, specialAreas, nameMap) {

        View.call(this, name);

        /**
         * Map type
         * @type {string}
         */
        this.map = map;

        this._nameCoordMap = {};

        this.loadGeoJson(geoJson, specialAreas, nameMap);
    }

    Geo.prototype = {

        constructor: Geo,

        type: 'geo',

        /**
         * @param {Array.<string>}
         * @readOnly
         */
        dimensions: ['lng', 'lat'],

        /**
         * @param {Object} geoJson
         * @param {Object} [specialAreas]
         *        Specify the positioned areas by left, top, width, height
         * @param {Object.<string, string>} [nameMap]
         *        Specify name alias
         */
        loadGeoJson: function (geoJson, specialAreas, nameMap) {
            // https://jsperf.com/try-catch-performance-overhead
            try {
                this.regions = geoJson ? parseGeoJson(geoJson) : [];
            }
            catch (e) {
                throw 'Invalid geoJson format\n' + e;
            }
            specialAreas = specialAreas || {};
            nameMap = nameMap || {};
            var regions = this.regions;
            var regionsMap = {};
            for (var i = 0; i < regions.length; i++) {
                var regionName = regions[i].name;
                // Try use the alias in nameMap
                regionName = nameMap[regionName] || regionName;
                regions[i].name = regionName;

                regionsMap[regionName] = regions[i];
                // Add geoJson
                this.addGeoCoord(regionName, regions[i].center);

                // Some area like Alaska in USA map needs to be tansformed
                // to look better
                var specialArea = specialAreas[regionName];
                if (specialArea) {
                    regions[i].transformTo(
                        specialArea.left, specialArea.top, specialArea.width, specialArea.height
                    );
                }
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
            return data.mapArray(['lng', 'lat'], function (lon, lat) {
                item[0] = lon;
                item[1] = lat;
                return this.dataToPoint(item);
            }, this);
        },

        // Overwrite
        /**
         * @param {string|Array.<number>} data
         * @return {Array.<number>}
         */
        dataToPoint: function (data) {
            if (typeof data === 'string') {
                // Map area name to geoCoord
                data = this.getGeoCoord(data);
            }
            if (data) {
                return View.prototype.dataToPoint.call(this, data);
            }
        }
    };

    zrUtil.mixin(Geo, View);

    return Geo;
});