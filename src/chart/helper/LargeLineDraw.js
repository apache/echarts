// TODO Batch by color

import * as graphic from '../../util/graphic';
import LargeLineShape from './LargeLine';

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
        segs: data.getLayout('linesPoints'),
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

    // Add back
    this.group.add(lineEl);
};

largeLineProto.updateLayout = function (seriesModel) {
    var data = seriesModel.getData();
    this._lineEl.setShape({
        segs: data.getLayout('linesPoints')
    });
};

largeLineProto.remove = function () {
    this.group.removeAll();
};

export default LargeLineDraw;