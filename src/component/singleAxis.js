define(function (require) {

    require('../coord/single/singleCreator');
    require('./axis/SingleAxisView');
    require('../coord/single/AxisModel');
    require('./axisPointer');

    require('./axisPointer/SingleAxisPointer');

    var echarts = require('../echarts');

    echarts.extendComponentView({
        type: 'single'
    });

});