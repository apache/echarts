/**
 * @module echarts/stream/Scheduler
 */

import {each, isFunction, createHashMap, noop} from 'zrender/src/core/util';
import {createTask} from './task';
import {getUID} from '../util/component';
import GlobalModel from '../model/Global';
import ExtensionAPI from '../ExtensionAPI';
import {normalizeToArray} from '../util/model';

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
proto.getPerformArgs = function (task, isBlock) {
    // For overall task
    if (!task.__pipeline) {
        return;
    }

    var pipeline = this._pipelineMap.get(task.__pipeline.id);
    var pCtx = pipeline.context;
    var incremental = !isBlock
        && pipeline.progressiveEnabled
        && (!pCtx || pCtx.incrementalRender)
        && task.__idxInPipeline > pipeline.bockIndex;

    return {step: incremental ? pipeline.step : null};
};

proto.getPipeline = function (pipelineId) {
    return this._pipelineMap.get(pipelineId);
};

/**
 * Current, progressive rendering starts from visual and layout.
 * Always detect render mode in the same stage, avoiding that incorrect
 * detection caused by data filtering.
 * Caution:
 * `updateStreamModes` use `seriesModel.getData()`.
 */
proto.updateStreamModes = function (seriesModel, view) {
    var pipeline = this._pipelineMap.get(seriesModel.uid);
    var data = seriesModel.getData();
    var dataLen = data.count();
    var incrementalRender = pipeline.progressiveEnabled
        && view.incrementalPrepareRender
        && dataLen >= pipeline.threshold;
    var large = seriesModel.get('large') && dataLen >= seriesModel.get('largeThreshold');

    seriesModel.pipelineContext = pipeline.context = {
        incrementalRender: incrementalRender,
        large: large
    };
};

proto.restorePipelines = function (ecModel) {
    var scheduler = this;
    var pipelineMap = scheduler._pipelineMap = createHashMap();
    ecModel.eachSeries(function (seriesModel) {
        var progressive = seriesModel.getProgressive();
        var pipelineId = seriesModel.uid;

        pipelineMap.set(pipelineId, {
            id: pipelineId,
            head: null,
            tail: null,
            threshold: seriesModel.getProgressiveThreshold(),
            progressiveEnabled: progressive
                && !(seriesModel.preventIncremental && seriesModel.preventIncremental()),
            bockIndex: -1,
            step: progressive || 700, // ??? Temporarily number
            count: 0
        });

        pipe(scheduler, seriesModel, seriesModel.dataTask);
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


proto.performDataProcessorTasks = function (stageHandlers, ecModel, payload) {
    // If we do not use `block` here, it should be considered when to update modes.
    performStageTasks(this, stageHandlers, ecModel, payload, {block: true});
};

// opt
// opt.visualType: 'visual' or 'layout'
// opt.setDirty
proto.performVisualTasks = function (stageHandlers, ecModel, payload, opt) {
    performStageTasks(this, stageHandlers, ecModel, payload, opt);
};

function performStageTasks(scheduler, stageHandlers, ecModel, payload, opt) {
    opt = opt || {};
    var unfinished;

    each(stageHandlers, function (stageHandler, idx) {
        if (opt.visualType && opt.visualType !== stageHandler.visualType) {
            return;
        }

        var stageHandlerRecord = scheduler._stageTaskMap.get(stageHandler.uid);
        var seriesTaskMap = stageHandlerRecord.seriesTaskMap;
        var overallTask = stageHandlerRecord.overallTask;

        if (overallTask) {
            var overallNeedDirty;
            var agentStubMap = overallTask.agentStubMap;
            agentStubMap.each(function (stub) {
                if (needSetDirty(opt, stub)) {
                    stub.dirty();
                    overallNeedDirty = true;
                }
            });
            overallNeedDirty && overallTask.dirty();
            updatePayload(overallTask, payload);
            var performArgs = scheduler.getPerformArgs(overallTask, opt.block);
            // Execute stubs firstly, which may set the overall task dirty,
            // then execute the overall task. And stub will call seriesModel.setData,
            // which ensures that in the overallTask seriesModel.getData() will not
            // return incorrect data.
            agentStubMap.each(function (stub) {
                stub.perform(performArgs);
            });
            unfinished |= overallTask.perform(performArgs);
        }
        else if (seriesTaskMap) {
            seriesTaskMap.each(function (task, pipelineId) {
                if (needSetDirty(opt, task)) {
                    task.dirty();
                }
                var performArgs = scheduler.getPerformArgs(task, opt.block);
                performArgs.skip = !stageHandler.performRawSeries
                    && ecModel.isSeriesFiltered(task.context.model);
                updatePayload(task, payload);
                unfinished |= task.perform(performArgs);
            });
        }
    });

    function needSetDirty(opt, task) {
        return opt.setDirty && (!opt.dirtyMap || opt.dirtyMap.get(task.__pipeline.id));
    }

    scheduler.unfinished |= unfinished;
}

proto.performSeriesTasks = function (ecModel) {
    var unfinished;

    ecModel.eachSeries(function (seriesModel) {
        // Progress to the end for dataInit and dataRestore.
        unfinished |= seriesModel.dataTask.perform();
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

var updatePayload = proto.updatePayload = function (task, payload) {
    payload !== 'remain' && (task.context.payload = payload);
};

function createSeriesStageTask(scheduler, stageHandler, stageHandlerRecord, ecModel, api) {
    var seriesTaskMap = stageHandlerRecord.seriesTaskMap
        || (stageHandlerRecord.seriesTaskMap = createHashMap());
    var seriesType = stageHandler.seriesType;
    var getTargetSeries = stageHandler.getTargetSeries;

    // If a stageHandler should cover all series, `createOnAllSeries` should be declared mandatorily,
    // to avoid some typo or abuse. Otherwise if an extension do not specify a `seriesType`,
    // it works but it may cause other irrelevant charts blocked.
    if (stageHandler.createOnAllSeries) {
        ecModel.eachRawSeries(create);
    }
    else if (seriesType) {
        ecModel.eachRawSeriesByType(seriesType, create);
    }
    else if (getTargetSeries) {
        getTargetSeries(ecModel, api).each(create);
    }

    function create(seriesModel) {
        var pipelineId = seriesModel.uid;

        // Init tasks for each seriesModel only once.
        // Reuse original task instance.
        var task = seriesTaskMap.get(pipelineId)
            || seriesTaskMap.set(pipelineId, createTask({
                plan: seriesTaskPlan,
                reset: seriesTaskReset,
                count: seriesTaskCount
            }));
        task.context = {
            model: seriesModel,
            ecModel: ecModel,
            api: api,
            useClearVisual: stageHandler.isVisual && !stageHandler.isLayout,
            plan: stageHandler.plan,
            reset: stageHandler.reset,
            scheduler: scheduler
        };
        pipe(scheduler, seriesModel, task);
    }

    // Clear unused series tasks.
    var pipelineMap = scheduler._pipelineMap;
    seriesTaskMap.each(function (task, pipelineId) {
        if (!pipelineMap.get(pipelineId)) {
            task.dispose();
            seriesTaskMap.removeKey(pipelineId);
        }
    });
}

function createOverallStageTask(scheduler, stageHandler, stageHandlerRecord, ecModel, api) {
    var overallTask = stageHandlerRecord.overallTask = stageHandlerRecord.overallTask
        // For overall task, the function only be called on reset stage.
        || createTask({reset: overallTaskReset});

    overallTask.context = {
        ecModel: ecModel,
        api: api,
        overallReset: stageHandler.overallReset,
        scheduler: scheduler
    };

    // Reuse orignal stubs.
    var agentStubMap = overallTask.agentStubMap = overallTask.agentStubMap || createHashMap();

    var seriesType = stageHandler.seriesType;
    var getTargetSeries = stageHandler.getTargetSeries;
    var overallProgress = true;
    var isOverallFilter = stageHandler.isOverallFilter;

    // An overall task with seriesType detected or has `getTargetSeries`, we add
    // stub in each pipelines, it will set the overall task dirty when the pipeline
    // progress. Moreover, to avoid call the overall task each frame (too frequent),
    // we set the pipeline block.
    if (seriesType) {
        ecModel.eachRawSeriesByType(seriesType, createStub);
    }
    else if (getTargetSeries) {
        getTargetSeries(ecModel, api).each(createStub);
    }
    // Otherwise, (usually it is legancy case), the overall task will only be
    // executed when upstream dirty. Otherwise the progressive rendering of all
    // pipelines will be disabled unexpectedly. But it still needs stubs to receive
    // dirty info from upsteam.
    else {
        overallProgress = false;
        each(ecModel.getSeries(), createStub);
    }

    function createStub(seriesModel) {
        var pipelineId = seriesModel.uid;
        var stub = agentStubMap.get(pipelineId) || agentStubMap.set(pipelineId, createTask(
            {reset: stubReset, onDirty: stubOnDirty}
        ));
        stub.context = {
            model: seriesModel,
            overallProgress: overallProgress,
            isOverallFilter: isOverallFilter
        };
        stub.agent = overallTask;
        stub.__block = overallProgress;

        pipe(scheduler, seriesModel, stub);
    }

    // Clear unused stubs.
    var pipelineMap = scheduler._pipelineMap;
    agentStubMap.each(function (stub, pipelineId) {
        if (!pipelineMap.get(pipelineId)) {
            stub.dispose();
            agentStubMap.removeKey(pipelineId);
        }
    });
}

function overallTaskReset(context) {
    context.overallReset(
        context.ecModel, context.api, context.payload
    );
}

function stubReset(context, upstreamContext) {
    return context.overallProgress && stubProgress;
}

function stubProgress() {
    this.agent.dirty();
    this.getDownstream().dirty();
}

function stubOnDirty() {
    this.agent && this.agent.dirty();
}

function seriesTaskPlan(context) {
    return context.plan && context.plan(
        context.model, context.ecModel, context.api, context.payload
    );
}

function seriesTaskReset(context) {
    if (context.useClearVisual) {
        context.data.clearAllVisual();
    }
    var resetDefines = context.resetDefines = normalizeToArray(context.reset(
        context.model, context.ecModel, context.api, context.payload
    ));
    if (resetDefines.length) {
        return seriesTaskProgress;
    }
}

function seriesTaskProgress(params, context) {
    var data = context.data;
    var resetDefines = context.resetDefines;

    for (var k = 0; k < resetDefines.length; k++) {
        var resetDefine = resetDefines[k];
        if (resetDefine && resetDefine.dataEach) {
            for (var i = params.start; i < params.end; i++) {
                resetDefine.dataEach(data, i);
            }
        }
        else if (resetDefine && resetDefine.progress) {
            resetDefine.progress(params, data);
        }
    }
}

function seriesTaskCount(context) {
    return context.data.count();
}

function pipe(scheduler, seriesModel, task) {
    var pipelineId = seriesModel.uid;
    var pipeline = scheduler._pipelineMap.get(pipelineId);
    !pipeline.head && (pipeline.head = task);
    pipeline.tail && pipeline.tail.pipe(task);
    pipeline.tail = task;
    task.__idxInPipeline = pipeline.count++;
    task.__pipeline = pipeline;
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
ecModelMock.eachSeriesByType = ecModelMock.eachRawSeriesByType = function (type) {
    seriesType = type;
};
ecModelMock.eachComponent = function (cond) {
    if (cond.mainType === 'series' && cond.subType) {
        seriesType = cond.subType;
    }
};

function mockMethods(target, Clz) {
    for (var name in Clz.prototype) {
        // Do not use hasOwnProperty
        target[name] = noop;
    }
}

export default Scheduler;
