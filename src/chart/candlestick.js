define(function (require) {

    var echarts = require('../echarts');

    require('./candlestick/CandlestickSeries');
    require('./candlestick/CandlestickView');

    echarts.registerPreprocessor(
        require('./candlestick/preprocessor')
    );

    echarts.registerVisual(require('./candlestick/candlestickVisual'));
    echarts.registerLayout(require('./candlestick/candlestickLayout'));

});