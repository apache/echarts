
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

var zrUtil = require("zrender/lib/core/util");

var textContain = require("zrender/lib/contain/text");

var numberUtil = require("./number");

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
// import Text from 'zrender/src/graphic/Text';

/**
 * 每三位默认加,格式化
 * @param {string|number} x
 * @return {string}
 */
function addCommas(x) {
  if (isNaN(x)) {
    return '-';
  }

  x = (x + '').split('.');
  return x[0].replace(/(\d{1,3})(?=(?:\d{3})+(?!\d))/g, '$1,') + (x.length > 1 ? '.' + x[1] : '');
}
/**
 * @param {string} str
 * @param {boolean} [upperCaseFirst=false]
 * @return {string} str
 */


function toCamelCase(str, upperCaseFirst) {
  str = (str || '').toLowerCase().replace(/-(.)/g, function (match, group1) {
    return group1.toUpperCase();
  });

  if (upperCaseFirst && str) {
    str = str.charAt(0).toUpperCase() + str.slice(1);
  }

  return str;
}

var normalizeCssArray = zrUtil.normalizeCssArray;
var replaceReg = /([&<>"'])/g;
var replaceMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;'
};

function encodeHTML(source) {
  return source == null ? '' : (source + '').replace(replaceReg, function (str, c) {
    return replaceMap[c];
  });
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


function formatTpl(tpl, paramsList, encode) {
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
      tpl = tpl.replace(wrapVar(TPL_VAR_ALIAS[k], seriesIdx), encode ? encodeHTML(val) : val);
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


function formatTplSimple(tpl, param, encode) {
  zrUtil.each(param, function (value, key) {
    tpl = tpl.replace('{' + key + '}', encode ? encodeHTML(value) : value);
  });
  return tpl;
}
/**
 * @param {Object|string} [opt] If string, means color.
 * @param {string} [opt.color]
 * @param {string} [opt.extraCssText]
 * @param {string} [opt.type='item'] 'item' or 'subItem'
 * @param {string} [opt.renderMode='html'] render mode of tooltip, 'html' or 'richText'
 * @param {string} [opt.markerId='X'] id name for marker. If only one marker is in a rich text, this can be omitted.
 * @return {string}
 */


function getTooltipMarker(opt, extraCssText) {
  opt = zrUtil.isString(opt) ? {
    color: opt,
    extraCssText: extraCssText
  } : opt || {};
  var color = opt.color;
  var type = opt.type;
  var extraCssText = opt.extraCssText;
  var renderMode = opt.renderMode || 'html';
  var markerId = opt.markerId || 'X';

  if (!color) {
    return '';
  }

  if (renderMode === 'html') {
    return type === 'subItem' ? '<span style="display:inline-block;vertical-align:middle;margin-right:8px;margin-left:3px;' + 'border-radius:4px;width:4px;height:4px;background-color:' + encodeHTML(color) + ';' + (extraCssText || '') + '"></span>' : '<span style="display:inline-block;margin-right:5px;' + 'border-radius:10px;width:10px;height:10px;background-color:' + encodeHTML(color) + ';' + (extraCssText || '') + '"></span>';
  } else {
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

function pad(str, len) {
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


function formatTime(tpl, value, isUTC) {
  if (tpl === 'week' || tpl === 'month' || tpl === 'quarter' || tpl === 'half-year' || tpl === 'year') {
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
  var S = date['get' + utc + 'Milliseconds']();
  tpl = tpl.replace('MM', pad(M, 2)).replace('M', M).replace('yyyy', y).replace('yy', y % 100).replace('dd', pad(d, 2)).replace('d', d).replace('hh', pad(h, 2)).replace('h', h).replace('mm', pad(m, 2)).replace('m', m).replace('ss', pad(s, 2)).replace('s', s).replace('SSS', pad(S, 3));
  return tpl;
}
/**
 * Capital first
 * @param {string} str
 * @return {string}
 */


function capitalFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.substr(1) : str;
}

var truncateText = textContain.truncateText;
var getTextRect = textContain.getBoundingRect;
exports.addCommas = addCommas;
exports.toCamelCase = toCamelCase;
exports.normalizeCssArray = normalizeCssArray;
exports.encodeHTML = encodeHTML;
exports.formatTpl = formatTpl;
exports.formatTplSimple = formatTplSimple;
exports.getTooltipMarker = getTooltipMarker;
exports.formatTime = formatTime;
exports.capitalFirst = capitalFirst;
exports.truncateText = truncateText;
exports.getTextRect = getTextRect;