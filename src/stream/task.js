import {assert} from 'zrender/src/core/util';
import { __DEV__ } from '../config';

/**
 * @param {Object} define
 * @return See the return of `createTask`.
 */
export function createTask(define) {
    return new Task(define);
}

/**
 * @constructor
 * @param {Object} define
 * @param {Function} define.reset Custom reset
 * @param {Function} [define.plan] Returns 'reset' indicate reset immediately.
 * @param {Function} [define.count] count is used to determin data task.
 * @param {Function} [define.onDirty] count is used to determin data task.
 */
function Task(define) {
    define = define || {};

    this._reset = define.reset;
    this._plan = define.plan;
    this._count = define.count;
    this._onDirty = define.onDirty;

    this._dirty = true;

    // Context must be specified implicitly, to
    // avoid miss update context when model changed.
    this.context;
}

var taskProto = Task.prototype;

/**
 * @param {Object} performArgs
 * @param {number} [performArgs.step] Specified step.
 * @param {number} [performArgs.skip] Skip customer perform call.
 */
taskProto.perform = function (performArgs) {

    var upTask = this._upstream;
    var skip = performArgs && performArgs.skip;

    // TODO some refactor.
    // Pull data. Must pull data each time, because context.data
    // may be updated by Series.setData.
    if (this._dirty && upTask) {
        var context = this.context;
        context.data = context.outputData = upTask.context.outputData;
    }

    if (this.__pipeline) {
        this.__pipeline.currentTask = this;
    }

    var planResult;
    if (this._plan && !skip) {
        planResult = this._plan(this.context);
    }

    if (this._dirty || planResult === 'reset') {
        this._dirty = false;
        reset(this, skip);
    }

    var step = performArgs && performArgs.step;

    if (upTask) {

        if (__DEV__) {
            assert(upTask._outputDueEnd != null);
        }
        // ??? FIXME move to schedueler?
        // this._dueEnd = Math.max(upTask._outputDueEnd, this._dueEnd);
        this._dueEnd = upTask._outputDueEnd;
    }
    // DataTask or overallTask
    else {
        if (__DEV__) {
            assert(!this._progress || this._count);
        }
        this._dueEnd = this._count ? this._count(this.context) : Infinity;
    }

    // Note: Stubs, that its host overall task let it has progress, has progress.
    // If no progress, pass index from upstream to downstream each time plan called.
    if (this._progress) {
        var start = this._dueIndex;
        var end = Math.min(
            step != null ? this._dueIndex + step : Infinity,
            this._dueEnd
        );

        !skip && start < end && (
            this._progress({start: start, end: end}, this.context)
        );

        this._dueIndex = end;
        // If no `outputDueEnd`, assume that output data and
        // input data is the same, so use `dueIndex` as `outputDueEnd`.
        var outputDueEnd = this._settedOutputEnd != null
            ? this._settedOutputEnd : end;

        if (__DEV__) {
            // ??? Can not rollback.
            assert(outputDueEnd >= this._outputDueEnd);
        }

        this._outputDueEnd = outputDueEnd;
    }
    else {
        // (1) Some overall task has no progress.
        // (2) Stubs, that its host overall task do not let it has progress, has no progress.
        // This should always be performed so it can be passed to downstream.
        this._dueIndex = this._outputDueEnd = this._settedOutputEnd != null
            ? this._settedOutputEnd : this._dueEnd;
    }

    return this.unfinished();
};

taskProto.dirty = function () {
    this._dirty = true;
    this._onDirty && this._onDirty(this.context);
};

/**
 * @param {Object} [params]
 */
function reset(taskIns, skip) {
    taskIns._dueIndex = taskIns._outputDueEnd = taskIns._dueEnd = 0;
    taskIns._settedOutputEnd = null;

    taskIns._progress = !skip && taskIns._reset && taskIns._reset(
        taskIns.context
    );

    var downstream = taskIns._downstream;
    downstream && downstream.dirty();
}

/**
 * @return {boolean}
 */
taskProto.unfinished = function () {
    return this._progress && this._dueIndex < this._dueEnd;
};

/**
 * @param {Object} downTask The downstream task.
 * @return {Object} The downstream task.
 */
taskProto.pipe = function (downTask) {
    if (__DEV__) {
        assert(downTask && !downTask._disposed && downTask !== this);
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

taskProto.getDownstream = function () {
    return this._downstream;
};

taskProto.setOutputEnd = function (end) {
    // ??? FIXME: check
    // This only happend in dataTask, dataZoom, map, currently.
    // where dataZoom do not set end each time, but only set
    // when reset. So we should record the setted end, in case
    // that the stub of dataZoom perform again and earse the
    // setted end by upstream.
    this._outputDueEnd = this._settedOutputEnd = end;
    // this._outputDueEnd = end;
};
