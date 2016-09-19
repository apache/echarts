define(function (require) {
    var getItemStyle = require('./makeStyleMapper')(
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
    return {
        getItemStyle: function (excludes) {
            var style = getItemStyle.call(this, excludes);
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
});