/**
 * @module echarts/chart/helper/LineDraw
 */

import * as graphic from '../../util/graphic';
import LineGroup from './Line';


function isPointNaN(pt) {
    return isNaN(pt[0]) || isNaN(pt[1]);
}
function lineNeedsDraw(pts) {
    return !isPointNaN(pts[0]) && !isPointNaN(pts[1]);
}
/**
 * @alias module:echarts/component/marker/LineDraw
 * @constructor
 */
function LineDraw(ctor) {
    this._ctor = ctor || LineGroup;
    this.group = new graphic.Group();
}

var lineDrawProto = LineDraw.prototype;

/**
 * @param {module:echarts/data/List} lineData
 */
lineDrawProto.updateData = function (lineData) {

    var oldLineData = this._lineData;
    var group = this.group;
    var LineCtor = this._ctor;

    var hostModel = lineData.hostModel;

    var seriesScope = {
        lineStyle: hostModel.getModel('lineStyle.normal').getLineStyle(),
        hoverLineStyle: hostModel.getModel('lineStyle.emphasis').getLineStyle(),
        labelModel: hostModel.getModel('label.normal'),
        hoverLabelModel: hostModel.getModel('label.emphasis')
    };

    lineData.diff(oldLineData)
        .add(function (idx) {
            if (!lineNeedsDraw(lineData.getItemLayout(idx))) {
                return;
            }
            var lineGroup = new LineCtor(lineData, idx, seriesScope);

            lineData.setItemGraphicEl(idx, lineGroup);

            group.add(lineGroup);
        })
        .update(function (newIdx, oldIdx) {
            var lineGroup = oldLineData.getItemGraphicEl(oldIdx);
            if (!lineNeedsDraw(lineData.getItemLayout(newIdx))) {
                group.remove(lineGroup);
                return;
            }

            if (!lineGroup) {
                lineGroup = new LineCtor(lineData, newIdx, seriesScope);
            }
            else {
                lineGroup.updateData(lineData, newIdx, seriesScope);
            }

            lineData.setItemGraphicEl(newIdx, lineGroup);

            group.add(lineGroup);
        })
        .remove(function (idx) {
            group.remove(oldLineData.getItemGraphicEl(idx));
        })
        .execute();

    this._lineData = lineData;
};

lineDrawProto.updateLayout = function () {
    var lineData = this._lineData;
    lineData.eachItemGraphicEl(function (el, idx) {
        el.updateLayout(lineData, idx);
    }, this);
};

lineDrawProto.remove = function () {
    this.group.removeAll();
};

export default LineDraw;