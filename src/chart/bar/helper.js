define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    var BAR_BORDER_WIDTH_QUERY = ['itemStyle', 'normal', 'barBorderWidth'];

    var helper = {};

    helper.setLabel = function (
        normalStyle, hoverStyle, itemModel, color, seriesModel, dataIndex, labelPositionOutside
    ) {
        var labelModel = itemModel.getModel('label.normal');
        var hoverLabelModel = itemModel.getModel('label.emphasis');

        if (labelModel.get('show')) {
            setLabel(
                normalStyle, labelModel, color,
                zrUtil.retrieve(
                    seriesModel.getFormattedLabel(dataIndex, 'normal'),
                    seriesModel.getRawValue(dataIndex)
                ),
                labelPositionOutside
            );
        }
        else {
            normalStyle.text = '';
        }

        if (hoverLabelModel.get('show')) {
            setLabel(
                hoverStyle, hoverLabelModel, color,
                zrUtil.retrieve(
                    seriesModel.getFormattedLabel(dataIndex, 'emphasis'),
                    seriesModel.getRawValue(dataIndex)
                ),
                labelPositionOutside
            );
        }
        else {
            hoverStyle.text = '';
        }
    };

    function setLabel(style, model, color, labelText, labelPositionOutside) {
        graphic.setText(style, model, color);
        style.text = labelText;
        if (style.textPosition === 'outside') {
            style.textPosition = labelPositionOutside;
        }
    }

    // In case width or height are too small.
    helper.getLineWidth = function (itemModel, rawLayout) {
        var lineWidth = itemModel.get(BAR_BORDER_WIDTH_QUERY) || 0;
        return Math.min(lineWidth, Math.abs(rawLayout.width), Math.abs(rawLayout.height));
    };

    return helper;
});