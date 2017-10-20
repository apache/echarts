import SeriesModel from '../../model/Series';
import List from '../../data/List';
import completeDimensions from '../../data/helper/completeDimensions';
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
        var data = option.data || [];
        var dimensions = completeDimensions(
            [], data, {extraPrefix: 'indicator_', extraFromZero: true}
        );
        var list = new List(dimensions, this);
        list.initData(data);
        return list;
    },

    formatTooltip: function (dataIndex) {
        var value = this.getRawValue(dataIndex);
        var coordSys = this.coordinateSystem;
        var indicatorAxes = coordSys.getIndicatorAxes();
        var name = this.getData().getName(dataIndex);
        return encodeHTML(name === '' ? this.name : name) + '<br/>'
            + zrUtil.map(indicatorAxes, function (axis, idx) {
                return encodeHTML(axis.name + ' : ' + value[idx]);
            }).join('<br />');
    },

    defaultOption: {
        zlevel: 0,
        z: 2,
        coordinateSystem: 'radar',
        legendHoverLink: true,
        radarIndex: 0,
        lineStyle: {
            normal: {
                width: 2,
                type: 'solid'
            }
        },
        label: {
            normal: {
                position: 'top'
            }
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