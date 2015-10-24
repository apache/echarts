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
            var ecWidth = api.getWidth();
            var ecHeight = api.getHeight();

            // Layout result in each node:
            // {x, y, width, height, area, borderWidth}
            ecModel.eachSeriesByType('treemap', function (seriesModel) {

                if (helper.irrelevant(payload, seriesModel)) {
                    return;
                }

                // FIXME
                // 暂使用 ecWidth ecHeight 作为可视区大小
                var estimatedSize = estimateRootSize(
                    helper.retrieveTargetInfo(payload, seriesModel),
                    seriesModel, ecWidth, ecHeight
                );

                var size = seriesModel.get('size') || []; // Compatible with ec2.
                var options = {
                    squareRatio: seriesModel.get('squareRatio'),
                    sort: seriesModel.get('sort'),
                    rootSize: estimatedSize || [
                        parsePercent(
                            retrieveValue(seriesModel.get('width'), size[0]),
                            ecWidth
                        ),
                        parsePercent(
                            retrieveValue(seriesModel.get('height'), size[1]),
                            ecHeight
                        )
                    ]
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
            var remaining = viewChildren.slice();
            var remainingLen;
            var row = [];
            row.area = 0;

            while ((remainingLen = remaining.length) > 0) {
                var child = remaining[remainingLen - 1];

                row.push(child);
                row.area += child.getLayout().area;
                var score = worst(row, rowFixedLength, options.squareRatio);

                // continue with this orientation
                if (score <= best) {
                    remaining.pop();
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
     * Set area to each child.
     */
    function initChildren(node, width, height, options) {
        var viewChildren = node.children || [];

        // Sort children, order by desc.
        viewChildren = zrUtil.filter(viewChildren, function (child) {
            return !child.isRemoved();
        });

        if (options.sort) {
            viewChildren.sort(function (a, b) {
                // If 'asc', sort by desc, because layout is performed from tail to head.
                return options.sort === 'asc'
                    ? b.getValue() - a.getValue() : a.getValue() - b.getValue();
            });
        }

        var sum = 0;
        for (var i = 0, len = viewChildren.length; i < len; i++) {
            sum += viewChildren[i].getValue();
        }

        var totalArea = width * height;
        var nodeModel = node.getModel();

        // Filter by thredshold.
        for (var i = viewChildren.length - 1; i >= 0; i--) {
            var value = viewChildren[i].getValue();

            if (value / sum * totalArea < nodeModel.get('visibleMin')) {
                viewChildren.splice(i, 1);
                sum -= value;
            }
            else {
                break;
            }
        }

        // Set area to each child.
        for (var i = 0, len = viewChildren.length; i < len; i++) {
            var area = viewChildren[i].getValue() / sum * totalArea;
            // Do not use setLayout({...}, true), because it is needed to clear last layout.
            viewChildren[i].setLayout({area: area});
        }

        node.viewChildren = viewChildren;

        return viewChildren;
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

    function estimateRootSize(targetInfo, seriesModel, viewWidth, viewHeight) {
        if (!targetInfo) {
            return;
        }

        // If targetInfo.node exists, we zoom to the node,
        // so estimate whold width and heigth by target node.
        var currNode = targetInfo.node;
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

        // return [estimatedWidth, estimatedHeight]
        return [viewWidth * scale, viewHeight * scale];
    }

    return TreemapLayout;
});