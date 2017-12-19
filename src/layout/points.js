import {map} from 'zrender/src/core/util';

export default function (seriesType) {
    return {
        seriesType: seriesType,
        reset: function (data, seriesModel, ecModel, api) {
            var coordSys = seriesModel.coordinateSystem;
            if (!coordSys) {
                return;
            }

            var dims = map(coordSys.dimensions, function (dim) {
                return data.getDimension(seriesModel.coordDimToDataDim(dim)[0]);
            });

            var dataEach = dims.length === 1
                ? function (data, idx) {
                    var x = data.get(dims[0], idx);
                    // Also {Array.<number>}, not undefined to avoid if...else... statement
                    data.setItemLayout(idx, isNaN(x) ? [NaN, NaN] : coordSys.dataToPoint(x));
                }
                : dims.length === 2
                ? function (data, idx) {
                    var x = data.get(dims[0], idx);
                    var y = data.get(dims[1], idx);
                    // Also {Array.<number>}, not undefined to avoid if...else... statement
                    data.setItemLayout(
                        idx, (isNaN(x) || isNaN(y)) ? [NaN, NaN] : coordSys.dataToPoint([x, y])
                    );
                }
                : null;

            return {dataEach: dataEach};
        }
    };
}

// function createTask(seriesType, seriesModel) {
//     var coordSys = seriesModel.coordinateSystem;
//     if (!coordSys) {
//         return;
//     }

//     var data = seriesModel.getData();
//     var dims = [];
//     for (var i = 0; i < coordSys.dimensions.length; i++) {
//         dims.push(seriesModel.coordDimToDataDim(coordSys.dimensions[i])[0]);
//     }

//     var task;
//     // ??? no task support ?
//     if (dims.length === 1) {
//         task = data.createEachTask(dims[0], function (x, idx) {
//             // Also {Array.<number>}, not undefined to avoid if...else... statement
//             data.setItemLayout(idx, isNaN(x) ? [NaN, NaN] : coordSys.dataToPoint(x));
//         });
//     }
//     else if (dims.length === 2) {
//         task = data.createEachTask(dims, function (x, y, idx) {
//             // Also {Array.<number>}, not undefined to avoid if...else... statement
//             data.setItemLayout(
//                 idx, (isNaN(x) || isNaN(y)) ? [NaN, NaN] : coordSys.dataToPoint([x, y])
//             );
//         });
//     }

//     return task;
// }
