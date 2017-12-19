
import {assert, extend, each} from 'zrender/src/core/util';
import {makeInner} from '../util/model';
import { __DEV__ } from '../config';

var inner = makeInner();

/**
 * @param {Object} define
 * @return See the return of `createTask`.
 */
export function createTask(define, context) {
    return new Task(define, context);
}

/**
 * @return {boolean}
 */
export function isTask(obj) {
    return obj instanceof Task;
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
    var fields = inner(this);
    define = define || {};

    this._progress = define.progress;
    this._reset = define.reset;
    this._count = define.count;

    fields.dirty = true;

    this.context = context || {};
}

var taskProto = Task.prototype;

taskProto.perform = function (opt, contextOnReset) {
    this.plan(contextOnReset);
    this.progress(opt);
    return this.unfinished();
};

taskProto.dirty = function () {
    inner(this).dirty = true;
};

taskProto.plan = function (contextOnReset) {
    var fields = inner(this);

    var finishedAfterReset;
    if (fields.dirty) {
        fields.dirty = false;
        finishedAfterReset = reset(this, contextOnReset);
    }

    // This should always be performed so it can be passed to downstream.
    var upTask = fields.upstream;
    if (upTask) {
        var progressInfo = upTask.getProgressInfo();
        if (__DEV__) {
            assert(progressInfo.outputDueEnd != null);
        }
        fields.dueEnd = Math.max(progressInfo.outputDueEnd, fields.dueEnd);
    }

    // If noProgress, pass index from upstream to downstream each time plan called.
    if (finishedAfterReset || fields.noProgress) {
        fields.dueIndex = fields.outputDueEnd = fields.dueEnd;
    }

    // FIXME
    each(this.agentStubs, function (agentStub) {
        agentStub.plan(contextOnReset);
    });
};

/**
 * @param {Object} [params]
 */
function reset(taskIns, contextOnReset) {
    extend(taskIns.context, contextOnReset);

    var fields = inner(taskIns);
    fields.dueIndex = fields.outputDueEnd = 0;
    fields.dueEnd = taskIns._count ? taskIns._count(taskIns.context) : 0;

    var result = taskIns._reset && taskIns._reset(taskIns.context) || {};

    fields.noProgress = result.noProgress;

    fields.downstream && fields.downstream.dirty();
    // FIXME
    taskIns.agent && taskIns.agent.dirty();

    return result.finished;
}

/**
 * @param {Object} opt
 * @param {number} [opt.step] Specified step.
 * @param {number} [opt.skip] Skip customer perform call.
 */
taskProto.progress = function (opt) {
    var fields = inner(this);

    if (fields.noProgress) {
        return;
    }

    var start = fields.dueIndex;
    var end = Math.min(
        opt.step != null ? start + opt.step : Infinity,
        fields.dueEnd,
        this._count ? this._count(this.context) : Infinity
    );

    var outputDueEnd;
    !opt.skip && start < end && (
        outputDueEnd = this._progress({start: start, end: end}, this.context)
    );

    fields.dueIndex = end;
    // If no `outputDueEnd`, assume that output data and
    // input data is the same, so use `dueIndex` as `outputDueEnd`.
    if (outputDueEnd == null) {
        outputDueEnd = end;
    }
    if (__DEV__) {
        // ??? Can not rollback.
        assert(outputDueEnd >= fields.outputDueEnd);
    }
    fields.outputDueEnd = outputDueEnd;
};

taskProto.getProgressInfo = function () {
    var fields = inner(this);
    return {
        dueIndex: fields.dueIndex,
        dueEnd: fields.dueEnd,
        outputDueEnd: fields.outputDueEnd
    };
};

/**
 * @return {boolean}
 */
taskProto.unfinished = function () {
    var fields = inner(this);
    return !fields.noProgress && fields.dueIndex < fields.dueEnd;
};

/**
 * @param {Object} downTask The downstream task.
 * @return {Object} The downstream task.
 */
taskProto.pipe = function (downTask) {
    if (__DEV__) {
        assert(downTask && !inner(downTask).disposed);
    }

    var fields = inner(this);

    // If already downstream, do not dirty downTask.
    if (fields.downstream !== downTask) {
        fields.downstream = downTask;
        inner(downTask).upstream = this;

        downTask.dirty();
    }
};

taskProto.dispose = function () {
    var fields = inner(this);

    if (fields.disposed) {
        return;
    }

    fields.upstream && (inner(fields.upstream).downstream = null);
    fields.downstream && (inner(fields.downstream).upstream = null);

    fields.dirty = false;
    fields.disposed = true;
};
