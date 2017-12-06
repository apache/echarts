import BaseBarSeries from './BaseBarSeries';

export default BaseBarSeries.extend({

    type: 'series.bar',

    dependencies: ['grid', 'polar'],

    brushSelector: 'rect'
});
