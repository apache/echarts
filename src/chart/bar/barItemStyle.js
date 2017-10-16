import makeStyleMapper from '../../model/mixin/makeStyleMapper';

var getBarItemStyle = makeStyleMapper(
    [
        ['fill', 'color'],
        ['stroke', 'borderColor'],
        ['lineWidth', 'borderWidth'],
        // Compatitable with 2
        ['stroke', 'barBorderColor'],
        ['lineWidth', 'barBorderWidth'],
        ['opacity'],
        ['shadowBlur'],
        ['shadowOffsetX'],
        ['shadowOffsetY'],
        ['shadowColor']
    ]
);

export default {
    getBarItemStyle: function (excludes) {
        var style = getBarItemStyle(this, excludes);
        if (this.getBorderLineDash) {
            var lineDash = this.getBorderLineDash();
            lineDash && (style.lineDash = lineDash);
        }
        return style;
    }
};

