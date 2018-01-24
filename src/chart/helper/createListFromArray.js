import * as zrUtil from 'zrender/src/core/util';
import List from '../../data/List';
import createDimensions from '../../data/helper/createDimensions';
import {SOURCE_FORMAT_ORIGINAL} from '../../data/helper/sourceType';
import {getDimensionTypeByAxis} from '../../data/helper/dimensionHelper';
import {getDataItemValue} from '../../util/model';
import CoordinateSystem from '../../CoordinateSystem';
import {getCoordSysDefineBySeries} from '../../model/referHelper';
import Source from '../../data/Source';

/**
 * @param {module:echarts/data/Source|Array} source Or raw data.
 * @param {module:echarts/model/Series} seriesModel
 */
function createListFromArray(source, seriesModel) {
    if (!Source.isInstance(source)) {
        source = Source.seriesDataToSource(source);
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
                dimInfo.type = getDimensionTypeByAxis(axisType);
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

    var dimInfoList = createDimensions(source, {
        coordDimensions: coordSysDimDefs
    });

    var firstCategoryDimIndex;
    var hasNameEncode;
    coordSysDefine && zrUtil.each(dimInfoList, function (dimInfo, dimIndex) {
        var coordDim = dimInfo.coordDim;
        var categoryAxisModel = coordSysDefine.categoryAxisMap.get(coordDim);
        if (categoryAxisModel) {
            if (firstCategoryDimIndex == null) {
                firstCategoryDimIndex = dimIndex;
            }
            dimInfo.ordinalMeta = categoryAxisModel.getOrdinalMeta();
        }
        if (dimInfo.otherDims.itemName != null) {
            hasNameEncode = true;
        }
    });
    if (!hasNameEncode && firstCategoryDimIndex != null) {
        dimInfoList[firstCategoryDimIndex].otherDims.itemName = 0;
    }

    var list = new List(dimInfoList, seriesModel);

    var dimValueGetter = (firstCategoryDimIndex != null && isNeedCompleteOrdinalData(source))
        ? function (itemOpt, dimName, dataIndex, dimIndex) {
            // Use dataIndex as ordinal value in categoryAxis
            return dimIndex === firstCategoryDimIndex
                ? dataIndex
                : this.defaultDimValueGetter(itemOpt, dimName, dataIndex, dimIndex);
        }
        : null;

    list.hasItemOption = false;
    list.initData(source, null, dimValueGetter);

    return list;
}

function isStackable(axisType) {
    return axisType !== 'category' && axisType !== 'time';
}

function isNeedCompleteOrdinalData(source) {
    if (source.sourceFormat === SOURCE_FORMAT_ORIGINAL) {
        var sampleItem = firstDataNotNull(source.data || []);
        return sampleItem != null
            && !zrUtil.isArray(getDataItemValue(sampleItem));
    }
}

function firstDataNotNull(data) {
    var i = 0;
    while (i < data.length && data[i] == null) {
        i++;
    }
    return data[i];
}

export default createListFromArray;
