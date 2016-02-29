/**
 * @file Data zoom model
 */
define(function(require) {

    return require('./DataZoomModel').extend({

        type: 'dataZoom.inside',

        /**
         * @protected
         */
        defaultOption: {
            zoomLock: false // Whether disable zoom but only pan.
        }
    });
});