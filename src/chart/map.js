/**
 * echarts图表类：地图
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function(require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Map(messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrMath = require('zrender/tool/math');
        var zrUtil = require('zrender/tool/util');

        var self = this;
        self.type = ecConfig.CHART_TYPE_MAP;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();
        var _mapSeries;
        var _scale;
        var _selectedMode;
        var _selected = {};

        function _buildShape() {
            self.selectedMap = {};
            
            var legend = component.legend;
            var seriesName;
            var valueData = {};
            var mapType;
            var data;
            var name;
            _mapSeries = {};
            _selectedMode = false;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_MAP) {
                    series[i] = self.reformOption(series[i]);
                    _mapSeries[i] = true;
                    
                    _selectedMode = _selectedMode || series[i].selectedMode;
                    mapType = series[i].mapType;
                    
                    seriesName = series[i].name;
                    self.selectedMap[seriesName] = legend
                            ? legend.isSelected(seriesName)
                            : true;
                    if (self.selectedMap[seriesName]) {
                        data = series[i].data;
                        for (var j = 0, k = data.length; j < k; j++) {
                            name = data[j].name;
                            valueData[name] = valueData[name] 
                                || {
                                    value: 0,
                                    seriesIndex : []
                                };
                            for (var key in data[j]) {
                                if (key != 'value') {
                                    valueData[name][key] = data[j][key];
                                }
                                else {
                                    if (!isNaN(data[j].value)) {
                                        valueData[name].value += data[j].value;
                                    }
                                }
                            }
                            //索引有该区域的系列样式
                            valueData[name].seriesIndex.push(i);
                        }
                    }
                }
            }
            
            switch (mapType) {
                case 'china':
                    _buildMap(_getMapDataOfChina(), valueData);
                    break;
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }
        
        function _getMapDataOfChina() {
            var province = require('../util/mapData/china');
            _scale = _getScale(province.width, province.height);
            return province.data;
        }
        
        function _getScale(mapWidth, mapHeight) {
            var scale = [1, 1];
            for (var key in _mapSeries) {
                if (typeof series[key].height == 'undefined'
                    && typeof series[key].width != 'undefined'
                ) {
                    scale = [
                        series[key].width / mapWidth,
                        series[key].width / mapWidth
                    ];
                }
                else if (typeof series[key].height != 'undefined'
                    && typeof series[key].width == 'undefined'
                ) {
                    scale = [
                        series[key].height / mapHeight,
                        series[key].height / mapHeight
                    ];
                } 
                else if (
                    typeof series[key].height != 'undefined'
                    && typeof series[key].width != 'undefined'
                ) {
                    scale = [
                        series[key].width / mapWidth,
                        series[key].height / mapHeight
                    ];
                }
            }
            return scale
        }
        
        function _buildMap(mapData, valueData) {
            var legend = component.legend;
            var dataRange = component.dataRange;
            var seriesName;
            var name;
            var data;
            var value;
            var queryTarget;
            var defaultOption = ecConfig.map;
            
            var color;
            var font;
            var style;
            var highlightStyle;
            
            var shape;
            for (var i = 0, l = mapData.length; i < l; i++) {
                style = zrUtil.clone(mapData[i]);
                highlightStyle = zrUtil.clone(style);
                name = style.text;
                data = valueData[name];
                if (data) {
                    queryTarget = [data];
                    seriesName = '';
                    for (var j = 0, k = data.seriesIndex.length; j < k; j++) {
                        queryTarget.push(series[data.seriesIndex[j]]);
                        seriesName += series[data.seriesIndex[j]].name + ' ';
                        if (legend 
                            && legend.hasColor(series[data.seriesIndex[j]].name)
                        ) {
                            self.shapeList.push({
                                shape : 'circle',
                                zlevel : _zlevelBase + 1,
                                scale: _scale,
                                style : {
                                    x : style.textX + 3 + j * 7,
                                    y : style.textY - 10,
                                    r : 3,
                                    color : legend.getColor(
                                        series[data.seriesIndex[j]].name
                                    )
                                },
                                hoverable : false
                            });
                        }
                    }
                    queryTarget.push(defaultOption);
                    value = data.value;
                }
                else {
                    seriesName = '';
                    queryTarget = [];
                    for (var key in _mapSeries) {
                        queryTarget.push(series[key]);
                    }
                    queryTarget.push(defaultOption);
                    value = '-';
                }
                
                style.brushType = 'both';
                color = dataRange && !isNaN(value)
                        ? dataRange.getColor(value)
                        : null;
                style.color = color
                    ? color
                    : self.deepQuery(
                        queryTarget,
                        'itemStyle.normal.areaStyle.color'
                    );
                style.strokeColor = self.deepQuery(
                    queryTarget,
                    'itemStyle.normal.lineStyle.color'
                );
                style.lineWidth = self.deepQuery(
                    queryTarget,
                    'itemStyle.normal.lineStyle.width'
                );
                if (self.deepQuery(
                    queryTarget,
                    'itemStyle.normal.label.show'
                )) {
                    style.text = name;
                    style.textColor = self.deepQuery(
                        queryTarget,
                        'itemStyle.normal.label.textStyle.color'
                    );
                    font = self.deepQuery(
                        queryTarget,
                        'itemStyle.normal.label.textStyle'
                    );
                    style.textFont = self.getFont(font);
                    style.textPosition = 'specific';
                }
                else {
                    style.text = null;
                }
                
                highlightStyle.brushType = 'both';
                highlightStyle.color = self.deepQuery(
                    queryTarget,
                    'itemStyle.emphasis.areaStyle.color'
                ) || style.color;
                highlightStyle.strokeColor = self.deepQuery(
                    queryTarget,
                    'itemStyle.emphasis.lineStyle.color'
                ) || style.strokeColor;
                highlightStyle.lineWidth = self.deepQuery(
                    queryTarget,
                    'itemStyle.emphasis.lineStyle.width'
                ) || style.lineWidth;
                
                if (self.deepQuery(
                    queryTarget,
                    'itemStyle.emphasis.label.show'
                )) {
                    highlightStyle.text = name;
                    highlightStyle.textColor = self.deepQuery(
                        queryTarget,
                        'itemStyle.emphasis.label.textStyle.color'
                    ) || style.textColor;
                    font = self.deepQuery(
                        queryTarget,
                        'itemStyle.emphasis.label.textStyle'
                    ) || font;
                    highlightStyle.textFont = self.getFont(font);
                    highlightStyle.textPosition = 'specific';
                }
                else {
                    highlightStyle.text = null;
                }
                
                if ((style.text || highlightStyle.text) && style.tooSmall) {
                    var textShape = {
                        shape : 'text',
                        zlevel : _zlevelBase,
                        scale: _scale,
                        style : {
                            x : style.textX,
                            y : style.textY,
                            text : style.text || highlightStyle.text,
                            color : style.text
                                    ? style.textColor
                                    : 'rgba(0,0,0,0)',
                            textFont : style.textFont,
                            textPosition : style.textPosition
                        },
                        highlightStyle : {
                            brushType: 'both',
                            x : style.textX,
                            y : style.textY,
                            text : highlightStyle.text || style.text,
                            color : highlightStyle.textColor,
                            strokeColor: highlightStyle.color,
                            textFont : highlightStyle.textFont,
                            textPosition : highlightStyle.textPosition
                        }
                    };
                    textShape._style = textShape.style;
                    if (_selectedMode &&
                        _selected[name]
                        || (data && data.selected && _selected[name] !== false)
                    ) {
                        textShape.style = zrUtil.clone(
                            textShape.highlightStyle
                        );
                    }
                    if (_selectedMode) {
                        textShape.clickable = true;
                        textShape.onclick = self.shapeHandler.onclick;
                    }
                
                    ecData.pack(
                        textShape,
                        {
                            name: seriesName,
                            tooltip: self.deepQuery(queryTarget, 'tooltip')
                        },
                        0,
                        data, 0,
                        name
                    );
                    self.shapeList.push(textShape);
                    style.text = null;
                    highlightStyle.text = null;
                }
                
                shape = {
                    shape : 'path',
                    zlevel : _zlevelBase,
                    scale: _scale,
                    style : style,
                    highlightStyle : highlightStyle,
                    _style: style
                };
                if (_selectedMode &&
                     _selected[name]
                     || (data && data.selected && _selected[name] !== false) 
                ) {
                    shape.style = zrUtil.clone(shape.highlightStyle);
                }
                
                if (_selectedMode) {
                    _selected[name] = typeof _selected[name] != 'undefined'
                                      ? _selected[name]
                                      : (data && data.selected);
                    shape.clickable = true;
                    shape.onclick = self.shapeHandler.onclick;
                }
                // console.log(name,shape);
                
                ecData.pack(
                    shape,
                    {
                        name: seriesName,
                        tooltip: self.deepQuery(queryTarget, 'tooltip')
                    },
                    0,
                    data, 0,
                    name
                );
                self.shapeList.push(shape);
            }
            //console.log(_selected);
        }
        
        function onclick(param) {
            if (!self.isClick || !param.target) {
                // 没有在当前实例上发生点击直接返回
                return;
            }

            var target = param.target;
            var name = target.style.text;
            var len = self.shapeList.length;
            if (_selectedMode == 'single') {
                for (var p in _selected) {
                    if (_selected[p]) {
                        //找到那个shape
                        for (var i = 0; i < len; i++) {
                            if (self.shapeList[i].style.text == p) {
                                self.shapeList[i].style = 
                                    self.shapeList[i]._style;
                                zr.modShape(
                                    self.shapeList[i].id, self.shapeList[i]
                                );
                            }
                        }
                        p != name && (_selected[p] = false);
                    }
                }
            }

            _selected[name] = !_selected[name];
            
            if (_selected[name]) {
                target.style = zrUtil.clone(target.highlightStyle);
            }
            else {
                target.style = target._style;
            }
            zr.modShape(target.id, target);
            
            messageCenter.dispatch(
                ecConfig.EVENT.MAP_SELECTED,
                param.event,
                {selected : _selected}
            );
            
            zr.refresh();
        }

        
        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
         * @param {Object} newSeries
         * @param {Object} newComponent
         */
        function init(newOption, newComponent) {
            option = newOption;
            component = newComponent;

            series = option.series;
            
            _selected = {};

            self.clear();
            _buildShape();
        }

        /**
         * 刷新
         */
        function refresh() {
            self.clear();
            _buildShape();
        }
        
        function ondataRange(param, status) {
            if (component.dataRange) {
                refresh();
                status.needRefresh = true;
            }
            return;
        }

        self.init = init;
        self.refresh = refresh;
        self.ondataRange = ondataRange;
        self.onclick = onclick;
        
        init(option, component);
    }

    return Map;
});