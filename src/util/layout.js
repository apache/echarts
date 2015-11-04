// Layout helpers for each component positioning
define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var BoundingRect = require('zrender/core/BoundingRect');
    var numberUtil = require('./number');
    var formatUtil = require('./format');
    var parsePercent = numberUtil.parsePercent;

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
     * If x or x2 is not specified or 'center' 'left' 'right',
     * the width would be as long as possible.
     * If y or y2 is not specified or 'middle' 'top' 'bottom',
     * the height would be as long as possible.
     *
     * @param {Object} positionInfo
     * @param {number|string} [positionInfo.x]
     * @param {number|string} [positionInfo.y]
     * @param {number|string} [positionInfo.x2]
     * @param {number|string} [positionInfo.y2]
     * @param {Object} containerRect
     * @param {string|number} margin
     * @return {Object} {width, height}
     */
    layout.getAvailableSize = function (positionInfo, containerRect, margin) {
        var containerWidth = containerRect.width;
        var containerHeight = containerRect.height;

        var x = parsePercent(positionInfo.x, containerWidth);
        var y = parsePercent(positionInfo.y, containerHeight);
        var x2 = parsePercent(positionInfo.x2, containerWidth);
        var y2 = parsePercent(positionInfo.y2, containerHeight);

        (isNaN(x) || isNaN(parseFloat(positionInfo.x))) && (x = 0);
        (isNaN(x2) || isNaN(parseFloat(positionInfo.x2))) && (x2 = containerWidth);
        (isNaN(y) || isNaN(parseFloat(positionInfo.y))) && (y = 0);
        (isNaN(y2) || isNaN(parseFloat(positionInfo.y2))) && (y2 = containerHeight);

        margin = formatUtil.normalizeCssArray(margin || 0);

        return {
            width: Math.max(x2 - x - margin[1] - margin[3], 0),
            height: Math.max(y2 - y - margin[0] - margin[2], 0)
        };
    };

    /**
     * Parse position info.
     *  position info is specified by either
     *  {x, y}, {x2, y2}
     *  If all properties exists, x2 and y2 will be igonred.
     *
     * @param {Object} positionInfo
     * @param {number|string} [positionInfo.x]
     * @param {number|string} [positionInfo.y]
     * @param {number|string} [positionInfo.x2]
     * @param {number|string} [positionInfo.y2]
     * @param {number|string} [positionInfo.width]
     * @param {number|string} [positionInfo.height]
     * @param {number|string} [positionInfo.aspect] Aspect is width / height
     * @param {Object} containerRect
     * @param {string|number} [margin]
     * @param {boolean} [notAlignX=false]
     * @param {boolean} [notAlignY=false]
     *
     * @return {module:zrender/core/BoundingRect}
     */
    layout.parsePositionInfo = function (
        positionInfo, containerRect, margin,
        notAlignX, notAlignY
    ) {
        margin = formatUtil.normalizeCssArray(margin || 0);

        var containerWidth = containerRect.width;
        var containerHeight = containerRect.height;

        var x = parsePercent(positionInfo.x, containerWidth);
        var y = parsePercent(positionInfo.y, containerHeight);
        var x2 = parsePercent(positionInfo.x2, containerWidth);
        var y2 = parsePercent(positionInfo.y2, containerHeight);
        var width = parsePercent(positionInfo.width, containerWidth);
        var height = parsePercent(positionInfo.height, containerHeight);

        var verticalMargin = margin[2] + margin[0];
        var horizontalMargin = margin[1] + margin[3];
        var aspect = positionInfo.aspect;

        // If width is not specified, calculate width from x and x2
        if (isNaN(width)) {
            width = containerWidth - x2 - horizontalMargin - x;
        }
        if (isNaN(height)) {
            height = containerHeight - y2 - verticalMargin - y;
        }

        if (aspect != null) {
            // Calculate width or height with given aspect
            if (isNaN(width)) {
                width = aspect * height;
            }
            if (isNaN(height)) {
                height = width / aspect;
            }
        }

        // If x is not specified, calculate x from x2 and width
        if (isNaN(x)) {
            x = containerWidth - x2 - width - horizontalMargin;
        }
        if (isNaN(y)) {
            y = containerHeight - y2 - height - verticalMargin;
        }

        if (!notAlignX) {
            switch (positionInfo.x || positionInfo.x2) {
                case 'center':
                    x = containerWidth / 2 - width / 2 - margin[3];
                    break;
                case 'right':
                    x = containerWidth - width - horizontalMargin;
                    break;
            }
        }
        if (!notAlignY) {
            switch (positionInfo.y || positionInfo.y2) {
                case 'middle':
                case 'center':
                    y = containerHeight / 2 - height / 2 - margin[0];
                    break;
                case 'bottom':
                    y = containerHeight - height - verticalMargin;
                    break;
            }
        }

        var rect = new BoundingRect(x + margin[3], y + margin[0], width, height);
        rect.margin = margin;
        return rect;
    };

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
     * @param {boolean} [notAlignX=false]
     * @param {boolean} [notAlignY=false]
     */
    layout.positionGroup = function (
        group, positionInfo, containerRect, margin,
        notAlignX, notAlignY
    ) {
        var groupRect = group.getBoundingRect();

        positionInfo = zrUtil.extend({
            width: groupRect.width,
            height: groupRect.height
        }, positionInfo);

        positionInfo = layout.parsePositionInfo(
            positionInfo, containerRect, margin,
            notAlignX, notAlignY
        );

        group.position = [
            positionInfo.x - groupRect.x,
            positionInfo.y - groupRect.y
        ];
    };

    return layout;
});