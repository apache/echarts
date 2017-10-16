import * as layout from '../../util/layout';
import {parsePercent, linearMap} from '../../util/number';

function getViewRect(seriesModel, api) {
    return layout.getLayoutRect(
        seriesModel.getBoxLayoutParams(), {
            width: api.getWidth(),
            height: api.getHeight()
        }
    );
}

function getSortedIndices(data, sort) {
    var valueArr = data.mapArray('value', function (val) {
        return val;
    });
    var indices = [];
    var isAscending = sort === 'ascending';
    for (var i = 0, len = data.count(); i < len; i++) {
        indices[i] = i;
    }

    // Add custom sortable function & none sortable opetion by "options.sort"
    if (typeof sort === 'function') {
        indices.sort(sort);
    } else if (sort !== 'none') {
        indices.sort(function (a, b) {
            return isAscending ? valueArr[a] - valueArr[b] : valueArr[b] - valueArr[a];
        });
    }
    return indices;
}

function labelLayout(data) {
    data.each(function (idx) {
        var itemModel = data.getItemModel(idx);
        var labelModel = itemModel.getModel('label.normal');
        var labelPosition = labelModel.get('position');

        var labelLineModel = itemModel.getModel('labelLine.normal');

        var layout = data.getItemLayout(idx);
        var points = layout.points;

        var isLabelInside = labelPosition === 'inner'
            || labelPosition === 'inside' || labelPosition === 'center';

        var textAlign;
        var textX;
        var textY;
        var linePoints;

        if (isLabelInside) {
            textX = (points[0][0] + points[1][0] + points[2][0] + points[3][0]) / 4;
            textY = (points[0][1] + points[1][1] + points[2][1] + points[3][1]) / 4;
            textAlign = 'center';
            linePoints = [
                [textX, textY], [textX, textY]
            ];
        }
        else {
            var x1;
            var y1;
            var x2;
            var labelLineLen = labelLineModel.get('length');
            if (labelPosition === 'left') {
                // Left side
                x1 = (points[3][0] + points[0][0]) / 2;
                y1 = (points[3][1] + points[0][1]) / 2;
                x2 = x1 - labelLineLen;
                textX = x2 - 5;
                textAlign = 'right';
            }
            else {
                // Right side
                x1 = (points[1][0] + points[2][0]) / 2;
                y1 = (points[1][1] + points[2][1]) / 2;
                x2 = x1 + labelLineLen;
                textX = x2 + 5;
                textAlign = 'left';
            }
            var y2 = y1;

            linePoints = [[x1, y1], [x2, y2]];
            textY = y2;
        }

        layout.label = {
            linePoints: linePoints,
            x: textX,
            y: textY,
            verticalAlign: 'middle',
            textAlign: textAlign,
            inside: isLabelInside
        };
    });
}

export default function (ecModel, api, payload) {
    ecModel.eachSeriesByType('funnel', function (seriesModel) {
        var data = seriesModel.getData();
        var sort = seriesModel.get('sort');
        var viewRect = getViewRect(seriesModel, api);
        var indices = getSortedIndices(data, sort);

        var sizeExtent = [
            parsePercent(seriesModel.get('minSize'), viewRect.width),
            parsePercent(seriesModel.get('maxSize'), viewRect.width)
        ];
        var dataExtent = data.getDataExtent('value');
        var min = seriesModel.get('min');
        var max = seriesModel.get('max');
        if (min == null) {
            min = Math.min(dataExtent[0], 0);
        }
        if (max == null) {
            max = dataExtent[1];
        }

        var funnelAlign = seriesModel.get('funnelAlign');
        var gap = seriesModel.get('gap');
        var itemHeight = (viewRect.height - gap * (data.count() - 1)) / data.count();

        var y = viewRect.y;

        var getLinePoints = function (idx, offY) {
            // End point index is data.count() and we assign it 0
            var val = data.get('value', idx) || 0;
            var itemWidth = linearMap(val, [min, max], sizeExtent, true);
            var x0;
            switch (funnelAlign) {
                case 'left':
                    x0 = viewRect.x;
                    break;
                case 'center':
                    x0 = viewRect.x + (viewRect.width - itemWidth) / 2;
                    break;
                case 'right':
                    x0 = viewRect.x + viewRect.width - itemWidth;
                    break;
            }
            return [
                [x0, offY],
                [x0 + itemWidth, offY]
            ];
        };

        if (sort === 'ascending') {
            // From bottom to top
            itemHeight = -itemHeight;
            gap = -gap;
            y += viewRect.height;
            indices = indices.reverse();
        }

        for (var i = 0; i < indices.length; i++) {
            var idx = indices[i];
            var nextIdx = indices[i + 1];
            var start = getLinePoints(idx, y);
            var end = getLinePoints(nextIdx, y + itemHeight);

            y += itemHeight + gap;

            data.setItemLayout(idx, {
                points: start.concat(end.slice().reverse())
            });
        }

        labelLayout(data);
    });
}