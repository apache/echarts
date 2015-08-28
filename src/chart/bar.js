define(function (require) {

    require('../coord/cartesian/Grid');

    require('./bar/BarSeries');
    require('./bar/BarView');
    require('./bar/barLayoutGrid');

    // Visual coding for legend
    require('../echarts').registerVisualCoding(function (ecModel) {
        ecModel.eachSeriesByType('bar', function (seriesSymbol) {
            seriesSymbol.setVisual('legendSymbol', 'roundRect');
        });
    });
});