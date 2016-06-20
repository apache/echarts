define(function (require) {
    var Gradient = require('zrender/graphic/Gradient');
    return function (ecModel) {
        function encodeColor(seriesModel) {
            var colorAccessPath = (seriesModel.visualColorAccessPath || 'itemStyle.normal.color').split('.');
            var data = seriesModel.getData();
            var color = seriesModel.get(colorAccessPath) // Set in itemStyle
                || seriesModel.getColorFromPalette(seriesModel.get('name'));  // Default color

            // FIXME Set color function or use the platte color
            data.setVisual('color', color);

            // Only visible series has each data be visual encoded
            if (!ecModel.isSeriesFiltered(seriesModel)) {
                if (typeof color === 'function' && !(color instanceof Gradient)) {
                    data.each(function (idx) {
                        data.setItemVisual(
                            idx, 'color', color(seriesModel.getDataParams(idx))
                        );
                    });
                }

                // itemStyle in each data item
                data.each(function (idx) {
                    var itemModel = data.getItemModel(idx);
                    var color = itemModel.get(colorAccessPath, true);
                    if (color != null) {
                        data.setItemVisual(idx, 'color', color);
                    }
                });
            }
        }
        ecModel.eachRawSeries(encodeColor);
    };
});