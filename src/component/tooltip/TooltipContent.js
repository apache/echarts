/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as zrUtil from 'zrender/src/core/util';
import * as zrColor from 'zrender/src/tool/color';
import * as eventUtil from 'zrender/src/core/event';
import * as domUtil from 'zrender/src/core/dom';
import env from 'zrender/src/core/env';
import * as formatUtil from '../../util/format';

var each = zrUtil.each;
var toCamelCase = formatUtil.toCamelCase;

var vendors = ['', '-webkit-', '-moz-', '-o-'];

var gCssText = 'position:absolute;display:block;border-style:solid;white-space:nowrap;z-index:9999999;';

/**
 * @param {number} duration
 * @return {string}
 * @inner
 */
function assembleTransition(duration) {
    var transitionCurve = 'cubic-bezier(0.23, 1, 0.32, 1)';
    var transitionText = 'left ' + duration + 's ' + transitionCurve + ','
                        + 'top ' + duration + 's ' + transitionCurve;
    return zrUtil.map(vendors, function (vendorPrefix) {
        return vendorPrefix + 'transition:' + transitionText;
    }).join(';');
}

/**
 * @param {Object} textStyle
 * @return {string}
 * @inner
 */
function assembleFont(textStyleModel) {
    var cssText = [];

    var fontSize = textStyleModel.get('fontSize');
    var color = textStyleModel.getTextColor();

    color && cssText.push('color:' + color);

    cssText.push('font:' + textStyleModel.getFont());

    var lineHeight = textStyleModel.get('lineHeight');
    if (lineHeight == null) {
        lineHeight = Math.round(fontSize * 3 / 2);
    }

    fontSize
        && cssText.push('line-height:' + lineHeight + 'px');

    var shadowColor = textStyleModel.get('textShadowColor');
    var shadowBlur = textStyleModel.get('textShadowBlur') || 0;
    var shadowOffsetX = textStyleModel.get('textShadowOffsetX') || 0;
    var shadowOffsetY = textStyleModel.get('textShadowOffsetY') || 0;
    shadowBlur
        && cssText.push('text-shadow:' + shadowOffsetX + 'px ' + shadowOffsetY + 'px '
            + shadowBlur + 'px ' + shadowColor);

    each(['decoration', 'align'], function (name) {
        var val = textStyleModel.get(name);
        val && cssText.push('text-' + name + ':' + val);
    });

    return cssText.join(';');
}

/**
 * @param {Object} tooltipModel
 * @return {string}
 * @inner
 */
function assembleCssText(tooltipModel) {

    var cssText = [];

    var transitionDuration = tooltipModel.get('transitionDuration');
    var backgroundColor = tooltipModel.get('backgroundColor');
    var textStyleModel = tooltipModel.getModel('textStyle');
    var padding = tooltipModel.get('padding');

    // Animation transition. Do not animate when transitionDuration is 0.
    transitionDuration
        && cssText.push(assembleTransition(transitionDuration));

    if (backgroundColor) {
        if (env.canvasSupported) {
            cssText.push('background-Color:' + backgroundColor);
        }
        else {
            // for ie
            cssText.push(
                'background-Color:#' + zrColor.toHex(backgroundColor)
            );
            cssText.push('filter:alpha(opacity=70)');
        }
    }

    // Border style
    each(['width', 'color', 'radius'], function (name) {
        var borderName = 'border-' + name;
        var camelCase = toCamelCase(borderName);
        var val = tooltipModel.get(camelCase);
        val != null
            && cssText.push(borderName + ':' + val + (name === 'color' ? '' : 'px'));
    });

    // Text style
    cssText.push(assembleFont(textStyleModel));

    // Padding
    if (padding != null) {
        cssText.push('padding:' + formatUtil.normalizeCssArray(padding).join('px ') + 'px');
    }

    return cssText.join(';') + ';';
}

// If not able to make, do not modify the input `out`.
function makeStyleCoord(out, zr, appendToBody, zrX, zrY) {
    var zrPainter = zr && zr.painter;

    if (appendToBody) {
        var zrViewportRoot = zrPainter && zrPainter.getViewportRoot();
        if (zrViewportRoot) {
            // Some APPs might use scale on body, so we support CSS transform here.
            domUtil.transformLocalCoord(out, zrViewportRoot, document.body, zrX, zrY);
        }
    }
    else {
        out[0] = zrX;
        out[1] = zrY;
        // xy should be based on canvas root. But tooltipContent is
        // the sibling of canvas root. So padding of ec container
        // should be considered here.
        var viewportRootOffset = zrPainter && zrPainter.getViewportRootOffset();
        if (viewportRootOffset) {
            out[0] += viewportRootOffset.offsetLeft;
            out[1] += viewportRootOffset.offsetTop;
        }
    }
    out[2] = out[0] / zr.getWidth(); // The ratio of left to width
    out[3] = out[1] / zr.getHeight(); // The ratio of top to height
}

/**
 * @alias module:echarts/component/tooltip/TooltipContent
 * @param {HTMLElement} container
 * @param {ExtensionAPI} api
 * @param {Object} [opt]
 * @param {boolean} [opt.appendToBody]
 *        `false`: the DOM element will be inside the container. Default value.
 *        `true`: the DOM element will be appended to HTML body, which avoid
 *                some overflow clip but intrude outside of the container.
 * @constructor
 */
function TooltipContent(container, api, opt) {
    if (env.wxa) {
        return null;
    }

    var el = document.createElement('div');
    el.domBelongToZr = true;
    this.el = el;
    var zr = this._zr = api.getZr();
    var appendToBody = this._appendToBody = opt && opt.appendToBody;

    this._styleCoord = [0, 0, 0, 0]; // [left, top, left/width, top/height]

    makeStyleCoord(this._styleCoord, zr, appendToBody, api.getWidth() / 2, api.getHeight() / 2);

    if (appendToBody) {
        document.body.appendChild(el);
    }
    else {
        container.appendChild(el);
    }

    this._container = container;

    this._show = false;

    /**
     * @private
     */
    this._hideTimeout;

    // FIXME
    // Is it needed to trigger zr event manually if
    // the browser do not support `pointer-events: none`.

    var self = this;
    el.onmouseenter = function () {
        // clear the timeout in hideLater and keep showing tooltip
        if (self._enterable) {
            clearTimeout(self._hideTimeout);
            self._show = true;
        }
        self._inContent = true;
    };
    el.onmousemove = function (e) {
        e = e || window.event;
        if (!self._enterable) {
            // `pointer-events: none` is set to tooltip content div
            // if `enterable` is set as `false`, and `el.onmousemove`
            // can not be triggered. But in browser that do not
            // support `pointer-events`, we need to do this:
            // Try trigger zrender event to avoid mouse
            // in and out shape too frequently
            var handler = zr.handler;
            var zrViewportRoot = zr.painter.getViewportRoot();
            eventUtil.normalizeEvent(zrViewportRoot, e, true);
            handler.dispatch('mousemove', e);
        }
    };
    el.onmouseleave = function () {
        if (self._enterable) {
            if (self._show) {
                self.hideLater(self._hideDelay);
            }
        }
        self._inContent = false;
    };
}

TooltipContent.prototype = {

    constructor: TooltipContent,

    /**
     * @private
     * @type {boolean}
     */
    _enterable: true,

    /**
     * Update when tooltip is rendered
     */
    update: function (tooltipModel) {
        // FIXME
        // Move this logic to ec main?
        var container = this._container;
        var stl = container.currentStyle
            || document.defaultView.getComputedStyle(container);
        var domStyle = container.style;
        if (domStyle.position !== 'absolute' && stl.position !== 'absolute') {
            domStyle.position = 'relative';
        }
        var alwaysShowContent = tooltipModel.get('alwaysShowContent');
        alwaysShowContent && this._moveTooltipIfResized();
        // Hide the tooltip
        // PENDING
        // this.hide();
    },

    /**
     * when `alwaysShowContent` is true,
     * we should move the tooltip after chart resized
     */
    _moveTooltipIfResized: function () {
        var ratioX = this._styleCoord[2]; // The ratio of left to width
        var ratioY = this._styleCoord[3]; // The ratio of top to height
        var realX = ratioX * this._zr.getWidth();
        var realY = ratioY * this._zr.getHeight();
        this.moveTo(realX, realY);
    },

    show: function (tooltipModel) {
        clearTimeout(this._hideTimeout);
        var el = this.el;
        var styleCoord = this._styleCoord;

        el.style.cssText = gCssText + assembleCssText(tooltipModel)
            // Because of the reason described in:
            // http://stackoverflow.com/questions/21125587/css3-transition-not-working-in-chrome-anymore
            // we should set initial value to `left` and `top`.
            + ';left:' + styleCoord[0] + 'px;top:' + styleCoord[1] + 'px;'
            + (tooltipModel.get('extraCssText') || '');

        el.style.display = el.innerHTML ? 'block' : 'none';

        // If mouse occasionally move over the tooltip, a mouseout event will be
        // triggered by canvas, and cause some unexpectable result like dragging
        // stop, "unfocusAdjacency". Here `pointer-events: none` is used to solve
        // it. Although it is not supported by IE8~IE10, fortunately it is a rare
        // scenario.
        el.style.pointerEvents = this._enterable ? 'auto' : 'none';

        this._show = true;
    },

    setContent: function (content) {
        this.el.innerHTML = content == null ? '' : content;
    },

    setEnterable: function (enterable) {
        this._enterable = enterable;
    },

    getSize: function () {
        var el = this.el;
        return [el.clientWidth, el.clientHeight];
    },

    moveTo: function (zrX, zrY) {
        var styleCoord = this._styleCoord;
        makeStyleCoord(styleCoord, this._zr, this._appendToBody, zrX, zrY);

        var style = this.el.style;
        style.left = styleCoord[0] + 'px';
        style.top = styleCoord[1] + 'px';
    },

    hide: function () {
        this.el.style.display = 'none';
        this._show = false;
    },

    hideLater: function (time) {
        if (this._show && !(this._inContent && this._enterable)) {
            if (time) {
                this._hideDelay = time;
                // Set show false to avoid invoke hideLater multiple times
                this._show = false;
                this._hideTimeout = setTimeout(zrUtil.bind(this.hide, this), time);
            }
            else {
                this.hide();
            }
        }
    },

    isShow: function () {
        return this._show;
    },

    dispose: function () {
        this.el.parentNode.removeChild(this.el);
    },

    getOuterSize: function () {
        var width = this.el.clientWidth;
        var height = this.el.clientHeight;

        // Consider browser compatibility.
        // IE8 does not support getComputedStyle.
        if (document.defaultView && document.defaultView.getComputedStyle) {
            var stl = document.defaultView.getComputedStyle(this.el);
            if (stl) {
                width += parseInt(stl.borderLeftWidth, 10) + parseInt(stl.borderRightWidth, 10);
                height += parseInt(stl.borderTopWidth, 10) + parseInt(stl.borderBottomWidth, 10);
            }
        }

        return {width: width, height: height};
    }

};

export default TooltipContent;
