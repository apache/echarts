define(function(require) {

    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');

    var each = zrUtil.each;
    var curry = zrUtil.curry;
    var get = modelUtil.makeGetter();

    /**
     * @param {Object} coordSysAxesInfo
     * @param {string} currTrigger 'click' | 'mousemove' | 'handle' | 'leave'
     * @param {Object} finder {x, y, xAxisId: ...[], yAxisName: ...[], angleAxisIndex: ...[]}
     *              x and y, which are mandatory, specify a point to tigger axisPointer and tooltip.
     *              other properties, which are optional, restrict target axes.
     * @param {Function} dispatchAction
     * @param {module:echarts/ExtensionAPI} api
     * @param {Object} tooltipOption
     * @param {string} [highDownKey]
     */
    function axisTrigger(coordSysAxesInfo, currTrigger, finder, dispatchAction, api, tooltipOption, highDownKey) {
        var point = [finder.x, finder.y];
        var linksNewValueMap = {};
        var shouldHide = currTrigger === 'leave' || illegalPoint(point);

        var tooltipInfo = {axesInfo: []};
        var doDispatchTooltip = curry(dispatchTooltip, point, tooltipInfo, tooltipOption);

        // If nothing highlighted, should downplay all highlighted items.
        // This case will occur when mouse leave coordSys.
        var highDownInfo = {batch: []};
        var doDispatchHighDown = curry(dispatchHighDown, highDownInfo);

        // Process for triggered axes.
        each(coordSysAxesInfo.coordSysMap, function (coordSys, coordSysKey) {

            var coordSysContainsPoint = coordSys.containPoint(point);
            var shouldHideInCoord = shouldHide || !coordSysContainsPoint;

            each(coordSysAxesInfo.coordSysAxesInfo[coordSysKey], function (axisInfo, key) {
                var axis = axisInfo.axis;
                var axisPointerModel = axisInfo.axisPointerModel;

                if (notTargetAxis(finder, axis)) {
                    return;
                }

                var triggerOn = axisPointerModel.get('triggerOn');
                var shouldHideAxis = triggerOn !== 'handle' && shouldHideInCoord;
                var newValue = coordSysContainsPoint ? axis.pointToData(point) : null;

                if (!currTrigger || triggerOn === currTrigger || shouldHideAxis) {
                    linksNewValueMap[key] = processOnAxis(
                        axisInfo, currTrigger, newValue, shouldHideAxis,
                        doDispatchTooltip, doDispatchHighDown
                    );
                }
            });
        });

        // Process for linked axes.
        each(coordSysAxesInfo.linkGroups, function (linkGroup) {

            each(linkGroup, function (axisInfo, key) {
                var baseOption = linksNewValueMap[key];
                !axisInfo.processed && processOnAxis(
                    axisInfo, currTrigger, baseOption.value, baseOption.status === 'hide',
                    zrUtil.noop, doDispatchHighDown, true
                );
            });
        });

        // Perform dispatch actions.
        dispatchTooltipActually(tooltipInfo, dispatchAction);
        dispatchHighDownActually(highDownInfo, dispatchAction, api, highDownKey);
    }

    // return: newValue indicates whether axis triggered.
    function processOnAxis(
        axisInfo, currTrigger, newValue, shouldHide,
        doDispatchTooltip, doDispatchHighDown, dontSnap
    ) {
        axisInfo.processed = true;
        var axis = axisInfo.axis;
        var alwaysShow = axisInfo.alwaysShow;
        var axisPointerModel = axisInfo.axisPointerModel;
        var axisPointerOption = axisPointerModel.option;
        var currStatus = axisPointerModel.get('status');

        if (axis.scale.isBlank()) {
            updateAxisPointerModel('hide');
            if (currStatus !== 'hide') {
                doDispatchTooltip('hideTip', axisInfo);
            }
            return;
        }

        var contains = axis.containData(newValue);
        if (shouldHide || !contains) {
            // If hide, value still need to be set, consider click legend to toggle axis blank.
            updateAxisPointerModel(!alwaysShow ? 'hide' : null, contains ? newValue : null);
            if (currStatus !== 'hide') {
                doDispatchTooltip('hideTip', axisInfo);
            }
            return;
        }

        if (!axisInfo.involveSeries) {
            updateAxisPointerModel('show', newValue);
            return;
        }

        // Heavy calculation. So put it after axis.containData checking.
        var payloadInfo = buildPayloadsBySeries(newValue, axisInfo);
        var payloadBatch = payloadInfo.payloadBatch;

        if (!dontSnap && axisInfo.snap) {
            var snapToValue = payloadInfo.snapToValue;
            if (axis.containData(snapToValue) && snapToValue != null) {
                newValue = snapToValue;
            }
        }

        doDispatchHighDown('highlight', payloadBatch);

        updateAxisPointerModel('show', newValue);
        payloadInfo.payloadBatch.length
            ? doDispatchTooltip('showTip', axisInfo, payloadInfo, newValue)
            : doDispatchTooltip('hideTip', axisInfo);

        return {value: axisPointerOption.value, status: axisPointerOption.status};

        function updateAxisPointerModel(status, value) {
            status != null && (axisPointerOption.status = status);
            value != null && (axisPointerOption.value = value);
        }
    }

    function buildPayloadsBySeries(value, axisInfo) {
        var axis = axisInfo.axis;
        var dim = axis.dim;
        // Compatibale with legend action payload definition, remain them.
        // FIXME
        // remove?
        var sampleSeries;
        var sampleDataIndex;
        var minDist = Infinity;
        var snapToValue = value;
        var payloadBatch = [];

        each(axisInfo.seriesModels, function (series, idx) {
            var dataDim = series.coordDimToDataDim(dim);
            var dataIndex = series.getAxisTooltipDataIndex
                ? series.getAxisTooltipDataIndex(dataDim, value, axis)
                : series.getData().indexOfNearest(
                    dataDim[0],
                    value,
                    // Add a threshold to avoid find the wrong dataIndex
                    // when data length is not same.
                    false, axis.type === 'category' ? 0.5 : null
                );

            if (dataIndex == null || dataIndex < 0) {
                return;
            }

            var seriesNestestValue = series.getData().get(dim, dataIndex);
            if (seriesNestestValue != null && isFinite(seriesNestestValue)) {
                var dist = Math.abs(value - seriesNestestValue);
                // Consider category case
                if (dist <= minDist) {
                    if (dist < minDist) {
                        minDist = dist;
                        snapToValue = seriesNestestValue;
                        payloadBatch.length = 0;
                        sampleSeries = series;
                        sampleDataIndex = dataIndex;
                    }
                    payloadBatch.push({
                        seriesIndex: series.seriesIndex,
                        dataIndexInside: dataIndex
                    });
                }
            }
        });

        return {
            payloadBatch: payloadBatch,
            sampleSeries: sampleSeries,
            sampleDataIndex: sampleDataIndex,
            snapToValue: snapToValue
        };
    }

    function dispatchTooltip(point, tooltipInfo, tooltipOption, actionType, axisInfo, payloadInfo, value) {
        if (!axisInfo.triggerTooltip) {
            return;
        }

        if (actionType === 'hideTip' || illegalPoint(point)) {
            tooltipInfo.hideTip = {type: 'hideTip'};
            return;
        }

        // Otherwise, showTip.
        var payloadBatch = payloadInfo.payloadBatch;
        // Compatible with previous version, remain samplexxx.
        var sampleSeries = payloadInfo.sampleSeries;
        var sampleDataIndex = payloadBatch.sampleDataIndex;

        var seriesDataByAxis = (tooltipInfo.showTip || {}).seriesDataByAxis || [];
        var axis = axisInfo.axis;
        var axisPointerModel = axisInfo.axisPointerModel;
        seriesDataByAxis.push({
            axisDim: axis.dim,
            axisIndex: axis.model.componentIndex,
            axisId: axis.model.id,
            value: value,
            valueLabel: axis.scale.getLabel(
                value, {precision: axisPointerModel.get('label.precision'), pad: true}
            ),
            seriesDataIndices: payloadBatch.slice()
        });

        // Currently, only one tooltip is supported.
        tooltipInfo.showTip = {
            type: 'showTip',
            x: point[0],
            y: point[1],
            dataIndexInside: sampleDataIndex,
            // expose to user.
            dataIndex: sampleSeries ? sampleSeries.getData().getRawIndex(sampleDataIndex) : null,
            seriesIndex: sampleSeries ? sampleSeries.seriesIndex : null,
            seriesDataByAxis: seriesDataByAxis,
            tooltipOption: tooltipOption
        };
    }

    function dispatchTooltipActually(tooltipInfo, dispatchAction) {
        if (tooltipInfo.showTip) {
            dispatchAction(tooltipInfo.showTip);
        }
        // If showTip exists, hideTip will not be performed.
        else if (tooltipInfo.hideTip) {
            dispatchAction(tooltipInfo.hideTip);
        }
    }

    function dispatchHighDown(highDownInfo, actionType, batch) {
        highDownInfo.batch = highDownInfo.batch.concat(batch);
    }

    function dispatchHighDownActually(highDownInfo, dispatchAction, api, highDownKey) {
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
        var lastHighlights = get(zr)[highDownKey] || {list: [], map: {}};
        var newHighlights = get(zr)[highDownKey] = {list: [], map: {}};

        zrUtil.each(highDownInfo.batch, function (batchItem) {
            // FIXME vulnerable code
            var key = batchItem.seriesIndex + '||' + batchItem.dataIndexInside;
            if (!newHighlights.map[key]) {
                newHighlights.map[key] = batchItem;
                newHighlights.list.push(batchItem);
            }
        });

        // diff
        var toHighlight = [];
        var toDownplay = [];
        zrUtil.each(lastHighlights.map, function (batchItem, key) {
            !newHighlights.map[key] && toDownplay.push(batchItem);
        });
        zrUtil.each(newHighlights.map, function (batchItem, key) {
            !lastHighlights.map[key] && toHighlight.push(batchItem);
        });

        toDownplay.length && api.dispatchAction({type: 'downplay', batch: toDownplay});
        toHighlight.length && api.dispatchAction({type: 'highlight', batch: toHighlight});
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

    function illegalPoint(point) {
        return point[0] == null || isNaN(point[0]) || point[1] == null || isNaN(point[1]);
    }

    return axisTrigger;
});