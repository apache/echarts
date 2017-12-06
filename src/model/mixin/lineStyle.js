import makeStyleMapper from './makeStyleMapper';

var getLineStyle = makeStyleMapper(
    [
        ['lineWidth', 'width'],
        ['stroke', 'color'],
        ['opacity'],
        ['shadowBlur'],
        ['shadowOffsetX'],
        ['shadowOffsetY'],
        ['shadowColor']
    ]
);

export default {
    getLineStyle: function (excludes) {
        var style = getLineStyle(this, excludes);
        var lineDash = this.getLineDash(style.lineWidth);
        lineDash && (style.lineDash = lineDash);
        return style;
    },

    getLineDash: function (lineWidth) {
        if (lineWidth == null) {
            lineWidth = 1;
        }
        var lineType = this.get('type');
        var dotSize = Math.max(lineWidth, 2);
        var dashSize = lineWidth * 4;
        return (lineType === 'solid' || lineType == null) ? null
            : (lineType === 'dashed' ? [dashSize, dashSize] : [dotSize, dotSize]);
    }
};