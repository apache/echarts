define(function (require) {

    var zrUtil = require('zrender/core/util');
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

    Chart.extend = function (proto) {
        var Super = this;

        var ExtendedChart = function () {
            Super.call(this);
        };

        zrUtil.extend(ExtendedChart.prototype, proto);

        ExtendedChart.extend = Super.extend;

        zrUtil.inherits(ExtendedChart, Super);

        return Chart.registerClass(ExtendedChart, proto.type);
    };

    // And capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
    componentUtil.enableClassManagement(Chart);

    return Chart;
});