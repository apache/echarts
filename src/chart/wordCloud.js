/**
 * echarts图表类：字符云
 * @desc
 * @author  clmtulip(车丽美, clmtulip@gmail.com) liyong(liyong1239@163.com)
 */
define(function (require) {
    var ChartBase = require('./base');

    var TextShape = require('zrender/shape/Text');
    var CloudLayout = require('../layout/WordCloud');

    require('../component/grid');
    require('../component/dataRange');
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');

    ecConfig.wordCloud = {
        zlevel: 0,
        z: 2,
        clickable: true,
        
        center: ['50%', '50%'],
        
        size: ['40%', '40%'],

        // 字体旋转角度, 随机从指定数组中取
        textRotation: [0, 90],

        // 字体之间的间隙  单位px 默认为0
        textPadding: 0,

        // 字体大小 是否自动缩放，使得尽可能的 字体能够显示
        autoSize: {
            enable: true,
            // 字体缩放后的最小大小
            minSize: 12
        },

        itemStyle: {
            normal: {
                textStyle: {
                    // 默认字体大小跟 data.value 一样
                    fontSize: function (data) {
                        return data.value;
                    }
                }
            }
        }
    };

    function Cloud(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);

        this.refresh(option); 
    }

    Cloud.prototype = {
        type: ecConfig.CHART_TYPE_WORDCLOUD,

        /**
         * 刷新
         */
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }

            //init data
            this._init();
        },
        /**
         *   初始化数据
         *   @private
         */
        _init: function () {
            var series = this.series;
            this.backupShapeList();

            var legend = this.component.legend;
            for (var i = 0; i < series.length; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_WORDCLOUD) {
                    series[i] = this.reformOption(series[i]);
                    var serieName = series[i].name || '';

                    this.selectedMap[serieName] = legend ? legend.isSelected(serieName) : true;

                    if (! this.selectedMap[serieName]) {
                        continue;
                    }

                    this.buildMark(i);

                    this._initSerie(series[i]);
                }
            }
        },

        _initSerie: function (serie) {
            
            var textStyle = serie.itemStyle.normal.textStyle;

            var size = [
                this.parsePercent(serie.size[0], this.zr.getWidth()) || 200,
                this.parsePercent(serie.size[1], this.zr.getHeight()) || 200
            ]
            var center = this.parseCenter(this.zr, serie.center);

            var layoutConfig = {
                size: size,

                wordletype: {
                    autoSizeCal: serie.autoSize,
                },

                center: center,

                rotate: serie.textRotation,
                padding: serie.textPadding,

                font: textStyle.fontFamily,
                fontSize: textStyle.fontSize,
                fontWeight: textStyle.fontWeight,
                fontStyle: textStyle.fontStyle,

                text: function (d) {
                    return d.name;
                },

                data: serie.data
            };

            // 字符云的布局方法
            var clouds = new CloudLayout(layoutConfig);
            var self = this;

            // 字符位置确定后 执行 以下函数
            clouds.end(function (d) {
                self._buildShapes(d);
            });

            // 布局算法 开始执行
            clouds.start();
        },

        /**
         * 通过 data 绘制图形
         * @param data
         * @private
         */
        _buildShapes: function (data) {
            //数据的 再度初始化，使得最终 text 是以自己的坐标为中心。。。
            var len = data.length;
            for (var i = 0; i < len; i++) {
                this._buildTextShape(data[i], 0, i);
            }

            this.addShapeList();
        },

        /**
         * 绘制 每个 text
         * @param oneText {Object}
         * @param seriesIndex {int}
         * @param dataIndex {int}
         * @private
         */
        _buildTextShape: function (oneText, seriesIndex, dataIndex) {
            var series = this.series;
            var serie = series[seriesIndex];
            var serieName = serie.name || '';
            var data = serie.data[dataIndex];
            var queryTarget = [
                data,
                serie
            ];

            // dataRange 选择结束
            var legend = this.component.legend;
            var defaultColor = legend ? legend.getColor(serieName) : this.zr.getColor(seriesIndex);
            // 多级控制
            var normal = this.deepMerge(queryTarget, 'itemStyle.normal') || {};
            var emphasis = this.deepMerge(queryTarget, 'itemStyle.emphasis') || {};
            var normalColor = this.getItemStyleColor(normal.color, seriesIndex, dataIndex, data)
                || defaultColor;

            var emphasisColor = this.getItemStyleColor(
                emphasis.color, seriesIndex, dataIndex, data
            )
                || (typeof normalColor === 'string'
                    ? zrColor.lift(normalColor, -0.2)
                    : normalColor
                    );


            // console.log(oneText.x, oneText.x0);

            var that = this;
            var textShape = new TextShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                hoverable: true,
                style: {
                    x: 0,
                    y: 0,
                    text: oneText.text,
                    color: normalColor,
                    textFont: [oneText.style,
                                oneText.weight,
                                oneText.size + 'px',
                                oneText.font].join(' '),
                    textBaseline: 'alphabetic',
                    textAlign: 'center'
                },
                highlightStyle: {
                    brushType: emphasis.borderWidth ? 'both' : 'fill',
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth || 0,
                    strokeColor: emphasis.borderColor
                },
                position: [
                    oneText.x,
                    oneText.y
                ],
                rotation: [
                    -oneText.rotate / 180 * Math.PI,
                    0,
                    0
                ]
            });

            ecData.pack(
                textShape,
                serie, seriesIndex,
                data, dataIndex,
                data.name
            );

            this.shapeList.push(textShape);
        }
    };


    zrUtil.inherits(Cloud, ChartBase);

    // 图表注册
    require('../chart').define('wordCloud', Cloud);

    return Cloud;
});