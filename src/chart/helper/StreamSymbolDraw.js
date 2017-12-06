// Temp.

import SymbolClz from './Symbol';
import IncrementalDisplayble from 'zrender/src/graphic/IncrementalDisplayable';
import * as graphic from '../../util/graphic';

/**
 * @constructor
 */
function SymbolDraw(symbolCtor) {
    this.root = new IncrementalDisplayble();

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

symbolDrawProto.updateData = function (data, isIgnore) {
    var seriesModel = this._seriesModel = data.hostModel;
    this._isIgnore = isIgnore;

    this.root.clearDisplaybles();

    doRender(this, seriesModel, isIgnore);
};

function doRender(self, seriesModel, isIgnore) {
    var root = self.root;
    var data = seriesModel.getData();
    var seriesModel = data.hostModel;
    var SymbolCtor = self._symbolCtor;

    var seriesScope = self._seriesScope = {
        itemStyle: seriesModel.getModel('itemStyle.normal').getItemStyle(['color']),
        hoverItemStyle: seriesModel.getModel('itemStyle.emphasis').getItemStyle(),
        symbolRotate: seriesModel.get('symbolRotate'),
        symbolOffset: seriesModel.get('symbolOffset'),
        hoverAnimation: seriesModel.get('hoverAnimation'),

        labelModel: seriesModel.getModel('label.normal'),
        hoverLabelModel: seriesModel.getModel('label.emphasis'),
        cursorStyle: seriesModel.get('cursor')
    };

    var dataEachTask = data.createEachTask(function (newIdx) {
        var point = data.getItemLayout(newIdx);
        if (symbolNeedsDraw(data, newIdx, isIgnore)) {
            // var symbolEl = new SymbolCtor(data, newIdx, seriesScope);
            // symbolEl.attr('position', point);
            // ??? not a good interface? which must ensure data index
            // corresponding implicitly.

            // ??? group?
            var symbolEl = new graphic.Circle({
                shape: {
                    r: 1 + Math.random() * 1
                },
                style: {
                    fill: '#121',
                    blend: 'lighter'
                },
                position: point
            });
            data.setItemGraphicEl(newIdx, symbolEl);

            root.addDisplayable(symbolEl, true);
        }
    });

    seriesModel.pipeTask(dataEachTask, 'render', ['updateViewBase']);
}

// ???
symbolDrawProto.updateView = function () {
    var seriesModel = this._seriesModel;
    if (!seriesModel) {
        return;
    }

    doRender(this, this._seriesModel, this._isIgnore);
};

symbolDrawProto.remove = function (enableAnimation) {
    var root = this.root;
    var data = this._data;
    if (data) {
        if (enableAnimation) {
            data.eachItemGraphicEl(function (el) {
                el.fadeOut(function () {
                    root.remove(el);
                });
            });
        }
        else {
            root.clearDisplaybles();
        }
    }
};

export default SymbolDraw;