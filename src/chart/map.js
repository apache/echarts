/**
 * echarts图表类：地图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var ComponentBase = require('../component/base');
    var ChartBase = require('./base');
    
    // 图形依赖
    var TextShape = require('zrender/shape/Text');
    var PathShape = require('zrender/shape/Path');
    var CircleShape = require('zrender/shape/Circle');
    var RectangleShape = require('zrender/shape/Rectangle');
    var LineShape = require('zrender/shape/Line');
    var PolygonShape = require('zrender/shape/Polygon');
    var EllipseShape = require('zrender/shape/Ellipse');
    // 组件依赖
    require('../component/dataRange');
    
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrConfig = require('zrender/config');
    var zrEvent = require('zrender/tool/event');
    
    var _mapParams = require('../util/mapData/params').params;
    var _textFixed = require('../util/mapData/textFixed');
    var _geoCoord = require('../util/mapData/geoCoord');
    
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Map(ecTheme, messageCenter, zr, option, myChart){
        // 基类
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        // 图表基类
        ChartBase.call(this);
        
        var self = this;
        self._onmousewheel = function(param){
            return self.__onmousewheel(param);
        };
        self._onmousedown = function(param){
            return self.__onmousedown(param);
        };
        self._onmousemove = function(param){
            return self.__onmousemove(param);
        };
        self._onmouseup = function(param){
            return self.__onmouseup(param);
        };
        
        this._isAlive = true;           // 活着标记
        this._selectedMode = {};        // 选择模式
        this._hoverable = {};           // 悬浮高亮模式，索引到图表
        this._showLegendSymbol = {};    // 显示图例颜色标识
        this._selected = {};            // 地图选择状态
        this._mapTypeMap = {};          // 图例类型索引
        this._mapDataMap = {};          // 根据地图类型索引bbox,transform,path
        this._nameMap = {};             // 个性化地名
        this._specialArea = {};         // 特殊
        this._refreshDelayTicket;       // 滚轮缩放时让refresh飞一会
        this._mapDataRequireCounter;    // 异步回调计数器
        this._markAnimation = false;
        
        // 漫游相关信息
        this._roamMap = {};
        this._scaleLimitMap = {};
        this._needRoam;
        this._mx;
        this._my;
        this._mousedown;
        this._justMove;   // 避免移动响应点击
        this._curMapType; // 当前移动的地图类型
        
        this.refresh(option);
        if (this._needRoam) {
            this.zr.on(zrConfig.EVENT.MOUSEWHEEL, this._onmousewheel);
            this.zr.on(zrConfig.EVENT.MOUSEDOWN, this._onmousedown);
        }
    }
    
    Map.prototype = {
        type : ecConfig.CHART_TYPE_MAP,
        /**
         * 绘制图形
         */
        _buildShape : function () {
            var series = this.series;
            this.selectedMap = {}; // 系列
            this._activeMapType = {}; // 当前活跃的地图类型
            
            var legend = this.component.legend;
            var seriesName;
            var valueData = {};
            var mapType;
            var data;
            var name;
            var mapSeries = {};
            var mapValuePrecision = {};
            var valueCalculation = {};
            this._needRoam = false;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_MAP) { // map
                    series[i] = this.reformOption(series[i]);
                    mapType = series[i].mapType;
                    mapSeries[mapType] = mapSeries[mapType] || {};
                    mapSeries[mapType][i] = true;
                    mapValuePrecision[mapType] = mapValuePrecision[mapType]
                                                 || series[i].mapValuePrecision;
                    this._scaleLimitMap[mapType] = this._scaleLimitMap[mapType] || {};
                    series[i].scaleLimit 
                    && zrUtil.merge(this._scaleLimitMap[mapType], series[i].scaleLimit, true);
                    
                    this._roamMap[mapType] = series[i].roam || this._roamMap[mapType];
                    this._needRoam = this._needRoam || this._roamMap[mapType];
                    
                    this._nameMap[mapType] = this._nameMap[mapType] || {};
                    series[i].nameMap 
                    && zrUtil.merge(this._nameMap[mapType], series[i].nameMap, true);
                    this._activeMapType[mapType] = true;

                    if (series[i].textFixed) {
                        zrUtil.merge(
                            _textFixed, series[i].textFixed, true
                        );
                    }
                    if (series[i].geoCoord) {
                        zrUtil.merge(
                            _geoCoord, series[i].geoCoord, true
                        );
                    }
                    
                    this._selectedMode[mapType] = this._selectedMode[mapType] 
                                                  || series[i].selectedMode;
                    if (typeof this._hoverable[mapType] == 'undefined'
                        || this._hoverable[mapType]                  // false 1票否决
                    ) {
                        this._hoverable[mapType] = series[i].hoverable; 
                    }
                    if (typeof this._showLegendSymbol[mapType] == 'undefined'
                        || this._showLegendSymbol[mapType]           // false 1票否决
                    ) {
                        this._showLegendSymbol[mapType] = series[i].showLegendSymbol;
                    }
                    
                    valueCalculation[mapType] = valueCalculation[mapType] 
                                                || series[i].mapValueCalculation;
                    
                    seriesName = series[i].name;
                    this.selectedMap[seriesName] = legend
                        ? legend.isSelected(seriesName)
                        : true;
                    if (this.selectedMap[seriesName]) {
                        valueData[mapType] = valueData[mapType] || {};
                        data = series[i].data;
                        for (var j = 0, k = data.length; j < k; j++) {
                            name = this._nameChange(mapType, data[j].name);
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
            
            this._mapDataRequireCounter = 0;
            for (var mt in valueData) {
                this._mapDataRequireCounter++;
            }
            //清空
            this._clearSelected();
            if (this._mapDataRequireCounter === 0) {
                this.clear();
                this.zr && this.zr.delShape(this.lastShapeList);
                this.lastShapeList = [];
            }
            for (var mt in valueData) {
                if (valueCalculation[mt] && valueCalculation[mt] == 'average') {
                    for (var k in valueData[mt]) {
                        valueData[mt][k].value = 
                            (valueData[mt][k].value / valueData[mt][k].seriesIndex.length)
                            .toFixed(
                                mapValuePrecision[mt]
                            ) - 0;
                    }
                }
                
                this._mapDataMap[mt] = this._mapDataMap[mt] || {};
                
                if (this._mapDataMap[mt].mapData) {
                    // 已经缓存了则直接用
                    this._mapDataCallback(mt, valueData[mt], mapSeries[mt])(
                        this._mapDataMap[mt].mapData
                    );
                }
                else if (_mapParams[mt.replace(/\|.*/, '')].getGeoJson) {
                    // 特殊区域
                    this._specialArea[mt] = 
                        _mapParams[mt.replace(/\|.*/, '')].specialArea
                        || this._specialArea[mt];
                    _mapParams[mt.replace(/\|.*/, '')].getGeoJson(
                        this._mapDataCallback(mt, valueData[mt], mapSeries[mt])
                    );
                }
            }
        },
        
        /**
         * @param {string} mt mapType
         * @parma {Object} vd valueData
         * @param {Object} ms mapSeries
         */
        _mapDataCallback : function (mt, vd, ms) {
            var self = this;
            return function (md) {
                if (!self._isAlive) {
                    // 异步地图数据回调时有可能实例已经被释放
                    return;
                }
                // 缓存这份数据
                if (mt.indexOf('|') != -1) {
                    // 子地图，加工一份新的mapData
                    md = self._getSubMapData(mt, md);
                }
                self._mapDataMap[mt].mapData = md;
                
                if (md.firstChild) {
                    self._mapDataMap[mt].rate = 1;
                    self._mapDataMap[mt].projection = require('../util/projection/svg');
                }
                else {
                    self._mapDataMap[mt].rate = 0.75;
                    self._mapDataMap[mt].projection = require('../util/projection/normal');
                }
                
                self._buildMap(
                    mt,                             // 类型
                    self._getProjectionData(mt, md, ms),      // 地图数据
                    vd,                  // 用户数据
                    ms                   // 系列
                );
                self._buildMark(mt, ms);
                if (--self._mapDataRequireCounter <= 0) {
                    self.addShapeList();
                    self.zr.refresh();
                }
            };
        },
        
        _clearSelected : function() {
            for (var k in this._selected) {
                if (!this._activeMapType[this._mapTypeMap[k]]) {
                    delete this._selected[k];
                    delete this._mapTypeMap[k];
                }
            }
        },
        
        _getSubMapData : function (mapType, mapData) {
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
        },
        
        /**
         * 按需加载相关地图 
         */
        _getProjectionData : function (mapType, mapData, mapSeries) {
            var normalProjection = this._mapDataMap[mapType].projection;
            var province = [];
            
            // bbox永远不变
            var bbox = this._mapDataMap[mapType].bbox 
                       || normalProjection.getBbox(
                              mapData, this._specialArea[mapType]
                          );
            //console.log(bbox)
            
            var transform;
            //console.log(1111,transform)
            if (!this._mapDataMap[mapType].hasRoam) {
                // 第一次或者发生了resize，需要判断
                transform = this._getTransform(
                    bbox,
                    mapSeries,
                    this._mapDataMap[mapType].rate
                );
            }
            else {
                //经过用户漫游不再响应resize
                transform = this._mapDataMap[mapType].transform;
            }
            //console.log(bbox,transform)
            var lastTransform = this._mapDataMap[mapType].lastTransform 
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
                                mapData, transform, this._specialArea[mapType]
                            );
                lastTransform = zrUtil.clone(transform);
            }
            else {
                transform = this._mapDataMap[mapType].transform;
                pathArray = this._mapDataMap[mapType].pathArray;
            }
            
            this._mapDataMap[mapType].bbox = bbox;
            this._mapDataMap[mapType].transform = transform;
            this._mapDataMap[mapType].lastTransform = lastTransform;
            this._mapDataMap[mapType].pathArray = pathArray;
            
            //console.log(pathArray)
            var position = [transform.left, transform.top];
            for (var i = 0, l = pathArray.length; i < l; i++) {
                /* for test
                console.log(
                    mapData.features[i].properties.cp, // 经纬度度
                    pathArray[i].cp                    // 平面坐标
                );
                console.log(
                    this.pos2geo(mapType, pathArray[i].cp),  // 平面坐标转经纬度
                    this.geo2pos(mapType, mapData.features[i].properties.cp)
                )
                */
                province.push(this._getSingleProvince(
                    mapType, pathArray[i], position
                ));
            }
            
            if (this._specialArea[mapType]) {
                for (var area in this._specialArea[mapType]) {
                    province.push(this._getSpecialProjectionData(
                        mapType, mapData, 
                        area, this._specialArea[mapType][area], 
                        position
                    ));
                }
                
            }
            
            // 中国地图加入南海诸岛
            if (mapType == 'china') {
                var leftTop = this.geo2pos(
                    mapType, 
                    _geoCoord['南海诸岛'] || _mapParams['南海诸岛'].textCoord
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
                    name : this._nameChange(mapType, '南海诸岛'),
                    path : _mapParams['南海诸岛'].getPath(leftTop, scale),
                    position : position,
                    textX : textPosition[0],
                    textY : textPosition[1]
                });
                
            }
            //console.log(JSON.stringify(province));
            //console.log(JSON.stringify(this._mapDataMap[mapType].transform));
            return province;
        },
        
        /**
         * 特殊地区投射数据
         */
        _getSpecialProjectionData : function (mapType, mapData, areaName, mapSize, position) {
            //console.log('_getSpecialProjectionData--------------')
            // 构造单独的geoJson地图数据
            mapData = this._getSubMapData('x|' + areaName, mapData);
            
            // bbox
            var normalProjection = require('../util/projection/normal');
            var bbox = normalProjection.getBbox(mapData);
            //console.log('bbox', bbox)
            
            // transform
            var leftTop = this.geo2pos(
                mapType, 
                [mapSize.left, mapSize.top]
            );
            var rightBottom = this.geo2pos(
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
            return this._getSingleProvince(
                mapType, pathArray[0], position
            );
        },
        
        _getSingleProvince : function (mapType, path, position) {
            var textPosition;
            var name = path.properties.name;
            var textFixed = _textFixed[name] || [0, 0];
            if (_geoCoord[name]) {
                // 经纬度直接定位不加textFixed
                textPosition = this.geo2pos(
                    mapType, 
                    _geoCoord[name]
                );
            }
            else if (path.cp) {
                textPosition = [
                    path.cp[0] + textFixed[0], 
                    path.cp[1] + textFixed[1]
                ];
            }
            else {
                var bbox = this._mapDataMap[mapType].bbox;
                textPosition = this.geo2pos(
                    mapType, 
                    [bbox.left + bbox.width / 2, bbox.top + bbox.height / 2]
                );
                textPosition[0] += textFixed[0];
                textPosition[1] += textFixed[1];
            }
            
            //console.log(textPosition)
            path.name = this._nameChange(mapType, name);
            path.position = position;
            path.textX = textPosition[0];
            path.textY = textPosition[1];
            return path;
        },
        
        /**
         * 获取缩放 
         */
        _getTransform : function (bbox, mapSeries, rate) {
            var series = this.series;
            var mapLocation;
            var x;
            var cusX;
            var y;
            var cusY;
            var width;
            var height;
            var zrWidth = this.zr.getWidth();
            var zrHeight = this.zr.getHeight();
            //上下左右留空
            var padding = Math.round(Math.min(zrWidth, zrHeight) * 0.02);
            for (var key in mapSeries) {
                mapLocation = series[key].mapLocation || {};
                cusX = mapLocation.x || cusX;
                cusY = mapLocation.y || cusY;
                width = mapLocation.width || width;
                height = mapLocation.height || height;
            }
            
            //x = isNaN(cusX) ? padding : cusX;
            x = this.parsePercent(cusX, zrWidth);
            x = isNaN(x) ? padding : x;
            //y = isNaN(cusY) ? padding : cusY;
            y = this.parsePercent(cusY, zrHeight);
            y = isNaN(y) ? padding : y;
            if (typeof width == 'undefined') {
                width = zrWidth - x - 2 * padding;
            }
            else {
                width = this.parsePercent(width, zrWidth);
            }
            
            if (typeof height == 'undefined') {
                height = zrHeight - y - 2 * padding;
            }
            else {
                height = this.parsePercent(height, zrHeight);
            }
            
            var mapWidth = bbox.width;
            var mapHeight = bbox.height;
            //var minScale;
            var xScale = (width / rate) / mapWidth;
            var yScale = height / mapHeight;
            if (xScale > yScale) {
                //minScale = yScale;
                xScale = yScale * rate;
                width = mapWidth * xScale;
            }
            else {
                //minScale = xScale;
                yScale = xScale;
                xScale = yScale * rate;
                height = mapHeight * yScale;
            }
            //console.log(minScale)
            //width = mapWidth * minScale;
            //height = mapHeight * minScale;
            
            if (isNaN(cusX)) {
                cusX = cusX || 'center';
                switch (cusX + '') {
                    case 'center' :
                        x = Math.floor((zrWidth - width) / 2);
                        break;
                    case 'right' :
                        x = zrWidth - width;
                        break;
                    //case 'left' :
                        //x = padding;
                }
            }
            //console.log(cusX,x,zrWidth,width,'kener')
            if (isNaN(cusY)) {
                cusY = cusY || 'center';
                switch (cusY + '') {
                    case 'center' :
                        y = Math.floor((zrHeight - height) / 2);
                        break;
                    case 'bottom' :
                        y = zrHeight - height;
                        break;
                    //case 'top' :
                        //y = padding;
                }
            }
            //console.log(x,y,width,height)
            return {
                left : x,
                top : y,
                width: width,
                height: height,
                //scale : minScale * 50,  // wtf 50
                baseScale : 1,
                scale : {
                    x : xScale,
                    y : yScale
                }
                //translate : [x + width / 2, y + height / 2]
            };
        },
        
        /**
         * 构建地图
         * @param {Object} mapData 图形数据
         * @param {Object} valueData 用户数据
         */
        _buildMap : function (mapType, mapData, valueData, mapSeries) {
            var series = this.series;
            var legend = this.component.legend;
            var dataRange = this.component.dataRange;
            var seriesName;
            var name;
            var data;
            var value;
            var queryTarget;
            var defaultOption = this.ecTheme.map;
            
            var color;
            var font;
            var style;
            var highlightStyle;
            
            var shape;
            var textShape; 
            for (var i = 0, l = mapData.length; i < l; i++) {
                style = zrUtil.clone(mapData[i]);
                highlightStyle = {
                    name : style.name,
                    path : style.path,
                    position : zrUtil.clone(style.position)
                };
                name = style.name;
                data = valueData[name]; // 多系列合并后的数据
                if (data) {
                    queryTarget = [data]; // level 3
                    seriesName = '';
                    for (var j = 0, k = data.seriesIndex.length; j < k; j++) {
                        // level 2
                        queryTarget.push(series[data.seriesIndex[j]]);
                        seriesName += series[data.seriesIndex[j]].name + ' ';
                        if (legend
                            && this._showLegendSymbol[mapType] 
                            && legend.hasColor(series[data.seriesIndex[j]].name)
                        ) {
                            this.shapeList.push(new CircleShape({
                                zlevel : this._zlevelBase + 1,
                                position : zrUtil.clone(style.position),
                                _mapType : mapType,
                                /*
                                _geo : this.pos2geo(
                                           mapType, [style.textX + 3 + j * 7, style.textY - 10]
                                       ),
                                       */
                                style : {
                                    x : style.textX + 3 + j * 7,
                                    y : style.textY - 10,
                                    r : 3,
                                    color : legend.getColor(
                                        series[data.seriesIndex[j]].name
                                    )
                                },
                                hoverable : false
                            }));
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
                style.color = style.color 
                              || color 
                              || this.getItemStyleColor(
                                     this.deepQuery(queryTarget, 'itemStyle.normal.color'),
                                     data.seriesIndex, -1, data
                                 )
                              || this.deepQuery(
                                  queryTarget, 'itemStyle.normal.areaStyle.color'
                                 );
                style.strokeColor = style.strokeColor
                                    || this.deepQuery(queryTarget, 'itemStyle.normal.borderColor');
                style.lineWidth = style.lineWidth
                                  || this.deepQuery(queryTarget, 'itemStyle.normal.borderWidth');
                
                // 高亮
                highlightStyle.color = this.getItemStyleColor(
                                           this.deepQuery(queryTarget, 'itemStyle.emphasis.color'),
                                           data.seriesIndex, -1, data
                                       ) 
                                       || this.deepQuery(
                                              queryTarget, 'itemStyle.emphasis.areaStyle.color'
                                          ) 
                                       || style.color;
                highlightStyle.strokeColor = this.deepQuery(
                                                 queryTarget, 'itemStyle.emphasis.borderColor'
                                             ) 
                                             || style.strokeColor;
                highlightStyle.lineWidth = this.deepQuery(
                                               queryTarget, 'itemStyle.emphasis.borderWidth'
                                           )
                                           || style.lineWidth;
                
                style.brushType = highlightStyle.brushType = style.brushType || 'both';
                style.lineJoin = highlightStyle.lineJoin = 'round';
                style._name = highlightStyle._name = name;
                
                font = this.deepQuery(queryTarget, 'itemStyle.normal.label.textStyle');
                // 文字标签避免覆盖单独一个shape
                textShape = {
                    zlevel : this._zlevelBase + 1,
                    hoverable: this._hoverable[mapType],
                    position : zrUtil.clone(style.position),
                    _mapType : mapType,
                    _geo : this.pos2geo(
                               mapType, [style.textX, style.textY]
                           ),
                    style : {
                        brushType : 'fill',
                        x : style.textX,
                        y : style.textY,
                        text : this.getLabelText(name, value, queryTarget, 'normal'),
                        _name : name,
                        textAlign : 'center',
                        color : this.deepQuery(queryTarget, 'itemStyle.normal.label.show')
                                ? this.deepQuery(
                                      queryTarget,
                                      'itemStyle.normal.label.textStyle.color'
                                  )
                                : 'rgba(0,0,0,0)',
                        textFont : this.getFont(font)
                    }
                };
                textShape._style = zrUtil.clone(textShape.style);
                
                textShape.highlightStyle = zrUtil.clone(textShape.style);
                if (this.deepQuery(queryTarget, 'itemStyle.emphasis.label.show')) {
                    textShape.highlightStyle.text = this.getLabelText(
                        name, value, queryTarget, 'emphasis'
                    );
                    textShape.highlightStyle.color = this.deepQuery(
                        queryTarget,
                        'itemStyle.emphasis.label.textStyle.color'
                    ) || textShape.style.color;
                    font = this.deepQuery(
                        queryTarget,
                        'itemStyle.emphasis.label.textStyle'
                    ) || font;
                    textShape.highlightStyle.textFont = this.getFont(font);
                }
                else {
                    textShape.highlightStyle.color = 'rgba(0,0,0,0)';
                }

                shape = {
                    zlevel : this._zlevelBase,
                    hoverable: this._hoverable[mapType],
                    position : zrUtil.clone(style.position),
                    style : style,
                    highlightStyle : highlightStyle,
                    _style: zrUtil.clone(style),
                    _mapType: mapType
                };
                if (typeof style.scale != 'undefined') {
                    shape.scale = zrUtil.clone(style.scale);
                }
                
                textShape = new TextShape(textShape);
                switch (shape.style.shapeType) {
                    case 'rectangle' : 
                        shape = new RectangleShape(shape);
                        break;
                    case 'line' : 
                        shape = new LineShape(shape);
                        break;
                    case 'circle' : 
                        shape = new CircleShape(shape);
                        break;
                    case 'polygon' : 
                        shape = new PolygonShape(shape);
                        break;
                    case 'ellipse':
                        shape = new EllipseShape(shape);
                        break;
                    default :
                        shape = new PathShape(shape);
                        shape.pathArray = shape._parsePathData(shape.style.path);
                        break;
                }
                
                if (this._selectedMode[mapType] &&
                     this._selected[name]
                     || (data.selected && this._selected[name] !== false) 
                ) {
                    textShape.style = textShape.highlightStyle;
                    shape.style = shape.highlightStyle;
                }
                
                if (this._selectedMode[mapType]) {
                    this._selected[name] = typeof this._selected[name] != 'undefined'
                                           ? this._selected[name]
                                           : data.selected;
                    this._mapTypeMap[name] = mapType;
                    
                    if (typeof data.selectable == 'undefined' || data.selectable) {
                        shape.clickable = textShape.clickable = true;
                        shape.onclick = textShape.onclick = this.shapeHandler.onclick;
                    }
                }
                
                if (this._hoverable[mapType]
                    && (typeof data.hoverable == 'undefined' || data.hoverable)
                ) {
                    textShape.hoverable = shape.hoverable = true;
                    shape.hoverConnect = textShape.id;
                    textShape.hoverConnect = shape.id;
                    shape.onmouseover = textShape.onmouseover = this.hoverConnect;
                }
                else {
                    textShape.hoverable = shape.hoverable = false;
                }
                
                // console.log(name,shape);
                ecData.pack(
                    textShape,
                    {
                        name: seriesName,
                        tooltip: this.deepQuery(queryTarget, 'tooltip')
                    },
                    0,
                    data, 0,
                    name
                );
                this.shapeList.push(textShape);
                
                ecData.pack(
                    shape,
                    {
                        name: seriesName,
                        tooltip: this.deepQuery(queryTarget, 'tooltip')
                    },
                    0,
                    data, 0,
                    name
                );
                this.shapeList.push(shape);
            }
            //console.log(this._selected);
        },
        
        // 添加标注
        _buildMark : function (mapType, mapSeries) {
            this._seriesIndexToMapType = this._seriesIndexToMapType || {};
            this.markAttachStyle = this.markAttachStyle || {};
            var position = [
                this._mapDataMap[mapType].transform.left,
                this._mapDataMap[mapType].transform.top
            ];
            for (var sIdx in mapSeries) {
                this._seriesIndexToMapType[sIdx] = mapType;
                this.markAttachStyle[sIdx] = {
                    position : position,
                    _mapType : mapType
                };
                this.buildMark(sIdx);
            }
        },
        
        // 位置转换
        getMarkCoord : function (seriesIndex, mpData) {
            return (mpData.geoCoord || _geoCoord[mpData.name])
                   ? this.geo2pos(
                         this._seriesIndexToMapType[seriesIndex], 
                         mpData.geoCoord || _geoCoord[mpData.name]
                     )
                   : [0, 0];
        },
        
        getMarkGeo : function(mpData) {
            return mpData.geoCoord || _geoCoord[mpData.name];
        },
        
        _nameChange : function (mapType, name) {
            return this._nameMap[mapType][name] || name;
        },
        
        /**
         * 根据lable.format计算label text
         */
        getLabelText : function (name, value, queryTarget, status) {
            var formatter = this.deepQuery(
                queryTarget,
                'itemStyle.' + status + '.label.formatter'
            );
            if (formatter) {
                if (typeof formatter == 'function') {
                    return formatter.call(
                        this.myChart,
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
        },
        
        _findMapTypeByPos : function (mx, my) {
            var transform;
            var left;
            var top;
            var width;
            var height;
            for (var mapType in this._mapDataMap) {
                transform = this._mapDataMap[mapType].transform;
                if (!transform || !this._roamMap[mapType]) {
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
        },
        
        /**
         * 滚轮缩放 
         */
        __onmousewheel : function (param) {
            if (this.shapeList.length <= 0) {
                return;
            }
            var event = param.event;
            var mx = zrEvent.getX(event);
            var my = zrEvent.getY(event);
            var delta = zrEvent.getDelta(event);
            //delta = delta > 0 ? (-1) : 1;
            var mapType = this._findMapTypeByPos(mx, my);
            if (mapType) {
                zrEvent.stop(event);
                var transform = this._mapDataMap[mapType].transform;
                var left = transform.left;
                var top = transform.top;
                var width = transform.width;
                var height = transform.height;
                // 位置转经纬度
                var geoAndPos = this.pos2geo(mapType, [mx - left, my - top]);
                if (delta > 0) {
                    delta = 1.2;        // 放大
                    if (typeof this._scaleLimitMap[mapType].max != 'undefined'
                        && transform.baseScale >= this._scaleLimitMap[mapType].max
                    ) {
                        return;     // 缩放限制
                    }
                }
                else {
                    delta = 1 / 1.2;    // 缩小
                    if (typeof this._scaleLimitMap[mapType].min != 'undefined'
                        && transform.baseScale <= this._scaleLimitMap[mapType].min
                    ) {
                        return;     // 缩放限制
                    }
                }
                transform.baseScale *= delta;
                transform.scale.x *= delta;
                transform.scale.y *= delta;
                transform.width = width * delta;
                transform.height = height * delta;
                
                this._mapDataMap[mapType].hasRoam = true;
                this._mapDataMap[mapType].transform = transform;
                // 经纬度转位置
                geoAndPos = this.geo2pos(mapType, geoAndPos);
                // 保持视觉中心
                transform.left -= geoAndPos[0] - (mx - left);
                transform.top -= geoAndPos[1] - (my - top);
                this._mapDataMap[mapType].transform = transform;
                
                this.clearEffectShape(true);
                for (var i = 0, l = this.shapeList.length; i < l; i++) {
                    if(this.shapeList[i]._mapType == mapType) {
                        this.shapeList[i].position[0] = transform.left;
                        this.shapeList[i].position[1] = transform.top;
                        if (this.shapeList[i].type == 'path' 
                            || this.shapeList[i].type == 'symbol'
                            || this.shapeList[i].type == 'circle'
                            || this.shapeList[i].type == 'rectangle'
                            || this.shapeList[i].type == 'polygon'
                            || this.shapeList[i].type == 'line'
                            || this.shapeList[i].type == 'ellipse'
                        ) {
                            this.shapeList[i].scale[0] *= delta;
                            this.shapeList[i].scale[1] *= delta;
                        }
                        else if (this.shapeList[i].type == 'mark-line') {
                            this.shapeList[i].style.pointListLength = undefined;
                            this.shapeList[i].style.pointList = false;
                            geoAndPos = this.geo2pos(mapType, this.shapeList[i]._geo[0]);
                            this.shapeList[i].style.xStart = geoAndPos[0];
                            this.shapeList[i].style.yStart = geoAndPos[1];
                            geoAndPos = this.geo2pos(mapType, this.shapeList[i]._geo[1]);
                            this.shapeList[i]._x = this.shapeList[i].style.xEnd = geoAndPos[0];
                            this.shapeList[i]._y = this.shapeList[i].style.yEnd = geoAndPos[1];
                        }
                        else if  (this.shapeList[i].type == 'icon') {
                            geoAndPos = this.geo2pos(mapType, this.shapeList[i]._geo);
                            this.shapeList[i].style.x = this.shapeList[i].style._x =
                                geoAndPos[0] - this.shapeList[i].style.width / 2;
                            this.shapeList[i].style.y = this.shapeList[i].style._y =
                                geoAndPos[1] - this.shapeList[i].style.height / 2;
                        }
                        else {
                            geoAndPos = this.geo2pos(mapType, this.shapeList[i]._geo);
                            this.shapeList[i].style.x = geoAndPos[0];
                            this.shapeList[i].style.y = geoAndPos[1];
                            if (this.shapeList[i].type == 'text') {
                                this.shapeList[i]._style.x = this.shapeList[i].highlightStyle.x
                                                           = geoAndPos[0];
                                this.shapeList[i]._style.y = this.shapeList[i].highlightStyle.y
                                                           = geoAndPos[1];
                            }
                        }
                        
                        this.zr.modShape(this.shapeList[i].id);
                    }
                }
                
                this.zr.refresh();
                
                var self = this;
                clearTimeout(this._refreshDelayTicket);
                this._refreshDelayTicket = setTimeout(
                    function(){
                        self && self.shapeList && self.animationEffect();
                    },
                    100
                );
                
                this.messageCenter.dispatch(
                    ecConfig.EVENT.MAP_ROAM,
                    param.event,
                    {type : 'scale'},
                    this.myChart
                );
            }
        },
        
        __onmousedown : function (param) {
            if (this.shapeList.length <= 0) {
                return;
            }
            var target = param.target;
            if (target && target.draggable) {
                return;
            }
            var event = param.event;
            var mx = zrEvent.getX(event);
            var my = zrEvent.getY(event);
            var mapType = this._findMapTypeByPos(mx, my);
            if (mapType) {
                this._mousedown = true;
                this._mx = mx;
                this._my = my;
                this._curMapType = mapType;
                
                this.zr.on(zrConfig.EVENT.MOUSEUP, this._onmouseup);
                var self = this;
                setTimeout(function (){
                    self.zr.on(zrConfig.EVENT.MOUSEMOVE, self._onmousemove);
                },100);
            }
            
        },
        
        __onmousemove : function (param) {
            if (!this._mousedown || !this._isAlive) {
                return;
            }
            var event = param.event;
            var mx = zrEvent.getX(event);
            var my = zrEvent.getY(event);
            var transform = this._mapDataMap[this._curMapType].transform;
            transform.hasRoam = true;
            transform.left -= this._mx - mx;
            transform.top -= this._my - my;
            this._mx = mx;
            this._my = my;
            this._mapDataMap[this._curMapType].transform = transform;
            
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                if(this.shapeList[i]._mapType == this._curMapType) {
                    this.shapeList[i].position[0] = transform.left;
                    this.shapeList[i].position[1] = transform.top;
                    this.zr.modShape(this.shapeList[i].id);
                }
            }
            
            this.messageCenter.dispatch(
                ecConfig.EVENT.MAP_ROAM,
                param.event,
                {type : 'move'},
                this.myChart
            );
            
            this.clearEffectShape(true);
            this.zr.refresh();
            
            this._justMove = true;
            zrEvent.stop(event);
        },
        
        __onmouseup : function (param) {
            var event = param.event;
            this._mx = zrEvent.getX(event);
            this._my = zrEvent.getY(event);
            this._mousedown = false;
            var self = this;
            setTimeout(function (){
                self._justMove && self.animationEffect();
                self._justMove = false;
                self.zr.un(zrConfig.EVENT.MOUSEMOVE, self._onmousemove);
                self.zr.un(zrConfig.EVENT.MOUSEUP, self._onmouseup);
            },120);
        },
        
        /**
         * 点击响应 
         */
        onclick : function (param) {
            if (!this.isClick || !param.target || this._justMove || param.target.type == 'icon') {
                // 没有在当前实例上发生点击直接返回
                return;
            }
            this.isClick = false;

            var target = param.target;
            var name = target.style._name;
            var len = this.shapeList.length;
            var mapType = target._mapType || '';
            
            if (this._selectedMode[mapType] == 'single') {
                for (var p in this._selected) {
                    // 同一地图类型
                    if (this._selected[p] && this._mapTypeMap[p] == mapType) {
                        // 复位那些生效shape（包括文字）
                        for (var i = 0; i < len; i++) {
                            if (this.shapeList[i].style._name == p 
                                && this.shapeList[i]._mapType == mapType
                            ) {
                                this.shapeList[i].style = this.shapeList[i]._style;
                                this.zr.modShape(this.shapeList[i].id);
                            }
                        }
                        p != name && (this._selected[p] = false);
                    }
                }
            }

            this._selected[name] = !this._selected[name];
            
            // 更新当前点击shape（包括文字）
            for (var i = 0; i < len; i++) {
                if (this.shapeList[i].style._name == name
                    && this.shapeList[i]._mapType == mapType
                ) {
                   if (this._selected[name]) {
                        this.shapeList[i].style = this.shapeList[i].highlightStyle;
                    }
                    else {
                        this.shapeList[i].style = this.shapeList[i]._style;
                    }
                    this.zr.modShape(this.shapeList[i].id);
                }
            }
            this.messageCenter.dispatch(
                ecConfig.EVENT.MAP_SELECTED,
                param.event,
                {
                    selected : this._selected,
                    target : name
                },
                this.myChart
            );
            this.zr.refresh();
            
            var self = this;
            setTimeout(function(){
                self.zr.trigger(
                    zrConfig.EVENT.MOUSEMOVE,
                    param.event
                );
            },100);
        },

        /**
         * 刷新
         */
        refresh : function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            
            if (this._mapDataRequireCounter > 0) {
                this.clear();
            }
            else {
                this.backupShapeList();
            }
            this._buildShape();
            this.zr.refreshHover();
        },
        
        /**
         * 值域响应
         * @param {Object} param
         * @param {Object} status
         */
        ondataRange : function (param, status) {
            if (this.component.dataRange) {
                this.refresh();
                status.needRefresh = true;
            }
            return;
        },
        
        /**
         * 平面坐标转经纬度
         */
        pos2geo : function (mapType, p) {
            if (!this._mapDataMap[mapType].transform) {
                return null;
            }
            return this._mapDataMap[mapType].projection.pos2geo(
                this._mapDataMap[mapType].transform, p
            );
        },
        
        /**
         * 公开接口 : 平面坐标转经纬度
         */
        getGeoByPos : function (mapType, p) {
            if (!this._mapDataMap[mapType].transform) {
                return null;
            }
            var position = [
                this._mapDataMap[mapType].transform.left,
                this._mapDataMap[mapType].transform.top
            ];
            if (p instanceof Array) {
                p[0] -= position[0];
                p[1] -= position[1];
            }
            else {
                p.x -= position[0];
                p.y -= position[1];
            }
            return this.pos2geo(mapType, p);
        },
        
        /**
         * 经纬度转平面坐标
         * @param {Object} p
         */
        geo2pos : function (mapType, p) {
            if (!this._mapDataMap[mapType].transform) {
                return null;
            }
            return this._mapDataMap[mapType].projection.geo2pos(
                this._mapDataMap[mapType].transform, p
            );
        },
        
        /**
         * 公开接口 : 经纬度转平面坐标
         */
        getPosByGeo : function (mapType, p) {
            if (!this._mapDataMap[mapType].transform) {
                return null;
            }
            var pos = this.geo2pos(mapType, p);
            pos[0] += this._mapDataMap[mapType].transform.left;
            pos[1] += this._mapDataMap[mapType].transform.top;
            return pos;
        },
        
        /**
         * 公开接口 : 地图参考坐标
         */
        getMapPosition : function (mapType) {
            if (!this._mapDataMap[mapType].transform) {
                return null;
            }
            return [
                this._mapDataMap[mapType].transform.left,
                this._mapDataMap[mapType].transform.top
            ];
        },
        
        /*
        appendShape : function (mapType, shapeList) {
            shapeList = shapeList instanceof Array
                        ? shapeList : [shapeList];
            for (var i = 0, l = shapeList.length; i < l; i++) {
                if (typeof shapeList[i].zlevel == 'undefined') {
                    shapeList[i].zlevel = this._zlevelBase + 1;
                }
                shapeList[i]._mapType = mapType;
                this.shapeList.push(shapeList[i]);
                this.zr.addShape(shapeList[i]);
            }
            this.zr.refresh();
        },
        */
       
        /**
         * 释放后实例不可用
         */
        dispose : function () {
            this.clear();
            this.shapeList = null;
            this.effectList = null;
            this._isAlive = false;
            if (this._needRoam) {
                this.zr.un(zrConfig.EVENT.MOUSEWHEEL, this._onmousewheel);
                this.zr.un(zrConfig.EVENT.MOUSEDOWN, this._onmousedown);
            }
        }
    };
    
    zrUtil.inherits(Map, ChartBase);
    zrUtil.inherits(Map, ComponentBase);
    
    // 图表注册
    require('../chart').define('map', Map);
    
    return Map;
});