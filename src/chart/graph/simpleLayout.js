import {each} from 'zrender/src/core/util';
import {simpleLayout, simpleLayoutEdge} from './simpleLayoutHelper';

export default function (ecModel, api) {
    ecModel.eachSeriesByType('graph', function (seriesModel) {
        var layout = seriesModel.get('layout');
        var coordSys = seriesModel.coordinateSystem;
        if (coordSys && coordSys.type !== 'view') {
            var data = seriesModel.getData();

            var dimensions = [];
            each(coordSys.dimensions, function (coordDim) {
                dimensions = dimensions.concat(data.mapDimension(coordDim, true));
            });

            for (var dataIndex = 0; dataIndex < data.count(); dataIndex++) {
                var value = [];
                var hasValue = false;
                for (var i = 0; i < dimensions.length; i++) {
                    var val = data.get(dimensions[i], dataIndex);
                    if (!isNaN(val)) {
                        hasValue = true;
                    }
                    value.push(val);
                }
                if (hasValue) {
                    data.setItemLayout(dataIndex, coordSys.dataToPoint(value));
                }
                else {
                    // Also {Array.<number>}, not undefined to avoid if...else... statement
                    data.setItemLayout(dataIndex, [NaN, NaN]);
                }
            }

            simpleLayoutEdge(data.graph);
        }
        else if (!layout || layout === 'none') {
            simpleLayout(seriesModel);
        }
    });
}