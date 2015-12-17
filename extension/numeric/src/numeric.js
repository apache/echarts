/**
 * echarts图表类：数值图
 *
 * @desc echarts 数值显示组件，用于仪表盘KPI显示。
 * @author He Jiang (hejiang@shujuguan.cn, hejiang@tju.edu.cn)
 *
 */
define([
	'echarts/config',
	'echarts/chart',
	'echarts/chart/base',
	'echarts/component/base',
	'echarts/component/axis',
	'echarts/component/grid',
	'echarts/component/dataZoom',
	'echarts/util/ecData',
	'echarts/extension/numeric/formatter',
	'zrender/shape/Rectangle',
	'zrender/shape/Text',
	'zrender/tool/util',
	'zrender/tool/color',
	'zrender/tool/area'
], function () {
	"use strict";
	
    var ComponentBase = require('echarts/component/base');
    var ChartBase = require('echarts/chart/base');
    
    // 图形依赖
    var RectangleShape = require('zrender/shape/Rectangle');
    var TextShape = require('zrender/shape/Text');
    // 组件依赖
    require('echarts/component/axis');
    require('echarts/component/grid');
    require('echarts/component/dataZoom');
    
    var ecConfig = require('echarts/config');
    var ecData = require('echarts/util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    var zrArea = require('zrender/tool/area');
   
	var formatter = require('echarts/extension/numeric/formatter');

	/**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Numeric(ecTheme, messageCenter, zr, option, myChart){
        // 基类
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        // 图表基类
        ChartBase.call(this);
        
        this.refresh(option);
    }
    
    Numeric.prototype = {
        type : 'numeric', // 使用硬编码，避免修改太多echarts文件
		_zlevelBase: 6, // 使用硬编码，避免修改太多echarts文件
        /**
         * 绘制图形
         */
        _buildShape : function () {
			var self = this;
            var series = self.series;
			var backup_data = [];
			for (var i = 0, l = series.length; i < l; i++)
			{
				if (series[i].type == 'numeric')
				{
					var serie = self.reformOption(series[i]);
					var numericStyle = zrUtil.merge(serie.numericStyle || {}, numericConfig.numericStyle);
					backup_data[i] = zrUtil.merge({}, serie.layout.data);
					
					if (numericStyle.show)
					{
						if (serie.data.length > 0)
						{
							var value = null;
							var data = serie.data[0];
							switch (typeof(data))
							{
							case "string":
								if (data != "-")
								{
									value = data;
								}
								break;
							case "number":
								value = formatter(data, numericStyle.format);
								break;
							case "object":
								if (data && data.value && data.value !== '-')
								{
									if (data.itemStyle)
									{
										itemStyle = zrUtil.merge(data.itemStyle, itemStyle);
										numericStyle = itemStyle.normal.numericStyle;
									}
									if (typeof(data.value) === 'string')
										value = data.value;
									else if (typeof(data.value) === 'number')
										value = formatter(data.value, numericStyle.format);
								}
								break;
							}

							if (value)
							{
								// 标签元素组的位置参数，通过计算所得x, y, width, height
								var location = self.getNumericLocation(value, numericStyle, i);
								self.buildNumericBackground(serie.layout.data, numericStyle);
								self.buildNumericValue(value, location, numericStyle);
							}

							var numericLocation = location || { x: 0, y: 0, width: 0, height: 0 };
							if (serie.markText) {
								var marktext_data = [];
								for (var d in serie.markText)
								{
									serie.markText[d] = zrUtil.merge(serie.markText[d], markTextConfig);
									var td = serie.markText[d];
									marktext_data[d] = zrUtil.merge({}, td.layout.data);
									if (td.text)
									{
										var location = self.getMarkTextLocation(td.text, td, d, i);
										self.buildNumericBackground(td.layout.data, td);
										self.buildNumericValue(td.text, location, td);
									}
								}
								for (var d in serie.markText)
								{
									serie.markText[d].layout.data = marktext_data[d];
								}
							}
						}

					}
					/*
					if (serie.markPoint && serie.markPoint.data)
					for (var d in serie.markPoint.data)
					{
						var v = serie.markPoint.data[d];
						v.x = self.getTextDecorationAbsX(v.x, v.position, numericLocation);
						v.y = self.getTextDecorationAbsY(v.y, v.position, numericLocation);
					}
					*/
				}
			}

			for (var i = 0, l = series.length; i < l; i++)
			{
				if (series[i].type == 'numeric')
				{
					series[i].layout.data = backup_data[i];
				}
			}
			
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                this.zr.addShape(this.shapeList[i]);
            }
		},

		/**
		 * 构建所有标题元素
		 */
		buildNumericValue: function(value, location, numericStyle)
		{
			var self = this;
			var text = value;
			var link = numericStyle.link;
			var font = self.getFont(numericStyle.textStyle);

			var x = location.x;
			var y = location.y;
			var width = location.width;
			var height = location.height;

			var textShape =
			{
				shape : 'text',
				zlevel : self._zlevelBase,
				style :
				{
					x : x,
					color : numericStyle.textStyle.color,
					text : text,
					textFont : font,
					textAlign : 'left'
					//textBaseline: 'top'
				},
				highlightStyle :
				{
					brushType : 'fill'
				},
				hoverable : false
			};
			if (link)
			{
				textShape.hoverable = true;
				textShape.clickable = true;
				textShape.onclick = function ()
				{
					window.open(link);
				};
			}

			var baseline = numericStyle.textBaseline || numericStyle.y;
			switch (baseline)
			{
			case 'center':
			case 'middle':
				textShape.style.y = y + height / 2;
				textShape.style.textBaseline = 'middle';
				break;
			case 'bottom':
				textShape.style.y = y + height;
				textShape.style.textBaseline = 'bottom';
				break;
			case 'top':
			default:
				textShape.style.y = y;
				textShape.style.textBaseline = 'top';
				break;
			}

			self.shapeList.push(new TextShape(textShape));
		},

		buildNumericBackground: function(location, numericStyle)
		{
			var self = this;

			//var padding = self.reformCssArray(numericStyle.padding);
			var pTop = 0;//padding[0];
			var pRight = 0;//padding[1];
			var pBottom = 0;//padding[2];
			var pLeft = 0;//padding[3];

			self.shapeList.push(new RectangleShape(
			{
				shape : 'rectangle',
				zlevel : self._zlevelBase,
				hoverable : false,
				style :
				{
					x : location.x - pLeft,
					y : location.y - pTop,
					width : location.width + pLeft + pRight,
					height : location.height + pTop + pBottom,
					brushType : numericStyle.borderWidth === 0
					 ? 'fill' : 'both',
					color : numericStyle.backgroundColor,
					strokeColor : numericStyle.borderColor,
					lineWidth : numericStyle.borderWidth
				}
			}
			));
		},

		doSeriesFormLayout: function(seriesIndex, contentWidth, contentHeight) {
			var self = this;
			var serie = self.series[seriesIndex];
			serie.layout = zrUtil.merge(serie.layout || {}, numericConfig.layout);
			var data = serie.layout.data;
			var canvas = { x: 0, y: 0, width: self.zr.getWidth(), height: self.zr.getHeight() };
			if (data.top) {
				var attachment = zrUtil.merge(data.top, {
					denominator: 100,
					numerator: 0,
					offset: 0,
					alignment: 'top'
				});
				var index = +attachment.series;
				if (attachment.series === undefined) {
					var ref = canvas;
				} else if (index < 0) {
					var ref = self.series[seriesIndex-1].layout.data;
				} else if (index < self.series.length) {
					var ref = self.series[index].layout.data;
				} else {
					var ref = canvas;
				}
				switch (attachment.alignment) {
				case 'bottom':
					var x = ref.y+ref.height;
					var y = -1;
					break;
				case 'center':
				case 'middle':
					var x = ref.y+ref.height/2;
					var y = 1;
					break;
				case 'top':
				default:
					var x = ref.y;
					var y = 1;
					break;
				}
				data.y = x + y * (ref.height * attachment.numerator / attachment.denominator + attachment.offset);
			}
			if (data.bottom) {
				var attachment = zrUtil.merge(data.bottom, {
					denominator: 100,
					numerator: 0,
					offset: 0,
					alignment: 'bottom'
				});
				var index = +attachment.series;
				if (attachment.series === undefined) {
					var ref = canvas;
				} else if (index < 0) {
					var ref = self.series[seriesIndex-1].layout.data;
				} else if (index < self.series.length) {
					var ref = self.series[index].layout.data;
				} else {
					var ref = canvas;
				}
				switch (attachment.alignment) {
				case 'bottom':
					var x = ref.y+ref.height;
					var y = -1;
					break;
				case 'center':
				case 'middle':
					var x = ref.y+ref.height/2;
					var y = -1;
					break;
				case 'top':
				default:
					var x = ref.y;
					var y = 1;
					break;
				}
				if (data.y === undefined) {
					if (data.height === undefined)
						data.height = contentHeight;
					data.y = x + y * (ref.height * attachment.numerator / attachment.denominator + attachment.offset) - data.height;
				} else {
					data.height = x + y * (ref.height * attachment.numerator / attachment.denominator + attachment.offset) - data.y;
				}
			} else {
				if (data.y === undefined)
					data.y = canvas.y;
				if (data.height === undefined)
					data.height = contentHeight;
			}
			if (data.left) {
				var attachment = zrUtil.merge(data.left, {
					denominator: 100,
					numerator: 0,
					offset: 0,
					alignment: 'left'
				});
				var index = +attachment.series;
				if (attachment.series === undefined) {
					var ref = canvas;
				} else if (index < 0) {
					var ref = self.series[seriesIndex-1].layout.data;
				} else if (index < self.series.length) {
					var ref = self.series[index].layout.data;
				} else {
					var ref = canvas;
				}
				switch (attachment.alignment) {
				case 'right':
					var x = ref.x+ref.width;
					var y = -1;
					break;
				case 'center':
				case 'middle':
					var x = ref.x+ref.width/2;
					var y = 1;
					break;
				case 'left':
				default:
					var x = ref.x;
					var y = 1;
					break;
				}
				data.x = x + y * (ref.width * attachment.numerator / attachment.denominator + attachment.offset);
			}
			if (data.right) {
				var attachment = zrUtil.merge(data.right, {
					denominator: 100,
					numerator: 0,
					offset: 0,
					alignment: 'right'
				});
				var index = +attachment.series;
				if (attachment.series === undefined) {
					var ref = canvas;
				} else if (index < 0) {
					var ref = self.series[seriesIndex-1].layout.data;
				} else if (index < self.series.length) {
					var ref = self.series[index].layout.data;
				} else {
					var ref = canvas;
				}
				switch (attachment.alignment) {
				case 'right':
					var x = ref.x+ref.width;
					var y = -1;
					break;
				case 'center':
				case 'middle':
					var x = ref.x+ref.width/2;
					var y = -1;
					break;
				case 'left':
				default:
					var x = ref.x;
					var y = 1;
					break;
				}
				if (data.x === undefined) {
					if (data.width === undefined)
						data.width = contentWidth;
					data.x = x + y * (ref.width * attachment.numerator / attachment.denominator + attachment.offset) - data.width;
				} else {
					data.width = x + y * (ref.width * attachment.numerator / attachment.denominator + attachment.offset) - data.x;
				}
			} else {
				if (data.x === undefined)
					data.x = canvas.x;
				if (data.width === undefined)
					data.width = contentWidth;
			}
		},
		doMarkFormLayout: function(markIndex, seriesIndex, contentWidth, contentHeight) {
			var self = this;
			var serie = self.series[seriesIndex];
			var mark = serie.markText[markIndex];
			mark.layout = zrUtil.merge(mark.layout || {}, markTextConfig.layout);
			var data = mark.layout.data;
			var canvas = { x: 0, y: 0, width: self.zr.getWidth(), height: self.zr.getHeight() };
			if (data.top) {
				var attachment = zrUtil.merge(data.top, {
					denominator: 100,
					numerator: 0,
					offset: 0,
					alignment: 'top'
				});
				var index = +attachment.series;
				if (attachment.series === undefined) {
					var ref = serie.layout.data;
				} else if (index < 0) {
					var ref = canvas;
				} else if (index < self.series.length) {
					var ref = self.series[index].layout.data;
				} else {
					var ref = serie.layout.data;
				}
				switch (attachment.alignment) {
				case 'bottom':
					var x = ref.y+ref.height;
					var y = -1;
					break;
				case 'center':
				case 'middle':
					var x = ref.y+ref.height/2;
					var y = 1;
					break;
				case 'top':
				default:
					var x = ref.y;
					var y = 1;
					break;
				}
				data.y = x + y * (ref.height * attachment.numerator / attachment.denominator + attachment.offset);
			}
			if (data.bottom) {
				var attachment = zrUtil.merge(data.bottom, {
					denominator: 100,
					numerator: 0,
					offset: 0,
					alignment: 'bottom'
				});
				var index = +attachment.series;
				if (attachment.series === undefined) {
					var ref = serie.layout.data;
				} else if (index < 0) {
					var ref = canvas;
				} else if (index < self.series.length) {
					var ref = self.series[index].layout.data;
				} else {
					var ref = serie.layout.data;
				}
				switch (attachment.alignment) {
				case 'bottom':
					var x = ref.y+ref.height;
					var y = -1;
					break;
				case 'center':
				case 'middle':
					var x = ref.y+ref.height/2;
					var y = -1;
					break;
				case 'top':
				default:
					var x = ref.y;
					var y = 1;
					break;
				}
				if (data.y === undefined) {
					if (data.height === undefined)
						data.height = contentHeight;
					data.y = x + y * (ref.height * attachment.numerator / attachment.denominator + attachment.offset) - data.height;
				} else {
					data.height = x + y * (ref.height * attachment.numerator / attachment.denominator + attachment.offset) - data.y;
				}
			} else {
				if (data.y === undefined)
					data.y = serie.layout.data.y;
				if (data.height === undefined)
					data.height = contentHeight;
			}
			if (data.left) {
				var attachment = zrUtil.merge(data.left, {
					denominator: 100,
					numerator: 0,
					offset: 0,
					alignment: 'left'
				});
				var index = +attachment.series;
				if (attachment.series === undefined) {
					var ref = serie.layout.data;
				} else if (index < 0) {
					var ref = canvas;
				} else if (index < self.series.length) {
					var ref = self.series[index].layout.data;
				} else {
					var ref = serie.layout.data;
				}
				switch (attachment.alignment) {
				case 'right':
					var x = ref.x+ref.width;
					var y = -1;
					break;
				case 'center':
				case 'middle':
					var x = ref.x+ref.width/2;
					var y = 1;
					break;
				case 'left':
				default:
					var x = ref.x;
					var y = 1;
					break;
				}
				data.x = x + y * (ref.width * attachment.numerator / attachment.denominator + attachment.offset);
			}
			if (data.right) {
				var attachment = zrUtil.merge(data.right, {
					denominator: 100,
					numerator: 0,
					offset: 0,
					alignment: 'right'
				});
				var index = +attachment.series;
				if (attachment.series === undefined) {
					var ref = serie.layout.data;
				} else if (index < 0) {
					var ref = canvas;
				} else if (index < self.series.length) {
					var ref = self.series[index].layout.data;
				} else {
					var ref = serie.layout.data;
				}
				switch (attachment.alignment) {
				case 'right':
					var x = ref.x+ref.width;
					var y = -1;
					break;
				case 'center':
				case 'middle':
					var x = ref.x+ref.width/2;
					var y = -1;
					break;
				case 'left':
				default:
					var x = ref.x;
					var y = 1;
					break;
				}
				if (data.x === undefined) {
					if (data.width === undefined)
						data.width = contentWidth;
					data.x = x + y * (ref.width * attachment.numerator / attachment.denominator + attachment.offset) - data.width;
				} else {
					data.width = x + y * (ref.width * attachment.numerator / attachment.denominator + attachment.offset) - data.x;
				}
			} else {
				if (data.x === undefined)
					data.x = serie.layout.data.x;
				if (data.width === undefined)
					data.width = contentWidth;
			}
		},
		/**
		 * 根据选项计算标题实体的位置坐标
		 */
		getNumericLocation: function(value, numericStyle, seriesIndex)
		{
			var self = this;
			var padding = self.reformCssArray(numericStyle.padding);

			var text = value;
			var font = self.getFont(numericStyle.textStyle);

			var totalWidth = zrArea.getTextWidth(text, font);
			var totalHeight = zrArea.getTextHeight(text, font);

			self.doSeriesFormLayout(seriesIndex
			, totalWidth+padding[1]+padding[3]+numericStyle.borderWidth*2
			, totalHeight+padding[0]+padding[2]+numericStyle.borderWidth*2);
			var bound = self.series[seriesIndex].layout.data;
			
			var x;
			switch (numericStyle.x)
			{
			case 'center':
				x = bound.x + Math.floor((bound.width - totalWidth) / 2);
				break;
			case 'left':
				x = bound.x + padding[3] + numericStyle.borderWidth;
				break;
			case 'right':
				x = bound.x + bound.width
					 - totalWidth
					 - padding[1]
					 - numericStyle.borderWidth;
				break;
			default:
				x = numericStyle.x - 0;
				x = isNaN(x) ? 0 : x;
				break;
			}

			var y;
			switch (numericStyle.y)
			{
			case 'top':
				y = bound.y + padding[0] + numericStyle.borderWidth;
				break;
			case 'bottom':
				y = bound.y + bound.height
					 - totalHeight
					 - padding[2]
					 - numericStyle.borderWidth;
				break;
			case 'center':
			case 'middle':
				y = bound.y + Math.floor((bound.height - totalHeight) / 2);
				break;
			default:
				y = numericStyle.y - 0;
				y = isNaN(y) ? 0 : y;
				break;
			}

			return {
				x: x,
				y : y,
				width : totalWidth,
				height : totalHeight
			};
		},

		/**
		 * 根据选项计算标题实体的位置坐标
		 */
		getMarkTextLocation: function(text, numericStyle, markIndex, seriesIndex)
		{
			var self = this;
			var padding = self.reformCssArray(numericStyle.padding);

			var font = self.getFont(numericStyle.textStyle);

			var totalWidth = zrArea.getTextWidth(text, font);
			var totalHeight = zrArea.getTextHeight(text, font);

			self.doMarkFormLayout(markIndex, seriesIndex
			, totalWidth+padding[1]+padding[3]+numericStyle.borderWidth*2
			, totalHeight+padding[0]+padding[2]+numericStyle.borderWidth*2);
			var bound = self.series[seriesIndex].markText[markIndex].layout.data;

			var x;
			switch (numericStyle.x)
			{
			case 'center':
				x = bound.x + Math.floor((bound.width - totalWidth) / 2);
				break;
			case 'left':
				x = bound.x + padding[3] + numericStyle.borderWidth;
				break;
			case 'right':
				x = bound.x + bound.width
					 - totalWidth
					 - padding[1]
					 - numericStyle.borderWidth;
				break;
			default:
				x = numericStyle.x - 0;
				x = isNaN(x) ? 0 : x;
				break;
			}

			var y;
			switch (numericStyle.y)
			{
			case 'top':
				y = bound.y + padding[0] + numericStyle.borderWidth;
				break;
			case 'bottom':
				y = bound.y + bound.height
					 - totalHeight
					 - padding[2]
					 - numericStyle.borderWidth;
				break;
			case 'center':
			case 'middle':
				y = bound.y + Math.floor((bound.height - totalHeight) / 2);
				break;
			default:
				y = numericStyle.y - 0;
				y = isNaN(y) ? 0 : y;
				break;
			}

			return {
				x: x,
				y : y,
				width : totalWidth,
				height : totalHeight
			};
		},
        
		/**
		 * 刷新
		 */
		refresh: function(newOption)
		{
			if (newOption)
			{
				this.option = newOption;
				this.series = newOption.series;
			}
			this.clear();
			this._buildShape();
		}
    };
    
    zrUtil.inherits(Numeric, ChartBase);
    zrUtil.inherits(Numeric, ComponentBase);
    
    // 图表注册
    require('echarts/chart').define('numeric', Numeric);
    
	// 图表标签
	var numericConfig =
	{
		layout: {
			type: 'form',				// 布局类型，目前仅支持'form', 参照SWT的FormLayout实现
			data: {
				/*
				x: undefined,			// 被 left 设置覆盖, 或设置值
				y: undefined,			// 被 top 设置覆盖, 或设置值
				width: undefined,		// 被 top 和 bottom 设置覆盖, 设置值，或内容宽度
				height: undefined		// 被 top 和 bottom 设置覆盖, 设置值，或内容高度
				top: {
					series: undefined,	// undefined --> canvas, -1 --> last series, other --> series index
					denominator: 100,	// 分母
					numerator: 0,		// 分子
					offset: 0,			// offset pixels
					alignment: 'top'	// 'top', 'right', 'bottom', 'left', 'center'
				},
				right: {
					series: undefined,	// undefined --> canvas, -1 --> last series, other --> series index
					denominator: 100,	// 分母
					numerator: 100,		// 分子
					offset: 0,			// offset pixels
					alignment: 'right'	// 'top', 'right', 'bottom', 'left', 'center'
				},
				bottom: {
					series: undefined,	// undefined --> canvas, -1 --> last series, other --> series index
					denominator: 100,	// 分母
					numerator: 100,		// 分子
					offset: 0,			// offset pixels
					alignment: 'bottom'	// 'top', 'right', 'bottom', 'left', 'center'
				},
				left: {
					series: undefined,	// undefined --> canvas, -1 --> last series, other --> series index
					denominator: 100,	// 分母
					numerator: 0,		// 分子
					offset: 0,			// offset pixels
					alignment: 'left'	// 'top', 'right', 'bottom', 'left', 'center'
				}
				*/
			}
		},
		numericStyle:
		{
			show : true,
			format : '#,#',				// 格式设置，同Excel
			link : null,				// 超链接跳转
			target : null,				// 仅支持self | blank
			x : 'center',				// 水平安放位置，默认为左对齐，可选为：
										// 'center' | 'left' | 'right'
										// | {number}（x坐标，单位px）
			y : 'center',				// 垂直安放位置，默认为全图顶端，可选为：
										// 'top' | 'bottom' | 'center'
										// | {number}（y坐标，单位px）
			textBaseline : 'bottom',	// 垂直对齐方式，默认根据y设置自动调整
			backgroundColor : 'rgba(0,0,0,0)',
			borderColor : '#ccc',		// 标签边框颜色
			borderWidth : 0,			// 标签边框线宽，单位px，默认为0（无边框）
			padding : 5,				// 标签内边距，单位px，默认各方向内边距为5，
										// 接受数组分别设定上右下左边距，同css
			textStyle :
			{
				fontSize : 32,
				color : '#00cee6'		// 主标签文字颜色
			}
		},
		markText:
		[
		]
	};
	var markTextConfig =
	{
		link : null,					// 超链接跳转
		target : null,					// 仅支持self | blank
		x : 'center',
		y : 'center',
		textBaseline : 'bottom',		// 垂直对齐方式，默认根据y设置自动调整
		backgroundColor : 'rgba(0,0,0,0)',
		borderColor : '#ccc',			// 标签边框颜色
		borderWidth : 0,				// 标签边框线宽，单位px，默认为0（无边框）
		padding : 5,					// 标签内边距，单位px，默认各方向内边距为5，
										// 接受数组分别设定上右下左边距，同css
		textStyle :
		{
			fontSize : 24,
			color : '#00cee6'				// 主标签文字颜色
		},
		layout: {
			type: 'form',				// 布局类型，目前仅支持'form', 参照SWT的FormLayout实现
			data: {
				/*
				x: undefined,			// 被 left 设置覆盖, 或设置值
				y: undefined,			// 被 top 设置覆盖, 或设置值
				width: undefined,		// 被 top 和 bottom 设置覆盖, 设置值，或内容宽度
				height: undefined		// 被 top 和 bottom 设置覆盖, 设置值，或内容高度
				top: {
					series: undefined,	// undefined --> this series, -1 --> canvas, other --> series index
					denominator: 100,	// 分母
					numerator: 0,		// 分子
					offset: 0,			// offset pixels
					alignment: 'top'	// 'top', 'right', 'bottom', 'left', 'center'
				},
				right: {
					series: undefined,	// undefined --> this series, -1 --> canvas, other --> series index
					denominator: 100,	// 分母
					numerator: 100,		// 分子
					offset: 0,			// offset pixels
					alignment: 'right'	// 'top', 'right', 'bottom', 'left', 'center'
				},
				bottom: {
					series: undefined,	// undefined --> this series, -1 --> canvas, other --> series index
					denominator: 100,	// 分母
					numerator: 100,		// 分子
					offset: 0,			// offset pixels
					alignment: 'bottom'	// 'top', 'right', 'bottom', 'left', 'center'
				},
				left: {
					series: undefined,	// undefined --> this series, -1 --> canvas, other --> series index
					denominator: 100,	// 分母
					numerator: 0,		// 分子
					offset: 0,			// offset pixels
					alignment: 'left'	// 'top', 'right', 'bottom', 'left', 'center'
				}
				*/
			}
		}
	};

    return Numeric;
});