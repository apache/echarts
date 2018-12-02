
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

var zrUtil = require("zrender/lib/core/util");

var helper = require("./helper");

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
echarts.registerAction('dataZoom', function (payload, ecModel) {
  var linkedNodesFinder = helper.createLinkedNodesFinder(zrUtil.bind(ecModel.eachComponent, ecModel, 'dataZoom'), helper.eachAxisDim, function (model, dimNames) {
    return model.get(dimNames.axisIndex);
  });
  var effectedModels = [];
  ecModel.eachComponent({
    mainType: 'dataZoom',
    query: payload
  }, function (model, index) {
    effectedModels.push.apply(effectedModels, linkedNodesFinder(model).nodes);
  });
  zrUtil.each(effectedModels, function (dataZoomModel, index) {
    dataZoomModel.setRawRange({
      start: payload.start,
      end: payload.end,
      startValue: payload.startValue,
      endValue: payload.endValue
    });
  });
});