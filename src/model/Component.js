/**
 * Component model
 *
 * @module echarts/model/Component
 */
define(function(require) {

    'use strict';

    var Model = require('./Model');
    var zrUtil = require('zrender/core/util');
    var arrayPush = Array.prototype.push;
    var componentUtil = require('../util/component');

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

        /**
         * @type {Object}
         * @readOnly
         */
        ecModel: null,

        /**
         * key: componentType
         * value:  Component model list, can not be null.
         * @type {Object.<string, Array.<module:echarts/model/Model>>}
         * @readOnly
         */
        dependentModel: null,

        init: function () {
            this.mergeDefaultAndTheme(this.option, this.ecModel);
        },

        mergeDefaultAndTheme: function (option, ecModel) {
            zrUtil.merge(option, ecModel.getTheme().get(this.type));
            zrUtil.merge(option, this.getDefaultOption());
        },

        getDefaultOption: function () {
            if (!this.hasOwnProperty('__defaultOption')) {
                var optList = [];
                var Class = this.constructor;
                while (Class) {
                    var opt = Class.prototype.defaultOption;
                    opt && optList.push(opt);
                    Class = Class.superClass;
                }

                var defaultOption = {};
                for (var i = optList.length - 1; i >= 0; i--) {
                    defaultOption = zrUtil.merge(defaultOption, optList[i], true);
                }
                this.__defaultOption = defaultOption;
            }
            return this.__defaultOption;
        }

    });

    ComponentModel.extend = function (proto) {
        var SubComponentModel = function (option, parentModel, ecModel, dependentModels) {
            this.ecModel = ecModel;
            this.dependentModels = dependentModels;
            /**
             * @type {string}
             * @public
             * @readOnly
             */
            this.uid = componentUtil.getUID('componentModel');

            ComponentModel.apply(this, arguments);
        };

        zrUtil.extend(SubComponentModel.prototype, proto);

        var Super = this;
        SubComponentModel.extend = Super.extend;
        zrUtil.inherits(SubComponentModel, Super);

        return ComponentModel.registerClass(SubComponentModel, proto.type);
    };

    // And capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
    componentUtil.enableClassManagement(ComponentModel, true);

    componentUtil.enableTopologicalTravel(ComponentModel, getDependencies);

    function getDependencies(componentType) {
        var deps = [];
        zrUtil.each(ComponentModel.getClassesByMainType(componentType), function (Clazz) {
            arrayPush.apply(deps, Clazz.prototype.dependencies || []);
        });
        return deps;
    }

    return ComponentModel;
});