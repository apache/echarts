import Component from '../../model/Component';

Component.registerSubTypeDefaulter('timeline', function () {
    // Only slider now.
    return 'slider';
});
