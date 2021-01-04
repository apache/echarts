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

import { isString, indexOf, map, each, bind, isArray, isDom } from 'zrender/src/core/util';
import { toHex } from 'zrender/src/tool/color';
import { normalizeEvent } from 'zrender/src/core/event';
import { transformLocalCoord } from 'zrender/src/core/dom';
import env from 'zrender/src/core/env';
import { convertToColorString, toCamelCase, normalizeCssArray } from '../../util/format';
import ExtensionAPI from '../../core/ExtensionAPI';
import { ZRenderType } from 'zrender/src/zrender';
import { TooltipOption } from './TooltipModel';
import Model from '../../model/Model';
import { ZRRawEvent } from 'zrender/src/core/types';
import { ColorString, ZRColor } from '../../util/types';
import CanvasPainter from 'zrender/src/canvas/Painter';
import SVGPainter from 'zrender/src/svg/Painter';
import { shouldTooltipConfine } from './helper';
import { getPaddingFromTooltipModel } from './tooltipMarkup';

const vendors = ['-ms-', '-moz-', '-o-', '-webkit-', ''];

const gCssText = 'position:absolute;display:block;border-style:solid;white-space:nowrap;z-index:9999999;';

function mirrorPos(pos: string): string {
    pos = pos === 'left'
        ? 'right'
        : pos === 'right'
        ? 'left'
        : pos === 'top'
        ? 'bottom'
        : 'top';
    return pos;
}

function assembleArrow(
    backgroundColor: ColorString,
    borderColor: ZRColor,
    arrowPosition: TooltipOption['position']
) {
    if (!isString(arrowPosition) || arrowPosition === 'inside') {
        return '';
    }

    borderColor = convertToColorString(borderColor);
    const arrowPos = mirrorPos(arrowPosition);
    let positionStyle = '';
    let transformStyle = '';
    if (indexOf(['left', 'right'], arrowPos) > -1) {
        positionStyle = `${arrowPos}:-6px;top:50%;`;
        transformStyle = `translateY(-50%) rotate(${arrowPos === 'left' ? -225 : -45}deg)`;
    }
    else {
        positionStyle = `${arrowPos}:-6px;left:50%;`;
        transformStyle = `translateX(-50%) rotate(${arrowPos === 'top' ? 225 : 45}deg)`;
    }

    transformStyle = map(vendors, function (vendorPrefix) {
        return vendorPrefix + 'transform:' + transformStyle;
    }).join(';');

    const styleCss = [
        'position:absolute;width:10px;height:10px;',
        `${positionStyle}${transformStyle};`,
        `border-bottom: ${borderColor} solid 1px;`,
        `border-right: ${borderColor} solid 1px;`,
        `background-color: ${backgroundColor};`,
        'box-shadow: 8px 8px 16px -3px #000;'
    ];
    return `<div style="${styleCss.join('')}"></div>`;
}

function assembleTransition(duration: number, onlyFade?: boolean): string {
    const transitionCurve = 'cubic-bezier(0.23, 1, 0.32, 1)';
    let transitionText = 'opacity ' + (duration / 2) + 's ' + transitionCurve + ','
                       + 'visibility ' + (duration / 2) + 's ' + transitionCurve;
    if (!onlyFade) {
        transitionText += ',left ' + duration + 's ' + transitionCurve
                        + ',top ' + duration + 's ' + transitionCurve;
    }

    return map(vendors, function (vendorPrefix) {
        return vendorPrefix + 'transition:' + transitionText;
    }).join(';');
}

/**
 * @param {Object} textStyle
 * @return {string}
 * @inner
 */
function assembleFont(textStyleModel: Model<TooltipOption['textStyle']>): string {
    const cssText = [];

    const fontSize = textStyleModel.get('fontSize');
    const color = textStyleModel.getTextColor();

    color && cssText.push('color:' + color);

    cssText.push('font:' + textStyleModel.getFont());

    fontSize
        // @ts-ignore, leave it to the tooltip refactor.
        && cssText.push('line-height:' + Math.round(fontSize * 3 / 2) + 'px');

    const shadowColor = textStyleModel.get('textShadowColor');
    const shadowBlur = textStyleModel.get('textShadowBlur') || 0;
    const shadowOffsetX = textStyleModel.get('textShadowOffsetX') || 0;
    const shadowOffsetY = textStyleModel.get('textShadowOffsetY') || 0;
    shadowColor && shadowBlur
        && cssText.push('text-shadow:' + shadowOffsetX + 'px ' + shadowOffsetY + 'px '
            + shadowBlur + 'px ' + shadowColor);

    each(['decoration', 'align'] as const, function (name) {
        const val = textStyleModel.get(name);
        val && cssText.push('text-' + name + ':' + val);
    });

    return cssText.join(';');
}

function assembleCssText(tooltipModel: Model<TooltipOption>, enableTransition?: boolean, onlyFade?: boolean) {
    const cssText: string[] = [];
    const transitionDuration = tooltipModel.get('transitionDuration');
    const backgroundColor = tooltipModel.get('backgroundColor');
    const shadowBlur = tooltipModel.get('shadowBlur');
    const shadowColor = tooltipModel.get('shadowColor');
    const shadowOffsetX = tooltipModel.get('shadowOffsetX');
    const shadowOffsetY = tooltipModel.get('shadowOffsetY');
    const textStyleModel = tooltipModel.getModel('textStyle');
    const padding = getPaddingFromTooltipModel(tooltipModel, 'html');
    const boxShadow = `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`;

    cssText.push('box-shadow:' + boxShadow);
    // Animation transition. Do not animate when transitionDuration is 0.
    enableTransition && transitionDuration && cssText.push(assembleTransition(transitionDuration, onlyFade));

    if (backgroundColor) {
        if (env.canvasSupported) {
            cssText.push('background-Color:' + backgroundColor);
        }
        else {
            // for ie
            cssText.push(
                'background-Color:#' + toHex(backgroundColor)
            );
            cssText.push('filter:alpha(opacity=70)');
        }
    }

    // Border style
    each(['width', 'color', 'radius'] as const, function (name) {
        const borderName = 'border-' + name;
        const camelCase = toCamelCase(borderName) as 'borderWidth' | 'borderColor' | 'borderRadius';
        const val = tooltipModel.get(camelCase);
        val != null
            && cssText.push(borderName + ':' + val + (name === 'color' ? '' : 'px'));
    });

    // Text style
    cssText.push(assembleFont(textStyleModel));

    // Padding
    if (padding != null) {
        cssText.push('padding:' + normalizeCssArray(padding).join('px ') + 'px');
    }

    return cssText.join(';') + ';';
}

// If not able to make, do not modify the input `out`.
function makeStyleCoord(out: number[], zr: ZRenderType, appendToBody: boolean, zrX: number, zrY: number) {
    const zrPainter = zr && zr.painter;

    if (appendToBody) {
        const zrViewportRoot = zrPainter && zrPainter.getViewportRoot();
        if (zrViewportRoot) {
            // Some APPs might use scale on body, so we support CSS transform here.
            transformLocalCoord(out, zrViewportRoot, document.body, zrX, zrY);
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
     * `false`: the DOM element will be inside the container. Default value.
     * `true`: the DOM element will be appended to HTML body, which avoid
     *  some overflow clip but intrude outside of the container.
     */
    appendToBody: boolean
}

class TooltipHTMLContent {

    el: HTMLDivElement;

    private _container: HTMLElement;

    private _show: boolean = false;

    private _styleCoord: [number, number, number, number] = [0, 0, 0, 0];
    private _appendToBody: boolean;

    private _enterable = true;
    private _zr: ZRenderType;

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


    constructor(
        container: HTMLElement,
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
        const appendToBody = this._appendToBody = opt && opt.appendToBody;

        makeStyleCoord(this._styleCoord, zr, appendToBody, api.getWidth() / 2, api.getHeight() / 2);

        if (appendToBody) {
            document.body.appendChild(el);
        }
        else {
            container.appendChild(el);
        }

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
        const container = this._container;
        const stl = (container as any).currentStyle
            || document.defaultView.getComputedStyle(container);
        const domStyle = container.style;
        if (domStyle.position !== 'absolute' && stl.position !== 'absolute') {
            domStyle.position = 'relative';
        }

        // move tooltip if chart resized
        const alwaysShowContent = tooltipModel.get('alwaysShowContent');
        alwaysShowContent && this._moveIfResized();

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
        const styleCoord = this._styleCoord;
        const offset = el.offsetHeight / 2;
        nearPointColor = convertToColorString(nearPointColor);
        el.style.cssText = gCssText + assembleCssText(tooltipModel, !this._firstShow, this._longHide)
            // Because of the reason described in:
            // http://stackoverflow.com/questions/21125587/css3-transition-not-working-in-chrome-anymore
            // we should set initial value to `left` and `top`.
            + ';left:' + styleCoord[0] + 'px;top:' + (styleCoord[1] - offset) + 'px;'
            + `border-color: ${nearPointColor};`
            + (tooltipModel.get('extraCssText') || '');

        el.style.display = el.innerHTML ? 'block' : 'none';

        // If mouse occasionally move over the tooltip, a mouseout event will be
        // triggered by canvas, and cause some unexpectable result like dragging
        // stop, "unfocusAdjacency". Here `pointer-events: none` is used to solve
        // it. Although it is not supported by IE8~IE10, fortunately it is a rare
        // scenario.
        el.style.pointerEvents = this._enterable ? 'auto' : 'none';

        this._show = true;
        this._firstShow = false;
        this._longHide = false;
    }

    setContent(
        content: string | HTMLElement[],
        markers: unknown,
        tooltipModel: Model<TooltipOption>,
        borderColor?: ZRColor,
        arrowPosition?: TooltipOption['position']
    ) {
        if (content == null) {
            return;
        }

        const el = this.el;

        if (isString(arrowPosition) && tooltipModel.get('trigger') === 'item'
            && !shouldTooltipConfine(tooltipModel)) {
            content += assembleArrow(tooltipModel.get('backgroundColor'), borderColor, arrowPosition);
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
    }

    setEnterable(enterable: boolean) {
        this._enterable = enterable;
    }

    getSize() {
        const el = this.el;
        return [el.clientWidth, el.clientHeight];
    }

    moveTo(zrX: number, zrY: number) {
        const styleCoord = this._styleCoord;
        makeStyleCoord(styleCoord, this._zr, this._appendToBody, zrX, zrY);

        if (styleCoord[0] != null && styleCoord[1] != null) {
            const style = this.el.style;
            // If using float on style, the final width of the dom might
            // keep changing slightly while mouse move. So `toFixed(0)` them.
            style.left = styleCoord[0].toFixed(0) + 'px';
            style.top = styleCoord[1].toFixed(0) + 'px';
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
        this.el.style.visibility = 'hidden';
        this.el.style.opacity = '0';
        this._show = false;
        this._longHideTimeout = setTimeout(() => this._longHide = true, 500) as any;
    }

    hideLater(time?: number) {
        if (this._show && !(this._inContent && this._enterable)) {
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
        this.el.parentNode.removeChild(this.el);
    }

    getOuterSize() {
        let width = this.el.clientWidth;
        let height = this.el.clientHeight;

        // Consider browser compatibility.
        // IE8 does not support getComputedStyle.
        if (document.defaultView && document.defaultView.getComputedStyle) {
            const stl = document.defaultView.getComputedStyle(this.el);
            if (stl) {
                width += parseInt(stl.borderLeftWidth, 10) + parseInt(stl.borderRightWidth, 10);
                height += parseInt(stl.borderTopWidth, 10) + parseInt(stl.borderBottomWidth, 10);
            }
        }

        return {width: width, height: height};
    }

}

export default TooltipHTMLContent;
