define(function (require) {

    require('../../model/Component').registerSubTypeDefaulter('timeline', function () {
        // Only slider now.
        return 'slider';
    });

});