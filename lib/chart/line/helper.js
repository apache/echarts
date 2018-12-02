
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

var _dataStackHelper = require("../../data/helper/dataStackHelper");

var isDimensionStacked = _dataStackHelper.isDimensionStacked;

var _util = require("zrender/lib/core/util");

var map = _util.map;

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
 * @param {Object} coordSys
 * @param {module:echarts/data/List} data
 * @param {string} valueOrigin lineSeries.option.areaStyle.origin
 */
function prepareDataCoordInfo(coordSys, data, valueOrigin) {
  var baseAxis = coordSys.getBaseAxis();
  var valueAxis = coordSys.getOtherAxis(baseAxis);
  var valueStart = getValueStart(valueAxis, valueOrigin);
  var baseAxisDim = baseAxis.dim;
  var valueAxisDim = valueAxis.dim;
  var valueDim = data.mapDimension(valueAxisDim);
  var baseDim = data.mapDimension(baseAxisDim);
  var baseDataOffset = valueAxisDim === 'x' || valueAxisDim === 'radius' ? 1 : 0;
  var dims = map(coordSys.dimensions, function (coordDim) {
    return data.mapDimension(coordDim);
  });
  var stacked;
  var stackResultDim = data.getCalculationInfo('stackResultDimension');

  if (stacked |= isDimensionStacked(data, dims[0]
  /*, dims[1]*/
  )) {
    // jshint ignore:line
    dims[0] = stackResultDim;
  }

  if (stacked |= isDimensionStacked(data, dims[1]
  /*, dims[0]*/
  )) {
    // jshint ignore:line
    dims[1] = stackResultDim;
  }

  return {
    dataDimsForPoint: dims,
    valueStart: valueStart,
    valueAxisDim: valueAxisDim,
    baseAxisDim: baseAxisDim,
    stacked: !!stacked,
    valueDim: valueDim,
    baseDim: baseDim,
    baseDataOffset: baseDataOffset,
    stackedOverDimension: data.getCalculationInfo('stackedOverDimension')
  };
}

function getValueStart(valueAxis, valueOrigin) {
  var valueStart = 0;
  var extent = valueAxis.scale.getExtent();

  if (valueOrigin === 'start') {
    valueStart = extent[0];
  } else if (valueOrigin === 'end') {
    valueStart = extent[1];
  } // auto
  else {
      // Both positive
      if (extent[0] > 0) {
        valueStart = extent[0];
      } // Both negative
      else if (extent[1] < 0) {
          valueStart = extent[1];
        } // If is one positive, and one negative, onZero shall be true

    }

  return valueStart;
}

function getStackedOnPoint(dataCoordInfo, coordSys, data, idx) {
  var value = NaN;

  if (dataCoordInfo.stacked) {
    value = data.get(data.getCalculationInfo('stackedOverDimension'), idx);
  }

  if (isNaN(value)) {
    value = dataCoordInfo.valueStart;
  }

  var baseDataOffset = dataCoordInfo.baseDataOffset;
  var stackedData = [];
  stackedData[baseDataOffset] = data.get(dataCoordInfo.baseDim, idx);
  stackedData[1 - baseDataOffset] = value;
  return coordSys.dataToPoint(stackedData);
}

exports.prepareDataCoordInfo = prepareDataCoordInfo;
exports.getStackedOnPoint = getStackedOnPoint;