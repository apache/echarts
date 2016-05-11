/**
 * @file Data zoom model
 */
define(function(require) {

    var DataZoomModel = require('./DataZoomModel');

    var SliderZoomModel = DataZoomModel.extend({

        type: 'dataZoom.slider',

        layoutMode: 'box',

        /**
         * @protected
         */
        defaultOption: {
            show: true,

            // ph => placeholder. Using placehoder here because
            // deault value can only be drived in view stage.
            right: 'ph',  // Default align to grid rect.
            top: 'ph',    // Default align to grid rect.
            width: 'ph',  // Default align to grid rect.
            height: 'ph', // Default align to grid rect.
            left: null,   // Default align to grid rect.
            bottom: null, // Default align to grid rect.

            backgroundColor: 'rgba(47,69,84,0)',    // Background of slider zoom component.
            dataBackgroundColor: '#ddd',            // Background of data shadow.
            fillerColor: 'rgba(47,69,84,0.15)',     // Color of selected area.
            handleColor: 'rgba(148,164,165,0.95)',     // Color of handle.
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
        },

        /**
         * @override
         */
        mergeOption: function (option) {
            SliderZoomModel.superApply(this, 'mergeOption', arguments);
        }

    });

    return SliderZoomModel;

});