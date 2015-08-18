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

        _prefix: '',

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
         * Set getter path prefix
         * @param {string} prefix
         */
        withPrefix: function (prefix) {
            this._prefix = prefix || '';
            return this;
        },

        /**
         * @param {string} path
         * @return {*}
         */
        get: function (path) {
            path = this._prefix + path;
            if (typeof path == 'string') {
                path = path.split('.');
            }
            var obj = this.option;
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
            return new Ctor(zrUtil.clone(this.option, true));
        }
    };

    Model.extend = function (proto) {
        var Super = this;

        var ExtendedModel = function () {
            Super.apply(this, arguments);
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