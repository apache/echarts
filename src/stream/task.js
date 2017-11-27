/**
 * @module echarts/stream/task
 */

import {__DEV__} from '../config';
import {assert, each, defaults} from 'zrender/src/core/util';

var TASK_REG_EXP = /^streamTask(\.|$)/;

// ??? refactor to OO class?

/**
 * @param {Object} define
 * @param {Function} define.reset
 * @param {Function} define.progress
 * @param {Function} define.unfinished
 * @param {Function} [define.onUpstreamProgress]
 * @param {string} [define.subType]
 * @return {Object}
 * {
 *      reset: Function,
 *      progress: Function,
 *      pipe: Function,
 *      unfinished: Function,
 *      onUpstreamProgress: Function
 * }
 */
export function createTask(define) {

    if (__DEV__) {
        assert(
            define.reset && define.progress && define.unfinished,
            'Methods required'
        );
    }

    var downstreams = [];
    var upstreams = [];
    var started;

    var thisTask = {

        type: 'streamTask' + (define.subType ? '.' + define.subType : ''),

        /**
         * @param {Object} [params]
         */
        progress: function (params) {
            started = true;
            var result = define.progress(params || {});

            each(downstreams, function (task) {
                task.onUpstreamProgress(result);
            });

            return result;
        },

        reset: function () {
            started = false;
            define.reset();

            each(downstreams, function (task) {
                task.reset();
            });
        },

        unfinished: define.unfinished,

        onUpstreamProgress: define.onUpstreamProgress,

        /**
         * @param {Object} task The downstream task.
         * @return {Object} The downstream task.
         */
        pipe: function (task) {
            if (__DEV__) {
                assert(!started && task.onUpstreamProgress);
            }
            task.onUpstreamProgress({init: true});
            downstreams.push(task);
            return task;
        },

        // ??? necessary? depends on `remove`.
        unpipe: function (task) {
            for (var i = downstreams.length - 1; i >= 0; i--) {
                downstreams[i] === task && downstreams.splice(i, 1);
            }
        },

        // ??? whether use remove to remove itself from container list, or
        // its container responsible for it?
        remove: function () {
            each(upstreams, function (up) {
                up.unpipe(thisTask);
            });
            upstreams.length = 0;
        }
    };

    return thisTask;
}

// /**
//  * @param {Function} fn
//  * @return {Object} task
//  */
// export function createPlainTask(fn) {
//     var args;
//     return createTask({
//         subType: 'plain',
//         reset: function () {
//             args = arrSlice.call(arguments);
//         },
//         progress: function () {
//             return fn.apply(null, args);
//         },
//         unfinished: function () {}
//     });
// }

/**
 * @param {Object} define
 * @param {Function} define.progress
 * @param {Function} define.list {count:Function}
 * @return See the return of `createTask`.
 */
export function createListTask(define) {

    var dueEndFromUpstream = null;
    var dueDataIndex = 0;
    var list = define.list;

    return createTask({

        subType: 'list',

        reset: function () {
            dueEndFromUpstream = null;
            dueDataIndex = 0;
        },

        onUpstreamProgress: function (params) {
            if (__DEV__) {
                assert(params.dueEndDownstream != null || params.init != null);
            }
            dueEndFromUpstream = params.init ? 0 : params.dueEndDownstream;
        },

        unfinished: function () {
            return dueDataIndex < (
                dueEndFromUpstream != null ? dueEndFromUpstream : list.count()
            );
        },

        /**
         * @param {Object} [params]
         * @param {number} [params.step] Specified step.
         *  If not specified, progress to current dueEnd.
         */
        progress: function (params) {
            params = params || {};

            var result = define.progress(
                defaults({
                    dueEnd: Math.min(
                        params.step != null ? dueDataIndex + params.step : Infinity,
                        dueEndFromUpstream != null ? dueEndFromUpstream : Infinity,
                        list.count()
                    ),
                    dueDataIndex: dueDataIndex
                }, params)
            );

            if (__DEV__) {
                assert(result.dueDataIndex != null);
            }

            dueDataIndex = result.dueDataIndex;

            var dueEndDownstream = result.dueEndDownstream;
            return {
                dueEndDownstream: dueEndDownstream != null ? dueEndDownstream : dueDataIndex,
                // ??? not a good name.
                dueDataIndex: dueDataIndex
            };
        }
    });
}

/**
 * @return {boolean}
 */
export function isTask(obj) {
    return obj && TASK_REG_EXP.test(obj.type);
}
