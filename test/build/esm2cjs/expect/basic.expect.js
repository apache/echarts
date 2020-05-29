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

var util = require("./a/b/util");

var zrUtil = require("zrender/core/util");

var someInZrUtil1Alias = zrUtil.someInZrUtil1;
var zz = zrUtil.zz;
exports.zrUtil = zrUtil;

var _color = require("zrender/core/color");

var color2Alias = _color.color2;
var color = _color.color;
var color3 = _color.color3;
var color4 = _color.color4;
exports.color2Alias = _color.color2;
exports.color = _color.color;

var Some = require("some");

exports.Some = Some;

var Some2 = require("some2");

var _util3 = require("zrender/lib/core/util");

exports.someInZrUtil2 = _util3.someInZrUtil2;

var _echarts = require("./echarts");

(function () {
  for (var key in _echarts) {
    if (_echarts == null || !_echarts.hasOwnProperty(key) || key === 'default' || key === '__esModule') return;
    exports[key] = _echarts[key];
  }
})();

var _yy = require("./xx/yy");

exports.defaultAsBB = _yy;
exports.exportSingle = _yy.exportSingle;

require("ssssss");

var propInZrUtil = zrUtil.some;
someInZrUtil1Alias();
zz();
var color4Renamed = color4;

function exportSingleFn() {}

var b = util.b;
var c = Some;
c(b);
color2Alias();
color3();
var ss = new Some2();
ss();
var pureLocalVar = 'pure'; // jshint ignore:line

function b() {
  a++;
  innerSingleVarRenamed = innerSingleVar;
}

var exportSingleVar = 'aa';
var innerSingleVar = 'cc';
var innerSingleVarRenamed;
exports.propInZrUtil = propInZrUtil;
exports.color4Renamed = color4Renamed;
exports.exportSingleFn = exportSingleFn;
exports.exportSingleVar = exportSingleVar;
exports.innerSingleVarAlias = innerSingleVar;
exports.innerSingleVarAlias2 = innerSingleVar;
exports.innerSingleVarRenamed = innerSingleVarRenamed;