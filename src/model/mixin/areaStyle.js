define(function (require) {
    var getAreaStyle = require('./makeStyleMapper')(
        [
            ['fill', 'color'],
            ['shadowBlur'],
            ['shadowOffsetX'],
            ['shadowOffsetY'],
            ['opacity'],
            ['shadowColor']
        ]
    );
    return {
        getAreaStyle: function (excludes, includes) {
            return getAreaStyle(this, excludes, includes);
        }
    };
});