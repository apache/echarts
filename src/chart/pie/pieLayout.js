// TODO minAngle

define(function (require) {

    var numberUtil = require('../../util/number');
    var parsePercent = numberUtil.parsePercent;
    var labelLayout = require('./labelLayout');

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

            var startAngle = -seriesModel.get('startAngle') * Math.PI / 180;

            var sum = data.getSum('x');
            if (sum === 0) {
                sum = data.count();
            }
            var radianPerVal = Math.PI / sum * 2;

            var clockWise = seriesModel.get('clockWise');

            data.each('x', function (value, idx) {
                var angle = sum === 0 ? radianPerVal : (value * radianPerVal);
                var endAngle = startAngle + angle;
                data.setItemLayout(idx, {
                    startAngle: startAngle,
                    endAngle: endAngle,
                    clockwise: clockWise,
                    cx: cx,
                    cy: cy,
                    r0: r0,
                    r: r
                });

                startAngle = endAngle;
            }, true);

            labelLayout(seriesModel, width, height);
        });
    }
});