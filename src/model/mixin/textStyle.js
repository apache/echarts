define({

    getFont: function () {
        return [
            this.get('fontStyle'),
            this.get('fontWeight'),
            this.get('fontSize') + 'px',
            this.get('fontFamily')
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
});