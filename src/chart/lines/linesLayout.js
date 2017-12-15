import {__DEV__} from '../../config';

export default function (ecModel, api) {
    ecModel.eachSeriesByType('lines', function (seriesModel) {
        var coordSys = seriesModel.coordinateSystem;
        var lineData = seriesModel.getData();
        var isPolyline = seriesModel.get('polyline');
        var isLarge = seriesModel.get('large');

        var task = api.createTask({

            input: lineData,

            progress: function (params, notify) {
                var lineCoords = [];
                if (isLarge) {
                    var points;
                    var segCount = params.dueEnd - params.dueIndex;
                    if (isPolyline) {
                        var totalCoordsCount = 0;
                        for (var i = params.dueIndex; i < params.dueEnd; i++) {
                            totalCoordsCount += seriesModel.getLineCoordsCount(i);
                        }
                        points = new Float32Array(segCount + totalCoordsCount * 2);
                    }
                    else {
                        points = new Float32Array(segCount * 2);
                    }

                    var offset = 0;
                    var pt = [];
                    for (var i = params.dueIndex; i < params.dueEnd; i++) {
                        var len = seriesModel.getLineCoords(i, lineCoords);
                        if (isPolyline) {
                            points[offset++] = len;
                        }
                        for (var k = 0; k < len; k++) {
                            coordSys.dataToPoint(lineCoords[k], pt);
                            points[offset++] = pt[0];
                            points[offset++] = pt[1];
                        }
                    }

                    lineData.setLayout('linesPoints', points);
                }
                else {
                    for (var i = params.dueIndex; i < params.dueEnd; i++) {
                        var itemModel = lineData.getItemModel(i);
                        var len = seriesModel.getLineCoords(i, lineCoords);

                        var pts = [];
                        if (isPolyline) {
                            for (var i = 0; i < len; i++) {
                                pts.push(coordSys.dataToPoint(lineCoords[i]));
                            }
                        }
                        else {
                            pts[0] = coordSys.dataToPoint(lineCoords[0]);
                            pts[1] = coordSys.dataToPoint(lineCoords[1]);

                            var curveness = itemModel.get('lineStyle.normal.curveness');
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

                notify(params.dueEnd);
            }
        });

        seriesModel.pipeTask(task, 'visual');
    });
}