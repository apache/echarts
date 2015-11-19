define(function(require) {
    'use strict';

    var List = require('../../data/List');
    var completeDimensions = require('../../data/helper/completeDimensions');

    /**
     * Helper function to create a list from option data
     */
    function createListFromArray(data, seriesModel, ecModel) {
        // If data is undefined
        data = data || [];

        var result = creaters[seriesModel.get('coordinateSystem')](
            data, seriesModel, ecModel
        );

        var list = new List(result.dimensions, seriesModel);

        var nameList = createNameList(result, data);

        list.initData(data, nameList);

        return list;
    }

    /**
     * Creaters for each coord system.
     * @return {Object} {dimensions, categoryAxisModel};
     */
    var creaters = {

        cartesian2d: function (data, seriesModel, ecModel) {
            var dimensions = [];
            var categoryAxisModel;
            var xAxisModel = ecModel.getComponent('xAxis', seriesModel.get('xAxisIndex'));
            var yAxisModel = ecModel.getComponent('yAxis', seriesModel.get('yAxisIndex'));
            var xAxisType = xAxisModel.get('type');
            var yAxisType = yAxisModel.get('type');
            var isYAxisCategory = yAxisType === 'category';
            if (xAxisType === 'category') {
                dimensions = [{
                    name: 'x',
                    type: 'ordinal'
                }, {
                    name: 'y',
                    // If two category axes
                    type: isYAxisCategory ? 'ordinal' : 'number',
                    stackable: !isYAxisCategory
                }];

                categoryAxisModel = xAxisModel;
            }
            else if (isYAxisCategory) {
                dimensions = [{
                    name: 'y',
                    type: 'ordinal'
                }, {
                    name: 'x',
                    stackable: true
                }];

                categoryAxisModel = yAxisModel;
            }

            completeDimensions(dimensions, data, ['x', 'y', 'z']);

            return {dimensions: dimensions, categoryAxisModel: categoryAxisModel};
        },

        polar: function (data, seriesModel, ecModel) {
            var dimensions = [];
            var categoryAxisModel;
            var axisFinder = function (axisModel) {
                return axisModel.get('polarIndex') === polarIndex;
            };
            var polarIndex = seriesModel.get('polarIndex') || 0;
            var angleAxisModel = ecModel.findComponent('angleAxis', axisFinder);
            var radiusAxisModel = ecModel.findComponent('radiusAxis', axisFinder);

            var isRadiusAxisCategory = radiusAxisModel.get('type') === 'category';
            if (angleAxisModel.get('type') === 'category') {
                dimensions = [{
                    name: 'angle',
                    type: 'ordinal'
                }, {
                    name: 'radius',
                    // If two category axes
                    type: isRadiusAxisCategory ? 'ordinal' : 'number',
                    stackable: !isRadiusAxisCategory
                }];

                categoryAxisModel = angleAxisModel;
            }
            else if (isRadiusAxisCategory) {
                dimensions = [{
                    name: 'radius',
                    type: 'ordinal'
                }, {
                    name: 'angle',
                    stackable: true
                }];

                categoryAxisModel = radiusAxisModel;
            }

            completeDimensions(dimensions, data, ['radius', 'angle', 'value']);

            return {dimensions: dimensions, categoryAxisModel: categoryAxisModel};
        },

        geo: function (data, seriesModel, ecModel) {
            // TODO Region
            // 多个散点图系列在同一个地区的时候
            return {
                dimensions: [
                    {name: 'lon'},
                    {name: 'lat'},
                    {name: 'value'}
                ]
            };
        }
    };

    function createNameList(result, data) {
        var nameList = [];

        if (result.categoryAxisModel) {
            // FIXME Two category axis
            var categories = result.categoryAxisModel.getCategories();
            if (categories) {
                var dataLen = data.length;
                // Ordered data is given explicitly like
                // [[1, 0.2], [2, 0.3], [3, 0.15]]
                // Pick the category
                if (data[0] && data[0].length > 1 && categories.length > dataLen) {
                    nameList = [];
                    for (var i = 0; i < dataLen; i++) {
                        nameList[i] = categories[i];
                    }
                }
                else {
                    nameList = categories.slice(0);
                }
            }
        }

        return nameList;
    }

    return createListFromArray;

});