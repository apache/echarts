
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
var DEFAULT_TOOLBOX_BTNS = ['rect', 'polygon', 'keep', 'clear'];

function _default(option, isNew) {
  var brushComponents = option && option.brush;

  if (!zrUtil.isArray(brushComponents)) {
    brushComponents = brushComponents ? [brushComponents] : [];
  }

  if (!brushComponents.length) {
    return;
  }

  var brushComponentSpecifiedBtns = [];
  zrUtil.each(brushComponents, function (brushOpt) {
    var tbs = brushOpt.hasOwnProperty('toolbox') ? brushOpt.toolbox : [];

    if (tbs instanceof Array) {
      brushComponentSpecifiedBtns = brushComponentSpecifiedBtns.concat(tbs);
    }
  });
  var toolbox = option && option.toolbox;

  if (zrUtil.isArray(toolbox)) {
    toolbox = toolbox[0];
  }

  if (!toolbox) {
    toolbox = {
      feature: {}
    };
    option.toolbox = [toolbox];
  }

  var toolboxFeature = toolbox.feature || (toolbox.feature = {});
  var toolboxBrush = toolboxFeature.brush || (toolboxFeature.brush = {});
  var brushTypes = toolboxBrush.type || (toolboxBrush.type = []);
  brushTypes.push.apply(brushTypes, brushComponentSpecifiedBtns);
  removeDuplicate(brushTypes);

  if (isNew && !brushTypes.length) {
    brushTypes.push.apply(brushTypes, DEFAULT_TOOLBOX_BTNS);
  }
}

function removeDuplicate(arr) {
  var map = {};
  zrUtil.each(arr, function (val) {
    map[val] = 1;
  });
  arr.length = 0;
  zrUtil.each(map, function (flag, val) {
    arr.push(val);
  });
}

module.exports = _default;