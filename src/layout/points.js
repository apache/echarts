
export default function (seriesType, ecModel) {
    var tasks = [];
    ecModel.eachSeriesByType(seriesType, function (seriesModel) {
        var task = createTask(seriesType, seriesModel);
        if (task) {
            // ??? better way?
            task.pipelineId = seriesModel.uid;
            tasks.push(task);
        }
    });

    return tasks;
}

function createTask(seriesType, seriesModel) {
    var coordSys = seriesModel.coordinateSystem;
    if (!coordSys) {
        return;
    }

    var data = seriesModel.getData();
    var dims = [];
    for (var i = 0; i < coordSys.dimensions.length; i++) {
        dims.push(seriesModel.coordDimToDataDim(coordSys.dimensions[i])[0]);
    }

    var task;
    if (dims.length === 1) {
        task = data.createEachTask(dims[0], function (x, idx) {
            // Also {Array.<number>}, not undefined to avoid if...else... statement
            data.setItemLayout(idx, isNaN(x) ? [NaN, NaN] : coordSys.dataToPoint(x));
        });
    }
    else if (dims.length === 2) {
        task = data.createEachTask(dims, function (x, y, idx) {
            // Also {Array.<number>}, not undefined to avoid if...else... statement
            data.setItemLayout(
                idx, (isNaN(x) || isNaN(y)) ? [NaN, NaN] : coordSys.dataToPoint([x, y])
            );
        });
    }

    return task;
}
