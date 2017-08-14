define(function (require) {
    // List layout
    var layout = require('../../util/layout');
    var formatUtil = require('../../util/format');
    var graphic = require('../../util/graphic');

    return {
        /**
         * Layout list like component.
         * It will box layout each items in group of component and then position the whole group in the viewport
         * @param {module:zrender/group/Group} group
         * @param {module:echarts/model/Component} componentModel
         * @param {module:echarts/ExtensionAPI}
         */
        layout: function (group, componentModel, api) {
            var boxLayoutParams = componentModel.getBoxLayoutParams();
            var padding = componentModel.get('padding');
            var viewportSize = {width: api.getWidth(), height: api.getHeight()};

            var rect = layout.getLayoutRect(
                boxLayoutParams,
                viewportSize,
                padding
            );

            layout.box(
                componentModel.get('orient'),
                group,
                componentModel.get('itemGap'),
                rect.width,
                rect.height
            );

            layout.positionElement(
                group,
                boxLayoutParams,
                viewportSize,
                padding
            );
        },

        makeBackground: function (rect, componentModel) {
            var padding = formatUtil.normalizeCssArray(
                componentModel.get('padding')
            );
            var style = componentModel.getItemStyle(['color', 'opacity']);
            style.fill = componentModel.get('backgroundColor');
            var rect = new graphic.Rect({
                shape: {
                    x: rect.x - padding[3],
                    y: rect.y - padding[0],
                    width: rect.width + padding[1] + padding[3],
                    height: rect.height + padding[0] + padding[2],
                    r: componentModel.get('borderRadius')
                },
                style: style,
                silent: true,
                z2: -1
            });
            // FIXME
            // `subPixelOptimizeRect` may bring some gap between edge of viewpart
            // and background rect when setting like `left: 0`, `top: 0`.
            // graphic.subPixelOptimizeRect(rect);

            return rect;
        }
    };
});