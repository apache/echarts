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
            zrUtil.each(coordinateSystemCreators, function (coordinateSystemCreator, type) {
                coordinateSystems[type] = coordinateSystemCreator.create(ecModel, api);
            }, this);
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