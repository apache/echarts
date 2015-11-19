/**
 * Component model
 *
 * @module echarts/model/Component
 */
define(function(require) {

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
         * @readOnly
         */
        name: '',

        /**
         * @type {Object}
         * @protected
         */
        defaultOption: null,

        /**
         * @type {module:echarts/model/Global}
         * @readOnly
         */
        ecModel: null,

        /**
         * key: componentType
         * value:  Component model list, can not be null.
         * @type {Object.<string, Array.<module:echarts/model/Model>>}
         * @readOnly
         */
        dependentModels: null,

        /**
         * @type {string}
         * @readOnly
         */
        uid: null,

        init: function (option, parentModel, ecModel, dependentModels, index) {
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
        },

        /**
         * Two ids are different if and only if their component types
         * or names are different. We use this id to hash component models
         * and view instances in echarts. When setOption are called in
         * no-merge mode, new models are able to replace old model, and
         * view instances are able to mapped to previous.
         * @public
         * @return {string} id
         */
        getId: function () {
            return this.name + '__' + this.type;
        }

    });

    // Reset ComponentModel.extend, add preConstruct.
    componentUtil.enableClassExtend(
        ComponentModel,
        function (option, parentModel, ecModel, dependentModels, index) {
            this.ecModel = ecModel;
            this.dependentModels = dependentModels;
            this.componentIndex = index;

            // FIXME
            // 如果name重复，要进行提示。
            var componentName = option.name;
            if (componentName == null) {
                componentName = this.type + '' + index;
            }
            this.name = componentName + '';

            this.uid = componentUtil.getUID('componentModel');
        }
    );

    // Add capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
    componentUtil.enableClassManagement(
        ComponentModel, {subTypeDefaulter: true, registerWhenExtend: true}
    );

    // Add capability of ComponentModel.topologicalTravel.
    componentUtil.enableTopologicalTravel(ComponentModel, getDependencies);

    function getDependencies(componentType) {
        var deps = [];
        zrUtil.each(ComponentModel.getClassesByMainType(componentType), function (Clazz) {
            arrayPush.apply(deps, Clazz.prototype.dependencies || []);
        });
        // Ensure main type
        return zrUtil.map(deps, function (type) {
            return ComponentModel.parseComponentType(type).main;
        });
    }

    return ComponentModel;
});