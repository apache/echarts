define(function (require) {

    require('./GeoModel');

    var Geo = require('./Geo');

    var numberUtil = require('../../util/number');

    var mapDataStores = {};

    /**
     * Resize method bound to the geo
     * @param {module:echarts/coord/geo/GeoModel|module:echarts/chart/map/MapModel} locModel
     * @param {module:echarts/ExtensionAPI} api
     */
    var resizeGeo = function (locModel, api) {
        var center;
        if (locModel.type === 'series.map') {
            locModel = locModel.getModel('mapLocation');
            center = [locModel.get('x'), locModel.get('y')];
        }
        else {
            center = locModel.get('center');
        }
        var width = locModel.get('width');
        var height = locModel.get('height');

        var viewWidth = api.getWidth();
        var viewHeight = api.getHeight();

        var parsePercent = numberUtil.parsePercent;
        var cx = parsePercent(center[0], viewWidth);
        var cy = parsePercent(center[1], viewHeight);
        width = parsePercent(width, viewWidth);
        height = parsePercent(height, viewHeight);

        var rect = this.getBoundingRect();

        if (isNaN(height)) {
            // 0.75 rate
            height = rect.height / rect.width * width / 0.75;
        }
        else if (isNaN(width)) {
            width = rect.width / rect.height * height;
        }

        this.transformTo(cx, cy, width, height);
    }

    var geoCreator = {

        create: function (ecModel, api) {
            var geoList = [];

            // FIXME Create each time may be slow
            ecModel.eachComponent('geo', function (geoModel, idx) {
                var geoJson = mapDataStores[geoModel.get('map')];
                if (!geoJson) {
                    // Warning
                }
                var geo = new Geo(idx, geoJson);
                geoList.push(geo);

                geoModel.coordinateSystem = geo;

                // Inject resize method
                geo.resize = resizeGeo;

                geo.resize(geoModel, api);
            });

            ecModel.eachSeries(function (seriesModel) {
                var coordSys = seriesModel.get('coordinateSystem');
                if (coordSys === 'geo') {
                    var geoIndex = seriesModel.get('geoIndex') || 0;
                    seriesModel.coordinateSystem = geoList[geoIndex];
                }
            });

            // If has map series
            ecModel.eachSeriesByType('map', function (seriesModel) {
                var mapType = seriesModel.get('mapType');
                var geoJson = mapDataStores[mapType];
                if (!geoJson) {
                    // Warning
                }
                var geo = new Geo(seriesModel.name, geoJson);
                geoList.push(geo);

                // Inject resize method
                geo.resize = resizeGeo;

                geo.resize(seriesModel, api);

                seriesModel.coordinateSystem = geo;
            });

            return geoList;
        },

        /**
         * @param {string} mapName
         * @param {Object} geoJson
         */
        registerMap: function (mapName, geoJson) {
            mapDataStores[mapName] = geoJson;
        },

        /**
         * @param {string} mapName
         * @return {Object}
         */
        getMap: function (mapName) {
            return mapDataStores[mapName];
        }
    };

    // Inject methods into echarts
    var echarts = require('../../echarts');

    echarts.registerMap = geoCreator.registerMap;

    echarts.getMap = geoCreator.getMap;

    // TODO
    echarts.loadMap = function () {

    }

    echarts.registerCoordinateSystem('geo', geoCreator);
});