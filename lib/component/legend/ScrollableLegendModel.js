
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

var LegendModel = require("./LegendModel");

var _layout = require("../../util/layout");

var mergeLayoutParam = _layout.mergeLayoutParam;
var getLayoutParams = _layout.getLayoutParams;

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
var ScrollableLegendModel = LegendModel.extend({
  type: 'legend.scroll',

  /**
   * @param {number} scrollDataIndex
   */
  setScrollDataIndex: function (scrollDataIndex) {
    this.option.scrollDataIndex = scrollDataIndex;
  },
  defaultOption: {
    scrollDataIndex: 0,
    pageButtonItemGap: 5,
    pageButtonGap: null,
    pageButtonPosition: 'end',
    // 'start' or 'end'
    pageFormatter: '{current}/{total}',
    // If null/undefined, do not show page.
    pageIcons: {
      horizontal: ['M0,0L12,-10L12,10z', 'M0,0L-12,-10L-12,10z'],
      vertical: ['M0,0L20,0L10,-20z', 'M0,0L20,0L10,20z']
    },
    pageIconColor: '#2f4554',
    pageIconInactiveColor: '#aaa',
    pageIconSize: 15,
    // Can be [10, 3], which represents [width, height]
    pageTextStyle: {
      color: '#333'
    },
    animationDurationUpdate: 800
  },

  /**
   * @override
   */
  init: function (option, parentModel, ecModel, extraOpt) {
    var inputPositionParams = getLayoutParams(option);
    ScrollableLegendModel.superCall(this, 'init', option, parentModel, ecModel, extraOpt);
    mergeAndNormalizeLayoutParams(this, option, inputPositionParams);
  },

  /**
   * @override
   */
  mergeOption: function (option, extraOpt) {
    ScrollableLegendModel.superCall(this, 'mergeOption', option, extraOpt);
    mergeAndNormalizeLayoutParams(this, this.option, option);
  },
  getOrient: function () {
    return this.get('orient') === 'vertical' ? {
      index: 1,
      name: 'vertical'
    } : {
      index: 0,
      name: 'horizontal'
    };
  }
}); // Do not `ignoreSize` to enable setting {left: 10, right: 10}.

function mergeAndNormalizeLayoutParams(legendModel, target, raw) {
  var orient = legendModel.getOrient();
  var ignoreSize = [1, 1];
  ignoreSize[orient.index] = 0;
  mergeLayoutParam(target, raw, {
    type: 'box',
    ignoreSize: ignoreSize
  });
}

var _default = ScrollableLegendModel;
module.exports = _default;