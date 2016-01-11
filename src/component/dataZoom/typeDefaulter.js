define(function (require) {

    require('../../model/Component').registerSubTypeDefaulter('dataZoom', function (option) {
        // Default 'slider' when no type specified.
        return 'slider';
    });

});