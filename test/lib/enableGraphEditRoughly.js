(function () {

    var NODE_SIZE_MIN_DEFAULT = 0;
    var NODE_SIZE_MAX_DEFAULT = 300;
    var SELF_LOOP_EDGE_COUNT_MAX = 10;

    /**
     * @param opt
     * @param opt.chart
     * @param opt.option
     * @param opt.seriesId
     *
     * @param opt.drag {boolean} Enable drag nodes and edges.
     *
     * @param opt.editNodeSize {boolean}
     * @param opt.nodeSizeMin `NODE_SIZE_MIN_DEFAULT` by default.
     * @param opt.nodeSizeMax `NODE_SIZE_MAX_DEFAULT` by default.
     *
     * @param opt.editSelfLoopEdgeCount {boolean}
     * @param opt.selfLoopEdgeCountMax `SELF_LOOP_EDGE_COUNT_MAX` by default.
     * @param opt.selfLoopEdgeNodeName {string}
     */
    window.enableGraphEditRoughly = function (opt) {
        if (!opt.chart) {
            return;
        }

        if (opt.drag) {
            enableGraphDrag(opt);
        }
        if (opt.editNodeSize) {
            enableEditNodeSize(opt);
        }
        if (opt.editSelfLoopEdgeCount) {
            enableEditSelfLoopEdgeCount(opt);
        }
    };

    /**
     * @param opt
     * @param opt.chart
     * @param opt.option
     * @param opt.seriesId
     */
    function enableGraphDrag(opt) {
        opt = opt || {};
        var chart = opt.chart;
        var option = opt.option;
        var seriesId = opt.seriesId;

        assert(chart && option && seriesId);

        var zr = chart.getZr();

        /**
         * type Dragging = {
         *    type: 'node',
         *    dataIndex: number,
         *    mouseDownPoint: [number, number],
         * } | {
         *    type: 'edge',
         *    edgeDataIndex: number,
         *    mouseDownPoint: [number, number],
         *    curveness: number
         * }
         */
        var dragging = null;

        var seriesNodesOption = findSeriesNodesOption(option, seriesId);
        var seriesEdgesOption = findSeriesEdgesOption(option, seriesId);

        var seriesModel = findSeriesModel(chart, seriesId);
        var seriesData = seriesModel.getData();
        var seriesEdgeData = seriesModel.getData('edge');

        zr.on('mousedown', function (event) {
            mouseDownPoint = [event.offsetX, event.offsetY];
            var nodeResult = findSeriesDataItemByEvent(seriesData, event);
            if (nodeResult) {
                dragging = {
                    type: 'node',
                    dataIndex: nodeResult.dataIndex,
                    mouseDownPoint: mouseDownPoint
                };
                return;
            }

            var edgeResult = findSeriesDataItemByEvent(seriesEdgeData, event);
            if (edgeResult) {
                dragging = {
                    type: 'edge',
                    edgeDataIndex: edgeResult.dataIndex,
                    mouseDownPoint: mouseDownPoint,
                    curveness: getCurrentCurveness(seriesEdgesOption, edgeResult.dataIndex)
                };
                return;
            }
        });
        zr.on('mousemove', function (event) {
            if (!dragging) {
                return;
            }

            if (dragging.type === 'node') {
                var dataItemOption = seriesNodesOption[dragging.dataIndex];
                var nextDataXY = chart.convertFromPixel(
                    {seriesId: seriesId},
                    [event.offsetX, event.offsetY]
                );
                dataItemOption.x = nextDataXY[0];
                dataItemOption.y = nextDataXY[1];
                chart.setOption({
                    animation: false,
                    series: {
                        id: seriesId,
                        data: seriesNodesOption
                    }
                });
            }
            else if (dragging.type === 'edge') {
                var nextCurveness = getNextCurveness(
                    chart,
                    seriesId,
                    dragging.curveness,
                    [event.offsetX, event.offsetY],
                    seriesEdgeData,
                    dragging.edgeDataIndex
                );
                updateCurvenessOption(seriesEdgesOption, dragging.edgeDataIndex, nextCurveness);

                chart.setOption({
                    animation: false,
                    series: {
                        id: seriesId,
                        edges: seriesEdgesOption
                    }
                });
            }
        });
        zr.on('mouseup', function (event) {
            dragging = null;
        });
    };

    function getNextCurveness(
        chart, seriesId, mouseDownCurveness, mouseMovePoint,
        seriesEdgeData, edgeDataIndex
    ) {
        var edgePoints = getEdgePoints(chart, seriesId, seriesEdgeData, edgeDataIndex)

        var vv = makeVector(edgePoints.from, edgePoints.to);
        var vSqrDist = vectorSquareDist(vv);
        var sign = 1;
        if (!aroundZero(vSqrDist)) {
            var detResult = det(vv, makeVector(mouseMovePoint, edgePoints.from));
            sign = detResult > 0 ? 1 : -1;
        }

        mouseDownCurveness = mouseDownCurveness || 0;
        var dist = distPointToLine(mouseMovePoint, edgePoints.from, edgePoints.to);
        var curveDist = dist / 300;
        return sign * curveDist;
    }

    /**
     * @param opt
     * @param opt.chart
     * @param opt.seriesId
     * @param opt.nodeSizeMin
     * @param opt.nodeSizeMax
     */
    function enableEditNodeSize(opt) {
        opt = opt || {};
        var chart = opt.chart;
        var seriesId = opt.seriesId;

        assert(chart && seriesId);

        prepareControlPanel(chart);

        var nodeSizeMin = opt.nodeSizeMin || NODE_SIZE_MIN_DEFAULT;
        var nodeSizeMax = opt.nodeSizeMax || NODE_SIZE_MAX_DEFAULT;

        addSlider(
            chart.__controlPanelEl,
            'symbol size:',
            nodeSizeMin,
            nodeSizeMax,
            1,
            function (newValue) {
                console.log('symbolSize:', newValue);
                chart.setOption({
                    animation: false,
                    series: {
                        id: seriesId,
                        symbolSize: +newValue
                    }
                });
            }
        );
    };

    /**
     * @param opt
     * @param opt.chart
     * @param opt.seriesId
     * @param opt.option
     * @param opt.selfLoopEdgeCountMax
     * @param opt.selfLoopEdgeNodeName
     */
    function enableEditSelfLoopEdgeCount(opt) {
        opt = opt || {};
        var chart = opt.chart;
        var option = opt.option;
        var seriesId = opt.seriesId;
        var selfLoopEdgeNodeName = opt.selfLoopEdgeNodeName;
        var selfLoopEdgeCountMax = opt.selfLoopEdgeCountMax || SELF_LOOP_EDGE_COUNT_MAX;

        assert(chart && seriesId && option);

        prepareControlPanel(chart);

        addSlider(
            chart.__controlPanelEl,
            'self-loop edge count:',
            0,
            selfLoopEdgeCountMax,
            1,
            function (newValue) {
                console.log('self_loop_edge_count:', newValue);

                var seriesEdgesOption = findSeriesEdgesOption(option, seriesId);
                var seriesModel = findSeriesModel(chart, seriesId);
                var seriesData = seriesModel.getData();

                var edgeCount = 0;
                for (var i = 0; i < seriesEdgesOption.length;) {
                    var seriesEdgeItemOption = seriesEdgesOption[i];
                    var sourceName = findNodeNameByNameOrIndex(seriesData, seriesEdgeItemOption.source);
                    var targetName = findNodeNameByNameOrIndex(seriesData, seriesEdgeItemOption.target);

                    if (sourceName && sourceName === targetName && sourceName === selfLoopEdgeNodeName) {
                        edgeCount++;
                    }
                    if (edgeCount > newValue) {
                        seriesEdgesOption.splice(i, 1);
                    }
                    else {
                        i++;
                    }
                }
                for (var i = edgeCount; i < newValue; i++) {
                    seriesEdgesOption.push({
                        source: selfLoopEdgeNodeName,
                        target: selfLoopEdgeNodeName
                    });
                }

                chart.setOption({
                    animation: false,
                    series: {
                        id: seriesId,
                        edges: seriesEdgesOption,
                        links: null
                    }
                });
            }
        );
    }


    // ----------------------------------
    // Utils
    // ----------------------------------


    function prepareControlPanel(chart) {
        if (chart.__controlPanelEl) {
            return;
        }

        var el = document.createElement('div');
        el.style.cssText = [
            'position: absolute',
            'top: 0',
            'right: 0',
            'padding: 15px;',
            'box-shadow: 0 2px 5px #000',
        ].join(';');

        chart.getDom().appendChild(el);
        chart.__controlPanelEl = el;
    }

    function addSlider(controlPanelEl, labelHTML, min, max, step, onInput) {
        var lineEl = document.createElement('div');
        lineEl.style.cssText = [
            'text-align: right'
        ].join('');
        controlPanelEl.appendChild(lineEl);

        var label = document.createElement('span');
        label.innerHTML = labelHTML;
        label.style.cssText = [
            'vertical-align: middle',
            'padding-right: 10px;'
        ].join(';');
        lineEl.appendChild(label);

        var slider = document.createElement('input');
        slider.style.cssText = [
            'vertical-align: middle'
        ].join('');
        slider.setAttribute('type', 'range');
        slider.setAttribute('min', min);
        slider.setAttribute('max', max);
        slider.setAttribute('step', step);
        slider.oninput = function () {
            valueEl.innerHTML = this.value;
            onInput(this.value);
        };
        lineEl.appendChild(slider);

        var valueEl = document.createElement('span');
        valueEl.style.cssText = [
            'display: inline-block',
            'vertical-align: middle',
            'padding-left: 10px;',
            'min-width: 30px'
        ].join(';');
        lineEl.appendChild(valueEl);
    }

    function findEdgeItemOption(seriesEdgesOption, edgeDataIndex) {
        var edgeItemOption = seriesEdgesOption[edgeDataIndex];
        return edgeItemOption.lineStyle || (edgeItemOption.lineStyle = {});
    }

    function getCurrentCurveness(seriesEdgesOption, edgeDataIndex) {
        var lineStyleOption = findEdgeItemOption(seriesEdgesOption, edgeDataIndex);
        return (lineStyleOption || lineStyleOption.normal || {}).curveness || 0;
    }

    function updateCurvenessOption(seriesEdgesOption, edgeDataIndex, curveness) {
        // format legacy option: `lineStyle.normal.curveness`
        for (var i = 0; i < seriesEdgesOption.length; i++) {
            var edgeItemOption = seriesEdgesOption[i];
            var lineStyleOption = edgeItemOption.lineStyle;
            if (lineStyleOption && lineStyleOption.normal) {
                extend(lineStyleOption, lineStyleOption.normal);
            }
        }

        var lineStyleOption = findEdgeItemOption(seriesEdgesOption, edgeDataIndex);
        lineStyleOption.curveness = curveness || 0;

        console.log('edgeDataIndex: ', edgeDataIndex, 'curveness: ', lineStyleOption.curveness);
    }

    function getEdgePoints(chart, seriesId, seriesEdgeData, edgeDataIndex) {
        var edgeLayout = seriesEdgeData.getItemLayout(edgeDataIndex);
        assert(edgeLayout && edgeLayout.__original);
        var originalPoints = edgeLayout.__original;
        assert(originalPoints[0] && originalPoints[1]);
        return {
            from: chart.convertToPixel({seriesId: seriesId}, originalPoints[0]),
            to: chart.convertToPixel({seriesId: seriesId}, originalPoints[1])
        };
    }

    function findSeriesNodesOption(option, seriesId) {
        var seriesOption = findSeriesOption(option, seriesId);
        var seriesNodesOption = seriesOption.data || seriesOption.nodes;
        assert(isArray(seriesNodesOption));
        return seriesNodesOption;
    }

    function findSeriesEdgesOption(option, seriesId) {
        var seriesOption = findSeriesOption(option, seriesId);
        var seriesEdgesOption = seriesOption.edges || seriesOption.links;
        assert(isArray(seriesEdgesOption));
        return seriesEdgesOption;
    }

    function findSeriesOption(option, seriesId) {
        var seriesOption = (
            isArray(option.series) ? option.series : [option.series]
        ).filter(function (seriesOpt) {
            return seriesOpt.id === seriesId;
        })[0];
        assert(seriesOption);
        return seriesOption;
    }

    function findSeriesModel(chart, seriesId) {
        var seriesModel = chart.getModel().getSeries().filter(function (series) {
            return series.id === seriesId
        })[0];
        assert(seriesModel);
        return seriesModel;
    }

    function findNodeNameByNameOrIndex(seriesEdgeData, nameOfIndex) {
        if (isNumber(nameOfIndex)) {
            return seriesEdgeData.getName(nameOfIndex);
        }
        else {
            return nameOfIndex;
        }
    }

    // The input el will also be called to cb.
    function travelAncestor(el, cb) {
        var currEl = el
        while (currEl) {
            var stop = cb(currEl);
            if (stop) {
                break;
            }
            currEl = currEl.parent ? currEl.parent
                // text el attached to some element
                : currEl.__hostTarget ? currEl.__hostTarget
                : null;
        }
    }

    function findSeriesDataItemByEvent(seriesData, event) {
        var eventTarget = event.target;
        if (!eventTarget) {
            return;
        }

        for (var i = 0, len = seriesData.count(); i < len; i++) {
            var itemEl = seriesData.getItemGraphicEl(i);

            var isThisItem;
            travelAncestor(eventTarget, function (ancestorEl) {
                if (ancestorEl === itemEl) {
                    isThisItem = true;
                    return true;
                }
            });

            if (isThisItem) {
                return {
                    dataIndex: i,
                    el: itemEl
                };
            }
        }
    }

    function assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    function isArray(some) {
        return Object.prototype.toString.call(some) === '[object Array]';
    }

    function makeVector(from, to) {
        return [to[0] - from[0], to[1] - from[1]];
    }

    function det(v0, v1) {
        return v0[0] * v1[1] - v0[1] * v1[0];
    }

    function dot(v0, v1) {
        return v0[0] * v1[0] + v0[1] * v1[1];
    }

    function vectorSquareDist(vv) {
        return vv[0] * vv[0] + vv[1] * vv[1];
    }

    function distPointToLine(point, v0, v1) {
        var pv = makeVector(v0, point);
        var vv = makeVector(v0, v1);
        var vSqrDist = vectorSquareDist(vv);
        if (aroundZero(vSqrDist)) {
            return vectorSquareDist(pv);
        }

        var tt = dot(pv, vv) / vSqrDist;
        tt = Math.max(0, Math.min(1, tt));
        var crossPoint = [v0[0] + tt * vv[0], v0[1] + tt * vv[1]];
        var sqrDist = vectorSquareDist(makeVector(point, crossPoint));

        return Math.sqrt(sqrDist);
    }

    function aroundZero(v) {
        return Math.abs(v) < 1e-4;
    }

    function isNumber(v) {
        return Object.prototype.toString.call(v) === '[object Number]';
    }

    function extend(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
        return target;
    }

})();
