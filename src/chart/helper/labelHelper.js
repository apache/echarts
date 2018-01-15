import {retrieveRawValue} from '../../data/helper/dataProvider';

/**
 * @param {module:echarts/data/List} data
 * @param {number} dataIndex
 * @return {string} label string. Not null/undefined
 */
export function getDefaultLabel(data, dataIndex) {
    var labelDims = data.mapDimension('defaultedLabel', true);
    var len = labelDims.length;

    // Simple optimization (in lots of cases, label dims length is 1)
    if (len === 1) {
        return retrieveRawValue(data, dataIndex, labelDims[0]);
    }
    else if (len) {
        var vals = [];
        for (var i = 0; i < labelDims.length; i++) {
            var val = retrieveRawValue(data, dataIndex, labelDims[i]);
            vals.push(val);
        }
        return vals.join(' ');
    }
}
