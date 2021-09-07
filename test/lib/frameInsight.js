
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

(function (global) {

    var frameInsight = global.frameInsight = {};

    var DURATION_CHART_DURATION = 3000;
    var DURATION_CHART_PADDING_V = 0.05;
    var DURATION_CHART_PADDING_TOP = 0.05;
    var DURATION_CHART_PADDING_BOTTOM = 0.05;
    var DURATION_CHART_NORMAL_FILL = 'green';
    var DURATION_CHART_SLOW_FILL = 'red';
    var SLOW_THRESHOLD = 50;

    var settings;
    var dpr = window && Math.max(window.devicePixelRatio || 1, 1) || 1;
    var durationChart = {
        ticks: [],
        tickTypes: [],
        tags: []
    };
    var original = {
        setTimeout: global.setTimeout,
        requestAnimationFrame: global.requestAnimationFrame,
        addEventListener: global.addEventListener
    };

    // var now = global.performance
    //     // performance.now has higer accuracy.
    //     ? performance.now.bind(performance)
    //     : function () {
    //         return +new Date();
    //     };

    // performance.now is not mocked in the visual regression test. Always use Date.now
    var now = function () {
        return Date.now();
    };

    instrumentBase();

    /**
     * @public
     * @param {Object} echarts
     * @param {string} durationChartDom
     */
    frameInsight.init = function (echarts, durationChartDom, dontInstrumentECharts) {
        settings = {
            echarts: echarts,
            durationChartDom: durationChartDom
        };

        !dontInstrumentECharts && instrumentECharts();
        initDurationChart();
        startDurationChart();
    };

    function startDurationChart() {
        next();

        function next() {
            renderDurationChart();
            original.requestAnimationFrame.call(global, next);
        }
    }

    function instrumentBase() {
        doInstrumentRegistrar('setTimeout', 0);
        doInstrumentRegistrar('requestAnimationFrame', 0);
        doInstrumentRegistrar('addEventListenter', 1);
    }

    function instrumentECharts() {
        var echarts = settings.echarts;

        var dummyDom = document.createElement('div');
        var dummyChart = echarts.init(dummyDom, null, {width: 10, height: 10});
        var ECClz = dummyChart.constructor;
        dummyChart.dispose();

        ECClz.prototype.setOption = doInstrumentHandler(ECClz.prototype.setOption, 'setOption');
    }

    function doInstrumentRegistrar(name, handlerIndex) {
        global[name] = function () {
            var args = [].slice.call(arguments);
            args[handlerIndex] = doInstrumentHandler(args[handlerIndex], name);
            return original[name].apply(this, args);
        };
    }

    function doInstrumentHandler(orginalHandler, tag) {
        return function () {
            var start = now();
            var result = orginalHandler.apply(this, arguments);
            var end = now();
            addTick(start, end, tag);
            return result;
        };
    }

    function addTick(start, end, tag) {
        var ticks = durationChart.ticks;
        var tickTypes = durationChart.tickTypes;
        var tags = durationChart.tags;

        // Arbitrary number.
        if (end - start > 0.3) {

            // In case that setOption in event listener.
            var lastIndex = tickTypes.length - 1;
            if (tickTypes[lastIndex] === 0) {
                tickTypes[lastIndex] = end;
                tags[lastIndex] = tag;
            }
            else {
                ticks.push(start, end);
                // 0: start, 1: end
                tickTypes.push(0, 1);
                tag = tag;
                tags.push(tag, tag);
            }
        }

        if (!ticks.length) {
            return;
        }

        var newStart = end - DURATION_CHART_DURATION;
        var dropCount = 0;
        for (var i = 0; i < ticks.length; i++) {
            var tick = ticks[i];
            if (tick < newStart) {
                dropCount++;
            }
        }
        if (dropCount > 0) {
            ticks.splice(0, dropCount);
            tickTypes.splice(0, dropCount);
            tags.splice(0, dropCount);
        }
    }

    function initDurationChart() {
        var dom = document.getElementById(settings.durationChartDom);
        var domStyle = dom.style;
        // domStyle.border = '2px solid #333';
        domStyle.boxShadow = '0 0 3px #000';
        domStyle.backgroundColor = '#eee';
        domStyle.padding = '0';
        domStyle.height = '60px';
        domStyle.margin = '10px 20px';

        var domWidth = getSize(dom, 0);
        var domHeight = getSize(dom, 1);

        durationChart.canvas = document.createElement('canvas');
        dom.appendChild(durationChart.canvas);
        durationChart.canvas.style.width = domWidth + 'px';
        durationChart.canvas.style.height = domHeight + 'px';
        durationChart.width = durationChart.canvas.width = domWidth * dpr;
        durationChart.height = durationChart.canvas.height = domHeight * dpr;

        durationChart.ctx = durationChart.canvas.getContext('2d');

        var paddingV = durationChart.width * DURATION_CHART_PADDING_V;
        var paddingTop = durationChart.height * DURATION_CHART_PADDING_TOP;
        var paddingBottom = durationChart.height * DURATION_CHART_PADDING_BOTTOM;
        durationChart.bodyLeft = paddingV;
        durationChart.bodyWidth = durationChart.width - 2 * paddingV;
        durationChart.bodyTop = paddingTop;
        durationChart.bodyHeight = durationChart.height - paddingTop - paddingBottom;

        durationChart.renderExtent = [durationChart.bodyLeft, durationChart.bodyLeft + durationChart.bodyWidth];
        var extent = [0, DURATION_CHART_DURATION];
        durationChart.slowThresholdLength =
            linearMap(SLOW_THRESHOLD, extent, durationChart.renderExtent)
            - linearMap(0, extent, durationChart.renderExtent);
    }

    function renderDurationChart() {
        // var renderStart = now();

        var ticks = durationChart.ticks;
        var tickTypes = durationChart.tickTypes;
        var ctx = durationChart.ctx;
        var timeEnd = now();
        var timeExtent = [timeEnd - DURATION_CHART_DURATION, timeEnd];
        var slowThresholdLength = durationChart.slowThresholdLength;

        ctx.clearRect(0, 0, durationChart.width, durationChart.height);

        ctx.fillStyle = DURATION_CHART_NORMAL_FILL;

        var x;
        var slowRects = [];

        if (tickTypes[0] === 1) {
            x = durationChart.bodyLeft;
        }

        for (var i = 0; i < ticks.length; i++) {
            var tick = ticks[i];
            var tickType = tickTypes[i];

            var tickCoord = linearMap(tick, timeExtent, durationChart.renderExtent);
            if (tickType === 0) {
                x = tickCoord;
            }
            else if (tickType === 1) {
                var width = Math.max(tickCoord - x, 0.5);
                ctx.fillRect(x, durationChart.bodyTop, width, durationChart.bodyHeight);
                if (width > slowThresholdLength) {
                    slowRects.push(
                        x + slowThresholdLength,
                        durationChart.bodyTop,
                        width - slowThresholdLength,
                        durationChart.bodyHeight
                    );
                }
            }
        }

        if (slowRects.length) {
            for (var i = 0; i < slowRects.length;) {
                var x = slowRects[i++];
                var y = slowRects[i++];
                var width = slowRects[i++];
                var height = slowRects[i++];
                var canvasGradient = ctx.createLinearGradient(x, y, x + width, y);
                canvasGradient.addColorStop(0, DURATION_CHART_NORMAL_FILL);
                canvasGradient.addColorStop(1, DURATION_CHART_SLOW_FILL);
                ctx.fillStyle = canvasGradient;
                ctx.fillRect(x, y, width, height);
            }
        }

        // var renderDuration = now() - renderStart;
        // if (renderDuration > 1) {
            // console.warn(renderDuration);
        // }
    }

    function linearMap(val, domain, range) {
        var subDomain = domain[1] - domain[0];
        var subRange = range[1] - range[0];

        if (val <= domain[0]) {
            return range[0];
        }
        if (val >= domain[1]) {
            return range[1];
        }

        return (val - domain[0]) / subDomain * subRange + range[0];
    }

    function getSize(root, whIdx) {
        var wh = ['width', 'height'][whIdx];
        var cwh = ['clientWidth', 'clientHeight'][whIdx];
        var plt = ['paddingLeft', 'paddingTop'][whIdx];
        var prb = ['paddingRight', 'paddingBottom'][whIdx];

        // IE8 does not support getComputedStyle, but it use VML.
        var stl = document.defaultView.getComputedStyle(root);

        return (
            (root[cwh] || parseInt10(stl[wh]) || parseInt10(root.style[wh]))
            - (parseInt10(stl[plt]) || 0)
            - (parseInt10(stl[prb]) || 0)
        ) | 0;
    }

    function parseInt10(val) {
        return parseInt(val, 10);
    }

})(window);
