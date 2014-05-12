/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：标线
 */
define(function (require) {
    var Base = require('zrender/shape/Base');
    var IconShape = require('./Icon');
    var LineShape = require('zrender/shape/Line');

    var dashedLineTo = require('zrender/shape/util/dashedLineTo');
    var zrUtil = require('zrender/tool/util');
    
    
    function Chain(options) {
        Base.call(this, options);
    }

    Chain.prototype =  {
        type : 'chain',
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
            this.updateTransform(ctx);

            ctx.beginPath();
            this.buildLinePath(ctx, style);
            ctx.stroke();
            
            this.brushSymbol(ctx, style);

            ctx.restore();
            return;
        },
    
        /**
         * 创建线条路径
         * @param {Context2D} ctx Canvas 2D上下文
         * @param {Object} style 样式
         */
        buildLinePath : function (ctx, style) {
            var x = style.x;
            var y = style.y + 4;
            var width = style.width;
            var height = style.height - 8;
            
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + height);
            ctx.moveTo(x + width, y);
            ctx.lineTo(x + width, y + height);
            
            ctx.moveTo(x, y + height / 2);
            if (!style.lineType || style.lineType == 'solid') {
                ctx.lineTo(x + width, y + height / 2);
            }
            else if (style.lineType == 'dashed' || style.lineType == 'dotted') {
                var dashLength = (style.lineWidth || 1) 
                             * (style.lineType == 'dashed' ? 5 : 1);
                dashedLineTo(ctx, x, y + height / 2, x + width, y + height / 2, dashLength);
            }
        },

        /**
         * 标线始末标注 
         */
        brushSymbol : function (ctx, style) {
            var y = style.y + style.height / 2;
            ctx.save();
            
            var chainPoint = style.chainPoint;
            for (var idx = 0, l = chainPoint.length; idx < l; idx++) {
                if (chainPoint[idx] == 'none') {
                    continue;
                }
                ctx.beginPath();
                
                var symbolSize = chainPoint[idx].symbolSize;
                IconShape.prototype.buildPath(
                    ctx, 
                    {
                        iconType : chainPoint[idx].symbol,
                        x : chainPoint[idx].x - symbolSize,
                        y : y - symbolSize,
                        width : symbolSize * 2,
                        height : symbolSize * 2,
                        n : chainPoint[idx].n
                    }
                );
                ctx.fillStyle = chainPoint[idx].isEmpty ? '#fff' : style.strokeColor;
                
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
            
            ctx.restore();
        },
        
        getPointList : function (style) {
            var pointList = [
                [style.xStart, style.yStart],
                [style.xEnd, style.yEnd]
            ];
            if (style.smooth === 'spline') {
                var lastPointX = pointList[1][0];
                var lastPointY = pointList[1][1];
                pointList[3] = [lastPointX, lastPointY];
                pointList[1] = this.getOffetPoint(pointList[0], pointList[3]);
                pointList[2] = this.getOffetPoint(pointList[3], pointList[0]);
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
        getOffetPoint : function (sp, ep) {
            var distance = Math.sqrt(Math.round(
                    (sp[0] - ep[0]) * (sp[0] - ep[0]) + (sp[1] - ep[1]) * (sp[1] - ep[1])
                )) / 3;
            //console.log(delta);
            var mp = [sp[0], sp[1]];
            var angle;
            var deltaAngle = 0.2; // 偏移0.2弧度
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
                angle -= deltaAngle;
                dX = Math.round(Math.cos(angle) * distance);
                dY = Math.round(Math.sin(angle) * distance);
                mp[0] += dX;
                mp[1] += dY;
            }
            else {
                angle += deltaAngle;
                dX = Math.round(Math.cos(angle) * distance);
                dY = Math.round(Math.sin(angle) * distance);
                mp[0] -= dX;
                mp[1] -= dY;
            }
            return mp;
        },
        
        isCover : function (x, y) {
            return false;
        }
    };

    zrUtil.inherits(Chain, Base);
    
    return Chain;
});