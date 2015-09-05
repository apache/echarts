/**
 * @module echarts/model/Model
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var unique = require('../util/unique');

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

        /**
         * @type {string}
         * @public
         * @readOnly
         */
        this.uid = unique.getUID('model');

        this.init.apply(this, arguments);
    }

    Model.prototype = {

        constructor: Model,

        /**
         * visual properties after visual coding
         * @type {Object}
         * @private
         */
        _visual: null,

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
         * @return {*}
         */
        get: function (path, parentModel) {
            if (typeof path === 'string') {
                path = path.split('.');
            }
            if (this.option == null) {
                return;
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
         * Get visual property.
         */
        getVisual: function (key) {
            var visual = this._visual;
            var val = visual && visual[key];
            var parentModel = this.parentModel;
            if (val == null && parentModel) {
                return parentModel.getVisual(key);
            }
            return val;
        },

        /**
         * Set visual property
         *
         * @example
         *  setVisual('color', color);
         *  setVisual({
         *      'color': color
         *  });
         */
        setVisual: function (key, val) {
            if (typeof (key) === 'object') {
                for (var name in key) {
                    if (key.hasOwnProperty(name)) {
                        this.setVisual(name, key[name]);
                    }
                }
                return;
            }
            this._visual = this._visual || {};
            this._visual[key] = val;
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