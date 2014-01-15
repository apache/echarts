/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：标线
 */
define(
    function(require) {
        var matrix = require('zrender/tool/matrix');
        
        function MarkLine() {
            this.type = 'markLine';
        }

        MarkLine.prototype =  {
            /**
             * 画刷
             * @param ctx       画布句柄
             * @param e         形状实体
             * @param isHighlight   是否为高亮状态
             * @param updateCallback 需要异步加载资源的shape可以通过这个callback(e)
             *                       让painter更新视图，base.brush没用，需要的话重载brush
             */
            brush : function(ctx, e, isHighlight) {
                var style = e.style || {};
    
                if (isHighlight) {
                    // 根据style扩展默认高亮样式
                    style = this.getHighlightStyle(
                        style,
                        e.highlightStyle || {}
                    );
                }

                ctx.save();
                this.setContext(ctx, style);
    
                // 设置transform
                if (e.__needTransform) {
                    ctx.transform.apply(ctx,this.updateTransform(e));
                }
    
                ctx.beginPath();
                this.buildLinePath(ctx, style);
                ctx.stroke();
                
                this.brushSymbol(e, ctx, style, 0);
                this.brushSymbol(e, ctx, style, 1);
    
                if (typeof style.text != 'undefined') {
                    this.drawText(ctx, style, e.style);
                }
    
                ctx.restore();
    
                return;
            },
        
            /**
             * 创建线条路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildLinePath : function(ctx, style) {
                //var symbolSize = style.symbolSize;
                var xStart = style.xStart;
                var xEnd = style.xEnd;
                var yStart = style.yStart;
                var yEnd = style.yEnd;
                /*
                if (xStart > xEnd) {
                    xStart -= symbolSize[0];
                    xEnd += symbolSize[1];
                }
                else {
                    xStart += symbolSize[0];
                    xEnd -= symbolSize[1];
                }
                if (yStart > yEnd) {
                    yStart -= symbolSize[0];
                    yEnd += symbolSize[1];
                }
                else {
                    yStart += symbolSize[0];
                    yEnd -= symbolSize[1];
                }
                */
                if (!style.lineType || style.lineType == 'solid') {
                    //默认为实线
                    ctx.moveTo(xStart, yStart);
                    ctx.lineTo(xEnd, yEnd);
                }
                else if (style.lineType == 'dashed'
                        || style.lineType == 'dotted'
                ) {
                    var dashLength =(style.lineWidth || 1)  
                                     * (style.lineType == 'dashed' ? 5 : 1);
                    this.dashedLineTo(
                        ctx,
                        xStart, yStart,
                        xEnd, yEnd,
                        dashLength
                    );
                }
            },

            /**
             * 标线始末标注 
             */
            brushSymbol : function(e, ctx, style, idx) {
                ctx.save();
                ctx.beginPath();
                
                ctx.lineWidth = style.symbolBorder;
                ctx.strokeStyle = style.symbolBorderColor;
                // symbol
                style.iconType = style.symbol[idx].replace('empty', '')
                                                .toLowerCase();
                if (style.symbol[idx].match('empty')) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
                }
                
                // symbolRotate
                var x = idx === 0 ? style.xStart : style.xEnd;
                var y = idx === 0 ? style.yStart : style.yEnd;
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
                    require('zrender/shape').get('icon').buildPath(ctx, style);
                }
                
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
                ctx.restore();
            },
            
            buildArrawPath : function (ctx, style, idx) {
                var symbolSize = style.symbolSize[idx];
                var xStart = style.xStart;
                var xEnd = style.xEnd;
                var yStart = style.yStart;
                var yEnd = style.yEnd;
                // 原谅我吧，这三角函数实在没想明白，只能这么笨了
                var rotate = Math.atan(
                        Math.abs((yEnd - yStart) / (xStart - xEnd)
                    ));
                if (idx === 0) {
                    if (xEnd > xStart) {
                        if (yEnd > yStart) {
                            rotate =  Math.PI * 2 - rotate;
                        }
                    }
                    else {
                        if (yEnd > yStart) {
                            rotate += Math.PI;
                        }
                        else {
                            rotate = Math.PI - rotate;
                        }
                    }
                }
                else {
                    if (xStart > xEnd) {
                        if (yStart > yEnd) {
                            rotate =  Math.PI * 2 - rotate;
                        }
                    }
                    else {
                        if (yStart > yEnd) {
                            rotate += Math.PI;
                        }
                        else {
                            rotate = Math.PI - rotate;
                        }
                    }
                }
                
                var halfRotate = Math.PI / 8; // 夹角
                var x = idx === 0 ? xStart : xEnd;
                var y = idx === 0 ? yStart : yEnd;
                var point= [
                    [
                        x + symbolSize * Math.cos(rotate - halfRotate),
                        y - symbolSize * Math.sin(rotate - halfRotate),
                    ],
                    [
                        x + symbolSize * 0.6 * Math.cos(rotate),
                        y - symbolSize * 0.6 * Math.sin(rotate),
                    ],
                    [
                        x + symbolSize * Math.cos(rotate + halfRotate),
                        y - symbolSize * Math.sin(rotate + halfRotate),
                    ]
                ];
                ctx.moveTo(x, y);
                for (var i = 0, l = point.length; i <l; i++) {
                    ctx.lineTo(point[i][0], point[i][1]);
                }
                ctx.lineTo(x, y);
            },
            
            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var lineWidth = style.lineWidth || 1;
                return {
                    x : Math.min(style.xStart, style.xEnd) - lineWidth,
                    y : Math.min(style.yStart, style.yEnd) - lineWidth,
                    width : Math.abs(style.xStart - style.xEnd)
                            + lineWidth,
                    height : Math.abs(style.yStart - style.yEnd)
                             + lineWidth
                };
            },
            
            isCover : function(e, x, y) {
                return require('zrender/shape').get('line').isCover(e,x,y);
            }
        };

        require('zrender/shape/base').derive(MarkLine);
        require('zrender/shape').define('markLine', new MarkLine());
        
        return MarkLine;
    }
);