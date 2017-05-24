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
            disabled: false,   // Whether disable this inside zoom.
            zoomLock: false,   // Whether disable zoom but only pan.
            zoomOnMouseWheel: true, // Can be: true / false / 'shift' / 'ctrl' / 'alt'.
            moveOnMouseMove: true,   // Can be: true / false / 'shift' / 'ctrl' / 'alt'.
            preventDefaultMouseMove: true
        }
    });
});