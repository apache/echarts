/**
 * @file Data range visual coding.
 */
define(function (require) {

    var echarts = require('../../echarts');
    var visualSolution = require('../../visual/visualSolution');
    var zrUtil = require('zrender/core/util');
    var BoundingRect = require('zrender/core/BoundingRect');
    var selector = require('./selector');
    var throttle = require('../../util/throttle');

    var STATE_LIST = ['inBrush', 'outOfBrush'];
    var DISPATCH_METHOD = '__ecBrushSelect';
    var DISPATCH_FLAG = '__ecInBrushSelectEvent';

    /**
     * Register the visual encoding if this modules required.
     */
    echarts.registerVisual(echarts.PRIORITY.VISUAL.BRUSH, function (ecModel, api, payload) {

        var brushSelected = [];
        var throttleType;
        var throttleDelay;

        ecModel.eachComponent({mainType: 'brush'}, function (brushModel, brushIndex) {

            var brushOption = brushModel.option;
            var brushLink = brushOption.brushLink;
            var linkedSeriesMap = [];
            var selectedDataIndexForLink = [];
            var rangeInfoBySeries = [];

            if (!brushIndex) { // Only the first throttle setting works.
                throttleType = brushOption.throttleType;
                throttleDelay = brushOption.throttleDelay;
            }

            var thisBrushSelected = {
                brushId: brushModel.id,
                brushIndex: brushIndex,
                brushName: brushModel.name,
                brushRanges: zrUtil.clone(brushModel.brushRanges),
                series: []
            };
            brushSelected.push(thisBrushSelected);

            // Add boundingRect and selectors to range.
            var brushRanges = zrUtil.map(brushModel.brushRanges, function (brushRange) {
                return bindSelector(
                    zrUtil.extend(
                        {boundingRect: boundingRectBuilders[brushRange.brushType](brushRange)},
                        brushRange
                    )
                );
            });

            var visualMappings = visualSolution.createVisualMappings(
                brushModel.option, STATE_LIST, function (mappingOption) {
                    mappingOption.mappingMethod = 'fixed';
                }
            );

            zrUtil.isArray(brushLink) && zrUtil.each(brushLink, function (seriesIndex) {
                linkedSeriesMap[seriesIndex] = 1;
            });

            function useLink(seriesIndex) {
                return brushLink === 'all' || linkedSeriesMap[seriesIndex];
            }

            ecModel.eachSeries(function (seriesModel, seriesIndex) {
                var selectorsByBrushType = getSelectorsByBrushType(seriesModel);
                if (!selectorsByBrushType || isNotControlledSeries(brushModel, seriesIndex)) {
                    return;
                }
                var rangeInfoList = rangeInfoBySeries[seriesIndex] = [];

                zrUtil.each(brushRanges, function (brushRange) {
                    selectorsByBrushType[brushRange.brushType] && rangeInfoList.push(brushRange);
                });

                if (useLink(seriesIndex)) {
                    var data = seriesModel.getData();
                    rangeInfoList.length && data.each(function (dataIndex) {
                        if (checkInRange(selectorsByBrushType, rangeInfoList, data, dataIndex)) {
                            selectedDataIndexForLink[dataIndex] = 1;
                        }
                    });
                }
            });

            ecModel.eachSeries(function (seriesModel, seriesIndex) {
                var selectorsByBrushType = getSelectorsByBrushType(seriesModel);
                if (!selectorsByBrushType || isNotControlledSeries(brushModel, seriesIndex)) {
                    return;
                }
                var data = seriesModel.getData();
                var rangeInfoList = rangeInfoBySeries[seriesIndex];
                var getValueState = useLink(seriesIndex)
                    ? function (dataIndex) {
                        return selectedDataIndexForLink[dataIndex]
                            ? (seriesBrushSelected.rawIndices.push(data.getRawIndex(dataIndex)), 'inBrush')
                            : 'outOfBrush';
                    }
                    : function (dataIndex) {
                        return checkInRange(selectorsByBrushType, rangeInfoList, data, dataIndex)
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
                rangeInfoList.length && visualSolution.applyVisual(
                    STATE_LIST, visualMappings, data, getValueState
                );
            });

        });

        dispatchAction(api, throttleType, throttleDelay, brushSelected);
    });

    function dispatchAction(api, throttleType, throttleDelay, brushSelected) {
        // This event is always triggered, rather than triggered only when selected
        // changed. The latter way might help user to reduce unnecessary view update
        // in listener of this event and improve performance, but sometimes it is not
        // obvious (always has changes when data dense), and probably it is difficult
        // to diff the selected data precisely only by dataIndex records. For
        // example, considering this event will be triggered when setOption called,
        // user may change values in series.data, but keep dataIndex the same. So
        // the diff work is left to user, if it is necessary.
        var zr = api.getZr();
        if (zr[DISPATCH_FLAG]) {
            return;
        }

        if (!zr[DISPATCH_METHOD]) {
            zr[DISPATCH_METHOD] = doDispatch;
        }

        var fn = throttle.createOrUpdate(zr, DISPATCH_METHOD, throttleDelay, throttleType);
        // If throttleDelay is 0 or null or undefined, dispatchAction will also be
        // called asynchronously, otherwise break the rule that main process should
        // not be nested.
        setTimeout(function () {
            fn(api, brushSelected);
        }, 0);
    }

    function doDispatch(api, brushSelected) {
        if (!api.isDisposed()) {
            var zr = api.getZr();
            zr[DISPATCH_FLAG] = true;
            api.dispatchAction({type: 'brushSelect', brushComponents: brushSelected});
            zr[DISPATCH_FLAG] = false;
        }
    }

    function checkInRange(selectorsByBrushType, rangeInfoList, data, dataIndex) {
        var itemLayout = data.getItemLayout(dataIndex);
        for (var i = 0, len = rangeInfoList.length; i < len; i++) {
            var brushRange = rangeInfoList[i];
            if (selectorsByBrushType[brushRange.brushType](
                itemLayout, brushRange.selectors, brushRange
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

    function isNotControlledSeries(brushModel, seriesIndex) {
        var seriesIndices = brushModel.option.seriesIndex;
        return seriesIndices != null
            && seriesIndices !== 'all'
            && (
                zrUtil.isArray(seriesIndices)
                ? zrUtil.indexOf(seriesIndices, seriesIndex) < 0
                : seriesIndex !== seriesIndices
            );
    }

    function bindSelector(brushRange) {
        var selectors = brushRange.selectors = {};
        zrUtil.each(selector[brushRange.brushType], function (selFn, elType) {
            // Do not use function binding or curry for performance.
            selectors[elType] = function (itemLayout) {
                return selFn(itemLayout, selectors, brushRange);
            };
        });
        return brushRange;
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
