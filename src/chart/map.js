/**
 * echarts图表类：地图
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

        var zrUtil = require('zrender/tool/util');

        var self = this;
        self.type = ecConfig.CHART_TYPE_MAP;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();
        var _selectedMode;      // 选择模式
        var _selected = {};     // 地图选择状态
        var _mapTypeMap = {};   // 图例类型索引

        var _mapParams = require('../util/mapData/params');
        var _textFixed = require('../util/mapData/textFixed');

        function _buildShape() {
            self.selectedMap = {};
            
            var legend = component.legend;
            var seriesName;
            var valueData = {};
            var mapType;
            var data;
            var name;
            var mapSeries = {};
            _selectedMode = {};
            var valueCalculation = {};
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_MAP) { // map
                    series[i] = self.reformOption(series[i]);
                    mapType = series[i].mapType;
                    mapSeries[mapType] = mapSeries[mapType] || {};
                    mapSeries[mapType][i] = true;
                    
                    _selectedMode[mapType] = _selectedMode[mapType] 
                                             || series[i].selectedMode;
                                             
                    valueCalculation[mapType] = valueCalculation[mapType] 
                                               || series[i].mapValueCalculation;
                    
                    seriesName = series[i].name;
                    self.selectedMap[seriesName] = legend
                        ? legend.isSelected(seriesName)
                        : true;
                    if (self.selectedMap[seriesName]) {
                        valueData[mapType] = valueData[mapType] || {};
                        data = series[i].data;
                        for (var j = 0, k = data.length; j < k; j++) {
                            name = data[j].name;
                            valueData[mapType][name] = valueData[mapType][name] 
                                                       || {seriesIndex : []};
                            for (var key in data[j]) {
                                if (key != 'value') {
                                    valueData[mapType][name][key] = 
                                        data[j][key];
                                }
                                else if (!isNaN(data[j].value)) {
                                    typeof valueData[mapType][name].value
                                        == 'undefined'
                                    && (valueData[mapType][name].value = 0);
                                    
                                    valueData[mapType][name].value += 
                                        data[j].value;
                                }
                            }
                            //索引有该区域的系列样式
                            valueData[mapType][name].seriesIndex.push(i);
                        }
                    }
                }
            }
            
            for (var mt in valueData) {
                if (valueCalculation[mt] && valueCalculation[mt] == 'average') {
                    for (var k in valueData[mt]) {
                        valueData[mt][k].value = 
                            valueData[mt][k].value 
                            / valueData[mt][k].seriesIndex.length;
                            
                        if (valueData[mt][k].value > 10) {
                            valueData[mt][k].value = Math.round(
                                valueData[mt][k].value
                            );
                        }
                        else {
                            valueData[mt][k].value = 
                                valueData[mt][k].value.toFixed(2) - 0;
                        }
                    }
                }
                if (_mapParams[mt].getData) {
                    _buildMap(
                        mt,                             // 类型
                        _getProjectionData(             // 地图数据
                            mt,
                            _mapParams[mt].getData(),
                            mapSeries[mt]
                        ),  
                        valueData[mt],                  // 用户数据
                        mapSeries[mt]                   // 系列
                    );
                }
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }
        
        /**
         * 按需加载相关地图 
         */
        function _getProjectionData(mapType, mapData, mapSeries) {
            var ori = mapData.features;
            var province = [];
            var single;
            var textPosition;
            var fix;
            
            //600, 500, 750, mapSeries
            var transform = _getTransform(
                _mapParams[mapType].box[2], _mapParams[mapType].box[3], 3500,
                mapSeries
            );
            var projection = _albers().origin(_mapParams[mapType].loc)
                                      .scale(transform.scale)
                                      .translate(transform.translate);
            var getAreaPath = _path().projection(projection);
            for (var i = 0, l = ori.length; i < l; i++) {
                textPosition = projection(ori[i].properties.cp);
                fix = _textFixed[ori[i].properties.name]; 
                if (typeof fix != 'undefined') {
                    textPosition[0] += fix[0] * transform.scale / fix[2];
                    textPosition[1] += fix[1] * transform.scale / fix[2];
                }
                single = {
                    text : ori[i].properties.name,
                    path : getAreaPath(ori[i]),
                    textX : textPosition[0],
                    textY : textPosition[1]
                };
                province.push(single);
            }
            //console.log(province)
            return province;
        }

        /**
         * 获取缩放 
         */
        function _getTransform(mapWidth, mapHeight, mapScale, mapSeries) {
            var mapLocation;
            var x;
            var cusX;
            var y;
            var cusY;
            var width;
            var height;
            var zrWidth = zr.getWidth();
            var zrHeight = zr.getHeight();
            for (var key in mapSeries) {
                mapLocation = series[key].mapLocation;
                cusX = mapLocation.x || cusX;
                cusY = mapLocation.y || cusY;
                width = mapLocation.width || width;
                height = mapLocation.height || height;
            }
            
            x = isNaN(cusX) ? 0 : cusX;
            y = isNaN(cusY) ? 0 : cusY;
            
            if (typeof width == 'undefined') {
                width = zrWidth;
                if (x + width > zrWidth) {
                    width = zrWidth - x;
                }
            }
            
            if (typeof height == 'undefined') {
                height = zrHeight;
                if (y + height > zrHeight) {
                    height = zrHeight - y;
                }
            }

            // console.log(width,height,x,y)
            var minScale = Math.min(
                width / mapWidth,
                height / mapHeight
            );

            width = mapWidth * minScale;
            height = mapHeight * minScale;
            if (isNaN(cusX)) {
                switch (cusX + '') {
                    case 'center' :
                        x = Math.floor((zrWidth - width) / 2);
                        break;
                    case 'right' :
                        x = zrWidth - width;
                        break;
                    //case 'left' :
                    default:
                        x = 0;
                        break;
                }
            }
            if (isNaN(cusY)) {
                switch (cusY + '') {
                    case 'center' :
                        y = Math.floor((zrHeight - height) / 2);
                        break;
                    case 'bottom' :
                        y = zrHeight - height;
                        break;
                    //case 'top' :
                    default:
                        y = 0;
                        break;
                }
            }
            return {
                scale : minScale * mapScale,
                translate : [x + width / 2, y + height / 2]
            };
        }
        

        // Derived from Tom Carden's Albers implementation for Protovis.
        // http://gist.github.com/476238
        // http://mathworld.wolfram.com/AlbersEqual-AreaConicProjection.html
        function _albers() {
            var radians = Math.PI / 180;
            var origin = [0, 0];            //[-98, 38],
            var parallels = [29.5, 45.5];
            var scale = 1000;
            var translate = [0, 0];         //[480, 250],
            var lng0;                       // radians * origin[0]
            var n;
            var C;
            var p0;
            
            function albers(coordinates) {
                var t = n * (radians * coordinates[0] - lng0);
                var p = Math.sqrt(
                            C - 2 * n * Math.sin(radians * coordinates[1])
                        ) / n;
                return [
                    scale * p * Math.sin(t) + translate[0],
                    scale * (p * Math.cos(t) - p0) + translate[1]
                ];
            }

            albers.invert = function(coordinates) {
                var x = (coordinates[0] - translate[0]) / scale;
                var y = (coordinates[1] - translate[1]) / scale;
                var p0y = p0 + y;
                var t = Math.atan2(x, p0y);
                var p = Math.sqrt(x * x + p0y * p0y);
                return [
                    (lng0 + t / n) / radians,
                    Math.asin((C - p * p * n * n) / (2 * n)) / radians
                ];
            };

            function reload() {
                var phi1 = radians * parallels[0];
                var phi2 = radians * parallels[1];
                var lat0 = radians * origin[1];
                var s = Math.sin(phi1);
                var c = Math.cos(phi1);
                lng0 = radians * origin[0];
                n = 0.5 * (s + Math.sin(phi2));
                C = c * c + 2 * n * s;
                p0 = Math.sqrt(C - 2 * n * Math.sin(lat0)) / n;
                return albers;
            }

            albers.origin = function(x) {
                if (!arguments.length) {
                    return origin;
                }
                origin = [+x[0], +x[1]];
                return reload();
            };

            albers.parallels = function(x) {
                if (!arguments.length) {
                    return parallels;
                }
                parallels = [+x[0], +x[1]];
                return reload();
            };

            albers.scale = function(x) {
                if (!arguments.length) {
                    return scale;
                }
                scale = +x;
                return albers;
            };

            albers.translate = function(x) {
                if (!arguments.length) {
                    return translate;
                }
                translate = [+x[0], +x[1]];
                return albers;
            };

            return reload();
        }
        
        function _path(){
            var pointRadius = 4.5;
            var pointCircle = _pathCircle(pointRadius);
            var projection;

            function _pathCircle(radius) {
                return 'm0,' + radius 
                   + 'a' + radius + ',' + radius + ' 0 1,1 0,' + (-2 * radius) 
                   + 'a' + radius + ',' + radius + ' 0 1,1 0,' + (+2 * radius) 
                   + 'z';
            }

            function _geoType(types, defaultValue) {
                return function(object) {
                    return object && object.type in types 
                           ? types[object.type](object) 
                           : defaultValue;
                };
            }

            function path(d /*, i*/) {
                if ( typeof pointRadius === 'function') {
                    pointCircle = _pathCircle(
                        pointRadius.apply(this, arguments)
                    );
                }
                return pathType(d) || null;
            }
            
            function project(coordinates) {
                return projection(coordinates).join(',');
            }

            var pathType = _geoType({
                FeatureCollection : function(o) {
                    var path = [];
                    var features = o.features;
                    var i = -1; // features.index
                    var n = features.length;
                    while (++i < n) {
                        path.push(pathType(features[i].geometry));
                    }
                    return path.join('');
                },

                Feature : function(o) {
                    return pathType(o.geometry);
                },

                Point : function(o) {
                    return 'M' + project(o.coordinates) + pointCircle;
                },

                MultiPoint : function(o) {
                    var path = [];
                    var coordinates = o.coordinates;
                    var i = -1; // coordinates.index
                    var n = coordinates.length;
                    while (++i < n) {
                        path.push('M', project(coordinates[i]), pointCircle);
                    }
                    return path.join('');
                },

                LineString : function(o) {
                    var path = ['M'];
                    var coordinates = o.coordinates;
                    var i = -1; // coordinates.index
                    var n = coordinates.length;
                    while (++i < n) {
                        path.push(project(coordinates[i]), 'L');
                    }
                    path.pop();
                    return path.join('');
                },

                MultiLineString : function(o) {
                    var path = [];
                    var coordinates = o.coordinates;
                    var i = -1; // coordinates.index
                    var n = coordinates.length;
                    var subcoordinates; // coordinates[i]
                    var j; // subcoordinates.index
                    var m; // subcoordinates.length
                    while (++i < n) {
                        subcoordinates = coordinates[i];
                        j = -1;
                        m = subcoordinates.length;
                        path.push('M');
                        while (++j < m) {
                            path.push(project(subcoordinates[j]), 'L');
                        }
                        path.pop();
                    }
                    return path.join('');
                },

                Polygon : function(o) {
                    var path = [];
                    var coordinates = o.coordinates;
                    var i = -1; // coordinates.index
                    var n = coordinates.length;
                    var subcoordinates; // coordinates[i]
                    var j;  // subcoordinates.index
                    var m;  // subcoordinates.length
                    while (++i < n) {
                        subcoordinates = coordinates[i];
                        j = -1;
                        if (( m = subcoordinates.length - 1) > 0) {
                            path.push('M');
                            while (++j < m) {
                                path.push(project(subcoordinates[j]), 'L');
                            }
                            path[path.length - 1] = 'Z';
                        }
                    }
                    return path.join('');
                },

                MultiPolygon : function(o) {
                    var path = [];
                    var coordinates = o.coordinates;
                    var i = -1; // coordinates index
                    var n = coordinates.length;
                    var subcoordinates; // coordinates[i]
                    var j; // subcoordinates index
                    var m; // subcoordinates.length
                    var subsubcoordinates; // subcoordinates[j]
                    var k; // subsubcoordinates index
                    var p; // subsubcoordinates.length
                    while (++i < n) {
                        subcoordinates = coordinates[i];
                        j = -1;
                        m = subcoordinates.length;
                        while (++j < m) {
                            subsubcoordinates = subcoordinates[j];
                            k = -1;
                            if (( p = subsubcoordinates.length - 1) > 0) {
                                path.push('M');
                                while (++k < p) {
                                    path.push(
                                        project(subsubcoordinates[k]), 'L'
                                    );
                                }
                                path[path.length - 1] = 'Z';
                            }
                        }
                    }
                    return path.join('');
                },

                GeometryCollection : function(o) {
                    var path = [];
                    var geometries = o.geometries;
                    var i = -1; // geometries index
                    var n = geometries.length;
                    while (++i < n) {
                        path.push(pathType(geometries[i]));
                    }
                    return path.join('');
                }
            });

            path.projection = function(x) {
                projection = x;
                return path;
            };

            path.pointRadius = function(x) {
                if ( typeof x === 'function') {
                    pointRadius = x;
                }
                else {
                    pointRadius = +x;
                    pointCircle = _pathCircle(pointRadius);
                }
                return path;

            };

            return path;

        }
        
        /**
         * 构建地图
         * @param {Object} mapData 图形数据
         * @param {Object} valueData 用户数据
         */
        function _buildMap(mapType, mapData, valueData, mapSeries) {
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
            var tooSmall;
            for (var i = 0, l = mapData.length; i < l; i++) {
                style = zrUtil.clone(mapData[i]);
                highlightStyle = zrUtil.clone(style);
                name = style.text;
                data = valueData[name]; // 多系列合并后的数据
                if (data) {
                    queryTarget = [data]; // level 3
                    seriesName = '';
                    for (var j = 0, k = data.seriesIndex.length; j < k; j++) {
                        // level 2
                        queryTarget.push(series[data.seriesIndex[j]]);
                        seriesName += series[data.seriesIndex[j]].name + ' ';
                        if (legend 
                            && legend.hasColor(series[data.seriesIndex[j]].name)
                        ) {
                            self.shapeList.push({
                                shape : 'circle',
                                zlevel : _zlevelBase + 1,
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
                    queryTarget.push(defaultOption); // level 1
                    value = data.value;
                }
                else {
                    data = '-';
                    seriesName = '';
                    queryTarget = [];
                    for (var key in mapSeries) {
                        queryTarget.push(series[key]);
                    }
                    queryTarget.push(defaultOption);
                    value = '-';
                }
                
                if (style.text == '香港' || style.text == '澳门') {
                    tooSmall = true;
                }
                else {
                    tooSmall = false;
                }
                
                // 值域控件控制
                color = (dataRange && !isNaN(value))
                        ? dataRange.getColor(value)
                        : null;
                var textShape; // 文字标签避免覆盖单独一个shape
                
                // 常规设置
                style.brushType = 'both';
                style.color = color || self.deepQuery(
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
                    
                    textShape = {
                        shape : 'text',
                        zlevel : _zlevelBase + 1,
                        hoverable: tooSmall,
                        clickable : tooSmall,
                        style : {
                            brushType: 'both',
                            x : style.textX,
                            y : style.textY,
                            text : style.text,
                            color : style.textColor,
                            strokeColor : 'rgba(0,0,0,0)',
                            textFont : style.textFont
                        }
                    };
                    textShape._style = zrUtil.clone(textShape.style);
                }
                style.textColor = 'rgba(0,0,0,0)';  // 把图形的text隐藏
                
                // 高亮
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
                    
                    textShape && (textShape.highlightStyle = {
                        brushType: 'both',
                        x : style.textX,
                        y : style.textY,
                        text : style.text,
                        color : highlightStyle.textColor,
                        strokeColor : 'yellow',
                        textFont : highlightStyle.textFont
                    });
                }
                else {
                    highlightStyle.textColor = 'rgba(0,0,0,0)'; // 把图形的text隐藏
                }
                
                if (textShape) {
                    if (_selectedMode[mapType] &&
                        _selected[name]
                        || (data && data.selected && _selected[name] !== false)
                    ) {
                        textShape.style = zrUtil.clone(
                            textShape.highlightStyle
                        );
                    }
                    if (_selectedMode[mapType] && textShape.clickable) {
                        textShape.onclick = self.shapeHandler.onclick;
                    }
                    textShape._mapType= mapType;

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
                }

                shape = {
                    shape : 'path',
                    zlevel : _zlevelBase,
                    clickable : true,
                    style : style,
                    highlightStyle : highlightStyle,
                    _style: zrUtil.clone(style),
                    _mapType: mapType
                };
                if (_selectedMode[mapType] &&
                     _selected[name]
                     || (data && data.selected && _selected[name] !== false) 
                ) {
                    shape.style = zrUtil.clone(shape.highlightStyle);
                }
                
                if (_selectedMode[mapType]) {
                    _selected[name] = typeof _selected[name] != 'undefined'
                                      ? _selected[name]
                                      : (data && data.selected);
                    _mapTypeMap[name] = mapType;
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
        
        /**
         * 点击响应 
         */
        function onclick(param) {
            if (!self.isClick || !param.target) {
                // 没有在当前实例上发生点击直接返回
                return;
            }

            var target = param.target;
            var name = target.style.text;
            var len = self.shapeList.length;
            var mapType = target._mapType || '';
            if (_selectedMode[mapType] == 'single') {
                for (var p in _selected) {
                    // 同一地图类型
                    if (_selected[p] && _mapTypeMap[p] == mapType) {
                        // 复位那些生效shape（包括文字）
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
            
            // 更新当前点击shape（包括文字）
            for (var i = 0; i < len; i++) {
                if (self.shapeList[i].style.text == name) {
                   if (_selected[name]) {
                        self.shapeList[i].style = zrUtil.clone(
                            self.shapeList[i].highlightStyle
                        );
                    }
                    else {
                       
                        self.shapeList[i].style = self.shapeList[i]._style;
                    }
                    zr.modShape(self.shapeList[i].id, self.shapeList[i]);
                }
            }
            
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
            component = newComponent;
            _selected = {};
            _mapTypeMap = {};

            refresh(newOption);
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                series = option.series;
            }
            self.clear();
            _buildShape();
        }
        
        /**
         * 值域响应
         * @param {Object} param
         * @param {Object} status
         */
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

    // 图表注册
    require('../chart').define('map', Map);
    
    return Map;
});