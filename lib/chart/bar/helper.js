
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

var graphic = require("../../util/graphic");

var _labelHelper = require("../helper/labelHelper");

var getDefaultLabel = _labelHelper.getDefaultLabel;

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
function setLabel(normalStyle, hoverStyle, itemModel, color, seriesModel, dataIndex, labelPositionOutside) {
  var labelModel = itemModel.getModel('label');
  var hoverLabelModel = itemModel.getModel('emphasis.label');
  graphic.setLabelStyle(normalStyle, hoverStyle, labelModel, hoverLabelModel, {
    labelFetcher: seriesModel,
    labelDataIndex: dataIndex,
    defaultText: getDefaultLabel(seriesModel.getData(), dataIndex),
    isRectText: true,
    autoColor: color
  });
  fixPosition(normalStyle);
  fixPosition(hoverStyle);
}

function fixPosition(style, labelPositionOutside) {
  if (style.textPosition === 'outside') {
    style.textPosition = labelPositionOutside;
  }
}

exports.setLabel = setLabel;