/**
 * @module echarts/stream/Scheduler
 */

import {__DEV__} from '../config';
import {assert, each, createHashMap} from 'zrender/src/core/util';
import {normalizeToArray, makeInner} from '../util/model';

var inner = makeInner();

/**
 * @const
 */
var STAGE = {
    dataInit: 1,
    dataClone: 2,
    processor: 3,
    visual: 4,
    render: 5
};
var TAG = {
    updateBase: 1,
    updateLayoutBase: 1,
    updateVisualBase: 1,
    updateViewBase: 1
};

var TEST_PROGRESS_STEP = 300;

/**
 * @constructor
 */
function Scheduler() {
    this._pipelineMap = createHashMap();

    var stageMap = this._stageMap = createHashMap();
    each(STAGE, function (value, name) {
        stageMap.set(name, []);
    });

    // this._stageUnfinished = [];

    this.unfinished;
}

var proto = Scheduler.prototype;

proto.progressStage = function (stage) {
    // if (!this._stageUnfinished[STAGE[stage]]) {
    //     return;
    // }

    var unfinished;
    var tasks = this.getTasksByStage(stage);

    each(tasks, function (task) {
        task.progress({
            step: TEST_PROGRESS_STEP
        });
        unfinished |= task.unfinished();
    });

    this.unfinished |= unfinished;
};

/**
 * @param {Object} host Should has uid.
 */
proto.initPipeline = function (host) {
    var pipelineId = host.uid;
    if (__DEV__) {
        assert(!this._pipelineMap.get(pipelineId) && !host.pipeTask);
    }
    var pipeline = {tasks: [], temps: []};
    this._pipelineMap.set(pipelineId, pipeline);

    // Inject method pipeTask
    host.pipeTask = hostPipeTask;
    inner(host).temps = pipeline.temps;
};

function hostPipeTask(task, stage, tags) {
    task && inner(this).temps.push({task: task, stage: stage, tags: tags});
}

/**
 * @param {Array.<Object>} allHosts Should has uid.
 */
proto.clearUnusedPipelines = function (allHosts) {
    var pipelineMap = this._pipelineMap;
    var idMap = createHashMap();
    var stageMap = this._stageMap;
    each(allHosts, function (host) {
        idMap.set(host.uid, 1);
    });
    pipelineMap.each(function (pipeline, id) {
        if (!idMap.get(id)) {
            clearPipeline(stageMap, pipeline, -1);
            pipelineMap.set(id, null);
        }
    });
};

proto.clearTemps = function () {
    this._pipelineMap.each(clearPipelineTemp);
};

function clearPipelineTemp(pipeline) {
    pipeline.temps.length = 0;
}

/**
 * @param {string} tag
 * @param {Array.<Object>} [hosts]
 */
proto.flushTemps = function (tag, hosts) {
    var pipelineMap = this._pipelineMap;
    var stageMap = this._stageMap;
    var self = this;

    hosts
        ? each(hosts, function (host) {
            flushPipelineTemps(pipelineMap.get(host.uid));
        })
        : pipelineMap.each(flushPipelineTemps);

    function flushPipelineTemps(pipeline) {
        clearPipelineDownstreams(stageMap, pipeline, tag);
        each(pipeline.temps, function (tmp) {
            self.unfinished = true;
            pipeTask(stageMap, pipeline.tasks, tmp.task, tmp.stage, tmp.tags);
        }, this);
        clearPipelineTemp(pipeline);
    }
};

/**
 * Only clear streams start from the tagged tasks.
 * This is for cases like `updateView`, `updateVisual` and `updateLayout`,
 * who are partial streams, depending on the render task of the full stream,
 * and should be cleared if another partial stream is started.
 */
function clearPipelineDownstreams(stageMap, pipeline, tag) {
    var tasks = pipeline.tasks;
    var baseIndex;

    if (tag === 'start') {
        baseIndex = -1;
    }
    else {
        for (var i = 0; i < tasks.length; i++) {
            if (inner(tasks[i])[tag]) {
                baseIndex = i;
                break;
            }
        }
    }

    clearPipeline(stageMap, pipeline, baseIndex);
}

function pipeTask(stageMap, pipelineTasks, task, stage, tags) {
    if (__DEV__) {
        // In case typo.
        stage && assert(STAGE[stage] != null);
        each(pipelineTasks, function (taskInPipeline) {
            assert(taskInPipeline != task);
        });
    }

    each(normalizeToArray(tags), function (tag) {
        if (__DEV__) {
            assert(TAG[tag]);
        }
        inner(task)[tag] = true;
    });

    pipelineTasks.length && pipelineTasks[pipelineTasks.length - 1].pipe(task);
    pipelineTasks.push(task);

    // ??? Should keep the original register order of tasks
    // within single stage. Especially visual and layout.
    stage && stageMap.get(stage).push(task);
}

proto.getTasksByStage = function (stage) {
    return this._stageMap.get(stage).slice();
};

// taskBaseIndex can be -1;
function clearPipeline(stageMap, pipeline, taskBaseIndex) {
    var tasks = pipeline.tasks;
    if (!tasks.length) {
        return;
    }

    if (taskBaseIndex === -1) {
        var taskBase = tasks[0];
        taskBase.clearDownstreams();
        taskBase.reset();
    }
    else {
        tasks[taskBaseIndex].clearDownstreams();
    }
    for (var i = taskBaseIndex + 1; i < tasks.length; i++) {
        inner(tasks[i]).cleared = 1;
    }
    tasks.length = taskBaseIndex + 1;

    stageMap.each(function (stageTasks) {
        for (var i = stageTasks.length - 1; i >= 0; i--) {
            if (inner(stageTasks[i]).cleared) {
                stageTasks.splice(i, 1);
            }
        }
    });

    i = 10;
}

export default Scheduler;
