
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

    var TIME_UNIT = 1000 / 60;
    var PERF_LINE_SPAN_TIME = TIME_UNIT * 60;
    var PERF_WORK_NORMAL_FILL = 'rgba(3, 163, 14, 0.7)';
    var PERF_WORK_SLOW_FILL = 'rgba(201, 0, 0, 0.7)';
    var PERF_RIC_DETECTED_IDLE_FILL = '#fff';
    // var REPF_MESSAGE_CHANNEL_DETECTED_IDLE_FILL = '#fff';
    // var PERF_MESSAGE_CHANNEL_DETECT_IDLE_SPAN = 0.5; // in ms
    var SLOW_TIME_THRESHOLD = 50;
    var LINE_DEFAULT_WORK_COLOR = '#ccffd5';
    // var LINE_DEFAULT_WORK_COLOR = '#f5dedc';
    var LIST_MAX = 1000000;
    var CSS_HEADER_HEIGHT = 40;
    var CSS_PERF_LINE_HEIGHT = 30;
    var CSS_PERF_CHART_GAP = 10;
    var CSS_PERF_CHART_PADDING = 3;
    var DEFAULT_PERF_CHART_COUNT = 5;
    var BACKGROUND_COLOR = '#eee';

    var _settings;
    var _getChart;
    var _dpr = window && Math.max(window.devicePixelRatio || 1, 1) || 1;
    var _tickWorkStartList = new TickList();
    var _tickWorkEndList = new TickList();
    var _tickFrameStart;
    var _tickFrameStartCanPaint;
    // var _tickMessageChannelList = new TickList();
    var _tickRICStartList = new TickList();
    var _tickRICEndList = new TickList();
    var _started = false;
    var _newestPerfLineIdx = 0;
    var _timelineStart;
    var _renderWidth;
    var _renderHeight;
    var _renderHeaderHeight;
    var _renderPerfLineHeight;
    var _ctx;

    var _original = {
        setTimeout: global.setTimeout,
        requestAnimationFrame: global.requestAnimationFrame,
        addEventListener: global.addEventListener,
        MessageChannel: global.MessageChannel
    };

    // performance.now is not mocked in the visual regression test.
    var now = (typeof performance === 'object' && isFunction(performance.now))
        ? function () {
            return performance.now();
        }
        : function () {
            return +new Date();
        }

    // Make sure call it as early as possible.
    initListening();

    instrumentEnvironment();

    /**
     * @public
     * @param {Object} opt
     * @param {Object} opt.echarts
     * @param {string | HTMLElement} opt.perfDOM
     * @param {string | HTMLElement} opt.lagDOM
     * @param {string | HTMLElement} opt.statisticDOM
     * @param {Function} opt.getChart
     * @param {number} opt.perfChartCount
     * @param {boolean} opt.dontInstrumentECharts
     */
    frameInsight.init = function (opt) {
        _settings = {
            echarts: opt.echarts,
            perfDOM: opt.perfDOM,
            lagDOM: opt.lagDOM,
            statisticDOM: opt.statisticDOM,
            perfChartCount: opt.perfChartCount || DEFAULT_PERF_CHART_COUNT
        };
        _getChart = opt.getChart;

        var start = _timelineStart = now();

        !opt.dontInstrumentECharts && instrumentECharts();
        initResultPanel();
        initLagPanel();
        initStatisticPanel();
        _started = true;
    };

    function instrumentEnvironment() {
        doInstrumentRegistrar('setTimeout', 0);
        doInstrumentRegistrar('requestAnimationFrame', 0);
        doInstrumentRegistrar('addEventListenter', 1);
        instrumentMessageChannel();
    }

    function instrumentECharts() {
        var echarts = _settings.echarts;

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
            return _original[name].apply(this, args);
        };
    }

    function doInstrumentHandler(orginalHandler) {
        return function () {
            var start = now();
            var result = orginalHandler.apply(this, arguments);
            var end = now();
            _tickWorkStartList.push(start);
            _tickWorkEndList.push(end);
            return result;
        };
    }

    function instrumentMessageChannel() {
        global.MessageChannel = function () {
            this._msgChannel = new _original.MessageChannel();
            this.port1 = instrumentPort(this._msgChannel.port1);
            this.port2 = instrumentPort(this._msgChannel.port2);
        };

        function instrumentPort(originalPort) {
            var newPort = {
                postMessage: function () {
                    originalPort.postMessage.apply(originalPort, arguments);
                }
            };
            Object.defineProperty(newPort, 'onmessage', {
                set: function (listener) {
                    originalPort.onmessage = doInstrumentHandler(listener);
                }
            });
            return newPort;
        }
    }

    function initListening() {
        function nextFrame() {
            if (_started) {
                // A trick to make fram start line at the top in z-order.
                _tickFrameStartCanPaint = _tickFrameStart;
                _tickFrameStart = now();
                // console.time('a');
                renderResultPanel();
                // console.timeEnd('a');
            }
            _original.requestAnimationFrame.call(global, nextFrame);
        }
        nextFrame();

        function nextIdle(deadline) {
            if (_started) {
                var start = now();
                var timeRemaining = deadline.timeRemaining();
                _tickRICStartList.push(start);
                _tickRICEndList.push(start + timeRemaining);
            }
            requestIdleCallback(nextIdle);
        }
        nextIdle();

        // Fail: too aggressive
        // Use message channel to detect background long task.
        // var messageChannel = new MessageChannel();
        // messageChannel.port1.onmessage = function () {
        //     if (_started) {
        //         _tickMessageChannelList.push(now());
        //     }
        //     messageChannel.port2.postMessage(null);
        // };
        // messageChannel.port2.postMessage(null);
    }

    function initResultPanel() {
        var panelEl = isString(_settings.perfDOM)
            ? document.getElementById(_settings.perfDOM)
            : _settings.perfDOM;

        var panelElStyle = panelEl.style;
        panelElStyle.position = 'relative';
        // panelElStyle.backgroundColor = '#eee';
        panelElStyle.padding = 0;

        var panelElWidth = getSize(panelEl, 0);
        var cssCanvasHeight = CSS_HEADER_HEIGHT
            + (CSS_PERF_LINE_HEIGHT + CSS_PERF_CHART_GAP) * _settings.perfChartCount;
        _renderWidth = panelElWidth * _dpr;
        _renderHeight = cssCanvasHeight * _dpr;
        _renderHeaderHeight = CSS_HEADER_HEIGHT * _dpr;
        _renderPerfLineHeight = CSS_PERF_LINE_HEIGHT * _dpr;

        var canvas = document.createElement('canvas');
        panelEl.appendChild(canvas);

        canvas.style.cssText = [
            'width: 100%',
            'height: ' + cssCanvasHeight + 'px',
            'padding: 0',
            'margin: 0',
        ].join('; ') + ';';

        canvas.width = _renderWidth;
        canvas.height = _renderHeight;

        _ctx = canvas.getContext('2d');
        _ctx.fillStyle = BACKGROUND_COLOR;
        _ctx.fillRect(0, 0, _renderWidth, _renderHeight);

        initMesureMarkers();
    }

    function initMesureMarkers() {
        _ctx.font = '30px serif';
        _ctx.fillStyle = '#111';
        _ctx.textAlign = 'start';
        _ctx.textBaseline = 'top';
        _ctx.fillText(TIME_UNIT.toFixed(2) + ' ms', 10, 10);

        var measureY = _renderHeaderHeight - 10;
        renderHorizontalLine(measureY, '#333', 1);
        var timeExtentStart = getPerfLineExtentStart(0);
        var timeExtentEnd = getPerfLineExtentEnd(0);
        for (var measureX = timeExtentStart; measureX < timeExtentEnd; measureX += TIME_UNIT) {
            var coord = linearMap(measureX, timeExtentStart, timeExtentEnd, 0, _renderWidth);
            _ctx.strokeStyle = '#333';
            _ctx.lineWidth = 2;
            _ctx.beginPath();
            _ctx.moveTo(coord, measureY - 8);
            _ctx.lineTo(coord, measureY);
            _ctx.stroke();
        }

        for (var i = 0; i < _settings.perfChartCount; i++) {
            var y = getPerfLineY(i) + _renderPerfLineHeight + 1;
            renderHorizontalLine(y, '#ccc', 1);
        }

        function renderHorizontalLine(y, color, lineWidth) {
            _ctx.strokeStyle = color;
            _ctx.lineWidth = lineWidth;
            _ctx.beginPath();
            _ctx.moveTo(0, y);
            _ctx.lineTo(_renderWidth, y);
            _ctx.stroke();
        }
    }

    function getPerfLineIndex(timeVal) {
        var timeOffset = timeVal - _timelineStart;
        return Math.floor(timeOffset / PERF_LINE_SPAN_TIME);
    }

    function getPerfLineExtentStart(perfLineIndex) {
        return _timelineStart + PERF_LINE_SPAN_TIME * perfLineIndex;
    }
    function getPerfLineExtentEnd(perfLineIndex) {
        return _timelineStart + PERF_LINE_SPAN_TIME * (perfLineIndex + 1);
    }

    function getPerfLineY(perfLineIndex) {
        var perfLineNumber = getPerfLineNumber(perfLineIndex);
        return _renderHeaderHeight + perfLineNumber * (_renderPerfLineHeight + CSS_PERF_CHART_GAP * _dpr);
    }

    function getPerfLineNumber(perfLineIndex) {
        return perfLineIndex % _settings.perfChartCount;
    }

    function prepareNextPerfChart(timeVal) {
        var perfChartExtentEnd = getPerfLineExtentEnd(_newestPerfLineIdx);
        if (timeVal <= perfChartExtentEnd) {
            return;
        }

        _newestPerfLineIdx++;
        _ctx.fillStyle = BACKGROUND_COLOR;
        _ctx.fillRect(0, getPerfLineY(_newestPerfLineIdx) - 5, _renderWidth, _renderPerfLineHeight + 5);
    }

    function renderResultPanel() {
        renderDefualtWorkForLastFrame();
        renderRICForLastFrame();
        renderJSWorkForLastFrame();
        renderFrameStartForLastFrame();
        // renderMessageChannelForLastFrame();
    }

    function renderDefualtWorkForLastFrame() {
        // By default deem it as busy. only rIC can render idle rect.
        var timeStart = _tickFrameStartCanPaint != null ? _tickFrameStartCanPaint : _timelineStart;
        var timeEnd = _tickFrameStart;
        prepareNextPerfChart(timeStart);
        prepareNextPerfChart(timeEnd);

        var perfLineIndexStart = getPerfLineIndex(timeStart);
        var perfLineIndexEnd = getPerfLineIndex(timeEnd);

        renderPerfRect(perfLineIndexStart, LINE_DEFAULT_WORK_COLOR, timeStart, timeEnd);
        if (perfLineIndexEnd !== perfLineIndexStart) {
            renderPerfRect(perfLineIndexEnd, LINE_DEFAULT_WORK_COLOR, timeStart, timeEnd);
        }
    }

    function renderRICForLastFrame() {
        for (var i = 0; i < _tickRICStartList.len; i++) {
            var tickRICStart = _tickRICStartList.list[i];
            var tickRICEnd = _tickRICEndList.list[i];
            var perfLineIdxStart = getPerfLineIndex(tickRICStart);
            var perfLineIdxEnd = getPerfLineIndex(tickRICEnd);

            prepareNextPerfChart(tickRICStart);
            prepareNextPerfChart(tickRICEnd);

            renderPerfRect(perfLineIdxStart, PERF_RIC_DETECTED_IDLE_FILL, tickRICStart, tickRICEnd);
            if (perfLineIdxStart !== perfLineIdxEnd) {
                renderPerfRect(perfLineIdxEnd, PERF_RIC_DETECTED_IDLE_FILL, tickRICStart, tickRICEnd);
            }
        };
        _tickRICStartList.len = 0;
        _tickRICEndList.len = 0;
    }

    function renderJSWorkForLastFrame() {
        for (var i = 0; i < _tickWorkStartList.len; i++) {
            var tickWorkStart = _tickWorkStartList.list[i];
            var tickWorkEnd = _tickWorkEndList.list[i];
            var perfLineIdxStart = getPerfLineIndex(tickWorkStart);
            var perfLineIdxEnd = getPerfLineIndex(tickWorkEnd);

            prepareNextPerfChart(tickWorkStart);
            prepareNextPerfChart(tickWorkEnd);

            renderPerfWorkSpan(tickWorkStart, tickWorkEnd, perfLineIdxStart);
            if (perfLineIdxStart !== perfLineIdxEnd) {
                renderPerfWorkSpan(tickWorkStart, tickWorkEnd, perfLineIdxEnd);
            }
        }
        _tickWorkStartList.len = 0;
        _tickWorkEndList.len = 0;
    }

    function renderFrameStartForLastFrame() {
        if (_tickFrameStartCanPaint) {
            prepareNextPerfChart(_tickFrameStartCanPaint);

            var perfLineIndex = getPerfLineIndex(_tickFrameStartCanPaint);
            var perfLineY = getPerfLineY(perfLineIndex);
            var perfTimeExtentStart = getPerfLineExtentStart(perfLineIndex);
            var perfTimeExtentEnd = getPerfLineExtentEnd(perfLineIndex);
            var coord = linearMap(_tickFrameStartCanPaint, perfTimeExtentStart, perfTimeExtentEnd, 0, _renderWidth);
            _ctx.lineWidth = 2;
            _ctx.strokeStyle = '#0037b8';
            _ctx.beginPath();
            _ctx.moveTo(coord, perfLineY - 2);
            _ctx.lineTo(coord, perfLineY + _renderPerfLineHeight);
            _ctx.stroke();
        }
        _tickFrameStartCanPaint = null;
    }

    // function renderMessageChannelForLastFrame() {
    //     var tickIdleStart = _tickMessageChannelList.list[0];
    //     for (var i = 0; i < _tickMessageChannelList.len; i++) {
    //         var tickMsgVal = _tickMessageChannelList.list[i];
    //         prepareNextPerfChart(tickMsgVal);

            // PERF_MESSAGE_CHANNEL_DETECT_IDLE_SPAN

            // renderFrameStart(_tickFrameStartCanPaint, perfLineIndex);
            // var perfLineY = getPerfLineY(perfLineIndex);
            // var perfTimeExtentStart = getPerfLineExtentStart(perfLineIndex);
            // var perfTimeExtentEnd = getPerfLineExtentEnd(perfLineIndex);
            // var coord = linearMap(tickMsgVal, perfTimeExtentStart, perfTimeExtentEnd, 0, _renderWidth);
            // _ctx.lineWidth = 2;
            // _ctx.strokeStyle = '#184561';
            // _ctx.beginPath();
            // _ctx.moveTo(coord, perfLineY - 2);
            // _ctx.lineTo(coord, perfLineY + 10);
            // _ctx.stroke();
        // }
    //     _tickMessageChannelList.len = 0;
    // }

    function renderPerfWorkSpan(timeWorkStart, timeWorkEnd, perfLineIndex) {
        var timeSlow = timeWorkStart + SLOW_TIME_THRESHOLD;

        renderPerfRect(
            perfLineIndex,
            PERF_WORK_NORMAL_FILL,
            timeWorkStart,
            Math.min(timeWorkEnd, timeSlow)
        );

        if (timeWorkEnd > timeSlow) {
            renderPerfRect(
                perfLineIndex,
                PERF_WORK_SLOW_FILL,
                timeSlow,
                timeWorkEnd
            );
        }
    }

    function renderPerfRect(perfLineIndex, color, timeStart, timeEnd) {
        var perfTimeExtentStart = getPerfLineExtentStart(perfLineIndex);
        var perfTimeExtentEnd = getPerfLineExtentEnd(perfLineIndex);
        var realTimeStart = Math.max(timeStart, perfTimeExtentStart);
        var realTimeEnd = Math.min(timeEnd, perfTimeExtentEnd);
        var coordStart = linearMap(realTimeStart, perfTimeExtentStart, perfTimeExtentEnd, 0, _renderWidth);
        var coordEnd = linearMap(realTimeEnd, perfTimeExtentStart, perfTimeExtentEnd, 0, _renderWidth);

        if (coordEnd - coordStart > 0.5) {
            _ctx.fillStyle = color;
            var perfLineY = getPerfLineY(perfLineIndex);
            _ctx.fillRect(
                coordStart,
                perfLineY + CSS_PERF_CHART_PADDING,
                coordEnd - coordStart,
                _renderPerfLineHeight - CSS_PERF_CHART_PADDING
            );
        }
    }

    function initLagPanel() {
        if (!_settings.lagDOM) {
            return;
        }
        var dom = document.getElementById(_settings.lagDOM);
        dom.style.fontSize = 26;
        dom.style.fontFamily = 'Arial';
        // dom.style.color = '#000';
        dom.style.padding = '10px';

        function onFrame() {
            render();
            _original.requestAnimationFrame.call(global, onFrame);
        }

        function render() {
            var time = new Date();
            var timeStr = time.getMinutes() + ':' + time.getSeconds() + '.' + time.getMilliseconds();
            dom.innerHTML = timeStr;
        }

        onFrame();
    }

    function initStatisticPanel() {
        if (!_settings.statisticDOM) {
            return;
        }

        var dom = document.getElementById(_settings.statisticDOM);
        dom.style.fontSize = 14;
        dom.style.fontFamily = 'Arial';
        dom.style.color = '#000';
        dom.style.padding = '5px';
        dom.style.boxShadow = '0 0 5px #000';

        function onFrame() {
            render();
            _original.requestAnimationFrame.call(global, onFrame);
        }

        function render() {
            var chart = _getChart();
            var statistic = chart.getRuntimeStatistic();
            var msg = [
                'lastFrameStartTime: ' + statistic.lastFrameStartTime,
                'lastFrameCost: ' + statistic.lastFrameCost,
                'sampleProcessedDataCount: ' + statistic.sampleProcessedDataCount,
                'samplePipelineStep: ' + statistic.samplePipelineStep,
                'dataProcessedPerFrame: ' + statistic.dataProcessedPerFrame.getLastAvg(),
                'recentOnTickExeTimeAvg: ' + statistic.recentOnTickExeTimeAvg.getLastAvg()
            ];
            dom.innerHTML = msg.join('<br>');
        }

        _original.requestAnimationFrame.call(global, onFrame);
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

    function linearMap(val, domain0, domain1, range0, range1) {
        var subDomain = domain1 - domain0;
        var subRange = range1 - range0;

        if (val <= domain0) {
            return range0;
        }
        if (val >= domain1) {
            return range1;
        }

        return (val - domain0) / subDomain * subRange + range0;
    }

    function parseInt10(val) {
        return parseInt(val, 10);
    }

    function isString(val) {
        return typeof val === 'string'
    }

    function isFunction(val) {
        return typeof val === 'function';
    }

    function TickList() {
        this.list = new Float32Array(LIST_MAX);
        this.len = 0;
    }
    TickList.prototype.push = function (val) {
        this.list[this.len++] = val;
    }

})(window);
