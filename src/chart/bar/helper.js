import * as graphic from '../../util/graphic';
import {getDefaultLabel} from '../helper/labelHelper';

export function setLabel(
    normalStyle, hoverStyle, itemModel, color, seriesModel, dataIndex, labelPositionOutside
) {
    var labelModel = itemModel.getModel('label');
    var hoverLabelModel = itemModel.getModel('emphasis.label');

    graphic.setLabelStyle(
        normalStyle, hoverStyle, labelModel, hoverLabelModel,
        {
            labelFetcher: seriesModel,
            labelDataIndex: dataIndex,
            defaultText: getDefaultLabel(seriesModel.getData(), dataIndex),
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