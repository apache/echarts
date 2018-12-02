
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

var _util = require("zrender/lib/core/util");

var assert = _util.assert;
var isArray = _util.isArray;

var _config = require("../config");

var __DEV__ = _config.__DEV__;

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
 * @param {Object} define
 * @return See the return of `createTask`.
 */
function createTask(define) {
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
  this._dirty = true; // Context must be specified implicitly, to
  // avoid miss update context when model changed.

  this.context;
}

var taskProto = Task.prototype;
/**
 * @param {Object} performArgs
 * @param {number} [performArgs.step] Specified step.
 * @param {number} [performArgs.skip] Skip customer perform call.
 * @param {number} [performArgs.modBy] Sampling window size.
 * @param {number} [performArgs.modDataCount] Sampling count.
 */

taskProto.perform = function (performArgs) {
  var upTask = this._upstream;
  var skip = performArgs && performArgs.skip; // TODO some refactor.
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
  } // Support sharding by mod, which changes the render sequence and makes the rendered graphic
  // elements uniformed distributed when progress, especially when moving or zooming.


  var lastModBy = normalizeModBy(this._modBy);
  var lastModDataCount = this._modDataCount || 0;
  var modBy = normalizeModBy(performArgs && performArgs.modBy);
  var modDataCount = performArgs && performArgs.modDataCount || 0;

  if (lastModBy !== modBy || lastModDataCount !== modDataCount) {
    planResult = 'reset';
  }

  function normalizeModBy(val) {
    !(val >= 1) && (val = 1); // jshint ignore:line

    return val;
  }

  var forceFirstProgress;

  if (this._dirty || planResult === 'reset') {
    this._dirty = false;
    forceFirstProgress = reset(this, skip);
  }

  this._modBy = modBy;
  this._modDataCount = modDataCount;
  var step = performArgs && performArgs.step;

  if (upTask) {
    this._dueEnd = upTask._outputDueEnd;
  } // DataTask or overallTask
  else {
      this._dueEnd = this._count ? this._count(this.context) : Infinity;
    } // Note: Stubs, that its host overall task let it has progress, has progress.
  // If no progress, pass index from upstream to downstream each time plan called.


  if (this._progress) {
    var start = this._dueIndex;
    var end = Math.min(step != null ? this._dueIndex + step : Infinity, this._dueEnd);

    if (!skip && (forceFirstProgress || start < end)) {
      var progress = this._progress;

      if (isArray(progress)) {
        for (var i = 0; i < progress.length; i++) {
          doProgress(this, progress[i], start, end, modBy, modDataCount);
        }
      } else {
        doProgress(this, progress, start, end, modBy, modDataCount);
      }
    }

    this._dueIndex = end; // If no `outputDueEnd`, assume that output data and
    // input data is the same, so use `dueIndex` as `outputDueEnd`.

    var outputDueEnd = this._settedOutputEnd != null ? this._settedOutputEnd : end;
    this._outputDueEnd = outputDueEnd;
  } else {
    // (1) Some overall task has no progress.
    // (2) Stubs, that its host overall task do not let it has progress, has no progress.
    // This should always be performed so it can be passed to downstream.
    this._dueIndex = this._outputDueEnd = this._settedOutputEnd != null ? this._settedOutputEnd : this._dueEnd;
  }

  return this.unfinished();
};

var iterator = function () {
  var end;
  var current;
  var modBy;
  var modDataCount;
  var winCount;
  var it = {
    reset: function (s, e, sStep, sCount) {
      current = s;
      end = e;
      modBy = sStep;
      modDataCount = sCount;
      winCount = Math.ceil(modDataCount / modBy);
      it.next = modBy > 1 && modDataCount > 0 ? modNext : sequentialNext;
    }
  };
  return it;

  function sequentialNext() {
    return current < end ? current++ : null;
  }

  function modNext() {
    var dataIndex = current % winCount * modBy + Math.ceil(current / winCount);
    var result = current >= end ? null : dataIndex < modDataCount ? dataIndex // If modDataCount is smaller than data.count() (consider `appendData` case),
    // Use normal linear rendering mode.
    : current;
    current++;
    return result;
  }
}();

taskProto.dirty = function () {
  this._dirty = true;
  this._onDirty && this._onDirty(this.context);
};

function doProgress(taskIns, progress, start, end, modBy, modDataCount) {
  iterator.reset(start, end, modBy, modDataCount);
  taskIns._callingProgress = progress;

  taskIns._callingProgress({
    start: start,
    end: end,
    count: end - start,
    next: iterator.next
  }, taskIns.context);
}

function reset(taskIns, skip) {
  taskIns._dueIndex = taskIns._outputDueEnd = taskIns._dueEnd = 0;
  taskIns._settedOutputEnd = null;
  var progress;
  var forceFirstProgress;

  if (!skip && taskIns._reset) {
    progress = taskIns._reset(taskIns.context);

    if (progress && progress.progress) {
      forceFirstProgress = progress.forceFirstProgress;
      progress = progress.progress;
    } // To simplify no progress checking, array must has item.


    if (isArray(progress) && !progress.length) {
      progress = null;
    }
  }

  taskIns._progress = progress;
  taskIns._modBy = taskIns._modDataCount = null;
  var downstream = taskIns._downstream;
  downstream && downstream.dirty();
  return forceFirstProgress;
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
  // This only happend in dataTask, dataZoom, map, currently.
  // where dataZoom do not set end each time, but only set
  // when reset. So we should record the setted end, in case
  // that the stub of dataZoom perform again and earse the
  // setted end by upstream.
  this._outputDueEnd = this._settedOutputEnd = end;
}; ///////////////////////////////////////////////////////////
// For stream debug (Should be commented out after used!)
// Usage: printTask(this, 'begin');
// Usage: printTask(this, null, {someExtraProp});
// function printTask(task, prefix, extra) {
//     window.ecTaskUID == null && (window.ecTaskUID = 0);
//     task.uidDebug == null && (task.uidDebug = `task_${window.ecTaskUID++}`);
//     task.agent && task.agent.uidDebug == null && (task.agent.uidDebug = `task_${window.ecTaskUID++}`);
//     var props = [];
//     if (task.__pipeline) {
//         var val = `${task.__idxInPipeline}/${task.__pipeline.tail.__idxInPipeline} ${task.agent ? '(stub)' : ''}`;
//         props.push({text: 'idx', value: val});
//     } else {
//         var stubCount = 0;
//         task.agentStubMap.each(() => stubCount++);
//         props.push({text: 'idx', value: `overall (stubs: ${stubCount})`});
//     }
//     props.push({text: 'uid', value: task.uidDebug});
//     if (task.__pipeline) {
//         props.push({text: 'pid', value: task.__pipeline.id});
//         task.agent && props.push(
//             {text: 'stubFor', value: task.agent.uidDebug}
//         );
//     }
//     props.push(
//         {text: 'dirty', value: task._dirty},
//         {text: 'dueIndex', value: task._dueIndex},
//         {text: 'dueEnd', value: task._dueEnd},
//         {text: 'outputDueEnd', value: task._outputDueEnd}
//     );
//     if (extra) {
//         Object.keys(extra).forEach(key => {
//             props.push({text: key, value: extra[key]});
//         });
//     }
//     var args = ['color: blue'];
//     var msg = `%c[${prefix || 'T'}] %c` + props.map(item => (
//         args.push('color: black', 'color: red'),
//         `${item.text}: %c${item.value}`
//     )).join('%c, ');
//     console.log.apply(console, [msg].concat(args));
//     // console.log(this);
// }


exports.createTask = createTask;