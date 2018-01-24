
var positiveBorderColorQuery = ['itemStyle', 'borderColor'];
var negativeBorderColorQuery = ['itemStyle', 'borderColor0'];
var positiveColorQuery = ['itemStyle', 'color'];
var negativeColorQuery = ['itemStyle', 'color0'];

export default function (ecModel, api) {

    ecModel.eachRawSeriesByType('candlestick', function (seriesModel) {

        var data = seriesModel.getData();

        data.setVisual({
            legendSymbol: 'roundRect'
        });

        // Only visible series has each data be visual encoded
        if (!ecModel.isSeriesFiltered(seriesModel)) {
            data.each(function (idx) {
                var itemModel = data.getItemModel(idx);
                var sign = data.getItemLayout(idx).sign;

                data.setItemVisual(
                    idx,
                    {
                        color: itemModel.get(
                            sign > 0 ? positiveColorQuery : negativeColorQuery
                        ),
                        borderColor: itemModel.get(
                            sign > 0 ? positiveBorderColorQuery : negativeBorderColorQuery
                        )
                    }
                );
            });
        }
    });

}