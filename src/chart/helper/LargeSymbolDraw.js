// TODO Batch by color

import * as graphic from '../../util/graphic';
import {createSymbol} from '../../util/symbol';
import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';

var LargeSymbolPath = graphic.extendShape({

    shape: {
        points: null,
        sizes: null
    },

    symbolProxy: null,

    buildPath: function (path, shape) {
        var points = shape.points;
        var sizes = shape.sizes;
        var size = shape.size;

        var symbolProxy = this.symbolProxy;
        var symbolProxyShape = symbolProxy.shape;
        var ctx = path.getContext ? path.getContext() : path;
        for (var i = 0; i < points.length;) {
            var x = points[i++];
            var y = points[i++];

            if (isNaN(x) || isNaN(y)) {
                continue;
            }

            if (sizes) {
                size = sizes[i];
            }

            if (size[0] < 4) {
                // Optimize for small symbol
                // PENDING, Do fill in buildPath??
                ctx.fillRect(
                    x - size[0] / 2, y - size[1] / 2,
                    size[0], size[1]
                );
            }
            else {
                symbolProxyShape.x = x - size[0] / 2;
                symbolProxyShape.y = y - size[1] / 2;
                symbolProxyShape.width = size[0];
                symbolProxyShape.height = size[1];

                symbolProxy.buildPath(path, symbolProxyShape, true);
            }
        }
    },

    findDataIndex: function (x, y) {
        // TODO
        // support incremental, Typed array.

        // TODO ???
        // Consider transform

        // var shape = this.shape;
        // var points = shape.points;
        // var sizes = shape.sizes;

        // // Not consider transform
        // // Treat each element as a rect
        // // top down traverse
        // for (var i = points.length - 1; i >= 0; i--) {
        //     var pt = points[i];
        //     var size = sizes[i];
        //     var x0 = pt[0] - size[0] / 2;
        //     var y0 = pt[1] - size[1] / 2;
        //     if (x >= x0 && y >= y0 && x <= x0 + size[0] && y <= y0 + size[1]) {
        //         // i is dataIndex
        //         return i;
        //     }
        // }

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

    this._setCommon(data);

    // Add back
    this.group.add(symbolEl);
};

largeSymbolProto.incrementalPrepareUpdate = function (data) {
    this.group.removeAll();

    this._setCommon(data, true);
    this._clearIncremental();

    if (!this._incremental) {
        this._incremental = new IncrementalDisplayable();
    }
    this.group.add(this._incremental);
};

largeSymbolProto.incrementalUpdate = function (taskParams, data) {
    this._symbolEl.setShape({
        points: data.getLayout('symbolPoints')
    });
    this._incremental.addDisplayable(this._symbolEl, true);
};

largeSymbolProto._setCommon = function (data, isIncremental) {
    var symbolEl = this._symbolEl;
    var hostModel = data.hostModel;

    if (data.hasItemVisual.symbolSize) {
        // TODO typed array?
        symbolEl.setShape('sizes', data.mapArray(
            function (idx) {
                var size = data.getItemVisual(idx, 'symbolSize');
                return (size instanceof Array) ? size : [size, size];
            }
        ));
    }
    else {
        var size = data.getVisual('symbolSize');
        symbolEl.setShape('size', (size instanceof Array) ? size : [size, size]);
    }

    // Create symbolProxy to build path for each data
    symbolEl.symbolProxy = createSymbol(
        data.getVisual('symbol'), 0, 0, 0, 0
    );
    // Use symbolProxy setColor method
    symbolEl.setColor = symbolEl.symbolProxy.setColor;

    symbolEl.useStyle(
        hostModel.getModel('itemStyle.normal').getItemStyle(['color'])
    );

    var visualColor = data.getVisual('color');
    if (visualColor) {
        symbolEl.setColor(visualColor);
    }

    if (!isIncremental) {
        // Enable tooltip
        // PENDING May have performance issue when path is extremely large
        symbolEl.seriesIndex = hostModel.seriesIndex;
        symbolEl.on('mousemove', function (e) {
            symbolEl.dataIndex = null;
            var dataIndex = symbolEl.findDataIndex(e.offsetX, e.offsetY);
            if (dataIndex >= 0) {
                // Provide dataIndex for tooltip
                symbolEl.dataIndex = dataIndex;
            }
        });
    }
};

largeSymbolProto.remove = function () {
    this._clearIncremental();
    this._incremental = null;
    this.group.removeAll();
};

largeSymbolProto._clearIncremental = function () {
    var incremental = this._incremental;
    if (incremental) {
        incremental.clearDisplaybles();
    }
};

export default LargeSymbolDraw;