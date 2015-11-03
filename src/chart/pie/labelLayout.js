// FIXME emphasis label position is not same with normal label position
define(function (require) {

    'use strict';

    var textContain = require('zrender/contain/text');
    // var BoundingRect = require('zrender/core/BoundingRect');
    // var vec2 = require('zrender/core/vector');
    // var v2Set = vec2.set;

    // var scaleAndAdd = vec2.scaleAndAdd;

    // function forceLabelLayout(labels, cx, cy, r, viewWidth, viewHeight) {

    //     var step = 0;

    //     var len = labels.length;

    //     var v = [];

    //     var center = [cx, cy];

    //     r += 100;

    //     do {
    //         var energy = 0;
    //         for (var i = 0; i < len; i++) {
    //             var label = labels[i];
    //             v2Set(label.f, 0, 0);
    //             for (var j = 0; j < len; j++) {
    //                 if (i === j) {
    //                     continue;
    //                 }
    //                 vec2.sub(v, label.p, labels[j].p);
    //                 var dist = Math.max(vec2.len(v), 1);
    //                 var factor = label.rect.intersect(labels[j].rect)
    //                     ? 10 : 1;
    //                 scaleAndAdd(label.f, label.f, v, factor * 1000 / (dist * dist));
    //             }
    //             // Move to center
    //             vec2.sub(v, center, label.p);
    //             var distToCenter = vec2.len(v);
    //             var dist = Math.abs(distToCenter - label.r);
    //             vec2.normalize(v, v);
    //             if (distToCenter < r) {
    //                 vec2.negate(v, v);
    //             }
    //             scaleAndAdd(label.f, label.f, v, dist * dist);

    //             // collision with bounding box

    //             var fScalar = vec2.len(label.f);
    //             energy += fScalar;

    //             scaleAndAdd(label.p, label.p, label.f, 1 / fScalar);

    //             var labelRect = label.rect;
    //             labelRect.x = label.p[0];
    //             labelRect.y = label.p[1]
    //         }

    //         if (energy < 100) {
    //             break;
    //         }

    //         step++;
    //     } while (step < 200);
    // }

    return function (seriesModel, r, viewWidth, viewHeight) {
        var data = seriesModel.getData();

        // var avoidLabelOverlap = seriesModel.get('avoidLabelOverlap');

        // var labelNodes = [];

        data.each(function (idx) {
            var layout = data.getItemLayout(idx);

            var itemModel = data.getItemModel(idx);
            var labelModel = itemModel.getModel('label.normal');
            var labelPosition = labelModel.get('position');

            var labelLineModel = itemModel.getModel('labelLine');
            var labelLineLen = labelLineModel.get('length');
            var labelLineLen2 = labelLineModel.get('length2');

            var midAngle = (layout.startAngle + layout.endAngle) / 2;
            var dx = Math.cos(midAngle);
            var dy = Math.sin(midAngle);

            var textX;
            var textY;
            var linePoints;
            var textAlign;

            if (labelPosition === 'center') {
                textX = layout.cx;
                textY = layout.cy;
                textAlign = 'center';
            }
            else {
                var isLabelInside = labelPosition === 'inside';
                var x1 = (isLabelInside ? layout.r / 2 * dx : layout.r * dx) + layout.cx;
                var y1 = (isLabelInside ? layout.r / 2 * dy : layout.r * dy) + layout.cy;

                // For roseType
                labelLineLen += r - layout.r;

                textX = x1 + dx * 3;
                textY = y1 + dy * 3;

                if (!isLabelInside) {
                    var x2 = x1 + dx * labelLineLen;
                    var y2 = y1 + dy * labelLineLen;
                    var x3 = x2 + ((dx < 0 ? -1 : 1) * labelLineLen2);
                    var y3 = y2;

                    textX = x3 + (dx < 0 ? -5 : 5);
                    textY = y3;
                    linePoints = [[x1, y1], [x2, y2], [x3, y3]];
                }

                textAlign = isLabelInside ? 'center' : (dx > 0 ? 'left' : 'right');
            }
            if (!linePoints) {
                // Default line points
                var linePoints = [
                    [textX, textY], [textX, textY], [textX, textY]
                ];
            }

            var textBaseline = 'middle';
            var font = labelModel.getModel('textStyle').getFont();

            var labelRotate = labelModel.get('rotate')
                ? (dx < 0 ? -midAngle + Math.PI : -midAngle) : 0;

            layout.label = {
                x: textX,
                y: textY,
                linePoints: linePoints,
                textAlign: textAlign,
                textBaseline: textBaseline,
                font: font,
                rotation: labelRotate
            };

            // if (avoidLabelOverlap) {
            //     var text = seriesModel.getFormattedLabel(idx, 'normal')
            //                 || data.getName(idx);
            //     var rect = textContain.getBoundingRect(text, font, textAlign, textBaseline);
            //     var p = [textX + rect.x, textY + rect.y];
            //     labelNodes.push({
            //         p: p,
            //         rect: new BoundingRect(textX + rect.x, textY + rect.y, rect.width, rect.height),
            //         f: [0, 0],
            //         r: vec2.dist(p, center)
            //     });
            // }
        });

        // if (avoidLabelOverlap) {
        //     var cx;
        //     var cy;

        //     forceLabelLayout(
        //         labelNodes, cx, cy, r, viewWidth, viewHeight
        //     );

        //     data.each(function (idx) {
        //         var labelLayout = data.getItemLayout(idx).label;
        //         var forcedLayout = labelNodes[idx];
        //         var x = forcedLayout.p[0];
        //         var y = forcedLayout.p[1]
        //         var linePoints = labelLayout.linePoints;

        //         labelLayout.x = x;
        //         labelLayout.y = y;

                // if (linePoints) {
                //     linePoints[2] = x -
                // }
        //     });
        // }
    }
});