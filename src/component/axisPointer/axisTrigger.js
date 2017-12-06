import * as zrUtil from 'zrender/src/core/util';
import * as modelUtil from '../../util/model';
import * as modelHelper from './modelHelper';
import findPointFromSeries from './findPointFromSeries';

var each = zrUtil.each;
var curry = zrUtil.curry;
var get = modelUtil.makeGetter();

/**
 * Basic logic: check all axis, if they do not demand show/highlight,
 * then hide/downplay them.
 *
 * @param {Object} coordSysAxesInfo
 * @param {Object} payload
 * @param {string} [payload.currTrigger] 'click' | 'mousemove' | 'leave'
 * @param {Array.<number>} [payload.x] x and y, which are mandatory, specify a point to
 *              trigger axisPointer and tooltip.
 * @param {Array.<number>} [payload.y] x and y, which are mandatory, specify a point to
 *              trigger axisPointer and tooltip.
 * @param {Object} [payload.seriesIndex] finder, optional, restrict target axes.
 * @param {Object} [payload.dataIndex] finder, restrict target axes.
 * @param {Object} [payload.axesInfo] finder, restrict target axes.
 *        [{
 *          axisDim: 'x'|'y'|'angle'|...,
 *          axisIndex: ...,
 *          value: ...
 *        }, ...]
 * @param {Function} [payload.dispatchAction]
 * @param {Object} [payload.tooltipOption]
 * @param {Object|Array.<number>|Function} [payload.position] Tooltip position,
 *        which can be specified in dispatchAction
 * @param {module:echarts/model/Global} ecModel
 * @param {module:echarts/ExtensionAPI} api
 * @return {Object} content of event obj for echarts.connect.
 */
export default function (payload, ecModel, api) {
    var currTrigger = payload.currTrigger;
    var point = [payload.x, payload.y];
    var finder = payload;
    var dispatchAction = payload.dispatchAction || zrUtil.bind(api.dispatchAction, api);
    var coordSysAxesInfo = ecModel.getComponent('axisPointer').coordSysAxesInfo;

    // Pending
    // See #6121. But we are not able to reproduce it yet.
    if (!coordSysAxesInfo) {
        return;
    }

    if (illegalPoint(point)) {
        // Used in the default behavior of `connection`: use the sample seriesIndex
        // and dataIndex. And also used in the tooltipView trigger.
        point = findPointFromSeries({
            seriesIndex: finder.seriesIndex,
            // Do not use dataIndexInside from other ec instance.
            // FIXME: auto detect it?
            dataIndex: finder.dataIndex
        }, ecModel).point;
    }
    var isIllegalPoint = illegalPoint(point);

    // Axis and value can be specified when calling dispatchAction({type: 'updateAxisPointer'}).
    // Notice: In this case, it is difficult to get the `point` (which is necessary to show
    // tooltip, so if point is not given, we just use the point found by sample seriesIndex
    // and dataIndex.
    var inputAxesInfo = finder.axesInfo;

    var axesInfo = coordSysAxesInfo.axesInfo;
    var shouldHide = currTrigger === 'leave' || illegalPoint(point);
    var outputFinder = {};

    var showValueMap = {};
    var dataByCoordSys = {list: [], map: {}};
    var updaters = {
        showPointer: curry(showPointer, showValueMap),
        showTooltip: curry(showTooltip, dataByCoordSys)
    };

    // Process for triggered axes.
    each(coordSysAxesInfo.coordSysMap, function (coordSys, coordSysKey) {
        // If a point given, it must be contained by the coordinate system.
        var coordSysContainsPoint = isIllegalPoint || coordSys.containPoint(point);

        each(coordSysAxesInfo.coordSysAxesInfo[coordSysKey], function (axisInfo, key) {
            var axis = axisInfo.axis;
            var inputAxisInfo = findInputAxisInfo(inputAxesInfo, axisInfo);
            // If no inputAxesInfo, no axis is restricted.
            if (!shouldHide && coordSysContainsPoint && (!inputAxesInfo || inputAxisInfo)) {
                var val = inputAxisInfo && inputAxisInfo.value;
                if (val == null && !isIllegalPoint) {
                    val = axis.pointToData(point);
                }
                val != null && processOnAxis(axisInfo, val, updaters, false, outputFinder);
            }
        });
    });

    // Process for linked axes.
    var linkTriggers = {};
    each(axesInfo, function (tarAxisInfo, tarKey) {
        var linkGroup = tarAxisInfo.linkGroup;

        // If axis has been triggered in the previous stage, it should not be triggered by link.
        if (linkGroup && !showValueMap[tarKey]) {
            each(linkGroup.axesInfo, function (srcAxisInfo, srcKey) {
                var srcValItem = showValueMap[srcKey];
                // If srcValItem exist, source axis is triggered, so link to target axis.
                if (srcAxisInfo !== tarAxisInfo && srcValItem) {
                    var val = srcValItem.value;
                    linkGroup.mapper && (val = tarAxisInfo.axis.scale.parse(linkGroup.mapper(
                        val, makeMapperParam(srcAxisInfo), makeMapperParam(tarAxisInfo)
                    )));
                    linkTriggers[tarAxisInfo.key] = val;
                }
            });
        }
    });
    each(linkTriggers, function (val, tarKey) {
        processOnAxis(axesInfo[tarKey], val, updaters, true, outputFinder);
    });

    updateModelActually(showValueMap, axesInfo, outputFinder);
    dispatchTooltipActually(dataByCoordSys, point, payload, dispatchAction);
    dispatchHighDownActually(axesInfo, dispatchAction, api);

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

    updaters.showPointer(axisInfo, newValue, payloadBatch, outputFinder);
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
            dataIndices = series.getData().indicesOfNearest(
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

function updateModelActually(showValueMap, axesInfo, outputFinder) {
    var outputAxesInfo = outputFinder.axesInfo = [];
    // Basic logic: If no 'show' required, 'hide' this axisPointer.
    each(axesInfo, function (axisInfo, key) {
        var option = axisInfo.axisPointerModel.option;
        var valItem = showValueMap[key];

        if (valItem) {
            !axisInfo.useHandle && (option.status = 'show');
            option.value = valItem.value;
            // For label formatter param and highlight.
            option.seriesDataIndices = (valItem.payloadBatch || []).slice();
        }
        // When always show (e.g., handle used), remain
        // original value and status.
        else {
            // If hide, value still need to be set, consider
            // click legend to toggle axis blank.
            !axisInfo.useHandle && (option.status = 'hide');
        }

        // If status is 'hide', should be no info in payload.
        option.status === 'show' && outputAxesInfo.push({
            axisDim: axisInfo.axis.dim,
            axisIndex: axisInfo.axis.model.componentIndex,
            value: option.value
        });
    });
}

function dispatchTooltipActually(dataByCoordSys, point, payload, dispatchAction) {
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
        tooltipOption: payload.tooltipOption,
        position: payload.position,
        dataIndexInside: sampleItem.dataIndexInside,
        dataIndex: sampleItem.dataIndex,
        seriesIndex: sampleItem.seriesIndex,
        dataByCoordSys: dataByCoordSys.list
    });
}

function dispatchHighDownActually(axesInfo, dispatchAction, api) {
    // FIXME
    // highlight status modification shoule be a stage of main process?
    // (Consider confilct (e.g., legend and axisPointer) and setOption)

    var zr = api.getZr();
    var highDownKey = 'axisPointerLastHighlights';
    var lastHighlights = get(zr)[highDownKey] || {};
    var newHighlights = get(zr)[highDownKey] = {};

    // Update highlight/downplay status according to axisPointer model.
    // Build hash map and remove duplicate incidentally.
    each(axesInfo, function (axisInfo, key) {
        var option = axisInfo.axisPointerModel.option;
        option.status === 'show' && each(option.seriesDataIndices, function (batchItem) {
            var key = batchItem.seriesIndex + ' | ' + batchItem.dataIndex;
            newHighlights[key] = batchItem;
        });
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

function findInputAxisInfo(inputAxesInfo, axisInfo) {
    for (var i = 0; i < (inputAxesInfo || []).length; i++) {
        var inputAxisInfo = inputAxesInfo[i];
        if (axisInfo.axis.dim === inputAxisInfo.axisDim
            && axisInfo.axis.model.componentIndex === inputAxisInfo.axisIndex
        ) {
            return inputAxisInfo;
        }
    }
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
    return !point || point[0] == null || isNaN(point[0]) || point[1] == null || isNaN(point[1]);
}
