define(function () {

    var lib = {};

    var ORIGIN_METHOD = '\0__throttleOriginMethod';
    var RATE = '\0__throttleRate';

    /**
     * 频率控制 返回函数连续调用时，fn 执行频率限定为每多少时间执行一次
     * 例如常见效果：
     * notifyWhenChangesStop
     *      频繁调用时，只保证最后一次执行
     *      配成：trailing：true；debounce：true 即可
     * notifyAtFixRate
     *      频繁调用时，按规律心跳执行
     *      配成：trailing：true；debounce：false 即可
     * 注意：
     *     根据model更新view的时候，可以使用throttle，
     *     但是根据view更新model的时候，避免使用这种延迟更新的方式。
     *     因为这可能导致model和server同步出现问题。
     *
     * @public
     * @param {(Function|Array.<Function>)} fn 需要调用的函数
     *                                         如果fn为array，则表示可以对多个函数进行throttle。
     *                                         他们共享同一个timer。
     * @param {number} delay 延迟时间，单位毫秒
     * @param {bool} trailing 是否保证最后一次触发的执行
     *                        true：表示保证最后一次调用会触发执行。
     *                        但任何调用后不可能立即执行，总会delay。
     *                        false：表示不保证最后一次调用会触发执行。
     *                        但只要间隔大于delay，调用就会立即执行。
     * @param {bool} debounce 节流
     *                        true：表示：频繁调用（间隔小于delay）时，根本不执行
     *                        false：表示：频繁调用（间隔小于delay）时，按规律心跳执行
     * @return {(Function|Array.<Function>)} 实际调用函数。
     *                                       当输入的fn为array时，返回值也为array。
     *                                       每项是Function。
     */
    lib.throttle = function (fn, delay, trailing, debounce) {

        var currCall = (new Date()).getTime();
        var lastCall = 0;
        var lastExec = 0;
        var timer = null;
        var diff;
        var scope;
        var args;
        var isSingle = typeof fn === 'function';
        delay = delay || 0;

        if (isSingle) {
            return createCallback();
        }
        else {
            var ret = [];
            for (var i = 0; i < fn.length; i++) {
                ret[i] = createCallback(i);
            }
            return ret;
        }

        function createCallback(index) {

            function exec() {
                lastExec = (new Date()).getTime();
                timer = null;
                (isSingle ? fn : fn[index]).apply(scope, args || []);
            }

            var cb = function () {
                currCall = (new Date()).getTime();
                scope = this;
                args = arguments;
                diff = currCall - (debounce ? lastCall : lastExec) - delay;

                clearTimeout(timer);

                if (debounce) {
                    if (trailing) {
                        timer = setTimeout(exec, delay);
                    }
                    else if (diff >= 0) {
                        exec();
                    }
                }
                else {
                    if (diff >= 0) {
                        exec();
                    }
                    else if (trailing) {
                        timer = setTimeout(exec, -diff);
                    }
                }

                lastCall = currCall;
            };

            /**
             * Clear throttle.
             * @public
             */
            cb.clear = function () {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
            };

            return cb;
        }
    };

    /**
     * 按一定频率执行，最后一次调用总归会执行
     *
     * @public
     */
    lib.fixRate = function (fn, delay) {
        return delay != null
            ? lib.throttle(fn, delay, true, false)
            : fn;
    };

    /**
     * 直到不频繁调用了才会执行，最后一次调用总归会执行
     *
     * @public
     */
    lib.debounce = function (fn, delay) {
        return delay != null
             ? lib.throttle(fn, delay, true, true)
             : fn;
    };


    /**
     * Create throttle method or update throttle rate.
     *
     * @example
     * ComponentView.prototype.render = function () {
     *     ...
     *     throttle.createOrUpdate(
     *         this,
     *         '_dispatchAction',
     *         this.model.get('throttle'),
     *         'fixRate'
     *     );
     * };
     * ComponentView.prototype.remove = function () {
     *     throttle.clear(this, '_dispatchAction');
     * };
     * ComponentView.prototype.dispose = function () {
     *     throttle.clear(this, '_dispatchAction');
     * };
     *
     * @public
     * @param {Object} obj
     * @param {string} fnAttr
     * @param {number} rate
     * @param {string} throttleType 'fixRate' or 'debounce'
     */
    lib.createOrUpdate = function (obj, fnAttr, rate, throttleType) {
        var fn = obj[fnAttr];

        if (!fn || rate == null || !throttleType) {
            return;
        }

        var originFn = fn[ORIGIN_METHOD] || fn;
        var lastRate = fn[RATE];

        if (lastRate !== rate) {
            fn = obj[fnAttr] = lib[throttleType](originFn, rate);
            fn[ORIGIN_METHOD] = originFn;
            fn[RATE] = rate;
        }
    };

    /**
     * Clear throttle. Example see throttle.createOrUpdate.
     *
     * @public
     * @param {Object} obj
     * @param {string} fnAttr
     */
    lib.clear = function (obj, fnAttr) {
        var fn = obj[fnAttr];
        if (fn && fn[ORIGIN_METHOD]) {
            obj[fnAttr] = fn[ORIGIN_METHOD];
        }
    };

    return lib;
});
