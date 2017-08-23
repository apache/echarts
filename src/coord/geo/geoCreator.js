define(function (require) {

    var Geo = require('./Geo');

    var layout = require('../../util/layout');
    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');

    var mapDataStores = {};

    /**
     * Resize method bound to the geo
     * @param {module:echarts/coord/geo/GeoModel|module:echarts/chart/map/MapModel} geoModel
     * @param {module:echarts/ExtensionAPI} api
     */
    function resizeGeo (geoModel, api) {

        var boundingCoords = geoModel.get('boundingCoords');
        if (boundingCoords != null) {
            var leftTop = boundingCoords[0];
            var rightBottom = boundingCoords[1];
            if (isNaN(leftTop[0]) || isNaN(leftTop[1]) || isNaN(rightBottom[0]) || isNaN(rightBottom[1])) {
                if (__DEV__) {
                    console.error('Invalid boundingCoords');
                }
            }
            else {
                this.setBoundingRect(leftTop[0], leftTop[1], rightBottom[0] - leftTop[0], rightBottom[1] - leftTop[1]);
            }
        }

        var rect = this.getBoundingRect();

        var boxLayoutOption;

        var center = geoModel.get('layoutCenter');
        var size = geoModel.get('layoutSize');

        var viewWidth = api.getWidth();
        var viewHeight = api.getHeight();

        var aspectScale = geoModel.get('aspectScale') || 0.75;
        var aspect = rect.width / rect.height * aspectScale;

        var useCenterAndSize = false;

        if (center && size) {
            center = [
                numberUtil.parsePercent(center[0], viewWidth),
                numberUtil.parsePercent(center[1], viewHeight)
            ];
            size = numberUtil.parsePercent(size, Math.min(viewWidth, viewHeight));

            if (!isNaN(center[0]) && !isNaN(center[1]) && !isNaN(size)) {
                useCenterAndSize = true;
            }
            else {
                if (__DEV__) {
                    console.warn('Given layoutCenter or layoutSize data are invalid. Use left/top/width/height instead.');
                }
            }
        }

        var viewRect;
        if (useCenterAndSize) {
            var viewRect = {};
            if (aspect > 1) {
                // Width is same with size
                viewRect.width = size;
                viewRect.height = size / aspect;
            }
            else {
                viewRect.height = size;
                viewRect.width = size * aspect;
            }
            viewRect.y = center[1] - viewRect.height / 2;
            viewRect.x = center[0] - viewRect.width / 2;
        }
        else {
            // Use left/top/width/height
            boxLayoutOption = geoModel.getBoxLayoutParams();

            // 0.75 rate
            boxLayoutOption.aspect = aspect;

            viewRect = layout.getLayoutRect(boxLayoutOption, {
                width: viewWidth,
                height: viewHeight
            });
        }

        this.setViewRect(viewRect.x, viewRect.y, viewRect.width, viewRect.height);

        this.setCenter(geoModel.get('center'));
        this.setZoom(geoModel.get('zoom'));
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

    if (__DEV__) {
        var mapNotExistsError = function (name) {
            console.error('Map ' + name + ' not exists. You can download map file on http://echarts.baidu.com/download-map.html');
        };
    }

    var geoCreator = {

        // For deciding which dimensions to use when creating list data
        dimensions: Geo.prototype.dimensions,

        create: function (ecModel, api) {
            var geoList = [];

            // FIXME Create each time may be slow
            ecModel.eachComponent('geo', function (geoModel, idx) {
                var name = geoModel.get('map');
                var mapData = mapDataStores[name];
                if (__DEV__) {
                    if (!mapData) {
                        mapNotExistsError(name);
                    }
                }
                var geo = new Geo(
                    name + idx, name,
                    mapData && mapData.geoJson, mapData && mapData.specialAreas,
                    geoModel.get('nameMap')
                );
                geo.zoomLimit = geoModel.get('scaleLimit');
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
                if (!seriesModel.getHostGeoModel()) {
                    var mapType = seriesModel.getMapType();
                    mapModelGroupBySeries[mapType] = mapModelGroupBySeries[mapType] || [];
                    mapModelGroupBySeries[mapType].push(seriesModel);
                }
            });

            zrUtil.each(mapModelGroupBySeries, function (mapSeries, mapType) {
                var mapData = mapDataStores[mapType];
                if (__DEV__) {
                    if (!mapData) {
                        mapNotExistsError(mapSeries[0].get('map'));
                    }
                }

                var nameMapList = zrUtil.map(mapSeries, function (singleMapSeries) {
                    return singleMapSeries.get('nameMap');
                });
                var geo = new Geo(
                    mapType, mapType,
                    mapData && mapData.geoJson, mapData && mapData.specialAreas,
                    zrUtil.mergeAll(nameMapList)
                );
                geo.zoomLimit = zrUtil.retrieve.apply(null, zrUtil.map(mapSeries, function (singleMapSeries) {
                    return singleMapSeries.get('scaleLimit');
                }));
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
         * @param {Object|string} geoJson
         * @param {Object} [specialAreas]
         *
         * @example
         *     $.get('USA.json', function (geoJson) {
         *         echarts.registerMap('USA', geoJson);
         *         // Or
         *         echarts.registerMap('USA', {
         *             geoJson: geoJson,
         *             specialAreas: {}
         *         })
         *     });
         */
        registerMap: function (mapName, geoJson, specialAreas) {
            if (geoJson.geoJson && !geoJson.features) {
                specialAreas = geoJson.specialAreas;
                geoJson = geoJson.geoJson;
            }
            if (typeof geoJson === 'string') {
                geoJson = (typeof JSON !== 'undefined' && JSON.parse)
                    ? JSON.parse(geoJson) : (new Function('return (' + geoJson + ');'))();
            }
            mapDataStores[mapName] = {
                geoJson: geoJson,
                specialAreas: specialAreas
            };
        },

        /**
         * @param {string} mapName
         * @return {Object}
         */
        getMap: function (mapName) {
            return mapDataStores[mapName];
        },

        /**
         * Fill given regions array
         * @param  {Array.<Object>} originRegionArr
         * @param  {string} mapName
         * @param  {Object} [nameMap]
         * @return {Array}
         */
        getFilledRegions: function (originRegionArr, mapName, nameMap) {
            // Not use the original
            var regionsArr = (originRegionArr || []).slice();
            nameMap = nameMap || {};

            var map = geoCreator.getMap(mapName);
            var geoJson = map && map.geoJson;
            if (!geoJson) {
                if (__DEV__) {
                    mapNotExistsError(mapName);
                }
                return originRegionArr;
            }

            var dataNameMap = zrUtil.createHashMap();
            var features = geoJson.features;
            for (var i = 0; i < regionsArr.length; i++) {
                dataNameMap.set(regionsArr[i].name, regionsArr[i]);
            }

            for (var i = 0; i < features.length; i++) {
                var name = features[i].properties.name;
                if (!dataNameMap.get(name)) {
                    if (nameMap.hasOwnProperty(name)) {
                        name = nameMap[name];
                    }
                    regionsArr.push({
                        name: name
                    });
                }
            }
            return regionsArr;
        }
    };

    // Inject methods into echarts
    var echarts = require('../../echarts');

    echarts.registerMap = geoCreator.registerMap;

    echarts.getMap = geoCreator.getMap;

    echarts.parseGeoJSON = require('./parseGeoJson');

    // TODO
    echarts.loadMap = function () {};

    echarts.registerCoordinateSystem('geo', geoCreator);

    return geoCreator;
});