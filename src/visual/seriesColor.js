import Gradient from 'zrender/src/graphic/Gradient';

export default {
    createOnAllSeries: true,
    performRawSeries: true,
    reset: function (seriesModel, ecModel) {
        var data = seriesModel.getData();
        var colorAccessPath = (seriesModel.visualColorAccessPath || 'itemStyle.color').split('.');
        var color = seriesModel.get(colorAccessPath) // Set in itemStyle
            || seriesModel.getColorFromPalette(
                // TODO series count changed.
                seriesModel.get('name'), null, ecModel.getSeriesCount()
            );  // Default color

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
            var dataEach = function (data, idx) {
                var itemModel = data.getItemModel(idx);
                var color = itemModel.get(colorAccessPath, true);
                if (color != null) {
                    data.setItemVisual(idx, 'color', color);
                }
            };

            return { dataEach: data.hasItemOption ? dataEach : null };
        }
    }
};
