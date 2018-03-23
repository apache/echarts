import createRenderPlanner from '../helper/createRenderPlanner';

var positiveBorderColorQuery = ['itemStyle', 'borderColor'];
var negativeBorderColorQuery = ['itemStyle', 'borderColor0'];
var positiveColorQuery = ['itemStyle', 'color'];
var negativeColorQuery = ['itemStyle', 'color0'];

export default {

    seriesType: 'candlestick',

    plan: createRenderPlanner(),

    // For legend.
    performRawSeries: true,

    reset: function (seriesModel, ecModel) {

        var data = seriesModel.getData();
        var pipelineContext = seriesModel.pipelineContext;
        var isLargeRender = pipelineContext.large;
        var largePoints = isLargeRender && data.getLayout('largePoints');

        data.setVisual({
            legendSymbol: 'roundRect'
        });

        // Only visible series has each data be visual encoded
        if (ecModel.isSeriesFiltered(seriesModel)) {
            return;
        }

        function progress(params, data) {
            for (var dataIndex = params.start; dataIndex < params.end; dataIndex++) {
                var itemModel = data.getItemModel(dataIndex);
                var sign = isLargeRender
                    ? largePoints[(dataIndex - params.start) * 5]
                    : data.getItemLayout(dataIndex).sign;

                data.setItemVisual(
                    dataIndex,
                    {
                        color: itemModel.get(
                            sign > 0 ? positiveColorQuery : negativeColorQuery
                        ),
                        borderColor: itemModel.get(
                            sign > 0 ? positiveBorderColorQuery : negativeBorderColorQuery
                        )
                    }
                );
            }
        }

        return {progress: progress};
    }

};