define(function(require) {

    return require('./BaseBarSeries').extend({

        type: 'series.bar',

        dependencies: ['grid', 'polar'],

        brushSelector: 'rect'
    });
});