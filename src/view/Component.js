define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Group = require('zrender/container/Group');
    var componentUtil = require('../util/component');

    var Component = function () {
        /**
         * @type {module:zrender/container/Group}
         * @readOnly
         */
        this.group = new Group();

        /**
         * @type {string}
         * @readOnly
         */
        this.uid = componentUtil.getUID('viewComponent');
    };

    Component.prototype = {

        constructor: Component,

        init: function (ecModel, api) {},

        render: function (componentModel, ecModel, api) {},

        dispose: function () {}
    };

    Component.extend = function (proto) {
        var Super = this;

        var ExtendedComponent = function () {
            Super.call(this);
        };

        zrUtil.extend(ExtendedComponent.prototype, proto);

        ExtendedComponent.extend = Super.extend;

        zrUtil.inherits(ExtendedComponent, Super);

        return Component.registerClass(ExtendedComponent, proto.type);
    };

    // And capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
    componentUtil.enableClassManagement(Component);

    return Component;
});