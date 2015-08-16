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
         */
        this.parentModel = parentModel || null;

        /**
         * @type {Object}
         * @readOnly
         */
        this.$option = {};

        this.init.apply(this, arguments);
    }

    Model.prototype = {

        constructor: Model,

        /**
         * Model 的初始化函数
         * @param {Object} option
         */
        init: function (option) {
            this.$option = option;
        },

        /**
         * 从新的 Option merge
         */
        mergeOption: function (option) {
            zrUtil.merge(this.$option, option);
        },

        /**
         * @param {string} path
         * @return {*}
         */
        get: function (path) {
            if (typeof path == 'string') {
                path = path.split('.');
            }
            var obj = this.$option;
            for (var i = 0; i < path.length; i++) {
                obj = obj[path[i]];
                if (obj == null) {
                    break;
                }
            }
            if (obj == null && this.parentModel) {
                return this.parentModel.get(path);
            }
            return obj;
        },

        restore: function () {},

        // Pending
        clone: function () {
            var Ctor = this.constructor;
            return new Ctor(zrUtil.clone(this.$option, true));
        }
    };

    Model.extend = function (proto) {
        var Super = this;

        var ExtendedModel = function (option, parent) {
            Super.call(this, option, parent);
        };

        for (var name in proto) {
            ExtendedModel.prototype[name] = proto[name];
        }

        ExtendedModel.extend = Super.extend;

        zrUtil.inherits(ExtendedModel, Super);

        return ExtendedModel;
    }

    return Model;
});