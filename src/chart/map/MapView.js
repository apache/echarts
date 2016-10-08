define(function (require) {

    // var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    var MapDraw = require('../../component/helper/MapDraw');

    require('../../echarts').extendChartView({

        type: 'map',

        render: function (mapModel, ecModel, api, payload) {
            // Not render if it is an toggleSelect action from self
            if (payload && payload.type === 'mapToggleSelect'
                && payload.from === this.uid
            ) {
                return;
            }

            var group = this.group;
            group.removeAll();
            // Not update map if it is an roam action from self
            if (!(payload && payload.type === 'geoRoam'
                && payload.componentType === 'series'
                && payload.seriesId === mapModel.id)) {

                if (mapModel.needsDrawMap) {
                    var mapDraw = this._mapDraw || new MapDraw(api, true);
                    group.add(mapDraw.group);

                    mapDraw.draw(mapModel, ecModel, api, this, payload);

                    this._mapDraw = mapDraw;
                }
                else {
                    // Remove drawed map
                    this._mapDraw && this._mapDraw.remove();
                    this._mapDraw = null;
                }
            }
            else {
                var mapDraw = this._mapDraw;
                mapDraw && group.add(mapDraw.group);
            }

            mapModel.get('showLegendSymbol') && ecModel.getComponent('legend')
                && this._renderSymbols(mapModel, ecModel, api);
        },

        remove: function () {
            this._mapDraw && this._mapDraw.remove();
            this._mapDraw = null;
            this.group.removeAll();
        },

        dispose: function () {
            this._mapDraw && this._mapDraw.remove();
            this._mapDraw = null;
        },

        _renderSymbols: function (mapModel, ecModel, api) {
            var originalData = mapModel.originalData;
            var group = this.group;

            originalData.each('value', function (value, idx) {
                if (isNaN(value)) {
                    return;
                }

                var layout = originalData.getItemLayout(idx);

                if (!layout || !layout.point) {
                    // Not exists in map
                    return;
                }

                var point = layout.point;
                var offset = layout.offset;

                var circle = new graphic.Circle({
                    style: {
                        // Because the special of map draw.
                        // Which needs statistic of multiple series and draw on one map.
                        // And each series also need a symbol with legend color
                        //
                        // Layout and visual are put one the different data
                        fill: mapModel.getData().getVisual('color')
                    },
                    shape: {
                        cx: point[0] + offset * 9,
                        cy: point[1],
                        r: 3
                    },
                    silent: true,
                    z2: 10
                });

                // First data on the same region
                if (!offset) {
                    var fullData = mapModel.mainSeries.getData();
                    var name = originalData.getName(idx);
                    var labelText = name;
                    var fullIndex = fullData.indexOfName(name);

                    var itemModel = originalData.getItemModel(idx);
                    var labelModel = itemModel.getModel('label.normal');
                    var hoverLabelModel = itemModel.getModel('label.emphasis');

                    var textStyleModel = labelModel.getModel('textStyle');
                    var hoverTextStyleModel = hoverLabelModel.getModel('textStyle');

                    var polygonGroups = fullData.getItemGraphicEl(fullIndex);
                    circle.setStyle({
                        textPosition: 'bottom'
                    });

                    var onEmphasis = function () {
                        circle.setStyle({
                            text: hoverLabelModel.get('show') ? labelText : '',
                            textFill: hoverTextStyleModel.getTextColor(),
                            textFont: hoverTextStyleModel.getFont()
                        });
                    };

                    var onNormal = function () {
                        circle.setStyle({
                            text: labelModel.get('show') ? labelText : '',
                            textFill: textStyleModel.getTextColor(),
                            textFont: textStyleModel.getFont()
                        });
                    };

                    polygonGroups.on('mouseover', onEmphasis)
                        .on('mouseout', onNormal)
                        .on('emphasis', onEmphasis)
                        .on('normal', onNormal);

                    onNormal();
                }

                group.add(circle);
            });
        }
    });
});