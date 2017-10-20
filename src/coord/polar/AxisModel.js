import * as zrUtil from 'zrender/src/core/util';
import ComponentModel from '../../model/Component';
import axisModelCreator from '../axisModelCreator';
import axisModelCommonMixin from '../axisModelCommonMixin';

var PolarAxisModel = ComponentModel.extend({

    type: 'polarAxis',

    /**
     * @type {module:echarts/coord/polar/AngleAxis|module:echarts/coord/polar/RadiusAxis}
     */
    axis: null,

    /**
     * @override
     */
    getCoordSysModel: function () {
        return this.ecModel.queryComponents({
            mainType: 'polar',
            index: this.option.polarIndex,
            id: this.option.polarId
        })[0];
    }

});

zrUtil.merge(PolarAxisModel.prototype, axisModelCommonMixin);

var polarAxisDefaultExtendedOption = {
    angle: {
        // polarIndex: 0,
        // polarId: '',

        startAngle: 90,

        clockwise: true,

        splitNumber: 12,

        axisLabel: {
            rotate: false
        }
    },
    radius: {
        // polarIndex: 0,
        // polarId: '',

        splitNumber: 5
    }
};

function getAxisType(axisDim, option) {
    // Default axis with data is category axis
    return option.type || (option.data ? 'category' : 'value');
}

axisModelCreator('angle', PolarAxisModel, getAxisType, polarAxisDefaultExtendedOption.angle);
axisModelCreator('radius', PolarAxisModel, getAxisType, polarAxisDefaultExtendedOption.radius);
