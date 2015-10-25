define(function (require) {

    // var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    var MapDraw = require('../../component/helper/MapDraw');

    require('../../echarts').extendChartView({

        type: 'map',

        init: function (ecModel, api) {
            var mapDraw = new MapDraw(api, false);
            this._mapDraw = mapDraw;
        },

        render: function (mapModel, ecModel, api) {
            var group = this.group;
            var mapDraw = this._mapDraw;
            group.removeAll();

            group.add(mapDraw.group);

            if (mapModel.needsDrawMap) {
                mapModel.needsDrawMap
                    mapDraw.draw(mapModel, ecModel, api);
            }
            else {
                // Remove drawed map
                mapDraw.group.removeAll();
            }

            mapModel.get('showLegendSymbol') && ecModel.getComponent('legend')
                && this._renderSymbols(mapModel, ecModel, api);

        },

        _renderSymbols: function (mapModel, ecModel, api) {
            var data = mapModel.getData();
            var group = this.group;

            data.each('value', function (value, idx) {
                var itemModel = data.getItemModel(idx);
                var labelModel = itemModel.getModel('label.normal');
                var textStyleModel = labelModel.getModel('textStyle');

                var layout = data.getItemLayout(idx);
                var point = layout.point;
                var offset = layout.offset;

                var showLabel = labelModel.get('show');

                var labelText = data.getName(idx);
                var labelColor = textStyleModel.get('color');
                var labelFont = textStyleModel.getFont();

                if (!isNaN(value)) {
                    var circle = new graphic.Circle({
                        style: {
                            fill: data.getVisual('color')
                        },
                        shape: {
                            cx: point[0] + offset * 9,
                            cy: point[1],
                            r: 3
                        },
                        silent: true,

                        z2: 10
                    });

                    if (showLabel && !offset) {
                        circle.setStyle({
                            text: labelText,
                            textFill: labelColor,
                            textPosition: 'bottom',
                            textFont: labelFont
                        });
                    }

                    group.add(circle);
                }

            });
        }
    });
});