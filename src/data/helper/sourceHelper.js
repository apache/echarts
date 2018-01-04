
import {makeInner} from '../../util/model';
import {getCoordSysDefineBySeries} from '../../model/referHelper';
import {createHashMap, each} from 'zrender/src/core/util';

var inner = makeInner();

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
 * @return {Object} The object of default encode.
 */
export function makeDefaultEncode(seriesModel) {
    var ecModel = seriesModel.ecModel;
    var datasetMap = inner(ecModel).datasetMap;

    var coordSysDefine = getCoordSysDefineBySeries(seriesModel);

    if (!coordSysDefine) {
        // Usually in this case series will use the first data
        // dimension as the "value" dimension, or other default
        // processes respectively.
        // ??? clear default incode
        return;
    }

    var datasetModel = getDatasetModel(seriesModel);

    if (!datasetModel) {
        return;
    }

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

export function getDatasetModel(seriesModel) {
    var thisData = seriesModel.option.data;
    return seriesModel.ecModel.getComponent(
        'dataset', thisData && thisData.datasetIndex || 0
    );
}

