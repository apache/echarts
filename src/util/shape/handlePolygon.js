/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：handlePolygon，dataRange手柄
 */
define(
    function(require) {
        var matrix = require('zrender/tool/matrix');
        
        function HandlePolygon() {
            this.type = 'handlePolygon';
        }

        HandlePolygon.prototype = {
            /**
             * 创建多边形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                require('zrender/shape').get('polygon').buildPath(
                    ctx, style
                );
                return;
            },
            isCover : function(e, x, y) {
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
                
                var rect = e.style.rect;
                // 提高交互体验，太小的图形包围盒四向扩大4px
                if (x >= rect.x
                    && x <= (rect.x + rect.width)
                    && y >= rect.y
                    && y <= (rect.y + rect.height)
                ) {
                    // 矩形内
                    return true;
                }
                else {
                    return false;
                }
            }
        };

        require('zrender/shape/base').derive(HandlePolygon);
        require('zrender/shape').define(
            'handlePolygon', new HandlePolygon()
        );

        return HandlePolygon;
    }
);