/**
 * @file Data range visual coding.
 */
define(function (require) {

    var echarts = require('../../echarts');
    var visualSolution = require('../../visual/visualSolution');
    var zrUtil = require('zrender/core/util');
    var BoundingRect = require('zrender/core/BoundingRect');
    var selector = require('./selector');

    var STATE_LIST = ['inBrush', 'outOfBrush'];

    /**
     * Register the visual encoding if this modules required.
     */
    echarts.registerVisual(echarts.PRIORITY.VISUAL.BRUSH, function (ecModel, api, payload) {

        var brushSelected = [];

        ecModel.eachComponent({mainType: 'brush'}, function (brushModel, brushIndex) {

            var brushRanges = brushModel.brushRanges;
            var brushLink = brushModel.option.brushLink;
            var linkedSeriesMap = [];
            var selectedDataIndexForLink = [];
            var rangeInfo = [];

            var thisBrushSelected = {
                brushId: brushModel.id,
                brushIndex: brushIndex,
                brushName: brushModel.name,
                series: []
            };
            brushSelected.push(thisBrushSelected);

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
                var selectorsByBrushType = getSelectorsByBrushType(seriesModel);
                if (!selectorsByBrushType) {
                    return;
                }
                var rInfo = rangeInfo[seriesIndex] = {ranges: [], boundingRects: []};

                zrUtil.each(brushRanges, function (brushRange) {
                    var brushType = brushRange.brushType
                    if (selectorsByBrushType[brushType]) {
                        rInfo.ranges.push(brushRange);
                        rInfo.boundingRects.push(boundingRectBuilders[brushType](brushRange));
                    }
                });

                if (useLink(seriesIndex)) {
                    var data = seriesModel.getData();
                    rInfo.ranges.length && data.each(function (dataIndex) {
                        if (checkInRange(selectorsByBrushType, rInfo, data, dataIndex)) {
                            selectedDataIndexForLink[dataIndex] = 1;
                        }
                    });
                }
            });

            ecModel.eachSeries(function (seriesModel, seriesIndex) {
                var selectorsByBrushType = getSelectorsByBrushType(seriesModel);
                if (!selectorsByBrushType) {
                    return;
                }
                var data = seriesModel.getData();
                var rInfo = rangeInfo[seriesIndex];
                var getValueState = useLink(seriesIndex)
                    ? function (dataIndex) {
                        return selectedDataIndexForLink[dataIndex]
                            ? (seriesBrushSelected.rawIndices.push(data.getRawIndex(dataIndex)), 'inBrush')
                            : 'outOfBrush';
                    }
                    : function (dataIndex) {
                        return checkInRange(selectorsByBrushType, rInfo, data, dataIndex)
                            ? (seriesBrushSelected.rawIndices.push(data.getRawIndex(dataIndex)), 'inBrush')
                            : 'outOfBrush';
                    };

                var seriesBrushSelected = {
                    seriesId: seriesModel.id,
                    seriesIndex: seriesIndex,
                    seriesName: seriesModel.name,
                    rawIndices: []
                };
                thisBrushSelected.series.push(seriesBrushSelected);

                // If no supported brush, all visuals are in original state.
                rInfo.ranges.length && visualSolution.applyVisual(
                    STATE_LIST, visualMappings, data, getValueState
                );
            });

        });

        api.prepareExtraEvent({
            type: 'brushSelected',
            brushComponents: brushSelected
        });
    });

    function checkInRange(selectorsByBrushType, rInfo, data, dataIndex) {
        var itemLayout = data.getItemLayout(dataIndex);
        for (var i = 0, len = rInfo.ranges.length; i < len; i++) {
            var brushType = rInfo.ranges[i].brushType;
            if (selectorsByBrushType[brushType](
                itemLayout, rInfo.ranges[i], rInfo.boundingRects[i], selector[brushType]
            )) {
                return true;
            }
        }
    }

    function getSelectorsByBrushType(seriesModel) {
        var brushSelector = seriesModel.brushSelector;
        if (zrUtil.isString(brushSelector)) {
            var sels = [];
            zrUtil.each(selector, function (selectorsByElementType, brushType) {
                sels[brushType] = selectorsByElementType[brushSelector];
            });
            return sels;
        }
        return brushSelector;
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
