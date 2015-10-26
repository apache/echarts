define(function (require) {

    require('./GeoModel');

    var Geo = require('./Geo');

    var numberUtil = require('../../util/number');
    var zrUtil = require('zrender/core/util');

    var mapDataStores = {};

    /**
     * Resize method bound to the geo
     * @param {module:echarts/coord/geo/GeoModel|module:echarts/chart/map/MapModel} geoModel
     * @param {module:echarts/ExtensionAPI} api
     */
    var resizeGeo = function (geoModel, api) {
        var locModel = geoModel;
        if (geoModel.type === 'series.map') {
            locModel = geoModel.getModel('mapLocation');
        }

        var x = locModel.get('x');
        var y = locModel.get('y');
        var width = locModel.get('width');
        var height = locModel.get('height');

        var viewWidth = api.getWidth();
        var viewHeight = api.getHeight();

        var parsePercent = numberUtil.parsePercent;
        var cx = parsePercent(x, viewWidth);
        var cy = parsePercent(y, viewHeight);

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

        // Special position
        // FIXME
        switch (x) {
            case 'center':
                break;
            case 'right':
                cx -= width;
                break;
            default:
                cx += width / 2;
                break;
        }
        switch (y) {
            case 'center':
                break;
            case 'bottom':
                cy -= height;
                break;
            default:
                cy += height / 2;
                break;
        }

        x = cx - width / 2;
        y = cy - height / 2;
        this.transformTo(x, y, width, height);
        this.setViewBox(x, y, width, height);

        var roamDetailModel = geoModel.getModel('roamDetail');

        var panX = roamDetailModel.get('x') || 0;
        var panY = roamDetailModel.get('y') || 0;
        var zoom = roamDetailModel.get('zoom') || 1;

        this.setPan(panX, panY);
        this.setZoom(zoom);
    }

    var geoCreator = {

        create: function (ecModel, api) {
            var geoList = [];

            // FIXME Create each time may be slow
            ecModel.eachComponent('geo', function (geoModel, idx) {
                var name = geoModel.get('map');
                var geoJson = mapDataStores[name];
                if (!geoJson) {
                    // Warning
                }
                var geo = new Geo(name + idx, name, geoJson);
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
            var mapModelGroupBySeries = {};

            ecModel.eachSeriesByType('map', function (seriesModel) {
                var mapType = seriesModel.get('map');

                mapModelGroupBySeries[mapType] = mapModelGroupBySeries[mapType] || [];

                mapModelGroupBySeries[mapType].push(seriesModel);
            });

            zrUtil.each(mapModelGroupBySeries, function (mapSeries, mapType) {
                var geoJson = mapDataStores[mapType];
                if (!geoJson) {
                    // Warning
                }

                var geo = new Geo(mapType, mapType, geoJson);
                geoList.push(geo);

                // Inject resize method
                geo.resize = resizeGeo;

                geo.resize(mapSeries[0], api);

                zrUtil.each(mapSeries, function (singleMapSeries) {
                    singleMapSeries.coordinateSystem = geo;
                });
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