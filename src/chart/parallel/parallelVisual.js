define(function (require) {

    var echarts = require('../../echarts');

    echarts.registerVisualCoding('chart', function (ecModel, payload) {
        ecModel.eachSeriesByType('parallel', function (seriesModel) {
            visualCoding(seriesModel, ecModel);
        });
    });

    echarts.registerVisualCodingProgressive('chart', 'series.parallel', visualCoding);


    function visualCoding(seriesModel, ecModel) {
        var itemStyleModel = seriesModel.getModel('itemStyle.normal');
        var globalColors = ecModel.get('color');

        var color = itemStyleModel.get('color')
            || globalColors[seriesModel.seriesIndex % globalColors.length];
        var inactiveOpacity = seriesModel.get('inactiveOpacity');
        var activeOpacity = seriesModel.get('activeOpacity');
        var lineStyle = seriesModel.getModel('lineStyle.normal').getLineStyle();

        var coordSys = seriesModel.coordinateSystem;
        var data = seriesModel.getData();

        var opacityMap = {
            normal: lineStyle.opacity,
            active: activeOpacity,
            inactive: inactiveOpacity
        };

        // If progressive not set, not progressive and render full data normally.
        var thisProgressive = seriesModel.getProgressive();
        var page = thisProgressive == null
            ? null
            : [thisProgressive.thisDataIndex, thisProgressive.nextDataIndex];

        coordSys.eachActiveState(data, page, function (activeState, dataIndex) {
            data.setItemVisual(dataIndex, 'opacity', opacityMap[activeState]);
        });

        data.setVisual('color', color);
    }

});