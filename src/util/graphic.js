import * as zrUtil from 'zrender/src/core/util';
import * as pathTool from 'zrender/src/tool/path';
import * as colorTool from 'zrender/src/tool/color';
import * as matrix from 'zrender/src/core/matrix';
import * as vector from 'zrender/src/core/vector';
import Path from 'zrender/src/graphic/Path';
import Transformable from 'zrender/src/mixin/Transformable';
import ZImage from 'zrender/src/graphic/Image';
import Group from 'zrender/src/container/Group';
import Text from 'zrender/src/graphic/Text';
import Circle from 'zrender/src/graphic/shape/Circle';
import Sector from 'zrender/src/graphic/shape/Sector';
import Ring from 'zrender/src/graphic/shape/Ring';
import Polygon from 'zrender/src/graphic/shape/Polygon';
import Polyline from 'zrender/src/graphic/shape/Polyline';
import Rect from 'zrender/src/graphic/shape/Rect';
import Line from 'zrender/src/graphic/shape/Line';
import BezierCurve from 'zrender/src/graphic/shape/BezierCurve';
import Arc from 'zrender/src/graphic/shape/Arc';
import CompoundPath from 'zrender/src/graphic/CompoundPath';
import LinearGradient from 'zrender/src/graphic/LinearGradient';
import RadialGradient from 'zrender/src/graphic/RadialGradient';
import BoundingRect from 'zrender/src/core/BoundingRect';
import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';


var round = Math.round;
var mathMax = Math.max;
var mathMin = Math.min;

var EMPTY_OBJ = {};

/**
 * Extend shape with parameters
 */
export function extendShape(opts) {
    return Path.extend(opts);
}

/**
 * Extend path
 */
export function extendPath(pathData, opts) {
    return pathTool.extendFromString(pathData, opts);
}

/**
 * Create a path element from path data string
 * @param {string} pathData
 * @param {Object} opts
 * @param {module:zrender/core/BoundingRect} rect
 * @param {string} [layout=cover] 'center' or 'cover'
 */
export function makePath(pathData, opts, rect, layout) {
    var path = pathTool.createFromString(pathData, opts);
    var boundingRect = path.getBoundingRect();
    if (rect) {
        if (layout === 'center') {
            rect = centerGraphic(rect, boundingRect);
        }

        resizePath(path, rect);
    }
    return path;
}

/**
 * Create a image element from image url
 * @param {string} imageUrl image url
 * @param {Object} opts options
 * @param {module:zrender/core/BoundingRect} rect constrain rect
 * @param {string} [layout=cover] 'center' or 'cover'
 */
export function makeImage(imageUrl, rect, layout) {
    var path = new ZImage({
        style: {
            image: imageUrl,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        },
        onload: function (img) {
            if (layout === 'center') {
                var boundingRect = {
                    width: img.width,
                    height: img.height
                };
                path.setStyle(centerGraphic(rect, boundingRect));
            }
        }
    });
    return path;
}

/**
 * Get position of centered element in bounding box.
 *
 * @param  {Object} rect         element local bounding box
 * @param  {Object} boundingRect constraint bounding box
 * @return {Object} element position containing x, y, width, and height
 */
function centerGraphic(rect, boundingRect) {
    // Set rect to center, keep width / height ratio.
    var aspect = boundingRect.width / boundingRect.height;
    var width = rect.height * aspect;
    var height;
    if (width <= rect.width) {
        height = rect.height;
    }
    else {
        width = rect.width;
        height = width / aspect;
    }
    var cx = rect.x + rect.width / 2;
    var cy = rect.y + rect.height / 2;

    return {
        x: cx - width / 2,
        y: cy - height / 2,
        width: width,
        height: height
    };
}

export var mergePath = pathTool.mergePath;

/**
 * Resize a path to fit the rect
 * @param {module:zrender/graphic/Path} path
 * @param {Object} rect
 */
export function resizePath(path, rect) {
    if (!path.applyTransform) {
        return;
    }

    var pathRect = path.getBoundingRect();

    var m = pathRect.calculateTransform(rect);

    path.applyTransform(m);
}

/**
 * Sub pixel optimize line for canvas
 *
 * @param {Object} param
 * @param {Object} [param.shape]
 * @param {number} [param.shape.x1]
 * @param {number} [param.shape.y1]
 * @param {number} [param.shape.x2]
 * @param {number} [param.shape.y2]
 * @param {Object} [param.style]
 * @param {number} [param.style.lineWidth]
 * @return {Object} Modified param
 */
export function subPixelOptimizeLine(param) {
    var shape = param.shape;
    var lineWidth = param.style.lineWidth;

    if (round(shape.x1 * 2) === round(shape.x2 * 2)) {
        shape.x1 = shape.x2 = subPixelOptimize(shape.x1, lineWidth, true);
    }
    if (round(shape.y1 * 2) === round(shape.y2 * 2)) {
        shape.y1 = shape.y2 = subPixelOptimize(shape.y1, lineWidth, true);
    }
    return param;
}

/**
 * Sub pixel optimize rect for canvas
 *
 * @param {Object} param
 * @param {Object} [param.shape]
 * @param {number} [param.shape.x]
 * @param {number} [param.shape.y]
 * @param {number} [param.shape.width]
 * @param {number} [param.shape.height]
 * @param {Object} [param.style]
 * @param {number} [param.style.lineWidth]
 * @return {Object} Modified param
 */
export function subPixelOptimizeRect(param) {
    var shape = param.shape;
    var lineWidth = param.style.lineWidth;
    var originX = shape.x;
    var originY = shape.y;
    var originWidth = shape.width;
    var originHeight = shape.height;
    shape.x = subPixelOptimize(shape.x, lineWidth, true);
    shape.y = subPixelOptimize(shape.y, lineWidth, true);
    shape.width = Math.max(
        subPixelOptimize(originX + originWidth, lineWidth, false) - shape.x,
        originWidth === 0 ? 0 : 1
    );
    shape.height = Math.max(
        subPixelOptimize(originY + originHeight, lineWidth, false) - shape.y,
        originHeight === 0 ? 0 : 1
    );
    return param;
}

/**
 * Sub pixel optimize for canvas
 *
 * @param {number} position Coordinate, such as x, y
 * @param {number} lineWidth Should be nonnegative integer.
 * @param {boolean=} positiveOrNegative Default false (negative).
 * @return {number} Optimized position.
 */
export function subPixelOptimize(position, lineWidth, positiveOrNegative) {
    // Assure that (position + lineWidth / 2) is near integer edge,
    // otherwise line will be fuzzy in canvas.
    var doubledPosition = round(position * 2);
    return (doubledPosition + round(lineWidth)) % 2 === 0
        ? doubledPosition / 2
        : (doubledPosition + (positiveOrNegative ? 1 : -1)) / 2;
}

function hasFillOrStroke(fillOrStroke) {
    return fillOrStroke != null && fillOrStroke != 'none';
}

function liftColor(color) {
    return typeof color === 'string' ? colorTool.lift(color, -0.1) : color;
}

/**
 * @private
 */
function cacheElementStl(el) {
    if (el.__hoverStlDirty) {
        var stroke = el.style.stroke;
        var fill = el.style.fill;

        // Create hoverStyle on mouseover
        var hoverStyle = el.__hoverStl;
        hoverStyle.fill = hoverStyle.fill
            || (hasFillOrStroke(fill) ? liftColor(fill) : null);
        hoverStyle.stroke = hoverStyle.stroke
            || (hasFillOrStroke(stroke) ? liftColor(stroke) : null);

        var normalStyle = {};
        for (var name in hoverStyle) {
            // See comment in `doSingleEnterHover`.
            if (hoverStyle[name] != null) {
                normalStyle[name] = el.style[name];
            }
        }

        el.__normalStl = normalStyle;

        el.__hoverStlDirty = false;
    }
}

/**
 * @private
 */
function doSingleEnterHover(el) {
    if (el.__isHover) {
        return;
    }

    cacheElementStl(el);

    if (el.useHoverLayer) {
        el.__zr && el.__zr.addHover(el, el.__hoverStl);
    }
    else {
        var style = el.style;
        var insideRollbackOpt = style.insideRollbackOpt;

        // Consider case: only `position: 'top'` is set on emphasis, then text
        // color should be returned to `autoColor`, rather than remain '#fff'.
        // So we should rollback then apply again after style merging.
        insideRollbackOpt && rollbackInsideStyle(style);

        // styles can be:
        // {
        //    label: {
        //        show: false,
        //        position: 'outside',
        //        fontSize: 18
        //    },
        //    emphasis: {
        //        label: {
        //            show: true
        //        }
        //    }
        // },
        // where properties of `emphasis` may not appear in `normal`. We previously use
        // module:echarts/util/model#defaultEmphasis to merge `normal` to `emphasis`.
        // But consider rich text and setOption in merge mode, it is impossible to cover
        // all properties in merge. So we use merge mode when setting style here, where
        // only properties that is not `null/undefined` can be set. The disadventage:
        // null/undefined can not be used to remove style any more in `emphasis`.
        style.extendFrom(el.__hoverStl);

        // Do not save `insideRollback`.
        if (insideRollbackOpt) {
            applyInsideStyle(style, style.insideOriginalTextPosition, insideRollbackOpt);

            // textFill may be rollbacked to null.
            if (style.textFill == null) {
                style.textFill = insideRollbackOpt.autoColor;
            }
        }

        el.dirty(false);
        el.z2 += 1;
    }

    el.__isHover = true;
}

/**
 * @inner
 */
function doSingleLeaveHover(el) {
    if (!el.__isHover) {
        return;
    }

    var normalStl = el.__normalStl;
    if (el.useHoverLayer) {
        el.__zr && el.__zr.removeHover(el);
    }
    else {
        // Consider null/undefined value, should use
        // `setStyle` but not `extendFrom(stl, true)`.
        normalStl && el.setStyle(normalStl);
        el.z2 -= 1;
    }

    el.__isHover = false;
}

/**
 * @inner
 */
function doEnterHover(el) {
    el.type === 'group'
        ? el.traverse(function (child) {
            if (child.type !== 'group') {
                doSingleEnterHover(child);
            }
        })
        : doSingleEnterHover(el);
}

function doLeaveHover(el) {
    el.type === 'group'
        ? el.traverse(function (child) {
            if (child.type !== 'group') {
                doSingleLeaveHover(child);
            }
        })
        : doSingleLeaveHover(el);
}

/**
 * @inner
 */
function setElementHoverStl(el, hoverStl) {
    // If element has sepcified hoverStyle, then use it instead of given hoverStyle
    // Often used when item group has a label element and it's hoverStyle is different
    el.__hoverStl = el.hoverStyle || hoverStl || {};
    el.__hoverStlDirty = true;

    if (el.__isHover) {
        cacheElementStl(el);
    }
}

/**
 * @inner
 */
function onElementMouseOver(e) {
    if (this.__hoverSilentOnTouch && e.zrByTouch) {
        return;
    }

    // Only if element is not in emphasis status
    !this.__isEmphasis && doEnterHover(this);
}

/**
 * @inner
 */
function onElementMouseOut(e) {
    if (this.__hoverSilentOnTouch && e.zrByTouch) {
        return;
    }

    // Only if element is not in emphasis status
    !this.__isEmphasis && doLeaveHover(this);
}

/**
 * @inner
 */
function enterEmphasis() {
    this.__isEmphasis = true;
    doEnterHover(this);
}

/**
 * @inner
 */
function leaveEmphasis() {
    this.__isEmphasis = false;
    doLeaveHover(this);
}

/**
 * Set hover style of element.
 * This method can be called repeatly without side-effects.
 * @param {module:zrender/Element} el
 * @param {Object} [hoverStyle]
 * @param {Object} [opt]
 * @param {boolean} [opt.hoverSilentOnTouch=false]
 *        In touch device, mouseover event will be trigger on touchstart event
 *        (see module:zrender/dom/HandlerProxy). By this mechanism, we can
 *        conviniently use hoverStyle when tap on touch screen without additional
 *        code for compatibility.
 *        But if the chart/component has select feature, which usually also use
 *        hoverStyle, there might be conflict between 'select-highlight' and
 *        'hover-highlight' especially when roam is enabled (see geo for example).
 *        In this case, hoverSilentOnTouch should be used to disable hover-highlight
 *        on touch device.
 */
export function setHoverStyle(el, hoverStyle, opt) {
    el.__hoverSilentOnTouch = opt && opt.hoverSilentOnTouch;

    el.type === 'group'
        ? el.traverse(function (child) {
            if (child.type !== 'group') {
                setElementHoverStl(child, hoverStyle);
            }
        })
        : setElementHoverStl(el, hoverStyle);

    // Duplicated function will be auto-ignored, see Eventful.js.
    el.on('mouseover', onElementMouseOver)
        .on('mouseout', onElementMouseOut);

    // Emphasis, normal can be triggered manually
    el.on('emphasis', enterEmphasis)
        .on('normal', leaveEmphasis);
}

/**
 * @param {Object|module:zrender/graphic/Style} normalStyle
 * @param {Object} emphasisStyle
 * @param {module:echarts/model/Model} normalModel
 * @param {module:echarts/model/Model} emphasisModel
 * @param {Object} opt Check `opt` of `setTextStyleCommon` to find other props.
 * @param {string|Function} [opt.defaultText]
 * @param {module:echarts/model/Model} [opt.labelFetcher] Fetch text by
 *      `opt.labelFetcher.getFormattedLabel(opt.labelDataIndex, 'normal'/'emphasis', null, opt.labelDimIndex)`
 * @param {module:echarts/model/Model} [opt.labelDataIndex] Fetch text by
 *      `opt.textFetcher.getFormattedLabel(opt.labelDataIndex, 'normal'/'emphasis', null, opt.labelDimIndex)`
 * @param {module:echarts/model/Model} [opt.labelDimIndex] Fetch text by
 *      `opt.textFetcher.getFormattedLabel(opt.labelDataIndex, 'normal'/'emphasis', null, opt.labelDimIndex)`
 * @param {Object} [normalSpecified]
 * @param {Object} [emphasisSpecified]
 */
export function setLabelStyle(
    normalStyle, emphasisStyle,
    normalModel, emphasisModel,
    opt,
    normalSpecified, emphasisSpecified
) {
    opt = opt || EMPTY_OBJ;
    var labelFetcher = opt.labelFetcher;
    var labelDataIndex = opt.labelDataIndex;
    var labelDimIndex = opt.labelDimIndex;

    // This scenario, `label.normal.show = true; label.emphasis.show = false`,
    // is not supported util someone requests.

    var showNormal = normalModel.getShallow('show');
    var showEmphasis = emphasisModel.getShallow('show');

    // Consider performance, only fetch label when necessary.
    // If `normal.show` is `false` and `emphasis.show` is `true` and `emphasis.formatter` is not set,
    // label should be displayed, where text is fetched by `normal.formatter` or `opt.defaultText`.
    var baseText;
    if (showNormal || showEmphasis) {
        if (labelFetcher) {
            baseText = labelFetcher.getFormattedLabel(labelDataIndex, 'normal', null, labelDimIndex);
        }
        if (baseText == null) {
            baseText = zrUtil.isFunction(opt.defaultText) ? opt.defaultText(labelDataIndex, opt) : opt.defaultText;
        }
    }
    var normalStyleText = showNormal ? baseText : null;
    var emphasisStyleText = showEmphasis
        ? zrUtil.retrieve2(
            labelFetcher
                ? labelFetcher.getFormattedLabel(labelDataIndex, 'emphasis', null, labelDimIndex)
                : null,
            baseText
        )
        : null;

    // Optimize: If style.text is null, text will not be drawn.
    if (normalStyleText != null || emphasisStyleText != null) {
        // Always set `textStyle` even if `normalStyle.text` is null, because default
        // values have to be set on `normalStyle`.
        // If we set default values on `emphasisStyle`, consider case:
        // Firstly, `setOption(... label: {normal: {text: null}, emphasis: {show: true}} ...);`
        // Secondly, `setOption(... label: {noraml: {show: true, text: 'abc', color: 'red'} ...);`
        // Then the 'red' will not work on emphasis.
        setTextStyle(normalStyle, normalModel, normalSpecified, opt);
        setTextStyle(emphasisStyle, emphasisModel, emphasisSpecified, opt, true);
    }

    normalStyle.text = normalStyleText;
    emphasisStyle.text = emphasisStyleText;
}

/**
 * Set basic textStyle properties.
 * @param {Object|module:zrender/graphic/Style} textStyle
 * @param {module:echarts/model/Model} model
 * @param {Object} [specifiedTextStyle] Can be overrided by settings in model.
 * @param {Object} [opt] See `opt` of `setTextStyleCommon`.
 * @param {boolean} [isEmphasis]
 */
export function setTextStyle(
    textStyle, textStyleModel, specifiedTextStyle, opt, isEmphasis
) {
    setTextStyleCommon(textStyle, textStyleModel, opt, isEmphasis);
    specifiedTextStyle && zrUtil.extend(textStyle, specifiedTextStyle);
    textStyle.host && textStyle.host.dirty && textStyle.host.dirty(false);

    return textStyle;
}

/**
 * Set text option in the style.
 * @deprecated
 * @param {Object} textStyle
 * @param {module:echarts/model/Model} labelModel
 * @param {string|boolean} defaultColor Default text color.
 *        If set as false, it will be processed as a emphasis style.
 */
export function setText(textStyle, labelModel, defaultColor) {
    var opt = {isRectText: true};
    var isEmphasis;

    if (defaultColor === false) {
        isEmphasis = true;
    }
    else {
        // Support setting color as 'auto' to get visual color.
        opt.autoColor = defaultColor;
    }
    setTextStyleCommon(textStyle, labelModel, opt, isEmphasis);
    textStyle.host && textStyle.host.dirty && textStyle.host.dirty(false);
}

/**
 * {
 *      disableBox: boolean, Whether diable drawing box of block (outer most).
 *      isRectText: boolean,
 *      autoColor: string, specify a color when color is 'auto',
 *              for textFill, textStroke, textBackgroundColor, and textBorderColor.
 *              If autoColor specified, it is used as default textFill.
 *      useInsideStyle:
 *              `true`: Use inside style (textFill, textStroke, textStrokeWidth)
 *                  if `textFill` is not specified.
 *              `false`: Do not use inside style.
 *              `null/undefined`: use inside style if `isRectText` is true and
 *                  `textFill` is not specified and textPosition contains `'inside'`.
 *      forceRich: boolean
 * }
 */
function setTextStyleCommon(textStyle, textStyleModel, opt, isEmphasis) {
    // Consider there will be abnormal when merge hover style to normal style if given default value.
    opt = opt || EMPTY_OBJ;

    if (opt.isRectText) {
        var textPosition = textStyleModel.getShallow('position')
            || (isEmphasis ? null : 'inside');
        // 'outside' is not a valid zr textPostion value, but used
        // in bar series, and magric type should be considered.
        textPosition === 'outside' && (textPosition = 'top');
        textStyle.textPosition = textPosition;
        textStyle.textOffset = textStyleModel.getShallow('offset');
        var labelRotate = textStyleModel.getShallow('rotate');
        labelRotate != null && (labelRotate *= Math.PI / 180);
        textStyle.textRotation = labelRotate;
        textStyle.textDistance = zrUtil.retrieve2(
            textStyleModel.getShallow('distance'), isEmphasis ? null : 5
        );
    }

    var ecModel = textStyleModel.ecModel;
    var globalTextStyle = ecModel && ecModel.option.textStyle;

    // Consider case:
    // {
    //     data: [{
    //         value: 12,
    //         label: {
    //             rich: {
    //                 // no 'a' here but using parent 'a'.
    //             }
    //         }
    //     }],
    //     rich: {
    //         a: { ... }
    //     }
    // }
    var richItemNames = getRichItemNames(textStyleModel);
    var richResult;
    if (richItemNames) {
        richResult = {};
        for (var name in richItemNames) {
            if (richItemNames.hasOwnProperty(name)) {
                // Cascade is supported in rich.
                var richTextStyle = textStyleModel.getModel(['rich', name]);
                // In rich, never `disableBox`.
                setTokenTextStyle(richResult[name] = {}, richTextStyle, globalTextStyle, opt, isEmphasis);
            }
        }
    }
    textStyle.rich = richResult;

    setTokenTextStyle(textStyle, textStyleModel, globalTextStyle, opt, isEmphasis, true);

    if (opt.forceRich && !opt.textStyle) {
        opt.textStyle = {};
    }

    return textStyle;
}

// Consider case:
// {
//     data: [{
//         value: 12,
//         label: {
//             rich: {
//                 // no 'a' here but using parent 'a'.
//             }
//         }
//     }],
//     rich: {
//         a: { ... }
//     }
// }
function getRichItemNames(textStyleModel) {
    // Use object to remove duplicated names.
    var richItemNameMap;
    while (textStyleModel && textStyleModel !== textStyleModel.ecModel) {
        var rich = (textStyleModel.option || EMPTY_OBJ).rich;
        if (rich) {
            richItemNameMap = richItemNameMap || {};
            for (var name in rich) {
                if (rich.hasOwnProperty(name)) {
                    richItemNameMap[name] = 1;
                }
            }
        }
        textStyleModel = textStyleModel.parentModel;
    }
    return richItemNameMap;
}

function setTokenTextStyle(textStyle, textStyleModel, globalTextStyle, opt, isEmphasis, isBlock) {
    // In merge mode, default value should not be given.
    globalTextStyle = !isEmphasis && globalTextStyle || EMPTY_OBJ;

    textStyle.textFill = getAutoColor(textStyleModel.getShallow('color'), opt)
        || globalTextStyle.color;
    textStyle.textStroke = getAutoColor(textStyleModel.getShallow('textBorderColor'), opt)
        || globalTextStyle.textBorderColor;
    textStyle.textStrokeWidth = zrUtil.retrieve2(
        textStyleModel.getShallow('textBorderWidth'),
        globalTextStyle.textBorderWidth
    );

    if (!isEmphasis) {
        if (isBlock) {
            // Always set `insideRollback`, for clearing previous.
            var originalTextPosition = textStyle.textPosition;
            textStyle.insideRollback = applyInsideStyle(textStyle, originalTextPosition, opt);
            // Save original textPosition, because style.textPosition will be repalced by
            // real location (like [10, 30]) in zrender.
            textStyle.insideOriginalTextPosition = originalTextPosition;
            textStyle.insideRollbackOpt = opt;
        }

        // Set default finally.
        if (textStyle.textFill == null) {
            textStyle.textFill = opt.autoColor;
        }
    }

    // Do not use `getFont` here, because merge should be supported, where
    // part of these properties may be changed in emphasis style, and the
    // others should remain their original value got from normal style.
    textStyle.fontStyle = textStyleModel.getShallow('fontStyle') || globalTextStyle.fontStyle;
    textStyle.fontWeight = textStyleModel.getShallow('fontWeight') || globalTextStyle.fontWeight;
    textStyle.fontSize = textStyleModel.getShallow('fontSize') || globalTextStyle.fontSize;
    textStyle.fontFamily = textStyleModel.getShallow('fontFamily') || globalTextStyle.fontFamily;

    textStyle.textAlign = textStyleModel.getShallow('align');
    textStyle.textVerticalAlign = textStyleModel.getShallow('verticalAlign')
        || textStyleModel.getShallow('baseline');

    textStyle.textLineHeight = textStyleModel.getShallow('lineHeight');
    textStyle.textWidth = textStyleModel.getShallow('width');
    textStyle.textHeight = textStyleModel.getShallow('height');
    textStyle.textTag = textStyleModel.getShallow('tag');

    if (!isBlock || !opt.disableBox) {
        textStyle.textBackgroundColor = getAutoColor(textStyleModel.getShallow('backgroundColor'), opt);
        textStyle.textPadding = textStyleModel.getShallow('padding');
        textStyle.textBorderColor = getAutoColor(textStyleModel.getShallow('borderColor'), opt);
        textStyle.textBorderWidth = textStyleModel.getShallow('borderWidth');
        textStyle.textBorderRadius = textStyleModel.getShallow('borderRadius');

        textStyle.textBoxShadowColor = textStyleModel.getShallow('shadowColor');
        textStyle.textBoxShadowBlur = textStyleModel.getShallow('shadowBlur');
        textStyle.textBoxShadowOffsetX = textStyleModel.getShallow('shadowOffsetX');
        textStyle.textBoxShadowOffsetY = textStyleModel.getShallow('shadowOffsetY');
    }

    textStyle.textShadowColor = textStyleModel.getShallow('textShadowColor')
        || globalTextStyle.textShadowColor;
    textStyle.textShadowBlur = textStyleModel.getShallow('textShadowBlur')
        || globalTextStyle.textShadowBlur;
    textStyle.textShadowOffsetX = textStyleModel.getShallow('textShadowOffsetX')
        || globalTextStyle.textShadowOffsetX;
    textStyle.textShadowOffsetY = textStyleModel.getShallow('textShadowOffsetY')
        || globalTextStyle.textShadowOffsetY;
}

function getAutoColor(color, opt) {
    return color !== 'auto' ? color : (opt && opt.autoColor) ? opt.autoColor : null;
}

function applyInsideStyle(textStyle, textPosition, opt) {
    var useInsideStyle = opt.useInsideStyle;
    var insideRollback;

    if (textStyle.textFill == null
        && useInsideStyle !== false
        && (useInsideStyle === true
            || (opt.isRectText
                && textPosition
                // textPosition can be [10, 30]
                && typeof textPosition === 'string'
                && textPosition.indexOf('inside') >= 0
            )
        )
    ) {
        insideRollback = {
            textFill: null,
            textStroke: textStyle.textStroke,
            textStrokeWidth: textStyle.textStrokeWidth
        };
        textStyle.textFill = '#fff';
        // Consider text with #fff overflow its container.
        if (textStyle.textStroke == null) {
            textStyle.textStroke = opt.autoColor;
            textStyle.textStrokeWidth == null && (textStyle.textStrokeWidth = 2);
        }
    }

    return insideRollback;
}

function rollbackInsideStyle(style) {
    var insideRollback = style.insideRollback;
    if (insideRollback) {
        style.textFill = insideRollback.textFill;
        style.textStroke = insideRollback.textStroke;
        style.textStrokeWidth = insideRollback.textStrokeWidth;
    }
}

export function getFont(opt, ecModel) {
    // ecModel or default text style model.
    var gTextStyleModel = ecModel || ecModel.getModel('textStyle');
    return zrUtil.trim([
        // FIXME in node-canvas fontWeight is before fontStyle
        opt.fontStyle || gTextStyleModel && gTextStyleModel.getShallow('fontStyle') || '',
        opt.fontWeight || gTextStyleModel && gTextStyleModel.getShallow('fontWeight') || '',
        (opt.fontSize || gTextStyleModel && gTextStyleModel.getShallow('fontSize') || 12) + 'px',
        opt.fontFamily || gTextStyleModel && gTextStyleModel.getShallow('fontFamily') || 'sans-serif'
    ].join(' '));
}

function animateOrSetProps(isUpdate, el, props, animatableModel, dataIndex, cb) {
    if (typeof dataIndex === 'function') {
        cb = dataIndex;
        dataIndex = null;
    }
    // Do not check 'animation' property directly here. Consider this case:
    // animation model is an `itemModel`, whose does not have `isAnimationEnabled`
    // but its parent model (`seriesModel`) does.
    var animationEnabled = animatableModel && animatableModel.isAnimationEnabled();

    if (animationEnabled) {
        var postfix = isUpdate ? 'Update' : '';
        var duration = animatableModel.getShallow('animationDuration' + postfix);
        var animationEasing = animatableModel.getShallow('animationEasing' + postfix);
        var animationDelay = animatableModel.getShallow('animationDelay' + postfix);
        if (typeof animationDelay === 'function') {
            animationDelay = animationDelay(
                dataIndex,
                animatableModel.getAnimationDelayParams
                    ? animatableModel.getAnimationDelayParams(el, dataIndex)
                    : null
            );
        }
        if (typeof duration === 'function') {
            duration = duration(dataIndex);
        }

        duration > 0
            ? el.animateTo(props, duration, animationDelay || 0, animationEasing, cb, !!cb)
            : (el.stopAnimation(), el.attr(props), cb && cb());
    }
    else {
        el.stopAnimation();
        el.attr(props);
        cb && cb();
    }
}

/**
 * Update graphic element properties with or without animation according to the
 * configuration in series.
 *
 * Caution: this method will stop previous animation.
 * So if do not use this method to one element twice before
 * animation starts, unless you know what you are doing.
 *
 * @param {module:zrender/Element} el
 * @param {Object} props
 * @param {module:echarts/model/Model} [animatableModel]
 * @param {number} [dataIndex]
 * @param {Function} [cb]
 * @example
 *     graphic.updateProps(el, {
 *         position: [100, 100]
 *     }, seriesModel, dataIndex, function () { console.log('Animation done!'); });
 *     // Or
 *     graphic.updateProps(el, {
 *         position: [100, 100]
 *     }, seriesModel, function () { console.log('Animation done!'); });
 */
export function updateProps(el, props, animatableModel, dataIndex, cb) {
    animateOrSetProps(true, el, props, animatableModel, dataIndex, cb);
}

/**
 * Init graphic element properties with or without animation according to the
 * configuration in series.
 *
 * Caution: this method will stop previous animation.
 * So if do not use this method to one element twice before
 * animation starts, unless you know what you are doing.
 *
 * @param {module:zrender/Element} el
 * @param {Object} props
 * @param {module:echarts/model/Model} [animatableModel]
 * @param {number} [dataIndex]
 * @param {Function} cb
 */
export function initProps(el, props, animatableModel, dataIndex, cb) {
    animateOrSetProps(false, el, props, animatableModel, dataIndex, cb);
}

/**
 * Get transform matrix of target (param target),
 * in coordinate of its ancestor (param ancestor)
 *
 * @param {module:zrender/mixin/Transformable} target
 * @param {module:zrender/mixin/Transformable} [ancestor]
 */
export function getTransform(target, ancestor) {
    var mat = matrix.identity([]);

    while (target && target !== ancestor) {
        matrix.mul(mat, target.getLocalTransform(), mat);
        target = target.parent;
    }

    return mat;
}

/**
 * Apply transform to an vertex.
 * @param {Array.<number>} target [x, y]
 * @param {Array.<number>|TypedArray.<number>|Object} transform Can be:
 *      + Transform matrix: like [1, 0, 0, 1, 0, 0]
 *      + {position, rotation, scale}, the same as `zrender/Transformable`.
 * @param {boolean=} invert Whether use invert matrix.
 * @return {Array.<number>} [x, y]
 */
export function applyTransform(target, transform, invert) {
    if (transform && !zrUtil.isArrayLike(transform)) {
        transform = Transformable.getLocalTransform(transform);
    }

    if (invert) {
        transform = matrix.invert([], transform);
    }
    return vector.applyTransform([], target, transform);
}

/**
 * @param {string} direction 'left' 'right' 'top' 'bottom'
 * @param {Array.<number>} transform Transform matrix: like [1, 0, 0, 1, 0, 0]
 * @param {boolean=} invert Whether use invert matrix.
 * @return {string} Transformed direction. 'left' 'right' 'top' 'bottom'
 */
export function transformDirection(direction, transform, invert) {

    // Pick a base, ensure that transform result will not be (0, 0).
    var hBase = (transform[4] === 0 || transform[5] === 0 || transform[0] === 0)
        ? 1 : Math.abs(2 * transform[4] / transform[0]);
    var vBase = (transform[4] === 0 || transform[5] === 0 || transform[2] === 0)
        ? 1 : Math.abs(2 * transform[4] / transform[2]);

    var vertex = [
        direction === 'left' ? -hBase : direction === 'right' ? hBase : 0,
        direction === 'top' ? -vBase : direction === 'bottom' ? vBase : 0
    ];

    vertex = applyTransform(vertex, transform, invert);

    return Math.abs(vertex[0]) > Math.abs(vertex[1])
        ? (vertex[0] > 0 ? 'right' : 'left')
        : (vertex[1] > 0 ? 'bottom' : 'top');
}

/**
 * Apply group transition animation from g1 to g2.
 * If no animatableModel, no animation.
 */
export function groupTransition(g1, g2, animatableModel, cb) {
    if (!g1 || !g2) {
        return;
    }

    function getElMap(g) {
        var elMap = {};
        g.traverse(function (el) {
            if (!el.isGroup && el.anid) {
                elMap[el.anid] = el;
            }
        });
        return elMap;
    }
    function getAnimatableProps(el) {
        var obj = {
            position: vector.clone(el.position),
            rotation: el.rotation
        };
        if (el.shape) {
            obj.shape = zrUtil.extend({}, el.shape);
        }
        return obj;
    }
    var elMap1 = getElMap(g1);

    g2.traverse(function (el) {
        if (!el.isGroup && el.anid) {
            var oldEl = elMap1[el.anid];
            if (oldEl) {
                var newProp = getAnimatableProps(el);
                el.attr(getAnimatableProps(oldEl));
                updateProps(el, newProp, animatableModel, el.dataIndex);
            }
            // else {
            //     if (el.previousProps) {
            //         graphic.updateProps
            //     }
            // }
        }
    });
}

/**
 * @param {Array.<Array.<number>>} points Like: [[23, 44], [53, 66], ...]
 * @param {Object} rect {x, y, width, height}
 * @return {Array.<Array.<number>>} A new clipped points.
 */
export function clipPointsByRect(points, rect) {
    return zrUtil.map(points, function (point) {
        var x = point[0];
        x = mathMax(x, rect.x);
        x = mathMin(x, rect.x + rect.width);
        var y = point[1];
        y = mathMax(y, rect.y);
        y = mathMin(y, rect.y + rect.height);
        return [x, y];
    });
}

/**
 * @param {Object} targetRect {x, y, width, height}
 * @param {Object} rect {x, y, width, height}
 * @return {Object} A new clipped rect. If rect size are negative, return undefined.
 */
export function clipRectByRect(targetRect, rect) {
    var x = mathMax(targetRect.x, rect.x);
    var x2 = mathMin(targetRect.x + targetRect.width, rect.x + rect.width);
    var y = mathMax(targetRect.y, rect.y);
    var y2 = mathMin(targetRect.y + targetRect.height, rect.y + rect.height);

    if (x2 >= x && y2 >= y) {
        return {
            x: x,
            y: y,
            width: x2 - x,
            height: y2 - y
        };
    }
}

/**
 * @param {string} iconStr Support 'image://' or 'path://' or direct svg path.
 * @param {Object} [opt] Properties of `module:zrender/Element`, except `style`.
 * @param {Object} [rect] {x, y, width, height}
 * @return {module:zrender/Element} Icon path or image element.
 */
export function createIcon(iconStr, opt, rect) {
    opt = zrUtil.extend({rectHover: true}, opt);
    var style = opt.style = {strokeNoScale: true};
    rect = rect || {x: -1, y: -1, width: 2, height: 2};

    if (iconStr) {
        return iconStr.indexOf('image://') === 0
            ? (
                style.image = iconStr.slice(8),
                zrUtil.defaults(style, rect),
                new ZImage(opt)
            )
            : (
                makePath(
                    iconStr.replace('path://', ''),
                    opt,
                    rect,
                    'center'
                )
            );
    }
}

export {
    Group,
    ZImage as Image,
    Text,
    Circle,
    Sector,
    Ring,
    Polygon,
    Polyline,
    Rect,
    Line,
    BezierCurve,
    Arc,
    IncrementalDisplayable,
    CompoundPath,
    LinearGradient,
    RadialGradient,
    BoundingRect
};
