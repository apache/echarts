
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

var graphic = require("../../util/graphic");

var formatUtil = require("../../util/format");

var numberUtil = require("../../util/number");

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
var MONTH_TEXT = {
  EN: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  CN: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
};
var WEEK_TEXT = {
  EN: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  CN: ['日', '一', '二', '三', '四', '五', '六']
};

var _default = echarts.extendComponentView({
  type: 'calendar',

  /**
   * top/left line points
   *  @private
   */
  _tlpoints: null,

  /**
   * bottom/right line points
   *  @private
   */
  _blpoints: null,

  /**
   * first day of month
   *  @private
   */
  _firstDayOfMonth: null,

  /**
   * first day point of month
   *  @private
   */
  _firstDayPoints: null,
  render: function (calendarModel, ecModel, api) {
    var group = this.group;
    group.removeAll();
    var coordSys = calendarModel.coordinateSystem; // range info

    var rangeData = coordSys.getRangeInfo();
    var orient = coordSys.getOrient();

    this._renderDayRect(calendarModel, rangeData, group); // _renderLines must be called prior to following function


    this._renderLines(calendarModel, rangeData, orient, group);

    this._renderYearText(calendarModel, rangeData, orient, group);

    this._renderMonthText(calendarModel, orient, group);

    this._renderWeekText(calendarModel, rangeData, orient, group);
  },
  // render day rect
  _renderDayRect: function (calendarModel, rangeData, group) {
    var coordSys = calendarModel.coordinateSystem;
    var itemRectStyleModel = calendarModel.getModel('itemStyle').getItemStyle();
    var sw = coordSys.getCellWidth();
    var sh = coordSys.getCellHeight();

    for (var i = rangeData.start.time; i <= rangeData.end.time; i = coordSys.getNextNDay(i, 1).time) {
      var point = coordSys.dataToRect([i], false).tl; // every rect

      var rect = new graphic.Rect({
        shape: {
          x: point[0],
          y: point[1],
          width: sw,
          height: sh
        },
        cursor: 'default',
        style: itemRectStyleModel
      });
      group.add(rect);
    }
  },
  // render separate line
  _renderLines: function (calendarModel, rangeData, orient, group) {
    var self = this;
    var coordSys = calendarModel.coordinateSystem;
    var lineStyleModel = calendarModel.getModel('splitLine.lineStyle').getLineStyle();
    var show = calendarModel.get('splitLine.show');
    var lineWidth = lineStyleModel.lineWidth;
    this._tlpoints = [];
    this._blpoints = [];
    this._firstDayOfMonth = [];
    this._firstDayPoints = [];
    var firstDay = rangeData.start;

    for (var i = 0; firstDay.time <= rangeData.end.time; i++) {
      addPoints(firstDay.formatedDate);

      if (i === 0) {
        firstDay = coordSys.getDateInfo(rangeData.start.y + '-' + rangeData.start.m);
      }

      var date = firstDay.date;
      date.setMonth(date.getMonth() + 1);
      firstDay = coordSys.getDateInfo(date);
    }

    addPoints(coordSys.getNextNDay(rangeData.end.time, 1).formatedDate);

    function addPoints(date) {
      self._firstDayOfMonth.push(coordSys.getDateInfo(date));

      self._firstDayPoints.push(coordSys.dataToRect([date], false).tl);

      var points = self._getLinePointsOfOneWeek(calendarModel, date, orient);

      self._tlpoints.push(points[0]);

      self._blpoints.push(points[points.length - 1]);

      show && self._drawSplitline(points, lineStyleModel, group);
    } // render top/left line


    show && this._drawSplitline(self._getEdgesPoints(self._tlpoints, lineWidth, orient), lineStyleModel, group); // render bottom/right line

    show && this._drawSplitline(self._getEdgesPoints(self._blpoints, lineWidth, orient), lineStyleModel, group);
  },
  // get points at both ends
  _getEdgesPoints: function (points, lineWidth, orient) {
    var rs = [points[0].slice(), points[points.length - 1].slice()];
    var idx = orient === 'horizontal' ? 0 : 1; // both ends of the line are extend half lineWidth

    rs[0][idx] = rs[0][idx] - lineWidth / 2;
    rs[1][idx] = rs[1][idx] + lineWidth / 2;
    return rs;
  },
  // render split line
  _drawSplitline: function (points, lineStyleModel, group) {
    var poyline = new graphic.Polyline({
      z2: 20,
      shape: {
        points: points
      },
      style: lineStyleModel
    });
    group.add(poyline);
  },
  // render month line of one week points
  _getLinePointsOfOneWeek: function (calendarModel, date, orient) {
    var coordSys = calendarModel.coordinateSystem;
    date = coordSys.getDateInfo(date);
    var points = [];

    for (var i = 0; i < 7; i++) {
      var tmpD = coordSys.getNextNDay(date.time, i);
      var point = coordSys.dataToRect([tmpD.time], false);
      points[2 * tmpD.day] = point.tl;
      points[2 * tmpD.day + 1] = point[orient === 'horizontal' ? 'bl' : 'tr'];
    }

    return points;
  },
  _formatterLabel: function (formatter, params) {
    if (typeof formatter === 'string' && formatter) {
      return formatUtil.formatTplSimple(formatter, params);
    }

    if (typeof formatter === 'function') {
      return formatter(params);
    }

    return params.nameMap;
  },
  _yearTextPositionControl: function (textEl, point, orient, position, margin) {
    point = point.slice();
    var aligns = ['center', 'bottom'];

    if (position === 'bottom') {
      point[1] += margin;
      aligns = ['center', 'top'];
    } else if (position === 'left') {
      point[0] -= margin;
    } else if (position === 'right') {
      point[0] += margin;
      aligns = ['center', 'top'];
    } else {
      // top
      point[1] -= margin;
    }

    var rotate = 0;

    if (position === 'left' || position === 'right') {
      rotate = Math.PI / 2;
    }

    return {
      rotation: rotate,
      position: point,
      style: {
        textAlign: aligns[0],
        textVerticalAlign: aligns[1]
      }
    };
  },
  // render year
  _renderYearText: function (calendarModel, rangeData, orient, group) {
    var yearLabel = calendarModel.getModel('yearLabel');

    if (!yearLabel.get('show')) {
      return;
    }

    var margin = yearLabel.get('margin');
    var pos = yearLabel.get('position');

    if (!pos) {
      pos = orient !== 'horizontal' ? 'top' : 'left';
    }

    var points = [this._tlpoints[this._tlpoints.length - 1], this._blpoints[0]];
    var xc = (points[0][0] + points[1][0]) / 2;
    var yc = (points[0][1] + points[1][1]) / 2;
    var idx = orient === 'horizontal' ? 0 : 1;
    var posPoints = {
      top: [xc, points[idx][1]],
      bottom: [xc, points[1 - idx][1]],
      left: [points[1 - idx][0], yc],
      right: [points[idx][0], yc]
    };
    var name = rangeData.start.y;

    if (+rangeData.end.y > +rangeData.start.y) {
      name = name + '-' + rangeData.end.y;
    }

    var formatter = yearLabel.get('formatter');
    var params = {
      start: rangeData.start.y,
      end: rangeData.end.y,
      nameMap: name
    };

    var content = this._formatterLabel(formatter, params);

    var yearText = new graphic.Text({
      z2: 30
    });
    graphic.setTextStyle(yearText.style, yearLabel, {
      text: content
    }), yearText.attr(this._yearTextPositionControl(yearText, posPoints[pos], orient, pos, margin));
    group.add(yearText);
  },
  _monthTextPositionControl: function (point, isCenter, orient, position, margin) {
    var align = 'left';
    var vAlign = 'top';
    var x = point[0];
    var y = point[1];

    if (orient === 'horizontal') {
      y = y + margin;

      if (isCenter) {
        align = 'center';
      }

      if (position === 'start') {
        vAlign = 'bottom';
      }
    } else {
      x = x + margin;

      if (isCenter) {
        vAlign = 'middle';
      }

      if (position === 'start') {
        align = 'right';
      }
    }

    return {
      x: x,
      y: y,
      textAlign: align,
      textVerticalAlign: vAlign
    };
  },
  // render month and year text
  _renderMonthText: function (calendarModel, orient, group) {
    var monthLabel = calendarModel.getModel('monthLabel');

    if (!monthLabel.get('show')) {
      return;
    }

    var nameMap = monthLabel.get('nameMap');
    var margin = monthLabel.get('margin');
    var pos = monthLabel.get('position');
    var align = monthLabel.get('align');
    var termPoints = [this._tlpoints, this._blpoints];

    if (zrUtil.isString(nameMap)) {
      nameMap = MONTH_TEXT[nameMap.toUpperCase()] || [];
    }

    var idx = pos === 'start' ? 0 : 1;
    var axis = orient === 'horizontal' ? 0 : 1;
    margin = pos === 'start' ? -margin : margin;
    var isCenter = align === 'center';

    for (var i = 0; i < termPoints[idx].length - 1; i++) {
      var tmp = termPoints[idx][i].slice();
      var firstDay = this._firstDayOfMonth[i];

      if (isCenter) {
        var firstDayPoints = this._firstDayPoints[i];
        tmp[axis] = (firstDayPoints[axis] + termPoints[0][i + 1][axis]) / 2;
      }

      var formatter = monthLabel.get('formatter');
      var name = nameMap[+firstDay.m - 1];
      var params = {
        yyyy: firstDay.y,
        yy: (firstDay.y + '').slice(2),
        MM: firstDay.m,
        M: +firstDay.m,
        nameMap: name
      };

      var content = this._formatterLabel(formatter, params);

      var monthText = new graphic.Text({
        z2: 30
      });
      zrUtil.extend(graphic.setTextStyle(monthText.style, monthLabel, {
        text: content
      }), this._monthTextPositionControl(tmp, isCenter, orient, pos, margin));
      group.add(monthText);
    }
  },
  _weekTextPositionControl: function (point, orient, position, margin, cellSize) {
    var align = 'center';
    var vAlign = 'middle';
    var x = point[0];
    var y = point[1];
    var isStart = position === 'start';

    if (orient === 'horizontal') {
      x = x + margin + (isStart ? 1 : -1) * cellSize[0] / 2;
      align = isStart ? 'right' : 'left';
    } else {
      y = y + margin + (isStart ? 1 : -1) * cellSize[1] / 2;
      vAlign = isStart ? 'bottom' : 'top';
    }

    return {
      x: x,
      y: y,
      textAlign: align,
      textVerticalAlign: vAlign
    };
  },
  // render weeks
  _renderWeekText: function (calendarModel, rangeData, orient, group) {
    var dayLabel = calendarModel.getModel('dayLabel');

    if (!dayLabel.get('show')) {
      return;
    }

    var coordSys = calendarModel.coordinateSystem;
    var pos = dayLabel.get('position');
    var nameMap = dayLabel.get('nameMap');
    var margin = dayLabel.get('margin');
    var firstDayOfWeek = coordSys.getFirstDayOfWeek();

    if (zrUtil.isString(nameMap)) {
      nameMap = WEEK_TEXT[nameMap.toUpperCase()] || [];
    }

    var start = coordSys.getNextNDay(rangeData.end.time, 7 - rangeData.lweek).time;
    var cellSize = [coordSys.getCellWidth(), coordSys.getCellHeight()];
    margin = numberUtil.parsePercent(margin, cellSize[orient === 'horizontal' ? 0 : 1]);

    if (pos === 'start') {
      start = coordSys.getNextNDay(rangeData.start.time, -(7 + rangeData.fweek)).time;
      margin = -margin;
    }

    for (var i = 0; i < 7; i++) {
      var tmpD = coordSys.getNextNDay(start, i);
      var point = coordSys.dataToRect([tmpD.time], false).center;
      var day = i;
      day = Math.abs((i + firstDayOfWeek) % 7);
      var weekText = new graphic.Text({
        z2: 30
      });
      zrUtil.extend(graphic.setTextStyle(weekText.style, dayLabel, {
        text: nameMap[day]
      }), this._weekTextPositionControl(point, orient, pos, margin, cellSize));
      group.add(weekText);
    }
  }
});

module.exports = _default;