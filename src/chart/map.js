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
    function Map(ecConfig, messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, ecConfig, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecData = require('../util/ecData');

        var zrConfig = require('zrender/config');
        var zrUtil = require('zrender/tool/util');
        var zrEvent = require('zrender/tool/event');

        var self = this;
        self.type = ecConfig.CHART_TYPE_MAP;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();
        var _selectedMode;      // 选择模式
        var _hoverable;         // 悬浮高亮模式，索引到图表
        var _showLegendSymbol;  // 显示图例颜色标识
        var _selected = {};     // 地图选择状态
        var _mapTypeMap = {};   // 图例类型索引
        var _mapDataMap = {};   // 根据地图类型索引bbox,transform,path
        var _shapeListMap = {}; // 名字到shapeList关联映射
        var _nameMap = {};      // 个性化地名
        var _specialArea = {};  // 特殊

        var _refreshDelayTicket; // 滚轮缩放时让refresh飞一会
        var _mapDataRequireCounter;
        var _mapParams = require('../util/mapData/params').params;
        var _textFixed = require('../util/mapData/textFixed');
        var _geoCoord = require('../util/mapData/geoCoord');
        
        // 漫游相关信息
        var _roamMap = {};
        var _needRoam;
        var _mx;
        var _my;
        var _mousedown;
        var _justMove;   // 避免移动响应点击
        var _curMapType; // 当前移动的地图类型
        
        var _markAnimation = false;

        function _buildShape() {
            self.selectedMap = {};
            
            var legend = component.legend;
            var seriesName;
            var valueData = {};
            var mapType;
            var data;
            var name;
            var mapSeries = {};
            var mapValuePrecision = {};
            _selectedMode = {};
            _hoverable = {};
            _showLegendSymbol = {};
            var valueCalculation = {};
            _needRoam = false;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_MAP) { // map
                    series[i] = self.reformOption(series[i]);
                    mapType = series[i].mapType;
                    mapSeries[mapType] = mapSeries[mapType] || {};
                    mapSeries[mapType][i] = true;
                    mapValuePrecision[mapType] = mapValuePrecision[mapType]
                                                 || series[i].mapValuePrecision;
                    _roamMap[mapType] = series[i].roam || _roamMap[mapType];
                    _needRoam = _needRoam || _roamMap[mapType];
                    _nameMap[mapType] = series[i].nameMap 
                                        || _nameMap[mapType] 
                                        || {};

                    if (series[i].textFixed) {
                        zrUtil.mergeFast(
                            _textFixed, series[i].textFixed, true, false
                        );
                    }
                    if (series[i].geoCoord) {
                        zrUtil.mergeFast(
                            _geoCoord, series[i].geoCoord, true, false
                        );
                    }
                    
                    _selectedMode[mapType] = _selectedMode[mapType] 
                                             || series[i].selectedMode;
                    if (typeof _hoverable[mapType] == 'undefined'
                        || _hoverable[mapType]                  // false 1票否决
                    ) {
                        _hoverable[mapType] = series[i].hoverable; 
                    }
                    if (typeof _showLegendSymbol[mapType] == 'undefined'
                        || _showLegendSymbol[mapType]           // false 1票否决
                    ) {
                        _showLegendSymbol[mapType] = series[i].showLegendSymbol;
                    }
                    
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
                            name = _nameChange(mapType, data[j].name);
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
            
            _mapDataRequireCounter = 0;
            for (var mt in valueData) {
                _mapDataRequireCounter++;
            }
            for (var mt in valueData) {
                if (valueCalculation[mt] && valueCalculation[mt] == 'average') {
                    for (var k in valueData[mt]) {
                        valueData[mt][k].value = 
                            (valueData[mt][k].value 
                             / valueData[mt][k].seriesIndex.length)
                            .toFixed(
                                mapValuePrecision[mt]
                            ) - 0;
                    }
                }
                
                _mapDataMap[mt] = _mapDataMap[mt] || {};
                if (_mapDataMap[mt].mapData) {
                    // 已经缓存了则直接用
                    _mapDataCallback(mt, valueData[mt], mapSeries[mt])(
                        _mapDataMap[mt].mapData
                    );
                }
                else if (_mapParams[mt.replace(/\|.*/, '')].getGeoJson) {
                    // 特殊区域
                    _specialArea[mt] = 
                        _mapParams[mt.replace(/\|.*/, '')].specialArea
                        || _specialArea[mt];
                    _mapParams[mt.replace(/\|.*/, '')].getGeoJson(
                        _mapDataCallback(mt, valueData[mt], mapSeries[mt])
                    );
                }
            }
        }
        
        /**
         * @param {string} mt mapType
         * @parma {Object} vd valueData
         * @param {Object} ms mapSeries
         */
        function _mapDataCallback(mt, vd, ms) {
            return function(md) {
                if (!self) {
                    // 异步地图数据回调时有可能实例已经被释放
                    return;
                }
                // 缓存这份数据
                if (mt.indexOf('|') != -1) {
                    // 子地图，加工一份新的mapData
                    md = _getSubMapData(mt, md);
                }
                _mapDataMap[mt].mapData = md;
                _buildMap(
                    mt,                             // 类型
                    _getProjectionData(             // 地图数据
                        mt,
                        md,
                        ms
                    ),  
                    vd,                  // 用户数据
                    ms                   // 系列
                );
                _buildMark(mt, ms);
                if (--_mapDataRequireCounter <= 0) {
                    _shapeListMap = {};
                    for (var i = 0, l = self.shapeList.length; i < l; i++) {
                        self.shapeList[i].id = zr.newShapeId(self.type);
                        zr.addShape(self.shapeList[i]);
                        // 通过name关联shape，用于onmouseover
                        if (self.shapeList[i].shape == 'path' 
                            && typeof self.shapeList[i].style._text != 'undefined'
                        ) {
                            _shapeListMap[self.shapeList[i].style._text] = self.shapeList[i];
                        }
                    }
                    zr.refresh();
                    if (!_markAnimation) {
                        _markAnimation = true;
                        if (option.animation && !option.renderAsImage) {
                            self.animationMark(option.animationDuration);
                        }
                    }
                    else {
                        self.animationEffect();
                    }
                }
            };
        }
        
        function _getSubMapData(mapType, mapData) {
            var subType = mapType.replace(/^.*\|/, '');
            var features = mapData.features;
            for (var i = 0, l = features.length; i < l; i++) {
                if (features[i].properties 
                    && features[i].properties.name == subType
                ) {
                    features = features[i];
                    if (subType == 'United States of America'
                        && features.geometry.coordinates.length > 1 // 未被简化
                    ) {
                        features = {
                            geometry: {
                                coordinates: features.geometry
                                                     .coordinates.slice(5,6),
                                type: features.geometry.type
                            },
                            id: features.id,
                            properties: features.properties,
                            type: features.type
                        };
                    }
                    break;
                }
            }
            return {
                'type' : 'FeatureCollection',
                'features':[
                    features
                ]
            };
        }
        
        /**
         * 按需加载相关地图 
         */
        function _getProjectionData(mapType, mapData, mapSeries) {
            var normalProjection = require('../util/projection/normal');
            var province = [];
            
            // bbox永远不变
            var bbox = _mapDataMap[mapType].bbox 
                       || normalProjection.getBbox(
                              mapData, _specialArea[mapType]
                          );
            //console.log(bbox)
            
            var transform;
            //console.log(1111,transform)
            if (!_mapDataMap[mapType].hasRoam) {
                // 第一次或者发生了resize，需要判断
                transform = _getTransform(
                    bbox,
                    mapSeries
                );
            }
            else {
                //经过用户漫游不再响应resize
                transform = _mapDataMap[mapType].transform;
            }
            //console.log(bbox,transform)
            var lastTransform = _mapDataMap[mapType].lastTransform 
                                || {scale:{}};
            
            var pathArray;
            if (transform.left != lastTransform.left
                || transform.top != lastTransform.top
                || transform.scale.x != lastTransform.scale.x
                || transform.scale.y != lastTransform.scale.y
            ) {
                // 发生过变化，需要重新生成pathArray
                // 一般投射
                //console.log(transform)
                pathArray = normalProjection.geoJson2Path(
                                mapData, transform, _specialArea[mapType]
                            );
                lastTransform = zrUtil.clone(transform);
            }
            else {
                transform = _mapDataMap[mapType].transform;
                pathArray = _mapDataMap[mapType].pathArray;
            }
            
            _mapDataMap[mapType].bbox = bbox;
            _mapDataMap[mapType].transform = transform;
            _mapDataMap[mapType].lastTransform = lastTransform;
            _mapDataMap[mapType].pathArray = pathArray;
            
            //console.log(pathArray)
            var position = [transform.left, transform.top];
            for (var i = 0, l = pathArray.length; i < l; i++) {
                /* for test
                console.log(
                    mapData.features[i].properties.cp, // 经纬度度
                    pathArray[i].cp                    // 平面坐标
                );
                console.log(
                    pos2geo(mapType, pathArray[i].cp),  // 平面坐标转经纬度
                    geo2pos(mapType, mapData.features[i].properties.cp)
                )
                */
                province.push(_getSingleProvince(
                    mapType, pathArray[i], position
                ));
            }
            
            if (_specialArea[mapType]) {
                for (var area in _specialArea[mapType]) {
                    province.push(_getSpecialProjectionData(
                        mapType, mapData, 
                        area, _specialArea[mapType][area], 
                        position
                    ));
                }
                
            }
            
            // 中国地图加入南海诸岛
            if (mapType == 'china') {
                var leftTop = geo2pos(
                    mapType, 
                    _geoCoord['南海诸岛'] 
                    || _mapParams['南海诸岛'].textCoord
                );
                // scale.x : width  = 10.51 : 64
                var scale = transform.scale.x / 10.5;
                var textPosition = [
                    32 * scale + leftTop[0], 
                    83 * scale + leftTop[1]
                ];
                if (_textFixed['南海诸岛']) {
                    textPosition[0] += _textFixed['南海诸岛'][0];
                    textPosition[1] += _textFixed['南海诸岛'][1];
                }
                province.push({
                    text : _nameChange(mapType, '南海诸岛'),
                    path : _mapParams['南海诸岛'].getPath(
                               leftTop, scale
                           ),
                    position : position,
                    textX : textPosition[0],
                    textY : textPosition[1]
                });
                
            }
            
            return province;
        }
        
        /**
         * 特殊地区投射数据
         */
        function _getSpecialProjectionData(
            mapType, mapData, areaName, mapSize, position
        ) {
            //console.log('_getSpecialProjectionData--------------')
            // 构造单独的geoJson地图数据
            mapData = _getSubMapData('x|' + areaName, mapData);
            
            // bbox
            var normalProjection = require('../util/projection/normal');
            var bbox = normalProjection.getBbox(mapData);
            //console.log('bbox', bbox)
            
            // transform
            var leftTop = geo2pos(
                mapType, 
                [mapSize.left, mapSize.top]
            );
            var rightBottom = geo2pos(
                mapType, 
                [mapSize.left + mapSize.width, mapSize.top + mapSize.height]
            );
            //console.log('leftright' , leftTop, rightBottom);
            var width = Math.abs(rightBottom[0] - leftTop[0]);
            var height = Math.abs(rightBottom[1] - leftTop[1]);
            var mapWidth = bbox.width;
            var mapHeight = bbox.height;
            //var minScale;
            var xScale = (width / 0.75) / mapWidth;
            var yScale = height / mapHeight;
            if (xScale > yScale) {
                xScale = yScale * 0.75;
                width = mapWidth * xScale;
            }
            else {
                yScale = xScale;
                xScale = yScale * 0.75;
                height = mapHeight * yScale;
            }
            var transform = {
                OffsetLeft : leftTop[0],
                OffsetTop : leftTop[1],
                //width: width,
                //height: height,
                scale : {
                    x : xScale,
                    y : yScale
                }
            };
            
            //console.log('**',areaName, transform)
            var pathArray = normalProjection.geoJson2Path(
                mapData, transform
            );
            
            //console.log(pathArray)
            return _getSingleProvince(
                mapType, pathArray[0], position
            );
        }
        
        function _getSingleProvince(mapType, path, position) {
            var textPosition;
            var name = path.properties.name;
            if (_geoCoord[name]) {
                textPosition = geo2pos(
                    mapType, 
                    _geoCoord[name]
                );
            }
            else if (path.cp) {
                textPosition = [path.cp[0], path.cp[1]];
            }
            /*
            else {
                textPosition = geo2pos(
                    mapType, 
                    [bbox.left + bbox.width / 2, bbox.top + bbox.height / 2]
                );
            }
            */
            if (_textFixed[name]) {
                textPosition[0] += _textFixed[name][0];
                textPosition[1] += _textFixed[name][1];
            }
            //console.log(textPosition)
            return {
                text : _nameChange(mapType, name),
                path : path.path,
                position : position,
                textX : textPosition[0],
                textY : textPosition[1]
            };
        }
        /**
         * 获取缩放 
         */
        function _getTransform(bbox, mapSeries) {
            var mapLocation;
            var x;
            var cusX;
            var y;
            var cusY;
            var width;
            var height;
            var zrWidth = zr.getWidth();
            var zrHeight = zr.getHeight();
            //上下左右留空
            var padding = Math.round(Math.min(zrWidth, zrHeight) * 0.02);
            for (var key in mapSeries) {
                mapLocation = series[key].mapLocation;
                cusX = mapLocation.x || cusX;
                cusY = mapLocation.y || cusY;
                width = mapLocation.width || width;
                height = mapLocation.height || height;
            }
            
            //x = isNaN(cusX) ? padding : cusX;
            x = self.parsePercent(cusX, zrWidth);
            x = isNaN(x) ? padding : x;
            //y = isNaN(cusY) ? padding : cusY;
            y = self.parsePercent(cusY, zrHeight);
            y = isNaN(y) ? padding : y;
            if (typeof width == 'undefined') {
                width = isNaN(cusX) 
                        ? zrWidth - 2 * padding
                        : zrWidth - x - 2 * padding;
            }
            else {
                width = self.parsePercent(width, zrWidth);
            }
            
            if (typeof height == 'undefined') {
                height = isNaN(cusY) 
                         ? zrHeight - 2 * padding
                         : zrHeight - y - 2 * padding;
            }
            else {
                height = self.parsePercent(height, zrHeight);
            }
            
            var mapWidth = bbox.width;
            var mapHeight = bbox.height;
            //var minScale;
            var xScale = (width / 0.75) / mapWidth;
            var yScale = height / mapHeight;
            if (xScale > yScale) {
                //minScale = yScale;
                xScale = yScale * 0.75;
                width = mapWidth * xScale;
            }
            else {
                //minScale = xScale;
                yScale = xScale;
                xScale = yScale * 0.75;
                height = mapHeight * yScale;
            }
            //console.log(minScale)
            //width = mapWidth * minScale;
            //height = mapHeight * minScale;
            
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
                        //x = padding;
                        break;
                }
            }
            //console.log(cusX,x,zrWidth,width,'kener')
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
                        //y = padding;
                        break;
                }
            }
            //console.log(x,y,width,height)
            return {
                left : x,
                top : y,
                width: width,
                height: height,
                //scale : minScale * 50,  // wtf 50
                scale : {
                    x : xScale,
                    y : yScale
                }
                //translate : [x + width / 2, y + height / 2]
            };
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
            var textShape; 
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
                            && _showLegendSymbol[mapType] 
                            && legend.hasColor(series[data.seriesIndex[j]].name)
                        ) {
                            self.shapeList.push({
                                shape : 'circle',
                                zlevel : _zlevelBase + 1,
                                position : style.position,
                                _mapType : mapType,
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
                
                // 值域控件控制
                color = (dataRange && !isNaN(value))
                        ? dataRange.getColor(value)
                        : null;
                
                // 常规设置
                style.brushType = 'both';
                style.color = color 
                              || self.getItemStyleColor(
                                     self.deepQuery(queryTarget, 'itemStyle.normal.color'),
                                     data.seriesIndex, -1, data
                                 )
                              || self.deepQuery(
                                  queryTarget, 'itemStyle.normal.areaStyle.color'
                                 );
                style.strokeColor = self.deepQuery(queryTarget, 'itemStyle.normal.borderColor');
                style.lineWidth = self.deepQuery(queryTarget, 'itemStyle.normal.borderWidth');
                style.lineJoin = 'round';
                
                style.text = _getLabelText(name, value, queryTarget, 'normal');
                style._text = name;
                style.textAlign = 'center';
                style.textColor = self.deepQuery(
                    queryTarget,
                    'itemStyle.normal.label.textStyle.color'
                );
                font = self.deepQuery(
                    queryTarget,
                    'itemStyle.normal.label.textStyle'
                );
                style.textFont = self.getFont(font);
                if (!self.deepQuery(queryTarget, 'itemStyle.normal.label.show')) {
                    style.textColor = 'rgba(0,0,0,0)';  // 默认不呈现文字
                }
                
                // 文字标签避免覆盖单独一个shape
                textShape = {
                    shape : 'text',
                    zlevel : _zlevelBase + 1,
                    hoverable: _hoverable[mapType],
                    position : style.position,
                    _mapType : mapType,
                    style : {
                        brushType: 'both',
                        x : style.textX,
                        y : style.textY,
                        text : _getLabelText(name, value, queryTarget, 'normal'),
                        _text : name,
                        textAlign : 'center',
                        color : style.textColor,
                        strokeColor : 'rgba(0,0,0,0)',
                        textFont : style.textFont
                    }
                };
                textShape._style = zrUtil.clone(textShape.style);
                textShape.highlightStyle = zrUtil.clone(textShape.style);
                // labelInteractive && (textShape.highlightStyle.strokeColor = 'yellow');
                style.textColor = 'rgba(0,0,0,0)';  // 把图形的text隐藏
                
                // 高亮
                highlightStyle.brushType = 'both';
                highlightStyle.color = self.getItemStyleColor(
                                           self.deepQuery(queryTarget, 'itemStyle.emphasis.color'),
                                           data.seriesIndex, -1, data
                                       ) 
                                       || self.deepQuery(
                                              queryTarget, 'itemStyle.emphasis.areaStyle.color'
                                          ) 
                                       || style.color;
                highlightStyle.strokeColor = self.deepQuery(
                    queryTarget,
                    'itemStyle.emphasis.borderColor'
                ) || style.strokeColor;
                highlightStyle.lineWidth = self.deepQuery(
                    queryTarget,
                    'itemStyle.emphasis.borderWidth'
                ) || style.lineWidth;
                highlightStyle._text = name;
                if (self.deepQuery(queryTarget, 'itemStyle.emphasis.label.show')) {
                    highlightStyle.text = _getLabelText(
                        name, value, queryTarget, 'emphasis'
                    );
                    highlightStyle.textAlign = 'center';
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
                    textShape.highlightStyle.color = highlightStyle.textColor;
                    textShape.highlightStyle.textFont = highlightStyle.textFont;
                }
                else {
                    highlightStyle.textColor = 'rgba(0,0,0,0)'; // 把图形的text隐藏
                }

                shape = {
                    shape : 'path',
                    zlevel : _zlevelBase,
                    hoverable: _hoverable[mapType],
                    position : style.position,
                    style : style,
                    highlightStyle : highlightStyle,
                    _style: zrUtil.clone(style),
                    _mapType: mapType
                };
                
                if (_selectedMode[mapType] &&
                     _selected[name]
                     || (data.selected && _selected[name] !== false) 
                ) {
                    textShape.style = zrUtil.clone(
                        textShape.highlightStyle
                    );
                    shape.style = zrUtil.clone(shape.highlightStyle);
                }
                
                if (_selectedMode[mapType]) {
                    _selected[name] = typeof _selected[name] != 'undefined'
                                      ? _selected[name]
                                      : data.selected;
                    _mapTypeMap[name] = mapType;
                    
                    if (typeof data.selectable == 'undefined' || data.selectable) {
                        textShape.clickable = true;
                        textShape.onclick = self.shapeHandler.onclick;
                        
                        shape.clickable = true;
                        shape.onclick = self.shapeHandler.onclick;
                    }
                }
                
                if (typeof data.hoverable != 'undefined') {
                    // 数据级优先
                    textShape.hoverable = shape.hoverable = data.hoverable;
                    if (data.hoverable) {
                        textShape.onmouseover = self.shapeHandler.onmouseover;
                    }
                }
                else if (_hoverable[mapType]){
                    // 系列级，补充一个关联响应
                    textShape.onmouseover = self.shapeHandler.onmouseover;
                }
                
                // console.log(name,shape);
                
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
        
        // 添加标注
        function _buildMark(mapType, mapSeries) {
            var position = [
                _mapDataMap[mapType].transform.left,
                _mapDataMap[mapType].transform.top
            ];
            for (var sIdx in mapSeries) {
                self.buildMark(
                    series[sIdx],
                    sIdx,
                    component,
                    {
                        mapType : mapType
                    },
                    {
                        position : position,
                        _mapType : mapType
                    }
                );
            }
        }
        
        // 位置转换
        function getMarkCoord(serie, seriesIndex, mpData, markCoordParams) {
            return _geoCoord[mpData.name]
                   ? geo2pos(
                         markCoordParams.mapType, _geoCoord[mpData.name]
                     )
                   : [0, 0];
        }
            
        function _nameChange(mapType, name) {
            return _nameMap[mapType][name] || name;
        }
        
        /**
         * 根据lable.format计算label text
         */
        function _getLabelText(name, value, queryTarget, status) {
            var formatter = self.deepQuery(
                queryTarget,
                'itemStyle.' + status + '.label.formatter'
            );
            if (formatter) {
                if (typeof formatter == 'function') {
                    return formatter(
                        name,
                        value
                    );
                }
                else if (typeof formatter == 'string') {
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}');
                    formatter = formatter.replace('{a0}', name)
                                         .replace('{b0}', value);
    
                    return formatter;
                }
            }
            else {
                return name;
            }
        }
        
        function _findMapTypeByPos(mx, my) {
            var transform;
            var left;
            var top;
            var width;
            var height;
            for (var mapType in _mapDataMap) {
                transform = _mapDataMap[mapType].transform;
                if (!transform || !_roamMap[mapType]) {
                    continue;
                }
                left = transform.left;
                top = transform.top;
                width = transform.width;
                height = transform.height;
                if (mx >= left
                    && mx <= (left + width)
                    && my >= top
                    && my <= (top + height)
                ) {
                    return mapType;
                }
            }
            return;
        }
        /**
         * 滚轮缩放 
         */
        function _onmousewheel(param) {
            var event = param.event;
            var mx = zrEvent.getX(event);
            var my = zrEvent.getY(event);
            var delta = zrEvent.getDelta(event);
            //delta = delta > 0 ? (-1) : 1;
            var mapType = _findMapTypeByPos(mx, my);
            if (mapType) {
                var transform = _mapDataMap[mapType].transform;
                var left = transform.left;
                var top = transform.top;
                var width = transform.width;
                var height = transform.height;
                // 位置转经纬度
                geoAndPos = pos2geo(mapType, [mx - left, my - top]);
                if (delta > 0) {
                    delta = 1.2;
                    // 放大
                    transform.scale.x *= delta;
                    transform.scale.y *= delta;
                    transform.width = width * delta;
                    transform.height = height * delta;
                }
                else {
                    // 缩小
                    delta = 1.2;
                    transform.scale.x /= delta;
                    transform.scale.y /= delta;
                    transform.width = width / delta;
                    transform.height = height / delta;
                }
                _mapDataMap[mapType].hasRoam = true;
                _mapDataMap[mapType].transform = transform;
                // 经纬度转位置
                geoAndPos = geo2pos(mapType, geoAndPos);
                // 保持视觉中心
                transform.left -= geoAndPos[0] - (mx - left);
                transform.top -= geoAndPos[1] - (my - top);
                _mapDataMap[mapType].transform = transform;
                // 让refresh飞一会
                clearTimeout(_refreshDelayTicket);
                _refreshDelayTicket = setTimeout(refresh, 100);
                messageCenter.dispatch(
                    ecConfig.EVENT.MAP_ROAM,
                    param.event,
                    {type : 'scale'}
                );
                zrEvent.stop(event);
            }
        }
        
        function _onmousedown(param) {
            var target = param.target;
            if (target && target.draggable) {
                return;
            }
            var event = param.event;
            var mx = zrEvent.getX(event);
            var my = zrEvent.getY(event);
            var mapType = _findMapTypeByPos(mx, my);
            if (mapType) {
                _mousedown = true;
                _mx = mx;
                _my = my;
                _curMapType = mapType;
                setTimeout(function(){
                    zr.on(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
                    zr.on(zrConfig.EVENT.MOUSEUP, _onmouseup);
                },50);
            }
            
        }
        
        function _onmousemove(param) {
            if (!_mousedown || !self) {
                return;
            }
            var event = param.event;
            var mx = zrEvent.getX(event);
            var my = zrEvent.getY(event);
            var transform = _mapDataMap[_curMapType].transform;
            transform.hasRoam = true;
            transform.left -= _mx - mx;
            transform.top -= _my - my;
            _mx = mx;
            _my = my;
            _mapDataMap[_curMapType].transform = transform;
            
            var position = [transform.left, transform.top];
            var mod = {position : [transform.left, transform.top]};
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if(self.shapeList[i]._mapType == _curMapType) {
                    self.shapeList[i].position = position;
                    zr.modShape(self.shapeList[i].id, mod, true);
                }
            }
            
            messageCenter.dispatch(
                ecConfig.EVENT.MAP_ROAM,
                param.event,
                {type : 'move'}
            );
            
            self.clearAnimationShape();
            zr.refresh();
            
            _justMove = true;
            zrEvent.stop(event);
        }
        
        function _onmouseup(param) {
            var event = param.event;
            _mx = zrEvent.getX(event);
            _my = zrEvent.getY(event);
            _mousedown = false;
            setTimeout(function(){
                _justMove && self.animationEffect();
                _justMove = false;
                zr.un(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
                zr.un(zrConfig.EVENT.MOUSEUP, _onmouseup);
            },100);
        }
        
        /**
         * 点击响应 
         */
        function onclick(param) {
            if (!self.isClick || !param.target || _justMove) {
                // 没有在当前实例上发生点击直接返回
                return;
            }

            var target = param.target;
            var name = target.style._text;
            var len = self.shapeList.length;
            var mapType = target._mapType || '';
            if (_selectedMode[mapType] == 'single') {
                for (var p in _selected) {
                    // 同一地图类型
                    if (_selected[p] && _mapTypeMap[p] == mapType) {
                        // 复位那些生效shape（包括文字）
                        for (var i = 0; i < len; i++) {
                            if (self.shapeList[i].style._text == p) {
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
                if (self.shapeList[i].style._text == name) {
                   if (_selected[name]) {
                        self.shapeList[i].style = zrUtil.clone(
                            self.shapeList[i].highlightStyle
                        );
                    }
                    else {
                        self.shapeList[i].style = self.shapeList[i]._style;
                    }
                    zr.modShape(
                        self.shapeList[i].id, 
                        {style : self.shapeList[i].style}
                    );
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
         * @param {Object} newSeries
         * @param {Object} newComponent
         */
        function init(newOption, newComponent) {
            component = newComponent;
            _selected = {};
            _mapTypeMap = {};
            _mapDataMap = {};
            _nameMap = {};
            _roamMap = {};
            _specialArea = {};
            _markAnimation = false;

            refresh(newOption);
            
            if (_needRoam) {
                zr.on(zrConfig.EVENT.MOUSEWHEEL, _onmousewheel);
                zr.on(zrConfig.EVENT.MOUSEDOWN, _onmousedown);
            }
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
            zr.refreshHover();
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
        
        /**
         * 平面坐标转经纬度
         */
        function pos2geo(mapType, p) {
            if (!_mapDataMap[mapType].transform) {
                return null;
            }
            return require('../util/projection/normal').pos2geo(
                _mapDataMap[mapType].transform, p
            );
        }
        
        /**
         * 公开接口 : 平面坐标转经纬度
         */
        function getGeoByPos(mapType, p) {
            if (!_mapDataMap[mapType].transform) {
                return null;
            }
            var position = [
                _mapDataMap[mapType].transform.left,
                _mapDataMap[mapType].transform.top
            ];
            if (p instanceof Array) {
                p[0] -= position[0];
                p[1] -= position[1];
            }
            else {
                p.x -= position[0];
                p.y -= position[1];
            }
            return pos2geo(mapType, p);
        }
        
        /**
         * 经纬度转平面坐标
         * @param {Object} p
         */
        function geo2pos(mapType, p) {
            if (!_mapDataMap[mapType].transform) {
                return null;
            }
            return require('../util/projection/normal').geo2pos(
                _mapDataMap[mapType].transform, p
            );
        }
        
        /**
         * 公开接口 : 经纬度转平面坐标
         */
        function getPosByGeo(mapType, p) {
            if (!_mapDataMap[mapType].transform) {
                return null;
            }
            var pos = geo2pos(mapType, p);
            pos[0] += _mapDataMap[mapType].transform.left;
            pos[1] += _mapDataMap[mapType].transform.top;
            return pos;
        }
        
        /**
         * 公开接口 : 地图参考坐标
         */
        function getMapPosition(mapType) {
            if (!_mapDataMap[mapType].transform) {
                return null;
            }
            return [
                _mapDataMap[mapType].transform.left,
                _mapDataMap[mapType].transform.top
            ];
        }
        
        /*
        function appendShape(mapType, shapeList) {
            shapeList = shapeList instanceof Array
                        ? shapeList : [shapeList];
            for (var i = 0, l = shapeList.length; i < l; i++) {
                if (typeof shapeList[i].id == 'undefined') {
                    shapeList[i].id = zr.newShapeId(self.type);
                }
                if (typeof shapeList[i].zlevel == 'undefined') {
                    shapeList[i].zlevel = _zlevelBase + 1;
                }
                shapeList[i]._mapType = mapType;
                self.shapeList.push(shapeList[i]);
                zr.addShape(shapeList[i]);
            }
            zr.refresh();
        }
        */
       
        /**
         * 释放后实例不可用
         */
        function dispose() {
            self.clear();
            self.shapeList = null;
            self = null;
            if (_needRoam) {
                zr.un(zrConfig.EVENT.MOUSEWHEEL, _onmousewheel);
                zr.un(zrConfig.EVENT.MOUSEDOWN, _onmousedown);
            }
        }
        
        /**
         * 输出关联区域
         */
        self.shapeHandler.onmouseover = function(param) {
            var target = param.target;
            var name = target.style._text;
            if (_shapeListMap[name]) {
                zr.addHoverShape(_shapeListMap[name]);
            }
        };

        // 重载基类方法
        self.getMarkCoord = getMarkCoord;
        self.dispose = dispose;
        
        self.init = init;
        self.refresh = refresh;
        self.ondataRange = ondataRange;
        self.onclick = onclick;
        
        // 稳定接口
        self.pos2geo = pos2geo;
        self.geo2pos = geo2pos;
        self.getMapPosition = getMapPosition;
        self.getPosByGeo = getPosByGeo;
        self.getGeoByPos = getGeoByPos;
        //self.appendShape = appendShape;
        
        init(option, component);
    }

    // 图表注册
    require('../chart').define('map', Map);
    
    return Map;
});