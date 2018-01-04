import {__DEV__} from '../../config';
import * as zrUtil from 'zrender/src/core/util';
import List from '../../data/List';
import completeDimensions from '../../data/helper/completeDimensions';
import {getDataItemValue} from '../../util/model';
import CoordinateSystem from '../../CoordinateSystem';
import {getCoordSysDefineBySeries} from '../../model/referHelper';

function firstDataNotNull(data) {
    var i = 0;
    while (i < data.length && data[i] == null) {
        i++;
    }
    return data[i];
}
function isNeedCompleteOrdinalData(data) {
    var sampleItem = firstDataNotNull(data);
    return sampleItem != null
        && !zrUtil.isArray(getDataItemValue(sampleItem));
}

/**
 * Helper function to create a list from option data
 */
function doCreateListFromArray(seriesDataAttr, seriesModel, ecModel) {
    var source = seriesModel.getSource(seriesDataAttr);
    // Consider empty data.
    var data = source.data || [];

    if (__DEV__) {
        if (!zrUtil.isArrayLike(data)) {
            throw new Error('Invalid data.');
        }
    }

    var isDataTypedArray = zrUtil.isTypedArray(data);
    if (isDataTypedArray) {
        if (__DEV__) {
            if (!source.dimensions) {
                throw new Error('dimensions must be given if data is a ' + Object.prototype.toString.call(data));
            }
        }
    }

    var completeDimOpt = {
        encodeDef: source.encode,
        dimsDef: source.dimensions
    };

    if (isDataTypedArray) {
        completeDimOpt.dimCount = completeDimOpt.dimsDef.length;
    }

    var coordSysName = seriesModel.get('coordinateSystem');
    var registeredCoordSys = CoordinateSystem.get(coordSysName);

    var coordSysDefine = getCoordSysDefineBySeries(seriesModel);

    var coordSysDimDefs;

    if (coordSysDefine) {
        coordSysDimDefs = zrUtil.map(coordSysDefine.coordSysDims, function (dim) {
            var dimInfo = {name: dim};
            var axisModel = coordSysDefine.axisMap.get(dim);
            if (axisModel) {
                var axisType = axisModel.get('type');
                dimInfo.type = getDimTypeByAxis(axisType);
                dimInfo.stackable = isStackable(axisType);
            }
            return dimInfo;
        });
    }

    if (!coordSysDimDefs) {
        // Get dimensions from registered coordinate system
        coordSysDimDefs = (registeredCoordSys && (
            registeredCoordSys.getDimensionsInfo
                ? registeredCoordSys.getDimensionsInfo()
                : registeredCoordSys.dimensions.slice()
        )) || ['x', 'y'];
    }

    var dimInfoList = completeDimensions(coordSysDimDefs, data, completeDimOpt);

    var firstCategoryDimIndex;
    coordSysDefine && zrUtil.each(dimInfoList, function (dimInfo, dimIndex) {
        var coordDim = dimInfo.coordDim;
        var categoryAxisModel = coordSysDefine.categoryAxisMap.get(coordDim);
        if (categoryAxisModel) {
            firstCategoryDimIndex == null && (firstCategoryDimIndex = dimIndex);
            categoryAxisModel.ordinalMeta.prepareDimInfo(dimInfo, source);
        }
    });

    var list = new List(dimInfoList, seriesModel);

    var dimValueGetter = (firstCategoryDimIndex != null && isNeedCompleteOrdinalData(data))
        ? function (itemOpt, dimName, dataIndex, dimIndex) {
            // Use dataIndex as ordinal value in categoryAxis
            return dimIndex === firstCategoryDimIndex
                ? dataIndex
                : List.defaultDimValueGetter(itemOpt, dimName, dataIndex, dimIndex);
        }
        : null;

    list.hasItemOption = false;
    list.initData(data, firstCategoryDimIndex, dimValueGetter);

    return list;
}

function isStackable(axisType) {
    return axisType !== 'category' && axisType !== 'time';
}

function getDimTypeByAxis(axisType) {
    return axisType === 'category'
        ? 'ordinal'
        : axisType === 'time'
        ? 'time'
        : 'float';
}

function createListFromArray(data, seriesModel, ecModel) {
    // Compatibal with previous interface, the first parameter is `data`,
    // but the meaning of "data" it is not used currently, only the meaning
    // of "seriesDataAttr" used.
    !zrUtil.isString(data) && (data = null);
    return doCreateListFromArray(data, seriesModel, ecModel);
}

export default createListFromArray;
