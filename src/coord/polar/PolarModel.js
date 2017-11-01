import * as echarts from '../../echarts';
import './AxisModel';

export default echarts.extendComponentModel({

    type: 'polar',

    dependencies: ['polarAxis', 'angleAxis'],

    /**
     * @type {module:echarts/coord/polar/Polar}
     */
    coordinateSystem: null,

    /**
     * @param {string} axisType
     * @return {module:echarts/coord/polar/AxisModel}
     */
    findAxisModel: function (axisType) {
        var foundAxisModel;
        var ecModel = this.ecModel;

        ecModel.eachComponent(axisType, function (axisModel) {
            if (axisModel.getCoordSysModel() === this) {
                foundAxisModel = axisModel;
            }
        }, this);
        return foundAxisModel;
    },

    defaultOption: {

        zlevel: 0,

        z: 0,

        center: ['50%', '50%'],

        radius: '80%'
    }
});