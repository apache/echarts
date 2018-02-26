import SeriesModel from '../../model/Series';
import createListFromArray from '../helper/createListFromArray';
import CoordinateSystem from '../../CoordinateSystem';

export default SeriesModel.extend({
    type: 'series.heatmap',

    getInitialData: function (option, ecModel) {
        return createListFromArray(this.getSource(), this, {
            generateCoord: 'value'
        });
    },

    preventIncremental: function () {
        var coordSysCreator = CoordinateSystem.get(this.get('coordinateSystem'));
        if (coordSysCreator && coordSysCreator.dimensions) {
            return coordSysCreator.dimensions[0] === 'lng' && coordSysCreator.dimensions[1] === 'lat';
        }
    },

    defaultOption: {

        // Cartesian2D or geo
        coordinateSystem: 'cartesian2d',

        zlevel: 0,

        z: 2,

        // Cartesian coordinate system
        // xAxisIndex: 0,
        // yAxisIndex: 0,

        // Geo coordinate system
        geoIndex: 0,

        blurSize: 30,

        pointSize: 20,

        maxOpacity: 1,

        minOpacity: 0
    }
});