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
import * as numberUtil from './number';
import {TooltipRenderMode, ColorString} from './types';
import { Dictionary } from 'zrender/src/core/types';

/**
 * Add a comma each three digit.
 */
export function addCommas(x: string | number): string {
    if (isNaN(x as number)) {
        return '-';
    }
    const parts = (x + '').split('.');
    return parts[0].replace(/(\d{1,3})(?=(?:\d{3})+(?!\d))/g, '$1,')
            + (parts.length > 1 ? ('.' + parts[1]) : '');
}

export function toCamelCase(str: string, upperCaseFirst?: boolean): string {
    str = (str || '').toLowerCase().replace(/-(.)/g, function (match, group1) {
        return group1.toUpperCase();
    });

    if (upperCaseFirst && str) {
        str = str.charAt(0).toUpperCase() + str.slice(1);
    }

    return str;
}

export const normalizeCssArray = zrUtil.normalizeCssArray;


const replaceReg = /([&<>"'])/g;
const replaceMap: Dictionary<string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;'
};

export function encodeHTML(source: string): string {
    return source == null
        ? ''
        : (source + '').replace(replaceReg, function (str, c) {
            return replaceMap[c];
        });
}

export function concatTooltipHtml(html: string, value: unknown, dontEncodeHtml?: boolean): string {
    return (dontEncodeHtml ? html : `<span style="font-size:12px;color:#6e7079;">${encodeHTML(html)}</span>`)
            + (value ? '<span style="float:right;margin-left:20px;color:#464646;font-weight:900;font-size:14px";>' : '')
            + encodeHTML(value as string)
            + (value ? '</span>' : '');
}

const TPL_VAR_ALIAS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

const wrapVar = function (varName: string, seriesIdx?: number): string {
    return '{' + varName + (seriesIdx == null ? '' : seriesIdx) + '}';
};

export interface TplFormatterParam extends Dictionary<any> {
    // Param name list for mapping `a`, `b`, `c`, `d`, `e`
    $vars: string[];
}
/**
 * Template formatter
 * @param {Array.<Object>|Object} paramsList
 */
export function formatTpl(
    tpl: string,
    paramsList: TplFormatterParam | TplFormatterParam[],
    encode?: boolean
): string {
    if (!zrUtil.isArray(paramsList)) {
        paramsList = [paramsList];
    }
    const seriesLen = paramsList.length;
    if (!seriesLen) {
        return '';
    }

    const $vars = paramsList[0].$vars || [];
    for (let i = 0; i < $vars.length; i++) {
        const alias = TPL_VAR_ALIAS[i];
        tpl = tpl.replace(wrapVar(alias), wrapVar(alias, 0));
    }
    for (let seriesIdx = 0; seriesIdx < seriesLen; seriesIdx++) {
        for (let k = 0; k < $vars.length; k++) {
            const val = paramsList[seriesIdx][$vars[k]];
            tpl = tpl.replace(
                wrapVar(TPL_VAR_ALIAS[k], seriesIdx),
                encode ? encodeHTML(val) : val
            );
        }
    }

    return tpl;
}

/**
 * simple Template formatter
 */
export function formatTplSimple(tpl: string, param: Dictionary<any>, encode?: boolean) {
    zrUtil.each(param, function (value, key) {
        tpl = tpl.replace(
            '{' + key + '}',
            encode ? encodeHTML(value) : value
        );
    });
    return tpl;
}

interface RichTextTooltipMarker {
    renderMode: TooltipRenderMode;
    content: string;
    style: {
        color: ColorString
        [key: string]: any
    };
}
export type TooltipMarker = string | RichTextTooltipMarker;
interface GetTooltipMarkerOpt {
    color?: ColorString;
    extraCssText?: string;
    // By default: 'item'
    type?: 'item' | 'subItem';
    renderMode?: TooltipRenderMode;
    // id name for marker. If only one marker is in a rich text, this can be omitted.
    // By default: 'X'
    markerId?: string;
}
// Only support color string
export function getTooltipMarker(color: ColorString, extraCssText?: string): TooltipMarker;
export function getTooltipMarker(opt: GetTooltipMarkerOpt): TooltipMarker;
export function getTooltipMarker(inOpt: ColorString | GetTooltipMarkerOpt, extraCssText?: string): TooltipMarker {
    const opt = zrUtil.isString(inOpt) ? {
        color: inOpt,
        extraCssText: extraCssText
    } : (inOpt || {}) as GetTooltipMarkerOpt;
    const color = opt.color;
    const type = opt.type;
    extraCssText = opt.extraCssText;
    const renderMode = opt.renderMode || 'html';
    const markerId = opt.markerId || 'X';

    if (!color) {
        return '';
    }

    if (renderMode === 'html') {
        return type === 'subItem'
        ? '<span style="display:inline-block;vertical-align:middle;margin-right:8px;margin-left:3px;'
            + 'border-radius:4px;width:4px;height:4px;background-color:'
            // Only support string
            + encodeHTML(color) + ';' + (extraCssText || '') + '"></span>'
        : '<span style="display:inline-block;margin-right:4px;'
            + 'border-radius:10px;width:10px;height:10px;background-color:'
            + encodeHTML(color) + ';' + (extraCssText || '') + '"></span>';
    }
    else {
        // Space for rich element marker
        return {
            renderMode: renderMode,
            content: '{marker' + markerId + '|}  ',
            style: {
                color: color
            }
        };
    }
}

function pad(str: string, len: number): string {
    str += '';
    return '0000'.substr(0, len - str.length) + str;
}


/**
 * ISO Date format
 * @param {string} tpl
 * @param {number} value
 * @param {boolean} [isUTC=false] Default in local time.
 *           see `module:echarts/scale/Time`
 *           and `module:echarts/util/number#parseDate`.
 * @inner
 */
export function formatTime(tpl: string, value: number | string | Date, isUTC?: boolean) {
    if (tpl === 'week'
        || tpl === 'month'
        || tpl === 'quarter'
        || tpl === 'half-year'
        || tpl === 'year'
    ) {
        tpl = 'MM-dd\nyyyy';
    }

    const date = numberUtil.parseDate(value);
    const utc = isUTC ? 'UTC' : '';
    const y = (date as any)['get' + utc + 'FullYear']();
    const M = (date as any)['get' + utc + 'Month']() + 1;
    const d = (date as any)['get' + utc + 'Date']();
    const h = (date as any)['get' + utc + 'Hours']();
    const m = (date as any)['get' + utc + 'Minutes']();
    const s = (date as any)['get' + utc + 'Seconds']();
    const S = (date as any)['get' + utc + 'Milliseconds']();

    tpl = tpl.replace('MM', pad(M, 2))
        .replace('M', M)
        .replace('yyyy', y)
        .replace('yy', y % 100 + '')
        .replace('dd', pad(d, 2))
        .replace('d', d)
        .replace('hh', pad(h, 2))
        .replace('h', h)
        .replace('mm', pad(m, 2))
        .replace('m', m)
        .replace('ss', pad(s, 2))
        .replace('s', s)
        .replace('SSS', pad(S, 3));

    return tpl;
}

/**
 * Capital first
 * @param {string} str
 * @return {string}
 */
export function capitalFirst(str: string): string {
    return str ? str.charAt(0).toUpperCase() + str.substr(1) : str;
}


export {truncateText} from 'zrender/src/graphic/helper/parseText';

/**
 * open new tab
 * @param link url
 * @param target blank or self
 */
export function windowOpen(link: string, target: string): void {
    if (target === '_blank' || target === 'blank') {
        const blank = window.open();
        blank.opener = null;
        blank.location.href = link;
    }
    else {
        window.open(link, target);
    }
}


export {getTextRect} from '../legacy/getTextRect';