// TODO Batch by color

import * as graphic from '../../util/graphic';
import LargeLineShape from './LargeLine';
import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';

function LargeLineDraw() {
    this.group = new graphic.Group();

    this._lineEl = new LargeLineShape();
}

var largeLineProto = LargeLineDraw.prototype;

/**
 * Update symbols draw by new data
 * @param {module:echarts/data/List} data
 */
largeLineProto.updateData = function (data) {
    this.group.removeAll();

    var lineEl = this._lineEl;
    var seriesModel = data.hostModel;

    lineEl.setShape({
        segs: data.mapArray(data.getItemLayout)
    });

    this._setCommon(data, seriesModel);

    // Add back
    this.group.add(lineEl);
};

largeLineProto.updateLayout = function (seriesModel) {
    var data = seriesModel.getData();
    this._lineEl.setShape({
        segs: data.mapArray(data.getItemLayout)
    });
};

/**
 * @override
 */
largeLineProto.incrementalPrepare = function (data) {
    this._setCommon(data, data.hostModel);
    this._clearIncremental();

    !this._incremental && this.group.add(
        this._incremental = new IncrementalDisplayable()
    );
};

/**
 * @override
 */
largeLineProto.incrementalProgress = function (taskParams, data) {
    this._lineEl.setShape({
        segs: data.getLayout('linesPoints')
    });
    this._incremental.addDisplayable(this._lineEl, true);
};

/**
 * @override
 */
largeLineProto.remove = function () {
    this._clearIncremental();
    this._incremental = null;
    this.group.removeAll();
};

largeLineProto._setCommon = function (data, seriesModel, isIncremental) {
    var lineEl = this._lineEl;

    lineEl.setShape({
        polyline: seriesModel.get('polyline'),
        curveness: seriesModel.get('lineStyle.normal.curveness')
    });

    lineEl.useStyle(
        seriesModel.getModel('lineStyle.normal').getLineStyle()
    );

    var visualColor = data.getVisual('color');
    if (visualColor) {
        lineEl.setStyle('stroke', visualColor);
    }
    lineEl.setStyle('fill');

    if (!isIncremental) {
        // Enable tooltip
        // PENDING May have performance issue when path is extremely large
        lineEl.seriesIndex = seriesModel.seriesIndex;
        lineEl.on('mousemove', function (e) {
            lineEl.dataIndex = null;
            var dataIndex = lineEl.findDataIndex(e.offsetX, e.offsetY);
            if (dataIndex > 0) {
                // Provide dataIndex for tooltip
                lineEl.dataIndex = dataIndex;
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