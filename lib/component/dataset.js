
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

var ComponentModel = require("../model/Component");

var ComponentView = require("../view/Component");

var _sourceHelper = require("../data/helper/sourceHelper");

var detectSourceFormat = _sourceHelper.detectSourceFormat;

var _sourceType = require("../data/helper/sourceType");

var SERIES_LAYOUT_BY_COLUMN = _sourceType.SERIES_LAYOUT_BY_COLUMN;

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

/**
 * This module is imported by echarts directly.
 *
 * Notice:
 * Always keep this file exists for backward compatibility.
 * Because before 4.1.0, dataset is an optional component,
 * some users may import this module manually.
 */
ComponentModel.extend({
  type: 'dataset',

  /**
   * @protected
   */
  defaultOption: {
    // 'row', 'column'
    seriesLayoutBy: SERIES_LAYOUT_BY_COLUMN,
    // null/'auto': auto detect header, see "module:echarts/data/helper/sourceHelper"
    sourceHeader: null,
    dimensions: null,
    source: null
  },
  optionUpdated: function () {
    detectSourceFormat(this);
  }
});
ComponentView.extend({
  type: 'dataset'
});