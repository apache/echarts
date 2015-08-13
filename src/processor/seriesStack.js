define(function() {
    'use strict';

    return function (option) {
        var stackedMap = {};
        option.eachSeries(function (series) {
            var data = series.getData();

            if (data.type === 'list' && data.dataDimension === 1) {

                var id = series.get('name') + '_' + series.get('name');

                data.eachY(function (y, idx) {
                    stackedMap[idx] = stackedMap[idx] || 0;
                    stackedMap[idx] += y;
                });
            }
        });
    };
});