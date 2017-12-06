
import { parsePercent } from '../../util/number';
import * as zrUtil from 'zrender/src/core/util';

var PI2 = Math.PI * 2;
var RADIAN = Math.PI / 180;

export default function (seriesType, ecModel, api, payload) {
    ecModel.eachSeriesByType(seriesType, function (seriesModel) {
        var center = seriesModel.get('center');
        var radius = seriesModel.get('radius');

        if (!zrUtil.isArray(radius)) {
            radius = [0, radius];
        }
        if (!zrUtil.isArray(center)) {
            center = [center, center];
        }

        var width = api.getWidth();
        var height = api.getHeight();
        var size = Math.min(width, height);
        var cx = parsePercent(center[0], width);
        var cy = parsePercent(center[1], height);
        var r0 = parsePercent(radius[0], size / 2);
        var r = parsePercent(radius[1], size / 2);

        var data = seriesModel.getData();

        var startAngle = -seriesModel.get('startAngle') * RADIAN;
        var minAngle = seriesModel.get('minAngle') * RADIAN;

        var treeRoot = data.tree.root;

        var sortOrder = seriesModel.get('sortOrder');
        if (sortOrder != null) {
            initChildren(treeRoot, sortOrder === 'asc');
        }

        var validDataCount = 0;
        zrUtil.each(treeRoot.children, function (child) {
            !isNaN(child.getValue()) && validDataCount++;
        });

        var sum = treeRoot.getValue();
        // Sum may be 0
        var unitRadian = Math.PI / (sum || validDataCount) * 2;

        var rPerLevel = (r - r0) / (treeRoot.height || 1);

        var clockwise = seriesModel.get('clockwise');

        var stillShowZeroSum = seriesModel.get('stillShowZeroSum');

        // In the case some sector angle is smaller than minAngle
        var restAngle = PI2;
        var valueSumLargerThanMinAngle = 0;

        var dir = clockwise ? 1 : -1;

        /**
         * Render a tree
         * @return increased angle
         */
        var renderNode = function (root, startAngle) {
            if (!root) {
                return;
            }

            var endAngle = startAngle;

            // Render self
            if (root !== treeRoot) {
                // Tree root is virtual, so it doesn't need to be drawn
                var value = root.getValue();

                var angle = (sum === 0 && stillShowZeroSum)
                    ? unitRadian : (value * unitRadian);
                if (angle < minAngle) {
                    angle = minAngle;
                    restAngle -= minAngle;
                }
                else {
                    valueSumLargerThanMinAngle += value;
                }

                endAngle = startAngle + dir * angle;

                var rStart = r0 + rPerLevel * (root.depth - 1);
                var rEnd = r0 + rPerLevel * root.depth;

                var itemModel = root.getModel();
                if (itemModel.get('r0') != null) {
                    rStart = parsePercent(itemModel.get('r0'), size / 2);
                    rEnd = parsePercent(itemModel.get('r'), size / 2);
                }

                root.setLayout({
                    angle: angle,
                    startAngle: startAngle,
                    endAngle: endAngle,
                    clockwise: clockwise,
                    cx: cx,
                    cy: cy,
                    r0: rStart,
                    r: rEnd
                });
            }

            // Render children
            if (root.children && root.children.length) {
                // currentAngle = startAngle;
                var siblingAngle = 0;
                zrUtil.each(root.children, function (node) {
                    siblingAngle += renderNode(node, startAngle + siblingAngle);
                });
            }

            return endAngle - startAngle;
        };

        renderNode(treeRoot, startAngle);
    });
}

/**
 * Init node children by order and update visual
 *
 * @param {TreeNode} node  root node
 * @param {boolean}  isAsc if is in ascendant order
 */
function initChildren(node, isAsc) {
    var children = node.children || [];

    node.children = sort(children, isAsc);

    // Init children recursively
    if (children.length) {
        zrUtil.each(node.children, function (child) {
            initChildren(child, isAsc);
        });
    }
}

/**
 * Sort children nodes
 *
 * @param {TreeNode[]} children children of node to be sorted
 * @param {boolean}    isAsc    if is in ascendant order
 */
function sort(children, isAsc) {
    return children.sort(function (a, b) {
        var diff = (a.getValue() - b.getValue()) * (isAsc ? -1 : 1);
        return diff === 0
            ? (a.dataIndex - b.dataIndex) * (isAsc ? 1 : -1)
            : diff;
    });
}
