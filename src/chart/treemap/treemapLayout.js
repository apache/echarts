define(function (require) {

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var layout = require('../../util/layout');
    var helper = require('./helper');
    var BoundingRect = require('zrender/core/BoundingRect');
    var helper = require('./helper');

    var mathMax = Math.max;
    var mathMin = Math.min;
    var parsePercent = numberUtil.parsePercent;
    var retrieveValue = zrUtil.retrieve;
    var each = zrUtil.each;

    /**
     * @public
     */
    function update(ecModel, api, payload) {
        // Layout result in each node:
        // {x, y, width, height, area, borderWidth}
        var condition = {mainType: 'series', subType: 'treemap', query: payload};
        ecModel.eachComponent(condition, function (seriesModel) {

            var ecWidth = api.getWidth();
            var ecHeight = api.getHeight();
            var seriesOption = seriesModel.option;

            var size = seriesOption.size || []; // Compatible with ec2.
            var containerWidth = parsePercent(
                retrieveValue(seriesOption.width, size[0]),
                ecWidth
            );
            var containerHeight = parsePercent(
                retrieveValue(seriesOption.height, size[1]),
                ecHeight
            );

            var layoutInfo = layout.getLayoutRect(
                seriesModel.getBoxLayoutParams(),
                {
                    width: api.getWidth(),
                    height: api.getHeight()
                }
            );

            // Fetch payload info.
            var payloadType = payload && payload.type;
            var targetInfo = helper.retrieveTargetInfo(payload, seriesModel);
            var rootRect = (payloadType === 'treemapRender' || payloadType === 'treemapMove')
                ? payload.rootRect : null;
            var viewRoot = seriesModel.getViewRoot();
            var viewAbovePath = helper.getPathToRoot(viewRoot);

            if (payloadType !== 'treemapMove') {
                var rootSize = payloadType === 'treemapZoomToNode'
                    ? estimateRootSize(
                        seriesModel, targetInfo, viewRoot, containerWidth, containerHeight
                    )
                    : rootRect
                    ? [rootRect.width, rootRect.height]
                    : [containerWidth, containerHeight];

                var sort = seriesOption.sort;
                if (sort && sort !== 'asc' && sort !== 'desc') {
                    sort = 'desc';
                }
                var options = {
                    squareRatio: seriesOption.squareRatio,
                    sort: sort,
                    leafDepth: seriesOption.leafDepth
                };

                // layout should be cleared because using updateView but not update.
                viewRoot.hostTree.clearLayouts();

                // TODO
                // optimize: if out of view clip, do not layout.
                // But take care that if do not render node out of view clip,
                // how to calculate start po

                var viewRootLayout = {
                    x: 0, y: 0,
                    width: rootSize[0], height: rootSize[1],
                    area: rootSize[0] * rootSize[1]
                };
                viewRoot.setLayout(viewRootLayout);

                squarify(viewRoot, options, false, 0);
                // Supplement layout.
                var viewRootLayout = viewRoot.getLayout();
                each(viewAbovePath, function (node, index) {
                    var childValue = (viewAbovePath[index + 1] || viewRoot).getValue();
                    node.setLayout(zrUtil.extend(
                        {dataExtent: [childValue, childValue], borderWidth: 0},
                        viewRootLayout
                    ));
                });
            }

            var treeRoot = seriesModel.getData().tree.root;

            treeRoot.setLayout(
                calculateRootPosition(layoutInfo, rootRect, targetInfo),
                true
            );

            seriesModel.setLayoutInfo(layoutInfo);

            // FIXME
            // 现在没有clip功能，暂时取ec高宽。
            prunning(
                treeRoot,
                // Transform to base element coordinate system.
                new BoundingRect(-layoutInfo.x, -layoutInfo.y, ecWidth, ecHeight),
                viewAbovePath,
                viewRoot,
                0
            );
        });
    }

    /**
     * Layout treemap with squarify algorithm.
     * @see https://graphics.ethz.ch/teaching/scivis_common/Literature/squarifiedTreeMaps.pdf
     * @see https://github.com/mbostock/d3/blob/master/src/layout/treemap.js
     *
     * @protected
     * @param {module:echarts/data/Tree~TreeNode} node
     * @param {Object} options
     * @param {string} options.sort 'asc' or 'desc'
     * @param {number} options.squareRatio
     * @param {boolean} hideChildren
     * @param {number} depth
     */
    function squarify(node, options, hideChildren, depth) {
        var width;
        var height;

        if (node.isRemoved()) {
            return;
        }

        var thisLayout = node.getLayout();
        width = thisLayout.width;
        height = thisLayout.height;

        // Considering border and gap
        var itemStyleModel = node.getModel('itemStyle.normal');
        var borderWidth = itemStyleModel.get('borderWidth');
        var halfGapWidth = itemStyleModel.get('gapWidth') / 2;
        var layoutOffset = borderWidth - halfGapWidth;
        var nodeModel = node.getModel();

        node.setLayout({borderWidth: borderWidth}, true);

        width = mathMax(width - 2 * layoutOffset, 0);
        height = mathMax(height - 2 * layoutOffset, 0);

        var totalArea = width * height;
        var viewChildren = initChildren(
            node, nodeModel, totalArea, options, hideChildren, depth
        );

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

        if (!hideChildren) {
            var childrenVisibleMin = nodeModel.get('childrenVisibleMin');
            if (childrenVisibleMin != null && totalArea < childrenVisibleMin) {
                hideChildren = true;
            }
        }

        for (var i = 0, len = viewChildren.length; i < len; i++) {
            squarify(viewChildren[i], options, hideChildren, depth + 1);
        }
    }

    /**
     * Set area to each child, and calculate data extent for visual coding.
     */
    function initChildren(node, nodeModel, totalArea, options, hideChildren, depth) {
        var viewChildren = node.children || [];
        var orderBy = options.sort;
        orderBy !== 'asc' && orderBy !== 'desc' && (orderBy = null);

        var overLeafDepth = options.leafDepth != null && options.leafDepth <= depth;

        // leafDepth has higher priority.
        if (hideChildren && !overLeafDepth) {
            return (node.viewChildren = []);
        }

        // Sort children, order by desc.
        viewChildren = zrUtil.filter(viewChildren, function (child) {
            return !child.isRemoved();
        });

        sort(viewChildren, orderBy);

        var info = statistic(nodeModel, viewChildren, orderBy);

        if (info.sum === 0) {
            return (node.viewChildren = []);
        }

        info.sum = filterByThreshold(nodeModel, totalArea, info.sum, orderBy, viewChildren);

        if (info.sum === 0) {
            return (node.viewChildren = []);
        }

        // Set area to each child.
        for (var i = 0, len = viewChildren.length; i < len; i++) {
            var area = viewChildren[i].getValue() / info.sum * totalArea;
            // Do not use setLayout({...}, true), because it is needed to clear last layout.
            viewChildren[i].setLayout({area: area});
        }

        if (overLeafDepth) {
            viewChildren.length && node.setLayout({isLeafRoot: true}, true);
            viewChildren.length = 0;
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
            each(children, function (child) {
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
            area = row[i].getLayout().area;
            if (area) {
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

    // Return [containerWidth, containerHeight] as defualt.
    function estimateRootSize(seriesModel, targetInfo, viewRoot, containerWidth, containerHeight) {
        // If targetInfo.node exists, we zoom to the node,
        // so estimate whold width and heigth by target node.
        var currNode = (targetInfo || {}).node;
        var defaultSize = [containerWidth, containerHeight];

        if (!currNode || currNode === viewRoot) {
            return defaultSize;
        }

        var parent;
        var viewArea = containerWidth * containerHeight;
        var area = viewArea * seriesModel.option.zoomToNodeRatio;

        while (parent = currNode.parentNode) { // jshint ignore:line
            var sum = 0;
            var siblings = parent.children;

            for (var i = 0, len = siblings.length; i < len; i++) {
                sum += siblings[i].getValue();
            }
            var currNodeValue = currNode.getValue();
            if (currNodeValue === 0) {
                return defaultSize;
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

        return [containerWidth * scale, containerHeight * scale];
    }

    // Root postion base on coord of containerGroup
    function calculateRootPosition(layoutInfo, rootRect, targetInfo) {
        if (rootRect) {
            return {x: rootRect.x, y: rootRect.y};
        }

        var defaultPosition = {x: 0, y: 0};
        if (!targetInfo) {
            return defaultPosition;
        }

        // If targetInfo is fetched by 'retrieveTargetInfo',
        // old tree and new tree are the same tree,
        // so the node still exists and we can visit it.

        var targetNode = targetInfo.node;
        var layout = targetNode.getLayout();

        if (!layout) {
            return defaultPosition;
        }

        // Transform coord from local to container.
        var targetCenter = [layout.width / 2, layout.height / 2];
        var node = targetNode;
        while (node) {
            var nodeLayout = node.getLayout();
            targetCenter[0] += nodeLayout.x;
            targetCenter[1] += nodeLayout.y;
            node = node.parentNode;
        }

        return {
            x: layoutInfo.width / 2 - targetCenter[0],
            y: layoutInfo.height / 2 - targetCenter[1]
        };
    }

    // Mark nodes visible for prunning when visual coding and rendering.
    // Prunning depends on layout and root position, so we have to do it after layout.
    function prunning(node, clipRect, viewAbovePath, viewRoot, depth) {
        var nodeLayout = node.getLayout();
        var nodeInViewAbovePath = viewAbovePath[depth];
        var isAboveViewRoot = nodeInViewAbovePath && nodeInViewAbovePath === node;

        if (
            (nodeInViewAbovePath && !isAboveViewRoot)
            || (depth === viewAbovePath.length && node !== viewRoot)
        ) {
            return;
        }

        node.setLayout({
            // isInView means: viewRoot sub tree + viewAbovePath
            isInView: true,
            // invisible only means: outside view clip so that the node can not
            // see but still layout for animation preparation but not render.
            invisible: !isAboveViewRoot && !clipRect.intersect(nodeLayout),
            isAboveViewRoot: isAboveViewRoot
        }, true);

        // Transform to child coordinate.
        var childClipRect = new BoundingRect(
            clipRect.x - nodeLayout.x,
            clipRect.y - nodeLayout.y,
            clipRect.width,
            clipRect.height
        );

        each(node.viewChildren || [], function (child) {
            prunning(child, childClipRect, viewAbovePath, viewRoot, depth + 1);
        });
    }

    return update;
});