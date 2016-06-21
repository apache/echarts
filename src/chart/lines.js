define(function (require) {

    require('./lines/LinesSeries');
    require('./lines/LinesView');

    var echarts = require('../echarts');
    echarts.registerLayout(
        require('./lines/linesLayout')
    );
});