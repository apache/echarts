
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

var ComponentModel = require("../../model/Component");

var _layout = require("../../util/layout");

var getLayoutParams = _layout.getLayoutParams;
var sizeCalculable = _layout.sizeCalculable;
var mergeLayoutParam = _layout.mergeLayoutParam;

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
var CalendarModel = ComponentModel.extend({
  type: 'calendar',

  /**
   * @type {module:echarts/coord/calendar/Calendar}
   */
  coordinateSystem: null,
  defaultOption: {
    zlevel: 0,
    z: 2,
    left: 80,
    top: 60,
    cellSize: 20,
    // horizontal vertical
    orient: 'horizontal',
    // month separate line style
    splitLine: {
      show: true,
      lineStyle: {
        color: '#000',
        width: 1,
        type: 'solid'
      }
    },
    // rect style  temporarily unused emphasis
    itemStyle: {
      color: '#fff',
      borderWidth: 1,
      borderColor: '#ccc'
    },
    // week text style
    dayLabel: {
      show: true,
      // a week first day
      firstDay: 0,
      // start end
      position: 'start',
      margin: '50%',
      // 50% of cellSize
      nameMap: 'en',
      color: '#000'
    },
    // month text style
    monthLabel: {
      show: true,
      // start end
      position: 'start',
      margin: 5,
      // center or left
      align: 'center',
      // cn en []
      nameMap: 'en',
      formatter: null,
      color: '#000'
    },
    // year text style
    yearLabel: {
      show: true,
      // top bottom left right
      position: null,
      margin: 30,
      formatter: null,
      color: '#ccc',
      fontFamily: 'sans-serif',
      fontWeight: 'bolder',
      fontSize: 20
    }
  },

  /**
   * @override
   */
  init: function (option, parentModel, ecModel, extraOpt) {
    var inputPositionParams = getLayoutParams(option);
    CalendarModel.superApply(this, 'init', arguments);
    mergeAndNormalizeLayoutParams(option, inputPositionParams);
  },

  /**
   * @override
   */
  mergeOption: function (option, extraOpt) {
    CalendarModel.superApply(this, 'mergeOption', arguments);
    mergeAndNormalizeLayoutParams(this.option, option);
  }
});

function mergeAndNormalizeLayoutParams(target, raw) {
  // Normalize cellSize
  var cellSize = target.cellSize;

  if (!zrUtil.isArray(cellSize)) {
    cellSize = target.cellSize = [cellSize, cellSize];
  } else if (cellSize.length === 1) {
    cellSize[1] = cellSize[0];
  }

  var ignoreSize = zrUtil.map([0, 1], function (hvIdx) {
    // If user have set `width` or both `left` and `right`, cellSize
    // will be automatically set to 'auto', otherwise the default
    // setting of cellSize will make `width` setting not work.
    if (sizeCalculable(raw, hvIdx)) {
      cellSize[hvIdx] = 'auto';
    }

    return cellSize[hvIdx] != null && cellSize[hvIdx] !== 'auto';
  });
  mergeLayoutParam(target, raw, {
    type: 'box',
    ignoreSize: ignoreSize
  });
}

var _default = CalendarModel;
module.exports = _default;