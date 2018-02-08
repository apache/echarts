import {map} from 'zrender/src/core/util';
import createRenderPlanner from '../chart/helper/createRenderPlanner';
import {isDimensionStacked} from '../data/helper/dataStackHelper';

export default function (seriesType) {
    return {
        seriesType: seriesType,

        plan: createRenderPlanner(),

        reset: function (seriesModel) {
            var data = seriesModel.getData();
            var coordSys = seriesModel.coordinateSystem;
            var pipelineContext = seriesModel.pipelineContext;
            var isLargeRender = pipelineContext.large;

            if (!coordSys) {
                return;
            }

            var dims = map(coordSys.dimensions, function (dim) {
                return data.mapDimension(dim);
            }).slice(0, 2);
            var dimLen = dims.length;

            if (isDimensionStacked(data, dims[0], dims[1])) {
                dims[0] = data.getCalculationInfo('stackResultDimension');
            }
            if (isDimensionStacked(data, dims[1], dims[0])) {
                dims[1] = data.getCalculationInfo('stackResultDimension');
            }

            function progress(params, data) {
                var segCount = params.end - params.start;
                var points = isLargeRender && new Float32Array(segCount * dimLen);

                for (var i = params.start, offset = 0, tmpIn = [], tmpOut = []; i < params.end; i++) {
                    var point;

                    if (dimLen === 1) {
                        var x = data.get(dims[0], i, true);
                        point = !isNaN(x) && coordSys.dataToPoint(x, null, tmpOut);
                    }
                    else {
                        var x = tmpIn[0] = data.get(dims[0], i, true);
                        var y = tmpIn[1] = data.get(dims[1], i, true);
                        // Also {Array.<number>}, not undefined to avoid if...else... statement
                        point = !isNaN(x) && !isNaN(y) && coordSys.dataToPoint(tmpIn, null, tmpOut);
                    }

                    if (isLargeRender) {
                        points[offset++] = point ? point[0] : NaN;
                        points[offset++] = point ? point[1] : NaN;
                    }
                    else {
                        data.setItemLayout(i, (point && point.slice()) || [NaN, NaN]);
                    }
                }

                isLargeRender && data.setLayout('symbolPoints', points);
            }

            return dimLen && {progress: progress};
        }
    };
}
