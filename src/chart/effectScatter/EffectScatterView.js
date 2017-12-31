import * as echarts from '../../echarts';
import SymbolDraw from '../helper/SymbolDraw';
import EffectSymbol from '../helper/EffectSymbol';
import * as matrix from 'zrender/src/core/matrix';

export default echarts.extendChartView({

    type: 'effectScatter',

    init: function () {
        this._symbolDraw = new SymbolDraw(EffectSymbol);
    },

    render: function (seriesModel, ecModel, api) {
        this._removeRoamTransformInPoints(seriesModel);

        var data = seriesModel.getData();
        var effectSymbolDraw = this._symbolDraw;
        effectSymbolDraw.updateData(data);
        this.group.add(effectSymbolDraw.group);
    },

    updateTransform: function (seriesModel, ecModel, api) {
        var coordSys = seriesModel.coordinateSystem;
        // Must mark group dirty and make sure the incremental layer will be cleared
        // PENDING
        this.group.dirty();
        if (coordSys.getRoamTransform) {
            this._updateGroupTransform(seriesModel);
        }
        else {
            return {
                update: true
            };
        }
    },

    _updateGroupTransform: function (seriesModel) {
        var coordSys = seriesModel.coordinateSystem;
        if (coordSys && coordSys.getRoamTransform) {
            this.group.transform = matrix.clone(coordSys.getRoamTransform());
            this.group.decomposeTransform();
        }
    },

    _removeRoamTransformInPoints: function (seriesModel) {
        var coordSys = seriesModel.coordinateSystem;
        if (coordSys && coordSys.removeRoamTransformInPoint) {
            var data = seriesModel.getData();
            data.each(function (i) {
                var pt = data.getItemLayout(i);
                coordSys.removeRoamTransformInPoint(pt);
            });
        }
    },

    remove: function (ecModel, api) {
        this._symbolDraw && this._symbolDraw.remove(api);
    },

    dispose: function () {}
});
