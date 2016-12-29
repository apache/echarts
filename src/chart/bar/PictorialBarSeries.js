define(function(require) {

    var PictorialBarSeries = require('./BaseBarSeries').extend({

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
                                  // Can be a number, specifies repeat times, and do not cut by data.
                                  // Can be 'fixed', means auto calculate repeat times but do not cut by data.
            symbolRepeatDirection: 'end', // 'end' means from 'start' to 'end'.

            symbolClip: false,
            symbolBoundingData: null,
            symbolPatternSize: 400, // 400 * 400 px

            // z2 can be set in data item.

            // Disable progressive
            progressive: 0,
            hoverAnimation: false // Open only when needed.

            // cases:
            // repeat: bg:Y, clip:Y, ani:cliprect, size:symbolSize and calc by gridSize.
            // fixed size: bg:Y, clip:Y, ani:cliprect, size:symbolSize.
            // stretch: bg:N, clip:Y, ani:position(by layout), size:byRect
            // img: bg:N, clip:Y, ani:position(include clip), size:byRect or bySymbolSize.
        },

        getInitialData: function (option) {
            // Disable stack.
            option.stack = null;
            return PictorialBarSeries.superApply(this, 'getInitialData', arguments);
        }
    });

    return PictorialBarSeries;
});