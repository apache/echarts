define(function (require) {

    var zrUtil = require('zrender/core/util');

    return require('../../echarts').extendComponentView({

        type: 'marker',

        init: function () {
            /**
             * Markline grouped by series
             * @private
             * @type {module:zrender/core/util.HashMap}
             */
            this.markerGroupMap = zrUtil.createHashMap();
        },

        render: function (markerModel, ecModel, api) {
            var markerGroupMap = this.markerGroupMap;
            markerGroupMap.each(function (item) {
                item.__keep = false;
            });

            var markerModelKey = this.type + 'Model';
            ecModel.eachSeries(function (seriesModel) {
                var markerModel = seriesModel[markerModelKey];
                markerModel && this.renderSeries(seriesModel, markerModel, ecModel, api);
            }, this);

            markerGroupMap.each(function (item) {
                !item.__keep && this.group.remove(item.group);
            }, this);
        },

        renderSeries: function () {}
    });
});