 define(function(require) {

    var zrUtil = require('zrender/core/util');

    /**
     * @param {number} [time=500] Time in ms
     * @param {string} [easing='linear']
     * @param {number} [delay=0]
     * @param {Function} [callback]
     *
     * @example
     *  // Animate position
     *  animation
     *      .createWrap()
     *      .add(el1, {position: [10, 10]})
     *      .add(el2, {shape: {width: 500}, style: {fill: 'red'}}, 400)
     *      .done(function () { // done })
     *      .start('cubicOut');
     */
    function createWrap() {

        var storage = [];
        var doneCallback;

        return {

            /**
             * @param {modele:zrender/Element} el
             * @param {Object} target
             * @param {number} [time=500]
             * @param {number} [delay=0]
             * @param {string} [easing='linear']
             *
             * @example
             *     add(el, target, time, delay, easing);
             *     add(el, target, time, easing);
             *     add(el, target, time);
             *     add(el, target);
             */
            add: function (el, target, time, delay, easing) {
                if (zrUtil.isString(delay)) {
                    easing = delay;
                    delay = 0;
                }

                storage.push(
                    {el: el, target: target, time: time, delay: delay, easing: easing}
                );
                return this;
            },

            /**
             * Only execute when animation finished. Will not execute when any
             * of 'stop' or 'stopAnimation' called.
             *
             * @param {Function} callback
             */
            done: function (callback) {
                doneCallback = callback;
                return this;
            },

            /**
             * Will stop exist animation firstly.
             */
            start: function () {

                // Stop exist animation.
                for (var i = 0, len = storage.length; i < len; i++) {
                    var item = storage[i];
                    item.el
                        .stopAnimation()
                        .animateToShallow(item.target, item.time, item.delay);
                }

                var count = 0;
                for (var i = 0, len = storage.length; i < len; i++) {
                    count += storage[i].el.animators.length;
                }
console.log(count);
                // No animators. This should be checked before animators[i].start(),
                // because 'done' may be executed immediately if no need to animate.
                if (!count) {
                    doneCallback && doneCallback();
                }

                for (var i = 0, len = storage.length; i < len; i++) {
                    // Animators may be removed immediately after start
                    // if there is nothing to animate. So do reverse travel.
                    var item = storage[i];
                    var animators = item.el.animators;
                    for (var j = animators.length - 1; j >= 0; j--) {
                        animators[j].done(done).start(item.easing);
                    }
                }

                return this;

                function done() {
                    count--;
                    if (!count) {
                        storage.length = 0;
                        doneCallback && doneCallback();
                    }
                }
            }
        };
    }

    return {createWrap: createWrap};
});