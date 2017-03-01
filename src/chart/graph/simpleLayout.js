define(function (require) {

    var zrUtil = require('zrender/core/util');
    var simpleLayoutHelper = require('./simpleLayoutHelper');
    var simpleLayoutEdge = require('./simpleLayoutEdge');
    var modelUtil = require('../../util/model');

    return function (ecModel, api) {
        ecModel.eachSeriesByType('graph', function (seriesModel) {
            var layout = seriesModel.get('layout');
            var coordSys = seriesModel.coordinateSystem;
            if (coordSys && coordSys.type !== 'view') {
                var data = seriesModel.getData();
                var dimensions = modelUtil.getCoordSysDimNames(coordSys);

                data.each(dimensions, function () {
                    var hasValue;
                    var args = arguments;
                    var value = [];
                    for (i = 0; i < dimensions.length; i++) {
                        if (!isNaN(args[i])) {
                            hasValue = true;
                        }
                        value.push(args[i]);
                    }
                    var idx = args[args.length - 1];

                    if (hasValue) {
                        data.setItemLayout(idx, coordSys.dataToPoint(value));
                    }
                    else {
                        // Also {Array.<number>}, not undefined to avoid if...else... statement
                        data.setItemLayout(idx, [NaN, NaN]);
                    }
                });

                simpleLayoutEdge(data.graph);
            }
            else if (!layout || layout === 'none') {
                simpleLayoutHelper(seriesModel);
            }
        });
    };
});
