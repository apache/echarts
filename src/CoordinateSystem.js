define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    /**
     * Coordinate Interface
     *
     * create:
     *     @param {module:echarts/model/Global} ecModel
     *     @param {module:echarts/ExtensionAPI} api
     *     @return {Object} coordinate system instance
     *
     * update:
     *     @param {module:echarts/model/Global} ecModel
     *     @param {module:echarts/ExtensionAPI} api
     *
     * convertToPixel:
     * convertFromPixel:
     *     These two methods is also responsible for determine whether this
     *     coodinate system is applicable to the given `finder`.
     *     Each coordinate system will be tried, util one returns none
     *     null/undefined value.
     *     @param {module:echarts/model/Global} ecModel
     *     @param {Object} finder
     *     @param {Array|number} value
     *     @return {Array|number} convert result.
     */

    var coordinateSystemCreators = {};

    function CoordinateSystemManager() {

        this._coordinateSystems = [];
    }

    CoordinateSystemManager.prototype = {

        constructor: CoordinateSystemManager,

        create: function (ecModel, api) {
            var coordinateSystems = [];
            zrUtil.each(coordinateSystemCreators, function (creater, type) {
                var list = creater.create(ecModel, api);
                coordinateSystems = coordinateSystems.concat(list || []);
            });

            this._coordinateSystems = coordinateSystems;
        },

        update: function (ecModel, api) {
            zrUtil.each(this._coordinateSystems, function (coordSys) {
                // FIXME MUST have
                coordSys.update && coordSys.update(ecModel, api);
            });
        },

        /**
         * Convert from logical coordinate system to pixel coordinate system.
         * @param {string|Object} finder
         *        If string, e.g., 'geo', means {geoIndex: 0}.
         *        If Object, could contain some of these properties below:
         *        {
         *            seriesIndex, seriesId,
         *            geoIndex, geoId,
         *            bmapIndex, bmapId,
         *            xAxisIndex, xAxisId,
         *            yAxisIndex, yAxisId,
         *            gridIndex, gridId,
         *            ... (can be extended)
         *        }
         * @param {Array|number} value
         * @return {Array|number} result
         */
        convertToPixel: zrUtil.curry(doConvert, 'convertToPixel'),

        /**
         * Convert from pixel coordinate system to logical coordinate system.
         * @param {string|Object} finder
         *        If string, e.g., 'geo', means {geoIndex: 0}.
         *        If Object, could contain some of these properties below:
         *        {
         *            seriesIndex, seriesId,
         *            geoIndex, geoId,
         *            bmapIndex, bmapId,
         *            xAxisIndex, xAxisId,
         *            yAxisIndex, yAxisId,
         *            gridIndex, gridId,
         *            ... (can be extended)
         *        }
         * @param {Array|number} value
         * @return {Array|number} result
         */
        convertFromPixel: zrUtil.curry(doConvert, 'convertFromPixel')
    };

    CoordinateSystemManager.register = function (type, coordinateSystemCreator) {
        coordinateSystemCreators[type] = coordinateSystemCreator;
    };

    CoordinateSystemManager.get = function (type) {
        return coordinateSystemCreators[type];
    };

    function parseFinder(ecModel, finder) {
        if (zrUtil.isString(finder)) {
            var obj = {};
            obj[finder + 'Index'] = 0;
            finder = obj;
        }

        var result = {};

        zrUtil.each(finder, function (value, key) {
            key = key.match(/^(\w+)(Index|Id|Name)$/);
            var queryParam = {mainType: key[1]};
            queryParam[key[2].toLowerCase()] = value;
            result[key[1] + 'Model'] = ecModel.queryComponents(queryParam)[0];
        });

        return result;
    }

    function doConvert(methodName, ecModel, finder, value) {
        finder = parseFinder(ecModel, finder);

        var result;
        var coordSysList = this._coordinateSystems;

        for (var i = 0; i < coordSysList.length; i++) {
            var coordSys = coordSysList[i];
            if (coordSys[methodName]
                && (result = coordSys[methodName](ecModel, finder, value)) != null
            ) {
                return result;
            }
        }
    }

    return CoordinateSystemManager;
});