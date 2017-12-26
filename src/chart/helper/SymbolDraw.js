/**
 * @module echarts/chart/helper/SymbolDraw
 */

import * as graphic from '../../util/graphic';
import SymbolClz from './Symbol';
// import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';

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

function symbolNeedsDraw(data, point, idx, isIgnore) {
    return point && !isNaN(point[0]) && !isNaN(point[1])
        && !(isIgnore && isIgnore(idx))
        && data.getItemVisual(idx, 'symbol') !== 'none';
}
/**
 * Update symbols draw by new data
 * @param {module:echarts/data/List} data
 * @param {Array.<boolean>} [isIgnore]
 */
symbolDrawProto.updateData = function (data, isIgnore) {
    var group = this.group;
    var seriesModel = data.hostModel;
    var oldData = this._data;
    var SymbolCtor = this._symbolCtor;

    var seriesScope = makeSeriesScope(data);

    data.diff(oldData)
        .add(function (newIdx) {
            var point = data.getItemLayout(newIdx);
            if (symbolNeedsDraw(data, point, newIdx, isIgnore)) {
                var symbolEl = new SymbolCtor(data, newIdx, seriesScope);
                symbolEl.attr('position', point);
                data.setItemGraphicEl(newIdx, symbolEl);
                group.add(symbolEl);
            }
        })
        .update(function (newIdx, oldIdx) {
            var symbolEl = oldData.getItemGraphicEl(oldIdx);
            var point = data.getItemLayout(newIdx);
            if (!symbolNeedsDraw(data, point, newIdx, isIgnore)) {
                group.remove(symbolEl);
                return;
            }
            if (!symbolEl) {
                symbolEl = new SymbolCtor(data, newIdx);
                symbolEl.attr('position', point);
            }
            else {
                symbolEl.updateData(data, newIdx, seriesScope);
                graphic.updateProps(symbolEl, {
                    position: point
                }, seriesModel);
            }

            // Add back
            group.add(symbolEl);

            data.setItemGraphicEl(newIdx, symbolEl);
        })
        .remove(function (oldIdx) {
            var el = oldData.getItemGraphicEl(oldIdx);
            el && el.fadeOut(function () {
                group.remove(el);
            });
        })
        .execute();

    this._data = data;
};

// ??? remove
symbolDrawProto.updateLayout = function () {
    var data = this._data;
    if (data) {
        // Not use animation
        data.eachItemGraphicEl(function (el, idx) {
            var point = data.getItemLayout(idx);
            el.attr('position', point);
        });
    }
};

// symbolDrawProto.incrementalPrepareUpdate = function (data) {
//     this._seriesScope = makeSeriesScope(data);
//     this._clearIncremental();

//     !this._incremental && this.group.add(
//         this._incremental = new IncrementalDisplayable()
//     );
// };

// symbolDrawProto.incrementalUpdate = function (taskParams, data) {
//     for (var idx = taskParams.start; idx < taskParams.end; idx++) {
//         var point = data.getItemLayout(idx);
//         // ??? IncrementalDisplayable do not support Group.
//         symbolNeedsDraw(data, point, idx) && this._incremental.addDisplayable(
//             new this._symbolCtor(data, idx, this._seriesScope),
//             true
//         );
//     }
// };

symbolDrawProto.remove = function (enableAnimation) {
    // this._incremental = null;

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

// symbolDrawProto._clearIncremental = function () {
//     var incremental = this._incremental;
//     if (incremental) {
//         incremental.clearDisplaybles();
//     }
// };

function makeSeriesScope(data) {
    var seriesModel = data.hostModel;
    return {
        itemStyle: seriesModel.getModel('itemStyle.normal').getItemStyle(['color']),
        hoverItemStyle: seriesModel.getModel('itemStyle.emphasis').getItemStyle(),
        symbolRotate: seriesModel.get('symbolRotate'),
        symbolOffset: seriesModel.get('symbolOffset'),
        hoverAnimation: seriesModel.get('hoverAnimation'),
        labelModel: seriesModel.getModel('label.normal'),
        hoverLabelModel: seriesModel.getModel('label.emphasis'),
        cursorStyle: seriesModel.get('cursor')
    };
}

export default SymbolDraw;