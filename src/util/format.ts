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
import * as textContain from 'zrender/src/contain/text';
import * as numberUtil from './number';
import {TooltipRenderMode} from './types';
import { Dictionary } from 'zrender/src/core/types';
import { StyleProps } from 'zrender/src/graphic/Style';
// import Text from 'zrender/src/graphic/Text';

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

export function toCamelCase(str: string, upperCaseFirst: boolean): string {
    str = (str || '').toLowerCase().replace(/-(.)/g, function (match, group1) {
        return group1.toUpperCase();
    });

    if (upperCaseFirst && str) {
        str = str.charAt(0).toUpperCase() + str.slice(1);
    }

    return str;
}

export var normalizeCssArray = zrUtil.normalizeCssArray;


var replaceReg = /([&<>"'])/g;
var replaceMap: Dictionary<string> = {
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

var TPL_VAR_ALIAS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

var wrapVar = function (varName: string, seriesIdx?: number): string {
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
    var seriesLen = paramsList.length;
    if (!seriesLen) {
        return '';
    }

    var $vars = paramsList[0].$vars || [];
    for (var i = 0; i < $vars.length; i++) {
        var alias = TPL_VAR_ALIAS[i];
        tpl = tpl.replace(wrapVar(alias), wrapVar(alias, 0));
    }
    for (var seriesIdx = 0; seriesIdx < seriesLen; seriesIdx++) {
        for (var k = 0; k < $vars.length; k++) {
            var val = paramsList[seriesIdx][$vars[k]];
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
        color: string
        [key: string]: any
    };
}
export type TooltipMarker = string | RichTextTooltipMarker;
interface GetTooltipMarkerOpt {
    color?: string;
    extraCssText?: string;
    // By default: 'item'
    type?: 'item' | 'subItem';
    renderMode?: TooltipRenderMode;
    // id name for marker. If only one marker is in a rich text, this can be omitted.
    // By default: 'X'
    markerId?: string;
}
export function getTooltipMarker(color: string, extraCssText?: string): TooltipMarker;
export function getTooltipMarker(opt: GetTooltipMarkerOpt): TooltipMarker;
export function getTooltipMarker(opt: string | GetTooltipMarkerOpt, extraCssText?: string): TooltipMarker {
    opt = zrUtil.isString(opt) ? {color: opt, extraCssText: extraCssText} : (opt || {});
    var color = opt.color;
    var type = opt.type;
    var extraCssText = opt.extraCssText;
    var renderMode = opt.renderMode || 'html';
    var markerId = opt.markerId || 'X';

    if (!color) {
        return '';
    }

    if (renderMode === 'html') {
        return type === 'subItem'
        ? '<span style="display:inline-block;vertical-align:middle;margin-right:8px;margin-left:3px;'
            + 'border-radius:4px;width:4px;height:4px;background-color:'
            + encodeHTML(color) + ';' + (extraCssText || '') + '"></span>'
        : '<span style="display:inline-block;margin-right:5px;'
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

    var date = numberUtil.parseDate(value);
    var utc = isUTC ? 'UTC' : '';
    var y = (date as any)['get' + utc + 'FullYear']();
    var M = (date as any)['get' + utc + 'Month']() + 1;
    var d = (date as any)['get' + utc + 'Date']();
    var h = (date as any)['get' + utc + 'Hours']();
    var m = (date as any)['get' + utc + 'Minutes']();
    var s = (date as any)['get' + utc + 'Seconds']();
    var S = (date as any)['get' + utc + 'Milliseconds']();

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

export var truncateText = textContain.truncateText;

export function getTextBoundingRect(opt: StyleProps): ReturnType<typeof textContain.getBoundingRect> {
    return textContain.getBoundingRect(
        opt.text,
        opt.font,
        opt.textAlign,
        opt.textVerticalAlign,
        opt.textPadding as number[],
        opt.textLineHeight,
        opt.rich,
        opt.truncate
    );
}

/**
 * @deprecated
 * the `textLineHeight` was added later.
 * For backward compatiblility, put it as the last parameter.
 * But deprecated this interface. Please use `getTextBoundingRect` instead.
 */
export function getTextRect(
    text: StyleProps['text'],
    font: StyleProps['font'],
    textAlign: StyleProps['textAlign'],
    textVerticalAlign: StyleProps['textVerticalAlign'],
    textPadding: StyleProps['textPadding'],
    rich: StyleProps['rich'],
    truncate: StyleProps['truncate'],
    textLineHeight: number
): ReturnType<typeof textContain.getBoundingRect> {
    return textContain.getBoundingRect(
        text, font, textAlign, textVerticalAlign, textPadding as number[], textLineHeight, rich, truncate
    );
}
