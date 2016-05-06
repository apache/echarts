define(function (require) {

    return function (ecModel) {
        ecModel.eachSeriesByType('graph', function (seriesModel) {
            var colorList = seriesModel.get('color');
            var categoriesData = seriesModel.getCategoriesData();
            var data = seriesModel.getData();

            var categoryNameIdxMap = {};

            categoriesData.each(function (idx) {
                categoryNameIdxMap[categoriesData.getName(idx)] = idx;

                var itemModel = categoriesData.getItemModel(idx);
                var rawIdx = categoriesData.getRawIndex(idx);
                var color = itemModel.get('itemStyle.normal.color')
                    || colorList[rawIdx % colorList.length];
                categoriesData.setItemVisual(idx, 'color', color);
            });

            // Assign category color to visual
            if (categoriesData.count()) {
                data.each(function (idx) {
                    var model = data.getItemModel(idx);
                    var category = model.getShallow('category');
                    if (category != null) {
                        if (typeof category === 'string') {
                            category = categoryNameIdxMap[category];
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
    };
});