import {SOURCE_FORMAT_ORIGINAL} from '../../data/helper/sourceHelper';

// Get concrete dim.
function getLabelValueDim(data) {
    var labelDim = data.mapDimension('label');

    return labelDim
        ? labelDim
        // Only if the source is own to a series, we can use the last.
        // If the source is from dataset, it probably be shared by
        // different series.
        : data.getProvider().getSource().sourceFormat === SOURCE_FORMAT_ORIGINAL
        ? data.getDimensionBrief('lastValueType')
        : null;
}

/**
 * @param {module:echarts/data/List} data
 * @param {number} dataIndex
 */
export function getDefaultLabel(data, dataIndex) {
    var val = data.get(getLabelValueDim(data), dataIndex);
    return (val == null || isNaN(val)) ? '' : val;
}

export function getLabelFromName(data, dataIndex) {
    var labelDim = data.mapDimension('label');
    return labelDim
        ? data.get(labelDim, dataIndex)
        : data.getName(dataIndex);
}

