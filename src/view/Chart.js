define(function (require) {

    var Group = require('zrender/container/Group');
    var componentUtil = require('../util/component');

    function Chart() {

        /**
         * @type {module:zrender/container/Group}
         * @readOnly
         */
        this.group = new Group();

        /**
         * @type {string}
         * @readOnly
         */
        this.uid = componentUtil.getUID('viewChart');
    }

    Chart.prototype = {

        type: '',

        init: function (ecModel, api) {},

        render: function (seriesModel, ecModel, api) {},

        remove: function () {
            this.group.removeAll();
        },

        dispose: function () {}
    };

    // Enable Chart.extend.
    componentUtil.enableClassExtend(Chart);

    // Add capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
    componentUtil.enableClassManagement(Chart, {registerWhenExtend: true});

    return Chart;
});