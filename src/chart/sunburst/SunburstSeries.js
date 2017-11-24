import * as echarts from '../../echarts';
import List from '../../data/List';
import {getPercentWithPrecision} from '../../util/number';
import completeDimensions from '../../data/helper/completeDimensions';

var SunburstSeries = echarts.extendSeriesModel({

    type: 'series.sunburst',

    /*
     * @override
     */
    init: function (option) {
        SunburstSeries.superApply(this, 'init', arguments);

        // Enable legend selection for each data item
        // Use a function instead of direct access because data reference may changed
        this.legendDataProvider = function () {
            return this.getRawData();
        };
    },

    /*
     * @override
     */
    mergeOption: function (newOption) {
        SunburstSeries.superCall(this, 'mergeOption', newOption);
    },

    getInitialData: function (option, ecModel) {
        var dimensions = completeDimensions(['value'], option.data);
        var list = new List(dimensions, this);
        list.initData(option.data);
        return list;
    },

    /*
     * @override
     */
    getDataParams: function (dataIndex) {
        var data = this.getData();
        var params = SunburstSeries.superCall(this, 'getDataParams', dataIndex);
        // FIXME toFixed?

        var valueList = [];
        data.each('value', function (value) {
            valueList.push(value);
        });

        params.percent = getPercentWithPrecision(
            valueList,
            dataIndex,
            data.hostModel.get('percentPrecision')
        );

        params.$vars.push('percent');
        return params;
    },

    defaultOption: {
        zlevel: 0,
        z: 2,
        legendHoverLink: true,

        hoverAnimation: true,
        // 默认全局居中
        center: ['50%', '50%'],
        radius: [0, '75%'],
        // 默认顺时针
        clockwise: true,
        startAngle: 90,
        // 最小角度改为0
        minAngle: 0,

        percentPrecision: 2,

        // If still show when all data zero.
        stillShowZeroSum: true,

        label: {
            normal: {
                // If rotate around circle
                rotate: false,
                show: true,
                position: 'inner'
            },
            emphasis: {}
        },
        itemStyle: {
            normal: {
                borderWidth: 1
            },
            emphasis: {}
        },

        // Animation type canbe expansion, scale
        animationType: 'expansion',

        animationEasing: 'cubicOut',

        data: []
    }
});

export default SunburstSeries;
