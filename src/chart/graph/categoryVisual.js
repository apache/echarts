
export default function (ecModel) {

    var paletteScope = {};
    ecModel.eachSeriesByType('graph', function (seriesModel) {
        var categoriesData = seriesModel.getCategoriesData();
        var data = seriesModel.getData();

        var categoryNameIdxMap = {};

        categoriesData.each(function (idx) {
            var name = categoriesData.getName(idx);
            // Add prefix to avoid conflict with Object.prototype.
            categoryNameIdxMap['ec-' + name] = idx;

            var itemModel = categoriesData.getItemModel(idx);
            var color = itemModel.get('itemStyle.normal.color')
                || seriesModel.getColorFromPalette(name, paletteScope);
            categoriesData.setItemVisual(idx, 'color', color);
        });

        // Assign category color to visual
        if (categoriesData.count()) {
            data.each(function (idx) {
                var model = data.getItemModel(idx);
                var category = model.getShallow('category');
                if (category != null) {
                    if (typeof category === 'string') {
                        category = categoryNameIdxMap['ec-' + category];
                    }
                    if (!data.getItemVisual(idx, 'color', true)) {
                        data.setItemVisual(
                            idx, 'color',
                            categoriesData.getItemVisual(category, 'color')
                        );
                    }
                }
            });
        }
    });
}