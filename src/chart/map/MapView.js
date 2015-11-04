define(function (require) {

    // var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    var MapDraw = require('../../component/helper/MapDraw');

    require('../../echarts').extendChartView({

        type: 'map',

        render: function (mapModel, ecModel, api) {
            var group = this.group;
            group.removeAll();

            if (mapModel.needsDrawMap) {
                var mapDraw = this._mapDraw || new MapDraw(api, false);
                group.add(mapDraw.group);

                mapDraw.draw(mapModel, ecModel, api, mapModel.needsShowLabel);

                this._mapDraw = mapDraw;
            }
            else {
                // Remove drawed map
                this._mapDraw && this._mapDraw.remove();
                this._mapDraw = null;
            }

            mapModel.get('showLegendSymbol') && ecModel.getComponent('legend')
                && this._renderSymbols(mapModel, ecModel, api);
        },

        remove: function () {
            this._mapDraw && this._mapDraw.remove();
            this._mapDraw = null;
            this.group.removeAll();
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