
var ORIGIN_METHOD = '\0__throttleOriginMethod';
var RATE = '\0__throttleRate';
var THROTTLE_TYPE = '\0__throttleType';

/**
 * @public
 * @param {(Function)} fn
 * @param {number} [delay=0] Unit: ms.
 * @param {boolean} [debounce=false]
 *        true: If call interval less than `delay`, only the last call works.
 *        false: If call interval less than `delay, call works on fixed rate.
 * @return {(Function)} throttled fn.
 */
export function throttle(fn, delay, debounce) {

    var currCall;
    var lastCall = 0;
    var lastExec = 0;
    var timer = null;
    var diff;
    var scope;
    var args;
    var debounceNextCall;

    delay = delay || 0;

    function exec() {
        lastExec = (new Date()).getTime();
        timer = null;
        fn.apply(scope, args || []);
    }

    var cb = function () {
        currCall = (new Date()).getTime();
        scope = this;
        args = arguments;
        var thisDelay = debounceNextCall || delay;
        var thisDebounce = debounceNextCall || debounce;
        debounceNextCall = null;
        diff = currCall - (thisDebounce ? lastCall : lastExec) - thisDelay;

        clearTimeout(timer);

        if (thisDebounce) {
            timer = setTimeout(exec, thisDelay);
        }
        else {
            if (diff >= 0) {
                exec();
            }
            else {
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

    /**
     * Enable debounce once.
     */
    cb.debounceNextCall = function (debounceDelay) {
        debounceNextCall = debounceDelay;
    };

    return cb;
}

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
 * @param {number} [rate]
 * @param {string} [throttleType='fixRate'] 'fixRate' or 'debounce'
 * @return {Function} throttled function.
 */
export function createOrUpdate(obj, fnAttr, rate, throttleType) {
    var fn = obj[fnAttr];

    if (!fn) {
        return;
    }

    var originFn = fn[ORIGIN_METHOD] || fn;
    var lastThrottleType = fn[THROTTLE_TYPE];
    var lastRate = fn[RATE];

    if (lastRate !== rate || lastThrottleType !== throttleType) {
        if (rate == null || !throttleType) {
            return (obj[fnAttr] = originFn);
        }

        fn = obj[fnAttr] = throttle(
            originFn, rate, throttleType === 'debounce'
        );
        fn[ORIGIN_METHOD] = originFn;
        fn[THROTTLE_TYPE] = throttleType;
        fn[RATE] = rate;
    }

    return fn;
}

/**
 * Clear throttle. Example see throttle.createOrUpdate.
 *
 * @public
 * @param {Object} obj
 * @param {string} fnAttr
 */
export function clear(obj, fnAttr) {
    var fn = obj[fnAttr];
    if (fn && fn[ORIGIN_METHOD]) {
        obj[fnAttr] = fn[ORIGIN_METHOD];
    }
}
