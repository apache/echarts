// TODO Batch by color

import * as graphic from '../../util/graphic';
import {createSymbol} from '../../util/symbol';

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

            if (isNaN(pt[0]) || isNaN(pt[1])) {
                continue;
            }

            var size = sizes[i];
            if (size[0] < 4) {
                // Optimize for small symbol
                path.rect(
                    pt[0] - size[0] / 2, pt[1] - size[1] / 2,
                    size[0], size[1]
                );
            }
            else {
                symbolProxyShape.x = pt[0] - size[0] / 2;
                symbolProxyShape.y = pt[1] - size[1] / 2;
                symbolProxyShape.width = size[0];
                symbolProxyShape.height = size[1];

                symbolProxy.buildPath(path, symbolProxyShape, true);
            }
        }
    },

    findDataIndex: function (x, y) {
        var shape = this.shape;
        var points = shape.points;
        var sizes = shape.sizes;

        // Not consider transform
        // Treat each element as a rect
        // top down traverse
        for (var i = points.length - 1; i >= 0; i--) {
            var pt = points[i];
            var size = sizes[i];
            var x0 = pt[0] - size[0] / 2;
            var y0 = pt[1] - size[1] / 2;
            if (x >= x0 && y >= y0 && x <= x0 + size[0] && y <= y0 + size[1]) {
                // i is dataIndex
                return i;
            }
        }

        return -1;
    }
});

function LargeSymbolDraw() {
    this.group = new graphic.Group();

    this._symbolEl = new LargeSymbolPath({
        // rectHover: true,
        // cursor: 'default'
    });
}

var largeSymbolProto = LargeSymbolDraw.prototype;

/**
 * Update symbols draw by new data
 * @param {module:echarts/data/List} data
 */
largeSymbolProto.updateData = function (data) {
    this.group.removeAll();

    var symbolEl = this._symbolEl;

    var seriesModel = data.hostModel;

    symbolEl.setShape({
        points: data.mapArray(data.getItemLayout),
        sizes: data.mapArray(
            function (idx) {
                var size = data.getItemVisual(idx, 'symbolSize');
                if (!(size instanceof Array)) {
                    size = [size, size];
                }
                return size;
            }
        )
    });

    // Create symbolProxy to build path for each data
    symbolEl.symbolProxy = createSymbol(
        data.getVisual('symbol'), 0, 0, 0, 0
    );
    // Use symbolProxy setColor method
    symbolEl.setColor = symbolEl.symbolProxy.setColor;

    symbolEl.useStyle(
        seriesModel.getModel('itemStyle.normal').getItemStyle(['color'])
    );

    var visualColor = data.getVisual('color');
    if (visualColor) {
        symbolEl.setColor(visualColor);
    }

    // Enable tooltip
    // PENDING May have performance issue when path is extremely large
    symbolEl.seriesIndex = seriesModel.seriesIndex;
    symbolEl.on('mousemove', function (e) {
        symbolEl.dataIndex = null;
        var dataIndex = symbolEl.findDataIndex(e.offsetX, e.offsetY);
        if (dataIndex >= 0) {
            // Provide dataIndex for tooltip
            symbolEl.dataIndex = dataIndex;
        }
    });

    // Add back
    this.group.add(symbolEl);
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

export default LargeSymbolDraw;