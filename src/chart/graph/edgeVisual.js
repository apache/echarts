define(function (require) {

    function normalize(a) {
        if (!(a instanceof Array)) {
            a = [a, a];
        }
        return a;
    }
    return function (ecModel) {
        ecModel.eachSeriesByType('graph', function (seriesModel) {
            var graph = seriesModel.getGraph();
            var edgeData = seriesModel.getEdgeData();
            var symbolType = normalize(seriesModel.get('edgeSymbol'));
            var symbolSize = normalize(seriesModel.get('edgeSymbolSize'));

            var colorQuery = 'lineStyle.normal.color'.split('.');
            var opacityQuery = 'lineStyle.normal.opacity'.split('.');

            edgeData.setVisual('fromSymbol', symbolType && symbolType[0]);
            edgeData.setVisual('toSymbol', symbolType && symbolType[1]);
            edgeData.setVisual('fromSymbolSize', symbolSize && symbolSize[0]);
            edgeData.setVisual('toSymbolSize', symbolSize && symbolSize[1]);
            edgeData.setVisual('color', seriesModel.get(colorQuery));
            edgeData.setVisual('opacity', seriesModel.get(opacityQuery));

            edgeData.each(function (idx) {
                var itemModel = edgeData.getItemModel(idx);
                var edge = graph.getEdgeByIndex(idx);
                var symbolType = normalize(itemModel.getShallow('symbol', true));
                var symbolSize = normalize(itemModel.getShallow('symbolSize', true));
                // Edge visual must after node visual
                var color = itemModel.get(colorQuery);
                var opacity = itemModel.get(opacityQuery);
                switch (color) {
                    case 'source':
                        color = edge.node1.getVisual('color');
                        break;
                    case 'target':
                        color = edge.node2.getVisual('color');
                        break;
                }

                symbolType[0] && edge.setVisual('fromSymbol', symbolType[0]);
                symbolType[1] && edge.setVisual('toSymbol', symbolType[1]);
                symbolSize[0] && edge.setVisual('fromSymbolSize', symbolSize[0]);
                symbolSize[1] && edge.setVisual('toSymbolSize', symbolSize[1]);

                edge.setVisual('color', color);
                edge.setVisual('opacity', opacity);
            });
        });
    };
});