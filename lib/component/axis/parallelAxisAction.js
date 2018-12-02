
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

var echarts = require("../../echarts");

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
 * @payload
 * @property {string} parallelAxisId
 * @property {Array.<Array.<number>>} intervals
 */
var actionInfo = {
  type: 'axisAreaSelect',
  event: 'axisAreaSelected' // update: 'updateVisual'

};
echarts.registerAction(actionInfo, function (payload, ecModel) {
  ecModel.eachComponent({
    mainType: 'parallelAxis',
    query: payload
  }, function (parallelAxisModel) {
    parallelAxisModel.axis.model.setActiveIntervals(payload.intervals);
  });
});
/**
 * @payload
 */

echarts.registerAction('parallelAxisExpand', function (payload, ecModel) {
  ecModel.eachComponent({
    mainType: 'parallel',
    query: payload
  }, function (parallelModel) {
    parallelModel.setAxisExpand(payload);
  });
});