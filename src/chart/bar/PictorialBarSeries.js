define(function(require) {

    return require('./BaseBarSeries').extend({

        type: 'series.pictorialBar',

        dependencies: ['grid'],

        defaultOption: {
            symbol: 'circle',     // Customized bar shape
            symbolSize: null,     // Can be ['100%', '100%'], null means auto.
            symbolRotate: null,

            symbolPosition: null, // 'start' or 'end' or 'center', null means auto.
            symbolOffset: null,
            symbolMargin: null,   // start margin and end margin. Can be a number or a percent string.
                                  // Auto margin by defualt.
            symbolRepeat: false,  // false/null/undefined, means no repeat.
                                  // Can be a number, specifies repeat times.
            symbolRepeatDirection: 'end', // 'end' means from 'start' to 'end'.

            symbolClip: false,
            symbolBoundingData: null,

            // Disable progressive
            progressive: 0,
            hoverAnimation: true

            // cases:
            // repeat: bg:Y, clip:Y, ani:cliprect, size:symbolSize and calc by gridSize.
            // fixed size: bg:Y, clip:Y, ani:cliprect, size:symbolSize.
            // stretch: bg:N, clip:Y, ani:position(by layout), size:byRect
            // img: bg:N, clip:Y, ani:position(include clip), size:byRect or bySymbolSize.
        }
    });
});