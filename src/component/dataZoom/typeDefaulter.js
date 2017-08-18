define(function (require) {

    require('../../model/Component').registerSubTypeDefaulter('dataZoom', function () {
        // Default 'slider' when no type specified.
        return 'slider';
    });

});