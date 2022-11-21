
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

import WeakMap from 'zrender/src/core/WeakMap';
import { ImagePatternObject, PatternObject, SVGPatternObject } from 'zrender/src/graphic/Pattern';
import LRU from 'zrender/src/core/LRU';
import {defaults, map, isArray, isString, isNumber} from 'zrender/src/core/util';
import {getLeastCommonMultiple} from './number';
import {createSymbol} from './symbol';
import ExtensionAPI from '../core/ExtensionAPI';
import type SVGPainter from 'zrender/src/svg/Painter';
import { brushSingle } from 'zrender/src/canvas/graphic';
import {DecalDashArrayX, DecalDashArrayY, InnerDecalObject, DecalObject} from './types';
import { SVGVNode } from 'zrender/src/svg/core';
import { platformApi } from 'zrender/src/core/platform';

const decalMap = new WeakMap<DecalObject, PatternObject>();

const decalCache = new LRU<HTMLCanvasElement | SVGVNode>(100);

const decalKeys = [
    'symbol', 'symbolSize', 'symbolKeepAspect',
    'color', 'backgroundColor',
    'dashArrayX', 'dashArrayY',
    'maxTileWidth', 'maxTileHeight'
];

/**
 * Create or update pattern image from decal options
 *
 * @param {InnerDecalObject | 'none'} decalObject decal options, 'none' if no decal
 * @return {Pattern} pattern with generated image, null if no decal
 */
export function createOrUpdatePatternFromDecal(
    decalObject: InnerDecalObject | 'none',
    api: ExtensionAPI
): PatternObject {
    if (decalObject === 'none') {
        return null;
    }

    const dpr = api.getDevicePixelRatio();
    const zr = api.getZr();
    const isSVG = zr.painter.type === 'svg';

    if (decalObject.dirty) {
        decalMap.delete(decalObject);
    }

    const oldPattern = decalMap.get(decalObject);
    if (oldPattern) {
        return oldPattern;
    }

    const decalOpt = defaults(decalObject, {
        symbol: 'rect',
        symbolSize: 1,
        symbolKeepAspect: true,
        color: 'rgba(0, 0, 0, 0.2)',
        backgroundColor: null,
        dashArrayX: 5,
        dashArrayY: 5,
        rotation: 0,
        maxTileWidth: 512,
        maxTileHeight: 512
    } as DecalObject);
    if (decalOpt.backgroundColor === 'none') {
        decalOpt.backgroundColor = null;
    }

    const pattern: PatternObject = { repeat: 'repeat' } as PatternObject;
    setPatternnSource(pattern);
    pattern.rotation = decalOpt.rotation;
    pattern.scaleX = pattern.scaleY = isSVG ? 1 : 1 / dpr;

    decalMap.set(decalObject, pattern);

    decalObject.dirty = false;

    return pattern;

    function setPatternnSource(pattern: PatternObject) {
        const keys = [dpr];
        let isValidKey = true;
        for (let i = 0; i < decalKeys.length; ++i) {
            const value = (decalOpt as any)[decalKeys[i]];
            if (value != null
                && !isArray(value)
                && !isString(value)
                && !isNumber(value)
                && typeof value !== 'boolean'
            ) {
                isValidKey = false;
                break;
            }
            keys.push(value);
        }

        let cacheKey;
        if (isValidKey) {
            cacheKey = keys.join(',') + (isSVG ? '-svg' : '');
            const cache = decalCache.get(cacheKey);
            if (cache) {
                isSVG ? (pattern as SVGPatternObject).svgElement = cache as SVGVNode
                    : (pattern as ImagePatternObject).image = cache as HTMLCanvasElement;
            }
        }

        const dashArrayX = normalizeDashArrayX(decalOpt.dashArrayX);
        const dashArrayY = normalizeDashArrayY(decalOpt.dashArrayY);
        const symbolArray = normalizeSymbolArray(decalOpt.symbol);
        const lineBlockLengthsX = getLineBlockLengthX(dashArrayX);
        const lineBlockLengthY = getLineBlockLengthY(dashArrayY);

        const canvas = !isSVG && platformApi.createCanvas();
        const svgRoot: SVGVNode = isSVG && {
            tag: 'g',
            attrs: {},
            key: 'dcl',
            children: []
        };
        const pSize = getPatternSize();
        let ctx: CanvasRenderingContext2D;
        if (canvas) {
            canvas.width = pSize.width * dpr;
            canvas.height = pSize.height * dpr;
            ctx = canvas.getContext('2d');
        }
        brushDecal();

        if (isValidKey) {
            decalCache.put(cacheKey, canvas || svgRoot);
        }

        (pattern as ImagePatternObject).image = canvas;
        (pattern as SVGPatternObject).svgElement = svgRoot;
        (pattern as SVGPatternObject).svgWidth = pSize.width;
        (pattern as SVGPatternObject).svgHeight = pSize.height;

        /**
         * Get minimum length that can make a repeatable pattern.
         *
         * @return {Object} pattern width and height
         */
        function getPatternSize(): {
            width: number,
            height: number
        } {
            /**
             * For example, if dash is [[3, 2], [2, 1]] for X, it looks like
             * |---  ---  ---  ---  --- ...
             * |-- -- -- -- -- -- -- -- ...
             * |---  ---  ---  ---  --- ...
             * |-- -- -- -- -- -- -- -- ...
             * So the minimum length of X is 15,
             * which is the least common multiple of `3 + 2` and `2 + 1`
             * |---  ---  ---  |---  --- ...
             * |-- -- -- -- -- |-- -- -- ...
             */
            let width = 1;
            for (let i = 0, xlen = lineBlockLengthsX.length; i < xlen; ++i) {
                width = getLeastCommonMultiple(width, lineBlockLengthsX[i]);
            }

            let symbolRepeats = 1;
            for (let i = 0, xlen = symbolArray.length; i < xlen; ++i) {
                symbolRepeats = getLeastCommonMultiple(symbolRepeats, symbolArray[i].length);
            }
            width *= symbolRepeats;

            const height = lineBlockLengthY * lineBlockLengthsX.length * symbolArray.length;

            if (__DEV__) {
                const warn = (attrName: string) => {
                    /* eslint-disable-next-line */
                    console.warn(`Calculated decal size is greater than ${attrName} due to decal option settings so ${attrName} is used for the decal size. Please consider changing the decal option to make a smaller decal or set ${attrName} to be larger to avoid incontinuity.`);
                };
                if (width > decalOpt.maxTileWidth) {
                    warn('maxTileWidth');
                }
                if (height > decalOpt.maxTileHeight) {
                    warn('maxTileHeight');
                }
            }

            return {
                width: Math.max(1, Math.min(width, decalOpt.maxTileWidth)),
                height: Math.max(1, Math.min(height, decalOpt.maxTileHeight))
            };
        }

        function brushDecal() {
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (decalOpt.backgroundColor) {
                    ctx.fillStyle = decalOpt.backgroundColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }

            let ySum = 0;
            for (let i = 0; i < dashArrayY.length; ++i) {
                ySum += dashArrayY[i];
            }
            if (ySum <= 0) {
                // dashArrayY is 0, draw nothing
                return;
            }

            let y = -lineBlockLengthY;
            let yId = 0;
            let yIdTotal = 0;
            let xId0 = 0;
            while (y < pSize.height) {
                if (yId % 2 === 0) {
                    const symbolYId = (yIdTotal / 2) % symbolArray.length;
                    let x = 0;
                    let xId1 = 0;
                    let xId1Total = 0;
                    while (x < pSize.width * 2) {
                        let xSum = 0;
                        for (let i = 0; i < dashArrayX[xId0].length; ++i) {
                            xSum += dashArrayX[xId0][i];
                        }
                        if (xSum <= 0) {
                            // Skip empty line
                            break;
                        }

                        // E.g., [15, 5, 20, 5] draws only for 15 and 20
                        if (xId1 % 2 === 0) {
                            const size = (1 - decalOpt.symbolSize) * 0.5;
                            const left = x + dashArrayX[xId0][xId1] * size;
                            const top = y + dashArrayY[yId] * size;
                            const width = dashArrayX[xId0][xId1] * decalOpt.symbolSize;
                            const height = dashArrayY[yId] * decalOpt.symbolSize;
                            const symbolXId = (xId1Total / 2) % symbolArray[symbolYId].length;

                            brushSymbol(left, top, width, height, symbolArray[symbolYId][symbolXId]);
                        }

                        x += dashArrayX[xId0][xId1];
                        ++xId1Total;
                        ++xId1;
                        if (xId1 === dashArrayX[xId0].length) {
                            xId1 = 0;
                        }
                    }

                    ++xId0;
                    if (xId0 === dashArrayX.length) {
                        xId0 = 0;
                    }
                }
                y += dashArrayY[yId];

                ++yIdTotal;
                ++yId;
                if (yId === dashArrayY.length) {
                    yId = 0;
                }
            }

            function brushSymbol(x: number, y: number, width: number, height: number, symbolType: string) {
                const scale = isSVG ? 1 : dpr;
                const symbol = createSymbol(
                    symbolType,
                    x * scale,
                    y * scale,
                    width * scale,
                    height * scale,
                    decalOpt.color,
                    decalOpt.symbolKeepAspect
                );
                if (isSVG) {
                    const symbolVNode = (zr.painter as SVGPainter).renderOneToVNode(symbol);
                    if (symbolVNode) {
                        svgRoot.children.push(symbolVNode);
                    }
                }
                else {
                    // Paint to canvas for all other renderers.
                    brushSingle(ctx, symbol);
                }
            }
        }
    }

}

/**
 * Convert symbol array into normalized array
 *
 * @param {string | (string | string[])[]} symbol symbol input
 * @return {string[][]} normolized symbol array
 */
function normalizeSymbolArray(symbol: string | (string | string[])[]): string[][] {
    if (!symbol || (symbol as string[]).length === 0) {
        return [['rect']];
    }
    if (isString(symbol)) {
        return [[symbol]];
    }

    let isAllString = true;
    for (let i = 0; i < symbol.length; ++i) {
        if (!isString(symbol[i])) {
            isAllString = false;
            break;
        }
    }
    if (isAllString) {
        return normalizeSymbolArray([symbol as string[]]);
    }

    const result: string[][] = [];
    for (let i = 0; i < symbol.length; ++i) {
        if (isString(symbol[i])) {
            result.push([symbol[i] as string]);
        }
        else {
            result.push(symbol[i] as string[]);
        }
    }
    return result;
}

/**
 * Convert dash input into dashArray
 *
 * @param {DecalDashArrayX} dash dash input
 * @return {number[][]} normolized dash array
 */
function normalizeDashArrayX(dash: DecalDashArrayX): number[][] {
    if (!dash || (dash as number[]).length === 0) {
        return [[0, 0]];
    }
    if (isNumber(dash)) {
        const dashValue = Math.ceil(dash);
        return [[dashValue, dashValue]];
    }

    /**
     * [20, 5] should be normalized into [[20, 5]],
     * while [20, [5, 10]] should be normalized into [[20, 20], [5, 10]]
     */
    let isAllNumber = true;
    for (let i = 0; i < dash.length; ++i) {
        if (!isNumber(dash[i])) {
            isAllNumber = false;
            break;
        }
    }
    if (isAllNumber) {
        return normalizeDashArrayX([dash as number[]]);
    }

    const result: number[][] = [];
    for (let i = 0; i < dash.length; ++i) {
        if (isNumber(dash[i])) {
            const dashValue = Math.ceil(dash[i] as number);
            result.push([dashValue, dashValue]);
        }
        else {
            const dashValue = map(dash[i] as number[], n => Math.ceil(n));
            if (dashValue.length % 2 === 1) {
                // [4, 2, 1] means |----  -    -- |----  -    -- |
                // so normalize it to be [4, 2, 1, 4, 2, 1]
                result.push(dashValue.concat(dashValue));
            }
            else {
                result.push(dashValue);
            }
        }
    }
    return result;
}

/**
 * Convert dash input into dashArray
 *
 * @param {DecalDashArrayY} dash dash input
 * @return {number[]} normolized dash array
 */
function normalizeDashArrayY(dash: DecalDashArrayY): number[] {
    if (!dash || typeof dash === 'object' && dash.length === 0) {
        return [0, 0];
    }
    if (isNumber(dash)) {
        const dashValue = Math.ceil(dash);
        return [dashValue, dashValue];
    }

    const dashValue = map(dash as number[], n => Math.ceil(n));
    return dash.length % 2 ? dashValue.concat(dashValue) : dashValue;
}

/**
 * Get block length of each line. A block is the length of dash line and space.
 * For example, a line with [4, 1] has a dash line of 4 and a space of 1 after
 * that, so the block length of this line is 5.
 *
 * @param {number[][]} dash dash array of X or Y
 * @return {number[]} block length of each line
 */
function getLineBlockLengthX(dash: number[][]): number[] {
    return map(dash, function (line) {
        return getLineBlockLengthY(line);
    });
}

function getLineBlockLengthY(dash: number[]): number {
    let blockLength = 0;
    for (let i = 0; i < dash.length; ++i) {
        blockLength += dash[i];
    }
    if (dash.length % 2 === 1) {
        // [4, 2, 1] means |----  -    -- |----  -    -- |
        // So total length is (4 + 2 + 1) * 2
        return blockLength * 2;
    }
    return blockLength;
}
