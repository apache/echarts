/**
 * @module echarts/model/Model
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');

    /**
     * @alias module:echarts/model/Model
     * @constructor
     */
    function Model(option, parentModel) {

        /**
         * @type {module:echarts/model/Model}
         * @readOnly
         */
        this.parentModel = parentModel || null;

        /**
         * @type {Object}
         * @protected
         */
        this.option = option;

        this.init.apply(this, arguments);
    }

    Model.prototype = {

        constructor: Model,

        /**
         * Model 的初始化函数
         * @param {Object} option
         */
        init: function (option) {},

        /**
         * 从新的 Option merge
         */
        mergeOption: function (option) {
            zrUtil.merge(this.option, option);
        },

        /**
         * @param {string} path
         * @param {boolean} [ignoreParent=false]
         * @return {*}
         */
        get: function (path, ignoreParent) {
            if (!path) {
                return this.option;
            }

            if (typeof path === 'string') {
                path = path.split('.');
            }

            var obj = this.option;
            var parentModel = this.parentModel;
            for (var i = 0; i < path.length; i++) {
                obj = obj && obj[path[i]];
                if (obj == null) {
                    break;
                }
            }
            if (obj == null && parentModel && !ignoreParent) {
                obj = parentModel.get(path);
            }
            return obj;
        },

        /**
         * @param {string} key
         * @param {boolean} [ignoreParent=false]
         * @return {*}
         */
        getShallow: function (key, ignoreParent) {
            var option = this.option;
            var val = option && option[key];
            var parentModel = this.parentModel;
            if (val == null && parentModel && !ignoreParent) {
                val = parentModel.getShallow(key);
            }
            return val;
        },

        /**
         * @param {string} path
         * @return {module:echarts/model/Model}
         */
        getModel: function (path) {
            var obj = this.get(path);
            var parentModel = this.parentModel;
            return new Model(obj, parentModel && parentModel.getModel(path));
        },

        /**
         * If model has option
         */
        isEmpty: function () {
            return this.option == null;
        },

        restoreData: function () {},

        // Pending
        clone: function () {
            var Ctor = this.constructor;
            return new Ctor(zrUtil.clone(this.option, true));
        }
    };

    Model.extend = function (proto) {
        var ExtendedModel = function () {
            Model.apply(this, arguments);
        };

        for (var name in proto) {
            if (proto.hasOwnProperty(name)) {
                ExtendedModel.prototype[name] = proto[name];
            }
        }

        var Super = this;
        ExtendedModel.extend = Super.extend;
        zrUtil.inherits(ExtendedModel, Super);

        return ExtendedModel;
    };

    zrUtil.merge(Model.prototype, require('./mixin/lineStyle'));
    zrUtil.merge(Model.prototype, require('./mixin/areaStyle'));
    zrUtil.merge(Model.prototype, require('./mixin/textStyle'));
    zrUtil.merge(Model.prototype, require('./mixin/itemStyle'));

    return Model;
});