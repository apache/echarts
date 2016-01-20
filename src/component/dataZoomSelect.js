/**
 * DataZoom component entry
 */
define(function (require) {

    require('./dataZoom/typeDefaulter');

    require('./dataZoom/DataZoomModel');
    require('./dataZoom/DataZoomView');

    require('./dataZoom/SelectZoomModel');
    require('./dataZoom/SelectZoomView');

    require('./dataZoom/dataZoomProcessor');
    require('./dataZoom/dataZoomAction');

});