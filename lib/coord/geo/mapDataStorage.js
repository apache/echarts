
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

var _config = require("../../config");

var __DEV__ = _config.__DEV__;

var _util = require("zrender/lib/core/util");

var createHashMap = _util.createHashMap;
var isString = _util.isString;
var isArray = _util.isArray;
var each = _util.each;
var assert = _util.assert;

var _parseSVG = require("zrender/lib/tool/parseSVG");

var parseXML = _parseSVG.parseXML;

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
var storage = createHashMap(); // For minimize the code size of common echarts package,
// do not put too much logic in this module.

var _default = {
  // The format of record: see `echarts.registerMap`.
  // Compatible with previous `echarts.registerMap`.
  registerMap: function (mapName, rawGeoJson, rawSpecialAreas) {
    var records;

    if (isArray(rawGeoJson)) {
      records = rawGeoJson;
    } else if (rawGeoJson.svg) {
      records = [{
        type: 'svg',
        source: rawGeoJson.svg,
        specialAreas: rawGeoJson.specialAreas
      }];
    } else {
      // Backward compatibility.
      if (rawGeoJson.geoJson && !rawGeoJson.features) {
        rawSpecialAreas = rawGeoJson.specialAreas;
        rawGeoJson = rawGeoJson.geoJson;
      }

      records = [{
        type: 'geoJSON',
        source: rawGeoJson,
        specialAreas: rawSpecialAreas
      }];
    }

    each(records, function (record) {
      var type = record.type;
      type === 'geoJson' && (type = record.type = 'geoJSON');
      var parse = parsers[type];
      parse(record);
    });
    return storage.set(mapName, records);
  },
  retrieveMap: function (mapName) {
    return storage.get(mapName);
  }
};
var parsers = {
  geoJSON: function (record) {
    var source = record.source;
    record.geoJSON = !isString(source) ? source : typeof JSON !== 'undefined' && JSON.parse ? JSON.parse(source) : new Function('return (' + source + ');')();
  },
  // Only perform parse to XML object here, which might be time
  // consiming for large SVG.
  // Although convert XML to zrender element is also time consiming,
  // if we do it here, the clone of zrender elements has to be
  // required. So we do it once for each geo instance, util real
  // performance issues call for optimizing it.
  svg: function (record) {
    record.svgXML = parseXML(record.source);
  }
};
module.exports = _default;