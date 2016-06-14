define(function(require) {
    'use strict';

    var List = require('../../data/List');
    var completeDimensions = require('../../data/helper/completeDimensions');
    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');
    var CoordinateSystem = require('../../CoordinateSystem');
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

        if (__DEV__) {
            if (!zrUtil.isArray(data)) {
                throw new Error('Invalid data.');
            }
        }

        var coordSysName = seriesModel.get('coordinateSystem');
        var creator = creators[coordSysName];
        var registeredCoordSys = CoordinateSystem.get(coordSysName);
        // FIXME
        var result = creator && creator(data, seriesModel, ecModel);
        var dimensions = result && result.dimensions;
        if (!dimensions) {
            // Get dimensions from registered coordinate system
            dimensions = (registeredCoordSys && registeredCoordSys.dimensions) || ['x', 'y'];
            dimensions = completeDimensions(dimensions, data, dimensions.concat(['value']));
        }
        var categoryAxisModel = result && result.categoryAxisModel;
        var categories;

        var categoryDimIndex = dimensions[0].type === 'ordinal'
            ? 0 : (dimensions[1].type === 'ordinal' ? 1 : -1);

        var list = new List(dimensions, seriesModel);

        var nameList = createNameList(result, data);

        var dimValueGetter = (categoryAxisModel && ifNeedCompleteOrdinalData(data))
            ? function (itemOpt, dimName, dataIndex, dimIndex) {
                // If any dataItem is like { value: 10 }
                if (modelUtil.isDataItemOption(itemOpt)) {
                    list.hasItemOption = true;
                }

                // Use dataIndex as ordinal value in categoryAxis
                return dimIndex === categoryDimIndex
                    ? dataIndex
                    : converDataValue(getDataItemValue(itemOpt), dimensions[dimIndex]);
            }
            : function (itemOpt, dimName, dataIndex, dimIndex) {
                var value = getDataItemValue(itemOpt);
                var val = converDataValue(value && value[dimIndex], dimensions[dimIndex]);
                // If any dataItem is like { value: 10 }
                if (modelUtil.isDataItemOption(itemOpt)) {
                    list.hasItemOption = true;
                }

                if (categoryDimIndex === dimIndex) {
                    // If given value is a category string
                    if (typeof val === 'string') {
                        // Lazy get categories
                        categories = categories || categoryAxisModel.getCategories();
                        val = zrUtil.indexOf(categories, val);
                        if (val < 0 && !isNaN(val)) {
                            // In case some one write '1', '2' istead of 1, 2
                            val = +val;
                        }
                    }
                }
                return val;
            };

        list.hasItemOption = false;
        list.initData(data, nameList, dimValueGetter);

        return list;
    }

    function isStackable(axisType) {
        return axisType !== 'category' && axisType !== 'time';
    }

    function getDimTypeByAxis(axisType) {
        return axisType === 'category'
            ? 'ordinal'
            : axisType === 'time'
            ? 'time'
            : 'float';
    }

    /**
     * Creaters for each coord system.
     * @return {Object} {dimensions, categoryAxisModel};
     */
    var creators = {

        cartesian2d: function (data, seriesModel, ecModel) {
            var xAxisModel = ecModel.getComponent('xAxis', seriesModel.get('xAxisIndex'));
            var yAxisModel = ecModel.getComponent('yAxis', seriesModel.get('yAxisIndex'));

            if (__DEV__) {
                if (!xAxisModel) {
                    throw new Error('xAxis "' + seriesModel.get('xAxisIndex') + '" not found');
                }
                if (!yAxisModel) {
                    throw new Error('yAxis "' + seriesModel.get('yAxisIndex') + '" not found');
                }
            }

            var xAxisType = xAxisModel.get('type');
            var yAxisType = yAxisModel.get('type');

            var dimensions = [
                {
                    name: 'x',
                    type: getDimTypeByAxis(xAxisType),
                    stackable: isStackable(xAxisType)
                },
                {
                    name: 'y',
                    // If two category axes
                    type: getDimTypeByAxis(yAxisType),
                    stackable: isStackable(yAxisType)
                }
            ];

            var isXAxisCateogry = xAxisType === 'category';

            completeDimensions(dimensions, data, ['x', 'y', 'z']);

            return {
                dimensions: dimensions,
                categoryIndex: isXAxisCateogry ? 0 : 1,
                categoryAxisModel: isXAxisCateogry
                    ? xAxisModel
                    : (yAxisType === 'category' ? yAxisModel : null)
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

            if (__DEV__) {
                if (!angleAxisModel) {
                    throw new Error('angleAxis option not found');
                }
                if (!radiusAxisModel) {
                    throw new Error('radiusAxis option not found');
                }
            }

            var radiusAxisType = radiusAxisModel.get('type');
            var angleAxisType = angleAxisModel.get('type');

            var dimensions = [
                {
                    name: 'radius',
                    type: getDimTypeByAxis(radiusAxisType),
                    stackable: isStackable(radiusAxisType)
                },
                {
                    name: 'angle',
                    type: getDimTypeByAxis(angleAxisType),
                    stackable: isStackable(angleAxisType)
                }
            ];
            var isAngleAxisCateogry = angleAxisType === 'category';

            completeDimensions(dimensions, data, ['radius', 'angle', 'value']);

            return {
                dimensions: dimensions,
                categoryIndex: isAngleAxisCateogry ? 1 : 0,
                categoryAxisModel: isAngleAxisCateogry
                    ? angleAxisModel
                    : (radiusAxisType === 'category' ? radiusAxisModel : null)
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

        if (result && result.categoryAxisModel) {
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
                        nameList[i] = categories[data[i][result.categoryIndex || 0]];
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