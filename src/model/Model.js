define(function (require) {

    var zrUtil = require('zrender/core/util');

    function Model(option, parent) {

        this.parent = parent || null;

        this.option = option;

        this.init(option);
    }

    Model.prototype = {

        constructor: Model,

        init: function (option) {},

        get: function (path) {
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
            if (obj == null && this.parent) {
                return this.parent.get(path);
            }
            return obj;
        },

        set: function (path, value) {
            if (typeof path == 'string') {
                path = path.split('.');
            }
            var obj = this.option;
            var key;
            for (var i = 0; i < path.length - 1; i++) {
                key = path[i];
                if (obj == null) {
                    // Create an empty object if not exists
                    obj[key] = {};
                }
                obj = obj[key];
            }
            key = path[i];
            obj[key] = value;

            return value;
        },

        getSubModel: function (path) {
            var Ctor = this.constructor;
            return new Ctor(this.get(path), this);
        },

        clone: function () {
            var Ctor = this.constructor;
            // PENDING Deep clone ?
            return new Ctor(zrUtil.clone(this._option, true));
        },

        merge: function (obj) {
            zrUtil.merge(this._option, obj, true);
        },

        defaults: function (obj) {
            zrUtil.merge(this._option, obj);
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