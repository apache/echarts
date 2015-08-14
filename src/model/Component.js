define(function(require) {

    'use strict';

    var componentModelClasses = {};
    var Model = require('./Model');

    var ComponentModel = Model.extend({
        type: 'component'
    });

    ComponentModel.extend = function (opts) {

        var SubComponentModel = Model.extend(opts);

        var componentType = opts.type;
        if (componentType) {
            if (componentModelClasses[componentType]) {
                // Warning
            }
            componentModelClasses[componentType] = SubComponentModel;
        }
        return SubComponentModel;
    };

    ComponentModel.create = function (name, option) {
        if (componentModelClasses[name]) {
            return new componentModelClasses[name](option);
        }
    };

    ComponentModel.has = function (name) {
        return componentModelClasses[name];
    };

    return ComponentModel;
});