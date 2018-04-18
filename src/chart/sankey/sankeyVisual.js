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
        if (nodes.length) {
            var minValue = Infinity;
            var maxValue = -Infinity;
            zrUtil.each(nodes, function (node) {
                var nodeValue = node.getLayout().value;
                if (nodeValue < minValue) {
                    minValue = nodeValue;
                }
                if (nodeValue > maxValue) {
                    maxValue = nodeValue;
                }
            });
            
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
                var customColor = itemModel.get('itemStyle.color');
                if (customColor != null) {
                    node.setVisual('color', customColor);
                }
            });
        }
    });
}