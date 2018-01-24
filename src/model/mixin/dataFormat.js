import {retrieveRawValue} from '../../data/helper/dataProvider';
import {getTooltipMarker, formatTpl} from '../../util/format';

var DIMENSION_LABEL_REG = /\{@(.+?)\}/g;

// PENDING A little ugly
export default {
    /**
     * Get params for formatter
     * @param {number} dataIndex
     * @param {string} [dataType]
     * @return {Object}
     */
    getDataParams: function (dataIndex, dataType) {
        var data = this.getData(dataType);
        var rawValue = this.getRawValue(dataIndex, dataType);
        var rawDataIndex = data.getRawIndex(dataIndex);
        var name = data.getName(dataIndex, true);
        var itemOpt = data.getRawDataItem(dataIndex);
        var color = data.getItemVisual(dataIndex, 'color');

        return {
            componentType: this.mainType,
            componentSubType: this.subType,
            seriesType: this.mainType === 'series' ? this.subType : null,
            seriesIndex: this.seriesIndex,
            seriesId: this.id,
            seriesName: this.name,
            name: name,
            dataIndex: rawDataIndex,
            data: itemOpt,
            dataType: dataType,
            value: rawValue,
            color: color,
            marker: getTooltipMarker(color),

            // Param name list for mapping `a`, `b`, `c`, `d`, `e`
            $vars: ['seriesName', 'name', 'value']
        };
    },

    /**
     * Format label
     * @param {number} dataIndex
     * @param {string} [status='normal'] 'normal' or 'emphasis'
     * @param {string} [dataType]
     * @param {number} [dimIndex]
     * @param {string} [labelProp='label']
     * @return {string} If not formatter, return null/undefined
     */
    getFormattedLabel: function (dataIndex, status, dataType, dimIndex, labelProp) {
        status = status || 'normal';
        var data = this.getData(dataType);
        var itemModel = data.getItemModel(dataIndex);

        var params = this.getDataParams(dataIndex, dataType);
        if (dimIndex != null && (params.value instanceof Array)) {
            params.value = params.value[dimIndex];
        }

        var formatter = itemModel.get(
            status === 'normal'
            ? [labelProp || 'label', 'formatter']
            : [status, labelProp || 'label', 'formatter']
        );

        if (typeof formatter === 'function') {
            params.status = status;
            return formatter(params);
        }
        else if (typeof formatter === 'string') {
            var str = formatTpl(formatter, params);

            // Support 'aaa{@[3]}bbb{@product}ccc'.
            // Do not support '}' in dim name util have to.
            return str.replace(DIMENSION_LABEL_REG, function (origin, dim) {
                var len = dim.length;
                if (dim.charAt(0) === '[' && dim.charAt(len - 1) === ']') {
                    dim = +dim.slice(1, len - 1); // Also: '[]' => 0
                }
                return retrieveRawValue(data, dataIndex, dim);
            });
        }
    },

    /**
     * Get raw value in option
     * @param {number} idx
     * @param {string} [dataType]
     * @return {Array|number|string}
     */
    getRawValue: function (idx, dataType) {
        return retrieveRawValue(this.getData(dataType), idx);
    },

    /**
     * Should be implemented.
     * @param {number} dataIndex
     * @param {boolean} [multipleSeries=false]
     * @param {number} [dataType]
     * @return {string} tooltip string
     */
    formatTooltip: function () {
        // Empty function
    }
};
