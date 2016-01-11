(function (context) {

    /**
     * @public
     * @type {Object}
     */
    var helper = context.utHelper = {};

    var nativeSlice = Array.prototype.slice;

    /**
     * @param {*} target
     * @param {*} source
     */
    helper.extend = function (target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
        return target;
    }

    /**
     * @public
     */
    helper.g = function (id) {
        return document.getElementById(id);
    };

    /**
     * @public
     */
    helper.removeEl = function (el) {
        var parent = helper.parentEl(el);
        parent && parent.removeChild(el);
    };

    /**
     * @public
     */
    helper.parentEl = function (el) {
        //parentElement for ie.
        return el.parentElement || el.parentNode;
    };

    /**
     * 得到head
     *
     * @public
     */
    helper.getHeadEl = function (s) {
        return document.head
            || document.getElementsByTagName('head')[0]
            || document.documentElement;
    };

    /**
     * @public
     */
    helper.curry = function (func) {
        var args = nativeSlice.call(arguments, 1);
        return function () {
            return func.apply(this, args.concat(nativeSlice.call(arguments)));
        };
    };

    /**
     * @public
     */
    helper.bind = function (func, context) {
        var args = nativeSlice.call(arguments, 2);
        return function () {
            return func.apply(context, args.concat(nativeSlice.call(arguments)));
        };
    };

    /**
     * Load javascript script
     *
     * @param {string} resource Like 'xx/xx/xx.js';
     */
    helper.loadScript = function (url, id, callback) {
        var head = helper.getHeadEl();

        var script = document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('charset', 'utf-8');
        if (id) {
            script.setAttribute('id', id);
        }
        script.setAttribute('src', url);

        // @see jquery
        // Attach handlers for all browsers
        script.onload = script.onreadystatechange = function () {

            if (!script.readyState || /loaded|complete/.test(script.readyState)) {
                // Handle memory leak in IE
                script.onload = script.onreadystatechange = null;
                // Dereference the script
                script = undefined;
                callback && callback();
            }
        };

        // Use insertBefore instead of appendChild  to circumvent an IE6 bug.
        // This arises when a base node is used (jquery #2709 and #4378).
        head.insertBefore(script, head.firstChild);
    };

    /**
     * Reset package loader, where esl is cleaned and reloaded.
     *
     * @public
     */
    helper.resetPackageLoader = function (then) {
        // Clean esl
        var eslEl = helper.g('esl');
        if (eslEl) {
            helper.removeEl(eslEl);
        }
        var eslConfig = helper.g('esl');
        if (eslConfig) {
            helper.removeEl(eslConfig);
        }
        context.define = null;
        context.require = null;

        // Import esl.
        helper.loadScript('esl.js', 'esl', function () {
            helper.loadScript('config.js', 'config', function () {
                then();
            });
        });
    };

    /**
     * @public
     * @param {Array.<string>} deps
     * @param {Array.<Function>} testFnList
     * @param {Function} done All done callback.
     */
    helper.resetPackageLoaderEachTest = function (deps, testFnList, done) {
        var i = -1;
        next();

        function next() {
            i++;
            if (testFnList.length <= i) {
                done();
                return;
            }

            helper.resetPackageLoader(function () {
                window.require(deps, function () {
                    testFnList[i].apply(null, arguments);
                    next();
                });
            });
        }
    };

})(window);