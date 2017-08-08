define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

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
            normalStyle.text = null;
        }

        if (hoverLabelModel.get('show')) {
            setLabel(
                hoverStyle, hoverLabelModel, color,
                zrUtil.retrieve(
                    seriesModel.getFormattedLabel(dataIndex, 'emphasis'),
                    seriesModel.getRawValue(dataIndex)
                ),
                labelPositionOutside,
                true
            );
        }
        else {
            hoverStyle.text = null;
        }
    };

    function setLabel(style, model, color, labelText, labelPositionOutside, isEmphasis) {
        graphic.setText(style, model, color, isEmphasis);
        style.text = labelText;
        if (style.textPosition === 'outside') {
            style.textPosition = labelPositionOutside;
        }
    }

    return helper;
});