define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Group = require('zrender/container/Group');

    var Component = function () {

        /**
         * @type {module:zrender/container/Group}
         * @readOnly
         */
        this.group = new Group();
    };

    Component.prototype = {

        constructor: Component,

        init: function () {},

        render: function (componentModel, ecModel, api) {},

        dispose: function () {}
    };

    var componentClassStore = {};
    var componentTypeList = [];

    Component.extend = function (proto) {
        var Super = this;

        var ExtendedComponent = function () {
            Super.call(this);
        };

        for (var name in proto) {
            ExtendedComponent.prototype[name] = proto[name];
        }

        ExtendedComponent.extend = Super.extend;

        zrUtil.inherits(ExtendedComponent, Super);

        if (proto.type) {
            if (componentClassStore[proto.type]) {
                // Error exists
                return;
            }
            componentClassStore[proto.type] = ExtendedComponent;
            componentTypeList.push(proto.type);
        }

        return ExtendedComponent;
    };

    Component.eachAvailableComponent = function (cb, context) {
        zrUtil.each(componentTypeList, cb, context);
    };

    Component.create = function (type) {
        var Component = componentClassStore[type];
        if (! Component) {
            // Error
        }
        return new Component();
    }

    return Component;
});