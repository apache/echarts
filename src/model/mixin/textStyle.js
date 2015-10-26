define(function (require) {

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
            return require('zrender/contain/text').getBoundingRect(
                text,
                this.getFont(),
                textStyle.align,
                textStyle.baseline
            );
        }
    };
});