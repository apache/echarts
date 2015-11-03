define(function (require) {

    return require('zrender/graphic/Path').extend({

        type: 'echartsGaugePointer',

        shape: {
            angle: 0,

            width: 10,

            r: 10,

            x: 0,

            y: 0
        },

        buildPath: function (ctx, shape) {
            var mathCos = Math.cos;
            var mathSin = Math.sin;

            var r = shape.r;
            var width = shape.width;
            var angle = shape.angle;
            var x = shape.x - mathCos(angle) * width * (width >= r / 3 ? 1 : 2);
            var y = shape.y - mathSin(angle) * width * (width >= r / 3 ? 1 : 2);

            angle = shape.angle - Math.PI / 2;
            ctx.moveTo(x, y);
            ctx.lineTo(
                shape.x + mathCos(angle) * width,
                shape.y + mathSin(angle) * width
            );
            ctx.lineTo(
                shape.x + mathCos(shape.angle) * r,
                shape.y + mathSin(shape.angle) * r
            );
            ctx.lineTo(
                shape.x - mathCos(angle) * width,
                shape.y - mathSin(angle) * width
            );
            ctx.lineTo(x, y);
            return;
        }
    });
});