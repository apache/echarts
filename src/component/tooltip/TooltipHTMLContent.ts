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

import { isString, indexOf, each, bind, isFunction, isArray, isDom, retrieve2 } from 'zrender/src/core/util';
import { normalizeEvent } from 'zrender/src/core/event';
import { transformLocalCoord, transformLocalCoordClear } from 'zrender/src/core/dom';
import env from 'zrender/src/core/env';
import { convertToColorString, normalizeCssArray } from '../../util/format';
import type ExtensionAPI from '../../core/ExtensionAPI';
import type { ZRenderType } from 'zrender/src/zrender';
import type { TooltipOption } from './TooltipModel';
import Model from '../../model/Model';
import type { ZRRawEvent } from 'zrender/src/core/types';
import type { ZRColor } from '../../util/types';
import type CanvasPainter from 'zrender/src/canvas/Painter';
import type SVGPainter from 'zrender/src/svg/Painter';
import {
    shouldTooltipConfine,
    getComputedStyle,
} from './helper';
import { getPaddingFromTooltipModel } from './tooltipMarkup';
import { CSS_TRANSFORM_VENDOR, CSS_TRANSITION_VENDOR } from '../../util/vendor';
import { mathRound } from '../../util/number';

/* global document, window */

// eslint-disable-next-line
const gCssText = `position:absolute;display:block;border-style:solid;white-space:nowrap;z-index:9999999;${env.transform3dSupported ? 'will-change:transform;' : ''}`;

/**
 * SECURITY: This method must guarantee the returned value is only 'left' | 'right' | 'top' | 'bottom',
 * otherwise, malicious CSS declaration injections may be introduced via `TooltipOption['position']`.
 */
function mirrorAndSanitizePos(pos: TooltipOption['position']): 'left' | 'right' | 'top' | 'bottom' {
    return pos === 'left'
        ? 'right'
        : pos === 'right'
        ? 'left'
        : pos === 'top'
        ? 'bottom'
        : 'top';
}

function assembleArrow(
    el: HTMLDivElement,
    tooltipModel: Model<TooltipOption>,
    borderColor: ZRColor,
    arrowPosOption: TooltipOption['position']
): void {
    if (!el.childNodes.length // no arrow if empty
        || !isString(arrowPosOption)
        || arrowPosOption === 'inside'
        || tooltipModel.get('trigger') !== 'item'
        || shouldTooltipConfine(tooltipModel)
    ) {
        return;
    }

    const arrowPos = mirrorAndSanitizePos(arrowPosOption);

    const arrowEl = document.createElement('div');
    const arrowCSSStyle = arrowEl.style;

    const backgroundColor = tooltipModel.get('backgroundColor');
    const borderWidth = tooltipModel.get('borderWidth');

    borderColor = convertToColorString(borderColor);
    const arrowSize = Math.max(Math.round(borderWidth) * 1.5, 6);
    let rotateDeg;
    if (indexOf(['left', 'right'], arrowPos) > -1) {
        arrowCSSStyle.top = '50%';
        arrowCSSStyle[CSS_TRANSFORM_VENDOR.c as 'transform'] =
            `translateY(-50%) rotate(${rotateDeg = arrowPos === 'left' ? -225 : -45}deg)`;
    }
    else {
        arrowCSSStyle.left = '50%';
        arrowCSSStyle[CSS_TRANSFORM_VENDOR.c as 'transform'] =
            `translateX(-50%) rotate(${rotateDeg = arrowPos === 'top' ? 225 : 45}deg)`;
    }

    const rotateRadian = rotateDeg * Math.PI / 180;
    const arrowWH = arrowSize + borderWidth;
    const rotatedWH = arrowWH * Math.abs(Math.cos(rotateRadian)) + arrowWH * Math.abs(Math.sin(rotateRadian));
    const arrowOffset = Math.round(((rotatedWH - Math.SQRT2 * borderWidth) / 2
        + Math.SQRT2 * borderWidth - (rotatedWH - arrowWH) / 2) * 100) / 100;
    arrowCSSStyle[arrowPos] = `-${arrowOffset}px`;

    const borderStyle = `${borderColor} solid ${borderWidth}px;`;

    arrowCSSStyle.position = 'absolute';
    arrowCSSStyle.width = `${arrowSize}px;`;
    arrowCSSStyle.height = `${arrowSize}px;`;
    arrowCSSStyle.zIndex = '-1';
    arrowCSSStyle.borderBottom = borderStyle;
    arrowCSSStyle.borderRight = borderStyle;
    arrowCSSStyle.backgroundColor = backgroundColor;

    // no need to create a new parent element, but it's not supported by IE 10 and older.
    // const arrowEl = document.createRange().createContextualFragment(arrow);
    el.appendChild(arrowEl);
}

function assembleTransition(
    style: CSSStyleDeclaration, duration: number, onlyFadeTransition: boolean, enableDisplayTransition: boolean
): void {
    const transitionCurve = 'cubic-bezier(0.23,1,0.32,1)';
    let transitionOption = '';
    let transitionText = '';
    if (enableDisplayTransition) {
        transitionOption = ` ${duration / 2}s ${transitionCurve}`;
        transitionText = `opacity${transitionOption},visibility${transitionOption}`;
    }
    if (!onlyFadeTransition) {
        transitionOption = ` ${duration}s ${transitionCurve}`;
        transitionText += (transitionText.length ? ',' : '') + (
            env.transformSupported
                ? `${CSS_TRANSFORM_VENDOR.k}${transitionOption}`
                : `,left${transitionOption},top${transitionOption}`
        );
    }

    style[CSS_TRANSITION_VENDOR.c as 'transition'] = transitionText;
}

function assembleTransform(style: CSSStyleDeclaration, x: number, y: number): void {
    // If using float on style, the final width of the dom might
    // keep changing slightly while mouse move. So `toFixed(0)` them.
    const x0 = x.toFixed(0) + 'px';
    const y0 = y.toFixed(0) + 'px';
    // not support transform, use `left` and `top` instead.
    if (!env.transformSupported) {
        style.top = y0;
        style.left = x0;
        return;
    }
    // support transform
    const is3d = env.transform3dSupported;
    style.top = style.left = '0';
    style[CSS_TRANSFORM_VENDOR.c as 'transform'] = `translate${is3d ? '3d' : ''}(${x0},${y0}${is3d ? ',0' : ''})`;
}

/**
 * @param {Object} textStyle
 * @return {string}
 * @inner
 */
function assembleFont(style: CSSStyleDeclaration, textStyleModel: Model<TooltipOption['textStyle']>): void {
    const color = textStyleModel.getTextColor();

    if (color) {
        style.color = color;
    }

    style.font = textStyleModel.getFont();

    const fontSize = textStyleModel.get('fontSize');
    if (fontSize) {
        // zrender `lineHeight` only supports 'px', so keep consistent.
        style.lineHeight = retrieve2(textStyleModel.get('lineHeight'), mathRound(+fontSize * 3 / 2)) + 'px';
    }

    const shadowColor = textStyleModel.get('textShadowColor');
    const shadowBlur = textStyleModel.get('textShadowBlur') || 0;
    const shadowOffsetX = textStyleModel.get('textShadowOffsetX') || 0;
    const shadowOffsetY = textStyleModel.get('textShadowOffsetY') || 0;
    if (shadowColor && shadowBlur) {
        style.textShadow = shadowOffsetX + 'px ' + shadowOffsetY + 'px '
            + shadowBlur + 'px ' + shadowColor;
    }

    each(['Decoration', 'Align'] as const, function (camelName) {
        const val = textStyleModel.get(camelName.toLowerCase() as 'decoration' | 'align');
        if (val) {
            style[`text${camelName}`] = val;
        }
    });
}

function assembleCssText(
    style: CSSStyleDeclaration,
    tooltipModel: Model<TooltipOption>,
    enableTransition: boolean,
    onlyFadeTransition: boolean,
    enableDisplayTransition: boolean
): void {
    const transitionDuration = tooltipModel.get('transitionDuration');
    const backgroundColor = tooltipModel.get('backgroundColor');
    const shadowBlur = tooltipModel.get('shadowBlur');
    const shadowColor = tooltipModel.get('shadowColor');
    const shadowOffsetX = tooltipModel.get('shadowOffsetX');
    const shadowOffsetY = tooltipModel.get('shadowOffsetY');
    const textStyleModel = tooltipModel.getModel('textStyle');
    const padding = getPaddingFromTooltipModel(tooltipModel, 'html');

    style.boxShadow = `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`;

    // Animation transition. Do not animate when transitionDuration <= 0.
    if (enableTransition && transitionDuration > 0) {
        assembleTransition(style, transitionDuration, onlyFadeTransition, enableDisplayTransition);
    }

    if (backgroundColor) {
        style.backgroundColor = backgroundColor;
    }

    // Border style
    each(['Width', 'Color', 'Radius'] as const, function (camelName) {
        const camelProp = `border${camelName}` as 'borderWidth' | 'borderColor' | 'borderRadius';
        const val = tooltipModel.get(camelProp);
        if (val != null) {
            style[camelProp] = val + (camelName === 'Color' ? '' : 'px');
        }
    });

    // Text style
    assembleFont(style, textStyleModel);

    // Padding
    if (padding != null) {
        style.padding = normalizeCssArray(padding).join('px ') + 'px';
    }
}

// If not able to make, do not modify the input `out`.
function makeStyleCoord(
    out: number[],
    zr: ZRenderType,
    container: HTMLElement | null | undefined,
    zrX: number,
    zrY: number
) {
    const zrPainter = zr && zr.painter;

    if (container) {
        const zrViewportRoot = zrPainter && zrPainter.getViewportRoot();
        if (zrViewportRoot) {
            // Some APPs might use scale on body, so we support CSS transform here.
            transformLocalCoord(out, zrViewportRoot, container, zrX, zrY);
        }
    }
    else {
        out[0] = zrX;
        out[1] = zrY;
        // xy should be based on canvas root. But tooltipContent is
        // the sibling of canvas root. So padding of ec container
        // should be considered here.
        const viewportRootOffset = zrPainter && (zrPainter as CanvasPainter | SVGPainter).getViewportRootOffset();
        if (viewportRootOffset) {
            out[0] += viewportRootOffset.offsetLeft;
            out[1] += viewportRootOffset.offsetTop;
        }
    }

    out[2] = out[0] / zr.getWidth();
    out[3] = out[1] / zr.getHeight();
}

interface TooltipContentOption {
    /**
     * Specify target container of the tooltip element.
     * Can either be an HTMLElement, CSS selector string, or a function that returns an HTMLElement.
     */
    appendTo: ((chartContainer: HTMLElement) => HTMLElement | undefined | null) | HTMLElement | string
}

class TooltipHTMLContent {

    el: HTMLDivElement;

    private _api: ExtensionAPI;
    private _container: HTMLElement | undefined | null;

    private _show: boolean = false;

    private _styleCoord: [number, number, number, number] = [0, 0, 0, 0];

    private _enterable = true;
    private _zr: ZRenderType;

    private _alwaysShowContent: boolean = false;
    private _hideTimeout: number;
    /**
     * Hide delay time
     */
    private _hideDelay: number;

    private _inContent: boolean;
    private _firstShow = true;
    private _longHide = true;
    /**
     * Record long-time hide
     */
    private _longHideTimeout: number;

    private _enableDisplayTransition: boolean;

    constructor(
        api: ExtensionAPI,
        opt: TooltipContentOption
    ) {
        if (env.wxa) {
            return null;
        }

        const el = document.createElement('div');
        // TODO: TYPE
        (el as any).domBelongToZr = true;
        this.el = el;
        const zr = this._zr = api.getZr();

        const appendTo = opt.appendTo;
        const container: HTMLElement | null | undefined = appendTo && (
            isString(appendTo)
                ? document.querySelector(appendTo)
                : isDom(appendTo)
                    ? appendTo
                    : isFunction(appendTo) && appendTo(api.getDom())
        );

        makeStyleCoord(this._styleCoord, zr, container, api.getWidth() / 2, api.getHeight() / 2);

        (container || api.getDom()).appendChild(el);

        this._api = api;
        this._container = container;

        // FIXME
        // Is it needed to trigger zr event manually if
        // the browser do not support `pointer-events: none`.

        const self = this;
        el.onmouseenter = function () {
            // clear the timeout in hideLater and keep showing tooltip
            if (self._enterable) {
                clearTimeout(self._hideTimeout);
                self._show = true;
            }
            self._inContent = true;
        };
        el.onmousemove = function (e) {
            e = e || (window as any).event;
            if (!self._enterable) {
                // `pointer-events: none` is set to tooltip content div
                // if `enterable` is set as `false`, and `el.onmousemove`
                // can not be triggered. But in browser that do not
                // support `pointer-events`, we need to do this:
                // Try trigger zrender event to avoid mouse
                // in and out shape too frequently
                const handler = zr.handler;
                const zrViewportRoot = zr.painter.getViewportRoot();
                normalizeEvent(zrViewportRoot, e as ZRRawEvent, true);
                handler.dispatch('mousemove', e);
            }
        };
        el.onmouseleave = function () {
            // set `_inContent` to `false` before `hideLater`
            self._inContent = false;

            if (self._enterable) {
                if (self._show) {
                    self.hideLater(self._hideDelay);
                }
            }
        };
    }

    /**
     * Update when tooltip is rendered
     */
    update(tooltipModel: Model<TooltipOption>) {
        // FIXME
        // Move this logic to ec main?
        if (!this._container) {
            const container = this._api.getDom();
            const position = getComputedStyle(container, 'position');
            const domStyle = container.style;
            if (domStyle.position !== 'absolute' && position !== 'absolute') {
                domStyle.position = 'relative';
            }
        }

        // move tooltip if chart resized
        const alwaysShowContent = tooltipModel.get('alwaysShowContent');
        alwaysShowContent && this._moveIfResized();

        // update alwaysShowContent
        this._alwaysShowContent = alwaysShowContent;

        this._enableDisplayTransition = tooltipModel.get('displayTransition')
            && tooltipModel.get('transitionDuration') > 0;

        // update className
        this.el.className = tooltipModel.get('className') || '';

        // Hide the tooltip
        // PENDING
        // this.hide();
    }

    show(tooltipModel: Model<TooltipOption>, nearPointColor: ZRColor) {
        clearTimeout(this._hideTimeout);
        clearTimeout(this._longHideTimeout);
        const el = this.el;
        const style = el.style;
        const styleCoord = this._styleCoord;
        if (!el.innerHTML) {
            style.display = 'none';
        }
        else {
            // SECURITY: Use CSSOM API to minimize CSS injection - users generally do not need to
            // worry about risks on most options.
            style.cssText = gCssText;
            assembleCssText(style, tooltipModel, !this._firstShow, this._longHide, this._enableDisplayTransition);
            // initial transform
            assembleTransform(style, styleCoord[0], styleCoord[1]);
            style.borderColor = convertToColorString(nearPointColor);

            const extraCssTextOption = tooltipModel.get('extraCssText');
            if (extraCssTextOption) {
                // SECURITY: Users should guarantee that `extraCssText` is from tursted source or is sanitized.
                style.cssText += extraCssTextOption;
            }

            // If mouse occasionally move over the tooltip, a mouseout event will be
            // triggered by canvas, and cause some unexpectable result like dragging
            // stop, "unfocusAdjacency". Here `pointer-events: none` is used to solve
            // it. Although it is not supported by IE8~IE10, fortunately it is a rare
            // scenario.
            style.pointerEvents = this._enterable ? 'auto' : 'none';
        }

        this._show = true;
        this._firstShow = false;
        this._longHide = false;
    }

    setContent(
        content: string | HTMLElement | HTMLElement[],
        markers: unknown,
        tooltipModel: Model<TooltipOption>,
        borderColor?: ZRColor,
        arrowPosition?: TooltipOption['position']
    ) {
        const el = this.el;

        if (content == null) {
            el.innerHTML = '';
            return;
        }

        if (isString(content)) {
            el.innerHTML = content;
        }
        else if (content) {
            // Clear previous
            el.innerHTML = '';
            if (!isArray(content)) {
                content = [content];
            }
            for (let i = 0; i < content.length; i++) {
                if (isDom(content[i]) && content[i].parentNode !== el) {
                    el.appendChild(content[i]);
                }
            }
        }

        assembleArrow(el, tooltipModel, borderColor, arrowPosition);
    }

    setEnterable(enterable: boolean) {
        this._enterable = enterable;
    }

    getSize() {
        const el = this.el;
        return el ? [el.offsetWidth, el.offsetHeight] : [0, 0];
    }

    moveTo(zrX: number, zrY: number) {
        if (!this.el) {
            return;
        }
        const styleCoord = this._styleCoord;
        makeStyleCoord(styleCoord, this._zr, this._container, zrX, zrY);

        if (styleCoord[0] != null && styleCoord[1] != null) {
            assembleTransform(this.el.style, styleCoord[0], styleCoord[1]);
        }
    }

    /**
     * when `alwaysShowContent` is true,
     * move the tooltip after chart resized
     */
    _moveIfResized() {
        // The ratio of left to width
        const ratioX = this._styleCoord[2];
        // The ratio of top to height
        const ratioY = this._styleCoord[3];
        this.moveTo(
            ratioX * this._zr.getWidth(),
            ratioY * this._zr.getHeight()
        );
    }

    hide() {
        const style = this.el.style;
        if (this._enableDisplayTransition) {
            style.visibility = 'hidden';
            style.opacity = '0';
        }
        else {
            style.display = 'none';
        }
        env.transform3dSupported && (style.willChange = '');
        this._show = false;
        this._longHideTimeout = setTimeout(() => this._longHide = true, 500) as any;
    }

    hideLater(time?: number) {
        if (this._show && !(this._inContent && this._enterable) && !this._alwaysShowContent) {
            if (time) {
                this._hideDelay = time;
                // Set show false to avoid invoke hideLater multiple times
                this._show = false;
                this._hideTimeout = setTimeout(bind(this.hide, this), time) as any;
            }
            else {
                this.hide();
            }
        }
    }

    isShow() {
        return this._show;
    }

    dispose() {
        clearTimeout(this._hideTimeout);
        clearTimeout(this._longHideTimeout);

        const zr = this._zr;
        transformLocalCoordClear(zr && zr.painter && zr.painter.getViewportRoot(), this._container);

        const el = this.el;
        if (el) {
            el.onmouseenter = el.onmousemove = el.onmouseleave = null;
            const parentNode = el.parentNode;
            parentNode && parentNode.removeChild(el);
        }

        this.el = this._container = null;
    }

}

export default TooltipHTMLContent;
