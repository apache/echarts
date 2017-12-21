/**
 * @module echarts/stream/Scheduler
 */

import {each, isFunction, createHashMap, noop} from 'zrender/src/core/util';
import {createTask} from './task';
import {getUID} from '../util/component';
import GlobalModel from '../model/Global';
import ExtensionAPI from '../ExtensionAPI';
// import arrayEqual from '../util/array/equal';

/**
 * @constructor
 */
function Scheduler(ecInstance, api) {
    // this._pipelineMap = createHashMap();

    this.ecInstance = ecInstance;
    this.api = api;
    this.unfinished;

    /**
     * @private
     * @type {
     *     [handlerUID: string]: {
     *         seriesTaskMap?: {
     *             [seriesUID: string]: Task
     *         },
     *         overallTask?: Task
     *     }
     * }
     */
    this._stageTaskMap = createHashMap();
}

var proto = Scheduler.prototype;

// If seriesModel provided, incremental threshold is check by series data.
proto.getPerformInfo = function (task, seriesModel) {
    // For overall task
    if (!task.__pipelineId) {
        return;
    }

    var pipeline = this._pipelineMap.get(task.__pipelineId);
    if (seriesModel && pipeline.thresholdFail == null) {
        // It is OK not to erase the `thresholdFile` if data not changed.
        pipeline.thresholdFail = seriesModel.getData().count() < pipeline.threshold;
    }
    var incremental = pipeline.incremental
        && task.__idxInPipeline > pipeline.bockIndex
        && !pipeline.thresholdFail;

    return {incremental: incremental, step: incremental ? pipeline.step : null};
};

proto.restorePipelines = function (ecModel) {
    var scheduler = this;
    var pipelines = scheduler._pipelineMap = createHashMap();

    ecModel.eachSeries(function (seriesModel) {
        var initTask = seriesModel.initTask;
        var progressive = seriesModel.get('progressive');

        pipelines.set(seriesModel.uid, {
            head: initTask,
            tail: initTask,
            threshold: seriesModel.get('progressiveThreshold'),
            incremental: progressive
                && !(seriesModel.banIncremental && seriesModel.banIncremental()),
            bockIndex: -1,
            step: progressive || 700, // ??? Temporarily number
            count: 2
        });

        initTask.__pipelineId = seriesModel.uid;
    });
};

proto.prepareStageTasks = function (stageHandlers, useClearVisual) {
    var stageTaskMap = this._stageTaskMap;
    var ecModel = this.ecInstance.getModel();
    var api = this.api;

    each(stageHandlers, function (handler) {
        var record = stageTaskMap.get(handler.uid) || stageTaskMap.set(handler.uid, []);

        handler.reset && createSeriesStageTask(this, handler, record, ecModel, api);
        handler.overallReset && createOverallStageTask(this, handler, record, ecModel, api);
    }, this);
};

proto.prepareView = function (view, model, ecModel, api) {
    var renderTask = view.renderTask;
    var context = renderTask.context;

    context.model = model;
    context.ecModel = ecModel;
    context.api = api;

    renderTask.__block = !view.incrementalPrepareRender;

    pipe(this, model, renderTask);
};

// opt
// opt.visualType: 'visual' or 'layout'
// opt.setDirty
proto.performStageTasks = function (stageHandlers, ecModel, payload, opt) {
    opt = opt || {};
    var unfinished;
    var scheduler = this;

    each(stageHandlers, function (stageHandler, idx) {
        if (opt.visualType && opt.visualType !== stageHandler.visualType) {
            return;
        }

        var stageHandlerRecord = scheduler._stageTaskMap.get(stageHandler.uid);
        var seriesTaskMap = stageHandlerRecord.seriesTaskMap;
        var overallTask = stageHandlerRecord.overallTask;

        if (overallTask) {
            if (opt.setDirty) {
                overallTask.dirty();
            }
            overallTask.context.payload = payload;
            unfinished |= overallTask.perform(scheduler.getPerformInfo(overallTask));
        }
        else if (seriesTaskMap) {
            opt.seriesModels
                ? each(opt.seriesModels, eachSeries)
                : ecModel.eachRawSeries(eachSeries);
        }

        function eachSeries(seriesModel) {
            var task = seriesTaskMap.get(seriesModel.uid);

            if (!task) {
                return;
            }

            if (opt.setDirty) {
                task.dirty();
                unfinished = true;
            }
            else {
                var performInfo = scheduler.getPerformInfo(task, opt.dontCheckThreshold ? null : seriesModel);
                performInfo.skip = !stageHandler.processRawSeries && ecModel.isSeriesFiltered(seriesModel);
                task.context.payload = payload;
                unfinished |= task.perform(performInfo);
            }
        }
    });

    scheduler.unfinished |= unfinished;
};

proto.performSeriesTasks = function (ecModel) {
    var unfinished;

    ecModel.eachSeries(function (seriesModel) {
        // Progress to the end for dataInit and dataRestore.
        unfinished |= seriesModel.initTask.perform();
    });

    this.unfinished |= unfinished;
};

proto.plan = function () {
    // Travel pipelines, check block.
    this._pipelineMap.each(function (pipeline) {
        var task = pipeline.tail;
        do {
            if (task.__block) {
                pipeline.bockIndex = task.__idxInPipeline;
                break;
            }
            task = task.getUpstream();
        }
        while (task);
    });
};

function createSeriesStageTask(scheduler, stageHandler, stageHandlerRecord, ecModel, api) {
    var seriesTaskMap = stageHandlerRecord.seriesTaskMap || (stageHandlerRecord.seriesTaskMap = createHashMap());
    var pipelineIdMap = createHashMap();

    stageHandler.seriesType
        ? ecModel.eachRawSeriesByType(stageHandler.seriesType, create)
        : ecModel.eachRawSeries(create);

    function create(seriesModel) {
        var pipelineId = seriesModel.uid;
        pipelineIdMap.set(pipelineId, 1);

        // Init tasks for each seriesModel only once.
        // Reuse original task instance.
        var task = seriesTaskMap.get(pipelineId);
        if (!task) {
            task = createTask({
                reset: seriesTaskReset,
                count: seriesTaskCount
            }, {
                model: seriesModel,
                ecModel: ecModel,
                api: api,
                useClearVisual: stageHandler.isVisual && !stageHandler.isLayout,
                reset: stageHandler.reset
            });
            seriesTaskMap.set(pipelineId, task);
        }
        pipe(scheduler, seriesModel, task);
    }

    // Clear unused series tasks.
    seriesTaskMap.each(function (task, pipelineId) {
        if (!pipelineIdMap.get(pipelineId)) {
            task.dispose();
            seriesTaskMap.removeKey(pipelineId);
        }
    });
}

function createOverallStageTask(scheduler, stageHandler, stageHandlerRecord, ecModel, api) {
    var overallTask = stageHandlerRecord.overallTask = stageHandlerRecord.overallTask
        || createTask(
            {reset: overallTaskReset},
            {ecModel: ecModel, api: api, overallReset: stageHandler.overallReset}
        );

    // The overall stage task process more then one seires. We simply create stubs
    // for each pipeline to represent the overall task.
    // Reuse orignal stubs.
    var stubs = overallTask.agentStubs = overallTask.agentStubs || [];
    var stubIndex = 0;
    // If no series type detected, we do not set overallTask block. Otherwise the
    // progressive rendering of all pipelines will be disabled unexpectedly.
    // Moreover, it is not necessary to add stub to pipeline in the case.
    var seriesType = stageHandler.seriesType;
    seriesType && ecModel.eachRawSeriesByType(seriesType, function (seriesModel) {
        var stub = stubs[stubIndex] = stubs[stubIndex] || createTask();
        stubIndex++;
        stub.agent = overallTask;
        stub.__block = true;

        // ???! sequence of call should be caution (when to set dirty), so move it to task.js?
        pipe(scheduler, seriesModel, stub);
    });
    stubs.length = stubIndex;
}

function overallTaskReset(context) {
    context.overallReset(context.ecModel, context.api, context.payload);
}

function seriesTaskReset(context) {
    if (context.useClearVisual) {
        context.model.getData().clearAllVisual();
    }
    var resetDefine = context.reset(
        context.model, context.ecModel, context.api, context.payload
    );
    if (resetDefine) {
        context.dataEach = resetDefine.dataEach;
        context.progress = resetDefine.progress;
        return seriesTaskProgress;
    }
}

function seriesTaskProgress(params, context) {
    var data = context.model.getData();
    if (data) {
        if (context.dataEach) {
            for (var i = params.start; i < params.end; i++) {
                context.dataEach(data, i);
            }
        }
        else if (context.progress) {
            context.progress(params, data);
        }
    }
}

function seriesTaskCount(context) {
    return context.model.getData().count();
}

function pipe(scheduler, seriesModel, task) {
    var pipelineId = seriesModel.uid;
    var pipeline = scheduler._pipelineMap.get(pipelineId);
    pipeline.tail.pipe(task);
    pipeline.tail = task;
    task.__idxInPipeline = pipeline.count++;
    task.__pipelineId = pipelineId;
}

Scheduler.wrapStageHandler = function (stageHandler, visualType) {
    if (isFunction(stageHandler)) {
        stageHandler = {
            overallReset: stageHandler,
            seriesType: detectSeriseType(stageHandler)
        };
    }

    stageHandler.uid = getUID('stageHandler');
    visualType && (stageHandler.visualType = visualType);

    return stageHandler;
};

/**
 * Only some legacy stage handlers (usually in echarts extensions) are pure function.
 * To ensure that they can work normally, they should work in block mode, that is,
 * they should not be started util the previous tasks finished. So they cause the
 * progressive rendering disabled. We try to detect the series type, to narrow down
 * the block range to only the series type they concern, but not all series.
 */
function detectSeriseType(legacyFunc) {
    seriesType = null;
    try {
        // Assume there is no async when calling `eachSeriesByType`.
        legacyFunc(ecModelMock, apiMock);
    }
    catch (e) {
    }
    return seriesType;
}

var ecModelMock = {};
var apiMock = {};
var seriesType;

mockMethods(ecModelMock, GlobalModel);
mockMethods(apiMock, ExtensionAPI);
ecModelMock.eachSeriesByType = ecModelMock.eachRawSeriesByType = function seriesByTypeGetter(type) {
    seriesType = type;
};

function mockMethods(target, Clz) {
    for (var name in Clz.prototype) {
        // Do not use hasOwnProperty
        target[name] = noop;
    }
}

export default Scheduler;
