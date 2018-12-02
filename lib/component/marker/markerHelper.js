
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

var zrUtil = require("zrender/lib/core/util");

var numberUtil = require("../../util/number");

var _dataStackHelper = require("../../data/helper/dataStackHelper");

var isDimensionStacked = _dataStackHelper.isDimensionStacked;

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
var indexOf = zrUtil.indexOf;

function hasXOrY(item) {
  return !(isNaN(parseFloat(item.x)) && isNaN(parseFloat(item.y)));
}

function hasXAndY(item) {
  return !isNaN(parseFloat(item.x)) && !isNaN(parseFloat(item.y));
} // Make it simple, do not visit all stacked value to count precision.
// function getPrecision(data, valueAxisDim, dataIndex) {
//     var precision = -1;
//     var stackedDim = data.mapDimension(valueAxisDim);
//     do {
//         precision = Math.max(
//             numberUtil.getPrecision(data.get(stackedDim, dataIndex)),
//             precision
//         );
//         var stackedOnSeries = data.getCalculationInfo('stackedOnSeries');
//         if (stackedOnSeries) {
//             var byValue = data.get(data.getCalculationInfo('stackedByDimension'), dataIndex);
//             data = stackedOnSeries.getData();
//             dataIndex = data.indexOf(data.getCalculationInfo('stackedByDimension'), byValue);
//             stackedDim = data.getCalculationInfo('stackedDimension');
//         }
//         else {
//             data = null;
//         }
//     } while (data);
//     return precision;
// }


function markerTypeCalculatorWithExtent(mlType, data, otherDataDim, targetDataDim, otherCoordIndex, targetCoordIndex) {
  var coordArr = [];
  var stacked = isDimensionStacked(data, targetDataDim
  /*, otherDataDim*/
  );
  var calcDataDim = stacked ? data.getCalculationInfo('stackResultDimension') : targetDataDim;
  var value = numCalculate(data, calcDataDim, mlType);
  var dataIndex = data.indicesOfNearest(calcDataDim, value)[0];
  coordArr[otherCoordIndex] = data.get(otherDataDim, dataIndex);
  coordArr[targetCoordIndex] = data.get(targetDataDim, dataIndex); // Make it simple, do not visit all stacked value to count precision.

  var precision = numberUtil.getPrecision(data.get(targetDataDim, dataIndex));
  precision = Math.min(precision, 20);

  if (precision >= 0) {
    coordArr[targetCoordIndex] = +coordArr[targetCoordIndex].toFixed(precision);
  }

  return coordArr;
}

var curry = zrUtil.curry; // TODO Specified percent

var markerTypeCalculator = {
  /**
   * @method
   * @param {module:echarts/data/List} data
   * @param {string} baseAxisDim
   * @param {string} valueAxisDim
   */
  min: curry(markerTypeCalculatorWithExtent, 'min'),

  /**
   * @method
   * @param {module:echarts/data/List} data
   * @param {string} baseAxisDim
   * @param {string} valueAxisDim
   */
  max: curry(markerTypeCalculatorWithExtent, 'max'),

  /**
   * @method
   * @param {module:echarts/data/List} data
   * @param {string} baseAxisDim
   * @param {string} valueAxisDim
   */
  average: curry(markerTypeCalculatorWithExtent, 'average')
};
/**
 * Transform markPoint data item to format used in List by do the following
 * 1. Calculate statistic like `max`, `min`, `average`
 * 2. Convert `item.xAxis`, `item.yAxis` to `item.coord` array
 * @param  {module:echarts/model/Series} seriesModel
 * @param  {module:echarts/coord/*} [coordSys]
 * @param  {Object} item
 * @return {Object}
 */

function dataTransform(seriesModel, item) {
  var data = seriesModel.getData();
  var coordSys = seriesModel.coordinateSystem; // 1. If not specify the position with pixel directly
  // 2. If `coord` is not a data array. Which uses `xAxis`,
  // `yAxis` to specify the coord on each dimension
  // parseFloat first because item.x and item.y can be percent string like '20%'

  if (item && !hasXAndY(item) && !zrUtil.isArray(item.coord) && coordSys) {
    var dims = coordSys.dimensions;
    var axisInfo = getAxisInfo(item, data, coordSys, seriesModel); // Clone the option
    // Transform the properties xAxis, yAxis, radiusAxis, angleAxis, geoCoord to value

    item = zrUtil.clone(item);

    if (item.type && markerTypeCalculator[item.type] && axisInfo.baseAxis && axisInfo.valueAxis) {
      var otherCoordIndex = indexOf(dims, axisInfo.baseAxis.dim);
      var targetCoordIndex = indexOf(dims, axisInfo.valueAxis.dim);
      item.coord = markerTypeCalculator[item.type](data, axisInfo.baseDataDim, axisInfo.valueDataDim, otherCoordIndex, targetCoordIndex); // Force to use the value of calculated value.

      item.value = item.coord[targetCoordIndex];
    } else {
      // FIXME Only has one of xAxis and yAxis.
      var coord = [item.xAxis != null ? item.xAxis : item.radiusAxis, item.yAxis != null ? item.yAxis : item.angleAxis]; // Each coord support max, min, average

      for (var i = 0; i < 2; i++) {
        if (markerTypeCalculator[coord[i]]) {
          coord[i] = numCalculate(data, data.mapDimension(dims[i]), coord[i]);
        }
      }

      item.coord = coord;
    }
  }

  return item;
}

function getAxisInfo(item, data, coordSys, seriesModel) {
  var ret = {};

  if (item.valueIndex != null || item.valueDim != null) {
    ret.valueDataDim = item.valueIndex != null ? data.getDimension(item.valueIndex) : item.valueDim;
    ret.valueAxis = coordSys.getAxis(dataDimToCoordDim(seriesModel, ret.valueDataDim));
    ret.baseAxis = coordSys.getOtherAxis(ret.valueAxis);
    ret.baseDataDim = data.mapDimension(ret.baseAxis.dim);
  } else {
    ret.baseAxis = seriesModel.getBaseAxis();
    ret.valueAxis = coordSys.getOtherAxis(ret.baseAxis);
    ret.baseDataDim = data.mapDimension(ret.baseAxis.dim);
    ret.valueDataDim = data.mapDimension(ret.valueAxis.dim);
  }

  return ret;
}

function dataDimToCoordDim(seriesModel, dataDim) {
  var data = seriesModel.getData();
  var dimensions = data.dimensions;
  dataDim = data.getDimension(dataDim);

  for (var i = 0; i < dimensions.length; i++) {
    var dimItem = data.getDimensionInfo(dimensions[i]);

    if (dimItem.name === dataDim) {
      return dimItem.coordDim;
    }
  }
}
/**
 * Filter data which is out of coordinateSystem range
 * [dataFilter description]
 * @param  {module:echarts/coord/*} [coordSys]
 * @param  {Object} item
 * @return {boolean}
 */


function dataFilter(coordSys, item) {
  // Alwalys return true if there is no coordSys
  return coordSys && coordSys.containData && item.coord && !hasXOrY(item) ? coordSys.containData(item.coord) : true;
}

function dimValueGetter(item, dimName, dataIndex, dimIndex) {
  // x, y, radius, angle
  if (dimIndex < 2) {
    return item.coord && item.coord[dimIndex];
  }

  return item.value;
}

function numCalculate(data, valueDataDim, type) {
  if (type === 'average') {
    var sum = 0;
    var count = 0;
    data.each(valueDataDim, function (val, idx) {
      if (!isNaN(val)) {
        sum += val;
        count++;
      }
    });
    return sum / count;
  } else if (type === 'median') {
    return data.getMedian(valueDataDim);
  } else {
    // max & min
    return data.getDataExtent(valueDataDim, true)[type === 'max' ? 1 : 0];
  }
}

exports.dataTransform = dataTransform;
exports.getAxisInfo = getAxisInfo;
exports.dataFilter = dataFilter;
exports.dimValueGetter = dimValueGetter;
exports.numCalculate = numCalculate;