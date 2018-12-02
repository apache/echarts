
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

var Model = require("../../model/Model");

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
var each = zrUtil.each;
var curry = zrUtil.curry; // Build axisPointerModel, mergin tooltip.axisPointer model for each axis.
// allAxesInfo should be updated when setOption performed.

function collect(ecModel, api) {
  var result = {
    /**
     * key: makeKey(axis.model)
     * value: {
     *      axis,
     *      coordSys,
     *      axisPointerModel,
     *      triggerTooltip,
     *      involveSeries,
     *      snap,
     *      seriesModels,
     *      seriesDataCount
     * }
     */
    axesInfo: {},
    seriesInvolved: false,

    /**
     * key: makeKey(coordSys.model)
     * value: Object: key makeKey(axis.model), value: axisInfo
     */
    coordSysAxesInfo: {},
    coordSysMap: {}
  };
  collectAxesInfo(result, ecModel, api); // Check seriesInvolved for performance, in case too many series in some chart.

  result.seriesInvolved && collectSeriesInfo(result, ecModel);
  return result;
}

function collectAxesInfo(result, ecModel, api) {
  var globalTooltipModel = ecModel.getComponent('tooltip');
  var globalAxisPointerModel = ecModel.getComponent('axisPointer'); // links can only be set on global.

  var linksOption = globalAxisPointerModel.get('link', true) || [];
  var linkGroups = []; // Collect axes info.

  each(api.getCoordinateSystems(), function (coordSys) {
    // Some coordinate system do not support axes, like geo.
    if (!coordSys.axisPointerEnabled) {
      return;
    }

    var coordSysKey = makeKey(coordSys.model);
    var axesInfoInCoordSys = result.coordSysAxesInfo[coordSysKey] = {};
    result.coordSysMap[coordSysKey] = coordSys; // Set tooltip (like 'cross') is a convienent way to show axisPointer
    // for user. So we enable seting tooltip on coordSys model.

    var coordSysModel = coordSys.model;
    var baseTooltipModel = coordSysModel.getModel('tooltip', globalTooltipModel);
    each(coordSys.getAxes(), curry(saveTooltipAxisInfo, false, null)); // If axis tooltip used, choose tooltip axis for each coordSys.
    // Notice this case: coordSys is `grid` but not `cartesian2D` here.

    if (coordSys.getTooltipAxes && globalTooltipModel // If tooltip.showContent is set as false, tooltip will not
    // show but axisPointer will show as normal.
    && baseTooltipModel.get('show')) {
      // Compatible with previous logic. But series.tooltip.trigger: 'axis'
      // or series.data[n].tooltip.trigger: 'axis' are not support any more.
      var triggerAxis = baseTooltipModel.get('trigger') === 'axis';
      var cross = baseTooltipModel.get('axisPointer.type') === 'cross';
      var tooltipAxes = coordSys.getTooltipAxes(baseTooltipModel.get('axisPointer.axis'));

      if (triggerAxis || cross) {
        each(tooltipAxes.baseAxes, curry(saveTooltipAxisInfo, cross ? 'cross' : true, triggerAxis));
      }

      if (cross) {
        each(tooltipAxes.otherAxes, curry(saveTooltipAxisInfo, 'cross', false));
      }
    } // fromTooltip: true | false | 'cross'
    // triggerTooltip: true | false | null


    function saveTooltipAxisInfo(fromTooltip, triggerTooltip, axis) {
      var axisPointerModel = axis.model.getModel('axisPointer', globalAxisPointerModel);
      var axisPointerShow = axisPointerModel.get('show');

      if (!axisPointerShow || axisPointerShow === 'auto' && !fromTooltip && !isHandleTrigger(axisPointerModel)) {
        return;
      }

      if (triggerTooltip == null) {
        triggerTooltip = axisPointerModel.get('triggerTooltip');
      }

      axisPointerModel = fromTooltip ? makeAxisPointerModel(axis, baseTooltipModel, globalAxisPointerModel, ecModel, fromTooltip, triggerTooltip) : axisPointerModel;
      var snap = axisPointerModel.get('snap');
      var key = makeKey(axis.model);
      var involveSeries = triggerTooltip || snap || axis.type === 'category'; // If result.axesInfo[key] exist, override it (tooltip has higher priority).

      var axisInfo = result.axesInfo[key] = {
        key: key,
        axis: axis,
        coordSys: coordSys,
        axisPointerModel: axisPointerModel,
        triggerTooltip: triggerTooltip,
        involveSeries: involveSeries,
        snap: snap,
        useHandle: isHandleTrigger(axisPointerModel),
        seriesModels: []
      };
      axesInfoInCoordSys[key] = axisInfo;
      result.seriesInvolved |= involveSeries;
      var groupIndex = getLinkGroupIndex(linksOption, axis);

      if (groupIndex != null) {
        var linkGroup = linkGroups[groupIndex] || (linkGroups[groupIndex] = {
          axesInfo: {}
        });
        linkGroup.axesInfo[key] = axisInfo;
        linkGroup.mapper = linksOption[groupIndex].mapper;
        axisInfo.linkGroup = linkGroup;
      }
    }
  });
}

function makeAxisPointerModel(axis, baseTooltipModel, globalAxisPointerModel, ecModel, fromTooltip, triggerTooltip) {
  var tooltipAxisPointerModel = baseTooltipModel.getModel('axisPointer');
  var volatileOption = {};
  each(['type', 'snap', 'lineStyle', 'shadowStyle', 'label', 'animation', 'animationDurationUpdate', 'animationEasingUpdate', 'z'], function (field) {
    volatileOption[field] = zrUtil.clone(tooltipAxisPointerModel.get(field));
  }); // category axis do not auto snap, otherwise some tick that do not
  // has value can not be hovered. value/time/log axis default snap if
  // triggered from tooltip and trigger tooltip.

  volatileOption.snap = axis.type !== 'category' && !!triggerTooltip; // Compatibel with previous behavior, tooltip axis do not show label by default.
  // Only these properties can be overrided from tooltip to axisPointer.

  if (tooltipAxisPointerModel.get('type') === 'cross') {
    volatileOption.type = 'line';
  }

  var labelOption = volatileOption.label || (volatileOption.label = {}); // Follow the convention, do not show label when triggered by tooltip by default.

  labelOption.show == null && (labelOption.show = false);

  if (fromTooltip === 'cross') {
    // When 'cross', both axes show labels.
    var tooltipAxisPointerLabelShow = tooltipAxisPointerModel.get('label.show');
    labelOption.show = tooltipAxisPointerLabelShow != null ? tooltipAxisPointerLabelShow : true; // If triggerTooltip, this is a base axis, which should better not use cross style
    // (cross style is dashed by default)

    if (!triggerTooltip) {
      var crossStyle = volatileOption.lineStyle = tooltipAxisPointerModel.get('crossStyle');
      crossStyle && zrUtil.defaults(labelOption, crossStyle.textStyle);
    }
  }

  return axis.model.getModel('axisPointer', new Model(volatileOption, globalAxisPointerModel, ecModel));
}

function collectSeriesInfo(result, ecModel) {
  // Prepare data for axis trigger
  ecModel.eachSeries(function (seriesModel) {
    // Notice this case: this coordSys is `cartesian2D` but not `grid`.
    var coordSys = seriesModel.coordinateSystem;
    var seriesTooltipTrigger = seriesModel.get('tooltip.trigger', true);
    var seriesTooltipShow = seriesModel.get('tooltip.show', true);

    if (!coordSys || seriesTooltipTrigger === 'none' || seriesTooltipTrigger === false || seriesTooltipTrigger === 'item' || seriesTooltipShow === false || seriesModel.get('axisPointer.show', true) === false) {
      return;
    }

    each(result.coordSysAxesInfo[makeKey(coordSys.model)], function (axisInfo) {
      var axis = axisInfo.axis;

      if (coordSys.getAxis(axis.dim) === axis) {
        axisInfo.seriesModels.push(seriesModel);
        axisInfo.seriesDataCount == null && (axisInfo.seriesDataCount = 0);
        axisInfo.seriesDataCount += seriesModel.getData().count();
      }
    });
  }, this);
}
/**
 * For example:
 * {
 *     axisPointer: {
 *         links: [{
 *             xAxisIndex: [2, 4],
 *             yAxisIndex: 'all'
 *         }, {
 *             xAxisId: ['a5', 'a7'],
 *             xAxisName: 'xxx'
 *         }]
 *     }
 * }
 */


function getLinkGroupIndex(linksOption, axis) {
  var axisModel = axis.model;
  var dim = axis.dim;

  for (var i = 0; i < linksOption.length; i++) {
    var linkOption = linksOption[i] || {};

    if (checkPropInLink(linkOption[dim + 'AxisId'], axisModel.id) || checkPropInLink(linkOption[dim + 'AxisIndex'], axisModel.componentIndex) || checkPropInLink(linkOption[dim + 'AxisName'], axisModel.name)) {
      return i;
    }
  }
}

function checkPropInLink(linkPropValue, axisPropValue) {
  return linkPropValue === 'all' || zrUtil.isArray(linkPropValue) && zrUtil.indexOf(linkPropValue, axisPropValue) >= 0 || linkPropValue === axisPropValue;
}

function fixValue(axisModel) {
  var axisInfo = getAxisInfo(axisModel);

  if (!axisInfo) {
    return;
  }

  var axisPointerModel = axisInfo.axisPointerModel;
  var scale = axisInfo.axis.scale;
  var option = axisPointerModel.option;
  var status = axisPointerModel.get('status');
  var value = axisPointerModel.get('value'); // Parse init value for category and time axis.

  if (value != null) {
    value = scale.parse(value);
  }

  var useHandle = isHandleTrigger(axisPointerModel); // If `handle` used, `axisPointer` will always be displayed, so value
  // and status should be initialized.

  if (status == null) {
    option.status = useHandle ? 'show' : 'hide';
  }

  var extent = scale.getExtent().slice();
  extent[0] > extent[1] && extent.reverse();

  if ( // Pick a value on axis when initializing.
  value == null // If both `handle` and `dataZoom` are used, value may be out of axis extent,
  // where we should re-pick a value to keep `handle` displaying normally.
  || value > extent[1]) {
    // Make handle displayed on the end of the axis when init, which looks better.
    value = extent[1];
  }

  if (value < extent[0]) {
    value = extent[0];
  }

  option.value = value;

  if (useHandle) {
    option.status = axisInfo.axis.scale.isBlank() ? 'hide' : 'show';
  }
}

function getAxisInfo(axisModel) {
  var coordSysAxesInfo = (axisModel.ecModel.getComponent('axisPointer') || {}).coordSysAxesInfo;
  return coordSysAxesInfo && coordSysAxesInfo.axesInfo[makeKey(axisModel)];
}

function getAxisPointerModel(axisModel) {
  var axisInfo = getAxisInfo(axisModel);
  return axisInfo && axisInfo.axisPointerModel;
}

function isHandleTrigger(axisPointerModel) {
  return !!axisPointerModel.get('handle.show');
}
/**
 * @param {module:echarts/model/Model} model
 * @return {string} unique key
 */


function makeKey(model) {
  return model.type + '||' + model.id;
}

exports.collect = collect;
exports.fixValue = fixValue;
exports.getAxisInfo = getAxisInfo;
exports.getAxisPointerModel = getAxisPointerModel;
exports.makeKey = makeKey;