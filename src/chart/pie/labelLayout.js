define(function (require) {

    'use strict';

    var textContain = require('zrender/contain/text');

    return function (seriesModel) {
        var data = seriesModel.getData();
        var itemStyleModel = seriesModel.getModel('itemStyle.normal');
        var labelLineModel = itemStyleModel.getModel('labelLine');
        var labelModel = itemStyleModel.getModel('label')

        var labelLineLen = labelLineModel.get('length');
        var labelLineLen2 = labelLineModel.get('length2');

        var isLabelInside = labelModel.get('position') === 'inside';

        var avoidLabelOverlap = seriesModel.get('avoidLabelOverlap');

        data.each(function (idx) {
            var layout = data.getItemLayout(idx);
            var itemModel = data.getItemModel(idx);
            var font = itemModel.getModel('itemStyle.normal.label.textStyle').getFont();

            var midAngle = (layout.startAngle + layout.endAngle) / 2;
            var dx = Math.cos(midAngle);
            var dy = Math.sin(midAngle);

            var r = layout.r;

            var x1 = (isLabelInside ? r / 2 * dx : r * dx) + layout.cx;
            var y1 = (isLabelInside ? r / 2 * dy : r * dy) + layout.cy;

            var textX = x1 + dx * 3;
            var textY = y1 + dy * 3;
            var linePoints;

            if (!isLabelInside) {
                var x2 = x1 + dx * labelLineLen;
                var y2 = y1 + dy * labelLineLen;
                var x3 = x2 + ((dx < 0 ? -1 : 1) * labelLineLen2);
                var y3 = y2;

                textX = x3 + (dx < 0 ? -5 : 5);
                textY = y3;
                linePoints = [[x1, y1], [x2, y2], [x3, y3]];
            }

            var textAlign = isLabelInside ? 'center' : (dx > 0 ? 'left' : 'right');
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