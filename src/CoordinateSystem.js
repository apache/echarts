define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var coordinateSystemCreators = {};

    function CoordinateSystemManager() {

        this._coordinateSystems = {};
    }

    CoordinateSystemManager.prototype = {

        constructor: CoordinateSystemManager,

        update: function (ecModel, api) {
            var coordinateSystems = {};
            for (var type in coordinateSystemCreators) {
                coordinateSystems[type] = coordinateSystemCreators[type].create(ecModel, api);
            }
            this._coordinateSystems = coordinateSystems;
        },

        get: function (type, idx) {
            var list = this._coordinateSystems[type];
            if (list) {
                return list[idx];
            }
        },

        resize: function (ecModel, api) {
            zrUtil.each(this._coordinateSystems, function (coordinateSystem) {
                coordinateSystem.resize(ecModel, api);
            });
        }
    }

    CoordinateSystemManager.register = function (type, coordinateSystemCreator) {
        coordinateSystemCreators[type] = coordinateSystemCreator;
    };

    return CoordinateSystemManager;
});