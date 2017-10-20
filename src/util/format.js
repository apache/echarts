import * as zrUtil from 'zrender/src/core/util';
import * as textContain from 'zrender/src/contain/text';
import * as numberUtil from './number';

/**
 * 每三位默认加,格式化
 * @param {string|number} x
 * @return {string}
 */
export function addCommas(x) {
    if (isNaN(x)) {
        return '-';
    }
    x = (x + '').split('.');
    return x[0].replace(/(\d{1,3})(?=(?:\d{3})+(?!\d))/g,'$1,')
            + (x.length > 1 ? ('.' + x[1]) : '');
}

/**
 * @param {string} str
 * @param {boolean} [upperCaseFirst=false]
 * @return {string} str
 */
export function toCamelCase(str, upperCaseFirst) {
    str = (str || '').toLowerCase().replace(/-(.)/g, function(match, group1) {
        return group1.toUpperCase();
    });

    if (upperCaseFirst && str) {
        str = str.charAt(0).toUpperCase() + str.slice(1);
    }

    return str;
}

export var normalizeCssArray = zrUtil.normalizeCssArray;

export function encodeHTML(source) {
    return String(source)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

var TPL_VAR_ALIAS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

var wrapVar = function (varName, seriesIdx) {
    return '{' + varName + (seriesIdx == null ? '' : seriesIdx) + '}';
};

/**
 * Template formatter
 * @param {string} tpl
 * @param {Array.<Object>|Object} paramsList
 * @param {boolean} [encode=false]
 * @return {string}
 */
export function formatTpl(tpl, paramsList, encode) {
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
        var val = wrapVar(alias, 0);
        tpl = tpl.replace(wrapVar(alias), encode ? encodeHTML(val) : val);
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
 *
 * @param {string} tpl
 * @param {Object} param
 * @param {boolean} [encode=false]
 * @return {string}
 */
export function formatTplSimple(tpl, param, encode) {
    zrUtil.each(param, function (value, key) {
        tpl = tpl.replace(
            '{' + key + '}',
            encode ? encodeHTML(value) : value
        );
    });
    return tpl;
}

/**
 * @param {string} color
 * @param {string} [extraCssText]
 * @return {string}
 */
export function getTooltipMarker(color, extraCssText) {
    return color
        ? '<span style="display:inline-block;margin-right:5px;'
            + 'border-radius:10px;width:9px;height:9px;background-color:'
            + encodeHTML(color) + ';' + (extraCssText || '') + '"></span>'
        : '';
}

/**
 * @param {string} str
 * @return {string}
 * @inner
 */
var s2d = function (str) {
    return str < 10 ? ('0' + str) : str;
};

/**
 * ISO Date format
 * @param {string} tpl
 * @param {number} value
 * @param {boolean} [isUTC=false] Default in local time.
 *           see `module:echarts/scale/Time`
 *           and `module:echarts/util/number#parseDate`.
 * @inner
 */
export function formatTime(tpl, value, isUTC) {
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
    var y = date['get' + utc + 'FullYear']();
    var M = date['get' + utc + 'Month']() + 1;
    var d = date['get' + utc + 'Date']();
    var h = date['get' + utc + 'Hours']();
    var m = date['get' + utc + 'Minutes']();
    var s = date['get' + utc + 'Seconds']();

    tpl = tpl.replace('MM', s2d(M))
        .replace('M', M)
        .replace('yyyy', y)
        .replace('yy', y % 100)
        .replace('dd', s2d(d))
        .replace('d', d)
        .replace('hh', s2d(h))
        .replace('h', h)
        .replace('mm', s2d(m))
        .replace('m', m)
        .replace('ss', s2d(s))
        .replace('s', s);

    return tpl;
}

/**
 * Capital first
 * @param {string} str
 * @return {string}
 */
export function capitalFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.substr(1) : str;
}

export var truncateText = textContain.truncateText;

export var getTextRect = textContain.getBoundingRect;
