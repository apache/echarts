define(function(require) {

    'use strict';

    // var zrUtil = require('zrender/core/util');
    var coordinateSystemCreators = {};

    function CoordinateSystemManager() {

        this._coordinateSystems = [];
    }

    CoordinateSystemManager.prototype = {

        constructor: CoordinateSystemManager,

        create: function (ecModel, api) {
            var coordinateSystems = [];
            for (var type in coordinateSystemCreators) {
                var list = coordinateSystemCreators[type].create(ecModel, api);
                list && (coordinateSystems = coordinateSystems.concat(list));
            }

            this._coordinateSystems = coordinateSystems;
        },

        update: function (ecModel, api) {
            var coordinateSystems = this._coordinateSystems;
            for (var i = 0; i < coordinateSystems.length; i++) {
                // FIXME MUST have
                coordinateSystems[i].update && coordinateSystems[i].update(ecModel, api);
            }
        }
    };

    CoordinateSystemManager.register = function (type, coordinateSystemCreator) {
        coordinateSystemCreators[type] = coordinateSystemCreator;
    };

    CoordinateSystemManager.get = function (type) {
        return coordinateSystemCreators[type];
    };

    return CoordinateSystemManager;
});