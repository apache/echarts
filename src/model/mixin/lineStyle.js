define(function (require) {
    var getLineStyle = require('./makeStyleMapper')(
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
    return {
        getLineStyle: function () {
            var style = getLineStyle.call(this);
            style.lineDash = this.getLineDash();
            return style;
        },

        getLineDash: function () {
            var type = this.get('type');
            return (type === 'solid' || type == null) ? null
                : (type === 'dashed' ? [5, 5] : [1, 1]);
        }
    };
});