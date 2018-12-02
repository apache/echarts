
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
var each = zrUtil.each;

function _default(option) {
  var visualMap = option && option.visualMap;

  if (!zrUtil.isArray(visualMap)) {
    visualMap = visualMap ? [visualMap] : [];
  }

  each(visualMap, function (opt) {
    if (!opt) {
      return;
    } // rename splitList to pieces


    if (has(opt, 'splitList') && !has(opt, 'pieces')) {
      opt.pieces = opt.splitList;
      delete opt.splitList;
    }

    var pieces = opt.pieces;

    if (pieces && zrUtil.isArray(pieces)) {
      each(pieces, function (piece) {
        if (zrUtil.isObject(piece)) {
          if (has(piece, 'start') && !has(piece, 'min')) {
            piece.min = piece.start;
          }

          if (has(piece, 'end') && !has(piece, 'max')) {
            piece.max = piece.end;
          }
        }
      });
    }
  });
}

function has(obj, name) {
  return obj && obj.hasOwnProperty && obj.hasOwnProperty(name);
}

module.exports = _default;