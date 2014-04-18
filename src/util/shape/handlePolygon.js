/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：handlePolygon，dataRange手柄
 */
define(
    function(require) {
        var Base = require('zrender/shape/Base');
        var matrix = require('zrender/tool/matrix');
        
        function HandlePolygon(options) {
            Base.call(this, options);
        }

        HandlePolygon.prototype = {
            type : 'handlePolygon',
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
            isCover : function(x, y) {
                //对鼠标的坐标也做相同的变换
                if(this.needTransform && this._transform){
                    var inverseMatrix = [];
                    matrix.invert(inverseMatrix, this._transform);

                    var originPos = [x, y];
                    matrix.mulVector(originPos, inverseMatrix, [x, y, 1]);

                    if (x == originPos[0] && y == originPos[1]) {
                        // 避免外部修改导致的__needTransform不准确
                        this.updateNeedTransform();
                    }

                    x = originPos[0];
                    y = originPos[1];
                }

                var rect = e.style.rect;
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

        require('zrender/tool/util').inherits(HandlePolygon, Base);
        return HandlePolygon;
    }
);