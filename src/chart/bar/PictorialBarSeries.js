import BaseBarSeries from './BaseBarSeries';

var PictorialBarSeries = BaseBarSeries.extend({

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
                                // Can be true, means auto calculate repeat times and cut by data.
                                // Can be a number, specifies repeat times, and do not cut by data.
                                // Can be 'fixed', means auto calculate repeat times but do not cut by data.
        symbolRepeatDirection: 'end', // 'end' means from 'start' to 'end'.

        symbolClip: false,
        symbolBoundingData: null, // Can be 60 or -40 or [-40, 60]
        symbolPatternSize: 400, // 400 * 400 px

        barGap: '-100%',      // In most case, overlap is needed.

        // z can be set in data item, which is z2 actually.

        // Disable progressive
        progressive: 0,
        hoverAnimation: false // Open only when needed.
    },

    getInitialData: function (option) {
        // Disable stack.
        option.stack = null;
        return PictorialBarSeries.superApply(this, 'getInitialData', arguments);
    }
});

export default PictorialBarSeries;