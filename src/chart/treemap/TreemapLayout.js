define(function (require) {

    var mathMax = Math.max;
    var mathMin = Math.min;
    var mathRound = Math.round;
    var parsePercent = require('../../util/number').parsePercent;
    var retrieveValue = require('../../util/model').retrieveValue;

    var TreemapLayout = function () {
        // FIXME
        // 如果看效果不需要stick，则改成function形式的layout。
    };

    TreemapLayout.prototype = {

        constructor: TreemapLayout,

        /**
         * @override
         */
        update: function (ecModel, api, event) {
            var ecWidth = api.getWidth();
            var ecHeight = api.getHeight();

            // Layout result in each node:
            // {x, y, width, height, area, borderWidth}
            ecModel.eachSeriesByType('treemap', function (seriesModel) {
                var options = {
                    squareRatio: seriesModel.get('squareRatio'),
                    sort: seriesModel.get('sort')
                };

                var size = seriesModel.get('size') || []; // Compatible with ec2.
                options.rootWidth = parsePercent(
                    retrieveValue(seriesModel.get('width'), size[0]),
                    ecWidth
                );
                options.rootHeight = parsePercent(
                    retrieveValue(seriesModel.get('height'), size[1]),
                    ecHeight
                );

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
         * @param {number} [options.rootWidth]
         * @param {number} [options.rootHeight]
         * @param {number} [options.squareRatio]
         */
        squarify: function (node, options) {
            var width;
            var height;

            if (options.notRoot) {
                var thisLayout = node.getLayout();
                width = thisLayout.width;
                height = thisLayout.height;
            }
            else {
                width = options.rootWidth;
                height = options.rootHeight;
                node.setLayout({
                    x: 0, y: 0, width: width, height: height,
                    area: width * height
                }, true);
            }

            var itemModel = node.getItemModel();

            // Considering border and gap
            // ????? borderWidth gapwidth在每个层级中定义。
            var borderWidth = itemModel.get('itemStyle.normal.borderWidth');
            var halfGapWidth = itemModel.get('itemStyle.normal.gapWidth') / 2;
            var layoutOffset = borderWidth - halfGapWidth;
            width -= 2 * layoutOffset;
            height -= 2 * layoutOffset;

            node.setLayout({borderWidth: borderWidth}, true);

            var viewChildren = initChildren(node, width, height, itemModel, options);

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
    function initChildren(node, width, height, itemModel, options) {
        var viewChildren = node.children || [];

        // Sort children, order by desc.
        viewChildren = viewChildren.slice();

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

        // Filter by thredshold.
        for (var i = viewChildren.length - 1; i >= 0; i--) {
            var value = viewChildren[i].getValue();
            if (value / sum * totalArea < itemModel.get('itemStyle.normal.visibleMin')) {
                viewChildren.slice(i, 1);
                sum -= value;
            }
            else {
                break;
            }
        }

        // Set area to each child.
        for (var i = 0, len = viewChildren.length; i < len; i++) {
            var area = viewChildren[i].getValue() / sum * totalArea;
            viewChildren[i].setLayout({area: area}, true);
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
            ? mathRound(row.area / rowFixedLength) : 0;

        if (flush || rowOtherLength > rect[wh[idx1WhenH]]) {
            rowOtherLength = rect[wh[idx1WhenH]]; // over+underflow
        }

        for (var i = 0, rowLen = row.length; i < rowLen; i++) {
            var node = row[i];
            var nodeLayout = {};
            var step = rowOtherLength
                ? mathRound(node.getLayout().area / rowOtherLength) : 0;

            nodeLayout[xy[idx1WhenH]] = rect[xy[idx1WhenH]] + halfGapWidth;
            nodeLayout[xy[idx0WhenH]] = last + halfGapWidth;
            nodeLayout[wh[idx1WhenH]] = rowOtherLength - 2 * halfGapWidth;

            var remain = rect[xy[idx0WhenH]] + rect[wh[idx0WhenH]] - last;
            var modWH = (i === rowLen - 1 || remain < step) ? remain : step;
            nodeLayout[wh[idx0WhenH]] = modWH - 2 * halfGapWidth;

            last += modWH;

            node.setLayout(nodeLayout, true);
        }

        rect[xy[idx1WhenH]] += rowOtherLength;
        rect[wh[idx1WhenH]] -= rowOtherLength;
    }

    return TreemapLayout;
});