
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

var zrUtil = require("zrender/lib/core/util");

var VisualMapModel = require("./VisualMapModel");

var VisualMapping = require("../../visual/VisualMapping");

var visualDefault = require("../../visual/visualDefault");

var _number = require("../../util/number");

var reformIntervals = _number.reformIntervals;

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
var PiecewiseModel = VisualMapModel.extend({
  type: 'visualMap.piecewise',

  /**
   * Order Rule:
   *
   * option.categories / option.pieces / option.text / option.selected:
   *     If !option.inverse,
   *     Order when vertical: ['top', ..., 'bottom'].
   *     Order when horizontal: ['left', ..., 'right'].
   *     If option.inverse, the meaning of
   *     the order should be reversed.
   *
   * this._pieceList:
   *     The order is always [low, ..., high].
   *
   * Mapping from location to low-high:
   *     If !option.inverse
   *     When vertical, top is high.
   *     When horizontal, right is high.
   *     If option.inverse, reverse.
   */

  /**
   * @protected
   */
  defaultOption: {
    selected: null,
    // Object. If not specified, means selected.
    // When pieces and splitNumber: {'0': true, '5': true}
    // When categories: {'cate1': false, 'cate3': true}
    // When selected === false, means all unselected.
    minOpen: false,
    // Whether include values that smaller than `min`.
    maxOpen: false,
    // Whether include values that bigger than `max`.
    align: 'auto',
    // 'auto', 'left', 'right'
    itemWidth: 20,
    // When put the controller vertically, it is the length of
    // horizontal side of each item. Otherwise, vertical side.
    itemHeight: 14,
    // When put the controller vertically, it is the length of
    // vertical side of each item. Otherwise, horizontal side.
    itemSymbol: 'roundRect',
    pieceList: null,
    // Each item is Object, with some of those attrs:
    // {min, max, lt, gt, lte, gte, value,
    // color, colorSaturation, colorAlpha, opacity,
    // symbol, symbolSize}, which customize the range or visual
    // coding of the certain piece. Besides, see "Order Rule".
    categories: null,
    // category names, like: ['some1', 'some2', 'some3'].
    // Attr min/max are ignored when categories set. See "Order Rule"
    splitNumber: 5,
    // If set to 5, auto split five pieces equally.
    // If set to 0 and component type not set, component type will be
    // determined as "continuous". (It is less reasonable but for ec2
    // compatibility, see echarts/component/visualMap/typeDefaulter)
    selectedMode: 'multiple',
    // Can be 'multiple' or 'single'.
    itemGap: 10,
    // The gap between two items, in px.
    hoverLink: true,
    // Enable hover highlight.
    showLabel: null // By default, when text is used, label will hide (the logic
    // is remained for compatibility reason)

  },

  /**
   * @override
   */
  optionUpdated: function (newOption, isInit) {
    PiecewiseModel.superApply(this, 'optionUpdated', arguments);
    /**
     * The order is always [low, ..., high].
     * [{text: string, interval: Array.<number>}, ...]
     * @private
     * @type {Array.<Object>}
     */

    this._pieceList = [];
    this.resetExtent();
    /**
     * 'pieces', 'categories', 'splitNumber'
     * @type {string}
     */

    var mode = this._mode = this._determineMode();

    resetMethods[this._mode].call(this);

    this._resetSelected(newOption, isInit);

    var categories = this.option.categories;
    this.resetVisual(function (mappingOption, state) {
      if (mode === 'categories') {
        mappingOption.mappingMethod = 'category';
        mappingOption.categories = zrUtil.clone(categories);
      } else {
        mappingOption.dataExtent = this.getExtent();
        mappingOption.mappingMethod = 'piecewise';
        mappingOption.pieceList = zrUtil.map(this._pieceList, function (piece) {
          var piece = zrUtil.clone(piece);

          if (state !== 'inRange') {
            // FIXME
            // outOfRange do not support special visual in pieces.
            piece.visual = null;
          }

          return piece;
        });
      }
    });
  },

  /**
   * @protected
   * @override
   */
  completeVisualOption: function () {
    // Consider this case:
    // visualMap: {
    //      pieces: [{symbol: 'circle', lt: 0}, {symbol: 'rect', gte: 0}]
    // }
    // where no inRange/outOfRange set but only pieces. So we should make
    // default inRange/outOfRange for this case, otherwise visuals that only
    // appear in `pieces` will not be taken into account in visual encoding.
    var option = this.option;
    var visualTypesInPieces = {};
    var visualTypes = VisualMapping.listVisualTypes();
    var isCategory = this.isCategory();
    zrUtil.each(option.pieces, function (piece) {
      zrUtil.each(visualTypes, function (visualType) {
        if (piece.hasOwnProperty(visualType)) {
          visualTypesInPieces[visualType] = 1;
        }
      });
    });
    zrUtil.each(visualTypesInPieces, function (v, visualType) {
      var exists = 0;
      zrUtil.each(this.stateList, function (state) {
        exists |= has(option, state, visualType) || has(option.target, state, visualType);
      }, this);
      !exists && zrUtil.each(this.stateList, function (state) {
        (option[state] || (option[state] = {}))[visualType] = visualDefault.get(visualType, state === 'inRange' ? 'active' : 'inactive', isCategory);
      });
    }, this);

    function has(obj, state, visualType) {
      return obj && obj[state] && (zrUtil.isObject(obj[state]) ? obj[state].hasOwnProperty(visualType) : obj[state] === visualType // e.g., inRange: 'symbol'
      );
    }

    VisualMapModel.prototype.completeVisualOption.apply(this, arguments);
  },
  _resetSelected: function (newOption, isInit) {
    var thisOption = this.option;
    var pieceList = this._pieceList; // Selected do not merge but all override.

    var selected = (isInit ? thisOption : newOption).selected || {};
    thisOption.selected = selected; // Consider 'not specified' means true.

    zrUtil.each(pieceList, function (piece, index) {
      var key = this.getSelectedMapKey(piece);

      if (!selected.hasOwnProperty(key)) {
        selected[key] = true;
      }
    }, this);

    if (thisOption.selectedMode === 'single') {
      // Ensure there is only one selected.
      var hasSel = false;
      zrUtil.each(pieceList, function (piece, index) {
        var key = this.getSelectedMapKey(piece);

        if (selected[key]) {
          hasSel ? selected[key] = false : hasSel = true;
        }
      }, this);
    } // thisOption.selectedMode === 'multiple', default: all selected.

  },

  /**
   * @public
   */
  getSelectedMapKey: function (piece) {
    return this._mode === 'categories' ? piece.value + '' : piece.index + '';
  },

  /**
   * @public
   */
  getPieceList: function () {
    return this._pieceList;
  },

  /**
   * @private
   * @return {string}
   */
  _determineMode: function () {
    var option = this.option;
    return option.pieces && option.pieces.length > 0 ? 'pieces' : this.option.categories ? 'categories' : 'splitNumber';
  },

  /**
   * @public
   * @override
   */
  setSelected: function (selected) {
    this.option.selected = zrUtil.clone(selected);
  },

  /**
   * @public
   * @override
   */
  getValueState: function (value) {
    var index = VisualMapping.findPieceIndex(value, this._pieceList);
    return index != null ? this.option.selected[this.getSelectedMapKey(this._pieceList[index])] ? 'inRange' : 'outOfRange' : 'outOfRange';
  },

  /**
   * @public
   * @params {number} pieceIndex piece index in visualMapModel.getPieceList()
   * @return {Array.<Object>} [{seriesId, dataIndices: <Array.<number>>}, ...]
   */
  findTargetDataIndices: function (pieceIndex) {
    var result = [];
    this.eachTargetSeries(function (seriesModel) {
      var dataIndices = [];
      var data = seriesModel.getData();
      data.each(this.getDataDimension(data), function (value, dataIndex) {
        // Should always base on model pieceList, because it is order sensitive.
        var pIdx = VisualMapping.findPieceIndex(value, this._pieceList);
        pIdx === pieceIndex && dataIndices.push(dataIndex);
      }, this);
      result.push({
        seriesId: seriesModel.id,
        dataIndex: dataIndices
      });
    }, this);
    return result;
  },

  /**
   * @private
   * @param {Object} piece piece.value or piece.interval is required.
   * @return {number} Can be Infinity or -Infinity
   */
  getRepresentValue: function (piece) {
    var representValue;

    if (this.isCategory()) {
      representValue = piece.value;
    } else {
      if (piece.value != null) {
        representValue = piece.value;
      } else {
        var pieceInterval = piece.interval || [];
        representValue = pieceInterval[0] === -Infinity && pieceInterval[1] === Infinity ? 0 : (pieceInterval[0] + pieceInterval[1]) / 2;
      }
    }

    return representValue;
  },
  getVisualMeta: function (getColorVisual) {
    // Do not support category. (category axis is ordinal, numerical)
    if (this.isCategory()) {
      return;
    }

    var stops = [];
    var outerColors = [];
    var visualMapModel = this;

    function setStop(interval, valueState) {
      var representValue = visualMapModel.getRepresentValue({
        interval: interval
      });

      if (!valueState) {
        valueState = visualMapModel.getValueState(representValue);
      }

      var color = getColorVisual(representValue, valueState);

      if (interval[0] === -Infinity) {
        outerColors[0] = color;
      } else if (interval[1] === Infinity) {
        outerColors[1] = color;
      } else {
        stops.push({
          value: interval[0],
          color: color
        }, {
          value: interval[1],
          color: color
        });
      }
    } // Suplement


    var pieceList = this._pieceList.slice();

    if (!pieceList.length) {
      pieceList.push({
        interval: [-Infinity, Infinity]
      });
    } else {
      var edge = pieceList[0].interval[0];
      edge !== -Infinity && pieceList.unshift({
        interval: [-Infinity, edge]
      });
      edge = pieceList[pieceList.length - 1].interval[1];
      edge !== Infinity && pieceList.push({
        interval: [edge, Infinity]
      });
    }

    var curr = -Infinity;
    zrUtil.each(pieceList, function (piece) {
      var interval = piece.interval;

      if (interval) {
        // Fulfill gap.
        interval[0] > curr && setStop([curr, interval[0]], 'outOfRange');
        setStop(interval.slice());
        curr = interval[1];
      }
    }, this);
    return {
      stops: stops,
      outerColors: outerColors
    };
  }
});
/**
 * Key is this._mode
 * @type {Object}
 * @this {module:echarts/component/viusalMap/PiecewiseMode}
 */

var resetMethods = {
  splitNumber: function () {
    var thisOption = this.option;
    var pieceList = this._pieceList;
    var precision = Math.min(thisOption.precision, 20);
    var dataExtent = this.getExtent();
    var splitNumber = thisOption.splitNumber;
    splitNumber = Math.max(parseInt(splitNumber, 10), 1);
    thisOption.splitNumber = splitNumber;
    var splitStep = (dataExtent[1] - dataExtent[0]) / splitNumber; // Precision auto-adaption

    while (+splitStep.toFixed(precision) !== splitStep && precision < 5) {
      precision++;
    }

    thisOption.precision = precision;
    splitStep = +splitStep.toFixed(precision);
    var index = 0;

    if (thisOption.minOpen) {
      pieceList.push({
        index: index++,
        interval: [-Infinity, dataExtent[0]],
        close: [0, 0]
      });
    }

    for (var curr = dataExtent[0], len = index + splitNumber; index < len; curr += splitStep) {
      var max = index === splitNumber - 1 ? dataExtent[1] : curr + splitStep;
      pieceList.push({
        index: index++,
        interval: [curr, max],
        close: [1, 1]
      });
    }

    if (thisOption.maxOpen) {
      pieceList.push({
        index: index++,
        interval: [dataExtent[1], Infinity],
        close: [0, 0]
      });
    }

    reformIntervals(pieceList);
    zrUtil.each(pieceList, function (piece) {
      piece.text = this.formatValueText(piece.interval);
    }, this);
  },
  categories: function () {
    var thisOption = this.option;
    zrUtil.each(thisOption.categories, function (cate) {
      // FIXME category模式也使用pieceList，但在visualMapping中不是使用pieceList。
      // 是否改一致。
      this._pieceList.push({
        text: this.formatValueText(cate, true),
        value: cate
      });
    }, this); // See "Order Rule".

    normalizeReverse(thisOption, this._pieceList);
  },
  pieces: function () {
    var thisOption = this.option;
    var pieceList = this._pieceList;
    zrUtil.each(thisOption.pieces, function (pieceListItem, index) {
      if (!zrUtil.isObject(pieceListItem)) {
        pieceListItem = {
          value: pieceListItem
        };
      }

      var item = {
        text: '',
        index: index
      };

      if (pieceListItem.label != null) {
        item.text = pieceListItem.label;
      }

      if (pieceListItem.hasOwnProperty('value')) {
        var value = item.value = pieceListItem.value;
        item.interval = [value, value];
        item.close = [1, 1];
      } else {
        // `min` `max` is legacy option.
        // `lt` `gt` `lte` `gte` is recommanded.
        var interval = item.interval = [];
        var close = item.close = [0, 0];
        var closeList = [1, 0, 1];
        var infinityList = [-Infinity, Infinity];
        var useMinMax = [];

        for (var lg = 0; lg < 2; lg++) {
          var names = [['gte', 'gt', 'min'], ['lte', 'lt', 'max']][lg];

          for (var i = 0; i < 3 && interval[lg] == null; i++) {
            interval[lg] = pieceListItem[names[i]];
            close[lg] = closeList[i];
            useMinMax[lg] = i === 2;
          }

          interval[lg] == null && (interval[lg] = infinityList[lg]);
        }

        useMinMax[0] && interval[1] === Infinity && (close[0] = 0);
        useMinMax[1] && interval[0] === -Infinity && (close[1] = 0);

        if (interval[0] === interval[1] && close[0] && close[1]) {
          // Consider: [{min: 5, max: 5, visual: {...}}, {min: 0, max: 5}],
          // we use value to lift the priority when min === max
          item.value = interval[0];
        }
      }

      item.visual = VisualMapping.retrieveVisuals(pieceListItem);
      pieceList.push(item);
    }, this); // See "Order Rule".

    normalizeReverse(thisOption, pieceList); // Only pieces

    reformIntervals(pieceList);
    zrUtil.each(pieceList, function (piece) {
      var close = piece.close;
      var edgeSymbols = [['<', '≤'][close[1]], ['>', '≥'][close[0]]];
      piece.text = piece.text || this.formatValueText(piece.value != null ? piece.value : piece.interval, false, edgeSymbols);
    }, this);
  }
};

function normalizeReverse(thisOption, pieceList) {
  var inverse = thisOption.inverse;

  if (thisOption.orient === 'vertical' ? !inverse : inverse) {
    pieceList.reverse();
  }
}

var _default = PiecewiseModel;
module.exports = _default;