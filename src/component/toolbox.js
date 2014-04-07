/**
 * echarts组件：工具箱
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
     * @param {HtmlElement} dom 目标对象
     * @param {ECharts} myChart 当前图表实例
     */
    function Toolbox(ecConfig, messageCenter, zr, dom, myChart) {
        var Base = require('./base');
        Base.call(this, ecConfig, zr);

        var zrConfig = require('zrender/config');
        var zrUtil = require('zrender/tool/util');
        var zrEvent = require('zrender/tool/event');

        var option;
        var component;
        
        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_TOOLBOX;
        
        var _canvasSupported = require('zrender/tool/env').canvasSupported;
        
        var _zlevelBase = self.getZlevelBase();
        var _magicType = {};
        var _magicMap;
        var _isSilence = false;
        
        var _iconList;
        var _iconShapeMap = {};
        var _itemGroupLocation;
        var _featureTitle = {};             // 文字
        var _featureIcon = {};              // 图标
        var _featureColor = {};             // 颜色
        var _enableColor = 'red';
        var _disableColor = '#ccc';
        var _markStart;
        var _marking;
        var _markShape;
        
        var _zoomStart;
        var _zooming;
        var _zoomShape;
        var _zoomQueue;

        var _dataView;
        
        var _MAGICTYPE_STACK = 'stack';
        var _MAGICTYPE_TILED = 'tiled';

        function _buildShape() {
            _iconList = [];
            var feature = option.toolbox.feature;
            var iconName = [];
            for (var key in feature){
                if (feature[key].show) {
                    switch (key) {
                        case 'mark' :
                            iconName.push({key : key, name : 'mark'});
                            iconName.push({key : key, name : 'markUndo'});
                            iconName.push({key : key, name : 'markClear'});
                            break;
                        case 'magicType' :
                            for (var i = 0, l = feature[key].type.length; i < l; i++) {
                                feature[key].title[feature[key].type[i] + 'Chart']
                                    = feature[key].title[feature[key].type[i]];
                                iconName.push({key : key, name : feature[key].type[i] + 'Chart'});
                            }
                            break;
                        case 'dataZoom' :
                            iconName.push({key : key, name : 'dataZoom'});
                            iconName.push({key : key, name : 'dataZoomReset'});
                            break;
                        case 'saveAsImage' :
                            if (_canvasSupported) {
                                iconName.push({key : key, name : 'saveAsImage'});
                            }
                            break;
                        default :
                            iconName.push({key : key, name : key});
                            break;
                    }
                }
            }
            if (iconName.length > 0) {
                var name;
                var key;
                for (var i = 0, l = iconName.length; i < l; i++) {
                    name = iconName[i].name;
                    key = iconName[i].key;
                    _iconList.push(name);
                    _featureTitle[name] = feature[key].title[name] || feature[key].title;
                    if (feature[key].icon) {
                        _featureIcon[name] = feature[key].icon[name] || feature[key].icon;
                    }
                    if (feature[key].color) {
                        _featureColor[name] = feature[key].color[name] || feature[key].color;
                    }
                }
                _itemGroupLocation = _getItemGroupLocation();

                _buildBackground();
                _buildItem();

                for (var i = 0, l = self.shapeList.length; i < l; i++) {
                    self.shapeList[i].id = zr.newShapeId(self.type);
                    zr.addShape(self.shapeList[i]);
                }
                if (_iconShapeMap['mark']) {
                    _iconDisable(_iconShapeMap['markUndo']);
                    _iconDisable(_iconShapeMap['markClear']);
                }
                if (_iconShapeMap['dataZoomReset'] && _zoomQueue.length === 0) {
                    _iconDisable(_iconShapeMap['dataZoomReset']);
                }
            }
        }

        /**
         * 构建所有图例元素
         */
        function _buildItem() {
            var toolboxOption = option.toolbox;
            var iconLength = _iconList.length;
            var lastX = _itemGroupLocation.x;
            var lastY = _itemGroupLocation.y;
            var itemSize = toolboxOption.itemSize;
            var itemGap = toolboxOption.itemGap;
            var itemShape;

            var color = toolboxOption.color instanceof Array
                        ? toolboxOption.color : [toolboxOption.color];
            
            var textFont = self.getFont(toolboxOption.textStyle);
            var textPosition;
            var textAlign;
            var textBaseline;
            if (toolboxOption.orient == 'horizontal') {
                textPosition = _itemGroupLocation.y / zr.getHeight() < 0.5
                               ? 'bottom' : 'top';
                textAlign = _itemGroupLocation.x / zr.getWidth() < 0.5
                            ? 'left' : 'right';
                textBaseline = _itemGroupLocation.y / zr.getHeight() < 0.5
                               ? 'top' : 'bottom';
            }
            else {
                textPosition = _itemGroupLocation.x / zr.getWidth() < 0.5
                               ? 'right' : 'left';
                /*
                textAlign = _itemGroupLocation.x / zr.getWidth() < 0.5
                               ? 'right' : 'left';
                textBaseline = 'top';
                */
            }
            
           _iconShapeMap = {};

            for (var i = 0; i < iconLength; i++) {
                // 图形
                itemShape = {
                    shape : 'icon',
                    zlevel : _zlevelBase,
                    style : {
                        x : lastX,
                        y : lastY,
                        width : itemSize,
                        height : itemSize,
                        iconType : _iconList[i],
                        lineWidth : 1,
                        strokeColor : _featureColor[_iconList[i]] || color[i % color.length],
                        brushType: 'stroke'
                    },
                    highlightStyle : {
                        lineWidth : 2,
                        text : toolboxOption.showTitle 
                               ? _featureTitle[_iconList[i]]
                               : undefined,
                        textFont : textFont,
                        textPosition : textPosition,
                        strokeColor : _featureColor[_iconList[i]] || color[i % color.length]
                    },
                    hoverable : true,
                    clickable : true
                };
                
                if (_featureIcon[_iconList[i]]) {
                    itemShape.style.image = _featureIcon[_iconList[i]].replace(
                        new RegExp('^image:\\/\\/'), ''
                    );
                    itemShape.style.opacity = 0.8;
                    itemShape.highlightStyle.opacity = 1;
                    itemShape.shape = 'image';
                }
                
                if (toolboxOption.orient == 'horizontal') {
                    // 修正左对齐第一个或右对齐最后一个
                    if (i === 0 && textAlign == 'left') {
                        itemShape.highlightStyle.textPosition = 'specific';
                        itemShape.highlightStyle.textAlign = textAlign;
                        itemShape.highlightStyle.textBaseline = textBaseline;
                        itemShape.highlightStyle.textX = lastX;
                        itemShape.highlightStyle.textY = textBaseline == 'top' 
                                                     ? lastY + itemSize + 10
                                                     : lastY - 10;
                    }
                    if (i == iconLength - 1 && textAlign == 'right') {
                        itemShape.highlightStyle.textPosition = 'specific';
                        itemShape.highlightStyle.textAlign = textAlign;
                        itemShape.highlightStyle.textBaseline = textBaseline;
                        itemShape.highlightStyle.textX = lastX + itemSize;
                        itemShape.highlightStyle.textY = textBaseline == 'top' 
                                                     ? lastY + itemSize + 10
                                                     : lastY - 10;
                    }
                }

                switch(_iconList[i]) {
                    case 'mark':
                        itemShape.onclick = _onMark;
                        break;
                    case 'markUndo':
                        itemShape.onclick = _onMarkUndo;
                        break;
                    case 'markClear':
                        itemShape.onclick = _onMarkClear;
                        break;
                    case 'dataZoom':
                        itemShape.onclick = _onDataZoom;
                        break;
                    case 'dataZoomReset':
                        itemShape.onclick = _onDataZoomReset;
                        break;
                    case 'dataView' :
                        if (!_dataView) {
                            var componentLibrary = require('../component');
                            var DataView = componentLibrary.get('dataView');
                            _dataView = new DataView(
                                ecConfig, messageCenter, zr, option, dom
                            );
                        }
                        itemShape.onclick = _onDataView;
                        break;
                    case 'restore':
                        itemShape.onclick = _onRestore;
                        break;
                    case 'saveAsImage':
                        itemShape.onclick = _onSaveAsImage;
                        break;
                    default:
                        if (_iconList[i].match('Chart')) {
                            itemShape._name = _iconList[i].replace('Chart', '');
                            if (_magicType[itemShape._name]) {
                                itemShape.style.strokeColor = _enableColor;
                            }
                            itemShape.onclick = _onMagicType;
                        }
                        else {
                            itemShape.onclick = _onCustomHandler;
                        }
                        break;
                }

                self.shapeList.push(itemShape);
                _iconShapeMap[_iconList[i]] = itemShape;

                if (toolboxOption.orient == 'horizontal') {
                    lastX += itemSize + itemGap;
                }
                else {
                    lastY += itemSize + itemGap;
                }
            }
        }

        function _buildBackground() {
            var toolboxOption = option.toolbox;
            var pTop = toolboxOption.padding[0];
            var pRight = toolboxOption.padding[1];
            var pBottom = toolboxOption.padding[2];
            var pLeft = toolboxOption.padding[3];

            self.shapeList.push({
                shape : 'rectangle',
                zlevel : _zlevelBase,
                hoverable :false,
                style : {
                    x : _itemGroupLocation.x - pLeft,
                    y : _itemGroupLocation.y - pTop,
                    width : _itemGroupLocation.width + pLeft + pRight,
                    height : _itemGroupLocation.height + pTop + pBottom,
                    brushType : toolboxOption.borderWidth === 0
                                ? 'fill' : 'both',
                    color : toolboxOption.backgroundColor,
                    strokeColor : toolboxOption.borderColor,
                    lineWidth : toolboxOption.borderWidth
                }
            });
        }

        /**
         * 根据选项计算图例实体的位置坐标
         */
        function _getItemGroupLocation() {
            var toolboxOption = option.toolbox;
            var iconLength = _iconList.length;
            var itemGap = toolboxOption.itemGap;
            var itemSize = toolboxOption.itemSize;
            var totalWidth = 0;
            var totalHeight = 0;

            if (toolboxOption.orient == 'horizontal') {
                // 水平布局，计算总宽度，别忘减去最后一个的itemGap
                totalWidth = (itemSize + itemGap) * iconLength - itemGap;
                totalHeight = itemSize;
            }
            else {
                // 垂直布局，计算总高度
                totalHeight = (itemSize + itemGap) * iconLength - itemGap;
                totalWidth = itemSize;
            }

            var x;
            var zrWidth = zr.getWidth();
            switch (toolboxOption.x) {
                case 'center' :
                    x = Math.floor((zrWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = toolboxOption.padding[3] + toolboxOption.borderWidth;
                    break;
                case 'right' :
                    x = zrWidth
                        - totalWidth
                        - toolboxOption.padding[1]
                        - toolboxOption.borderWidth;
                    break;
                default :
                    x = toolboxOption.x - 0;
                    x = isNaN(x) ? 0 : x;
                    break;
            }

            var y;
            var zrHeight = zr.getHeight();
            switch (toolboxOption.y) {
                case 'top' :
                    y = toolboxOption.padding[0] + toolboxOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - toolboxOption.padding[2]
                        - toolboxOption.borderWidth;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = toolboxOption.y - 0;
                    y = isNaN(y) ? 0 : y;
                    break;
            }

            return {
                x : x,
                y : y,
                width : totalWidth,
                height : totalHeight
            };
        }

        function _onMark(param) {
            var target = param.target;
            if (_marking || _markStart) {
                // 取消
                _resetMark();
                zr.refresh();
            }
            else {
                // 启用Mark
                _resetZoom();   // mark与dataZoom互斥
                
                zr.modShape(target.id, {style: {strokeColor: _enableColor}});
                zr.refresh();
                _markStart = true;
                setTimeout(function(){
                    zr
                    && zr.on(zrConfig.EVENT.CLICK, _onclick)
                    && zr.on(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
                }, 10);
            }
            return true; // 阻塞全局事件
        }
        
        function _onDataZoom(param) {
            var target = param.target;
            if (_zooming || _zoomStart) {
                // 取消
                _resetZoom();
                zr.refresh();
                dom.style.cursor = 'default';
            }
            else {
                // 启用Zoom
                _resetMark();   // mark与dataZoom互斥
                
                zr.modShape(target.id, {style: {strokeColor: _enableColor}});
                zr.refresh();
                _zoomStart = true;
                setTimeout(function(){
                    zr
                    && zr.on(zrConfig.EVENT.MOUSEDOWN, _onmousedown)
                    && zr.on(zrConfig.EVENT.MOUSEUP, _onmouseup)
                    && zr.on(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
                }, 10);
                
                dom.style.cursor = 'crosshair';
            }
            return true; // 阻塞全局事件
        }

        function _onmousemove(param) {
            if (_marking) {
                _markShape.style.xEnd = zrEvent.getX(param.event);
                _markShape.style.yEnd = zrEvent.getY(param.event);
                zr.addHoverShape(_markShape);
            }
            if (_zooming) {
                _zoomShape.style.width = 
                    zrEvent.getX(param.event) - _zoomShape.style.x;
                _zoomShape.style.height = 
                    zrEvent.getY(param.event) - _zoomShape.style.y;
                zr.addHoverShape(_zoomShape);
                dom.style.cursor = 'crosshair';
            }
            if (_zoomStart
                && (dom.style.cursor != 'pointer' && dom.style.cursor != 'move')
            ) {
                dom.style.cursor = 'crosshair';
            }
        }

        function _onmousedown(param) {
            if (param.target) {
                return;
            }
            _zooming = true;
            var x = zrEvent.getX(param.event);
            var y = zrEvent.getY(param.event);
            var zoomOption = option.dataZoom || {};
            _zoomShape = {
                shape : 'rectangle',
                id : zr.newShapeId('zoom'),
                zlevel : _zlevelBase,
                style : {
                    x : x,
                    y : y,
                    width : 1,
                    height : 1,
                    brushType: 'both'
                },
                highlightStyle : {
                    lineWidth : 2,
                    color: zoomOption.fillerColor 
                           || ecConfig.dataZoom.fillerColor,
                    strokeColor : zoomOption.handleColor 
                                  || ecConfig.dataZoom.handleColor,
                    brushType: 'both'
                }
            };
            zr.addHoverShape(_zoomShape);
            return true; // 阻塞全局事件
        }
        
        function _onmouseup(/*param*/) {
            if (!_zoomShape 
                || Math.abs(_zoomShape.style.width) < 10 
                || Math.abs(_zoomShape.style.height) < 10
            ) {
                _zooming = false;
                return true;
            }
            if (_zooming && component.dataZoom) {
                _zooming = false;
                
                var zoom = component.dataZoom.rectZoom(_zoomShape.style);
                if (zoom) {
                    _zoomQueue.push({
                        start : zoom.start,
                        end : zoom.end,
                        start2 : zoom.start2,
                        end2 : zoom.end2
                    });
                    _iconEnable(_iconShapeMap['dataZoomReset']);
                    zr.refresh();
                }
            }
            return true; // 阻塞全局事件
        }
        
        function _onclick(param) {
            if (_marking) {
                _marking = false;
                self.shapeList.push(_markShape);
                _iconEnable(_iconShapeMap['markUndo']);
                _iconEnable(_iconShapeMap['markClear']);
                zr.addShape(_markShape);
                zr.refresh();
            } else if (_markStart) {
                _marking = true;
                var x = zrEvent.getX(param.event);
                var y = zrEvent.getY(param.event);
                _markShape = {
                    shape : 'line',
                    id : zr.newShapeId('mark'),
                    zlevel : _zlevelBase,
                    style : {
                        xStart : x,
                        yStart : y,
                        xEnd : x,
                        yEnd : y,
                        lineWidth : self.query(
                                        option,
                                        'toolbox.feature.mark.lineStyle.width'
                                    ),
                        strokeColor : self.query(
                                          option,
                                          'toolbox.feature.mark.lineStyle.color'
                                      ),
                        lineType : self.query(
                                       option,
                                       'toolbox.feature.mark.lineStyle.type'
                                   )
                    }
                };
                zr.addHoverShape(_markShape);
            }
        }

        function _onMarkUndo() {
            if (_marking) {
                _marking = false;
            } else {
                var len = self.shapeList.length - 1;    // 有一个是背景shape
                if (_iconList.length == len - 1) {
                    _iconDisable(_iconShapeMap['markUndo']);
                    _iconDisable(_iconShapeMap['markClear']);
                }
                if (_iconList.length < len) {
                    var target = self.shapeList[self.shapeList.length - 1];
                    zr.delShape(target.id);
                    zr.refresh();
                    self.shapeList.pop();
                }
            }
            return true;
        }

        function _onMarkClear() {
            if (_marking) {
                _marking = false;
            }
            // 有一个是背景shape
            var len = self.shapeList.length - _iconList.length - 1;
            var hasClear = false;
            while(len--) {
                zr.delShape(self.shapeList.pop().id);
                hasClear = true;
            }
            if (hasClear) {
                _iconDisable(_iconShapeMap['markUndo']);
                _iconDisable(_iconShapeMap['markClear']);
                zr.refresh();
            }
            return true;
        }
        
        function _onDataZoomReset() {
            if (_zooming) {
                _zooming = false;
            }
            _zoomQueue.pop();
            //console.log(_zoomQueue)
            if (_zoomQueue.length > 0) {
                component.dataZoom.absoluteZoom(
                    _zoomQueue[_zoomQueue.length - 1]
                );
            }
            else {
                component.dataZoom.rectZoom();
                _iconDisable(_iconShapeMap['dataZoomReset']);
                zr.refresh();
            }
            
            return true;
        }

        function _resetMark() {
            _marking = false;
            if (_markStart) {
                _markStart = false;
                if (_iconShapeMap['mark']) {
                    // 还原图标为未生效状态
                    zr.modShape(
                        _iconShapeMap['mark'].id,
                        {
                            style: {
                                strokeColor: _iconShapeMap['mark']
                                                 .highlightStyle
                                                 .strokeColor
                            }
                         }
                    );
                }
                
                zr.un(zrConfig.EVENT.CLICK, _onclick);
                zr.un(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
            }
        }
        
        function _resetZoom() {
            _zooming = false;
            if (_zoomStart) {
                _zoomStart = false;
                if (_iconShapeMap['dataZoom']) {
                    // 还原图标为未生效状态
                    zr.modShape(
                        _iconShapeMap['dataZoom'].id,
                        {
                            style: {
                                strokeColor: _iconShapeMap['dataZoom']
                                                 .highlightStyle
                                                 .strokeColor
                            }
                         }
                    );
                }
                
                zr.un(zrConfig.EVENT.MOUSEDOWN, _onmousedown);
                zr.un(zrConfig.EVENT.MOUSEUP, _onmouseup);
                zr.un(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
            }
        }

        function _iconDisable(target) {
            if (target.shape != 'image') {
                zr.modShape(target.id, {
                    hoverable : false,
                    clickable : false,
                    style : {
                        strokeColor : _disableColor
                    }
                });
            }
            else {
                zr.modShape(target.id, {
                    hoverable : false,
                    clickable : false,
                    style : {
                        opacity : 0.3
                    }
                });
            }
        }

        function _iconEnable(target) {
            if (target.shape != 'image') {
                zr.modShape(target.id, {
                    hoverable : true,
                    clickable : true,
                    style : {
                        strokeColor : target.highlightStyle.strokeColor
                    }
                });
            }
            else {
                zr.modShape(target.id, {
                    hoverable : true,
                    clickable : true,
                    style : {
                        opacity : 0.8
                    }
                });
            }
        }

        function _onDataView() {
            _dataView.show(option);
            return true;
        }

        function _onRestore(){
            _resetMark();
            _resetZoom();
            messageCenter.dispatch(ecConfig.EVENT.RESTORE);
            return true;
        }
        
        function _onSaveAsImage() {
            var saveOption = option.toolbox.feature.saveAsImage;
            var imgType = saveOption.type || 'png';
            if (imgType != 'png' && imgType != 'jpeg') {
                imgType = 'png';
            }
            
            var image;
            if (!myChart.isConnected()) {
                image = zr.toDataURL(
                    'image/' + imgType,
                    option.backgroundColor 
                    && option.backgroundColor.replace(' ','') == 'rgba(0,0,0,0)'
                        ? '#fff' : option.backgroundColor
                );
            }
            else {
                image = myChart.getConnectedDataURL(imgType);
            }
             
            var downloadDiv = document.createElement('div');
            downloadDiv.id = '__echarts_download_wrap__';
            downloadDiv.style.cssText = 'position:fixed;'
                + 'z-index:99999;'
                + 'display:block;'
                + 'top:0;left:0;'
                + 'background-color:rgba(33,33,33,0.5);'
                + 'text-align:center;'
                + 'width:100%;'
                + 'height:100%;'
                + 'line-height:' 
                + document.documentElement.clientHeight + 'px;';
                
            var downloadLink = document.createElement('a');
            //downloadLink.onclick = _saveImageForIE;
            downloadLink.href = image;
            downloadLink.setAttribute(
                'download',
                (saveOption.name 
                 ? saveOption.name 
                 : (option.title && (option.title.text || option.title.subtext))
                   ? (option.title.text || option.title.subtext)
                   : 'ECharts')
                + '.' + imgType 
            );
            downloadLink.innerHTML = '<img style="vertical-align:middle" src="' + image 
                + '" title="'
                + (!!(window.attachEvent 
                     && navigator.userAgent.indexOf('Opera') === -1)
                  ? '右键->图片另存为'
                  : (saveOption.lang ? saveOption.lang[0] : '点击保存'))
                + '"/>';
            
            downloadDiv.appendChild(downloadLink);
            document.body.appendChild(downloadDiv);
            downloadLink = null;
            downloadDiv = null;
            
            setTimeout(function(){
                var _d = document.getElementById('__echarts_download_wrap__');
                if (_d) {
                    _d.onclick = function () {
                        var d = document.getElementById(
                            '__echarts_download_wrap__'
                        );
                        d.onclick = null;
                        d.innerHTML = '';
                        document.body.removeChild(d);
                        d = null;
                    };
                    _d = null;
                }
            }, 500);
            
            /*
            function _saveImageForIE() {
                window.win = window.open(image);
                win.document.execCommand("SaveAs");
                win.close()
            }
            */
            return;
        }

        function _onMagicType(param) {
            _resetMark();
            var itemName = param.target._name;
            if (_magicType[itemName]) {
                // 取消
                _magicType[itemName] = false;
            }
            else {
                // 启用
                _magicType[itemName] = true;
                // 折柱互斥
                if (itemName == ecConfig.CHART_TYPE_LINE) {
                    _magicType[ecConfig.CHART_TYPE_BAR] = false;
                }
                else if (itemName == ecConfig.CHART_TYPE_BAR) {
                    _magicType[ecConfig.CHART_TYPE_LINE] = false;
                }
                // 堆叠平铺互斥
                if (itemName == _MAGICTYPE_STACK) {
                    _magicType[_MAGICTYPE_TILED] = false;
                }
                else if (itemName == _MAGICTYPE_TILED) {
                    _magicType[_MAGICTYPE_STACK] = false;
                }
            }
            messageCenter.dispatch(
                ecConfig.EVENT.MAGIC_TYPE_CHANGED,
                param.event,
                {magicType : _magicType}
            );
            return true;
        }
        
        function setMagicType(magicType) {
            _resetMark();
            _magicType = magicType;
            
            !_isSilence && messageCenter.dispatch(
                ecConfig.EVENT.MAGIC_TYPE_CHANGED,
                null,
                {magicType : _magicType}
            );
        }
        
        // 用户自定义扩展toolbox方法
        function _onCustomHandler(param) {
            var target = param.target.style.iconType;
            var featureHandler = option.toolbox.feature[target].onclick;
            if (typeof featureHandler === 'function') {
                featureHandler(option);
            }
        }

        // 重置备份还原状态等
        function reset(newOption) {
            if (self.query(newOption, 'toolbox.show')
                && self.query(newOption, 'toolbox.feature.magicType.show')
            ) {
                var magicType = newOption.toolbox.feature.magicType.type;
                var len = magicType.length;
                _magicMap = {};     // 标识可控类型
                while (len--) {
                    _magicMap[magicType[len]] = true;
                }

                len = newOption.series.length;
                var oriType;        // 备份还原可控类型
                var axis;
                while (len--) {
                    oriType = newOption.series[len].type;
                    if (_magicMap[oriType]) {
                        axis = newOption.xAxis instanceof Array
                               ? newOption.xAxis[
                                     newOption.series[len].xAxisIndex || 0
                                 ]
                               : newOption.xAxis;
                        if (axis && (axis.type || 'category') == 'category') {
                            axis.__boundaryGap =
                                typeof axis.boundaryGap != 'undefined'
                                ? axis.boundaryGap : true;
                        }
                        axis = newOption.yAxis instanceof Array
                               ? newOption.yAxis[
                                     newOption.series[len].yAxisIndex || 0
                                 ]
                               : newOption.yAxis;
                        if (axis && axis.type == 'category') {
                            axis.__boundaryGap =
                                typeof axis.boundaryGap != 'undefined'
                                ? axis.boundaryGap : true;
                        }
                        newOption.series[len].__type = oriType;
                        // 避免不同类型图表类型的样式污染
                        newOption.series[len].__itemStyle = 
                            newOption.series[len].itemStyle
                            ? zrUtil.clone(
                                  newOption.series[len].itemStyle
                              )
                            : {};
                    }
                    
                    if (_magicMap[_MAGICTYPE_STACK] || _magicMap[_MAGICTYPE_TILED]) {
                        newOption.series[len].__stack = newOption.series[len].stack;
                    }
                }
            }
            _magicType = {};
            
            // 框选缩放
            var zoomOption = newOption.dataZoom;
            if (zoomOption && zoomOption.show) {
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
                _zoomQueue = [{
                    start : start,
                    end : end,
                    start2 : 0,
                    end2 : 100
                }];
            }
            else {
                _zoomQueue = [];
            }
        }
        
        function getMagicOption(){
            var axis;
            if (_magicType[ecConfig.CHART_TYPE_LINE] || _magicType[ecConfig.CHART_TYPE_BAR]) {
                // 图表类型有切换
                var boundaryGap = _magicType[ecConfig.CHART_TYPE_LINE] ? false : true;
                for (var i = 0, l = option.series.length; i < l; i++) {
                    if (_magicMap[option.series[i].type]) {
                        option.series[i].type = _magicType[ecConfig.CHART_TYPE_LINE]
                                                ? ecConfig.CHART_TYPE_LINE
                                                : ecConfig.CHART_TYPE_BAR;
                        // 避免不同类型图表类型的样式污染
                        option.series[i].itemStyle = zrUtil.clone(
                            option.series[i].__itemStyle
                        );
                        
                        axis = option.xAxis instanceof Array
                               ? option.xAxis[option.series[i].xAxisIndex || 0]
                               : option.xAxis;
                        if (axis && (axis.type || 'category') == 'category') {
                            axis.boundaryGap = 
                                boundaryGap ? true : axis.__boundaryGap;
                        }
                        axis = option.yAxis instanceof Array
                               ? option.yAxis[option.series[i].yAxisIndex || 0]
                               : option.yAxis;
                        if (axis && axis.type == 'category') {
                            axis.boundaryGap = 
                                boundaryGap ? true : axis.__boundaryGap;
                        }
                    }
                }
            }
            else {
                // 图表类型无切换
                for (var i = 0, l = option.series.length; i < l; i++) {
                    if (_magicMap[option.series[i].type]) {
                        option.series[i].type = option.series[i].__type;
                        // 避免不同类型图表类型的样式污染
                        option.series[i].itemStyle = 
                            option.series[i].__itemStyle;
                        
                        axis = option.xAxis instanceof Array
                               ? option.xAxis[option.series[i].xAxisIndex || 0]
                               : option.xAxis;
                        if (axis && (axis.type || 'category') == 'category') {
                            axis.boundaryGap = axis.__boundaryGap;
                        }
                        axis = option.yAxis instanceof Array
                               ? option.yAxis[option.series[i].yAxisIndex || 0]
                               : option.yAxis;
                        if (axis && axis.type == 'category') {
                            axis.boundaryGap = axis.__boundaryGap;
                        }
                    }
                }
            }
            
            if (_magicType[_MAGICTYPE_STACK] || _magicType[_MAGICTYPE_TILED]) {
                // 有堆叠平铺切换
                for (var i = 0, l = option.series.length; i < l; i++) {
                    if (_magicType[_MAGICTYPE_STACK]) {
                        // 启用堆叠
                        option.series[i].stack = '_ECHARTS_STACK_KENER_2014_';
                    }
                    else if (_magicType[_MAGICTYPE_TILED]) {
                        // 启用平铺
                        option.series[i].stack = null;
                    }
                }
            }
            else {
                // 无堆叠平铺切换
                for (var i = 0, l = option.series.length; i < l; i++) {
                    option.series[i].stack = option.series[i].__stack;
                }
            }

            return option;
        }

        function silence(s) {
            _isSilence = s;
        }
        
        function render(newOption, newComponent){
            _resetMark();
            _resetZoom();
            newOption.toolbox = self.reformOption(newOption.toolbox);
            // 补全padding属性
            newOption.toolbox.padding = self.reformCssArray(
                newOption.toolbox.padding
            );
            option = newOption;
            component = newComponent;

            self.shapeList = [];

            if (newOption.toolbox.show) {
                _buildShape();
            }

            hideDataView();
        }

        function resize() {
            _resetMark();
            self.clear();
            if (option && option.toolbox && option.toolbox.show) {
               _buildShape();
            }
            if (_dataView) {
                _dataView.resize();
            }
        }

        function hideDataView() {
            if (_dataView) {
                _dataView.hide();
            }
        }

        /**
         * 释放后实例不可用
         */
        function dispose() {
            if (_dataView) {
                _dataView.dispose();
                _dataView = null;
            }

            self.clear();
            self.shapeList = null;
            self = null;
        }
        
        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                newOption.toolbox = self.reformOption(newOption.toolbox);
                // 补全padding属性
                newOption.toolbox.padding = self.reformCssArray(
                    newOption.toolbox.padding
                );
                option = newOption;
            }
        }

        // 重载基类方法
        self.dispose = dispose;

        self.render = render;
        self.resize = resize;
        self.hideDataView = hideDataView;
        self.getMagicOption = getMagicOption;
        self.silence = silence;
        self.setMagicType = setMagicType;
        self.reset = reset;
        self.refresh = refresh;
    }

    require('../component').define('toolbox', Toolbox);
    
    return Toolbox;
});
