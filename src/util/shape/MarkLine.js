/**
 * zrender
 *
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *
 * shape类：标线
 */
define(function (require) {
    var Base = require('zrender/shape/Base');
    var IconShape = require('./Icon');
    var LineShape = require('zrender/shape/Line');
    var lineInstance = new LineShape({});
    var PolylineShape = require('zrender/shape/Polyline');
    var polylineInstance = new PolylineShape({});

    var matrix = require('zrender/tool/matrix');
    var area = require('zrender/tool/area');
    var dashedLineTo = require('zrender/shape/util/dashedLineTo');
    var smoothSpline = require('zrender/shape/util/smoothSpline');
    var zrUtil = require('zrender/tool/util');


    function MarkLine(options) {
        Base.call(this, options);
    }

    MarkLine.prototype =  {
        type : 'mark-line',
        /**
         * 画刷
         * @param ctx       画布句柄
         * @param e         形状实体
         * @param isHighlight   是否为高亮状态
         * @param updateCallback 需要异步加载资源的shape可以通过这个callback(e)
         *                       让painter更新视图，base.brush没用，需要的话重载brush
         */
        brush : function (ctx, isHighlight) {
            var style = this.style;

            if (isHighlight) {
                // 根据style扩展默认高亮样式
                style = this.getHighlightStyle(
                    style,
                    this.highlightStyle || {}
                );
            }

            ctx.save();
            this.setContext(ctx, style);

            // 设置transform
            this.setTransform(ctx);

            ctx.save();
            ctx.beginPath();
            this.buildLinePath(ctx, style, this.style.lineWidth || 1);
            ctx.stroke();
            ctx.restore();

            this.brushSymbol(ctx, style, 0);
            this.brushSymbol(ctx, style, 1);

            this.drawText(ctx, style, this.style);

            ctx.restore();
        },

        /**
         * 创建线条路径
         * @param {Context2D} ctx Canvas 2D上下文
         * @param {Object} style 样式
         */
        buildLinePath : function (ctx, style, lineWidth) {
            var pointList = style.pointList || this.getPointList(style);
            style.pointList = pointList;

            var len = Math.min(
                    style.pointList.length,
                    Math.round(style.pointListLength || style.pointList.length)
                );

            if (!style.lineType || style.lineType == 'solid') {
                //默认为实线
                ctx.moveTo(pointList[0][0],pointList[0][1]);
                for (var i = 1; i < len; i++) {
                    ctx.lineTo(pointList[i][0],pointList[i][1]);
                }
            }
            else if (style.lineType == 'dashed'
                    || style.lineType == 'dotted'
            ) {
                if (style.smooth !== 'spline') {
                    // 直线
                    var dashLength = lineWidth * (style.lineType == 'dashed' ? 5 : 1);
                    ctx.moveTo(pointList[0][0],pointList[0][1]);
                    for (var i = 1; i < len; i++) {
                        dashedLineTo(
                            ctx,
                            pointList[i - 1][0], pointList[i - 1][1],
                            pointList[i][0], pointList[i][1],
                            dashLength
                        );
                    }
                }
                else {
                    // 曲线
                    for (var i = 1; i < len; i += 2) {
                        ctx.moveTo(pointList[i - 1][0],pointList[i - 1][1]);
                        ctx.lineTo(pointList[i][0],pointList[i][1]);
                    }
                }
            }
        },

        /**
         * 标线始末标注
         */
        brushSymbol : function (ctx, style, idx) {
            if (style.symbol[idx] == 'none') {
                return;
            }
            ctx.save();
            ctx.beginPath();

            ctx.lineWidth = style.symbolBorder;
            ctx.strokeStyle = style.symbolBorderColor;
            // symbol
            style.iconType = style.symbol[idx].replace('empty', '')
                                              .toLowerCase();
            if (style.symbol[idx].match('empty')) {
                ctx.fillStyle = '#fff'; //'rgba(0, 0, 0, 0)';
            }

            // symbolRotate
            var len = Math.min(
                    style.pointList.length,
                    Math.round(style.pointListLength || style.pointList.length)
                );
            var x = idx === 0 ? style.pointList[0][0] : style.pointList[len - 1][0];
            var y = idx === 0 ? style.pointList[0][1] : style.pointList[len - 1][1];
            var rotate = typeof style.symbolRotate[idx] != 'undefined'
                         ? (style.symbolRotate[idx] - 0) : 0;
            var transform;
            if (rotate !== 0) {
                transform = matrix.create();
                matrix.identity(transform);
                if (x || y ) {
                    matrix.translate(transform, transform, [-x, -y]);
                }
                matrix.rotate(
                    transform, transform,
                    rotate * Math.PI / 180
                );
                if (x || y ) {
                    matrix.translate(transform, transform, [x, y]);
                }
                ctx.transform.apply(ctx, transform);
            }

            if (style.iconType == 'arrow' && rotate === 0) {
                // 箭头自动旋转，手动画
                this.buildArrawPath(ctx, style, idx);
            }
            else {
                // symbolSize
                var symbolSize = style.symbolSize[idx];
                style.x = x - symbolSize;
                style.y = y - symbolSize,
                style.width = symbolSize * 2;
                style.height = symbolSize * 2;
                IconShape.prototype.buildPath(ctx, style);
            }

            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        },

        buildArrawPath : function (ctx, style, idx) {
            var len = Math.min(
                    style.pointList.length,
                    Math.round(style.pointListLength || style.pointList.length)
                );
            var symbolSize = style.symbolSize[idx] * 2;
            var xStart = style.pointList[0][0];
            var xEnd = style.pointList[len - 1][0];
            var yStart = style.pointList[0][1];
            var yEnd = style.pointList[len - 1][1];
            var delta = 0;
            if (style.smooth === 'spline') {
                delta = style.smoothRadian * (xStart <= xEnd ? 1 : -1); // 偏移0.2弧度
            }
            // 原谅我吧，这三角函数实在没想明白，只能这么笨了
            var rotate = Math.atan(
                    Math.abs((yEnd - yStart) / (xStart - xEnd)
                ));
            if (idx === 0) {
                if (xEnd > xStart) {
                    if (yEnd > yStart) {
                        rotate =  Math.PI * 2 - rotate + delta;
                    }
                    else {
                        rotate += delta;
                    }
                }
                else {
                    if (yEnd > yStart) {
                        rotate += Math.PI - delta;
                    }
                    else {
                        rotate = Math.PI - rotate - delta;
                    }
                }
            }
            else {
                if (xStart > xEnd) {
                    if (yStart > yEnd) {
                        rotate =  Math.PI * 2 - rotate + delta;
                    }
                    else {
                        rotate += delta;
                    }
                }
                else {
                    if (yStart > yEnd) {
                        rotate += Math.PI - delta;
                    }
                    else {
                        rotate = Math.PI - rotate - delta;
                    }
                }
            }

            var halfRotate = Math.PI / 8; // 夹角
            var x = idx === 0 ? xStart : xEnd;
            var y = idx === 0 ? yStart : yEnd;
            var point= [
                [
                    x + symbolSize * Math.cos(rotate - halfRotate),
                    y - symbolSize * Math.sin(rotate - halfRotate)
                ],
                [
                    x + symbolSize * 0.6 * Math.cos(rotate),
                    y - symbolSize * 0.6 * Math.sin(rotate)
                ],
                [
                    x + symbolSize * Math.cos(rotate + halfRotate),
                    y - symbolSize * Math.sin(rotate + halfRotate)
                ]
            ];
            ctx.moveTo(x, y);
            for (var i = 0, l = point.length; i <l; i++) {
                ctx.lineTo(point[i][0], point[i][1]);
            }
            ctx.lineTo(x, y);
        },

        getPointList : function (style) {
            var pointList = [
                [style.xStart, style.yStart],
                [style.xEnd, style.yEnd]
            ];
            if (style.smooth === 'spline') {
                var lastPointX = pointList[1][0];
                var lastPointY = pointList[1][1];
                if (style.smoothRadian <= 0.8) {
                    pointList[3] = [lastPointX, lastPointY];
                    var isReverse = pointList[0][0] <= pointList[3][0];
                    pointList[1] = this.getOffetPoint(pointList[0], pointList[3], isReverse, style.smoothRadian);
                    pointList[2] = this.getOffetPoint(pointList[3], pointList[0], isReverse, style.smoothRadian);
                }
                else {
                    pointList[2] = [lastPointX, lastPointY];
                    pointList[1] = this.getOffetPoint(
                        pointList[0], pointList[2], pointList[0][0] <= pointList[2][0], style.smoothRadian
                    );
                }
               
                pointList = smoothSpline(pointList, false);
                // 修正最后一点在插值产生的偏移
                pointList[pointList.length - 1] = [lastPointX, lastPointY];
            }
            return pointList;
        },

        /**
         * {Array} start point
         * {Array} end point
         */
        getOffetPoint : function (sp, ep, isReverse, deltaAngle) {
            var split = (2 - Math.abs(deltaAngle)) / 0.6;
            var distance = Math.sqrt(Math.round(
                    (sp[0] - ep[0]) * (sp[0] - ep[0]) + (sp[1] - ep[1]) * (sp[1] - ep[1])
                )) / split;
            //console.log(delta);
            var mp = [sp[0], sp[1]];
            var angle;
            if (sp[0] != ep[0] && sp[1] != ep[1]) {
                // 斜率存在
                var k = (ep[1] - sp[1]) / (ep[0] - sp[0]);
                angle = Math.atan(k);
            }
            else if (sp[0] == ep[0]){
                // 垂直线
                angle = (sp[1] <= ep[1] ? 1 : -1) * Math.PI / 2;
            }
            else {
                // 水平线
                angle = 0;
            }
            var dX;
            var dY;
            if (sp[0] <= ep[0]) {
                angle -= deltaAngle * (isReverse ? 1 : -1);
                dX = Math.round(Math.cos(angle) * distance);
                dY = Math.round(Math.sin(angle) * distance);
                mp[0] += dX;
                mp[1] += dY;
            }
            else {
                angle += deltaAngle * (isReverse ? 1 : -1);
                dX = Math.round(Math.cos(angle) * distance);
                dY = Math.round(Math.sin(angle) * distance);
                mp[0] -= dX;
                mp[1] -= dY;
            }
            return mp;
        },

        /**
         * 返回矩形区域，用于局部刷新和文字定位
         * @param {Object} style
         */
        getRect : function (style) {
            if (style.__rect) {
                return style.__rect;
            }

            var lineWidth = style.lineWidth || 1;
            style.__rect = {
                x : Math.min(style.xStart, style.xEnd) - lineWidth,
                y : Math.min(style.yStart, style.yEnd) - lineWidth,
                width : Math.abs(style.xStart - style.xEnd)
                        + lineWidth,
                height : Math.abs(style.yStart - style.yEnd)
                         + lineWidth
            };

            return style.__rect;
        },

        isCover : function (x, y) {
            var originPos = this.getTansform(x, y);
            x = originPos[0];
            y = originPos[1];

            // 快速预判并保留判断矩形
            var rect = this.style.__rect;
            if (!rect) {
                rect = this.style.__rect = this.getRect(this.style);
            }
            if (x >= rect.x
                && x <= (rect.x + rect.width)
                && y >= rect.y
                && y <= (rect.y + rect.height)
            ) {
                // 矩形内
                return this.style.smooth !== 'spline'
                       ? area.isInside(lineInstance, this.style, x, y)
                       : area.isInside(polylineInstance, this.style, x, y);
            }

            return false;
        }
    };

    zrUtil.inherits(MarkLine, Base);

    return MarkLine;
});
