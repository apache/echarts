define(function (require) {
    return {
        getAreaStyle: require('./makeStyleMapper')(
            [
                ['fill', 'color'],
                ['shadowBlur'],
                ['shadowOffsetX'],
                ['shadowOffsetY'],
                ['opacity'],
                ['shadowColor']
            ]
        )
    };
});