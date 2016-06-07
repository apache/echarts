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
    var layout = require('../util/layout');

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
        componentIndex: 0,

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
        dependentModels: [],

        /**
         * @type {string}
         * @readOnly
         */
        uid: null,

        /**
         * Support merge layout params.
         * Only support 'box' now (left/right/top/bottom/width/height).
         * @type {string|Object} Object can be {ignoreSize: true}
         * @readOnly
         */
        layoutMode: null,


        init: function (option, parentModel, ecModel, extraOpt) {
            this.mergeDefaultAndTheme(this.option, this.ecModel);
        },

        mergeDefaultAndTheme: function (option, ecModel) {
            var layoutMode = this.layoutMode;
            var inputPositionParams = layoutMode
                ? layout.getLayoutParams(option) : {};

            var themeModel = ecModel.getTheme();
            zrUtil.merge(option, themeModel.get(this.mainType));
            zrUtil.merge(option, this.getDefaultOption());

            if (layoutMode) {
                layout.mergeLayoutParam(option, inputPositionParams, layoutMode);
            }
        },

        mergeOption: function (option) {
            zrUtil.merge(this.option, option, true);

            var layoutMode = this.layoutMode;
            if (layoutMode) {
                layout.mergeLayoutParam(this.option, option, layoutMode);
            }
        },

        // Hooker after init or mergeOption
        optionUpdated: function (newCptOption, isInit) {},

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

    // Reset ComponentModel.extend, add preConstruct.
    clazzUtil.enableClassExtend(
        ComponentModel,
        function (option, parentModel, ecModel, extraOpt) {
            // Set dependentModels, componentIndex, name, id, mainType, subType.
            zrUtil.extend(this, extraOpt);

            this.uid = componentUtil.getUID('componentModel');

            // this.setReadOnly([
            //     'type', 'id', 'uid', 'name', 'mainType', 'subType',
            //     'dependentModels', 'componentIndex'
            // ]);
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

    zrUtil.mixin(ComponentModel, require('./mixin/boxLayout'));

    return ComponentModel;
});