import {simpleLayout, simpleLayoutEdge} from './simpleLayoutHelper';

export default function (ecModel, api) {
    ecModel.eachSeriesByType('graph', function (seriesModel) {
        var layout = seriesModel.get('layout');
        var coordSys = seriesModel.coordinateSystem;
        if (coordSys && coordSys.type !== 'view') {
            var data = seriesModel.getData();
            var dimensions = coordSys.dimensions;

            data.each(dimensions, function () {
                var hasValue;
                var args = arguments;
                var value = [];
                for (var i = 0; i < dimensions.length; i++) {
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
            simpleLayout(seriesModel);
        }
    });
}