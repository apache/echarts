define(function (require) {

    var mathMax = Math.max;
    var mathMin = Math.min;
    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var parsePercent = numberUtil.parsePercent;
    var retrieveValue = require('../../util/model').retrieveValue;
    var helper = require('./helper');

    var TreemapLayout = function () {
        // FIXME
        // 如果看效果不需要stick，则改成function形式的layout。
    };

    TreemapLayout.prototype = {

        constructor: TreemapLayout,

        /**
         * @override
         */
        update: function (ecModel, api, payload) {
            // Layout result in each node:
            // {x, y, width, height, area, borderWidth}
            ecModel.eachSeriesByType('treemap', function (seriesModel) {

                if (helper.irrelevant(payload, seriesModel)) {
                    return;
                }

                // Set container size
                var size = seriesModel.get('size') || []; // Compatible with ec2.
                var containerSize = seriesModel.setContainerSize([
                    parsePercent(
                        retrieveValue(seriesModel.get('width'), size[0]),
                        api.getWidth()
                    ),
                    parsePercent(
                        retrieveValue(seriesModel.get('height'), size[1]),
                        api.getHeight()
                    )
                ]);

                var payloadType = payload && payload.type;
                var payloadSize = payloadType === 'treemapZoomToNode'
                    ? estimateRootSize(payload, seriesModel, containerSize[0], containerSize[1])
                    : payloadType === 'treemapRender'
                    ? [payload.viewRect.width, payload.viewRect.height]
                    : null;

                var options = {
                    squareRatio: seriesModel.get('squareRatio'),
                    sort: seriesModel.get('sort'),
                    rootSize: payloadSize || containerSize.slice()
                };

                this.squarify(seriesModel.getViewRoot(), options);

            }, this);
        },

        /**
         * Layout treemap with squarify algorithm.
         * @see https://graphics.ethz.ch/teaching/scivis_common/Literature/squarifiedTreeMaps.pdf
         * @see https://github.com/mbostock/d3/blob/master/src/layout/treemap.js
         *
         * @protected
         * @param {module:echarts/data/Tree~TreeNode} node
         * @param {Object} options
         * @param {Array.<number>} [options.rootSize]
         * @param {number} [options.squareRatio]
         */
        squarify: function (node, options) {
            var width;
            var height;

            if (node.isRemoved()) {
                return;
            }

            if (options.notRoot) {
                var thisLayout = node.getLayout();
                width = thisLayout.width;
                height = thisLayout.height;
            }
            else {
                var rootSize = options.rootSize;
                width = rootSize[0];
                height = rootSize[1];
                node.setLayout({
                    x: 0, y: 0, width: width, height: height,
                    area: width * height
                });
            }

            // Considering border and gap
            var itemStyleModel = node.getModel('itemStyle.normal');
            var borderWidth = itemStyleModel.get('borderWidth');
            var halfGapWidth = itemStyleModel.get('gapWidth') / 2;
            var layoutOffset = borderWidth - halfGapWidth;

            width = mathMax(width - 2 * layoutOffset, 0);
            height = mathMax(height - 2 * layoutOffset, 0);

            node.setLayout({borderWidth: borderWidth}, true);

            var viewChildren = initChildren(node, width, height, options);

            if (!viewChildren.length) {
                return;
            }

            var rect = {x: layoutOffset, y: layoutOffset, width: width, height: height};
            var rowFixedLength = mathMin(width, height);
            var best = Infinity; // the best row score so far
            var row = [];
            row.area = 0;

            for (var i = 0, len = viewChildren.length; i < len;) {
                var child = viewChildren[i];

                row.push(child);
                row.area += child.getLayout().area;
                var score = worst(row, rowFixedLength, options.squareRatio);

                // continue with this orientation
                if (score <= best) {
                    i++;
                    best = score;
                }
                // abort, and try a different orientation
                else {
                    row.area -= row.pop().getLayout().area;
                    position(row, rowFixedLength, rect, halfGapWidth, false);
                    rowFixedLength = mathMin(rect.width, rect.height);
                    row.length = row.area = 0;
                    best = Infinity;
                }
            }

            if (row.length) {
                position(row, rowFixedLength, rect, halfGapWidth, true);
            }

            options.notRoot = true;
            for (var i = 0, len = viewChildren.length; i < len; i++) {
                // The object "options" can be reused when tail recursion.
                this.squarify(viewChildren[i], options);
            }
        }
    };

    /**
     * Set area to each child, and calculate data extent for visual coding.
     */
    function initChildren(node, width, height, options) {
        var viewChildren = node.children || [];
        var nodeModel = node.getModel();
        var orderBy = options.sort;
        orderBy !== 'asc' && orderBy !== 'desc' && (orderBy = null);

        // Sort children, order by desc.
        viewChildren = zrUtil.filter(viewChildren, function (child) {
            return !child.isRemoved();
        });

        sort(viewChildren, orderBy);

        var info = statistic(nodeModel, viewChildren, orderBy);

        if (info.sum === 0) {
            return node.viewChildren = [];
        }

        var totalArea = width * height;

        info.sum = filterByThreshold(nodeModel, totalArea, info.sum, orderBy, viewChildren);

        if (info.sum === 0) {
            return node.viewChildren = [];
        }

        // Set area to each child.
        for (var i = 0, len = viewChildren.length; i < len; i++) {
            var area = viewChildren[i].getValue() / info.sum * totalArea;
            // Do not use setLayout({...}, true), because it is needed to clear last layout.
            viewChildren[i].setLayout({area: area});
        }

        node.viewChildren = viewChildren;
        node.setLayout({dataExtent: info.dataExtent}, true);

        return viewChildren;
    }

    /**
     * Consider 'visibleMin'. Modify viewChildren and get new sum.
     */
    function filterByThreshold(nodeModel, totalArea, sum, orderBy, orderedChildren) {

        // visibleMin is not supported yet when no option.sort.
        if (!orderBy) {
            return sum;
        }

        var visibleMin = nodeModel.get('visibleMin');
        var len = orderedChildren.length;
        var deletePoint = len;

        // Always travel from little value to big value.
        for (var i = len - 1; i >= 0; i--) {
            var value = orderedChildren[
                orderBy === 'asc' ? len - i - 1 : i
            ].getValue();

            if (value / sum * totalArea < visibleMin) {
                deletePoint = i;
                sum -= value;
            }
        }

        orderBy === 'asc'
            ? orderedChildren.splice(0, len - deletePoint)
            : orderedChildren.splice(deletePoint, len - deletePoint);

        return sum;
    }

    /**
     * Sort
     */
    function sort(viewChildren, orderBy) {
        if (orderBy) {
            viewChildren.sort(function (a, b) {
                return orderBy === 'asc'
                    ?  a.getValue() - b.getValue() : b.getValue() - a.getValue();
            });
        }
        return viewChildren;
    }

    /**
     * Statistic
     */
    function statistic(nodeModel, children, orderBy) {
        // Calculate sum.
        var sum = 0;
        for (var i = 0, len = children.length; i < len; i++) {
            sum += children[i].getValue();
        }

        // Statistic data extent for latter visual coding.
        // Notice: data extent should be calculate based on raw children
        // but not filtered view children, otherwise visual mapping will not
        // be stable when zoom (where children is filtered by visibleMin).

        var dimension = nodeModel.get('visualDimension');
        var dataExtent;

        // The same as area dimension.
        if (!children || !children.length) {
            dataExtent = [NaN, NaN];
        }
        else if (dimension === 'value' && orderBy) {
            dataExtent = [
                children[children.length - 1].getValue(),
                children[0].getValue()
            ];
            orderBy === 'asc' && dataExtent.reverse();
        }
        // Other dimension.
        else {
            var dataExtent = [Infinity, -Infinity];
            zrUtil.each(children, function (child) {
                var value = child.getValue(dimension);
                value < dataExtent[0] && (dataExtent[0] = value);
                value > dataExtent[1] && (dataExtent[1] = value);
            });
        }

        return {sum: sum, dataExtent: dataExtent};
    }

    /**
     * Computes the score for the specified row,
     * as the worst aspect ratio.
     */
    function worst(row, rowFixedLength, ratio) {
        var areaMax = 0;
        var areaMin = Infinity;

        for (var i = 0, area, len = row.length; i < len; i++) {
            if (area = row[i].getLayout().area) {
                area < areaMin && (areaMin = area);
                area > areaMax && (areaMax = area);
            }
        }

        var squareArea = row.area * row.area;
        var f = rowFixedLength * rowFixedLength * ratio;

        return squareArea
            ? mathMax(
                (f * areaMax) / squareArea,
                squareArea / (f * areaMin)
            )
            : Infinity;
    }

    /**
     * Positions the specified row of nodes. Modifies `rect`.
     */
    function position(row, rowFixedLength, rect, halfGapWidth, flush) {
        // When rowFixedLength === rect.width,
        // it is horizontal subdivision,
        // rowFixedLength is the width of the subdivision,
        // rowOtherLength is the height of the subdivision,
        // and nodes will be positioned from left to right.

        // wh[idx0WhenH] means: when horizontal,
        //      wh[idx0WhenH] => wh[0] => 'width'.
        //      xy[idx1WhenH] => xy[1] => 'y'.
        var idx0WhenH = rowFixedLength === rect.width ? 0 : 1;
        var idx1WhenH = 1 - idx0WhenH;
        var xy = ['x', 'y'];
        var wh = ['width', 'height'];

        var last = rect[xy[idx0WhenH]];
        var rowOtherLength = rowFixedLength
            ? row.area / rowFixedLength : 0;

        if (flush || rowOtherLength > rect[wh[idx1WhenH]]) {
            rowOtherLength = rect[wh[idx1WhenH]]; // over+underflow
        }

        for (var i = 0, rowLen = row.length; i < rowLen; i++) {
            var node = row[i];
            var nodeLayout = {};
            var step = rowOtherLength
                ? node.getLayout().area / rowOtherLength : 0;

            var wh1 = nodeLayout[wh[idx1WhenH]] = mathMax(rowOtherLength - 2 * halfGapWidth, 0);

            // We use Math.max/min to avoid negative width/height when considering gap width.
            var remain = rect[xy[idx0WhenH]] + rect[wh[idx0WhenH]] - last;
            var modWH = (i === rowLen - 1 || remain < step) ? remain : step;
            var wh0 = nodeLayout[wh[idx0WhenH]] = mathMax(modWH - 2 * halfGapWidth, 0);

            nodeLayout[xy[idx1WhenH]] = rect[xy[idx1WhenH]] + mathMin(halfGapWidth, wh1 / 2);
            nodeLayout[xy[idx0WhenH]] = last + mathMin(halfGapWidth, wh0 / 2);

            last += modWH;

            node.setLayout(nodeLayout, true);
        }

        rect[xy[idx1WhenH]] += rowOtherLength;
        rect[wh[idx1WhenH]] -= rowOtherLength;
    }

    function estimateRootSize(payload, seriesModel, viewWidth, viewHeight) {
        var targetInfo = helper.retrieveTargetNodeInfo(payload, seriesModel);
        // If targetInfo.node exists, we zoom to the node,
        // so estimate whold width and heigth by target node.
        var currNode = (targetInfo || {}).node;

        if (!currNode || currNode === seriesModel.getViewRoot()) {
            return;
        }

        var parent;
        var viewArea = viewWidth * viewHeight;
        var area = viewArea * seriesModel.get('zoomToNodeRatio');

        while (parent = currNode.parentNode) {
            var sum = 0;
            var siblings = parent.children;

            for (var i = 0, len = siblings.length; i < len; i++) {
                sum += siblings[i].getValue();
            }
            var currNodeValue = currNode.getValue();
            if (currNodeValue === 0) {
                return;
            }
            area *= sum / currNodeValue;

            var borderWidth = parent.getModel('itemStyle.normal').get('borderWidth');

            if (isFinite(borderWidth)) {
                // Considering border, suppose aspect ratio is 1.
                area += 4 * borderWidth * borderWidth + 4 * borderWidth * Math.pow(area, 0.5);
            }

            area > numberUtil.MAX_SAFE_INTEGER && (area = numberUtil.MAX_SAFE_INTEGER);

            currNode = parent;
        }

        area < viewArea && (area = viewArea);
        var scale = Math.pow(area / viewArea, 0.5);

        return [viewWidth * scale, viewHeight * scale];
    }

    return TreemapLayout;
});