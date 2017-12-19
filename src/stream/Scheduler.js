/**
 * @module echarts/stream/Scheduler
 */

import {each, createHashMap} from 'zrender/src/core/util';
import {createTask} from './task';
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

proto.getStep = function () {
    return this.ecInstance.getModel().get('streamStep') || 700;
};

proto.prepareStageTasks = function (stageHandlers, pipelineTails, useClearVisual) {
    each(stageHandlers, function (stageHandler) {
        prepareStageHandler(
            stageHandler,
            this._stageTaskMap,
            pipelineTails,
            this.ecInstance.getModel(),
            this.api
        );
    }, this);
};

function prepareStageHandler(stageHandler, stageTaskMap, pipelineTails, ecModel, api) {
    var handlerUID = stageHandler.uid;
    var stageHandlerRecord = stageTaskMap.get(handlerUID) || stageTaskMap.set(handlerUID, []);

    if (stageHandler.reset) {
        createSeriesStageTask(stageHandler, stageHandlerRecord, pipelineTails, ecModel, api);
    }
    // else if (stageHandler.execute && stageHandler.getTargetSeries) {
    //     // ???!
    //     // Just listen to axis setting.
    //     stageHandlerRecord.upstreamShouldFinished = true;

    //     var originalModelUIDs = stageHandlerRecord.modelUIDs;
    //     var modelUIDs = stageHandlerRecord.modelUIDs = stageHandler.getTargetModelUIDs();

    //     if (!arrayEqual(originalModelUIDs, modelUIDs)) {
    //         var originalOverallTask = stageHandlerRecord.overallTask;
    //         originalOverallTask && originalOverallTask.dispose();

    //         var overallTask = stageHandlerRecord.overallTask = createTask({
    //             progress: stageHandler.legacyFunc
    //         });

    //         var modelUIDMap = createHashMap(modelUIDs);
    //         pipelineTails.each(function (tailTask, seriesUID) {
    //             if (modelUIDMap.get(seriesUID)) {
    //                 tailTask.pipe(overallTask);
    //             }
    //         });
    //     }
    // }
    else if (stageHandler.legacyFunc) {
        createLegacyStageTask(stageHandler, stageHandlerRecord, pipelineTails, ecModel, api);
    }
}

// ???! Fragile way.
// function detectSeriesType(stageHandler, ecModel, api) {
//     var type;
//     var origin = ecModel.eachSeriesByType;
//     ecModel.eachSeriesByType = function (seriesType, cb) {
//         type = seriesType;
//     };
//     try {
//         stageHandler.legacyFunc(ecModel, api);
//     }
//     catch (e) {
//     }
//     ecModel.eachSeriesByType = origin;
//     return type;
// }

// ???! make upateVisual updateView updateLayout the same?
// visualType: 'visual' or 'layout'
proto.performStageTasks = function (stageHandlers, ecModel, payload, visualType, setDirty) {
    var unfinished;
    // ??? temporarily
    var step = this.getStep();

    each(stageHandlers, function (stageHandler, idx) {
        if (visualType && visualType !== stageHandler.visualType) {
            return;
        }

        var stageHandlerRecord = this._stageTaskMap.get(stageHandler.uid);
        var seriesTaskMap = stageHandlerRecord.seriesTaskMap;
        var overallTask = stageHandlerRecord.overallTask;
        var contextOnReset = {payload: payload};

        if (overallTask) {
            setDirty && overallTask.dirty();
            unfinished |= overallTask.perform({step: step}, contextOnReset);
        }
        else if (seriesTaskMap) {
            stageHandler.seriesType
                ? ecModel.eachRawSeriesByType(stageHandler.seriesType, eachSeries)
                : ecModel.eachRawSeries(eachSeries);
        }

        function eachSeries(seriesModel) {
            var task = seriesTaskMap.get(seriesModel.uid);
            var shouldStream = seriesModel.shouldStream();
            setDirty && task.dirty();
            unfinished |= task.perform({
                step: shouldStream ? step : null,
                skip: !stageHandler.processRawSeries && ecModel.isSeriesFiltered(seriesModel)
            }, contextOnReset);
        }
    }, this);

    this.unfinished |= unfinished;
};

proto.performSeriesTasks = function (ecModel) {
    var unfinished;
    // ??? temporarily
    // var step = this.getStep();
    // var opt = {step: step};

    ecModel.eachSeries(function (seriesModel) {
        // var taskOpt = seriesModel.shouldStream() ? opt : null;
        // Perform all for dataInit and dataRestore.
        unfinished |= seriesModel.dataInitTask.perform();
        unfinished |= seriesModel.dataRestoreTask.perform();
    });

    this.unfinished |= unfinished;
};

function createSeriesStageTask(stageHandler, stageHandlerRecord, pipelineTails, ecModel, api) {
    var seriesTaskMap = stageHandlerRecord.seriesTaskMap || (stageHandlerRecord.seriesTaskMap = createHashMap());
    var pipelineIdMap = createHashMap();

    stageHandler.seriesType
        ? ecModel.eachRawSeriesByType(stageHandler.seriesType, create)
        : ecModel.eachRawSeries(create);

    function create(seriesModel) {
        var pipelineId = seriesModel.uid;
        pipelineIdMap.set(pipelineId, 1);

        // Init tasks for each seriesModel only once.
        if (!seriesTaskMap.get(pipelineId)) {
            var task = createTask({
                reset: seriesTaskReset,
                progress: seriesTaskProgress,
                count: seriesTaskCount
            }, {
                model: seriesModel,
                ecModel: ecModel,
                api: api,
                useClearVisual: stageHandler.isVisual && !stageHandler.isLayout
            });
            task.__handlerReset = stageHandler.reset;

            seriesTaskMap.set(pipelineId, task);
            pipe(pipelineTails, pipelineId, task);
        }
    }

    // Clear unused series tasks.
    seriesTaskMap.each(function (task, pipelineId) {
        if (!pipelineIdMap.get(pipelineId)) {
            task.dispose();
            seriesTaskMap.removeKey(pipelineId);
        }
    });
}

function createLegacyStageTask(stageHandler, stageHandlerRecord, pipelineTails, ecModel, api) {
    var overallTask = stageHandlerRecord.overallTask = stageHandlerRecord.overallTask
        || createTask(
            {reset: legacyTaskReset},
            {ecModel: ecModel, api: api, legacyFunc: stageHandler.legacyFunc}
        );

    // ???!
    var stubs = overallTask.agentStubs = [];
    ecModel.eachRawSeries(function (seriesModel) {
        var stub = createTask({reset: emptyTaskReset});
        stub.agent = overallTask;
        stubs.push(stub);
        pipe(pipelineTails, seriesModel.uid, stub);
    });
}

function emptyTaskReset() {
    return {noProgress: true};
}

function legacyTaskReset(context) {
    context.legacyFunc(context.ecModel, context.api, context.payload);
    return {noProgress: true};
}

function seriesTaskReset(context) {
    if (context.useClearVisual) {
        context.model.getData().clearAllVisual();
    }
    var resetDefine = this.__handlerReset(
        context.model, context.ecModel, context.api
    );
    if (!resetDefine) {
        return {noProgress: true};
    }
    this.__dataEach = resetDefine.dataEach;
    this.__progress = resetDefine.progress;
}

function seriesTaskProgress(params, context) {
    var data = context.model.getData();
    if (data) {
        if (this.__dataEach) {
            for (var i = params.start; i < params.end; i++) {
                this.__dataEach(data, i);
            }
        }
        else if (this.__progress) {
            this.__progress(params, data);
        }
    }
}

function seriesTaskCount(context) {
    return context.model.getData().count();
}

function pipe(pipelineTails, pipelineId, task) {
    var tail = pipelineTails.get(pipelineId);
    tail.pipe(task);
    pipelineTails.set(pipelineId, task);
}

export default Scheduler;
