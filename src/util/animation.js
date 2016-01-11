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
        var elExistsMap = {};
        var doneCallback;

        return {

            /**
             * Caution: a el can only be added once, otherwise 'done'
             * might not be called. This method checks this (by el.id),
             * suppresses adding and returns false when existing el found.
             *
             * @param {modele:zrender/Element} el
             * @param {Object} target
             * @param {number} [time=500]
             * @param {number} [delay=0]
             * @param {string} [easing='linear']
             * @return {boolean} Whether adding succeeded.
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

                if (elExistsMap[el.id]) {
                    return false;
                }
                elExistsMap[el.id] = 1;

                storage.push(
                    {el: el, target: target, time: time, delay: delay, easing: easing}
                );

                return true;
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
                var count = storage.length;

                for (var i = 0, len = storage.length; i < len; i++) {
                    var item = storage[i];
                    item.el.animateTo(item.target, item.time, item.delay, item.easing, done);
                }

                return this;

                function done() {
                    count--;
                    if (!count) {
                        storage.length = 0;
                        elExistsMap = {};
                        doneCallback && doneCallback();
                    }
                }
            }
        };
    }

    return {createWrap: createWrap};
});