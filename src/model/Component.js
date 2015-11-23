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
    var clazzUtil = require('../util/clazz');

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
         * @type {string}
         */
        id: '',

        /**
         * @readOnly
         */
        name: '',

        /**
         * @readOnly
         * @type {string}
         */
        mainType: '',

        /**
         * @readOnly
         * @type {string}
         */
        subType: '',

        /**
         * @readOnly
         * @type {number}
         */
        componentIndex: null,

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
            var themeModel = ecModel.getTheme();
            zrUtil.merge(option, themeModel.get(this.mainType));
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
         * @public
         * @return {string} id
         */
        getId: function () {
            return this.id;
        }

    });

    // Reset ComponentModel.extend, add preConstruct.
    clazzUtil.enableClassExtend(
        ComponentModel,
        function (option, parentModel, ecModel, dependentModels, index) {

            this.ecModel = ecModel;
            this.dependentModels = dependentModels;
            this.componentIndex = index;

            var type = this.type;
            if (type) {
                type = clazzUtil.parseClassType(type);
                this.mainType = type.main;
                this.subType = type.sub;
            }

            // option.name and option.id has been completed and validated
            // in module:echarts/model/Global
            this.name = option.name;
            this.id = option.id;

            this.uid = componentUtil.getUID('componentModel');
        }
    );

    // Add capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
    clazzUtil.enableClassManagement(
        ComponentModel, {registerWhenExtend: true}
    );
    componentUtil.enableSubTypeDefaulter(ComponentModel);

    // Add capability of ComponentModel.topologicalTravel.
    componentUtil.enableTopologicalTravel(ComponentModel, getDependencies);

    function getDependencies(componentType) {
        var deps = [];
        zrUtil.each(ComponentModel.getClassesByMainType(componentType), function (Clazz) {
            arrayPush.apply(deps, Clazz.prototype.dependencies || []);
        });
        // Ensure main type
        return zrUtil.map(deps, function (type) {
            return clazzUtil.parseClassType(type).main;
        });
    }

    return ComponentModel;
});