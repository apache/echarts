define(function() {
    'use strict';

    return function (option) {
        var stackedMap = {};
        option.eachSeries(function (series) {
            var data = series.getData();
            var stack = series.get('stack');

            if (stack && data.type === 'list') {

                data.eachY(function (y, idx) {
                    stackedMap[idx] = stackedMap[idx] || 0;
                    stackedMap[idx] += y;
                });
            }
        });
    };
});