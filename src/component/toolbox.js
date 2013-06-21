/**
 * echarts组件：工具箱
 * Copyright 2013 Baidu Inc. All rights reserved.
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
     */
    function Toolbox(messageCenter, zr, dom) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');
        var zrConfig = require('zrender/config');
        var zrEvent = require('zrender/tool/event');

        var option;
        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_TOOLBOX;

        var _zlevelBase = self.getZlevelBase();
        var _magicType;
        var _magicMap;
        var _iconList;
        var _iconShapeMap = {};
        var _itemGroupLocation;
        var _enableColor = 'red';
        var _disableColor = '#ccc';
        var _markColor;
        var _markStart;
        var _marking;
        var _markShape;

        var _markPencil;
        var _dataView;

        function _buildShape() {
            _iconList = [];
            var feature = option.toolbox.feature;
            for (var key in feature){
                if (feature[key]) {
                    if (key == 'mark') {
                        _iconList.push('mark');
                        _iconList.push('markUndo');
                        _iconList.push('markClear');
                    }
                    else if (key == 'magicType') {
                        for (var i = 0, l = feature[key].length; i < l; i++) {
                            _iconList.push(feature[key][i] + 'Chart');
                        }
                    }
                    else {
                        _iconList.push(key);
                    }
                }
            }
            if (_iconList.length > 0) {
                _itemGroupLocation = _getItemGroupLocation();

                _buildBackground();
                _buildItem();

                for (var i = 0, l = self.shapeList.length; i < l; i++) {
                    self.shapeList[i].id = zr.newShapeId(self.type);
                    zr.addShape(self.shapeList[i]);
                }
                _iconDisable(_iconShapeMap['markUndo']);
                _iconDisable(_iconShapeMap['markClear']);
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
            /*
            var textPosition;
            if (toolboxOption.orient == 'horizontal') {
                textPosition = toolboxOption.y != 'bottom'
                               ? 'bottom' : 'top';
            }
            else {
                textPosition = toolboxOption.x != 'left'
                               ? 'left' : 'right';
            }
            */
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
                        strokeColor : color[i % color.length],
                        shadowColor: '#ccc',
                        shadowBlur : 2,
                        shadowOffsetX : 2,
                        shadowOffsetY : 2,
                        brushType: 'stroke'
                    },
                    highlightStyle : {
                        lineWidth : 2,
                        shadowBlur: 5,
                        strokeColor : color[i % color.length]
                    },
                    hoverable : true,
                    clickable : true
                };

                switch(_iconList[i]) {
                    case 'mark':
                        itemShape.onclick = _onMark;
                        _markPencil = itemShape;
                        _markColor = itemShape.style.strokeColor;
                        break;
                    case 'markUndo':
                        itemShape.onclick = _onMarkUndo;
                        break;
                    case 'markClear':
                        itemShape.onclick = _onMarkClear;
                        break;
                    case 'dataView' :
                        if (!_dataView) {
                            var componentLibrary = require('../component');
                            var DataView = componentLibrary.get('dataView');
                            _dataView = new DataView(
                                messageCenter, zr, option, dom
                            );
                        }
                        itemShape.onclick = _onDataView;
                        break;
                    case 'restore':
                        itemShape.onclick = _onRestore;
                        break;
                    default:
                        if (_iconList[i].match('Chart')) {
                            itemShape._name = _iconList[i].replace('Chart', '');
                            if (itemShape._name == _magicType) {
                                itemShape.style.strokeColor = _enableColor;
                            }
                            itemShape.onclick = _onMagicType;
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
                zr.modShape(
                    target.id,
                    {style: {strokeColor: target.highlightStyle.strokeColor}}
                );
                zr.refresh();
                return true; // 阻塞全局事件
            }
            else {
                // 启用
                zr.modShape(target.id, {style: {strokeColor: _enableColor}});
                zr.refresh();
                _markStart = true;
                setTimeout(function(){
                    zr
                    && zr.on(zrConfig.EVENT.CLICK, _onclick)
                    && zr.on(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
                }, 10);
            }
        }

        function _onmousemove(param) {
            if (_marking) {
               _markShape.style.xEnd = zrEvent.getX(param.event);
               _markShape.style.yEnd = zrEvent.getY(param.event);
               zr.addHoverShape(_markShape);
            }
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
                        lineWidth : self.deepQuery(
                                        [option],
                                        'toolbox.feature.mark.lineStyle.width'
                                    ) || 2,
                        strokeColor : self.deepQuery(
                                          [option],
                                          'toolbox.feature.mark.lineStyle.color'
                                      ) || _markColor,
                        lineType : self.deepQuery(
                                       [option],
                                       'toolbox.feature.mark.lineStyle.type'
                                   ) || 'dashed'
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

        function _resetMark() {
            _marking = false;
            if (_markStart) {
                _markStart = false;
                zr.un(zrConfig.EVENT.CLICK, _onclick);
                zr.un(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
            }
        }

        function _iconDisable(target) {
            zr.modShape(target.id, {
                hoverable : false,
                clickable : false,
                style : {
                    strokeColor : _disableColor
                }
            });
        }

        function _iconEnable(target) {
            zr.modShape(target.id, {
                hoverable : true,
                clickable : true,
                style : {
                    strokeColor : target.highlightStyle.strokeColor
                }
            });
        }

        function _onDataView() {
            _dataView.show(option);
            return true;
        }

        function _onRestore(){
            _resetMark();
            messageCenter.dispatch(ecConfig.EVENT.RESTORE);
            return true;
        }

        function _onMagicType(param) {
            _resetMark();
            var itemName = param.target._name;
            if (itemName == _magicType) {
                // 取消
                _magicType = false;
            }
            else {
                // 启用
                _magicType = itemName;
            }
            messageCenter.dispatch(
                ecConfig.EVENT.MAGIC_TYPE_CHANGED,
                param.event,
                {magicType : _magicType}
            );
            return true;
        }

        function resetMagicType(newOption) {
            if (newOption.toolbox
                && newOption.toolbox.show
                && newOption.toolbox.feature.magicType
                && newOption.toolbox.feature.magicType.length > 0
            ) {
                var magicType = newOption.toolbox.feature.magicType;
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
                        if (axis && axis.type == 'category') {
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
                    }
                }
            }
            _magicType = false;
        }

        function getMagicOption(){
            if (_magicType) {
                // 启动
                for (var i = 0, l = option.series.length; i < l; i++) {
                    if (_magicMap[option.series[i].type]) {
                        option.series[i].type = _magicType;
                    }
                }
                var boundaryGap = _magicType == ecConfig.CHART_TYPE_LINE
                                  ? false : true;
                var len;
                if (option.xAxis instanceof Array) {
                    len = option.xAxis.length;
                    while (len--) {
                        // 横纵默认为类目
                        if ((option.xAxis[len].type || 'category')
                             == 'category'
                         ) {
                            option.xAxis[len].boundaryGap = boundaryGap;
                        }
                    }
                }
                else {
                    if (option.xAxis
                        && (option.xAxis.type || 'category') == 'category'
                    ) {
                        option.xAxis.boundaryGap = boundaryGap;
                    }
                }

                if (option.yAxis instanceof Array) {
                    len = option.yAxis.length;
                    while (len--) {
                        if ((option.yAxis[len].type) == 'category') {
                            option.yAxis[len].boundaryGap = boundaryGap;
                        }
                    }
                }
                else {
                    if (option.yAxis && option.yAxis.type == 'category') {
                        option.yAxis.boundaryGap = boundaryGap;
                    }
                }
            }
            else {
                // 还原
                var axis;
                for (var i = 0, l = option.series.length; i < l; i++) {
                    if (_magicMap[option.series[i].type]) {
                        option.series[i].type = option.series[i].__type;
                        if (option.xAxis instanceof Array) {
                            axis = option.xAxis[
                                       option.series[i].xAxisIndex || 0
                                   ];
                            if (axis.type == 'category') {
                                axis.boundaryGap = axis.__boundaryGap;
                            }
                        }
                        else {
                            axis = option.xAxis;
                            if (axis && axis.type == 'category') {
                                axis.boundaryGap = axis.__boundaryGap;
                            }
                        }

                        if (option.yAxis instanceof Array) {
                            axis = option.yAxis[
                                       option.series[i].yAxisIndex || 0
                                   ];
                            if (axis.type == 'category') {
                                axis.boundaryGap = axis.__boundaryGap;
                            }
                        }
                        else {
                            axis = option.yAxis;
                            if (axis && axis.type == 'category') {
                                axis.boundaryGap = axis.__boundaryGap;
                            }
                        }
                    }
                }
            }

            return option;
        }

        function render(newOption){
            _resetMark();
            newOption.toolbox = self.reformOption(newOption.toolbox);
            // 补全padding属性
            newOption.toolbox.padding = self.reformCssArray(
                newOption.toolbox.padding
            );
            option = newOption;

            self.shapeList = [];

            if (newOption.toolbox.show) {
                _buildShape();
            }

            hideDataView();
        }

        function resize() {
            _resetMark();
            self.clear();
            if (option.toolbox.show) {
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
            }

            self.clear();
            self.shapeList = null;
            self = null;
        }

        // 重载基类方法
        self.dispose = dispose;

        self.render = render;
        self.resize = resize;
        self.hideDataView = hideDataView;
        self.getMagicOption = getMagicOption;
        self.resetMagicType = resetMagicType;
    }

    require('../component').define('toolbox', Toolbox);
    
    return Toolbox;
});