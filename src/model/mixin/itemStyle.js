import makeStyleMapper from './makeStyleMapper';

var getItemStyle = makeStyleMapper(
    [
        ['fill', 'color'],
        ['stroke', 'borderColor'],
        ['lineWidth', 'borderWidth'],
        ['opacity'],
        ['shadowBlur'],
        ['shadowOffsetX'],
        ['shadowOffsetY'],
        ['shadowColor'],
        ['textPosition'],
        ['textAlign']
    ]
);

export default {
    getItemStyle: function (excludes, includes) {
        var style = getItemStyle(this, excludes, includes);
        var lineDash = this.getBorderLineDash();
        lineDash && (style.lineDash = lineDash);
        return style;
    },

    getBorderLineDash: function () {
        var lineType = this.get('borderType');
        return (lineType === 'solid' || lineType == null) ? null
            : (lineType === 'dashed' ? [5, 5] : [1, 1]);
    }
};