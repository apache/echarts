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
var echarts = require('../../../index');

var utHelper = {};

var nativeSlice = Array.prototype.slice;

utHelper.createChart = function (width, height, theme, opts) {
    var el = document.createElement('div');
    el.style.cssText = [
        'visibility:hidden',
        'width:' + (width || '500') + 'px',
        'height:' + (height || '400') + 'px',
        'position:absolute',
        'bottom:0',
        'right:0'
    ].join(';');
    var chart = echarts.init(el, theme, opts);
    return chart;
};

/**
 * @public
 */
utHelper.removeChart = function (chart) {
    chart.dispose();
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

module.exports = utHelper;
