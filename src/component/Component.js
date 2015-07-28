define(function (require) {

    var zrUtil = require('zrender/core/util');

    var Component = function () {};

    Component.prototype = {

        constructor: Component,

        init: function () {},

        render: function () {},

        dispose: function () {}
    };

    var componentClassStore = {};
    var componentTypeList = [];

    Component.extend = function (proto) {
        var Super = this;

        var ExtendedComponent = function (echarts, chartOption) {
            Super.call(this, echarts, chartOption);
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

    Component.create = function (type, option) {
        var Component = componentClassStore[type];
        if (! Component) {
            // Error
        }
        return new Component();
    }

    return Component;
});