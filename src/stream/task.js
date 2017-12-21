
import {assert, extend, each} from 'zrender/src/core/util';
import { __DEV__ } from '../config';

/**
 * @param {Object} define
 * @return See the return of `createTask`.
 */
export function createTask(define, context) {
    return new Task(define, context);
}

/**
 * @constructor
 * @param {Object} define
 * @param {Function} define.progress Custom progress
 * @param {Function} define.reset Custom reset
 * @param {Function} [define.count] count is used to determin data task.
 * @param {Object} [context]
 */
function Task(define, context) {
    define = define || {};

    this._progress = define.progress;
    this._reset = define.reset;
    this._count = define.count;

    this._dirty = true;

    this.context = context || {};
}

var taskProto = Task.prototype;

/**
 * @param {Object} performArgs
 * @param {number} [performArgs.step] Specified step.
 * @param {number} [performArgs.skip] Skip customer perform call.
 */
taskProto.perform = function (performArgs) {
    if (this._dirty) {
        this._dirty = false;
        reset(this);
    }

    var step = performArgs && performArgs.step;

    // This should always be performed so it can be passed to downstream.
    var upTask = this._upstream;
    if (upTask) {
        var progressInfo = upTask.getProgressInfo();
        if (__DEV__) {
            assert(progressInfo.outputDueEnd != null);
        }
        this._dueEnd = Math.max(progressInfo.outputDueEnd, this._dueEnd);
    }

    // If noProgress, pass index from upstream to downstream each time plan called.
    if (this._noProgress) {
        this._dueIndex = this._outputDueEnd = this._dueEnd = count(this);
    }
    else {
        if (__DEV__) {
            assert(upTask || this._count);
        }

        var start = this._dueIndex;
        var end = Math.min(
            step != null ? this._dueIndex + step : Infinity,
            upTask ? this._dueEnd : Infinity,
            this._count ? this._count(this.context) : Infinity
        );

        var outputDueEnd;
        !(performArgs && performArgs.skip) && start < end && (
            outputDueEnd = this._progress({start: start, end: end}, this.context)
        );

        this._dueIndex = end;
        // If no `outputDueEnd`, assume that output data and
        // input data is the same, so use `dueIndex` as `outputDueEnd`.
        if (outputDueEnd == null) {
            outputDueEnd = end;
        }
        if (__DEV__) {
            // ??? Can not rollback.
            assert(outputDueEnd >= this._outputDueEnd);
        }
        this._outputDueEnd = outputDueEnd;
    }

    // Initialized in scheduler.
    each(this.agentStubs, function (agentStub) {
        agentStub.perform(performArgs);
    });

    return this.unfinished();
};

taskProto.dirty = function () {
    this._dirty = true;
    this.agentStubs && each(this.agentStubs, function (stub) {
        stub._dirty = true;
    });
    this.agent && (this.agent._dirty = true);
};

/**
 * @param {Object} [params]
 */
function reset(taskIns) {
    taskIns._dueIndex = taskIns._outputDueEnd = 0;
    taskIns._dueEnd = count(taskIns);

    var result = taskIns._reset && taskIns._reset(taskIns.context) || {};

    taskIns._noProgress = result.noProgress;

    taskIns._downstream && taskIns._downstream.dirty();
    // FIXME
    taskIns.agent && taskIns.agent.dirty();
}

function count(taskIns) {
    return taskIns._count ? taskIns._count(taskIns.context) : 0;
}

taskProto.getProgressInfo = function () {
    return {
        dueIndex: this._dueIndex,
        dueEnd: this._dueEnd,
        outputDueEnd: this._outputDueEnd
    };
};

/**
 * @return {boolean}
 */
taskProto.unfinished = function () {
    return !this._noProgress && this._dueIndex < this._dueEnd;
};

/**
 * @param {Object} downTask The downstream task.
 * @return {Object} The downstream task.
 */
taskProto.pipe = function (downTask) {
    if (__DEV__) {
        assert(downTask && !downTask._disposed);
    }

    // If already downstream, do not dirty downTask.
    if (this._downstream !== downTask || this._dirty) {
        this._downstream = downTask;
        downTask._upstream = this;

        downTask.dirty();
    }
};

taskProto.dispose = function () {
    if (this._disposed) {
        return;
    }

    this._upstream && (this._upstream._downstream = null);
    this._downstream && (this._downstream._upstream = null);

    this._dirty = false;
    this._disposed = true;
};

taskProto.getUpstream = function () {
    return this._upstream;
};
