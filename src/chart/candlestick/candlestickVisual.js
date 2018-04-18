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
        var isLargeRender = seriesModel.pipelineContext.large;

        data.setVisual({
            legendSymbol: 'roundRect',
            colorP: getColor(1, seriesModel),
            colorN: getColor(-1, seriesModel),
            borderColorP: getBorderColor(1, seriesModel),
            borderColorN: getBorderColor(-1, seriesModel)
        });

        // Only visible series has each data be visual encoded
        if (ecModel.isSeriesFiltered(seriesModel)) {
            return;
        }

        return !isLargeRender && {progress: progress};


        function progress(params, data) {
            var dataIndex;
            while ((dataIndex = params.next()) != null) {
                var itemModel = data.getItemModel(dataIndex);
                var sign = data.getItemLayout(dataIndex).sign;

                data.setItemVisual(
                    dataIndex,
                    {
                        color: getColor(sign, itemModel),
                        borderColor: getBorderColor(sign, itemModel)
                    }
                );
            }
        }

        function getColor(sign, model) {
            return model.get(
                sign > 0 ? positiveColorQuery : negativeColorQuery
            );
        }

        function getBorderColor(sign, model) {
            return model.get(
                sign > 0 ? positiveBorderColorQuery : negativeBorderColorQuery
            );
        }

    }

};