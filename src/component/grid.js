/**
 * echarts组件： 网格
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
     * @param {Object} option 图表选项
     *      @param {number=} option.grid.x 直角坐标系内绘图网格起始横坐标，数值单位px
     *      @param {number=} option.grid.y 直角坐标系内绘图网格起始纵坐标，数值单位px
     *      @param {number=} option.grid.width 直角坐标系内绘图网格宽度，数值单位px
     *      @param {number=} option.grid.height 直角坐标系内绘图网格高度，数值单位px
     */
    function Grid(messageCenter, zr, option) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_GRID;

        var _zlevelBase = self.getZlevelBase();

        var _x;
        var _y;
        var _width;
        var _height;

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
         * @param {Object} newOption
         */
        function init(newOption) {
            option = newOption;

            option.grid = self.reformOption(option.grid);

            var gridOption = option.grid;
            _x = gridOption.x;
            _y = gridOption.y;

            if (typeof gridOption.width == 'undefined') {
                _width = zr.getWidth() - (_x * 2);
            }
            else {
                _width = gridOption.width;
            }

            if (typeof gridOption.height == 'undefined') {
                _height = zr.getHeight() - (_y * 2);
            }
            else {
                _height = gridOption.height;
            }

            self.shapeList.push({
                shape : 'rectangle',
                id : zr.newShapeId('grid'),
                zlevel : _zlevelBase,
                hoverable : false,
                style : {
                    x : _x,
                    y : _y,
                    width : _width,
                    height : _height,
                    brushType : 'both',
                    color : gridOption.backgroundColor,
                    strokeColor: gridOption.borderColor,
                    lineWidth : gridOption.borderWidth
                    // type : option.splitArea.areaStyle.type,
                }
            });
            zr.addShape(self.shapeList[0]);
        }

        function getX() {
            return _x;
        }

        function getY() {
            return _y;
        }

        function getWidth() {
            return _width;
        }

        function getHeight() {
            return _height;
        }

        function getXend() {
            return _x + _width;
        }

        function getYend() {
            return _y + _height;
        }

        function getArea() {
            return {
                x : _x,
                y : _y,
                width : _width,
                height : _height
            };
        }

        function refresh() {
            self.clear();
            init(option);
        }

        self.init = init;
        self.getX = getX;
        self.getY = getY;
        self.getWidth = getWidth;
        self.getHeight = getHeight;
        self.getXend = getXend;
        self.getYend = getYend;
        self.getArea = getArea;
        self.refresh = refresh;

        init(option);
    }

    require('../component').define('grid', Grid);
    
    return Grid;
});