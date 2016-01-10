/**
 * @file Data zoom model
 */
define(function(require) {

    var DataZoomModel = require('./DataZoomModel');

    return DataZoomModel.extend({

        type: 'dataZoom.slider',

        /**
         * @readOnly
         */
        layoutMode: 'box',

        /**
         * @protected
         */
        defaultOption: {
            show: true,

            left: 'auto',   // Default align to grid rect.
            right: 'auto',  // Default align to grid rect.
            top: 'auto',    // Default align to grid rect.
            bottom: 'auto', // Default align to grid rect.
            width: 'auto',  // Default align to grid rect.
            height: 'auto', // Default align to grid rect.

            backgroundColor: 'rgba(47,69,84,0)',    // Background of slider zoom component.
            dataBackgroundColor: '#ddd',            // Background of data shadow.
            fillerColor: 'rgba(47,69,84,0.25)',     // Color of selected area.
            handleColor: 'rgba(47,69,84,0.65)',     // Color of handle.
            handleSize: 10,

            labelPrecision: null,
            labelFormatter: null,
            showDetail: true,
            showDataShadow: 'auto',                 // Default auto decision.
            realtime: true,
            zoomLock: false,                        // Whether disable zoom.
            textStyle: {
                color: '#333'
            }
        }

    });

});