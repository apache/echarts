define(function (require) {

    var parseGeoJson = require('./parseGeoJson');

    var zrUtil = require('zrender/core/util');

    var BoundingRect = require('zrender/core/BoundingRect');

    var View = require('../View');


    // Geo fix functions
    var geoFixFuncs = [
        require('./fix/nanhai'),
        require('./fix/textCoord'),
        require('./fix/geoCoord'),
        require('./fix/diaoyuIsland')
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

        this._nameCoordMap = zrUtil.createHashMap();

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
         * If contain given lng,lat coord
         * @param {Array.<number>}
         * @readOnly
         */
        containCoord: function (coord) {
            var regions = this.regions;
            for (var i = 0; i < regions.length; i++) {
                if (regions[i].contain(coord)) {
                    return true;
                }
            }
            return false;
        },
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
                throw 'Invalid geoJson format\n' + e.message;
            }
            specialAreas = specialAreas || {};
            nameMap = nameMap || {};
            var regions = this.regions;
            var regionsMap = zrUtil.createHashMap();
            for (var i = 0; i < regions.length; i++) {
                var regionName = regions[i].name;
                // Try use the alias in nameMap
                regionName = nameMap.hasOwnProperty(regionName) ? nameMap[regionName] : regionName;
                regions[i].name = regionName;

                regionsMap.set(regionName, regions[i]);
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
            return this._regionsMap.get(name);
        },

        getRegionByCoord: function (coord) {
            var regions = this.regions;
            for (var i = 0; i < regions.length; i++) {
                if (regions[i].contain(coord)) {
                    return regions[i];
                }
            }
        },

        /**
         * Add geoCoord for indexing by name
         * @param {string} name
         * @param {Array.<number>} geoCoord
         */
        addGeoCoord: function (name, geoCoord) {
            this._nameCoordMap.set(name, geoCoord);
        },

        /**
         * Get geoCoord by name
         * @param {string} name
         * @return {Array.<number>}
         */
        getGeoCoord: function (name) {
            return this._nameCoordMap.get(name);
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
        },

        /**
         * @inheritDoc
         */
        convertToPixel: zrUtil.curry(doConvert, 'dataToPoint'),

        /**
         * @inheritDoc
         */
        convertFromPixel: zrUtil.curry(doConvert, 'pointToData')

    };

    zrUtil.mixin(Geo, View);

    function doConvert(methodName, ecModel, finder, value) {
        var geoModel = finder.geoModel;
        var seriesModel = finder.seriesModel;

        var coordSys = geoModel
            ? geoModel.coordinateSystem
            : seriesModel
            ? (
                seriesModel.coordinateSystem // For map.
                || (seriesModel.getReferringComponents('geo')[0] || {}).coordinateSystem
            )
            : null;

        return coordSys === this ? coordSys[methodName](value) : null;
    }

    return Geo;
});