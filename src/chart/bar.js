define(function (require) {

    require('../coord/cartesian/Grid');

    require('./bar/BarSeries');
    require('./bar/BarView');
    require('./bar/BarLayoutGrid');

    // Series visual coding
    require('../echarts').registerVisualCoding(function (ecModel) {
        ecModel.eachSeriesByType('bar', function (series) {
            if (series.type === 'bar') {
                series.setVisual('legendSymbol', 'roundRect');
            }
        });
    });
});