// Layout helpers for each component positioning
define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var BoundingRect = require('zrender/core/BoundingRect');
    var numberUtil = require('./number');
    var formatUtil = require('./format');
    var parsePercent = numberUtil.parsePercent;

    var layout = {};

    function boxLayout(orient, group, gap, maxWidth, maxHeight) {
        var x = 0;
        var y = 0;
        if (maxWidth == null) {
            maxWidth = Infinity;
        }
        if (maxHeight == null) {
            maxHeight = Infinity;
        }
        var currentLineMaxSize = 0;
        group.eachChild(function (child, idx) {
            var position = child.position;
            var rect = child.getBoundingRect();
            var nextChild = group.childAt(idx + 1);
            var nextChildRect = nextChild && nextChild.getBoundingRect();
            var nextX;
            var nextY;
            if (orient === 'horizontal') {
                nextX = x + rect.width + (nextChildRect ? (-nextChildRect.x + rect.x) : 0);
                // Wrap when width exceeds maxWidth or meet a `newline` group
                if (nextX > maxWidth || child.newline) {
                    x = 0;
                    y += currentLineMaxSize + gap;
                    currentLineMaxSize = 0;
                }
                else {
                    currentLineMaxSize = Math.max(currentLineMaxSize, rect.height);
                }
            }
            else {
                nextY = y + rect.height + (nextChildRect ? (-nextChildRect.y + rect.y) : 0);
                // Wrap when width exceeds maxHeight or meet a `newline` group
                if (nextY > maxHeight || child.newline) {
                    x += currentLineMaxSize + gap;
                    y = 0;
                    currentLineMaxSize = 0;
                }
                else {
                    currentLineMaxSize = Math.max(currentLineMaxSize, rect.width);
                }
            }

            if (child.newline) {
                return;
            }

            position[0] = x;
            position[1] = y;

            orient === 'horizontal'
                ? (x = nextX + gap)
                : (y = nextY + gap);
        });
    }

    /**
     * VBox or HBox layouting
     * @param {string} orient
     * @param {module:zrender/container/Group} group
     * @param {number} gap
     * @param {number} [width=Infinity]
     * @param {number} [height=Infinity]
     */
    layout.box = boxLayout;

    /**
     * VBox layouting
     * @param {module:zrender/container/Group} group
     * @param {number} gap
     * @param {number} [width=Infinity]
     * @param {number} [height=Infinity]
     */
    layout.vbox = zrUtil.curry(boxLayout, 'vertical');

    /**
     * HBox layouting
     * @param {module:zrender/container/Group} group
     * @param {number} gap
     * @param {number} [width=Infinity]
     * @param {number} [height=Infinity]
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
     *
     * @param {Object} positionInfo
     * @param {number|string} [positionInfo.left]
     * @param {number|string} [positionInfo.top]
     * @param {number|string} [positionInfo.right]
     * @param {number|string} [positionInfo.bottom]
     * @param {number|string} [positionInfo.width]
     * @param {number|string} [positionInfo.height]
     * @param {number|string} [positionInfo.aspect] Aspect is width / height
     * @param {Object} containerRect
     * @param {string|number} [margin]
     *
     * @return {module:zrender/core/BoundingRect}
     */
    layout.getLayoutRect = function (
        positionInfo, containerRect, margin
    ) {
        margin = formatUtil.normalizeCssArray(margin || 0);

        var containerWidth = containerRect.width;
        var containerHeight = containerRect.height;

        var left = parsePercent(positionInfo.left, containerWidth);
        var top = parsePercent(positionInfo.top, containerHeight);
        var right = parsePercent(positionInfo.right, containerWidth);
        var bottom = parsePercent(positionInfo.bottom, containerHeight);
        var width = parsePercent(positionInfo.width, containerWidth);
        var height = parsePercent(positionInfo.height, containerHeight);

        var verticalMargin = margin[2] + margin[0];
        var horizontalMargin = margin[1] + margin[3];
        var aspect = positionInfo.aspect;

        // If width is not specified, calculate width from left and right
        if (isNaN(width)) {
            width = containerWidth - right - horizontalMargin - left;
        }
        if (isNaN(height)) {
            height = containerHeight - bottom - verticalMargin - top;
        }

        // If width and height are not given
        // 1. Graph should not exceeds the container
        // 2. Aspect must be keeped
        // 3. Graph should take the space as more as possible
        if (isNaN(width) && isNaN(height)) {
            if (aspect > containerWidth / containerHeight) {
                width = containerWidth * 0.8;
            }
            else {
                height = containerHeight * 0.8;
            }
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

        // If left is not specified, calculate left from right and width
        if (isNaN(left)) {
            left = containerWidth - right - width - horizontalMargin;
        }
        if (isNaN(top)) {
            top = containerHeight - bottom - height - verticalMargin;
        }

        // Align left and top
        switch (positionInfo.left || positionInfo.right) {
            case 'center':
                left = containerWidth / 2 - width / 2 - margin[3];
                break;
            case 'right':
                left = containerWidth - width - horizontalMargin;
                break;
        }
        switch (positionInfo.top || positionInfo.bottom) {
            case 'middle':
            case 'center':
                top = containerHeight / 2 - height / 2 - margin[0];
                break;
            case 'bottom':
                top = containerHeight - height - verticalMargin;
                break;
        }

        var rect = new BoundingRect(left + margin[3], top + margin[0], width, height);
        rect.margin = margin;
        return rect;
    };

    /**
     * Position group of component in viewport
     *  Group position is specified by either
     *  {left, top}, {right, bottom}
     *  If all properties exists, right and bottom will be igonred.
     *
     * @param {module:zrender/container/Group} group
     * @param {Object} positionInfo
     * @param {number|string} [positionInfo.left]
     * @param {number|string} [positionInfo.top]
     * @param {number|string} [positionInfo.right]
     * @param {number|string} [positionInfo.bottom]
     * @param {Object} containerRect
     * @param {string|number} margin
     */
    layout.positionGroup = function (
        group, positionInfo, containerRect, margin
    ) {
        var groupRect = group.getBoundingRect();

        positionInfo = zrUtil.extend(zrUtil.clone(positionInfo), {
            width: groupRect.width,
            height: groupRect.height
        });

        positionInfo = layout.getLayoutRect(
            positionInfo, containerRect, margin
        );

        group.position = [
            positionInfo.x - groupRect.x,
            positionInfo.y - groupRect.y
        ];
    };

    return layout;
});