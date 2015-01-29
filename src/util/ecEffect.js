/**
 * echarts图表特效基类
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *
 */
define(function (require) {
    var ecData = require('../util/ecData');
    
    var CircleShape = require('zrender/shape/Circle');
    var ImageShape = require('zrender/shape/Image');
    var IconShape = require('../util/shape/Icon');
    var SymbolShape = require('../util/shape/Symbol');
    
    var canvasSupported = require('zrender/tool/env').canvasSupported;
    
    function point(zr, effectList, shape, zlevel) {
        var effect = shape.effect;
        var color = effect.color || shape.style.strokeColor || shape.style.color;
        var shadowColor = effect.shadowColor || color;
        var size = effect.scaleSize;
        var distance = effect.bounceDistance;
        var shadowBlur = typeof effect.shadowBlur != 'undefined'
                         ? effect.shadowBlur : size;

        var effectShape;
        if (shape.type !== 'image') {
            effectShape = new IconShape({
                zlevel : zlevel,
                style : {
                    brushType : 'stroke',
                    iconType : shape.style.iconType != 'droplet'
                               ? shape.style.iconType
                               : 'circle',
                    x : shadowBlur + 1, // 线宽
                    y : shadowBlur + 1,
                    n : shape.style.n,
                    width : shape.style._width * size,
                    height : shape.style._height * size,
                    lineWidth : 1,
                    strokeColor : color,
                    shadowColor : shadowColor,
                    shadowBlur : shadowBlur
                },
                draggable : false,
                hoverable : false
            });
            if (shape.style.iconType == 'pin') {
                effectShape.style.y += effectShape.style.height / 2 * 1.5;
            }

            if (canvasSupported) {  // 提高性能，换成image
                effectShape.style.image = zr.shapeToImage(
                    effectShape, 
                    effectShape.style.width + shadowBlur * 2 + 2, 
                    effectShape.style.height + shadowBlur * 2 + 2
                ).style.image;
                
                effectShape = new ImageShape({
                    zlevel : effectShape.zlevel,
                    style : effectShape.style,
                    draggable : false,
                    hoverable : false
                });
            }
        }
        else {
            effectShape = new ImageShape({
                zlevel : zlevel,
                style : shape.style,
                draggable : false,
                hoverable : false
            });
        }
        
        ecData.clone(shape, effectShape);
        
        // 改变坐标，不能移到前面
        effectShape.position = shape.position;
        effectList.push(effectShape);
        zr.addShape(effectShape);
        
        var devicePixelRatio = shape.type !== 'image' ? (window.devicePixelRatio || 1) : 1;
        var offset = (effectShape.style.width / devicePixelRatio - shape.style._width) / 2;
        effectShape.style.x = shape.style._x - offset;
        effectShape.style.y = shape.style._y - offset;

        if (shape.style.iconType == 'pin') {
            effectShape.style.y -= shape.style.height / 2 * 1.5;
        }

        var duration = (effect.period + Math.random() * 10) * 100;
        
        zr.modShape(
            shape.id, 
            { invisible : true}
        );
        
        var centerX = effectShape.style.x + (effectShape.style.width) / 2 / devicePixelRatio;
        var centerY = effectShape.style.y + (effectShape.style.height) / 2 / devicePixelRatio;

        if (effect.type === 'scale') {
            // 放大效果
            zr.modShape(
                effectShape.id, 
                {
                    scale : [0.1, 0.1, centerX, centerY]
                }
            );
            
            zr.animate(effectShape.id, '', effect.loop)
                .when(
                    duration,
                    {
                        scale : [1, 1, centerX, centerY]
                    }
                )
                .done(function() {
                    shape.effect.show = false;
                    zr.delShape(effectShape.id);
                })
                .start();
        }
        else {
            zr.animate(effectShape.id, 'style', effect.loop)
                .when(
                    duration,
                    {
                        y : effectShape.style.y - distance
                    }
                )
                .when(
                    duration * 2,
                    {
                        y : effectShape.style.y
                    }
                )
                .done(function() {
                    shape.effect.show = false;
                    zr.delShape(effectShape.id);
                })
                .start();
        }
        
    }
    
    function largePoint(zr, effectList, shape, zlevel) {
        var effect = shape.effect;
        var color = effect.color || shape.style.strokeColor || shape.style.color;
        var size = effect.scaleSize;
        var shadowColor = effect.shadowColor || color;
        var shadowBlur = typeof effect.shadowBlur != 'undefined'
                         ? effect.shadowBlur : (size * 2);
        var devicePixelRatio = window.devicePixelRatio || 1;
        var effectShape = new SymbolShape({
            zlevel : zlevel,
            position : shape.position,
            scale : shape.scale,
            style : {
                pointList : shape.style.pointList,
                iconType : shape.style.iconType,
                color : color,
                strokeColor : color,
                shadowColor : shadowColor,
                shadowBlur : shadowBlur * devicePixelRatio,
                random : true,
                brushType: 'fill',
                lineWidth:1,
                size : shape.style.size
            },
            draggable : false,
            hoverable : false
        });
        
        effectList.push(effectShape);
        zr.addShape(effectShape);
        zr.modShape(
            shape.id, 
            { invisible : true}
        );
        
        var duration = Math.round(effect.period * 100);
        var clip1 = {};
        var clip2 = {};
        for (var i = 0; i < 20; i++) {
            effectShape.style['randomMap' + i] = 0;
            clip1 = {};
            clip1['randomMap' + i] = 100;
            clip2 = {};
            clip2['randomMap' + i] = 0;
            effectShape.style['randomMap' + i] = Math.random() * 100;
            zr.animate(effectShape.id, 'style', true)
                .when(duration, clip1)
                .when(duration * 2, clip2)
                .when(duration * 3, clip1)
                .when(duration * 4, clip1)
                .delay(Math.random() * duration * i)
                //.delay(duration / 15 * (15 - i + 1))
                .start();
            
        }
    }
    
    function line(zr, effectList, shape, zlevel) {
        var effect = shape.effect;
        var color = effect.color || shape.style.strokeColor || shape.style.color;
        var shadowColor = effect.shadowColor || shape.style.strokeColor || color;
        var size = shape.style.lineWidth * effect.scaleSize;
        var shadowBlur = typeof effect.shadowBlur != 'undefined'
                         ? effect.shadowBlur : size;
                     
        var effectShape = new CircleShape({
            zlevel : zlevel,
            style : {
                x : shadowBlur,
                y : shadowBlur,
                r : size,
                color : color,
                shadowColor : shadowColor,
                shadowBlur : shadowBlur
            },
            draggable : false,
            hoverable : false
        });
        
        var offset;
        if (canvasSupported) {  // 提高性能，换成image
            effectShape.style.image = zr.shapeToImage(
                effectShape, 
                (size + shadowBlur) * 2,
                (size + shadowBlur) * 2
            ).style.image;
            effectShape = new ImageShape({
                zlevel : effectShape.zlevel,
                style : effectShape.style,
                draggable : false,
                hoverable : false
            });
            offset = shadowBlur;
        }
        else {
            offset = 0;
        }
        
        ecData.clone(shape, effectShape);
        
        // 改变坐标， 不能移到前面
        effectShape.position = shape.position;
        effectList.push(effectShape);
        zr.addShape(effectShape);
        
        effectShape.style.x = shape.style.xStart - offset;
        effectShape.style.y = shape.style.yStart - offset;
        var distance = (shape.style.xStart - shape.style.xEnd) 
                            * (shape.style.xStart - shape.style.xEnd)
                        +
                       (shape.style.yStart - shape.style.yEnd) 
                            * (shape.style.yStart - shape.style.yEnd);
        var duration = Math.round(Math.sqrt(Math.round(
                           distance * effect.period * effect.period
                       )));
        if (!shape.style.smooth) {
            // 直线
            zr.animate(effectShape.id, 'style', effect.loop)
                .when(
                    duration,
                    {
                        x : shape._x - offset,
                        y : shape._y - offset
                    }
                )
                .done(function() {
                    shape.effect.show = false;
                    zr.delShape(effectShape.id);
                })
                .start();
        }
        else {
            // 曲线
            var pointList = shape.style.pointList || shape.getPointList(shape.style);
            var len = pointList.length;
            duration = Math.round(duration / len);
            var deferred = zr.animate(effectShape.id, 'style', effect.loop);
            var step = Math.ceil(len / 8);
            for (var j = 0; j < len - step; j+= step) {
                deferred.when(
                    duration * (j + 1),
                    {
                        x : pointList[j][0] - offset,
                        y : pointList[j][1] - offset
                    }
                );
            }
            deferred.when(
                duration * len,
                {
                    x : pointList[len - 1][0] - offset,
                    y : pointList[len - 1][1] - offset
                }
            );
            deferred.done(function() {
                shape.effect.show = false;
                zr.delShape(effectShape.id);
            });
            deferred.start('spline');
        }
    }

    return {
        point : point,
        largePoint : largePoint,
        line : line
    };
});
