import * as zrUtil from 'zrender/src/core/util';
import SeriesModel from '../../model/Series';
import {seriesModelMixin} from '../helper/whiskerBoxCommon';
// import {calculateCandleWidth} from './helper';

var CandlestickSeries = SeriesModel.extend({

    type: 'series.candlestick',

    dependencies: ['xAxis', 'yAxis', 'grid'],

    /**
     * @readOnly
     */
    defaultValueDimensions: ['open', 'close', 'lowest', 'highest'],

    /**
     * @type {Array.<string>}
     * @readOnly
     */
    dimensions: null,

    /**
     * @override
     */
    defaultOption: {
        zlevel: 0,                  // 一级层叠
        z: 2,                       // 二级层叠
        coordinateSystem: 'cartesian2d',
        legendHoverLink: true,

        hoverAnimation: true,

        // xAxisIndex: 0,
        // yAxisIndex: 0,

        layout: null, // 'horizontal' or 'vertical'

        itemStyle: {
            color: '#c23531', // 阳线 positive
            color0: '#314656', // 阴线 negative     '#c23531', '#314656'
            borderWidth: 1,
            // FIXME
            // ec2中使用的是lineStyle.color 和 lineStyle.color0
            borderColor: '#c23531',
            borderColor0: '#314656'
        },

        emphasis: {
            itemStyle: {
                borderWidth: 2
            }
        },

        barMaxWidth: null,
        barMinWidth: null,
        barWidth: null,

        large: true,
        largeThreshold: 500,

        animationUpdate: false,
        animationEasing: 'linear',
        animationDuration: 300
    },

    /**
     * Get dimension for shadow in dataZoom
     * @return {string} dimension name
     */
    getShadowDim: function () {
        return 'open';
    },

    brushSelector: function (dataIndex, data, selectors) {
        var itemLayout = data.getItemLayout(dataIndex);
        return itemLayout && selectors.rect(itemLayout.brushRect);
    }

    // isLargeMode: function (data) {
    //     // Experience number
    //     return calculateCandleWidth(this, data) <= 1;
    // }

});

zrUtil.mixin(CandlestickSeries, seriesModelMixin, true);

export default CandlestickSeries;
