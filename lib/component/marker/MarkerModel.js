
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

var echarts = require("../../echarts");

var zrUtil = require("zrender/lib/core/util");

var env = require("zrender/lib/core/env");

var modelUtil = require("../../util/model");

var formatUtil = require("../../util/format");

var dataFormatMixin = require("../../model/mixin/dataFormat");

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
var addCommas = formatUtil.addCommas;
var encodeHTML = formatUtil.encodeHTML;

function fillLabel(opt) {
  modelUtil.defaultEmphasis(opt, 'label', ['show']);
}

var MarkerModel = echarts.extendComponentModel({
  type: 'marker',
  dependencies: ['series', 'grid', 'polar', 'geo'],

  /**
   * @overrite
   */
  init: function (option, parentModel, ecModel, extraOpt) {
    this.mergeDefaultAndTheme(option, ecModel);
    this.mergeOption(option, ecModel, extraOpt.createdBySelf, true);
  },

  /**
   * @return {boolean}
   */
  isAnimationEnabled: function () {
    if (env.node) {
      return false;
    }

    var hostSeries = this.__hostSeries;
    return this.getShallow('animation') && hostSeries && hostSeries.isAnimationEnabled();
  },
  mergeOption: function (newOpt, ecModel, createdBySelf, isInit) {
    var MarkerModel = this.constructor;
    var modelPropName = this.mainType + 'Model';

    if (!createdBySelf) {
      ecModel.eachSeries(function (seriesModel) {
        var markerOpt = seriesModel.get(this.mainType, true);
        var markerModel = seriesModel[modelPropName];

        if (!markerOpt || !markerOpt.data) {
          seriesModel[modelPropName] = null;
          return;
        }

        if (!markerModel) {
          if (isInit) {
            // Default label emphasis `position` and `show`
            fillLabel(markerOpt);
          }

          zrUtil.each(markerOpt.data, function (item) {
            // FIXME Overwrite fillLabel method ?
            if (item instanceof Array) {
              fillLabel(item[0]);
              fillLabel(item[1]);
            } else {
              fillLabel(item);
            }
          });
          markerModel = new MarkerModel(markerOpt, this, ecModel);
          zrUtil.extend(markerModel, {
            mainType: this.mainType,
            // Use the same series index and name
            seriesIndex: seriesModel.seriesIndex,
            name: seriesModel.name,
            createdBySelf: true
          });
          markerModel.__hostSeries = seriesModel;
        } else {
          markerModel.mergeOption(markerOpt, ecModel, true);
        }

        seriesModel[modelPropName] = markerModel;
      }, this);
    }
  },
  formatTooltip: function (dataIndex) {
    var data = this.getData();
    var value = this.getRawValue(dataIndex);
    var formattedValue = zrUtil.isArray(value) ? zrUtil.map(value, addCommas).join(', ') : addCommas(value);
    var name = data.getName(dataIndex);
    var html = encodeHTML(this.name);

    if (value != null || name) {
      html += '<br />';
    }

    if (name) {
      html += encodeHTML(name);

      if (value != null) {
        html += ' : ';
      }
    }

    if (value != null) {
      html += encodeHTML(formattedValue);
    }

    return html;
  },
  getData: function () {
    return this._data;
  },
  setData: function (data) {
    this._data = data;
  }
});
zrUtil.mixin(MarkerModel, dataFormatMixin);
var _default = MarkerModel;
module.exports = _default;