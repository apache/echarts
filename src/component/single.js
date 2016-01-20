define(function (require) {

    require('../coord/single/singleCreator');
    require('./singleAxis');

    var echarts = require('../echarts');

    echarts.extendComponentView({
        type: 'single'
    });
    
});