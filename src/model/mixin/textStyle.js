define(function (require) {

    var textContain = require('zrender/contain/text');

    function getShallow(model, path) {
        return model && model.getShallow(path);
    }

    return {
        getFont: function () {
            var ecModel = this.ecModel;
            var gTextStyleModel = ecModel && ecModel.getModel('textStyle');
            return [
                // FIXME in node-canvas fontWeight is before fontStyle
                this.getShallow('fontStyle') || getShallow(gTextStyleModel, 'fontStyle'),
                this.getShallow('fontWeight') || getShallow(gTextStyleModel, 'fontWeight'),
                (this.getShallow('fontSize') || getShallow(gTextStyleModel, 'fontSize') || 12) + 'px',
                this.getShallow('fontFamily') || getShallow(gTextStyleModel, 'fontFamily') || 'sans-serif'
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