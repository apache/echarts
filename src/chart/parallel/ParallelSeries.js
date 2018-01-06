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

// function translateCategoryValue(axisModel, dim, rawData) {
//     // ???!!
//     var axisData = axisModel.getCategories();
//     var numberDim = convertDimNameToNumber(dim);

//     if (axisData && axisData.length) {
//         zrUtil.each(rawData, function (dataItem) {
//             if (!dataItem) {
//                 return;
//             }
//             // FIXME
//             // time consuming, should use hash?
//             var index = zrUtil.indexOf(axisData, dataItem[numberDim]);
//             dataItem[numberDim] = index >= 0 ? index : NaN;
//         });
//     }
//     // FIXME
//     // 如果没有设置axis data, 应自动算出，或者提示。
// }


// function generateDimParams(parallelModel, source) {
//     var parallelAxisIndices = parallelModel.parallelAxisIndex;
//     var modelDims = parallelModel.dimensions;

//     getDimTypeByAxis

    // ??? need support encode?
    // var dataDimsInfo = zrUtil.map(dataDims, function (dim, dimIndex) {

    //     var modelDimsIndex = zrUtil.indexOf(modelDims, dim);
    //     var axisModel = modelDimsIndex >= 0 && ecModel.getComponent(
    //         'parallelAxis', parallelAxisIndices[modelDimsIndex]
    //     );

    //     if (axisModel && axisModel.get('type') === 'category') {
    //         translateCategoryValue(axisModel, dim, source);
    //         return {name: dim, type: 'ordinal'};
    //     }
    //     else if (modelDimsIndex < 0) {
    //         return guessOrdinal(source, dimIndex)
    //             ? {name: dim, type: 'ordinal'}
    //             : dim;
    //     }
    //     else {
    //         return dim;
    //     }
    // });

    // TODO
    // ??? Do not support encode and dimensions setting in parallels currently.
    // encode and dimension are specified by parallelAxis.
//     var encodeDefine = {};
//     var sysDimensions = {};

//     // parallelModel.dimension should not be regarded as data
//     // dimensions. Consider dimensions = ['dim4', 'dim2', 'dim6'];
//     var maxDimNum = 0;
//     each(modelDims, function (dimName) {
//         var numberDim = +dimName.replace('dim', '');
//         numberDim > maxDimNum && (maxDimNum = numberDim);
//         encodeDefine[dimName] = dimName;
//     });

//     var dataDims = [];
//     for (var i = 0; i <= maxDimNum; i++) {
//         dataDims.push('dim' + i);
//     }

//     var params = zrUtil.defaults({
//         sysDimensions: modelDims,
//         dimensionsDefine: dataDims,
//         encodeDefine: encodeDefine
//     }, source);

//     return params;
// }
