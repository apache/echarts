/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：handlePolygon，dataRange手柄
 */
define(function (require) {
    var Base = require('zrender/shape/Base');
    var PolygonShape = require('zrender/shape/Polygon');
    var zrUtil = require('zrender/tool/util');

    function HandlePolygon(options) {
        Base.call(this, options);
    }

    HandlePolygon.prototype = {
        type : 'handle-polygon',
        /**
         * 创建多边形路径
         * @param {Context2D} ctx Canvas 2D上下文
         * @param {Object} style 样式
         */
        buildPath : function (ctx, style) {
            PolygonShape.prototype.buildPath(
                ctx, style
            );
        },
        isCover : require('./normalIsCover')
    };

    zrUtil.inherits(HandlePolygon, Base);

    return HandlePolygon;
});
