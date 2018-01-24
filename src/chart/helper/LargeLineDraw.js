// TODO Batch by color

import * as graphic from '../../util/graphic';
import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';
import * as lineContain from 'zrender/src/contain/line';
import * as quadraticContain from 'zrender/src/contain/quadratic';

var LargeLineShape = graphic.extendShape({

    shape: {
        polyline: false,
        curveness: 0,
        segs: []
    },

    buildPath: function (path, shape) {
        var segs = shape.segs;
        var curveness = shape.curveness;

        if (shape.polyline) {
            for (var i = 0; i < segs.length;) {
                var count = segs[i++];
                if (count > 0) {
                    path.moveTo(segs[i++], segs[i++]);
                    for (var k = 1; k < count; k++) {
                        path.lineTo(segs[i++], segs[i++]);
                    }
                }
            }
        }
        else {
            for (var i = 0; i < segs.length;) {
                var x0 = segs[i++];
                var y0 = segs[i++];
                var x1 = segs[i++];
                var y1 = segs[i++];
                path.moveTo(x0, y0);
                if (curveness > 0) {
                    var x2 = (x0 + x1) / 2 - (y0 - y1) * curveness;
                    var y2 = (y0 + y1) / 2 - (x1 - x0) * curveness;
                    path.quadraticCurveTo(x2, y2, x1, y1);
                }
                else {
                    path.lineTo(x1, y1);
                }
            }
        }
    },

    findDataIndex: function (x, y) {

        var shape = this.shape;
        var segs = shape.segs;
        var curveness = shape.curveness;

        if (shape.polyline) {
            var dataIndex = 0;
            for (var i = 0; i < segs.length;) {
                var count = segs[i++];
                if (count > 0) {
                    var x0 = segs[i++];
                    var y0 = segs[i++];
                    for (var k = 1; k < count; k++) {
                        var x1 = segs[i++];
                        var y1 = segs[i++];
                        if (lineContain.containStroke(x0, y0, x1, y1)) {
                            return dataIndex;
                        }
                    }
                }

                dataIndex++;
            }
        }
        else {
            var dataIndex = 0;
            for (var i = 0; i < segs.length;) {
                var x0 = segs[i++];
                var y0 = segs[i++];
                var x1 = segs[i++];
                var y1 = segs[i++];
                if (curveness > 0) {
                    var x2 = (x0 + x1) / 2 - (y0 - y1) * curveness;
                    var y2 = (y0 + y1) / 2 - (x1 - x0) * curveness;

                    if (quadraticContain.containStroke(x0, y0, x2, y2, x1, y1)) {
                        return dataIndex;
                    }
                }
                else {
                    if (lineContain.containStroke(x0, y0, x1, y1)) {
                        return dataIndex;
                    }
                }

                dataIndex++;
            }
        }

        return -1;
    }
});

function LargeLineDraw() {
    this.group = new graphic.Group();
}

var largeLineProto = LargeLineDraw.prototype;

largeLineProto.isPersistent = function () {
    return !this._incremental;
};

/**
 * Update symbols draw by new data
 * @param {module:echarts/data/List} data
 */
largeLineProto.updateData = function (data) {
    this.group.removeAll();

    var lineEl = new LargeLineShape({
        rectHover: true,
        cursor: 'default'
    });
    lineEl.setShape({
        segs: data.getLayout('linesPoints')
    });

    this._setCommon(lineEl, data);

    // Add back
    this.group.add(lineEl);

    this._incremental = null;
};

/**
 * @override
 */
largeLineProto.incrementalPrepareUpdate = function (data) {
    this.group.removeAll();

    this._clearIncremental();

    if (data.count() > 5e5) {
        if (!this._incremental) {
            this._incremental = new IncrementalDisplayable({
                silent: true
            });
        }
        this.group.add(this._incremental);
    }
    else {
        this._incremental = null;
    }
};

/**
 * @override
 */
largeLineProto.incrementalUpdate = function (taskParams, data) {
    var lineEl = new LargeLineShape();
    lineEl.setShape({
        segs: data.getLayout('linesPoints')
    });
    this._setCommon(lineEl, data, !!this._incremental);

    if (!this._incremental) {
        lineEl.rectHover = true;
        lineEl.cursor = 'default';
        lineEl.__startIndex = taskParams.start;
        this.group.add(lineEl);
    }
    else {
        this._incremental.addDisplayable(lineEl, true);
    }
};

/**
 * @override
 */
largeLineProto.remove = function () {
    this._clearIncremental();
    this._incremental = null;
    this.group.removeAll();
};

largeLineProto._setCommon = function (lineEl, data, isIncremental) {
    var hostModel = data.hostModel;

    lineEl.setShape({
        polyline: hostModel.get('polyline'),
        curveness: hostModel.get('lineStyle.curveness')
    });

    lineEl.useStyle(
        hostModel.getModel('lineStyle').getLineStyle()
    );
    lineEl.style.strokeNoScale = true;

    var visualColor = data.getVisual('color');
    if (visualColor) {
        lineEl.setStyle('stroke', visualColor);
    }
    lineEl.setStyle('fill');

    if (!isIncremental) {
        // Enable tooltip
        // PENDING May have performance issue when path is extremely large
        lineEl.seriesIndex = hostModel.seriesIndex;
        lineEl.on('mousemove', function (e) {
            lineEl.dataIndex = null;
            var dataIndex = lineEl.findDataIndex(e.offsetX, e.offsetY);
            if (dataIndex > 0) {
                // Provide dataIndex for tooltip
                lineEl.dataIndex = dataIndex + lineEl.__startIndex;
            }
        });
    }
};

largeLineProto._clearIncremental = function () {
    var incremental = this._incremental;
    if (incremental) {
        incremental.clearDisplaybles();
    }
};

export default LargeLineDraw;