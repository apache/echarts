
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

        initChildren(ecModel, treeRoot, true);

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

                root.setLayout({
                    angle: angle,
                    startAngle: startAngle,
                    endAngle: endAngle,
                    clockwise: clockwise,
                    cx: cx,
                    cy: cy,
                    r0: r0 + rPerLevel * (root.depth - 1),
                    r: r0 + rPerLevel * root.depth
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

        // // Some sector is constrained by minAngle
        // // Rest sectors needs recalculate angle
        // if (restAngle < PI2 && validDataCount) {
        //     // Average the angle if rest angle is not enough after all angles is
        //     // Constrained by minAngle
        //     if (restAngle <= 1e-3) {
        //         var angle = PI2 / validDataCount;
        //         data.each('value', function (value, idx) {
        //             if (!isNaN(value)) {
        //                 var layout = data.getItemLayout(idx);
        //                 layout.angle = angle;
        //                 layout.startAngle = startAngle + dir * idx * angle;
        //                 layout.endAngle = startAngle + dir * (idx + 1) * angle;
        //             }
        //         });
        //     }
        //     else {
        //         unitRadian = restAngle / valueSumLargerThanMinAngle;
        //         currentAngle = startAngle;
        //         data.each('value', function (value, idx) {
        //             if (!isNaN(value)) {
        //                 var layout = data.getItemLayout(idx);
        //                 var angle = layout.angle === minAngle
        //                     ? minAngle : value * unitRadian;
        //                 layout.startAngle = currentAngle;
        //                 layout.endAngle = currentAngle + dir * angle;
        //                 currentAngle += dir * angle;
        //             }
        //         });
        //     }
        // }
    });
}

/**
 * Init node children by order and update visual
 *
 * @param {module:echarts/model/Global} ecModel
 * @param {TreeNode} node  root node
 * @param {boolean}  isAsc if is in ascendant order
 */
function initChildren(ecModel, node, isAsc) {
    var children = node.children || [];

    node.children = sort(children);

    // Change color policy
    node.getVisual = function (key, ignoreParent) {
        if (key === 'color') {
            if (this.depth === 0) {
                // Virtual root node
                return 'transparent';
            }
            else {
                // Use color of the first generation
                var ancestor = this;
                var color = ancestor.getModel('itemStyle.normal').get('color');
                while (ancestor.parentNode && !color) {
                    ancestor = ancestor.parentNode;
                    color = ancestor.getModel('itemStyle.normal').get('color');
                }

                if (!color) {
                    color = ecModel.option.color[getRootId(this)];
                }

                return color;
            }
        }
        else {
            return Object.getPrototypeOf(node).getVisual
                .call(node, key, ignoreParent);
        }
    };

    // Init children recursively
    if (children.length) {
        zrUtil.each(node.children, function (child) {
            initChildren(ecModel, child, isAsc);
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
        var diff = (a.getValue() - b.getValue()) * (isAsc ? 1 : -1);
        return diff === 0
            ? (a.dataIndex - b.dataIndex) * (isAsc ? 1 : -1)
            : diff;
    });
}

/**
 * Get index of root in sorted order
 *
 * @param {TreeNode} node current node
 * @return {number} index in root
 */
function getRootId(node) {
    var ancestor = node;
    while (ancestor.depth > 1) {
        ancestor = ancestor.parentNode;
    }

    var virtualRoot = node.getAncestors()[0];
    return zrUtil.indexOf(virtualRoot.children, ancestor);
}
