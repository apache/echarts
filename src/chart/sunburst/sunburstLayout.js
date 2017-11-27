
import {parsePercent} from '../../util/number';
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
