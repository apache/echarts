define(function(require) {

    require('../coord/parallel/parallelCreator');
    require('./parallelAxis');

    var echarts = require('../echarts');

    // Parallel view
    echarts.extendComponentView({
        type: 'parallel'
    });

    echarts.registerPreprocessor(require('../preprocessor/parallel'));

});