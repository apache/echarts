// Layout helpers for each component positioning
define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('./number');
    var formatUtil = require('./format');

    var layout = {};

    function boxLayout(orient, group, gap) {
        var x = 0;
        var y = 0;
        group.eachChild(function (child) {
            var position = child.position;
            var rect = child.getBoundingRect();
            position[0] = x;
            position[1] = y;

            orient === 'horizontal'
                ? (x += rect.width + gap)
                : (y += rect.height + gap);
        });
    }

    /**
     * VBox or HBox layouting
     * @param {string} orient
     * @param {module:zrender/container/Group} group
     * @param {number} gap
     */
    layout.box = boxLayout;

    /**
     * VBox layouting
     * @param {module:zrender/container/Group} group
     * @param {number} gap
     */
    layout.vbox = zrUtil.curry(boxLayout, 'vertical');

    /**
     * HBox layouting
     * @param {module:zrender/container/Group} group
     * @param {number} gap
     */
    layout.hbox = zrUtil.curry(boxLayout, 'horizontal');

    /**
     * Position group of component in viewport
     *  Group position is specified by either
     *  {x, y}, {x2, y2}
     *  If all properties exists, x2 and y2 will be igonred.
     *
     * @param {module:zrender/container/Group} group
     * @param {Object} positionInfo
     * @param {number|string} [positionInfo.x]
     * @param {number|string} [positionInfo.y]
     * @param {number|string} [positionInfo.x2]
     * @param {number|string} [positionInfo.y2]
     * @param {Object} containerRect
     * @param {string|number} margin
     */
    layout.positionGroup = function (
        group, positionInfo, containerRect, margin
    ) {
        margin = formatUtil.normalizeCssArray(margin || 0);

        var groupRect = group.getBoundingRect();

        var containerWidth = containerRect.width;
        var containerHeight = containerRect.height;

        var parsePercent = numberUtil.parsePercent;
        var x = parsePercent(positionInfo.x, containerWidth);
        var y = parsePercent(positionInfo.y, containerHeight);
        var x2 = parsePercent(positionInfo.x2, containerWidth);
        var y2 = parsePercent(positionInfo.y2, containerHeight);

        var width = groupRect.width;
        var height = groupRect.height;

        height += margin[2] + margin[0];
        width += margin[1] + margin[3];
        // If x is not specified, calculate x from x2 and width
        if (isNaN(x)) {
            x = x2 - width;
        }
        if (isNaN(y)) {
            y = y2 - height;
        }

        switch (positionInfo.x || positionInfo.x2) {
            case 'center':
                x = containerWidth / 2 - width / 2;
                break;
            case 'right':
                x = containerWidth - width;
                break;

        }
        switch (positionInfo.y || positionInfo.y2) {
            case 'middle':
                y = containerHeight / 2 - height / 2;
                break;
            case 'bottom':
                y = containerHeight - height;
                break;
        }

        group.position = [
            x - groupRect.x + margin[3],
            y - groupRect.y + margin[0]
        ];
    };

    return layout;
});