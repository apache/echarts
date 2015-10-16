define(function (require) {

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

    // Enable Component.extend.
    componentUtil.enableClassExtend(Component);

    // Enable capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
    componentUtil.enableClassManagement(Component, {registerWhenExtend: true});

    return Component;
});