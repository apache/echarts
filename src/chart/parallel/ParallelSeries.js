import {each, createHashMap} from 'zrender/src/core/util';
import SeriesModel from '../../model/Series';
import createListFromArray from '../helper/createListFromArray';

export default SeriesModel.extend({

    type: 'series.parallel',

    dependencies: ['parallel'],

    visualColorAccessPath: 'lineStyle.color',

    getInitialData: function (option, ecModel) {
        // Anication is forbiden in progressive data mode.
        if (this.option.progressive) {
            this.option.animation = false;
        }

        var source = this.getSource();

        setEncodeAndDimensions(source, this);

        return createListFromArray(source, this);
    },

    /**
     * User can get data raw indices on 'axisAreaSelected' event received.
     *
     * @public
     * @param {string} activeState 'active' or 'inactive' or 'normal'
     * @return {Array.<number>} Raw indices
     */
    getRawIndicesByActiveState: function (activeState) {
        var coordSys = this.coordinateSystem;
        var data = this.getData();
        var indices = [];

        coordSys.eachActiveState(data, function (theActiveState, dataIndex) {
            if (activeState === theActiveState) {
                indices.push(data.getRawIndex(dataIndex));
            }
        });

        return indices;
    },

    defaultOption: {
        zlevel: 0,                  // 一级层叠
        z: 2,                       // 二级层叠

        coordinateSystem: 'parallel',
        parallelIndex: 0,

        label: {
            show: false
        },

        inactiveOpacity: 0.05,
        activeOpacity: 1,

        lineStyle: {
            width: 1,
            opacity: 0.45,
            type: 'solid'
        },
        emphasis: {
            label: {
                show: false
            }
        },

        progressive: false, // 100
        smooth: false,

        animationEasing: 'linear'
    }
});

function setEncodeAndDimensions(source, seriesModel) {
    // The mapping of parallelAxis dimension to data dimension can
    // be specified in parallelAxis.option.dim. For example, if
    // parallelAxis.option.dim is 'dim3', it mapping to the third
    // dimension of data. But `data.encode` has higher priority.
    // Moreover, parallelModel.dimension should not be regarded as data
    // dimensions. Consider dimensions = ['dim4', 'dim2', 'dim6'];

    if (source.encodeDefine) {
        return;
    }

    var parallelModel = seriesModel.ecModel.getComponent(
        'parallel', seriesModel.get('parallelIndex')
    );
    if (!parallelModel) {
        return;
    }

    var encodeDefine = source.encodeDefine = createHashMap();
    each(parallelModel.dimensions, function (axisDim) {
        var dataDimIndex = convertDimNameToNumber(axisDim);
        encodeDefine.set(axisDim, dataDimIndex);
    });
}

function convertDimNameToNumber(dimName) {
    return +dimName.replace('dim', '');
}
