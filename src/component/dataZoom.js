/**
 * echarts组件：数据区域缩放
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表参数
     * @param {Object} component 组件
     */
    function DataZoom(messageCenter, zr, option, component) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_DATAZOOM;

        var _zlevelBase = self.getZlevelBase();

        var zoomOption;

        var _fillerSize = 30;       // 填充大小
        var _handleSize = 10;       // 手柄大小
        var _location;              // 位置参数，通过计算所得x, y, width, height
        var _zoom;                  // 缩放参数
        var _fillerShae;
        var _startShape;
        var _endShape;

        var _syncTicket;
        var _isSilence = false;

        var _originalData;

        function _buildShape() {
            _buildBackground();
            _buildDataBackground();
            _buildFiller();
            _bulidHandle();

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }

            _syncData();
        }

        /**
         * 根据选项计算实体的位置坐标
         */
        function _getLocation() {
            var x;
            var y;
            var width;
            var height;
            var grid = component.grid;

            // 不指定则根据grid适配
            if (zoomOption.orient == 'horizontal') {
                // 水平布局
                width = zoomOption.width || grid.getWidth();
                height = zoomOption.height || _fillerSize;
                x = typeof zoomOption.x != 'undefined'
                    ? zoomOption.x : grid.getX();
                y = typeof zoomOption.y != 'undefined'
                    ? zoomOption.y : (zr.getHeight() - height);
            }
            else {
                // 垂直布局
                width = zoomOption.width || _fillerSize;
                height = zoomOption.height || grid.getHeight();
                x = typeof zoomOption.x != 'undefined'
                    ? zoomOption.x : 0;
                y = typeof zoomOption.y != 'undefined'
                    ? zoomOption.y : grid.getY();
            }

            return {
                x : x,
                y : y,
                width : width,
                height : height
            };
        }

        /**
         * 计算缩放参数
         * 修正单坐标轴只传对象为数组。
         */
        function _getZoom() {
            var series = option.series;
            var xAxis = option.xAxis;
            if (xAxis && !(xAxis instanceof Array)) {
                xAxis = [xAxis];
                option.xAxis = xAxis;
            }
            var yAxis = option.yAxis;
            if (yAxis && !(yAxis instanceof Array)) {
                yAxis = [yAxis];
                option.yAxis = yAxis;
            }

            var zoomSeriesIndex = [];
            var xAxisIndex;
            var yAxisIndex;

            var zOptIdx = zoomOption.xAxisIndex;
            if (xAxis && typeof zOptIdx == 'undefined') {
                xAxisIndex = [];
                for (var i = 0, l = xAxis.length; i < l; i++) {
                    // 横纵默认为类目轴
                    if (xAxis[i].type == 'category'
                        || typeof xAxis[i].type == 'undefined'
                    ) {
                        xAxisIndex.push(i);
                    }
                }
            }
            else {
                if (zOptIdx instanceof Array) {
                    xAxisIndex = zOptIdx;
                }
                else if (typeof zOptIdx != 'undefined') {
                    xAxisIndex = [zOptIdx];
                }
                else {
                    xAxisIndex = [];
                }
            }

            zOptIdx = zoomOption.yAxisIndex;
            if (yAxis && typeof zOptIdx == 'undefined') {
                yAxisIndex = [];
                for (var i = 0, l = yAxis.length; i < l; i++) {
                    if (yAxis[i].type == 'category') {
                        yAxisIndex.push(i);
                    }
                }
            }
            else {
                if (zOptIdx instanceof Array) {
                    yAxisIndex = zOptIdx;
                }
                else if (typeof zOptIdx != 'undefined') {
                    yAxisIndex = [zOptIdx];
                }
                else {
                    yAxisIndex = [];
                }
            }

            // 找到缩放控制的所有series
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type != ecConfig.CHART_TYPE_LINE
                    && series[i].type != ecConfig.CHART_TYPE_BAR
                    && series[i].type != ecConfig.CHART_TYPE_SCATTER
                    && series[i].type != ecConfig.CHART_TYPE_K
                ) {
                    continue;
                }
                for (var j = 0, k = xAxisIndex.length; j < k; j++) {
                    if (xAxisIndex[j] == (series[i].xAxisIndex || 0)) {
                        zoomSeriesIndex.push(i);
                        break;
                    }
                }
                for (var j = 0, k = yAxisIndex.length; j < k; j++) {
                    if (yAxisIndex[j] == (series[i].yAxisIndex || 0)) {
                        zoomSeriesIndex.push(i);
                        break;
                    }
                }
                // 不指定接管坐标轴，则散点图被纳入接管范围
                if (series[i].type == ecConfig.CHART_TYPE_SCATTER
                    && typeof zoomOption.xAxisIndex == 'undefined'
                    && typeof zoomOption.yAxisIndex == 'undefined'
                ) {
                    zoomSeriesIndex.push(i);
                }
            }

            var start = typeof zoomOption.start != 'undefined'
                        && zoomOption.start >= 0
                        && zoomOption.start <= 100
                        ? zoomOption.start : 0;
            var end = typeof zoomOption.end != 'undefined'
                      && zoomOption.end >= 0
                      && zoomOption.end <= 100
                      ? zoomOption.end : 100;
            if (start > end) {
                // 大小颠倒自动翻转
                start = start + end;
                end = start - end;
                start = start - end;
            }
            var size = Math.round(
                           (end - start) / 100
                           * (zoomOption.orient == 'horizontal'
                             ? _location.width : _location.height)
                       );
            return {
                start : start,
                end : end,
                start2 : 0,
                end2 : 100,
                size : size,
                xAxisIndex : xAxisIndex,
                yAxisIndex : yAxisIndex,
                seriesIndex : zoomSeriesIndex
            };
        }

        function _backupData() {
            _originalData = {
                xAxis : {},
                yAxis : {},
                series : {}
            };
            var xAxis = option.xAxis;
            var xAxisIndex = _zoom.xAxisIndex;
            for (var i = 0, l = xAxisIndex.length; i < l; i++) {
                _originalData.xAxis[xAxisIndex[i]] = xAxis[xAxisIndex[i]].data;
            }

            var yAxis = option.yAxis;
            var yAxisIndex = _zoom.yAxisIndex;
            for (var i = 0, l = yAxisIndex.length; i < l; i++) {
                _originalData.yAxis[yAxisIndex[i]] = yAxis[yAxisIndex[i]].data;
            }

            var series = option.series;
            var seriesIndex = _zoom.seriesIndex;
            var serie;
            for (var i = 0, l = seriesIndex.length; i < l; i++) {
                serie = series[seriesIndex[i]];
                _originalData.series[seriesIndex[i]] = serie.data;
                if (serie.type == ecConfig.CHART_TYPE_SCATTER) {
                    _calculScatterMap(seriesIndex[i]);
                }
            }
        }
        
        function _calculScatterMap(seriesIndex) {
            _zoom.scatterMap = _zoom.scatterMap || {};
            _zoom.scatterMap[seriesIndex] = _zoom.scatterMap[seriesIndex] || {};
            var componentLibrary = require('../component');
            var zrUtil = require('zrender/tool/util');
            // x轴极值
            var Axis = componentLibrary.get('axis');
            var axisOption = zrUtil.clone(option.xAxis);
            if (axisOption instanceof Array) {
                axisOption[0].type = 'value';
                axisOption[1] && (axisOption[1].type = 'value');
            }
            else {
                axisOption.type = 'value';
            }
            var vAxis = new Axis(
                null,   // messageCenter
                false,  // zr
                {
                    xAxis: axisOption,
                    series : option.series
                }, 
                component,
                'xAxis'
            );
            var axisIndex = option.series[seriesIndex].xAxisIndex || 0;
            _zoom.scatterMap[seriesIndex].x = 
                vAxis.getAxis(axisIndex).getExtremum();
            vAxis.dispose();
            
            // y轴极值
            axisOption = zrUtil.clone(option.yAxis);
            if (axisOption instanceof Array) {
                axisOption[0].type = 'value';
                axisOption[1] && (axisOption[1].type = 'value');
            }
            else {
                axisOption.type = 'value';
            }
            vAxis = new Axis(
                null,   // messageCenter
                false,  // zr
                {
                    yAxis: axisOption,
                    series : option.series
                }, 
                component,
                'yAxis'
            );
            axisIndex = option.series[seriesIndex].yAxisIndex || 0;
            _zoom.scatterMap[seriesIndex].y = 
                vAxis.getAxis(axisIndex).getExtremum();
            vAxis.dispose();
            // console.log(_zoom.scatterMap);
        }

        function _buildBackground() {
            self.shapeList.push({
                shape : 'rectangle',
                zlevel : _zlevelBase,
                hoverable :false,
                style : {
                    x : _location.x,
                    y : _location.y,
                    width : _location.width,
                    height : _location.height,
                    color : zoomOption.backgroundColor
                }
            });
        }

        function _buildDataBackground() {
            self.shapeList.push({
                shape : 'rectangle',
                zlevel : _zlevelBase,
                hoverable :false,
                style : {
                    x : _location.x,
                    y : _location.y,
                    width : _location.width,
                    height : _location.height,
                    color : zoomOption.backgroundColor
                }
            });

            var maxLength = 0;
            var xAxis = option.xAxis;
            var xAxisIndex = _zoom.xAxisIndex;
            for (var i = 0, l = xAxisIndex.length; i < l; i++) {
                maxLength = Math.max(
                    maxLength, xAxis[xAxisIndex[i]].data.length
                );
            }
            var yAxis = option.yAxis;
            var yAxisIndex = _zoom.yAxisIndex;
            for (var i = 0, l = yAxisIndex.length; i < l; i++) {
                maxLength = Math.max(
                    maxLength, yAxis[yAxisIndex[i]].data.length
                );
            }

            var data = option.series[_zoom.seriesIndex[0]].data;
            var maxValue = Number.MIN_VALUE;
            var minValue = Number.MAX_VALUE;
            var value;
            for (var i = 0, l = data.length; i < l; i++) {
                value = typeof data[i] != 'undefined'
                        ? (typeof data[i].value != 'undefined'
                          ? data[i].value : data[i])
                        : 0;
                if (option.series[_zoom.seriesIndex[0]].type 
                    == ecConfig.CHART_TYPE_K
                ) {
                    value = value[1];   // 收盘价
                }
                if (isNaN(value)) {
                    value = 0;
                }
                maxValue = Math.max(maxValue, value);
                minValue = Math.min(minValue, value);
            }

            var pointList = [];
            var x = _location.width / maxLength;
            var y = _location.height / maxLength;
            for (var i = 0, l = maxLength; i < l; i++) {
                value = typeof data[i] != 'undefined'
                        ? (typeof data[i].value != 'undefined'
                          ? data[i].value : data[i])
                        : 0;
                if (option.series[_zoom.seriesIndex[0]].type 
                    == ecConfig.CHART_TYPE_K
                ) {
                    value = value[1];   // 收盘价
                }
                if (isNaN(value)) {
                    value = 0;
                }
                if (zoomOption.orient == 'horizontal') {
                    pointList.push([
                        _location.x + x * i,
                        _location.y + _location.height - 5 - Math.round(
                            (value - minValue)
                            / (maxValue - minValue)
                            * (_location.height - 10)
                        )
                    ]);
                }
                else {
                    pointList.push([
                        _location.x + 5 + Math.round(
                            (value - minValue)
                            / (maxValue - minValue)
                            * (_location.width - 10)
                        ),
                        _location.y + y * i
                    ]);
                }
            }
            if (zoomOption.orient == 'horizontal') {
                 pointList.push([
                    _location.x + _location.width,
                    _location.y + _location.height
                ]);
                pointList.push([
                    _location.x, _location.y + _location.height
                ]);
            }
            else {
                pointList.push([
                    _location.x, _location.y + _location.height
                ]);
                pointList.push([
                    _location.x, _location.y
                ]);
            }

            self.shapeList.push({
                shape : 'polygon',
                zlevel : _zlevelBase,
                style : {
                    pointList : pointList,
                    color : zoomOption.dataBackgroundColor
                },
                hoverable : false
            });
        }

        /**
         * 构建填充物
         */
        function _buildFiller() {
            _fillerShae = {
                shape : 'rectangle',
                zlevel : _zlevelBase,
                draggable : true,
                ondrift : _ondrift,
                ondragend : _ondragend,
                _type : 'filler'
            };

            if (zoomOption.orient == 'horizontal') {
                // 横向
                _fillerShae.style = {
                    x : _location.x
                        + Math.round(_zoom.start / 100 * _location.width)
                        + _handleSize,
                    y : _location.y + 3,
                    width : _zoom.size - _handleSize * 2,
                    height : _location.height - 6,
                    color : zoomOption.fillerColor,
                    text : ':::',
                    textPosition : 'inside'
                };
            }
            else {
                _fillerShae.style ={
                    x : _location.x + 3,
                    y : _location.y
                        + Math.round(_zoom.start / 100 * _location.height)
                        + _handleSize,
                    width :  _location.width - 6,
                    height : _zoom.size - _handleSize * 2,
                    color : zoomOption.fillerColor,
                    text : '=',
                    textPosition : 'inside'
                };
            }

            self.shapeList.push(_fillerShae);
        }

        /**
         * 构建拖拽手柄
         */
        function _bulidHandle() {
            _startShape = {
                shape : 'rectangle',
                zlevel : _zlevelBase
            };
            _endShape = {
                shape : 'rectangle',
                zlevel : _zlevelBase
            };

            _startShape.draggable = true;
            _startShape.ondrift = _ondrift;
            _startShape.ondragend = _ondragend;
            _endShape.draggable = true;
            _endShape.ondrift = _ondrift;
            _endShape.ondragend = _ondragend;

            if (zoomOption.orient == 'horizontal') {
                // 头
                _startShape.style = {
                    x : _fillerShae.style.x - _handleSize,
                    y : _location.y,
                    width : _handleSize,
                    height : _location.height,
                    color : zoomOption.handleColor,
                    text : '|',
                    textPosition : 'inside'
                };
                // 尾
                _endShape.style = {
                    x : _fillerShae.style.x + _fillerShae.style.width,
                    y : _location.y,
                    width : _handleSize,
                    height : _location.height,
                    color : zoomOption.handleColor,
                    text : '|',
                    textPosition : 'inside'
                };
            }
            else {
                // 头
                _startShape.style = {
                    x : _location.x,
                    y : _fillerShae.style.y - _handleSize,
                    width : _location.width,
                    height : _handleSize,
                    color : zoomOption.handleColor,
                    text : '—',
                    textPosition : 'inside'
                };
                // 尾
                _endShape.style = {
                    x : _location.x,
                    y : _fillerShae.style.y + _fillerShae.style.height,
                    width : _location.width,
                    height : _handleSize,
                    color : zoomOption.handleColor,
                    text : '—',
                    textPosition : 'inside'
                };
            }

            self.shapeList.push(_startShape);
            self.shapeList.push(_endShape);
        }

        /**
         * 拖拽范围控制
         */
        function _ondrift(e, dx, dy) {
            if (zoomOption.zoomLock) {
                // zoomLock时把handle转成filler的拖拽
                e = _fillerShae;
            }
            
            var detailSize = e._type == 'filler' ? _handleSize : 0;
            if (zoomOption.orient == 'horizontal') {
                if (e.style.x + dx - detailSize <= _location.x) {
                    e.style.x = _location.x + detailSize;
                }
                else if (e.style.x + dx + e.style.width + detailSize
                         >= _location.x + _location.width
                ) {
                    e.style.x = _location.x + _location.width
                                - e.style.width - detailSize;
                }
                else {
                    e.style.x += dx;
                }
            }
            else {
                if (e.style.y + dy - detailSize <= _location.y) {
                    e.style.y = _location.y + detailSize;
                }
                else if (e.style.y + dy + e.style.height + detailSize
                         >= _location.y + _location.height
                ) {
                    e.style.y = _location.y + _location.height
                                - e.style.height - detailSize;
                }
                else {
                    e.style.y += dy;
                }
            }

            if (e._type == 'filler') {
                _syncHandleShape();
            }
            else {
                _syncFillerShape();
            }

            if (zoomOption.realtime) {
                _syncData();
            }
            else {
                clearTimeout(_syncTicket);
                _syncTicket = setTimeout(_syncData, 200);
            }

            return true;
        }

        function _syncHandleShape() {
            if (zoomOption.orient == 'horizontal') {
                _startShape.style.x = _fillerShae.style.x - _handleSize;
                _endShape.style.x = _fillerShae.style.x
                                    + _fillerShae.style.width;
                _zoom.start = Math.floor(
                    (_startShape.style.x - _location.x)
                    / _location.width * 100
                );
                _zoom.end = Math.ceil(
                    (_endShape.style.x + _handleSize - _location.x)
                    / _location.width * 100
                );
            }
            else {
                _startShape.style.y = _fillerShae.style.y - _handleSize;
                _endShape.style.y = _fillerShae.style.y
                                    + _fillerShae.style.height;
                _zoom.start = Math.floor(
                    (_startShape.style.y - _location.y)
                    / _location.height * 100
                );
                _zoom.end = Math.ceil(
                    (_endShape.style.y + _handleSize - _location.y)
                    / _location.height * 100
                );
            }

            zr.modShape(_startShape.id, _startShape);
            zr.modShape(_endShape.id, _endShape);
            zr.refresh();
        }

        function _syncFillerShape() {
            var a;
            var b;
            if (zoomOption.orient == 'horizontal') {
                a = _startShape.style.x;
                b = _endShape.style.x;
                _fillerShae.style.x = Math.min(a, b) + _handleSize;
                _fillerShae.style.width = Math.abs(a - b) - _handleSize;
                _zoom.start = Math.floor(
                    (Math.min(a, b) - _location.x)
                    / _location.width * 100
                );
                _zoom.end = Math.ceil(
                    (Math.max(a, b) + _handleSize - _location.x)
                    / _location.width * 100
                );
            }
            else {
                a = _startShape.style.y;
                b = _endShape.style.y;
                _fillerShae.style.y = Math.min(a, b) + _handleSize;
                _fillerShae.style.height = Math.abs(a - b) - _handleSize;
                _zoom.start = Math.floor(
                    (Math.min(a, b) - _location.y)
                    / _location.height * 100
                );
                _zoom.end = Math.ceil(
                    (Math.max(a, b) + _handleSize - _location.y)
                    / _location.height * 100
                );
            }

            zr.modShape(_fillerShae.id, _fillerShae);
            zr.refresh();
        }
        
        function _syncShape() {
            if (!zoomOption.show) {
                // 没有伸缩控件
                return;
            }
            if (zoomOption.orient == 'horizontal') {
                _startShape.style.x = _location.x 
                                      + _zoom.start / 100 * _location.width;
                _endShape.style.x = _location.x 
                                    + _zoom.end / 100 * _location.width
                                    - _handleSize;
                    
                _fillerShae.style.x = _startShape.style.x + _handleSize;
                _fillerShae.style.width = _endShape.style.x 
                                          - _startShape.style.x
                                          - _handleSize;
            }
            else {
                _startShape.style.y = _location.y 
                                      + _zoom.start / 100 * _location.height;
                _endShape.style.y = _location.y 
                                    + _zoom.end / 100 * _location.height
                                    - _handleSize;
                    
                _fillerShae.style.y = _startShape.style.y + _handleSize;
                _fillerShae.style.height = _endShape.style.y 
                                          - _startShape.style.y
                                          - _handleSize;
            }
            
            zr.modShape(_startShape.id, _startShape);
            zr.modShape(_endShape.id, _endShape);
            zr.modShape(_fillerShae.id, _fillerShae);
            zr.refresh();
        }

        function  _syncData(dispatchNow) {
            var target;
            var start;
            var end;
            var length;
            var data;
            for (var key in _originalData) {
                target = _originalData[key];
                for (var idx in target) {
                    data = target[idx];
                    length = data.length;
                    start = Math.floor(_zoom.start / 100 * length);
                    end = Math.ceil(_zoom.end / 100 * length);
                    if (option[key][idx].type != ecConfig.CHART_TYPE_SCATTER) {
                        option[key][idx].data = data.slice(start, end);
                    }
                    else {
                        // 散点图特殊处理
                        option[key][idx].data = _synScatterData(idx, data);
                    }
                }
            }

            if (!_isSilence && (zoomOption.realtime || dispatchNow)) {
                messageCenter.dispatch(
                    ecConfig.EVENT.DATA_ZOOM,
                    null,
                    {zoom: _zoom}
                );
            }

            zoomOption.start = _zoom.start;
            zoomOption.end = _zoom.end;
        }
        
        function _synScatterData(seriesIndex, data) {
            var newData = [];
            var scale = _zoom.scatterMap[seriesIndex];
            var total;
            var xStart;
            var xEnd;
            var yStart;
            var yEnd;
            
            if (zoomOption.orient == 'horizontal') {
                total = scale.x.max - scale.x.min;
                xStart = _zoom.start / 100 * total + scale.x.min;
                xEnd = _zoom.end / 100 * total + scale.x.min;
                
                total = scale.y.max - scale.y.min;
                yStart = _zoom.start2 / 100 * total + scale.y.min;
                yEnd = _zoom.end2 / 100 * total + scale.y.min;
            }
            else {
                total = scale.x.max - scale.x.min;
                xStart = _zoom.start2 / 100 * total + scale.x.min;
                xEnd = _zoom.end2 / 100 * total + scale.x.min;
                
                total = scale.y.max - scale.y.min;
                yStart = _zoom.start / 100 * total + scale.y.min;
                yEnd = _zoom.end / 100 * total + scale.y.min;
            }
            
            // console.log(xStart,xEnd,yStart,yEnd);
            var value;
            for (var i = 0, l = data.length; i < l; i++) {
                value = data[i].value || data[i];
                if (value[0] >= xStart 
                    && value[0] <= xEnd
                    && value[1] >= yStart
                    && value[1] <= yEnd
                ) {
                    newData.push(data[i]);
                }
            }
            
            return newData;
        }

        function _ondragend() {
            self.isDragend = true;
        }

        /**
         * 数据项被拖拽出去
         */
        function ondragend(param, status) {
            if (!self.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

             _syncData();

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.dragIn = true;
            if (!_isSilence && !zoomOption.realtime) {
                messageCenter.dispatch(
                    ecConfig.EVENT.DATA_ZOOM,
                    null,
                    {zoom: _zoom}
                );
            }
            status.needRefresh = false; // 会有消息触发fresh，不用再刷一遍
            // 处理完拖拽事件后复位
            self.isDragend = false;

            return;
        }

        function ondataZoom(param, status) {
            status.needRefresh = true;
            return;
        }
        
        function absoluteZoom(param) {
            zoomOption.start = _zoom.start = param.start;
            zoomOption.end = _zoom.end = param.end;
            zoomOption.start2 = _zoom.start2 = param.start2;
            zoomOption.end2 = _zoom.end2 = param.end2;
            //console.log(rect,gridArea,_zoom,total)
            _syncShape();
            _syncData(true);
            return;
        }
        
        function rectZoom(param) {
            if (!param) {
                // 重置拖拽
                zoomOption.start = 
                zoomOption.start2 = 
                _zoom.start = 
                _zoom.start2 = 0;
                    
                zoomOption.end =
                zoomOption.end2 = 
                _zoom.end = 
                _zoom.end2 = 100;
                
                _syncShape();
                _syncData(true);
                return _zoom;
            }
            var gridArea = component.grid.getArea();
            var rect = {
                x : param.x,
                y : param.y,
                width : param.width,
                height : param.height
            };
            // 修正方向框选
            if (rect.width < 0) {
                rect.x += rect.width;
                rect.width = -rect.width;
            }
            if (rect.height < 0) {
                rect.y += rect.height;
                rect.height = -rect.height;
            }
            // console.log(rect,_zoom);
            
            // 剔除无效缩放
            if (rect.x > gridArea.x + gridArea.width
                || rect.y > gridArea.y + gridArea.height
            ) {
                return false; // 无效缩放
            }
            
            // 修正框选超出
            if (rect.x < gridArea.x) {
                rect.x = gridArea.x;
            }
            if (rect.x + rect.width > gridArea.x + gridArea.width) {
                rect.width = gridArea.x + gridArea.width - rect.x;
            }
            if (rect.y + rect.height > gridArea.y + gridArea.height) {
                rect.height = gridArea.y + gridArea.height - rect.y;
            }
            
            var total;
            var sdx = (rect.x - gridArea.x) / gridArea.width;
            var edx = 1 - (rect.x + rect.width - gridArea.x) / gridArea.width;
            var sdy = 1 - (rect.y + rect.height - gridArea.y) / gridArea.height;
            var edy = (rect.y - gridArea.y) / gridArea.height;
            //console.log('this',sdy,edy,_zoom.start,_zoom.end)
            if (zoomOption.orient == 'horizontal') {
                total = _zoom.end - _zoom.start;
                _zoom.start += total * sdx;
                _zoom.end -= total * edx;
                
                total = _zoom.end2 - _zoom.start2;
                _zoom.start2 += total * sdy;
                _zoom.end2 -= total * edy;
            }
            else {
                total = _zoom.end - _zoom.start;
                _zoom.start += total * sdy;
                _zoom.end -= total * edy;
                
                total = _zoom.end2 - _zoom.start2;
                _zoom.start2 += total * sdx;
                _zoom.end2 -= total * edx;
            }
            //console.log(_zoom.start,_zoom.end,_zoom.start2,_zoom.end2)
            zoomOption.start = _zoom.start;
            zoomOption.end = _zoom.end;
            zoomOption.start2 = _zoom.start2;
            zoomOption.end2 = _zoom.end2;
            //console.log(rect,gridArea,_zoom,total)
            _syncShape();
            _syncData(true);
            return _zoom;
        }
        
        function syncBackupData(curOption, optionBackup) {
            var start;
            var target = _originalData['series'];
            var curSeries = curOption.series;
            var curData;
            for (var i = 0, l = curSeries.length; i < l; i++) {
                curData = curSeries[i].data;
                if (target[i]) {
                    // dataZoom接管的
                    start = Math.floor(_zoom.start / 100 * target[i].length);
                }
                else {
                    // 非dataZoom接管
                    start = 0;
                }
                for (var j = 0, k = curData.length; j < k; j++) {
                    optionBackup.series[i].data[j + start] = curData[j];
                    if (target[i]) {
                        // 同步内部备份
                        target[i][j + start] 
                            = curData[j];
                    }
                }
            }
        }
        
        function silence(s) {
            _isSilence = s;
        }
        
        function getRealDataIndex(sIdx, dIdx) {
            if (!_originalData) {
                return dIdx;
            }
            var sreies = _originalData.series;
            if (sreies[sIdx]) {
                return Math.floor(_zoom.start / 100 * sreies[sIdx].length) 
                       + dIdx;
            }
            return -1;
        }

        function init(newOption) {
            option = newOption;

            option.dataZoom = self.reformOption(option.dataZoom);

            zoomOption = option.dataZoom;

            self.clear();
            
            // 自己show 或者 toolbox启用且dataZoom有效
            if (option.dataZoom.show
                || (
                    self.query(option, 'toolbox.show')
                    && self.query(option, 'toolbox.feature.dataZoom')
                )
            ) {
                _location = _getLocation();
                _zoom =  _getZoom();
                _backupData();
            }
            
            if (option.dataZoom.show) {
                _buildShape();
            }
        }

        /**
         * 避免dataZoom带来两次refresh，不设refresh接口，resize重复一下buildshape逻辑 
         */
        function resize() {
            self.clear();
            
            // 自己show 或者 toolbox启用且dataZoom有效
            if (option.dataZoom.show
                || (
                    self.query(option, 'toolbox.show')
                    && self.query(option, 'toolbox.feature.dataZoom')
                )
            ) {
                _location = _getLocation();
                _zoom =  _getZoom();
            }
            
            if (option.dataZoom.show) {
                _buildBackground();
                _buildDataBackground();
                _buildFiller();
                _bulidHandle();
    
                for (var i = 0, l = self.shapeList.length; i < l; i++) {
                    self.shapeList[i].id = zr.newShapeId(self.type);
                    zr.addShape(self.shapeList[i]);
                }
            }
        }
        
        self.init = init;
        self.resize = resize;
        self.syncBackupData = syncBackupData;
        self.absoluteZoom = absoluteZoom;
        self.rectZoom = rectZoom;
        self.ondragend = ondragend;
        self.ondataZoom = ondataZoom;
        self.silence = silence;
        self.getRealDataIndex = getRealDataIndex;

        init(option);
    }

    require('../component').define('dataZoom', DataZoom);
    
    return DataZoom;
});