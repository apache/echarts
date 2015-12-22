/**
 * Helper function for axisLabelInterval calculation
 */

define(function(require) {
    'use strict';

    var textContain = require('zrender/contain/text');

    return function (axis) {
        var axisModel = axis.model;
        var labelModel = axisModel.getModel('axisLabel');
        var labelInterval = labelModel.get('interval');
        if (!(axis.type === 'category' && labelInterval === 'auto')
        ) {
            return labelInterval === 'auto' ? 0 : labelInterval;
        }

        var ticks = axis.scale.getTicks();
        var labels = axisModel.getFormattedLabels();
        var font = labelModel.getModel('textStyle').getFont();

        var textSpaceTakenRect;

        var autoLabelInterval = 0;
        var accumulatedLabelInterval = 0;

        var isAxisHorizontal = axis.isHorizontal();

        for (var i = 0; i < ticks.length; i++) {
            var tick = ticks[i];
            var tickCoord = axis.dataToCoord(tick);
            var rect = textContain.getBoundingRect(
                labels[i], font, 'center', 'top'
            );
            rect[isAxisHorizontal ? 'x' : 'y'] += tickCoord;
            rect[isAxisHorizontal ? 'width' : 'height'] *= 1.5;
            if (!textSpaceTakenRect) {
                textSpaceTakenRect = rect.clone();
            }
            // There is no space for current label;
            else if (textSpaceTakenRect.intersect(rect)) {
                accumulatedLabelInterval++;
                autoLabelInterval = Math.max(autoLabelInterval, accumulatedLabelInterval);
            }
            else {
                textSpaceTakenRect.union(rect);
                // Reset
                accumulatedLabelInterval = 0;
            }
        }

        return autoLabelInterval;
    };
});