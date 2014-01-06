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
             * 创建线条路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                if (!style.lineType || style.lineType == 'solid') {
                    //默认为实线
                    ctx.moveTo(style.xStart, style.yStart);
                    ctx.lineTo(style.xEnd, style.yEnd);
                }
                else if (style.lineType == 'dashed'
                        || style.lineType == 'dotted'
                ) {
                    var dashLength =(style.lineWidth || 1)  
                                     * (style.lineType == 'dashed' ? 5 : 1);
                    this.dashedLineTo(
                        ctx,
                        style.xStart, style.yStart,
                        style.xEnd, style.yEnd,
                        dashLength
                    );
                }
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
                return false;
                //对鼠标的坐标也做相同的变换
                if(e.__needTransform && e._transform){
                    var inverseMatrix = [];
                    matrix.invert(inverseMatrix, e._transform);

                    var originPos = [x, y];
                    matrix.mulVector(originPos, inverseMatrix, [x, y, 1]);

                    if (x == originPos[0] && y == originPos[1]) {
                        // 避免外部修改导致的__needTransform不准确
                        if (Math.abs(e.rotation[0]) > 0.0001
                            || Math.abs(e.position[0]) > 0.0001
                            || Math.abs(e.position[1]) > 0.0001
                            || Math.abs(e.scale[0] - 1) > 0.0001
                            || Math.abs(e.scale[1] - 1) > 0.0001
                        ) {
                            e.__needTransform = true;
                        } else {
                            e.__needTransform = false;
                        }
                    }

                    x = originPos[0];
                    y = originPos[1];
                }

                // 快速预判并保留判断矩形
                var rect;
                if (e.style.__rect) {
                    rect = e.style.__rect;
                }
                else {
                    rect = this.getRect(e.style);
                    rect = [
                        rect.x,
                        rect.x + rect.width,
                        rect.y,
                        rect.y + rect.height
                    ];
                    e.style.__rect = rect;
                }
                if (x >= rect[0]
                    && x <= rect[1]
                    && y >= rect[2]
                    && y <= rect[3]
                ) {
                    // 矩形内
                    return true;
                }
                else {
                    return false;
                }
            }
        };

        require('zrender/shape/base').derive(MarkLine);
        require('zrender/shape').define('markLine', new MarkLine());
        
        return MarkLine;
    }
);