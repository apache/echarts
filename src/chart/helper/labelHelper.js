import {SOURCE_FORMAT_ORIGINAL} from '../../data/helper/sourceHelper';

// Get concrete dim.
function getLabelValueDim(data) {
    var dimensionsSummary = data.dimensionsSummary;
    var labelDims = dimensionsSummary.label;

    return labelDims[0]
        ? labelDims[0]
        // Only if the source is own to a series, we can use the last.
        // If the source is from dataset, it probably be shared by
        // different series.
        : data.getProvider().getSource().sourceFormat === SOURCE_FORMAT_ORIGINAL
        ? dimensionsSummary.lastValueDimension
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
