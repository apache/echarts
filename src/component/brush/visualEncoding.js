/**
 * @file Brush visual coding.
 */
define(function (require) {

    var echarts = require('../../echarts');
    var visualSolution = require('../../visual/visualSolution');
    var zrUtil = require('zrender/core/util');
    var BoundingRect = require('zrender/core/BoundingRect');
    var selector = require('./selector');
    var throttle = require('../../util/throttle');
    var helper = require('./helper');

    var STATE_LIST = ['inBrush', 'outOfBrush'];
    var DISPATCH_METHOD = '__ecBrushSelect';
    var DISPATCH_FLAG = '__ecInBrushSelectEvent';
    var PRIORITY_BRUSH = echarts.PRIORITY.VISUAL.BRUSH;

    /**
     * Layout for visual, the priority higher than other layout, and before brush visual.
     */
    echarts.registerLayout(PRIORITY_BRUSH, function (ecModel, api, payload) {
        helper.convertCoordRanges(ecModel);
    });

    /**
     * Register the visual encoding if this modules required.
     */
    echarts.registerVisual(PRIORITY_BRUSH, function (ecModel, api, payload) {

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
                    zrUtil.defaults(
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

        dispatchAction(api, throttleType, throttleDelay, brushSelected, payload);
    });

    function dispatchAction(api, throttleType, throttleDelay, brushSelected, payload) {
        // This event will not be triggered when `setOpion`, otherwise dead lock may
        // triggered when do `setOption` in event listener, which we do not find
        // satisfactory way to solve yet. Some considered resolutions:
        // (a) Diff with prevoius selected data ant only trigger event when changed.
        // But store previous data and diff precisely (i.e., not only by dataIndex, but
        // also detect value changes in selected data) might bring complexity or fragility.
        // (b) Use spectial param like `silent` to suppress event triggering.
        // But such kind of volatile param may be weird in `setOption`.
        if (!payload) {
            return;
        }

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
        else if (zrUtil.isFunction(brushSelector)) {
            var bSelector = {};
            zrUtil.each(selector, function (sel, brushType) {
                bSelector[brushType] = brushSelector;
            });
            return bSelector;
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

        lineX: zrUtil.noop,

        lineY: zrUtil.noop,

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
