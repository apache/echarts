// Temp.

import * as graphic from '../../util/graphic';
import SymbolClz from './Symbol';
import {createTask} from 'zrender/src/core/task';

/**
 * @constructor
 * @alias module:echarts/chart/helper/SymbolDraw
 * @param {module:zrender/graphic/Group} [symbolCtor]
 */
function SymbolDraw(symbolCtor) {
    this.group = new graphic.Group();

    this._symbolCtor = symbolCtor || SymbolClz;
}

var symbolDrawProto = SymbolDraw.prototype;

function symbolNeedsDraw(data, idx, isIgnore) {
    var point = data.getItemLayout(idx);
    // Is an object
    // if (point && point.hasOwnProperty('point')) {
    //     point = point.point;
    // }
    return point && !isNaN(point[0]) && !isNaN(point[1]) && !(isIgnore && isIgnore(idx))
                && data.getItemVisual(idx, 'symbol') !== 'none';
}

symbolDrawProto.resetData = function (seriesModel, isIgnore) {
    this._seriesModel = seriesModel;

    var data = seriesModel.getData();
    var group = this.group;

    var seriesModel = data.hostModel;
    var SymbolCtor = this._symbolCtor;

    var seriesScope = this._seriesScope = {
        itemStyle: seriesModel.getModel('itemStyle.normal').getItemStyle(['color']),
        hoverItemStyle: seriesModel.getModel('itemStyle.emphasis').getItemStyle(),
        symbolRotate: seriesModel.get('symbolRotate'),
        symbolOffset: seriesModel.get('symbolOffset'),
        hoverAnimation: seriesModel.get('hoverAnimation'),

        labelModel: seriesModel.getModel('label.normal'),
        hoverLabelModel: seriesModel.getModel('label.emphasis'),
        cursorStyle: seriesModel.get('cursor')
    };

    group.removeAll();
    var dataEachTask = data.createEachTask(function (newIdx) {
        var point = data.getItemLayout(newIdx);
        if (symbolNeedsDraw(data, newIdx, isIgnore)) {
            var symbolEl = new SymbolCtor(data, newIdx, seriesScope);
            symbolEl.attr('position', point);
            data.setItemGraphicEl(newIdx, symbolEl);
            // ??? not a good interface? which must ensure data index
            // corresponding implicitly.
            group.add(symbolEl);
        }
    });

    group.enableStream();
    group.renderTask.reset();

    // ??? pipe here?
    seriesModel.pipe(dataEachTask);
    seriesModel.pipe(group.renderTask);

    return dataEachTask;
};

symbolDrawProto.updateLayout = function () {
    var seriesModel = this._seriesModel;
    if (!seriesModel) {
        return;
    }

    var group = this.group;

    var data = seriesModel.getData();

    var task = createTask({
        list: data,
        progress: function (params, notify) {
            var dueIndex = params.dueIndex;
            for (; dueIndex < params.dueEnd; dueIndex++) {
                var point = data.getItemLayout(dueIndex);
                var el = data.getItemGraphicEl(dueIndex);
                // Not use animation
                el.attr('position', point);
            }
            notify(dueIndex);
        }
    });

    group.enableStream();
    // group.renderTask.reset({reuseData: true});
    group.renderTask.reset();

    // ??? pipe here?
    seriesModel.pipe(task);
    seriesModel.pipe(group.renderTask);

    return task;
};

symbolDrawProto.remove = function (enableAnimation) {
    var group = this.group;
    var data = this._data;
    if (data) {
        if (enableAnimation) {
            data.eachItemGraphicEl(function (el) {
                el.fadeOut(function () {
                    group.remove(el);
                });
            });
        }
        else {
            group.removeAll();
        }
    }
};

export default SymbolDraw;