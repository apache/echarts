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
        var val = data.get(labelDims[0], dataIndex, true);
        return formatLabelValue(val);
    }
    else if (len) {
        var vals = [];
        for (var i = 0; i < labelDims.length; i++) {
            var val = data.get(labelDims[i], dataIndex, true);
            vals.push(formatLabelValue(val));
        }
        return vals.join(', ');
    }
}

function formatLabelValue(val) {
    return (val == null || isNaN(val)) ? '' : val;
}
