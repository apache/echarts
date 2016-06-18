define(function (require) {

    require('./lines/LinesSeries');
    require('./lines/LinesView');

    var zrUtil = require('zrender/core/util');
    var echarts = require('../echarts');
    echarts.registerLayout(
        require('./lines/linesLayout')
    );

    echarts.registerVisual(
        zrUtil.curry(require('../visual/seriesColor'), 'lines', 'lineStyle')
    );

    echarts.registerPreprocessor(function (option) {
        // Convert [ [{coord: []}, {coord: []}] ]
        // to [ { coords: [[]] } ]
        zrUtil.each(option.series, function (seriesOpt) {
            if (seriesOpt && seriesOpt.type === 'lines') {
                var data = seriesOpt.data || [];
                if (data[0] && data[0][0] && data[0][0].coord) {
                    if (__DEV__) {
                        console.warn('Lines data configuration has been changed to'
                            + ' { coords:[[1,2],[2,3]] }');
                    }
                    seriesOpt.data = zrUtil.map(data, function (itemOpt) {
                        var coords = [
                            itemOpt[0].coord, itemOpt[1].coord
                        ];
                        return zrUtil.mergeAll([{
                            fromName: itemOpt[0].name,
                            toName: itemOpt[1].name,
                            coords: coords
                        }, itemOpt[0], itemOpt[1]]);
                    });
                }
            }
        });
    });
});