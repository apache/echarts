define(function (require) {

    var textContain = require('zrender/contain/text');
    var graphicUtil = require('../../util/graphic');

    var PATH_COLOR = ['textStyle', 'color'];

    return {
        /**
         * Get color property or get color from option.textStyle.color
         * @param {boolean} [noDefault]
         * @return {string}
         */
        getTextColor: function (noDefault) {
            var ecModel = this.ecModel;
            return this.getShallow('color')
                || (!noDefault && ecModel && ecModel.get(PATH_COLOR));
        },

        /**
         * Create font string from fontStyle, fontWeight, fontSize, fontFamily
         * @return {string}
         */
        getFont: function () {
            return graphicUtil.getFont({
                fontStyle: this.getShallow('fontStyle'),
                fontWeight: this.getShallow('fontWeight'),
                fontSize: this.getShallow('fontSize'),
                fontFamily: this.getShallow('fontFamily')
            }, this.ecModel);
        },

        getTextRect: function (text) {
            return textContain.getBoundingRect(
                text,
                this.getFont(),
                this.getShallow('align'),
                this.getShallow('verticalAlign') || this.getShallow('baseline')
            );
        },

        truncateText: function (text, containerWidth, ellipsis, options) {
            return textContain.truncateText(
                text, containerWidth, this.getFont(), ellipsis, options
            );
        }
    };
});