/**
 * echarts图表动画基类
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var zrUtil = require('zrender/tool/util');
    
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
        var newPointListLen = newPointList.length;
        var oldPointList;

        if (!oldShape) {        // add
            oldPointList = [];
            if (newShape._orient != 'vertical') {
                var y = newPointList[0][1];
                for (var i = 0; i < newPointListLen; i++) {
                    oldPointList[i] = [newPointList[i][0], y];
                }
            }
            else {
                var x = newPointList[0][0];
                for (var i = 0; i < newPointListLen; i++) {
                    oldPointList[i] = [x, newPointList[i][1]];
                }
            }

            if (newShape.type == 'half-smooth-polygon') {
                oldPointList[newPointListLen - 1] = zrUtil.clone(newPointList[newPointListLen - 1]);
                oldPointList[newPointListLen - 2] = zrUtil.clone(newPointList[newPointListLen - 2]);
            }
            oldShape = {style : {pointList : oldPointList}};
        }
        
        oldPointList = oldShape.style.pointList;
        var oldPointListLen = oldPointList.length;
        if (oldPointListLen == newPointListLen) {
            newShape.style.pointList = oldPointList;
        }
        else if (oldPointListLen < newPointListLen) {
            // 原来短，新的长，补全
            newShape.style.pointList = oldPointList.concat(newPointList.slice(oldPointListLen));
        }
        else {
            // 原来长，新的短，截断
            newShape.style.pointList = oldPointList.slice(0, newPointListLen);
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
     * 复制样式
     * 
     * @inner
     * @param {Object} target 目标对象
     * @param {Object} source 源对象
     * @param {...string} props 复制的属性列表
     */
    function cloneStyle(target, source) {
        var len = arguments.length;
        for (var i = 2; i < len; i++) {
            var prop = arguments[i];
            target.style[prop] = source.style[prop];
        }
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
        var newShapeStyle = newShape.style;
        if (!oldShape) {        // add
            oldShape = {
                style : {
                    x : newShapeStyle.x,
                    y : newShape._orient == 'vertical'
                        ? newShapeStyle.y + newShapeStyle.height
                        : newShapeStyle.y,
                    width: newShape._orient == 'vertical' 
                           ? newShapeStyle.width : 0,
                    height: newShape._orient != 'vertical' 
                           ? newShapeStyle.height : 0
                }
            };
        }
        
        var newX = newShapeStyle.x;
        var newY = newShapeStyle.y;
        var newWidth = newShapeStyle.width;
        var newHeight = newShapeStyle.height;
        cloneStyle(
            newShape, oldShape,
            'x', 'y', 'width', 'height'
        );

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
        if (!oldShape) {        // add
            var y = newShape.style.y;
            oldShape = {style : {y : [y[0], y[0], y[0], y[0]]}};
        }
        
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
        
        if (newShape._animationAdd != 'r') {
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
        else {
            newShape.style.r0 = newShape.style.r;
            
            zr.addShape(newShape);
            zr.animate(newShape.id, 'style')
                .when(
                    duration,
                    {
                        r0 : r0
                    }
                )
                .start(easing);
        }
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
        if (!oldShape) {        // add
            if (newShape._animationAdd != 'r') {
                oldShape = {
                    style : {
                        startAngle : newShape.style.startAngle,
                        endAngle : newShape.style.startAngle
                    }
                };
            }
            else {
                oldShape = {style : {r0 : newShape.style.r}};
            }
        }
        
        var startAngle = newShape.style.startAngle;
        var endAngle = newShape.style.endAngle;
        
        cloneStyle(
            newShape, oldShape,
            'startAngle', 'endAngle'
        );
        
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
        if (!oldShape) {        // add
            oldShape = {
                style : {
                    x : newShape.style.textAlign == 'left' 
                        ? newShape.style.x + 100
                        : newShape.style.x - 100,
                    y : newShape.style.y
                }
            };
        }
        
        var x = newShape.style.x;
        var y = newShape.style.y;
        
        cloneStyle(
            newShape, oldShape,
            'x', 'y'
        );
        
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
        if (!oldShape) {        // add
            oldShape = {
                style : {
                    source0 : 0,
                    source1 : 360,
                    target0 : 0,
                    target1 : 360
                }
            };
        }
        
        var source0 = newShape.style.source0;
        var source1 = newShape.style.source1;
        var target0 = newShape.style.target0;
        var target1 = newShape.style.target1;
        
        if (oldShape.style) {
            cloneStyle(
                newShape, oldShape,
                'source0', 'source1', 'target0', 'target1'
            );
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
    
    /**
     * gaugePointer动画
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function gaugePointer(zr, oldShape, newShape, duration, easing) {
        if (!oldShape) {        // add
            oldShape = {
                style : {
                    angle : newShape.style.startAngle
                }
            };
        }
        
        var angle = newShape.style.angle;
        newShape.style.angle = oldShape.style.angle;
        zr.addShape(newShape);
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    angle : angle
                }
            )
            .start(easing);
    }
    
    /**
     * icon动画
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function icon(zr, oldShape, newShape, duration, easing) {
        // 避免markPoint特效取值在动画帧上
        newShape.style._x = newShape.style.x;
        newShape.style._y = newShape.style.y;
        newShape.style._width = newShape.style.width;
        newShape.style._height = newShape.style.height;

        if (!oldShape) {    // add
            var x = newShape._x || 0;
            var y = newShape._y || 0;
            newShape.scale = [0, 0, x, y];
            zr.addShape(newShape);
            zr.animate(newShape.id, '')
                .when(
                    duration,
                    {scale : [1, 1, x, y]}
                )
                .start(easing || 'QuinticOut');
        }
        else {              // mod
            rectangle(zr, oldShape, newShape, duration, easing);
        }
    }
    
    /**
     * line动画
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function line(zr, oldShape, newShape, duration, easing) {
        if (!oldShape) {
            oldShape = {
                style : {
                    xEnd : newShape.style.xStart,
                    yEnd : newShape.style.yStart
                }
            };
        }
        
        var xStart = newShape.style.xStart;
        var xEnd = newShape.style.xEnd;
        var yStart = newShape.style.yStart;
        var yEnd = newShape.style.yEnd;

        cloneStyle(
            newShape, oldShape,
            'xStart', 'xEnd', 'yStart', 'yEnd'
        );

        zr.addShape(newShape);
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    xStart: xStart,
                    xEnd: xEnd,
                    yStart: yStart,
                    yEnd: yEnd
                }
            )
            .start(easing);
    }
    
    /**
     * markline动画
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function markline(zr, oldShape, newShape, duration, easing) {
        if (!newShape.style.smooth) {
            newShape.style.pointList = !oldShape 
                ? [
                    [newShape.style.xStart, newShape.style.yStart],
                    [newShape.style.xStart, newShape.style.yStart]
                ]
                : oldShape.style.pointList;
            zr.addShape(newShape);
            zr.animate(newShape.id, 'style')
                .when(
                    duration,
                    {
                        pointList : [
                            [
                                newShape.style.xStart,
                                newShape.style.yStart
                            ],
                            [
                                newShape._x || 0, newShape._y || 0
                            ]
                        ]
                    }
                )
                .start(easing || 'QuinticOut');
        }
        else {
            // 曲线动画
            newShape.style.pointListLength = 1;
            zr.addShape(newShape);
            newShape.style.pointList = newShape.style.pointList 
                                       || newShape.getPointList(newShape.style);
            zr.animate(newShape.id, 'style')
                .when(
                    duration,
                    {
                        pointListLength : newShape.style.pointList.length
                    }
                )
                .start(easing || 'QuinticOut');
        }
    }

    return {
        pointList : pointList,
        rectangle : rectangle,
        candle : candle,
        ring : ring,
        sector : sector,
        text : text,
        polygon : polygon,
        chord : chord,
        gaugePointer : gaugePointer,
        icon : icon,
        line : line,
        markline : markline
    };
});
