import * as zrUtil from 'zrender/src/core/util';
import List from '../../data/List';
import createDimensions from '../../data/helper/createDimensions';
import {getDataItemValue} from '../../util/model';
import CoordinateSystem from '../../CoordinateSystem';
import {getCoordSysDefineBySeries} from '../../model/referHelper';

/**
 * @param {Object} source
 * {
 *     data: mandatory
 *     encodeDefine: optional
 *     dimensionsDefine: optional
 * }
 * @param {module:echarts/model/Series} seriesModel
 */
function createListFromArray(source, seriesModel) {
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

    var dimInfoList = createDimensions(zrUtil.defaults({
        sysDimensions: coordSysDimDefs
    }, source));

    // Consider empty data.
    var data = source.data || [];

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
                : this.defaultDimValueGetter(itemOpt, dimName, dataIndex, dimIndex);
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

export default createListFromArray;
