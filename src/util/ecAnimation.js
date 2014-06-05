/**
 * echarts图表动画基类
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    /**
     * 折线型动画
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function pointList(zr, oldShape, newShape, duration, easing) {
        var newPointList = newShape.style.pointList;
        if (oldShape.style.pointList.length == newPointList.length) {
            newShape.style.pointList = oldShape.style.pointList;
        }
        else if (oldShape.style.pointList.length < newPointList.length) {
            // 原来短，新的长，补全
            newShape.style.pointList = oldShape.style.pointList.concat(
                newPointList.slice(oldShape.style.pointList.length)
            )
        }
        else {
            // 原来长，新的短，截断
            newShape.style.pointList = oldShape.style.pointList.slice(
                0, newPointList.length
            );
        }
        zr.addShape(newShape);
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                { pointList: newPointList }
            )
            .start(easing);
    }
    
    /**
     * 方型动画
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function rectangle(zr, oldShape, newShape, duration, easing) {
        var newX = newShape.style.x;
        var newY = newShape.style.y;
        var newWidth = newShape.style.width;
        var newHeight = newShape.style.height;
        newShape.style.x = oldShape.style.x;
        newShape.style.y = oldShape.style.y;
        newShape.style.width = oldShape.style.width;
        newShape.style.height = oldShape.style.height;
        zr.addShape(newShape);
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    x: newX,
                    y: newY,
                    width: newWidth,
                    height: newHeight
                }
            )
            .start(easing);
    }
    
    /**
     * 蜡烛动画
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function candle(zr, oldShape, newShape, duration, easing) {
        var newY = newShape.style.y;
        newShape.style.y = oldShape.style.y;
        zr.addShape(newShape);
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                { y: newY }
            )
            .start(easing);
    }
    
    /**
     * 环型动画
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function ring(zr, oldShape, newShape, duration, easing) {
        var x = newShape.style.x;
        var y = newShape.style.y;
        var r0 = newShape.style.r0;
        var r = newShape.style.r;
        
        newShape.style.r0 = 0;
        newShape.style.r = 0;
        newShape.rotation = [Math.PI*2, x, y];
        
        zr.addShape(newShape);
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    r0 : r0,
                    r : r
                }
            )
            .start(easing);
        zr.animate(newShape.id, '')
            .when(
                Math.round(duration / 3 * 2),
                { rotation : [0, x, y] }
            )
            .start(easing);
    }
    
    /**
     * 扇形动画
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function sector(zr, oldShape, newShape, duration, easing) {
        var startAngle = newShape.style.startAngle;
        var endAngle = newShape.style.endAngle;
        
        newShape.style.startAngle = oldShape.style.startAngle;
        newShape.style.endAngle = oldShape.style.endAngle;
        
        zr.addShape(newShape);
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    startAngle : startAngle,
                    endAngle : endAngle
                }
            )
            .start(easing);
    }
    
    /**
     * 文本动画
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function text(zr, oldShape, newShape, duration, easing) {
        var x = newShape.style.x;
        var y = newShape.style.y;
        
        newShape.style.x = oldShape.style.x;
        newShape.style.y = oldShape.style.y;
        
        zr.addShape(newShape);
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    x : x,
                    y : y
                }
            )
            .start(easing);
    }
    
    /**
     * 多边形动画
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function polygon(zr, oldShape, newShape, duration, easing) {
        var rect = require('zrender/shape/Polygon').prototype.getRect(newShape.style);
        var x = rect.x + rect.width / 2;
        var y = rect.y + rect.height / 2;
        
        newShape.scale = [0.1, 0.1, x, y];
        
        zr.addShape(newShape);
        zr.animate(newShape.id, '')
            .when(
                duration,
                {
                    scale : [1, 1, x, y]
                }
            )
            .start(easing);
    }
    
    /**
     * 和弦动画
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function chord(zr, oldShape, newShape, duration, easing) {
        var source0 = newShape.style.source0;
        var source1 = newShape.style.source1;
        var target0 = newShape.style.target0;
        var target1 = newShape.style.target1;
        
        if (oldShape.style) {
            newShape.style.source0 = oldShape.style.source0;
            newShape.style.source1 = oldShape.style.source1;
            newShape.style.target0 = oldShape.style.target0;
            newShape.style.target1 = oldShape.style.target1;
        }
        
        zr.addShape(newShape);
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    source0 : source0,
                    source1 : source1,
                    target0 : target0,
                    target1 : target1
                }
            )
            .start(easing);
    }

    return {
        pointList : pointList,
        rectangle : rectangle,
        candle : candle,
        ring : ring,
        sector : sector,
        text : text,
        polygon : polygon,
        chord : chord
    };
});
