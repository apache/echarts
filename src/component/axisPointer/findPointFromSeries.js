import * as zrUtil from 'zrender/src/core/util';
import * as modelUtil from '../../util/model';

/**
 * @param {Object} finder contains {seriesIndex, dataIndex, dataIndexInside}
 * @param {module:echarts/model/Global} ecModel
 * @return {Object} {point: [x, y], el: ...} point Will not be null.
 */
export default function (finder, ecModel) {
    var point = [];
    var seriesIndex = finder.seriesIndex;
    var seriesModel;
    if (seriesIndex == null || !(
        seriesModel = ecModel.getSeriesByIndex(seriesIndex)
    )) {
        return {point: []};
    }

    var data = seriesModel.getData();
    var dataIndex = modelUtil.queryDataIndex(data, finder);
    if (dataIndex == null || zrUtil.isArray(dataIndex)) {
        return {point: []};
    }

    var el = data.getItemGraphicEl(dataIndex);
    var coordSys = seriesModel.coordinateSystem;

    if (seriesModel.getTooltipPosition) {
        point = seriesModel.getTooltipPosition(dataIndex) || [];
    }
    else if (coordSys && coordSys.dataToPoint) {
        point = coordSys.dataToPoint(
            data.getValues(
                zrUtil.map(coordSys.dimensions, function (dim) {
                    return seriesModel.coordDimToDataDim(dim)[0];
                }), dataIndex, true
            )
        ) || [];
    }
    else if (el) {
        // Use graphic bounding rect
        var rect = el.getBoundingRect().clone();
        rect.applyTransform(el.transform);
        point = [
            rect.x + rect.width / 2,
            rect.y + rect.height / 2
        ];
    }

    return {point: point, el: el};
}
