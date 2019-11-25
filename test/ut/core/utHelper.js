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
 * @public
 * @type {Object}
 */
var utHelper = {};

var nativeSlice = Array.prototype.slice;


utHelper.genContext = function (props, originalContext) {
    var context = {};
    if (originalContext) {
        for (var key in originalContext) {
            if (originalContext.hasOwnProperty(key)) {
                context[key] = originalContext[key];
            }
        }
    }
    if (props) {
        for (var key in props) {
            if (props.hasOwnProperty(key)) {
                context[key] = props[key];
            }
        }
    }
    return context;
};

utHelper.createChart = function (context, echarts) {
    context.chartCount || (context.chartCount = 1);
    var els = [];
    var charts = [];
    for (var i = 0; i < context.chartCount; i++) {
        var el = document.createElement('div');
        document.body.appendChild(el);
        el.style.cssText = [
            'visibility:hidden',
            'width:' + (context.width || '500') + 'px',
            'height:' + (context.height || '400') + 'px',
            'position:absolute',
            'bottom:0',
            'right:0'
        ].join(';');
        els.push(el);
        charts.push(echarts.init(el, null, {}));
    }
    return { charts: charts, els: els };
};

utHelper.removeChart = function (createResult) {
    for (var i = 0; i < createResult.charts.length; i++) {
        var chart = createResult.charts[i];
        chart && chart.dispose();
    }
    for (var i = 0; i < createResult.els.length; i++) {
        var el = createResult.els[i];
        el && document.body.removeChild(el);
    }
};

/**
 * @param {*} target
 * @param {*} source
 */
utHelper.extend = function (target, source) {
    for (var key in source) {
        if (source.hasOwnProperty(key)) {
            target[key] = source[key];
        }
    }
    return target;
};

/**
 * @public
 */
utHelper.g = function (id) {
    return document.getElementById(id);
};

/**
 * @public
 */
utHelper.removeEl = function (el) {
    var parent = utHelper.parentEl(el);
    parent && parent.removeChild(el);
};

/**
 * @public
 */
utHelper.parentEl = function (el) {
    //parentElement for ie.
    return el.parentElement || el.parentNode;
};

/**
 * 得到head
 *
 * @public
 */
utHelper.getHeadEl = function (s) {
    return document.head
        || document.getElementsByTagName('head')[0]
        || document.documentElement;
};

/**
 * @public
 */
utHelper.curry = function (func) {
    var args = nativeSlice.call(arguments, 1);
    return function () {
        return func.apply(this, args.concat(nativeSlice.call(arguments)));
    };
};

/**
 * @public
 */
utHelper.bind = function (func, context) {
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
utHelper.loadScript = function (url, id, callback) {
    var head = utHelper.getHeadEl();

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
utHelper.resetAMDLoader = function (then) {
    // Clean esl
    var eslEl = utHelper.g('esl');
    if (eslEl) {
        utHelper.removeEl(eslEl);
    }
    var eslConfig = utHelper.g('esl');
    if (eslConfig) {
        utHelper.removeEl(eslConfig);
    }
    context.define = null;
    context.require = null;

    // Import esl.
    utHelper.loadScript('../lib/esl.js', 'esl', function () {
        utHelper.loadScript('lib/config.js', 'config', function () {
            then();
        });
    });
};

/**
 * @public
 */
utHelper.isValueFinite = function (val) {
    return val != null && val !== '' && isFinite(val);
};

/**
 * @public
 * @param {Array.<string>} deps
 * @param {Array.<Function>} testFnList
 * @param {Function} done All done callback.
 */
utHelper.resetAMDLoaderEachTest = function (deps, testFnList, done) {
    var i = -1;
    next();

    function next() {
        i++;
        if (testFnList.length <= i) {
            done();
            return;
        }

        utHelper.resetAMDLoader(function () {
            global.require(deps, function () {
                testFnList[i].apply(null, arguments);
                next();
            });
        });
    }
};

utHelper.getGraphicElements = function (chartOrGroup, mainType, index) {
    if (chartOrGroup.type === 'group') {
        return chartOrGroup.children();
    }
    else {
        var viewGroup = utHelper.getViewGroup(chartOrGroup, mainType, index);
        if (viewGroup) {
            var list = [viewGroup];
            viewGroup.traverse(function (el) {
                list.push(el);
            });
            return list;
        }
        else {
            return [];
        }
    }
};

utHelper.getViewGroup = function (chart, mainType, index) {
    var component = chart.getModel().getComponent(mainType, index);
    return component ? chart[
        mainType === 'series' ? '_chartsMap' : '_componentsMap'
    ][component.__viewId].group : null;
};

/**
 * @public
 */
utHelper.printElement = function (el) {
    var result = {};
    var props = ['position', 'scale', 'rotation', 'style', 'shape'];
    for (var i = 0; i < props.length; i++) {
        result[props[i]] = el[props[i]];
    }
    return global.JSON.stringify(result, null, 4);
};

/**
 * @public
 */
utHelper.print = function (str) {
    if (typeof console !== 'undefined') {
        console.log(str);
    }
};

module.exports = utHelper;
