define(function (require) {

    var graphic = require('../../util/graphic');
    var symbolUtil = require('../../util/symbol');

    var LargeSymbolPath = graphic.extendShape({
        shape: {
            points: null,
            sizes: null
        },

        symbolProxy: null,

        buildPath: function (path, shape) {
            var points = shape.points;
            var sizes = shape.sizes;

            var symbolProxy = this.symbolProxy;
            var symbolProxyShape = symbolProxy.shape;
            for (var i = 0; i < points.length; i++) {
                var pt = points[i];
                var size = sizes[i];
                if (size < 4) {
                    // Optimize for small symbol
                    path.rect(
                        pt[0] - size / 2, pt[1] - size / 2,
                        size, size
                    );
                }
                else {
                    symbolProxyShape.x = pt[0] - size / 2;
                    symbolProxyShape.y = pt[1] - size / 2;
                    symbolProxyShape.width = size;
                    symbolProxyShape.height = size;

                    symbolProxy.buildPath(path, symbolProxyShape);
                }
            }
        }
    });

    function LargeSymbolDraw() {
        this.group = new graphic.Group();

        this._symbolEl = new LargeSymbolPath({
            silent: true
        });
    }

    var largeSymbolProto = LargeSymbolDraw.prototype;

    /**
     * Update symbols draw by new data
     * @param {module:echarts/data/List} data
     * @param {module:echarts/ExtensionAPI} api
     */
    largeSymbolProto.updateData = function (data, api) {
        var symbolEl = this._symbolEl;

        var seriesModel = data.hostModel;

        symbolEl.setShape({
            points: data.mapArray(data.getItemLayout),
            sizes: data.mapArray(
                function (idx) {
                    return data.getItemVisual(idx, 'symbolSize');
                }
            )
        });

        // Create symbolProxy to build path for each data
        symbolEl.symbolProxy = symbolUtil.createSymbol(
            data.getVisual('symbol'), 0, 0, 0, 0
        );
        // Use symbolProxy setColor method
        symbolEl.setColor = symbolEl.symbolProxy.setColor;

        symbolEl.setStyle(
            seriesModel.getModel('itemStyle.normal').getItemStyle(['color'])
        );

        var visualColor = data.getVisual('color');
        if (visualColor) {
            symbolEl.setColor(visualColor);
        }

        // Add back
        this.group.add(this._symbolEl);
    };

    largeSymbolProto.updateLayout = function (seriesModel) {
        var data = seriesModel.getData();
        this._symbolEl.setShape({
            points: data.mapArray(data.getItemLayout)
        });
    };

    largeSymbolProto.remove = function () {
        this.group.removeAll();
    };

    return LargeSymbolDraw;
});