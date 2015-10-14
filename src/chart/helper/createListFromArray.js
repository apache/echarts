define(function(require) {
    'use strict';

    var List = require('../../data/List');

    /**
     * Helper function to create a list from option data
     */
    return function (data, seriesModel, ecModel) {
        // If data is undefined
        data = data || [];

        var coordinateSystem = seriesModel.get('coordinateSystem');
        var dimensions;

        var categoryAxisModel;

        if (coordinateSystem === 'cartesian2d') {
            var xAxisModel = ecModel.getComponent('xAxis', seriesModel.get('xAxisIndex'));
            var yAxisModel = ecModel.getComponent('yAxis', seriesModel.get('yAxisIndex'));
            if (xAxisModel.get('type') === 'category') {
                dimensions = [{
                    name: 'x',
                    type: 'ordinal'
                }, {
                    name: 'y',
                    stackable: true
                }];

                categoryAxisModel = xAxisModel;
            }
            else if (yAxisModel.get('type') === 'category') {
                dimensions = [{
                    name: 'y',
                    type: 'ordinal'
                }, {
                    name: 'x',
                    stackable: true
                }];

                categoryAxisModel = yAxisModel;
            }
            else {
                // PENDING
                var dimSize = data[0] && data[0].length;
                // FIXME
                var dimensionNames = ['x', 'y', 'z', 'a', 'b', 'c', 'd', 'e'];
                if (dimSize >= 2) {
                    dimensions = dimensionNames.slice(0, dimSize);
                }
            }
        }
        else if (coordinateSystem === 'polar') {
            var axisFinder = function (axisModel) {
                return axisModel.get('polarIndex') === polarIndex;
            }
            var polarIndex = seriesModel.get('polarIndex') || 0;
            var angleAxisModel = ecModel.findComponent('angleAxis', axisFinder);
            var radiusAxisModel = ecModel.findComponent('radiusAxis', axisFinder);

            if (angleAxisModel.get('type') === 'category') {
                dimensions = [{
                    name: 'angle',
                    type: 'ordinal'
                }, {
                    name: 'radius',
                    stackable: true
                }];

                categoryAxisModel = angleAxisModel;
            }
            else if (radiusAxisModel.get('type') === 'category') {
                dimensions = [{
                    name: 'radius',
                    type: 'ordinal'
                }, {
                    name: 'angle',
                    stackable: true
                }];

                categoryAxisModel = radiusAxisModel;
            }
            else {
                // PENDING
                var dimSize = data[0] && data[0].length;
                if (dimSize === 2) {
                    dimensions = ['radius', 'angle'];
                }
                else if (dimSize === 3) {
                    dimensions = ['radius', 'angle', 'value'];
                }
            }
        }
        else if (coordinateSystem === 'geo') {
            // TODO Region
            // 多个散点图系列在同一个地区的时候
            dimensions = [{
                name: 'lon'
            }, {
                name: 'lat'
            }, {
                name: 'value'
            }]
        }

        var nameList = [];
        if (categoryAxisModel) {
            var categories = categoryAxisModel.get('data');
            if (categories) {
                var dataLen = data.length;
                // Ordered data is given explicitly like
                // [[1, 0.2], [2, 0.3], [3, 0.15]]
                // Pick the category
                if (data[0] && data[0].length > 1 && categories.length > dataLen) {
                    nameList = [];
                    for (var i = 0; i < dataLen; i++) {
                        nameList[i] = categories[data[i][0]];
                    }
                }
                else {
                    nameList = categories.slice();
                }
            }
        }

        var list = new List(dimensions, seriesModel);

        list.initData(data, nameList);

        return list;
    };

});