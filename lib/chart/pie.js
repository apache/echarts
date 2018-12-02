
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

var zrUtil = require("zrender/lib/core/util");

require("./pie/PieSeries");

require("./pie/PieView");

var createDataSelectAction = require("../action/createDataSelectAction");

var dataColor = require("../visual/dataColor");

var pieLayout = require("./pie/pieLayout");

var dataFilter = require("../processor/dataFilter");

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
createDataSelectAction('pie', [{
  type: 'pieToggleSelect',
  event: 'pieselectchanged',
  method: 'toggleSelected'
}, {
  type: 'pieSelect',
  event: 'pieselected',
  method: 'select'
}, {
  type: 'pieUnSelect',
  event: 'pieunselected',
  method: 'unSelect'
}]);
echarts.registerVisual(dataColor('pie'));
echarts.registerLayout(zrUtil.curry(pieLayout, 'pie'));
echarts.registerProcessor(dataFilter('pie'));