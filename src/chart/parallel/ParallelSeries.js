define(function(require) {

    var List = require('../../data/List');
    var zrUtil = require('zrender/core/util');
    var SeriesModel = require('../../model/Series');
    var completeDimensions = require('../../data/helper/completeDimensions');

    return SeriesModel.extend({

        type: 'series.parallel',

        dependencies: ['parallel'],

        getInitialData: function (option, ecModel) {
            var parallelModel = ecModel.getComponent(
                'parallel', this.get('parallelIndex')
            );
            var parallelAxisIndices = parallelModel.parallelAxisIndex;

            var rawData = option.data;
            var modelDims = parallelModel.dimensions;

            var dataDims = generateDataDims(modelDims, rawData);

            var dataDimsInfo = zrUtil.map(dataDims, function (dim, dimIndex) {

                var modelDimsIndex = zrUtil.indexOf(dim, modelDims);
                var axisModel = modelDimsIndex >= 0 && ecModel.getComponent(
                    'parallelAxis', parallelAxisIndices[modelDimsIndex]
                );

                if (axisModel && axisModel.get('type') === 'category') {
                    translateCategoryValue(axisModel, dim, rawData);
                    return {name: dim, type: 'ordinal'};
                }
                else if (modelDimsIndex < 0) {
                    return completeDimensions.guessOrdinal(rawData, dimIndex)
                        ? {name: dim, type: 'ordinal'}
                        : dim;
                }
                else {
                    return dim;
                }
            });

            var list = new List(dataDimsInfo, this);
            list.initData(rawData);

            // Anication is forbiden in progressive data mode.
            if (this.option.progressive) {
                this.option.animation = false;
            }

            return list;
        },

        /**
         * User can get data raw indices on 'axisAreaSelected' event received.
         *
         * @public
         * @param {string} activeState 'active' or 'inactive' or 'normal'
         * @return {Array.<number>} Raw indices
         */
        getRawIndicesByActiveState: function (activeState) {
            var coordSys = this.coordinateSystem;
            var data = this.getData();
            var indices = [];

            coordSys.eachActiveState(data, function (theActiveState, dataIndex) {
                if (activeState === theActiveState) {
                    indices.push(data.getRawIndex(dataIndex));
                }
            });

            return indices;
        },

        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 2,                       // 二级层叠

            coordinateSystem: 'parallel',
            parallelIndex: 0,

            label: {
                normal: {
                    show: false
                },
                emphasis: {
                    show: false
                }
            },

            inactiveOpacity: 0.05,
            activeOpacity: 1,

            lineStyle: {
                normal: {
                    width: 2,
                    opacity: 0.45,
                    type: 'solid'
                }
            },
            progressive: false, // 100
            smooth: false,

            animationEasing: 'linear'
        }
    });

    function translateCategoryValue(axisModel, dim, rawData) {
        var axisData = axisModel.get('data');
        var numberDim = convertDimNameToNumber(dim);

        if (axisData && axisData.length) {
            zrUtil.each(rawData, function (dataItem) {
                if (!dataItem) {
                    return;
                }
                // FIXME
                // time consuming, should use hash?
                var index = zrUtil.indexOf(axisData, dataItem[numberDim]);
                dataItem[numberDim] = index >= 0 ? index : NaN;
            });
        }
        // FIXME
        // 如果没有设置axis data, 应自动算出，或者提示。
    }

    function convertDimNameToNumber(dimName) {
        return +dimName.replace('dim', '');
    }

    function generateDataDims(modelDims, rawData) {
        // parallelModel.dimension should not be regarded as data
        // dimensions. Consider dimensions = ['dim4', 'dim2', 'dim6'];

        // We detect max dim by parallelModel.dimensions and fist
        // item in rawData arbitrarily.
        var maxDimNum = 0;
        zrUtil.each(modelDims, function (dimName) {
            var numberDim = convertDimNameToNumber(dimName);
            numberDim > maxDimNum && (maxDimNum = numberDim);
        });

        var firstItem = rawData[0];
        if (firstItem && firstItem.length - 1 > maxDimNum) {
            maxDimNum = firstItem.length - 1;
        }

        var dataDims = [];
        for (var i = 0; i <= maxDimNum; i++) {
            dataDims.push('dim' + i);
        }

        return dataDims;
    }
});