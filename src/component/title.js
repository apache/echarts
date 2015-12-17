define(function(require) {

    'use strict';

    var echarts = require('../echarts');
    var graphic = require('../util/graphic');
    var layout = require('../util/layout');

    // Model
    echarts.extendComponentModel({

        type: 'title',

        defaultOption: {
            // 一级层叠
            zlevel: 0,
            // 二级层叠
            z: 6,
            show: true,

            text: '',
            // 超链接跳转
            // link: null,
            // 仅支持self | blank
            // target: null,
            subtext: '',

            // 超链接跳转
            // sublink: null,
            // 仅支持self | blank
            // subtarget: null,

            // 水平安放位置，默认为左对齐，可选为：
            // 'center' ¦ 'left' ¦ 'right'
            // ¦ {number}（x坐标，单位px）
            x: 'left',
            // 垂直安放位置，默认为全图顶端，可选为：
            // 'top' ¦ 'bottom' ¦ 'center'
            // ¦ {number}（y坐标，单位px）
            y: 'top',

            // 水平对齐
            // 'auto' | 'left' | 'right'
            // 默认根据 x 的位置判断是左对齐还是右对齐
            //textAlign: null

            backgroundColor: 'rgba(0,0,0,0)',

            // 标题边框颜色
            borderColor: '#ccc',

            // 标题边框线宽，单位px，默认为0（无边框）
            borderWidth: 0,

            // 标题内边距，单位px，默认各方向内边距为5，
            // 接受数组分别设定上右下左边距，同css
            padding: 5,

            // 主副标题纵向间隔，单位px，默认为10，
            itemGap: 10,
            textStyle: {
                fontSize: 18,
                fontWeight: 'bolder',
                // 主标题文字颜色
                color: '#333'
            },
            subtextStyle: {
                // 副标题文字颜色
                color: '#aaa'
            }
        }
    });

    // View
    echarts.extendComponentView({

        type: 'title',

        render: function (titleModel, ecModel, api) {
            this.group.removeAll();

            if (!titleModel.get('show')) {
                return;
            }

            var group = this.group;

            var textStyleModel = titleModel.getModel('textStyle');
            var subtextStyleModel = titleModel.getModel('subtextStyle');

            var textAlign = titleModel.get('textAlign');

            var textEl = new graphic.Text({
                style: {
                    text: titleModel.get('text'),
                    textFont: textStyleModel.getFont(),
                    fill: textStyleModel.getTextColor(),
                    textBaseline: 'top'
                }
            });

            var textRect = textEl.getBoundingRect();

            var subText = titleModel.get('subtext');
            var subTextEl = new graphic.Text({
                style: {
                    text: subText,
                    textFont: subtextStyleModel.getFont(),
                    fill: subtextStyleModel.getTextColor(),
                    y: textRect.height + titleModel.get('itemGap'),
                    textBaseline: 'top'
                }
            });

            var link = titleModel.get('link');
            var sublink = titleModel.get('sublink');

            textEl.silent = !link;
            subTextEl.silent = !sublink;

            if (link) {
                textEl.on('click', function () {
                    window.open(link, titleModel.get('target'));
                });
            }
            if (sublink) {
                subTextEl.on('click', function () {
                    window.open(link, titleModel.get('subtarget'));
                });
            }

            group.add(textEl);
            subText && group.add(subTextEl);
            // If no subText, but add subTextEl, there will be an empty line.

            var groupRect = group.getBoundingRect();
            var positionInfo = layout.parsePositionInfo(
                {
                    x: titleModel.get('x'),
                    y: titleModel.get('y'),
                    x2: titleModel.get('x2'),
                    y2: titleModel.get('y2'),
                    width: groupRect.width,
                    height: groupRect.height
                }, {
                    width: api.getWidth(),
                    height: api.getHeight()
                }, titleModel.get('padding')
            );
            // Adjust text align based on position
            if (!textAlign) {
                var p = positionInfo.x / api.getWidth();
                var p2 = (positionInfo.x + positionInfo.width) / api.getWidth();

                if (p < 0.2) {
                    textAlign = 'left';
                }
                else if (p2 > 0.8) {
                    positionInfo.x += positionInfo.width;
                    textAlign = 'right';
                }
                else {
                    positionInfo.x += positionInfo.width / 2;
                    textAlign = 'center';
                }
            }
            group.position = [positionInfo.x, positionInfo.y];
            textEl.style.textAlign = subTextEl.style.textAlign = textAlign;
            textEl.dirty();
            subTextEl.dirty();

            // Render background
            var padding = positionInfo.margin;
            var rect = new graphic.Rect({
                shape: {
                    x: -padding[3],
                    y: -padding[0],
                    width: positionInfo.width + padding[1] + padding[3],
                    height: positionInfo.height + padding[0] + padding[2]
                },
                style: {
                    stroke: titleModel.get('borderColor'),
                    fill: titleModel.get('backgroundColor'),
                    lineWidth: titleModel.get('borderWidth')
                },
                silent: true
            });
            graphic.subPixelOptimizeRect(rect);

            group.add(rect);
        }
    });
});