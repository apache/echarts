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

import {assert, isArray} from 'zrender/src/core/util';
import SeriesModel from '../model/Series';
import { Pipeline } from './Scheduler';
import { Payload } from '../util/types';
import SeriesData from '../data/SeriesData';


export interface TaskContext {
    outputData?: SeriesData;
    data?: SeriesData;
    payload?: Payload;
    model?: SeriesModel;
};

export type TaskResetCallback<Ctx extends TaskContext> = (
    this: Task<Ctx>, context: Ctx
) => TaskResetCallbackReturn<Ctx>;
export type TaskResetCallbackReturn<Ctx extends TaskContext> =
    void
    | (TaskProgressCallback<Ctx> | TaskProgressCallback<Ctx>[])
    | {
        forceFirstProgress?: boolean
        progress: TaskProgressCallback<Ctx> | TaskProgressCallback<Ctx>[]
    };
export type TaskProgressCallback<Ctx extends TaskContext> = (
    this: Task<Ctx>, params: TaskProgressParams, context: Ctx
) => void;
export type TaskProgressParams = {
    start: number, end: number, count: number, next?: TaskDataIteratorNext
};
export type TaskPlanCallback<Ctx extends TaskContext> = (
    this: Task<Ctx>, context: Ctx
) => TaskPlanCallbackReturn;
export type TaskPlanCallbackReturn = 'reset' | false | null | undefined;
export type TaskCountCallback<Ctx extends TaskContext> = (
    this: Task<Ctx>, context: Ctx
) => number;
export type TaskOnDirtyCallback<Ctx extends TaskContext> = (
    this: Task<Ctx>, context: Ctx
) => void;

type TaskDataIteratorNext = () => number;
type TaskDataIterator = {
    reset: (s: number, e: number, sStep: number, sCount: number) => void,
    next?: TaskDataIteratorNext
};

type TaskDefineParam<Ctx extends TaskContext> = {
    reset?: TaskResetCallback<Ctx>,
    // Returns 'reset' indicate reset immediately
    plan?: TaskPlanCallback<Ctx>,
    // count is used to determine data task.
    count?: TaskCountCallback<Ctx>,
    onDirty?: TaskOnDirtyCallback<Ctx>
};
export type PerformArgs = {
    step?: number,
    skip?: boolean,
    modBy?: number,
    modDataCount?: number
};

/**
 * @param {Object} define
 * @return See the return of `createTask`.
 */
export function createTask<Ctx extends TaskContext>(
    define: TaskDefineParam<Ctx>
): Task<Ctx> {
    return new Task<Ctx>(define);
}

export class Task<Ctx extends TaskContext> {

    private _reset: TaskResetCallback<Ctx>;
    private _plan: TaskPlanCallback<Ctx>;
    private _count: TaskCountCallback<Ctx>;
    private _onDirty: TaskOnDirtyCallback<Ctx>;
    private _progress: TaskProgressCallback<Ctx> | TaskProgressCallback<Ctx>[];
    private _callingProgress: TaskProgressCallback<Ctx>;

    private _dirty: boolean;
    private _modBy: number;
    private _modDataCount: number;
    private _upstream: Task<Ctx>;
    private _downstream: Task<Ctx>;
    private _dueEnd: number;
    private _outputDueEnd: number;
    private _settedOutputEnd: number;
    private _dueIndex: number;
    private _disposed: boolean;

    // Injected in schedular
    __pipeline: Pipeline;
    __idxInPipeline: number;
    __block: boolean;

    // Context must be specified implicitly, to
    // avoid miss update context when model changed.
    context: Ctx;

    constructor(define: TaskDefineParam<Ctx>) {
        define = define || {};

        this._reset = define.reset;
        this._plan = define.plan;
        this._count = define.count;
        this._onDirty = define.onDirty;

        this._dirty = true;
    }

    /**
     * @param step Specified step.
     * @param skip Skip customer perform call.
     * @param modBy Sampling window size.
     * @param modDataCount Sampling count.
     * @return whether unfinished.
     */
    perform(performArgs?: PerformArgs): boolean {
        const upTask = this._upstream;
        const skip = performArgs && performArgs.skip;

        // TODO some refactor.
        // Pull data. Must pull data each time, because context.data
        // may be updated by Series.setData.
        if (this._dirty && upTask) {
            const context = this.context;
            context.data = context.outputData = upTask.context.outputData;
        }

        if (this.__pipeline) {
            this.__pipeline.currentTask = this;
        }

        let planResult;
        if (this._plan && !skip) {
            planResult = this._plan(this.context);
        }

        // Support sharding by mod, which changes the render sequence and makes the rendered graphic
        // elements uniformed distributed when progress, especially when moving or zooming.
        const lastModBy = normalizeModBy(this._modBy);
        const lastModDataCount = this._modDataCount || 0;
        const modBy = normalizeModBy(performArgs && performArgs.modBy);
        const modDataCount = performArgs && performArgs.modDataCount || 0;
        if (lastModBy !== modBy || lastModDataCount !== modDataCount) {
            planResult = 'reset';
        }

        function normalizeModBy(val: number) {
            !(val >= 1) && (val = 1); // jshint ignore:line
            return val;
        }

        let forceFirstProgress;
        if (this._dirty || planResult === 'reset') {
            this._dirty = false;
            forceFirstProgress = this._doReset(skip);
        }

        this._modBy = modBy;
        this._modDataCount = modDataCount;

        const step = performArgs && performArgs.step;

        if (upTask) {
            if (__DEV__) {
                assert(upTask._outputDueEnd != null);
            }
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
            const start = this._dueIndex;
            const end = Math.min(
                step != null ? this._dueIndex + step : Infinity,
                this._dueEnd
            );

            if (!skip && (forceFirstProgress || start < end)) {
                const progress = this._progress;
                if (isArray(progress)) {
                    for (let i = 0; i < progress.length; i++) {
                        this._doProgress(progress[i], start, end, modBy, modDataCount);
                    }
                }
                else {
                    this._doProgress(progress, start, end, modBy, modDataCount);
                }
            }

            this._dueIndex = end;
            // If no `outputDueEnd`, assume that output data and
            // input data is the same, so use `dueIndex` as `outputDueEnd`.
            const outputDueEnd = this._settedOutputEnd != null
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
    }

    dirty(): void {
        this._dirty = true;
        this._onDirty && this._onDirty(this.context);
    }

    private _doProgress(
        progress: TaskProgressCallback<Ctx>,
        start: number,
        end: number,
        modBy: number,
        modDataCount: number
    ): void {
        iterator.reset(start, end, modBy, modDataCount);
        this._callingProgress = progress;
        this._callingProgress({
            start: start, end: end, count: end - start, next: iterator.next
        }, this.context);
    }

    private _doReset(skip: boolean): boolean {
        this._dueIndex = this._outputDueEnd = this._dueEnd = 0;
        this._settedOutputEnd = null;

        let progress: TaskResetCallbackReturn<Ctx>;
        let forceFirstProgress: boolean;

        if (!skip && this._reset) {
            progress = this._reset(this.context);
            if (progress && (progress as any).progress) {
                forceFirstProgress = (progress as any).forceFirstProgress;
                progress = (progress as any).progress;
            }
            // To simplify no progress checking, array must has item.
            if (isArray(progress) && !progress.length) {
                progress = null;
            }
        }

        this._progress = progress as TaskProgressCallback<Ctx>;
        this._modBy = this._modDataCount = null;

        const downstream = this._downstream;
        downstream && downstream.dirty();

        return forceFirstProgress;
    }

    unfinished(): boolean {
        return this._progress && this._dueIndex < this._dueEnd;
    }

    /**
     * @param downTask The downstream task.
     * @return The downstream task.
     */
    pipe(downTask: Task<Ctx>): void {
        if (__DEV__) {
            assert(downTask && !downTask._disposed && downTask !== this);
        }

        // If already downstream, do not dirty downTask.
        if (this._downstream !== downTask || this._dirty) {
            this._downstream = downTask;
            downTask._upstream = this;
            downTask.dirty();
        }
    }

    dispose(): void {
        if (this._disposed) {
            return;
        }

        this._upstream && (this._upstream._downstream = null);
        this._downstream && (this._downstream._upstream = null);

        this._dirty = false;
        this._disposed = true;
    }

    getUpstream(): Task<Ctx> {
        return this._upstream;
    }

    getDownstream(): Task<Ctx> {
        return this._downstream;
    }

    setOutputEnd(end: number): void {
        // This only happens in dataTask, dataZoom, map, currently.
        // where dataZoom do not set end each time, but only set
        // when reset. So we should record the set end, in case
        // that the stub of dataZoom perform again and earse the
        // set end by upstream.
        this._outputDueEnd = this._settedOutputEnd = end;
    }

}

const iterator: TaskDataIterator = (function () {

    let end: number;
    let current: number;
    let modBy: number;
    let modDataCount: number;
    let winCount: number;

    const it: TaskDataIterator = {
        reset: function (s: number, e: number, sStep: number, sCount: number): void {
            current = s;
            end = e;

            modBy = sStep;
            modDataCount = sCount;
            winCount = Math.ceil(modDataCount / modBy);

            it.next = (modBy > 1 && modDataCount > 0) ? modNext : sequentialNext;
        }
    };

    return it;

    function sequentialNext(): number {
        return current < end ? current++ : null;
    }

    function modNext(): number {
        const dataIndex = (current % winCount) * modBy + Math.ceil(current / winCount);
        const result = current >= end
            ? null
            : dataIndex < modDataCount
            ? dataIndex
            // If modDataCount is smaller than data.count() (consider `appendData` case),
            // Use normal linear rendering mode.
            : current;
        current++;
        return result;
    }
})();



// -----------------------------------------------------------------------------
// For stream debug (Should be commented out after used!)
// @usage: printTask(this, 'begin');
// @usage: printTask(this, null, {someExtraProp});
// @usage: Use `__idxInPipeline` as conditional breakpiont.
//
// window.printTask = function (task: any, prefix: string, extra: { [key: string]: unknown }): void {
//     window.ecTaskUID == null && (window.ecTaskUID = 0);
//     task.uidDebug == null && (task.uidDebug = `task_${window.ecTaskUID++}`);
//     task.agent && task.agent.uidDebug == null && (task.agent.uidDebug = `task_${window.ecTaskUID++}`);
//     let props = [];
//     if (task.__pipeline) {
//         let val = `${task.__idxInPipeline}/${task.__pipeline.tail.__idxInPipeline} ${task.agent ? '(stub)' : ''}`;
//         props.push({text: '__idxInPipeline/total', value: val});
//     } else {
//         let stubCount = 0;
//         task.agentStubMap.each(() => stubCount++);
//         props.push({text: 'idx', value: `overall (stubs: ${stubCount})`});
//     }
//     props.push({text: 'uid', value: task.uidDebug});
//     if (task.__pipeline) {
//         props.push({text: 'pipelineId', value: task.__pipeline.id});
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
//     let args = ['color: blue'];
//     let msg = `%c[${prefix || 'T'}] %c` + props.map(item => (
//         args.push('color: green', 'color: red'),
//         `${item.text}: %c${item.value}`
//     )).join('%c, ');
//     console.log.apply(console, [msg].concat(args));
//     // console.log(this);
// };
// window.printPipeline = function (task: any, prefix: string) {
//     const pipeline = task.__pipeline;
//     let currTask = pipeline.head;
//     while (currTask) {
//         window.printTask(currTask, prefix);
//         currTask = currTask._downstream;
//     }
// };
// window.showChain = function (chainHeadTask) {
//     var chain = [];
//     var task = chainHeadTask;
//     while (task) {
//         chain.push({
//             task: task,
//             up: task._upstream,
//             down: task._downstream,
//             idxInPipeline: task.__idxInPipeline
//         });
//         task = task._downstream;
//     }
//     return chain;
// };
// window.findTaskInChain = function (task, chainHeadTask) {
//     let chain = window.showChain(chainHeadTask);
//     let result = [];
//     for (let i = 0; i < chain.length; i++) {
//         let chainItem = chain[i];
//         if (chainItem.task === task) {
//             result.push(i);
//         }
//     }
//     return result;
// };
// window.printChainAEachInChainB = function (chainHeadTaskA, chainHeadTaskB) {
//     let chainA = window.showChain(chainHeadTaskA);
//     for (let i = 0; i < chainA.length; i++) {
//         console.log('chainAIdx:', i, 'inChainB:', window.findTaskInChain(chainA[i].task, chainHeadTaskB));
//     }
// };
