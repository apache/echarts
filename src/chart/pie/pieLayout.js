// TODO minAngle

define(function (require) {

    var numberUtil = require('../../util/number');
    var parsePercent = numberUtil.parsePercent;
    var labelLayout = require('./labelLayout');

    var PI2 = Math.PI * 2;
    var RADIAN = Math.PI / 180;

    return function (seriesType, ecModel, api) {
        ecModel.eachSeriesByType(seriesType, function (seriesModel) {
            var center = seriesModel.get('center');
            var radius = seriesModel.get('radius');

            var width = api.getWidth();
            var height = api.getHeight();
            var size = Math.min(width, height);
            var cx = parsePercent(center[0], width);
            var cy = parsePercent(center[1], height);
            var r0 = parsePercent(radius[0], size);
            var r = parsePercent(radius[1], size);

            var data = seriesModel.getData();

            var startAngle = -seriesModel.get('startAngle') * RADIAN;

            var minAngle = seriesModel.get('minAngle') * RADIAN;

            var sum = data.getSum('value');
            if (sum === 0) {
                sum = data.count();
            }
            var unitRadian = Math.PI / sum * 2;

            var clockWise = seriesModel.get('clockWise');

            var roseType = seriesModel.get('roseType');

            // [0...max]
            var extent = data.getDataExtent('value');
            extent[0] = 0;

            // In the case some sector angle is smaller than minAngle
            var restAngle = PI2;
            var valueSumLargerThanMinAngle = 0;

            var currentAngle = startAngle;
            data.each('value', function (value, idx) {
                var angle = sum === 0 ? unitRadian : (value * unitRadian);

                if (angle < minAngle) {
                    angle = minAngle;
                    restAngle -= minAngle;
                }
                else {
                    valueSumLargerThanMinAngle += value;
                }

                var endAngle = currentAngle + angle;
                data.setItemLayout(idx, {
                    angle: angle,
                    startAngle: currentAngle,
                    endAngle: endAngle,
                    clockwise: clockWise,
                    cx: cx,
                    cy: cy,
                    r0: r0,
                    r: roseType
                        ? numberUtil.linearMap(value, extent, [r0, r])
                        : r
                });

                currentAngle = endAngle;
            }, true);

            // Some sector is constrained by minAngle
            // Rest sectors needs recalculate angle
            if (restAngle < PI2) {
                // Average the angle if rest angle is not enough after all angles is
                // Constrained by minAngle
                if (restAngle <= 1e-3) {
                    var angle = PI2 / data.count();
                    data.each(function (idx) {
                        var layout = data.getItemLayout(idx);
                        layout.startAngle = idx * angle;
                        layout.endAngle = (idx + 1) * angle
                    })
                }
                else {
                    unitRadian = restAngle / valueSumLargerThanMinAngle;
                    currentAngle = startAngle;
                    data.each('value', function (value, idx) {
                        var layout = data.getItemLayout(idx);
                        var angle = layout.angle === minAngle
                            ? minAngle : value * unitRadian;
                        layout.startAngle = currentAngle;
                        layout.endAngle = currentAngle + angle;
                        currentAngle += angle;
                    });
                }
            }

            labelLayout(seriesModel, r, width, height);
        });
    }
});