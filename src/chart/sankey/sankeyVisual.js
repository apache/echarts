/**
 * @file Visual encoding for sankey view
 * @author  Deqing Li(annong035@gmail.com)
 */

import VisualMapping from '../../visual/VisualMapping';
import * as zrUtil from 'zrender/src/core/util';

export default function (ecModel, payload) {
    ecModel.eachSeriesByType('sankey', function (seriesModel) {
        var graph = seriesModel.getGraph();
        var nodes = graph.nodes;

        nodes.sort(function (a, b) {
            return a.getLayout().value - b.getLayout().value;
        });

        var minValue = nodes[0].getLayout().value;
        var maxValue = nodes[nodes.length - 1].getLayout().value;

        zrUtil.each(nodes, function (node) {
            var mapping = new VisualMapping({
                type: 'color',
                mappingMethod: 'linear',
                dataExtent: [minValue, maxValue],
                visual: seriesModel.get('color')
            });

            var mapValueToColor = mapping.mapValueToVisual(node.getLayout().value);
            node.setVisual('color', mapValueToColor);
            // If set itemStyle.normal.color
            var itemModel = node.getModel();
            var customColor = itemModel.get('itemStyle.normal.color');
            if (customColor != null) {
                node.setVisual('color', customColor);
            }
        });

    });
}