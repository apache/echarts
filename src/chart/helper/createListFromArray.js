define(function(require) {
    'use strict';

    var List = require('../../data/List');
    var completeDimensions = require('../../data/helper/completeDimensions');
    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');
    var getDataItemValue = modelUtil.getDataItemValue;
    var converDataValue = modelUtil.converDataValue;

    function firstDataNotNull(data) {
        var i = 0;
        while (i < data.length && data[i] == null) {
            i++;
        }
        return data[i];
    }
    function ifNeedCompleteOrdinalData(data) {
        var sampleItem = firstDataNotNull(data);
        return sampleItem != null
            && !zrUtil.isArray(getDataItemValue(sampleItem));
    }

    /**
     * Helper function to create a list from option data
     */
    function createListFromArray(data, seriesModel, ecModel) {
        // If data is undefined
        data = data || [];

        var result = creaters[seriesModel.get('coordinateSystem')](
            data, seriesModel, ecModel
        );
        var dimensions = result.dimensions;
        var categoryAxisModel = result.categoryAxisModel;

        var categoryDimIndex = dimensions[0].type === 'ordinal' ? 0
            : (dimensions[1].type === 'ordinal' ? 1 : -1);

        var list = new List(dimensions, seriesModel);

        var nameList = createNameList(result, data);

        var dimValueGetter = (categoryAxisModel && ifNeedCompleteOrdinalData(data))
            ? function (itemOpt, dimName, dataIndex, dimIndex) {
                // Use dataIndex as ordinal value in categoryAxis
                return dimIndex === categoryDimIndex
                    ? dataIndex
                    : converDataValue(getDataItemValue(itemOpt), dimensions[dimIndex]);
            }
            : function (itemOpt, dimName, dataIndex, dimIndex) {
                var val = getDataItemValue(itemOpt);
                return converDataValue(val && val[dimIndex], dimensions[dimIndex]);
            };

        list.initData(data, nameList, dimValueGetter);

        return list;
    }

    function isStackable(axisType) {
        return axisType !== 'category' && axisType !== 'time';
    }
    /**
     * Creaters for each coord system.
     * @return {Object} {dimensions, categoryAxisModel};
     */
    var creaters = {

        cartesian2d: function (data, seriesModel, ecModel) {
            var xAxisModel = ecModel.getComponent('xAxis', seriesModel.get('xAxisIndex'));
            var yAxisModel = ecModel.getComponent('yAxis', seriesModel.get('yAxisIndex'));
            var xAxisType = xAxisModel.get('type');
            var yAxisType = yAxisModel.get('type');
            var isYAxisCategory = yAxisType === 'category';
            var isXAxisCategory = xAxisType === 'category';

            var dimensions = [{
                name: 'x',
                type: isXAxisCategory ? 'ordinal' : 'float',
                stackable: isStackable(xAxisType)
            }, {
                name: 'y',
                // If two category axes
                type: isYAxisCategory ? 'ordinal' : 'float',
                stackable: isStackable(yAxisType)
            }];

            completeDimensions(dimensions, data, ['x', 'y', 'z']);

            return {
                dimensions: dimensions,
                categoryAxisModel: isXAxisCategory ? xAxisModel
                    : (isYAxisCategory ? yAxisModel : null)
            };
        },

        polar: function (data, seriesModel, ecModel) {
            var polarIndex = seriesModel.get('polarIndex') || 0;

            var axisFinder = function (axisModel) {
                return axisModel.get('polarIndex') === polarIndex;
            };

            var angleAxisModel = ecModel.findComponents({
                mainType: 'angleAxis', filter: axisFinder
            })[0];
            var radiusAxisModel = ecModel.findComponents({
                mainType: 'radiusAxis', filter: axisFinder
            })[0];

            var isRadiusAxisCategory = radiusAxisModel.get('type') === 'category';
            var isAngleAxisCategory = angleAxisModel.get('type') === 'category';
            var dimensions = [{
                name: 'radius',
                type: isRadiusAxisCategory ? 'ordinal' : 'float',
                stackable: isStackable(radiusAxisModel.get('type'))
            }, {
                name: 'angle',
                type: isAngleAxisCategory ? 'ordinal' : 'float',
                stackable: isStackable(angleAxisModel.get('type'))
            }];

            completeDimensions(dimensions, data, ['radius', 'angle', 'value']);

            return {
                dimensions: dimensions,
                categoryAxisModel: isAngleAxisCategory ? angleAxisModel
                    : (isRadiusAxisCategory ? radiusAxisModel : null)
            };
        },

        geo: function (data, seriesModel, ecModel) {
            // TODO Region
            // 多个散点图系列在同一个地区的时候
            return {
                dimensions: completeDimensions([
                    {name: 'lng'},
                    {name: 'lat'}
                ], data, ['lng', 'lat', 'value'])
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
                // [[3, 0.2], [1, 0.3], [2, 0.15]]
                // or given scatter data,
                // pick the category
                if (zrUtil.isArray(data[0]) && data[0].length > 1) {
                    nameList = [];
                    for (var i = 0; i < dataLen; i++) {
                        nameList[i] = categories[data[i][0]];
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