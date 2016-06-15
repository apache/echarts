/**
 * @file Data range visual coding.
 */
define(function (require) {

    var echarts = require('../../echarts');
    var visualSolution = require('../../visual/visualSolution');
    var zrUtil = require('zrender/core/util');
    var BoundingRect = require('zrender/core/BoundingRect');

    var STATE_LIST = ['inBrush', 'outOfBrush'];

    /**
     * Register the visual encoding if this modules required.
     */
    echarts.registerVisual(echarts.PRIORITY.VISUAL.BRUSH, function (ecModel, api, payload) {

        ecModel.eachSeries(function (seriesModel, seriesIndex) {
            seriesModel.__brushedRawIndices = [];
        });

        ecModel.eachComponent({mainType: 'brush'}, function (brushModel, brushIndex) {

            var brushRanges = brushModel.brushRanges;
            var brushLink = brushModel.option.brushLink;
            var linkedSeriesMap = [];
            var selectedDataIndexForLink = [];
            var rangeInfo = [];

            var visualMappings = visualSolution.createVisualMappings(
                brushModel.option, STATE_LIST, function (mappingOption) {
                    mappingOption.mappingMethod = 'fixed';
                }
            );

            brushLink instanceof Array && zrUtil.each(brushLink, function (seriesIndex) {
                linkedSeriesMap[seriesIndex] = 1;
            });

            function useLink(seriesIndex) {
                return brushLink === 'all' || linkedSeriesMap[seriesIndex];
            }

            ecModel.eachSeries(function (seriesModel, seriesIndex) {
                var isInBrush = seriesModel.isInBrush;
                if (!isInBrush) {
                    return;
                }
                var rInfo = rangeInfo[seriesIndex] = {ranges: [], boundingRects: []};

                zrUtil.each(brushRanges, function (brushRange) {
                    if (isInBrush[brushRange.type]) {
                        rInfo.ranges.push(brushRange);
                        rInfo.boundingRects.push(boundingRectBuilders[brushRange.type](brushRange));
                    }
                });

                if (useLink(seriesIndex)) {
                    var data = seriesModel.getData();
                    rInfo.ranges.length && data.each(function (dataIndex) {
                        if (checkInRange(isInBrush, rInfo, data, dataIndex)) {
                            selectedDataIndexForLink[dataIndex] = 1;
                        }
                    });
                }
            });

            ecModel.eachSeries(function (seriesModel, seriesIndex) {
                var isInBrush = seriesModel.isInBrush;
                if (!isInBrush) {
                    return;
                }
                var data = seriesModel.getData();
                var rInfo = rangeInfo[seriesIndex];
                var brushedRawIndices = seriesModel.__brushedRawIndices;
                var getValueState = useLink(seriesIndex)
                    ? function (dataIndex) {
                        return selectedDataIndexForLink[dataIndex]
                            ? (brushedRawIndices.push(data.getRawIndex(dataIndex)), 'inBrush')
                            : 'outOfBrush';
                    }
                    : function (dataIndex) {
                        return checkInRange(isInBrush, rInfo, data, dataIndex)
                            ? (brushedRawIndices.push(data.getRawIndex(dataIndex)), 'inBrush')
                            : 'outOfBrush';
                    };


                // If no supported brush, all visuals are in original state.
                rInfo.ranges.length && visualSolution.applyVisual(
                    STATE_LIST, visualMappings, data, getValueState
                );
            });

        });
    });

    function checkInRange(isInBrush, rInfo, data, dataIndex) {
        var itemLayout = data.getItemLayout(dataIndex);
        for (var i = 0, len = rInfo.ranges.length; i < len; i++) {
            if (isInBrush[rInfo.ranges[i].type](
                itemLayout, rInfo.ranges[i], rInfo.boundingRects[i], data, dataIndex
            )) {
                return true;
            }
        }
    }

    var boundingRectBuilders = {

        line: zrUtil.noop,

        rect: function (brushRange) {
            return getBoundingRectFromMinMax(brushRange.range);
        },

        polygon: function (brushRange) {
            var minMax;
            var range = brushRange.range;

            for (var i = 0, len = range.length; i < len; i++) {
                minMax = minMax || [[Infinity, -Infinity], [Infinity, -Infinity]];
                var rg = range[i];
                rg[0] < minMax[0][0] && (minMax[0][0] = rg[0]);
                rg[0] > minMax[0][1] && (minMax[0][1] = rg[0]);
                rg[1] < minMax[1][0] && (minMax[1][0] = rg[1]);
                rg[1] > minMax[1][1] && (minMax[1][1] = rg[1]);
            }

            return minMax && getBoundingRectFromMinMax(minMax);
        }
    };

    function getBoundingRectFromMinMax(minMax) {
        return new BoundingRect(
            minMax[0][0],
            minMax[1][0],
            minMax[0][1] - minMax[0][0],
            minMax[1][1] - minMax[1][0]
        );
    }
});
