// FIXME emphasis label position is not same with normal label position
define(function (require) {

    'use strict';

    var textContain = require('zrender/contain/text');

    return function (seriesModel) {
        var data = seriesModel.getData();
        var labelLineModel = seriesModel.getModel('labelLine');

        var labelLineLen = labelLineModel.get('length');
        var labelLineLen2 = labelLineModel.get('length2');

        var avoidLabelOverlap = seriesModel.get('avoidLabelOverlap');

        data.each(function (idx) {
            var layout = data.getItemLayout(idx);
            var itemModel = data.getItemModel(idx);
            var labelModel = itemModel.getModel('label.normal');
            var font = labelModel.getModel('textStyle').getFont();
            var labelPosition = labelModel.get('position');

            var midAngle = (layout.startAngle + layout.endAngle) / 2;
            var dx = Math.cos(midAngle);
            var dy = Math.sin(midAngle);

            var r = layout.r;

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
                var x1 = (isLabelInside ? r / 2 * dx : r * dx) + layout.cx;
                var y1 = (isLabelInside ? r / 2 * dy : r * dy) + layout.cy;

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

            var textBaseline = 'middle';

            layout.label = {
                x: textX,
                y: textY,
                linePoints: linePoints,
                textAlign: textAlign,
                textBaseline: textBaseline,
                font: font
            };
        });
    }
});