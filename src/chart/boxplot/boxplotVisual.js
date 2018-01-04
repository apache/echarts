
var borderColorQuery = ['itemStyle', 'borderColor'];

export default function (ecModel, api) {

    var globalColors = ecModel.get('color');

    ecModel.eachRawSeriesByType('boxplot', function (seriesModel) {

        var defaulColor = globalColors[seriesModel.seriesIndex % globalColors.length];
        var data = seriesModel.getData();

        data.setVisual({
            legendSymbol: 'roundRect',
            // Use name 'color' but not 'borderColor' for legend usage and
            // visual coding from other component like dataRange.
            color: seriesModel.get(borderColorQuery) || defaulColor
        });

        // Only visible series has each data be visual encoded
        if (!ecModel.isSeriesFiltered(seriesModel)) {
            data.each(function (idx) {
                var itemModel = data.getItemModel(idx);
                data.setItemVisual(
                    idx,
                    {color: itemModel.get(borderColorQuery, true)}
                );
            });
        }
    });

}