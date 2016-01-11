/**
 * DataZoom component entry
 */
define(function (require) {

    require('./dataZoom/typeDefaulter');

    require('./dataZoom/DataZoomModel');
    require('./dataZoom/DataZoomView');

    require('./dataZoom/InsideZoomModel');
    require('./dataZoom/InsideZoomView');

    require('./dataZoom/dataZoomProcessor');
    require('./dataZoom/dataZoomAction');

});