import BaseBarSeries from './BaseBarSeries';

export default BaseBarSeries.extend({

    type: 'series.bar',

    dependencies: ['grid', 'polar'],

    brushSelector: 'rect',

    /**
     * @override
     */
    getProgressive: function () {
        // Do not support progressive in normal mode.
        return this.get('large')
            ? this.get('progressive')
            : false;
    },

    /**
     * @override
     */
    getProgressiveThreshold: function () {
        // Do not support progressive in normal mode.
        var progressiveThreshold = this.get('progressiveThreshold');
        var largeThreshold = this.get('largeThreshold');
        if (largeThreshold > progressiveThreshold) {
            progressiveThreshold = largeThreshold;
        }
        return progressiveThreshold;
    }

});
