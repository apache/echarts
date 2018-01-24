import SeriesModel from '../../model/Series';
import createListSimply from '../helper/createListSimply';
import * as zrUtil from 'zrender/src/core/util';
import {encodeHTML} from '../../util/format';

var RadarSeries = SeriesModel.extend({

    type: 'series.radar',

    dependencies: ['radar'],


    // Overwrite
    init: function (option) {
        RadarSeries.superApply(this, 'init', arguments);

        // Enable legend selection for each data item
        // Use a function instead of direct access because data reference may changed
        this.legendDataProvider = function () {
            return this.getRawData();
        };
    },

    getInitialData: function (option, ecModel) {
        return createListSimply(this, {
            extraPrefix: 'indicator_',
            extraFromZero: true
        });
    },

    formatTooltip: function (dataIndex) {
        var data = this.getData();
        var coordSys = this.coordinateSystem;
        var indicatorAxes = coordSys.getIndicatorAxes();
        var name = this.getData().getName(dataIndex);
        return encodeHTML(name === '' ? this.name : name) + '<br/>'
            + zrUtil.map(indicatorAxes, function (axis, idx) {
                var val = data.get(data.mapDimension(axis.dim), dataIndex);
                return encodeHTML(axis.name + ' : ' + val);
            }).join('<br />');
    },

    defaultOption: {
        zlevel: 0,
        z: 2,
        coordinateSystem: 'radar',
        legendHoverLink: true,
        radarIndex: 0,
        lineStyle: {
            width: 2,
            type: 'solid'
        },
        label: {
            position: 'top'
        },
        // areaStyle: {
        // },
        // itemStyle: {}
        symbol: 'emptyCircle',
        symbolSize: 4
        // symbolRotate: null
    }
});

export default RadarSeries;