/**
 * @module echarts/stream/Scheduler
 */

import {__DEV__} from '../config';
import {assert, each} from 'zrender/src/core/util';

/**
 * @constructor
 */
function Scheduler() {
    this.clear();
}

var proto = Scheduler.prototype;

/**
 * Clear all tasks.
 */
proto.clear = function () {
    this._pipelines = {};
    this._stage = {
        processor: [],
        visual: [],
        render: []
    };
};

proto.addPipeline = function (pipelineId) {
    this._pipelines[pipelineId] = [];
};

/**
 * @param {Array} tasks Can be `null`/`undefined`. Should has `task.pipelineId`. // ???
 * @param {string} stage 'processor', 'visual', 'render'
 * @param {string} [partialBase] 'updateLayoutBase', 'updateVisualBase' or 'updateViewBase'
 */
proto.pipeTasks = function (tasks, stage, partialBase) {
    var pipelines = this._pipelines;
    each(tasks, function (task) {
        var pipeline = pipelines[task.pipelineId];

        if (__DEV__) {
            assert(pipeline);
            each(pipeline, function (taskInPipeline) {
                assert(taskInPipeline != task);
            });
        }

        var baseTask = partialBase
            ? findAddClearPartialBase(pipeline, partialBase)
            : pipeline[pipeline.length - 1];

        baseTask && baseTask.pipe(task);

        pipeline.push(task);

        // ??? Should keep the original register order of tasks
        // within single stage. Especially visual and layout.
        stage && this._stage[stage].push(task);

    }, this);
};

/**
 * Only clear streams start from the tagged tasks.
 * This is for cases like `updateView`, `updateVisual` and `updateLayout`,
 * who are partial streams, depending on the render task of the full stream,
 * and should be cleared if another partial stream is started.
 */
function findAddClearPartialBase(pipeline, partialBase) {
    var baseIndex;
    for (var i = 0; i < pipeline.length; i++) {
        if (pipeline[i][partialBase]) {
            baseIndex = i;
            break;
        }
    }
    if (__DEV__) {
        // In case the developer do not mark a task by partailBase.
        assert(baseIndex != null);
    }

    // Clear from baseTask
    var baseTask = pipeline[baseIndex];
    baseTask.clearDownstreams();
    pipeline.length = baseIndex + 1;

    return baseTask;
}

// keyInfo: {stage, tag}
proto.getTasksByStage = function (stage) {
    return this._stage[stage].slice();
};

// ???
// // keyInfo: {stage, tag}
// proto.getTasksByTag = function (pipelineId, tag) {
//     var tasks = [];
//     each(this._pipelines[pipelineId], function (wrap) {
//         wrap.tag === tag && tasks.push(wrap.task);
//     });
//     return tasks;
// };

// ???
// proto.unpipeTaskByKey = function (key) {
//     each(this._pipelines, function (pipeline) {
//         var index = 0;
//         for (; index < pipeline.length; index++) {
//             if (pipeline[index].key === key) {
//                 break;
//             }
//         }
//         if (index > 0 && index < pipeline.length) {
//             pipeline[index - 1].unpipe(pipeline[index]);
//         }
//         pipeline.length = index;
//     });
// };

export default Scheduler;
