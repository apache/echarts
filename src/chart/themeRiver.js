define(function (require) {

    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');

    require('../component/singleAxis');

    require('./themeRiver/ThemeRiverSeries');

    require('./themeRiver/ThemeRiverView');

    echarts.registerLayout(require('./themeRiver/themeRiverLayout'));

    echarts.registerVisual(require('./themeRiver/themeRiverVisual'));

    echarts.registerProcessor(
        zrUtil.curry(require('../processor/dataFilter'), 'themeRiver')
    );
});