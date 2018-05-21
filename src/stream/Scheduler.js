/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

/**
 * @module echarts/stream/Scheduler
 */

import {each, map, isArray, isFunction, createHashMap, noop} from 'zrender/src/core/util';
import {createTask} from './task';
import {getUID} from '../util/component';
import GlobalModel from '../model/Global';
import ExtensionAPI from '../ExtensionAPI';
import {normalizeToArray} from '../util/model';

/**
 * @constructor
 */
function Scheduler(ecInstance, api, dataProcessorHandlers, visualHandlers) {
    this.ecInstance = ecInstance;
    this.api = api;
    this.unfinished;

    // Fix current processors in case that in some rear cases that
    // processors might be registered after echarts instance created.
    // Register processors incrementally for a echarts instance is
    // not supported by this stream architecture.
    var dataProcessorHandlers = this._dataProcessorHandlers = dataProcessorHandlers.slice();
    var visualHandlers = this._visualHandlers = visualHandlers.slice();
    this._allHandlers = dataProcessorHandlers.concat(visualHandlers);

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

/**
 * @param {module:echarts/model/Global} ecModel
 * @param {Object} payload
 */
proto.restoreData = function (ecModel, payload) {
    // TODO: Only restroe needed series and components, but not all components.
    // Currently `restoreData` of all of the series and component will be called.
    // But some independent components like `title`, `legend`, `graphic`, `toolbox`,
    // `tooltip`, `axisPointer`, etc, do not need series refresh when `setOption`,
    // and some components like coordinate system, axes, dataZoom, visualMap only
    // need their target series refresh.
    // (1) If we are implementing this feature some day, we should consider these cases:
    // if a data processor depends on a component (e.g., dataZoomProcessor depends
    // on the settings of `dataZoom`), it should be re-performed if the component
    // is modified by `setOption`.
    // (2) If a processor depends on sevral series, speicified by its `getTargetSeries`,
    // it should be re-performed when the result array of `getTargetSeries` changed.
    // We use `dependencies` to cover these issues.
    // (3) How to update target series when coordinate system related components modified.

    // TODO: simply the dirty mechanism? Check whether only the case here can set tasks dirty,
    // and this case all of the tasks will be set as dirty.

    ecModel.restoreData(payload);

    // Theoretically an overall task not only depends on each of its target series, but also
    // depends on all of the series.
    // The overall task is not in pipeline, and `ecModel.restoreData` only set pipeline tasks
    // dirty. If `getTargetSeries` of an overall task returns nothing, we should also ensure
    // that the overall task is set as dirty and to be performed, otherwise it probably cause
    // state chaos. So we have to set dirty of all of the overall tasks manually, otherwise it
    // probably cause state chaos (consider `dataZoomProcessor`).
    this._stageTaskMap.each(function (taskRecord) {
        var overallTask = taskRecord.overallTask;
        overallTask && overallTask.dirty();
    });
};

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
        && (!pCtx || pCtx.progressiveRender)
        && task.__idxInPipeline > pipeline.blockIndex;

    var step = incremental ? pipeline.step : null;
    var modDataCount = pCtx && pCtx.modDataCount;
    var modBy = modDataCount != null ? Math.ceil(modDataCount / step): null;

    return {step: step, modBy: modBy, modDataCount: modDataCount};
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

    // `progressiveRender` means that can render progressively in each
    // animation frame. Note that some types of series do not provide
    // `view.incrementalPrepareRender` but support `chart.appendData`. We
    // use the term `incremental` but not `progressive` to describe the
    // case that `chart.appendData`.
    var progressiveRender = pipeline.progressiveEnabled
        && view.incrementalPrepareRender
        && dataLen >= pipeline.threshold;

    var large = seriesModel.get('large') && dataLen >= seriesModel.get('largeThreshold');

    // TODO: modDataCount should not updated if `appendData`, otherwise cause whole repaint.
    // see `test/candlestick-large3.html`
    var modDataCount = seriesModel.get('progressiveChunkMode') === 'mod' ? dataLen : null;

    seriesModel.pipelineContext = pipeline.context = {
        progressiveRender: progressiveRender,
        modDataCount: modDataCount,
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
            blockIndex: -1,
            step: Math.round(progressive || 700),
            count: 0
        });

        pipe(scheduler, seriesModel, seriesModel.dataTask);
    });
};

proto.prepareStageTasks = function () {
    var stageTaskMap = this._stageTaskMap;
    var ecModel = this.ecInstance.getModel();
    var api = this.api;

    each(this._allHandlers, function (handler) {
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


proto.performDataProcessorTasks = function (ecModel, payload) {
    // If we do not use `block` here, it should be considered when to update modes.
    performStageTasks(this, this._dataProcessorHandlers, ecModel, payload, {block: true});
};

// opt
// opt.visualType: 'visual' or 'layout'
// opt.setDirty
proto.performVisualTasks = function (ecModel, payload, opt) {
    performStageTasks(this, this._visualHandlers, ecModel, payload, opt);
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
                pipeline.blockIndex = task.__idxInPipeline;
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
    var modifyOutputEnd = stageHandler.modifyOutputEnd;

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
        var stub = agentStubMap.get(pipelineId);
        if (!stub) {
            stub = agentStubMap.set(pipelineId, createTask(
                {reset: stubReset, onDirty: stubOnDirty}
            ));
            // When the result of `getTargetSeries` changed, the overallTask
            // should be set as dirty and re-performed.
            overallTask.dirty();
        }
        stub.context = {
            model: seriesModel,
            overallProgress: overallProgress,
            modifyOutputEnd: modifyOutputEnd
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
            // When the result of `getTargetSeries` changed, the overallTask
            // should be set as dirty and re-performed.
            overallTask.dirty();
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
    return resetDefines.length > 1
        ? map(resetDefines, function (v, idx) {
            return makeSeriesTaskProgress(idx);
        })
        : singleSeriesTaskProgress;
}

var singleSeriesTaskProgress = makeSeriesTaskProgress(0);

function makeSeriesTaskProgress(resetDefineIdx) {
    return function (params, context) {
        var data = context.data;
        var resetDefine = context.resetDefines[resetDefineIdx];

        if (resetDefine && resetDefine.dataEach) {
            for (var i = params.start; i < params.end; i++) {
                resetDefine.dataEach(data, i);
            }
        }
        else if (resetDefine && resetDefine.progress) {
            resetDefine.progress(params, data);
        }
    };
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
