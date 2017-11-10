import * as graphic from '../../util/graphic';

export function setLabel(
    normalStyle, hoverStyle, itemModel, color, seriesModel, dataIndex, labelPositionOutside
) {
    var labelModel = itemModel.getModel('label.normal');
    var hoverLabelModel = itemModel.getModel('label.emphasis');

    graphic.setLabelStyle(
        normalStyle, hoverStyle, labelModel, hoverLabelModel,
        {
            labelFetcher: seriesModel,
            labelDataIndex: dataIndex,
            defaultText: seriesModel.getRawValue(dataIndex),
            isRectText: true,
            autoColor: color
        }
    );

    fixPosition(normalStyle);
    fixPosition(hoverStyle);
}

function fixPosition(style, labelPositionOutside) {
    if (style.textPosition === 'outside') {
        style.textPosition = labelPositionOutside;
    }
}