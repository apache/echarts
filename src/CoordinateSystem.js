define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var coordinateSystemCreators = {};

    function CoordinateSystemManager() {

        this._coordinateSystems = {};
    }

    CoordinateSystemManager.prototype = {

        constructor: CoordinateSystemManager,

        update: function (option) {
            this._coordinateSystems = {};
            zrUtil.each(coordinateSystemCreators, function (coordinateSystemCreator, type) {
                this._coordinateSystems[type] = coordinateSystemCreator.create(option);
            });
        },

        get: function (type, idx) {
            var list = this._coordinateSystems[type];
            if (list) {
                return list[idx];
            }
        }
    }

    CoordinateSystemManager.register = function (type, coordinateSystemCreator) {
        coordinateSystemCreators[type] = coordinateSystemCreator;
    };

    return CoordinateSystemManager;
});