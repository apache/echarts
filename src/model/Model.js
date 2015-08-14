define(function (require) {

    var zrUtil = require('zrender/core/util');

    function Model(option, parent) {

        this.parent = parent || null;

        this.$option = {};

        this.init(option);
    }

    Model.prototype = {

        constructor: Model,

        init: function (option) {
            this.$option = option;
        },

        /**
         * 从新的 Option merge
         */
        mergeOption: function (option) {
            zrUtil.merge(this.$option, option);
        },

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
            if (obj == null && this.parent) {
                return this.parent.get(path);
            }
            return obj;
        },

        getOption: function () {
            return this.$option;
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