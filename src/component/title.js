/**
 * echarts组件：图表标题
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
     */
    function Title(ecConfig, messageCenter, zr, option) {
        var Base = require('./base');
        Base.call(this, ecConfig, zr);

        var zrArea = require('zrender/tool/area');
        var zrUtil = require('zrender/tool/util');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_TITLE;

        var titleOption;                       // 标题选项，共享数据源
        var _zlevelBase = self.getZlevelBase();

        var _itemGroupLocation = {};    // 标题元素组的位置参数，通过计算所得x, y, width, height

        function _buildShape() {
            _itemGroupLocation = _getItemGroupLocation();

            _buildBackground();
            _buildItem();

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建所有标题元素
         */
        function _buildItem() {
            var text = titleOption.text;
            var link = titleOption.link;
            var subtext = titleOption.subtext;
            var sublink = titleOption.sublink;
            var font = self.getFont(titleOption.textStyle);
            var subfont = self.getFont(titleOption.subtextStyle);
            
            var x = _itemGroupLocation.x;
            var y = _itemGroupLocation.y;
            var width = _itemGroupLocation.width;
            var height = _itemGroupLocation.height;
            
            var textShape = {
                shape : 'text',
                zlevel : _zlevelBase,
                style : {
                    y : y,
                    color : titleOption.textStyle.color,
                    text: text,
                    textFont: font,
                    textBaseline: 'top'
                },
                highlightStyle: {
                    brushType: 'fill'
                },
                hoverable: false
            };
            if (link) {
                textShape.hoverable = true;
                textShape.clickable = true;
                textShape.onclick = function(){
                    window.open(link);
                };
            }
            
            var subtextShape = {
                shape : 'text',
                zlevel : _zlevelBase,
                style : {
                    y : y + height,
                    color : titleOption.subtextStyle.color,
                    text: subtext,
                    textFont: subfont,
                    textBaseline: 'bottom'
                },
                highlightStyle: {
                    brushType: 'fill'
                },
                hoverable: false
            };
            if (sublink) {
                subtextShape.hoverable = true;
                subtextShape.clickable = true;
                subtextShape.onclick = function(){
                    window.open(sublink);
                };
            }

            

            switch (titleOption.x) {
                case 'center' :
                    textShape.style.x = subtextShape.style.x = x + width / 2;
                    textShape.style.textAlign = subtextShape.style.textAlign 
                                              = 'center';
                    break;
                case 'left' :
                    textShape.style.x = subtextShape.style.x = x;
                    textShape.style.textAlign = subtextShape.style.textAlign 
                                              = 'left';
                    break;
                case 'right' :
                    textShape.style.x = subtextShape.style.x = x + width;
                    textShape.style.textAlign = subtextShape.style.textAlign 
                                              = 'right';
                    break;
                default :
                    x = titleOption.x - 0;
                    x = isNaN(x) ? 0 : x;
                    textShape.style.x = subtextShape.style.x = x;
                    break;
            }
            
            if (titleOption.textAlign) {
                textShape.style.textAlign = subtextShape.style.textAlign 
                                          = titleOption.textAlign;
            }

            self.shapeList.push(textShape);
            subtext !== '' && self.shapeList.push(subtextShape);
        }

        function _buildBackground() {
            var pTop = titleOption.padding[0];
            var pRight = titleOption.padding[1];
            var pBottom = titleOption.padding[2];
            var pLeft = titleOption.padding[3];

            self.shapeList.push({
                shape : 'rectangle',
                zlevel : _zlevelBase,
                hoverable :false,
                style : {
                    x : _itemGroupLocation.x - pLeft,
                    y : _itemGroupLocation.y - pTop,
                    width : _itemGroupLocation.width + pLeft + pRight,
                    height : _itemGroupLocation.height + pTop + pBottom,
                    brushType : titleOption.borderWidth === 0
                                ? 'fill' : 'both',
                    color : titleOption.backgroundColor,
                    strokeColor : titleOption.borderColor,
                    lineWidth : titleOption.borderWidth
                }
            });
        }

        /**
         * 根据选项计算标题实体的位置坐标
         */
        function _getItemGroupLocation() {
            var text = titleOption.text;
            var subtext = titleOption.subtext;
            var font = self.getFont(titleOption.textStyle);
            var subfont = self.getFont(titleOption.subtextStyle);
            
            var totalWidth = Math.max(
                    zrArea.getTextWidth(text, font),
                    zrArea.getTextWidth(subtext, subfont)
                );
            var totalHeight = zrArea.getTextHeight(text, font)
                              + (subtext === ''
                                 ? 0
                                 : (titleOption.itemGap
                                    + zrArea.getTextHeight(subtext, subfont))
                                );

            var x;
            var zrWidth = zr.getWidth();
            switch (titleOption.x) {
                case 'center' :
                    x = Math.floor((zrWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = titleOption.padding[3] + titleOption.borderWidth;
                    break;
                case 'right' :
                    x = zrWidth
                        - totalWidth
                        - titleOption.padding[1]
                        - titleOption.borderWidth;
                    break;
                default :
                    x = titleOption.x - 0;
                    x = isNaN(x) ? 0 : x;
                    break;
            }

            var y;
            var zrHeight = zr.getHeight();
            switch (titleOption.y) {
                case 'top' :
                    y = titleOption.padding[0] + titleOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - titleOption.padding[2]
                        - titleOption.borderWidth;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = titleOption.y - 0;
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

        function init(newOption) {
            refresh(newOption);
        }
        
        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;

                option.title = self.reformOption(option.title);
                // 补全padding属性
                option.title.padding = self.reformCssArray(
                    option.title.padding
                );
    
                titleOption = option.title;
                titleOption.textStyle = zrUtil.merge(
                    titleOption.textStyle,
                    ecConfig.textStyle,
                    {
                        'overwrite': false,
                        'recursive': false
                    }
                );
                titleOption.subtextStyle = zrUtil.merge(
                    titleOption.subtextStyle,
                    ecConfig.textStyle,
                    {
                        'overwrite': false,
                        'recursive': false
                    }
                );
    
                self.clear();
                _buildShape();
            }
        }
        
        function resize() {
             self.clear();
            _buildShape();
        }

        self.init = init;
        self.refresh = refresh;
        self.resize = resize;

        init(option);
    }
    
    require('../component').define('title', Title);
    
    return Title;
});


