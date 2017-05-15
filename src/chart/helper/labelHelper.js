/**
 * @module echarts/chart/helper/Symbol
 */
define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');

    var helper = {};

    helper.findLabelValueDim = function (data) {
        var valueDim;
        var labelDims = modelUtil.otherDimToDataDim(data, 'label');

        if (labelDims.length) {
            valueDim = labelDims[0];
        }
        else {
            // Get last value dim
            var dimensions = data.dimensions.slice();
            var dataType;
            while (dimensions.length && (
                valueDim = dimensions.pop(),
                dataType = data.getDimensionInfo(valueDim).type,
                dataType === 'ordinal' || dataType === 'time'
            )) {} // jshint ignore:line
        }

        return valueDim;
    };

    helper.setTextToStyle = function (
        data, dataIndex, valueDim, elStyle, seriesModel, labelModel, color
    ) {
        if (valueDim != null && labelModel.getShallow('show')) {
            graphic.setText(elStyle, labelModel, color);
            elStyle.text = zrUtil.retrieve(
                seriesModel.getFormattedLabel(dataIndex, 'normal'),
                data.get(valueDim, dataIndex)
            );
        }
        else {
            elStyle.text = '';
        }
    };

    return helper;
});