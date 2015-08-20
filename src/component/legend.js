/**
 * Legend component entry file8
 */
define(function (require) {

    require('./legend/LegendModel');
    require('./legend/LegendView');

    var echarts = require('../echarts');
    // Series Filter
    echarts.registerProcessor(function (ecModel) {
        var legendModel = ecModel.getComponent('legend');
        if (legendModel) {
            ecModel.filterSeries(function (series) {
                return legendModel.isSelected(series.name);
            });
        }
    });

    // Series color
    echarts.registerVisualCoding(function (ecModel) {
        var legendModel = ecModel.getComponent('legend');
        if (legendModel) {
            var legendData = legendModel.getData();
            ecModel.eachSeries(function (series) {
                var data = legendData.getByName(series.name);
                var color = data && data.get('itemStyle.normal.color');
                if (color) {
                    series.setVisual('color', color);
                }
            });
        }
    });
});