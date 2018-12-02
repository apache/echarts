
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

var echarts = require("../echarts");

require("./axisPointer");

require("./tooltip/TooltipModel");

require("./tooltip/TooltipView");

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
// FIXME Better way to pack data in graphic element

/**
 * @action
 * @property {string} type
 * @property {number} seriesIndex
 * @property {number} dataIndex
 * @property {number} [x]
 * @property {number} [y]
 */
echarts.registerAction({
  type: 'showTip',
  event: 'showTip',
  update: 'tooltip:manuallyShowTip'
}, // noop
function () {});
echarts.registerAction({
  type: 'hideTip',
  event: 'hideTip',
  update: 'tooltip:manuallyHideTip'
}, // noop
function () {});