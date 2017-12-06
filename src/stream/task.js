
import {assert, each, bind, indexOf, isArray} from 'zrender/src/core/util';
import {makeInner} from '../util/model';

var inner = makeInner();

/**
 * @param {Object} define
 * @param {Function} define.progress
 * @param {Object|Array} define.input {count: Function} or a pure array.
 * @return See the return of `createTask`.
 */
export function createTask(define) {
    return new Task(define);
}

/**
 * @return {boolean}
 */
export function isTask(obj) {
    return obj instanceof Task;
}

// ----------------
// Task
// ----------------

/**
 * @constructor
 * @param {Object} define
 * @param {Function} define.progress Custom progress
 * @param {Function} define.reset Custom reset
 * @param {Function} [define.input] {count: Function}
 * @param {Function} [define.output] {count: Function}
 */
function Task(define) {
    var fields = inner(this);

    fields.downstreams = [];
    fields.upstreams = [];
    var input = fields.input = this.input = define.input;
    // Just for programing convenience.
    this.output = define.output || input;

    this._progressCustom = define.progress;
    this._resetCustom = define.reset;
    this._progressNotify = bind(progressNotify, this);
    this._count = isArray(input) ? arrayCount : listCount;

    this.reset();
}

var taskProto = Task.prototype;

/**
 * @param {Object} [params]
 */
taskProto.reset = function (params) {
    var fields = inner(this);

    fields.started = false;
    fields.dueEnd = fields.upstreams.length ? 0 : null;
    fields.dueIndex = fields.outputDueEnd = 0;

    this._resetCustom && this._resetCustom(params);

    each(fields.downstreams, function (downTask) {
        downTask.reset(params);
    });
};

/**
 * @param {Array|Object} input
 */
taskProto.changeInput = function (input) {
    var fields = inner(this);

    // ???
    assert(!fields.upstreams.length);

    fields.input = this.input = input;
    fields.dueIndex = 0;
    // Keep outputDueEnd, should not rollback.
    fields.dueEnd = null;
};

/**
 * @param {Object} [params]
 * @param {number} [params.step] Specified step.
 *  If not specified, progress to current dueEnd.
 */
taskProto.progress = function (params) {
    params = params || {};
    var fields = inner(this);

    fields.started = true;

    this._progressCustom({
        dueEnd: Math.min(
            params.step != null ? fields.dueIndex + params.step : Infinity,
            fields.dueEnd != null ? fields.dueEnd : Infinity,
            this._count()
        ),
        dueIndex: fields.dueIndex
    }, this._progressNotify);
};

function progressNotify(dueIndex, outputDueEnd) {
    var fields = inner(this);

    assert(dueIndex != null);

    fields.dueIndex = dueIndex;

    // If no `outputDueEnd`, assume that output data and
    // input data is the same, so use `dueIndex` as `outputDueEnd`.
    outputDueEnd = outputDueEnd != null ? outputDueEnd : dueIndex;

    // ??? Can not rollback.
    assert(outputDueEnd >= fields.outputDueEnd);

    fields.outputDueEnd = outputDueEnd;

    each(fields.downstreams, function (downTask) {
        downTask.plan();
    });
}

/**
 * Receive notify. ??? Only on notify? check pipe.
 */
taskProto.plan = function () {
    var fields = inner(this);

    var upDueEnd;
    each(fields.upstreams, function (upTask) {
        var dueEnd = upTask.getOutputDueEnd();
        upDueEnd = upDueEnd != null
            // Current no scenario that upstreams
            // outputs data are not the same.
            ? Math.min(upDueEnd, dueEnd)
            : dueEnd;
    });

    assert(upDueEnd >= fields.dueEnd);
    fields.dueEnd = upDueEnd;
};

/**
 * @return {number}
 */
taskProto.getOutputDueEnd = function () {
    return inner(this).outputDueEnd;
};

/**
 * @return {boolean}
 */
taskProto.unfinished = function () {
    var fields = inner(this);

    return fields.dueIndex < (
        fields.dueEnd != null ? fields.dueEnd : this._count()
    );
};

/**
 * @param {Object} downTask The downstream task.
 * @return {Object} The downstream task.
 */
taskProto.pipe = function (downTask) {
    // ???
    assert(!inner(downTask).disposed);

    var fields = inner(this);

    var downTaskUpstreams = inner(downTask).upstreams;
    if (indexOf(downTaskUpstreams, this) >= 0) {
        return;
    }

    downTask.reset();

    fields.downstreams.push(downTask);
    downTaskUpstreams.push(this);

    downTask.plan();

    return downTask;
};

/**
 * Remove all downstreams.
 */
taskProto.clearDownstreams = function () {
    var downstreams = inner(this).downstreams;
    each(downstreams, function (downTask) {
        // ??? Current forbiden reuse task to avoid troubles
        // (piped by multiple task but difficult to unpipe).
        downTask.dispose();
        // var downTaskUpstream = inner(downTask).upstreams;
        // downTaskUpstream.splice(indexOf(downTaskUpstream, this), 1);
        // // Stop the down task, but do not leave it from all its upstreams,
        // // because it may keep working with its other upstreams.
        // downTask.reset();
    }, this);
    downstreams.length = 0;
};

taskProto.dispose = function () {
    var fields = inner(this);
    each(fields.upstreams, function (upTask) {
        // var downTaskUpstream = inner(downTask).upstreams;
        // downTaskUpstream.splice(indexOf(downTaskUpstream, this), 1);
        var upTaskDownstream = inner(upTask).downstreams;
        upTaskDownstream.splice(indexOf(upTaskDownstream, this), 1);
    }, this);
    this.reset();
    fields.disposed = true;
};

function listCount() {
    return inner(this).input.count();
}

function arrayCount() {
    return inner(this).input.length;
}
