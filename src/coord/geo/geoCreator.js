define(function (require) {

    require('./GeoModel');

    var Geo = require('./Geo');

    var layout = require('../../util/layout');
    var zrUtil = require('zrender/core/util');

    var mapDataStores = {};

    /**
     * Resize method bound to the geo
     * @param {module:echarts/coord/geo/GeoModel|module:echarts/chart/map/MapModel} geoModel
     * @param {module:echarts/ExtensionAPI} api
     */
    function resizeGeo (geoModel, api) {
        var locModel = geoModel;
        if (geoModel.type === 'series.map') {
            locModel = geoModel.getModel('mapLocation');
        }

        var rect = this.getBoundingRect();

        var viewRect = layout.parsePositionInfo({
            x: locModel.get('x'),
            y: locModel.get('y'),
            x2: locModel.get('x2'),
            y2: locModel.get('y2'),
            width: locModel.get('width'),
            height: locModel.get('height'),
            // 0.75 rate
            aspect: rect.width / rect.height * 0.75
        }, {
            width: api.getWidth(),
            height: api.getHeight()
        });

        var width = viewRect.width;
        var height = viewRect.height;

        var x = viewRect.x + (width - viewRect.width) / 2;
        var y = viewRect.y + (height - viewRect.height) / 2;
        this.setViewRect(x, y, width, height);

        var roamDetailModel = geoModel.getModel('roamDetail');

        var panX = roamDetailModel.get('x') || 0;
        var panY = roamDetailModel.get('y') || 0;
        var zoom = roamDetailModel.get('zoom') || 1;

        this.setPan(panX, panY);
        this.setZoom(zoom);
    }

    /**
     * @param {module:echarts/coord/Geo} geo
     * @param {module:echarts/model/Model} model
     * @inner
     */
    function setGeoCoords(geo, model) {
        zrUtil.each(model.get('geoCoord'), function (geoCoord, name) {
            geo.addGeoCoord(name, geoCoord);
        });
    }

    var geoCreator = {

        create: function (ecModel, api) {
            var geoList = [];

            // FIXME Create each time may be slow
            ecModel.eachComponent('geo', function (geoModel, idx) {
                var name = geoModel.get('map');
                var geoJson = mapDataStores[name];
                // if (!geoJson) {
                    // Warning
                // }
                var geo = new Geo(name + idx, name, geoJson);
                geoList.push(geo);

                setGeoCoords(geo, geoModel);

                geoModel.coordinateSystem = geo;
                geo.model = geoModel;

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
                // if (!geoJson) {
                    // Warning
                // }

                var geo = new Geo(mapType, mapType, geoJson);
                geoList.push(geo);

                // Inject resize method
                geo.resize = resizeGeo;

                geo.resize(mapSeries[0], api);

                zrUtil.each(mapSeries, function (singleMapSeries) {
                    singleMapSeries.coordinateSystem = geo;

                    setGeoCoords(geo, singleMapSeries);
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

    };

    echarts.registerCoordinateSystem('geo', geoCreator);
});