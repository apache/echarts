define({
    getAreaStyle: function () {
        return require('./makeStyleMapper')(
            [
                ['fill', 'color'],
                ['shadowBlur'],
                ['shadowOffsetX'],
                ['shadowOffsetY'],
                ['shadowColor']
            ]
        );
    }
});