/**
 * Component model
 *
 * @module echarts/model/Component
 */
define(function(require) {

    'use strict';

    var componentModelClasses = {};
    var Model = require('./Model');
    var zrUtil = require('zrender/core/util');

    /**
     * @alias module:echarts/model/Component
     * @constructor
     * @param {Object} option
     * @param {module:echarts/model/Model} parentModel
     * @param {module:echarts/model/Model} ecModel
     */
    var ComponentModel = Model.extend({

        type: 'component',

        /**
         * @type {Object}
         * @protected
         */
        defaultOption: null,

        init: function (option, parentModel, ecModel) {
            this.mergeDefaultAndTheme(option, ecModel);
        },

        mergeDefaultAndTheme: function (option, ecModel) {
            zrUtil.merge(option, ecModel.getTheme().get(this.type));
            zrUtil.merge(option, this.defaultOption);
        }
    });

    ComponentModel.extend = function (opts) {

        var SubComponentModel = Model.extend.call(this, opts);

        var componentType = opts.type;
        if (componentType) {
            if (componentModelClasses[componentType]) {
                // Warning
            }
            componentModelClasses[componentType] = SubComponentModel;
        }
        return SubComponentModel;
    };

    ComponentModel.create = function (name, option, ecModel) {
        if (componentModelClasses[name]) {
            return new componentModelClasses[name](option, null, ecModel);
        }
    };

    ComponentModel.has = function (name) {
        return !!componentModelClasses[name];
    };

    return ComponentModel;
});