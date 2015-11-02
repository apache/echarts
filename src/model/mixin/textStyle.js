define(function (require) {

    var textContain = require('zrender/contain/text');

    return {
        getFont: function () {
            return [
                this.get('fontStyle'),
                this.get('fontWeight'),
                (this.get('fontSize') || 12) + 'px',
                this.get('fontFamily') || 'sans-serif'
            ].join(' ');
        },

        getTextRect: function (text) {
            var textStyle = this.get('textStyle') || {};
            return textContain.getBoundingRect(
                text,
                this.getFont(),
                textStyle.align,
                textStyle.baseline
            );
        },

        ellipsis: function (text, containerWidth, options) {
            return textContain.ellipsis(
                text, this.getFont(), containerWidth, options
            );
        }
    };
});