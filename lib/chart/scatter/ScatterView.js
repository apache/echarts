
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

var SymbolDraw = require("../helper/SymbolDraw");

var LargeSymbolDraw = require("../helper/LargeSymbolDraw");

var pointsLayout = require("../../layout/points");

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
echarts.extendChartView({
  type: 'scatter',
  render: function (seriesModel, ecModel, api) {
    var data = seriesModel.getData();

    var symbolDraw = this._updateSymbolDraw(data, seriesModel);

    symbolDraw.updateData(data);
    this._finished = true;
  },
  incrementalPrepareRender: function (seriesModel, ecModel, api) {
    var data = seriesModel.getData();

    var symbolDraw = this._updateSymbolDraw(data, seriesModel);

    symbolDraw.incrementalPrepareUpdate(data);
    this._finished = false;
  },
  incrementalRender: function (taskParams, seriesModel, ecModel) {
    this._symbolDraw.incrementalUpdate(taskParams, seriesModel.getData());

    this._finished = taskParams.end === seriesModel.getData().count();
  },
  updateTransform: function (seriesModel, ecModel, api) {
    var data = seriesModel.getData(); // Must mark group dirty and make sure the incremental layer will be cleared
    // PENDING

    this.group.dirty();

    if (!this._finished || data.count() > 1e4 || !this._symbolDraw.isPersistent()) {
      return {
        update: true
      };
    } else {
      var res = pointsLayout().reset(seriesModel);

      if (res.progress) {
        res.progress({
          start: 0,
          end: data.count()
        }, data);
      }

      this._symbolDraw.updateLayout(data);
    }
  },
  _updateSymbolDraw: function (data, seriesModel) {
    var symbolDraw = this._symbolDraw;
    var pipelineContext = seriesModel.pipelineContext;
    var isLargeDraw = pipelineContext.large;

    if (!symbolDraw || isLargeDraw !== this._isLargeDraw) {
      symbolDraw && symbolDraw.remove();
      symbolDraw = this._symbolDraw = isLargeDraw ? new LargeSymbolDraw() : new SymbolDraw();
      this._isLargeDraw = isLargeDraw;
      this.group.removeAll();
    }

    this.group.add(symbolDraw.group);
    return symbolDraw;
  },
  remove: function (ecModel, api) {
    this._symbolDraw && this._symbolDraw.remove(true);
    this._symbolDraw = null;
  },
  dispose: function () {}
});