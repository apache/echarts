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
                zrUtil.retrieve2(
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
                hoverStyle, hoverLabelModel, false,
                seriesModel.getFormattedLabel(dataIndex, 'emphasis'),
                labelPositionOutside
            );
        }
        else {
            hoverStyle.text = null;
        }
    };

    function setLabel(style, model, defaultColor, labelText, labelPositionOutside) {
        graphic.setText(style, model, defaultColor);
        style.text = labelText;
        if (style.textPosition === 'outside') {
            style.textPosition = labelPositionOutside;
        }
    }

    return helper;
});