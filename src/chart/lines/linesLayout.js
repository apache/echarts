import createRenderPlanner from '../helper/createRenderPlanner';

export default {
    seriesType: 'lines',

    plan: createRenderPlanner(),

    reset: function (seriesModel) {
        var coordSys = seriesModel.coordinateSystem;
        var isPolyline = seriesModel.get('polyline');
        var isLarge = seriesModel.pipelineContext.large;

        function progress(params, lineData) {
            var lineCoords = [];
            if (isLarge) {
                var points;
                var segCount = params.end - params.start;
                if (isPolyline) {
                    var totalCoordsCount = 0;
                    for (var i = params.start; i < params.end; i++) {
                        totalCoordsCount += seriesModel.getLineCoordsCount(i);
                    }
                    points = new Float32Array(segCount + totalCoordsCount * 2);
                }
                else {
                    points = new Float32Array(segCount * 2);
                }

                var offset = 0;
                var pt = [];
                for (var i = params.start; i < params.end; i++) {
                    var len = seriesModel.getLineCoords(i, lineCoords);
                    if (isPolyline) {
                        points[offset++] = len;
                    }
                    for (var k = 0; k < len; k++) {
                        pt = coordSys.dataToPoint(lineCoords[k], false, pt);
                        points[offset++] = pt[0];
                        points[offset++] = pt[1];
                    }
                }

                lineData.setLayout('linesPoints', points);
            }
            else {
                for (var i = params.start; i < params.end; i++) {
                    var itemModel = lineData.getItemModel(i);
                    var len = seriesModel.getLineCoords(i, lineCoords);

                    var pts = [];
                    if (isPolyline) {
                        for (var j = 0; j < len; j++) {
                            pts.push(coordSys.dataToPoint(lineCoords[j]));
                        }
                    }
                    else {
                        pts[0] = coordSys.dataToPoint(lineCoords[0]);
                        pts[1] = coordSys.dataToPoint(lineCoords[1]);

                        var curveness = itemModel.get('lineStyle.curveness');
                        if (+curveness) {
                            pts[2] = [
                                (pts[0][0] + pts[1][0]) / 2 - (pts[0][1] - pts[1][1]) * curveness,
                                (pts[0][1] + pts[1][1]) / 2 - (pts[1][0] - pts[0][0]) * curveness
                            ];
                        }
                    }
                    lineData.setItemLayout(i, pts);
                }
            }
        }

        return { progress: progress };
    }
};