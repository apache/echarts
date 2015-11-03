define(function (require) {

    return function (ecModel) {
        var legendModel = ecModel.getComponent('legend');
        if (!legendModel) {
            return;
        }
        ecModel.eachSeriesByType('graph', function (graphSeries) {
            var categoriesData = graphSeries.getCategoriesData();
            var graph = graphSeries.getGraph();
            var data = graph.data;

            var categoryNames = categoriesData.mapArray(categoriesData.getName);

            data.filterSelf(function (idx) {
                var model = data.getItemModel(idx);
                var category = model.getShallow('category');
                if (category != null) {
                    if (typeof category === 'number') {
                        category = categoryNames[category];
                    }
                    return legendModel.isSelected(category);
                }
                return true;
            });
        }, this);
    };
});