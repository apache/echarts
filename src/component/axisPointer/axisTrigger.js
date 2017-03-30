define(function(require) {

    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');
    var modelHelper = require('./modelHelper');
    var findPointFromSeries = require('./findPointFromSeries');

    var each = zrUtil.each;
    var curry = zrUtil.curry;
    var get = modelUtil.makeGetter();

    /**
     * Basic logic: check all axis, if they do not demand show/highlight,
     * then hide/downplay them.
     *
     * @param {Object} coordSysAxesInfo
     * @param {string} currTrigger 'click' | 'mousemove' | 'leave'
     * @param {Object} finder {x, y, xAxisId: ...[], yAxisName: ...[], angleAxisIndex: ...[]}
     *              x and y, which are mandatory, specify a point to tigger axisPointer and tooltip.
     *              other properties, which are optional, restrict target axes.
     * @param {Function} dispatchAction
     * @param {module:echarts/ExtensionAPI} api
     * @param {Object} tooltipOption
     * @param {string} [highDownKey]
     * @return {Object} content of event obj for echarts.connect.
     */
    function axisTrigger(
        coordSysAxesInfo, currTrigger, finder, dispatchAction,
        ecModel, api, tooltipOption, highDownKey
    ) {
        var point = [];
        if (finder.x != null && finder.y != null) {
            point = [finder.x, finder.y];
        }
        else {
            point = findPointFromSeries({
                seriesIndex: finder.seriesIndex,
                // Do not use dataIndexInside from other ec instance.
                // FIXME: auto detect it?
                dataIndex: finder.dataIndex
            }, ecModel).point;
        }

        var axesInfo = coordSysAxesInfo.axesInfo;
        var shouldHide = currTrigger === 'leave' || illegalPoint(point);
        var outputFinder = {};

        var showValueMap = {};
        var dataByCoordSys = {list: [], map: {}};
        var highlightBatch = [];
        var updaters = {
            showPointer: curry(showPointer, showValueMap),
            showTooltip: curry(showTooltip, dataByCoordSys),
            highlight: curry(highlight, highlightBatch)
        };

        // Process for triggered axes.
        each(coordSysAxesInfo.coordSysMap, function (coordSys, coordSysKey) {
            var coordSysContainsPoint = coordSys.containPoint(point);

            each(coordSysAxesInfo.coordSysAxesInfo[coordSysKey], function (axisInfo, key) {
                var axis = axisInfo.axis;
                if (!shouldHide && coordSysContainsPoint && !notTargetAxis(finder, axis)) {
                    processOnAxis(axisInfo, axis.pointToData(point), updaters, false, outputFinder);
                }
            });
        });

        // Process for linked axes.
        each(axesInfo, function (tarAxisInfo, tarKey) {
            var linkGroup = tarAxisInfo.linkGroup;

            // If axis has been triggered in the previous stage, it should not be triggered by link.
            linkGroup && !showValueMap[tarKey] && each(linkGroup.axesInfo, function (srcAxisInfo, srcKey) {
                var srcValItem = showValueMap[srcKey];
                // If srcValItem exist, source axis is triggered, so link to target axis.
                if (srcAxisInfo !== tarAxisInfo && srcValItem) {
                    var val = srcValItem.value;
                    linkGroup.mapper && (val = tarAxisInfo.axis.scale.parse(linkGroup.mapper(
                        val, makeMapperParam(srcAxisInfo), makeMapperParam(tarAxisInfo)
                    )));
                    processOnAxis(tarAxisInfo, val, updaters, true, outputFinder);
                }
            });
        });

        updateModelActually(showValueMap, axesInfo);
        dispatchTooltipActually(dataByCoordSys, point, tooltipOption, dispatchAction);
        dispatchHighDownActually(highlightBatch, dispatchAction, api, highDownKey);

        return outputFinder;
    }

    function processOnAxis(axisInfo, newValue, updaters, dontSnap, outputFinder) {
        var axis = axisInfo.axis;

        if (axis.scale.isBlank() || !axis.containData(newValue)) {
            return;
        }

        if (!axisInfo.involveSeries) {
            updaters.showPointer(axisInfo, newValue);
            return;
        }

        // Heavy calculation. So put it after axis.containData checking.
        var payloadInfo = buildPayloadsBySeries(newValue, axisInfo);
        var payloadBatch = payloadInfo.payloadBatch;
        var snapToValue = payloadInfo.snapToValue;

        // Fill content of event obj for echarts.connect.
        // By defualt use the first involved series data as a sample to connect.
        if (payloadBatch[0] && outputFinder.seriesIndex == null) {
            zrUtil.extend(outputFinder, payloadBatch[0]);
        }

        // If no linkSource input, this process is for collecting link
        // target, where snap should not be accepted.
        if (!dontSnap && axisInfo.snap) {
            if (axis.containData(snapToValue) && snapToValue != null) {
                newValue = snapToValue;
            }
        }

        updaters.highlight('highlight', payloadBatch);
        updaters.showPointer(axisInfo, newValue, payloadBatch);
        // Tooltip should always be snapToValue, otherwise there will be
        // incorrect "axis value ~ series value" mapping displayed in tooltip.
        updaters.showTooltip(axisInfo, payloadInfo, snapToValue);
    }

    function buildPayloadsBySeries(value, axisInfo) {
        var axis = axisInfo.axis;
        var dim = axis.dim;
        var snapToValue = value;
        var payloadBatch = [];
        var minDist = Number.MAX_VALUE;
        var minDiff = -1;

        each(axisInfo.seriesModels, function (series, idx) {
            var dataDim = series.coordDimToDataDim(dim);
            var seriesNestestValue;
            var dataIndices;

            if (series.getAxisTooltipData) {
                var result = series.getAxisTooltipData(dataDim, value, axis);
                dataIndices = result.dataIndices;
                seriesNestestValue = result.nestestValue;
            }
            else {
                dataIndices = series.getData().indexOfNearest(
                    dataDim[0],
                    value,
                    // Add a threshold to avoid find the wrong dataIndex
                    // when data length is not same.
                    false, axis.type === 'category' ? 0.5 : null
                );
                if (!dataIndices.length) {
                    return;
                }
                seriesNestestValue = series.getData().get(dataDim[0], dataIndices[0]);
            }

            if (seriesNestestValue == null || !isFinite(seriesNestestValue)) {
                return;
            }

            var diff = value - seriesNestestValue;
            var dist = Math.abs(diff);
            // Consider category case
            if (dist <= minDist) {
                if (dist < minDist || (diff >= 0 && minDiff < 0)) {
                    minDist = dist;
                    minDiff = diff;
                    snapToValue = seriesNestestValue;
                    payloadBatch.length = 0;
                }
                each(dataIndices, function (dataIndex) {
                    payloadBatch.push({
                        seriesIndex: series.seriesIndex,
                        dataIndexInside: dataIndex,
                        dataIndex: series.getData().getRawIndex(dataIndex)
                    });
                });
            }
        });

        return {
            payloadBatch: payloadBatch,
            snapToValue: snapToValue
        };
    }

    function showPointer(showValueMap, axisInfo, value, payloadBatch) {
        showValueMap[axisInfo.key] = {value: value, payloadBatch: payloadBatch};
    }

    function showTooltip(dataByCoordSys, axisInfo, payloadInfo, value) {
        var payloadBatch = payloadInfo.payloadBatch;
        var axis = axisInfo.axis;
        var axisModel = axis.model;
        var axisPointerModel = axisInfo.axisPointerModel;

        // If no data, do not create anything in dataByCoordSys,
        // whose length will be used to judge whether dispatch action.
        if (!axisInfo.triggerTooltip || !payloadBatch.length) {
            return;
        }

        var coordSysModel = axisInfo.coordSys.model;
        var coordSysKey = modelHelper.makeKey(coordSysModel);
        var coordSysItem = dataByCoordSys.map[coordSysKey];
        if (!coordSysItem) {
            coordSysItem = dataByCoordSys.map[coordSysKey] = {
                coordSysId: coordSysModel.id,
                coordSysIndex: coordSysModel.componentIndex,
                coordSysType: coordSysModel.type,
                coordSysMainType: coordSysModel.mainType,
                dataByAxis: []
            };
            dataByCoordSys.list.push(coordSysItem);
        }

        coordSysItem.dataByAxis.push({
            axisDim: axis.dim,
            axisIndex: axisModel.componentIndex,
            axisType: axisModel.type,
            axisId: axisModel.id,
            value: value,
            // Caustion: viewHelper.getValueLabel is actually on "view stage", which
            // depends that all models have been updated. So it should not be performed
            // here. Considering axisPointerModel used here is volatile, which is hard
            // to be retrieve in TooltipView, we prepare parameters here.
            valueLabelOpt: {
                precision: axisPointerModel.get('label.precision'),
                formatter: axisPointerModel.get('label.formatter')
            },
            seriesDataIndices: payloadBatch.slice()
        });
    }

    function highlight(highlightBatch, actionType, batch) {
        highlightBatch.push.apply(highlightBatch, batch);
    }

    function updateModelActually(showValueMap, axesInfo) {
        // Basic logic: If no 'show' required, 'hide' this axisPointer.
        each(axesInfo, function (axisInfo, key) {
            var option = axisInfo.axisPointerModel.option;
            var valItem = showValueMap[key];

            if (valItem) {
                !axisInfo.useHandle && (option.status = 'show');
                option.value = valItem.value;
                // For label formatter param.
                option.seriesDataIndices = (valItem.payloadBatch || []).slice();
            }
            // When always show (e.g., handle used), remain
            // original value and status.
            else {
                // If hide, value still need to be set, consider
                // click legend to toggle axis blank.
                !axisInfo.useHandle && (option.status = 'hide');
            }
        });
    }

    function dispatchTooltipActually(dataByCoordSys, point, tooltipOption, dispatchAction) {
        // Basic logic: If no showTip required, hideTip will be dispatched.
        if (illegalPoint(point) || !dataByCoordSys.list.length) {
            dispatchAction({type: 'hideTip'});
            return;
        }

        // In most case only one axis (or event one series is used). It is
        // convinient to fetch payload.seriesIndex and payload.dataIndex
        // dirtectly. So put the first seriesIndex and dataIndex of the first
        // axis on the payload.
        var sampleItem = ((dataByCoordSys.list[0].dataByAxis[0] || {}).seriesDataIndices || [])[0] || {};

        dispatchAction({
            type: 'showTip',
            escapeConnect: true,
            x: point[0],
            y: point[1],
            tooltipOption: tooltipOption,
            dataIndexInside: sampleItem.dataIndexInside,
            dataIndex: sampleItem.dataIndex,
            seriesIndex: sampleItem.seriesIndex,
            dataByCoordSys: dataByCoordSys.list
        });
    }

    function dispatchHighDownActually(highlightBatch, dispatchAction, api, highDownKey) {
        // Basic logic: If nothing highlighted, should downplay all highlighted items.
        // This case will occur when mouse leave coordSys.

        // FIXME
        // (1) highlight status shoule be managemented in series.getData()?
        // (2) If axisPointer A triggerOn 'handle' and axisPointer B triggerOn
        // 'mousemove', items highlighted by A will be downplayed by B.
        // It will not be fixed until someone requires this scenario.

        // Consider items area hightlighted by 'handle', and globalListener may
        // downplay all items (including just highlighted ones) when mousemove.
        // So we use a highDownKey to separate them as a temporary solution.
        var zr = api.getZr();
        highDownKey = 'lastHighlights' + (highDownKey || '');
        var lastHighlights = get(zr)[highDownKey] || {};
        var newHighlights = get(zr)[highDownKey] = {};

        // Build hash map and remove duplicate incidentally.
        zrUtil.each(highlightBatch, function (batchItem) {
            var key = batchItem.seriesIndex + ' | ' + batchItem.dataIndex;
            newHighlights[key] = batchItem;
        });

        // Diff.
        var toHighlight = [];
        var toDownplay = [];
        zrUtil.each(lastHighlights, function (batchItem, key) {
            !newHighlights[key] && toDownplay.push(batchItem);
        });
        zrUtil.each(newHighlights, function (batchItem, key) {
            !lastHighlights[key] && toHighlight.push(batchItem);
        });

        toDownplay.length && api.dispatchAction({
            type: 'downplay', escapeConnect: true, batch: toDownplay
        });
        toHighlight.length && api.dispatchAction({
            type: 'highlight', escapeConnect: true, batch: toHighlight
        });
    }

    function notTargetAxis(finder, axis) {
        var isTarget = 1;
        // If none of xxxAxisId and xxxAxisName and xxxAxisIndex exists in finder,
        // no axis is not target axis.
        each(finder, function (value, propName) {
            isTarget &= !(/^.+(AxisId|AxisName|AxisIndex)$/.test(propName));
        });
        !isTarget && each(
            [['AxisId', 'id'], ['AxisIndex', 'componentIndex'], ['AxisName', 'name']],
            function (prop) {
                var vals = modelUtil.normalizeToArray(finder[axis.dim + prop[0]]);
                isTarget |= zrUtil.indexOf(vals, axis.model[prop[1]]) >= 0;
            }
        );
        return !isTarget;
    }

    function makeMapperParam(axisInfo) {
        var axisModel = axisInfo.axis.model;
        var item = {};
        var dim = item.axisDim = axisInfo.axis.dim;
        item.axisIndex = item[dim + 'AxisIndex'] = axisModel.componentIndex;
        item.axisName = item[dim + 'AxisName'] = axisModel.name;
        item.axisId = item[dim + 'AxisId'] = axisModel.id;
        return item;
    }

    function illegalPoint(point) {
        return point[0] == null || isNaN(point[0]) || point[1] == null || isNaN(point[1]);
    }

    return axisTrigger;
});