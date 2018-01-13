import * as echarts from '../../echarts';
import SymbolDraw from '../helper/SymbolDraw';
import EffectSymbol from '../helper/EffectSymbol';
import * as matrix from 'zrender/src/core/matrix';

import pointsLayout from '../../layout/points';

export default echarts.extendChartView({

    type: 'effectScatter',

    init: function () {
        this._symbolDraw = new SymbolDraw(EffectSymbol);
    },

    render: function (seriesModel, ecModel, api) {
        var data = seriesModel.getData();
        var effectSymbolDraw = this._symbolDraw;
        effectSymbolDraw.updateData(data);
        this.group.add(effectSymbolDraw.group);
    },

    updateTransform: function (seriesModel, ecModel, api) {
        var data = seriesModel.getData();

        this.group.dirty();

        var res = pointsLayout().reset(seriesModel);
        if (res.progress) {
            res.progress({ start: 0, end: data.count() }, data);
        }

        this._symbolDraw.updateLayout(data);
    },

    _updateGroupTransform: function (seriesModel) {
        var coordSys = seriesModel.coordinateSystem;
        if (coordSys && coordSys.getRoamTransform) {
            this.group.transform = matrix.clone(coordSys.getRoamTransform());
            this.group.decomposeTransform();
        }
    },

    remove: function (ecModel, api) {
        this._symbolDraw && this._symbolDraw.remove(api);
    },

    dispose: function () {}
});
