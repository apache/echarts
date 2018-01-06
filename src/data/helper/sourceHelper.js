
import {makeInner} from '../../util/model';
import {getCoordSysDefineBySeries} from '../../model/referHelper';
import {createHashMap, each, isArray, isString, isObject} from 'zrender/src/core/util';
import {getDataItemValue} from '../../util/model';
import Source from '../Source';

var inner = makeInner();

/**
 * [Scenarios]:
 * (1) Provide source data directly:
 *     series: {
 *         encode: {...},
 *         dimensions: [...]
 *         seriesLayoutBy: 'row',
 *         data: [[...]]
 *     }
 * (2) Refer to datasetModel.
 *     series: [{
 *         encode: {...}
 *         // Ignore datasetIndex means `datasetIndex: 0`
 *         // and the dimensions defination in dataset is used
 *     }, {
 *         encode: {...},
 *         seriesLayoutBy: 'column',
 *         datasetIndex: 1
 *     }]
 *
 * Get data from series itself or datset.
 * @return {module:echarts/data/Source} source
 */
export function getSource(seriesModel) {
    var seriesOption = seriesModel.option;
    var modelUID = seriesModel.uid;
    var data = seriesOption.data;
    var dimensionsDefine = seriesOption.dimensions;
    var seriesLayoutBy = seriesOption.seriesLayoutBy;
    var sourceFormat = 'seriesOriginal';

    var datasetModel = getDatasetModel(seriesModel);
    if (datasetModel) {
        var datasetOption = datasetModel.option;
        modelUID = datasetModel.uid;
        data = datasetModel.parsedData;
        // Dimensions defined on series has higher priority.
        dimensionsDefine = dimensionsDefine || detectDatasetDimensions(datasetModel);
        seriesLayoutBy = seriesLayoutBy || datasetOption.seriesLayoutBy;
        sourceFormat = datasetOption.sourceFormat;
    }

    return new Source({
        modelUID: modelUID,
        // Do not clone data for performance.
        data: data,
        dimensionsDefine: dimensionsDefine ? dimensionsDefine.slice() : null,
        seriesLayoutBy: seriesLayoutBy,
        encodeDefine: inner(seriesModel).encode,
        sourceFormat: sourceFormat
    });
}

/**
 * MUST be called before mergeOption of all series.
 * @param {module:echarts/model/Global} ecModel
 */
export function resetDefaultEncode(ecModel) {
    inner(ecModel).datasetMap = createHashMap();
}

/**
 * [Caution]:
 * MUST be called after series option merged and
 * before "series.getInitailData()" called.
 *
 * [Rule]:
 * Category axis (if exists) alway map to the first dimension.
 * Each other axis occupies a subsequent dimension.
 *
 * [Why make default encode]:
 * Simplify the typing of encode in option, avoiding the case like that:
 * series: [{encode: {x: 0, y: 1}}, {encode: {x: 0, y: 2}}, {encode: {x: 0, y: 3}}],
 * where the "y" have to be manually typed as "1, 2, 3, ...".
 *
 * @param {module:echarts/model/Series} seriesModel
 */
export function setEncode(seriesModel) {
    var datasetModel = getDatasetModel(seriesModel);
    // Note: dataset option does not have `encode`.
    var optionEncode = seriesModel.option.encode;
    inner(seriesModel).encode = (!optionEncode && datasetModel)
        ? makeDefaultEncode(seriesModel, datasetModel)
        : optionEncode;
}

function makeDefaultEncode(seriesModel, datasetModel) {
    if (!datasetModel) {
        return;
    }

    var coordSysDefine = getCoordSysDefineBySeries(seriesModel);

    if (!coordSysDefine) {
        // Usually in this case series will use the first data
        // dimension as the "value" dimension, or other default
        // processes respectively.
        return;
    }

    var ecModel = seriesModel.ecModel;
    var datasetMap = inner(ecModel).datasetMap;
    var datasetUID = datasetModel.uid;
    var datasetRecord = datasetMap.get(datasetUID)
        || datasetMap.set(datasetUID, {categoryWayDim: 1, valueWayDim: 0});

    var encode = {};

    each(coordSysDefine.coordSysDims, function (dim) {
        encode[dim] = coordSysDefine.firstCategoryDimIndex == null
            // In value way.
            ? datasetRecord.valueWayDim++
            // In category way.
            : coordSysDefine.categoryAxisMap.get(dim)
            ? 0
            : datasetRecord.categoryWayDim++;
    });

    return encode;
}

/**
 * If return null/undefined, indicate that should not use datasetModel.
 */
function getDatasetModel(seriesModel) {
    var option = seriesModel.option;
    // Caution: consider the scenario:
    // A dataset is declared and a series is not expected to use the dataset,
    // and at the beginning `setOption({series: { noData })` (just prepare other
    // option but no data), then `setOption({series: {data: [...]}); In this case,
    // the user should set an empty array to avoid that dataset is used by default.
    var thisData = option.data;
    if (!thisData) {
        return seriesModel.ecModel.getComponent('dataset', option.datasetIndex || 0);
    }
}

// The rule should not be complex, otherwise user might not
// be able to known where the data is wrong.
/**
 * @param {Array|List} sourceData
 * @param {number} dimIndex
 */
export function guessOrdinal(sourceData, dimIndex) {
    for (var i = 0, len = sourceData.length; i < len; i++) {
        var value = getDataItemValue(sourceData[i]);

        if (!isArray(value)) {
            return false;
        }

        var value = value[dimIndex];
        // Consider usage convenience, '1', '2' will be treated as "number".
        // `isFinit('')` get `true`.
        if (value != null && isFinite(value) && value !== '') {
            return false;
        }
        else if (isString(value) && value !== '-') {
            return true;
        }
    }
    return false;
}

/**
 * @see {module:echarts/data/Source}
 * @param {Array|Object} sourceData
 * @return {string} sourceFormat
 */
export function detectSourceFormat(sourceData) {
    if (!sourceData) {
        return 'unknown';
    }

    var isTypedArray = isTypedArray(sourceData);

    if (isTypedArray(sourceData)) {
        return 'typedArray';
    }
    else if (isArray(sourceData)) {
        // FIXME Whether tolerate null in top level array?
        for (var i = 0, len = sourceData.length; i < len; i++) {
            var item = sourceData[i];

            if (item == null) {
                continue;
            }
            else if (isArray(item)) {
                return 'array2d';
            }
            else if (isObject(item)) {
                return 'keyValues';
            }
        }
    }
    else if (isObject(sourceData)) {
        for (var key in sourceData) {
            if (sourceData.hasOwnProtytpe(key) && isArray(sourceData[key])) {
                return 'keyArrays';
            }
        }
    }

    return 'unknown';
}

function detectDatasetDimensions(datasetModel) {

}

export function getDimTypeByAxis(axisType) {
    return axisType === 'category'
        ? 'ordinal'
        : axisType === 'time'
        ? 'time'
        : 'float';
}
