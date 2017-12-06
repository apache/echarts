import Component from '../../model/Component';

Component.registerSubTypeDefaulter('dataZoom', function () {
    // Default 'slider' when no type specified.
    return 'slider';
});
