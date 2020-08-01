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
import ExtensionAPI from '../../ExtensionAPI';
import { ZRenderType } from 'zrender/src/zrender';
import { TooltipOption } from './TooltipModel';
import Model from '../../model/Model';
import { ZRRawEvent, Dictionary } from 'zrender/src/core/types';
import { ColorString, ZRColor } from '../../util/types';
import CanvasPainter from 'zrender/src/canvas/Painter';
import SVGPainter from 'zrender/src/svg/Painter';

const each = zrUtil.each;
const toCamelCase = formatUtil.toCamelCase;

const vendors = ['', '-webkit-', '-moz-', '-o-'];

const gCssText = 'position:absolute;display:block;border-style:solid;white-space:nowrap;z-index:9999999;';

function mirrowPos(pos: string): string {
    pos = pos === 'left'
        ? 'right'
        : pos === 'right'
        ? 'left'
        : pos === 'top'
        ? 'bottom'
        : 'top';
    return pos;
}


function getFinalColor(color: ZRColor): string {
    let finalNearPointColor = '#fff';
    if (zrUtil.isObject(color) && color.type !== 'pattern') {
        finalNearPointColor = color.colorStops[0].color;
    }
    else if (zrUtil.isObject(color) && (color.type === 'pattern')) {
        finalNearPointColor = 'transparent';
    }
    else if (zrUtil.isString(color)) {
        finalNearPointColor = color;
    }

    return finalNearPointColor;
}

function assembleArrow(
    backgroundColor: ColorString,
    borderColor: ZRColor,
    arrowPosition: TooltipOption['position']
) {
    if (!zrUtil.isString(arrowPosition) || arrowPosition === 'inside') {
        return '';
    }

    borderColor = getFinalColor(borderColor);
    const arrowPos = mirrowPos(arrowPosition);
    let centerPos = '';
    let rotate = 0;
    if (['left', 'right'].includes(arrowPos)) {
        centerPos = `${arrowPos}:-6px;top:50%;transform:translateY(-50%)`;
        rotate = arrowPos === 'left' ? -225 : -45;
    }
    else {
        centerPos = `${arrowPos}:-6px;left:50%;transform:translateX(-50%)`;
        rotate = arrowPos === 'top' ? 225 : 45;
    }
    const styleCss = [
        'style="position:absolute;width:10px;height:10px;',
        `${centerPos}`,
        `rotate(${rotate}deg);`,
        `border-bottom: ${borderColor} solid 1px;`,
        `border-right: ${borderColor} solid 1px;`,
        `background-color: ${backgroundColor};`,
        'box-shadow: 8px 8px 16px -3px #000',
        '"'
    ];
    return `<div ${styleCss.join('')}></div>`;
}

function assembleTransition(duration: number): string {
    const transitionCurve = 'cubic-bezier(0.23, 1, 0.32, 1)';
    const transitionText = 'left ' + duration + 's ' + transitionCurve + ','
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
function assembleFont(textStyleModel: Model<TooltipOption['textStyle']>): string {
    const cssText = [];

    const fontSize = textStyleModel.get('fontSize');
    const color = textStyleModel.getTextColor();

    color && cssText.push('color:' + color);

    cssText.push('font:' + textStyleModel.getFont());

    fontSize
        // @ts-ignore, leave it to the tooltip refactor.
        && cssText.push('line-height:' + Math.round(fontSize * 3 / 2) + 'px');

    each(['decoration', 'align'] as const, function (name) {
        const val = textStyleModel.get(name);
        val && cssText.push('text-' + name + ':' + val);
    });

    return cssText.join(';');
}

function assembleCssText(tooltipModel: Model<TooltipOption>, isFirstShow: boolean) {
    const cssText: string[] = [];
    const transitionDuration = tooltipModel.get('transitionDuration');
    const backgroundColor = tooltipModel.get('backgroundColor');
    const shadowBlur = tooltipModel.get('shadowBlur');
    const shadowColor = tooltipModel.get('shadowColor');
    const shadowOffsetX = tooltipModel.get('shadowOffsetX');
    const shadowOffsetY = tooltipModel.get('shadowOffsetY');
    const textStyleModel = tooltipModel.getModel('textStyle');
    const padding = tooltipModel.get('padding');
    const boxShadow = `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`;

    cssText.push('box-shadow:' + boxShadow);
    // Animation transition. Do not animate when transitionDuration is 0.
    // If tooltip show arrow, then disable transition
    !isFirstShow && transitionDuration
        && !(['top', 'left', 'bottom', 'right'].includes(tooltipModel.get('position') as string))
        && tooltipModel.get('trigger') !== 'item'
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
        cssText.push('padding:' + formatUtil.normalizeCssArray(padding).join('px ') + 'px');
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
            domUtil.transformLocalCoord(out, zrViewportRoot, document.body, zrX, zrY);
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

    private _styleCoord: [number, number] = [0, 0];
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
                eventUtil.normalizeEvent(zrViewportRoot, e as ZRRawEvent, true);
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

    /**
     * Update when tooltip is rendered
     */
    update() {
        // FIXME
        // Move this logic to ec main?
        const container = this._container;
        const stl = (container as any).currentStyle
            || document.defaultView.getComputedStyle(container);
        const domStyle = container.style;
        if (domStyle.position !== 'absolute' && stl.position !== 'absolute') {
            domStyle.position = 'relative';
        }
        // Hide the tooltip
        // PENDING
        // this.hide();
    }

    show(tooltipModel: Model<TooltipOption>, nearPointColor: ZRColor) {
        clearTimeout(this._hideTimeout);
        const el = this.el;
        const styleCoord = this._styleCoord;
        const offset = el.offsetHeight / 2;
        nearPointColor = getFinalColor(nearPointColor);
        el.style.cssText = gCssText + assembleCssText(tooltipModel, this._firstShow)
            // Because of the reason described in:
            // http://stackoverflow.com/questions/21125587/css3-transition-not-working-in-chrome-anymore
            // we should set initial value to `left` and `top`.
            + ';left:' + styleCoord[0] + 'px;top:' + (styleCoord[1] - offset) + 'px;'
            + `border-color: ${nearPointColor};`
            + (tooltipModel.get('extraCssText') || '');

        el.style.display = el.innerHTML ? 'block' : 'none';

        // If mouse occsionally move over the tooltip, a mouseout event will be
        // triggered by canvas, and cuase some unexpectable result like dragging
        // stop, "unfocusAdjacency". Here `pointer-events: none` is used to solve
        // it. Although it is not suppored by IE8~IE10, fortunately it is a rare
        // scenario.
        el.style.pointerEvents = this._enterable ? 'auto' : 'none';

        this._show = true;
        this._firstShow && (this._firstShow = false);
    }

    setContent(
        content: string,
        markers: Dictionary<ColorString>,
        tooltipModel: Model<TooltipOption>,
        borderColor?: ZRColor,
        arrowPosition?: TooltipOption['position']
    ) {
        if (content == null) {
            return;
        }
        this.el.innerHTML = content;
        this.el.innerHTML += (
                zrUtil.isString(arrowPosition)
                && tooltipModel.get('trigger') === 'item'
                && !tooltipModel.get('confine')
            )
            ? assembleArrow(tooltipModel.get('backgroundColor'), borderColor, arrowPosition) : '';
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

        const style = this.el.style;
        style.left = styleCoord[0] + 'px';
        style.top = styleCoord[1] + 'px';
    }

    hide() {
        this.el.style.display = 'none';
        this._show = false;
    }

    hideLater(time?: number) {
        if (this._show && !(this._inContent && this._enterable)) {
            if (time) {
                this._hideDelay = time;
                // Set show false to avoid invoke hideLater mutiple times
                this._show = false;
                this._hideTimeout = setTimeout(zrUtil.bind(this.hide, this), time) as any;
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
